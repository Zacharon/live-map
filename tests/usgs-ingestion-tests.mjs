import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";
import { commitUsgsFeed, markUsgsCollectionFailure, prepareUsgsFeed } from "../src/ingestion/usgs-pipeline.js";
import { readStoredUsgs } from "../src/ingestion/usgs-read-model.js";
import { fetchUsgsSnapshot, runUsgsCollectionJob } from "../src/ingestion/usgs-job.js";
import { createEventsResponse } from "../src/api/events-response.js";
import { EVENT_PROVIDERS } from "../src/data/providers/registry.js";
import { normalizeUsgsFeature } from "../src/data/providers/usgs.js";
import { dispatchUsgsOutbox, materialUsgsChange } from "../src/ingestion/usgs-outbox.js";
import { createChangesResponse } from "../src/api/changes-response.js";
import worker from "../src/worker.js";

const t0 = "2026-06-07T18:00:00.000Z";
const t1 = "2026-06-07T18:05:00.000Z";
const t2 = "2026-06-07T18:10:00.000Z";
const t3 = "2026-06-07T18:15:00.000Z";
function feature({ id = "test-1", mag = 5, updated = t1, status = "automatic", coordinates = [10, 20, 5] } = {}) {
  return { type: "Feature", id, properties: { mag, time: Date.parse(t0), updated: Date.parse(updated), status,
    place: "Test location", title: `M ${mag} test earthquake`, url: `https://earthquake.usgs.gov/earthquakes/eventpage/${id}` },
    geometry: coordinates ? { type: "Point", coordinates } : null };
}
function feed(...features) { return { type: "FeatureCollection", features }; }
const db = await PGlite.create({ extensions: { postgis } });
try {
  for (const name of ["001_usgs_evidence.sql", "002_usgs_recovery.sql"]) {
    const migration = await readFile(new URL(`../db/migrations/${name}`, import.meta.url), "utf8");
    await db.exec(migration);
    await db.exec(migration);
  }
  assert.equal((await db.query("SELECT collection_enabled FROM lm_source_policies WHERE source_id = 'usgs'")).rows[0].collection_enabled, false);
  await assert.rejects(commitUsgsFeed(db, { jobId: "usgs:disabled", feed: feed(feature()), retrievedAt: t1 }), /disabled/);
  let fetchCalls = 0;
  await assert.rejects(runUsgsCollectionJob(db, { jobId: "usgs:disabled-job", fetchImpl: async () => { fetchCalls += 1; throw new Error("should not fetch"); } }), /disabled/);
  assert.equal(fetchCalls, 0);
  await db.query("UPDATE lm_source_policies SET collection_enabled = true WHERE source_id = 'usgs'");

  const original = feed(feature());
  assert.equal((await commitUsgsFeed(db, { jobId: "usgs:1", feed: original, retrievedAt: t1 })).newRevisionCount, 1);
  assert.equal((await commitUsgsFeed(db, { jobId: "usgs:1", feed: original, retrievedAt: t1 })).status, "duplicate-job");
  assert.equal((await runUsgsCollectionJob(db, { jobId: "usgs:1", fetchImpl: async () => { fetchCalls += 1; throw new Error("should not fetch"); } })).status, "duplicate-job");
  assert.equal(fetchCalls, 0);
  assert.equal((await commitUsgsFeed(db, { jobId: "usgs:2", feed: original, retrievedAt: t2 })).newRevisionCount, 0);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM lm_observation_revisions")).rows[0].n, 1);
  const initial = (await db.query("SELECT source_published_at, retrieved_at, geographic_precision, ST_AsText(position::geometry) AS point FROM lm_observation_revisions")).rows[0];
  assert.equal(initial.point, "POINT(10 20)");
  assert.equal(initial.geographic_precision, "approximate_point");
  assert.equal(initial.source_published_at, null);
  assert.equal((await db.query("SELECT event_json->>'sourcePublishedAt' AS published FROM lm_observation_revisions LIMIT 1")).rows[0].published, null);
  assert.equal(normalizeUsgsFeature({ ...feature(), properties: { ...feature().properties, url: "javascript:alert(1)" } }).event.sourceUrl,
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php");
  assert.equal((await readStoredUsgs(db, { now: Date.parse(t2), hours: 24 })).events.length, 1);

  assert.equal((await commitUsgsFeed(db, { jobId: "usgs:3", feed: feed(feature({ mag: 6, updated: t2, status: "reviewed" })), retrievedAt: t2 })).promotedCount, 1);
  assert.equal((await db.query("SELECT event_json->'metadata'->>'magnitude' AS mag FROM lm_events_current")).rows[0].mag, "6");
  const noNetworkOverrides = EVENT_PROVIDERS.filter((provider) => provider.id !== "usgs").map((provider) => ({
    providerId: provider.id, status: "unavailable", events: [], rejectedCount: 0, fetchedAt: t2, cached: false, stale: false,
  }));
  const apiResponse = await createEventsResponse(new Request("https://local.test/api/events?hours=24"), {
    usgsDb: db, now: Date.parse(t2), providerResultsOverride: noNetworkOverrides,
  });
  const apiBody = await apiResponse.json();
  assert.equal(apiResponse.status, 200);
  assert.equal(apiBody.canonicalEvents.find((event) => event.id === "usgs:test-1")?.metadata.magnitude, 6);
  assert.equal(apiBody.canonicalEvents.find((event) => event.id === "usgs:test-1")?.sourcePublishedAt, null);
  assert.equal(apiBody.events.find((event) => event.id === "usgs:test-1")?.firstReportedAt, null);
  assert.equal(apiBody.sourceStatus.usgs.stateStorageMode, "postgres");
  assert.match(apiBody.sourceStatus.usgs.message, /Stored USGS observations/);
  await commitUsgsFeed(db, { jobId: "usgs:4", feed: feed(feature({ mag: 4, updated: t0 })), retrievedAt: t2 });
  assert.equal((await db.query("SELECT event_json->'metadata'->>'magnitude' AS mag FROM lm_events_current")).rows[0].mag, "6");
  assert.equal((await db.query("SELECT count(*)::int AS n FROM lm_outbox")).rows[0].n, 2);
  assert.equal(materialUsgsChange({ metadata: { magnitude: 6 }, severityLabel: "high" },
    { metadata: { magnitude: 6 }, severityLabel: "high" }, "corrected"), null);
  assert.deepEqual(await dispatchUsgsOutbox(db, { now: t2 }), { processed: 2, surfaced: 2 });
  assert.deepEqual(await dispatchUsgsOutbox(db, { now: t2 }), { processed: 0, surfaced: 0 });

  await commitUsgsFeed(db, { jobId: "usgs:5", feed: feed(feature({ updated: t3, status: "deleted", coordinates: null })), retrievedAt: t3 });
  assert.equal((await db.query("SELECT count(*)::int AS n FROM lm_events_current")).rows[0].n, 0);
  assert.deepEqual((await db.query("SELECT change_kind FROM lm_outbox ORDER BY outbox_id")).rows.map((row) => row.change_kind), ["created", "corrected", "withdrawn"]);
  assert.deepEqual(await dispatchUsgsOutbox(db, { now: t3 }), { processed: 1, surfaced: 1 });
  assert.deepEqual((await db.query("SELECT material_reason FROM lm_change_log ORDER BY change_id")).rows.map((row) => row.material_reason),
    ["new-source-record", "verification-upgrade", "source-withdrawal"]);
  const firstChanges = await (await createChangesResponse(new Request("https://local.test/api/changes?limit=2"), { db })).json();
  assert.equal(firstChanges.changes.length, 2);
  assert.equal(firstChanges.hasMore, true);
  const finalChanges = await (await createChangesResponse(new Request(`https://local.test/api/changes?cursor=${firstChanges.nextCursor}`), { db })).json();
  assert.equal(finalChanges.changes[0].reason, "source-withdrawal");
  assert.equal(finalChanges.hasMore, false);
  assert.equal((await createChangesResponse(new Request("https://local.test/api/changes?cursor=broken"))).status, 400);
  assert.equal((await createChangesResponse(new Request("https://local.test/api/changes"))).status, 503);
  assert.equal((await worker.fetch(new Request("https://local.test/api/changes"), {})).status, 503);

  const broken = { query(sql, params) {
    if (sql.includes("INSERT INTO lm_outbox")) throw new Error("injected interruption");
    return db.query(sql, params);
  } };
  await assert.rejects(commitUsgsFeed(broken, { jobId: "usgs:rollback", feed: feed(feature({ id: "test-2" })), retrievedAt: t3 }), /injected interruption/);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM lm_collection_runs WHERE job_id = 'usgs:rollback'")).rows[0].n, 0);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM lm_observations WHERE source_record_id = 'test-2'")).rows[0].n, 0);
  await markUsgsCollectionFailure(db, { attemptedAt: t3, errorCode: "fetch-failed" });
  const degraded = await readStoredUsgs(db, { now: Date.parse(t3), hours: 24 });
  assert.equal(degraded.status, "unavailable");
  assert.equal(degraded.errorCode, "fetch-failed");

  const invalid = await prepareUsgsFeed(feed(feature({ id: "test-3", coordinates: [null, 20, 5] })), t3).catch((error) => error);
  assert.match(invalid.message, /no acceptable records/);
  const bigResponse = new Response("x", { headers: { "content-length": String(4 * 1024 * 1024 + 1) } });
  await assert.rejects(fetchUsgsSnapshot(async () => bigResponse), /too large/);
  console.log("USGS durable ingestion tests passed: PostGIS migration, revisions, idempotency, rollback, withdrawal, freshness, response cap.");
} finally {
  await db.close();
}
