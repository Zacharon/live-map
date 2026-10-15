import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";
import { commitUsgsFeed } from "../src/ingestion/usgs-pipeline.js";
import { dispatchUsgsOutbox } from "../src/ingestion/usgs-outbox.js";
import { cleanupUsgsRetention, rotateUsgsCursorEpoch } from "../src/ingestion/usgs-retention.js";
import { createChangesResponse } from "../src/api/changes-response.js";
import { createEventsResponse } from "../src/api/events-response.js";
import { EVENT_PROVIDERS } from "../src/data/providers/registry.js";

const t0 = "2026-01-01T00:00:00.000Z";
const t1 = "2026-01-01T00:01:00.000Z";
const t2 = "2026-01-01T00:02:00.000Z";
const future = "2026-05-01T00:00:00.000Z";
const feature = (id, mag, updated = t1) => ({
  type: "Feature", id,
  properties: { mag, time: Date.parse(t0), updated: Date.parse(updated), status: "automatic",
    title: `M ${mag} test`, place: "Fixture location", url: `https://earthquake.usgs.gov/earthquakes/eventpage/${id}` },
  geometry: { type: "Point", coordinates: [10, 20, 4] },
});
const feed = (...features) => ({ type: "FeatureCollection", features });
const noNetwork = EVENT_PROVIDERS.filter((provider) => provider.id !== "usgs").map((provider) => ({
  providerId: provider.id, status: "unavailable", events: [], fetchedAt: t2, cached: false, stale: false,
}));

const db = await PGlite.create({ extensions: { postgis } });
try {
  for (const name of ["001_usgs_evidence.sql", "002_usgs_recovery.sql"]) {
    const migration = await readFile(new URL(`../db/migrations/${name}`, import.meta.url), "utf8");
    await db.exec(migration);
  }
  await db.query("UPDATE lm_source_policies SET collection_enabled = true WHERE source_id = 'usgs'");
  await commitUsgsFeed(db, { jobId: "usgs:recovery:1", feed: feed(feature("one", 5)), retrievedAt: t1 });
  await dispatchUsgsOutbox(db, { now: t1 });
  const snapshot = await (await createEventsResponse(new Request("https://local.test/api/events?hours=24"), {
    usgsDb: db, now: Date.parse(t2), providerResultsOverride: noNetwork,
  })).json();
  assert.equal(snapshot.canonicalEvents.find((event) => event.id === "usgs:one")?.metadata.magnitude, 5);
  assert.match(snapshot.changeCursor, /^c2\.[0-9a-f]{32}\.\d+$/);

  // A correction committed after the snapshot but before outbox dispatch must
  // remain visible from the snapshot cursor after delivery.
  await commitUsgsFeed(db, { jobId: "usgs:recovery:2", feed: feed(feature("one", 6, t2)), retrievedAt: t2 });
  const between = await (await createEventsResponse(new Request("https://local.test/api/events?hours=24"), {
    usgsDb: db, now: Date.parse(t2), providerResultsOverride: noNetwork,
  })).json();
  assert.equal(between.canonicalEvents.find((event) => event.id === "usgs:one")?.metadata.magnitude, 6);
  assert.equal(between.changeCursor, snapshot.changeCursor);
  assert.deepEqual((await (await createChangesResponse(new Request(`https://local.test/api/changes?cursor=${snapshot.changeCursor}`), { db })).json()).changes, []);
  await dispatchUsgsOutbox(db, { now: t2 });
  const correction = await (await createChangesResponse(new Request(`https://local.test/api/changes?cursor=${snapshot.changeCursor}`), { db })).json();
  assert.equal(correction.changes.length, 1);
  assert.equal(correction.changes[0].kind, "corrected");

  // Feed-window absence is not a withdrawal.
  await commitUsgsFeed(db, { jobId: "usgs:recovery:empty", feed: feed(), retrievedAt: t2 });
  assert.equal((await db.query("SELECT count(*)::int AS n FROM lm_events_current")).rows[0].n, 1);

  // A rolled-back sequence allocation can leave a gap; it cannot invalidate a cursor.
  await commitUsgsFeed(db, { jobId: "usgs:recovery:3", feed: feed(feature("two", 4)), retrievedAt: t2 });
  const pendingId = (await db.query("SELECT outbox_id, revision_id FROM lm_outbox WHERE dispatched_at IS NULL ORDER BY outbox_id LIMIT 1")).rows[0];
  await db.query("BEGIN");
  await db.query(
    `INSERT INTO lm_change_log (outbox_id, source_id, source_record_id, revision_id, change_kind, material_reason)
     VALUES ($1, 'usgs', 'two', $2, 'created', 'new-source-record')`,
    [pendingId.outbox_id, pendingId.revision_id],
  );
  await db.query("ROLLBACK");
  await dispatchUsgsOutbox(db, { now: t2 });
  await db.query("UPDATE lm_change_log SET committed_at = $1 WHERE source_id = 'usgs'", [t2]);
  const page1 = await (await createChangesResponse(new Request("https://local.test/api/changes?limit=1"), { db })).json();
  const page2 = await (await createChangesResponse(new Request(`https://local.test/api/changes?cursor=${page1.nextCursor}&limit=1`), { db })).json();
  const page3 = await (await createChangesResponse(new Request(`https://local.test/api/changes?cursor=${page2.nextCursor}&limit=1`), { db })).json();
  assert.deepEqual([page1.changes[0].kind, page2.changes[0].kind, page3.changes[0].kind], ["created", "corrected", "created"]);
  assert.equal((await createChangesResponse(new Request("https://local.test/api/changes?cursor=c1.MQ"), { db })).status, 409);
  assert.equal((await createChangesResponse(new Request("https://local.test/api/changes?cursor=broken"), { db })).status, 400);
  const ahead = `${correction.nextCursor.replace(/\.\d+$/, ".999999")}`;
  assert.equal((await createChangesResponse(new Request(`https://local.test/api/changes?cursor=${ahead}`), { db })).status, 409);

  await commitUsgsFeed(db, { jobId: "usgs:recovery:4", feed: feed(feature("three", 3)), retrievedAt: t2 });
  await db.query("UPDATE lm_outbox SET created_at = $1 WHERE dispatched_at IS NULL", [t2]);

  const dry = await cleanupUsgsRetention(db, { now: future, batchLimit: 1 });
  assert.equal(dry.mode, "dry-run");
  assert.equal((await db.query("SELECT count(*)::int AS n FROM lm_events_current")).rows[0].n, 3);
  const oldCursor = page3.nextCursor;
  let passes = 0;
  let removed = 0;
  do {
    const result = await cleanupUsgsRetention(db, { now: future, batchLimit: 1, execute: true });
    removed += result.revisions + result.changesRemoved + result.pendingExpired;
    passes += 1;
    if (!result.more) break;
  } while (passes < 20);
  assert.ok(removed > 0);
  assert.ok(passes < 20);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM lm_events_current")).rows[0].n, 0);
  assert.equal((await db.query("SELECT expiration_reason FROM lm_outbox WHERE dispatched_at IS NOT NULL AND expiration_reason IS NOT NULL")).rows[0].expiration_reason, "retention-expired");
  assert.equal((await db.query("SELECT count(*)::int AS n FROM lm_observation_revisions WHERE event_json::text LIKE '%Fixture%' ")).rows[0].n, 0);
  assert.equal((await createChangesResponse(new Request(`https://local.test/api/changes?cursor=${oldCursor}`), { db })).status, 409);
  const checkpoint = await db.query("SELECT last_committed_job_id FROM lm_collection_checkpoints WHERE source_id = 'usgs'");
  assert.equal(checkpoint.rows[0].last_committed_job_id, "usgs:recovery:4");

  // A restore operator rotates the epoch; a pre-restore cursor cannot resume.
  const postCleanup = await (await createChangesResponse(new Request("https://local.test/api/changes"), { db })).json();
  await rotateUsgsCursorEpoch(db);
  assert.equal((await createChangesResponse(new Request(`https://local.test/api/changes?cursor=${postCleanup.nextCursor}`), { db })).status, 409);
  console.log("USGS recovery tests passed: snapshot handoff, rollback gap, tied timestamps, pagination, expiry, window absence and epoch reset.");
} finally {
  await db.close();
}
