import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { Client } from "pg";
import { commitUsgsFeed } from "../src/ingestion/usgs-pipeline.js";
import { dispatchUsgsOutbox } from "../src/ingestion/usgs-outbox.js";
import { createChangesResponse } from "../src/api/changes-response.js";
import { readStoredUsgs } from "../src/ingestion/usgs-read-model.js";
import { rotateUsgsCursorEpoch } from "../src/ingestion/usgs-retention.js";

const run = promisify(execFile);
const sourceUrl = process.env.DATABASE_URL;
const restoreUrl = process.env.RESTORE_DATABASE_URL;
if (!sourceUrl || !restoreUrl) throw new Error("DATABASE_URL and RESTORE_DATABASE_URL are required");
function checkedUrl(value) {
  const url = new URL(value);
  const database = decodeURIComponent(url.pathname.slice(1));
  if (!/^live_map_test_[a-z0-9_]+$/.test(database) || !["127.0.0.1", "localhost", "::1"].includes(url.hostname)) {
    throw new Error("Only loopback live_map_test_* databases are accepted");
  }
  return { url, database };
}
const source = checkedUrl(sourceUrl);
const restore = checkedUrl(restoreUrl);
if (source.database === restore.database) throw new Error("Restore target must have a different test database name");
function pgEnv(target) {
  return { ...process.env, PGHOST: target.url.hostname, PGPORT: target.url.port || "5432",
    PGUSER: decodeURIComponent(target.url.username), PGPASSWORD: decodeURIComponent(target.url.password),
    PGDATABASE: target.database };
}
function feature(id, mag, updated) {
  return { type: "Feature", id, properties: { mag, time: Date.parse("2026-01-01T00:00:00Z"),
    updated: Date.parse(updated), status: "automatic", title: `M ${mag} native fixture`, place: "Native fixture",
    url: `https://earthquake.usgs.gov/earthquakes/eventpage/${id}` },
    geometry: { type: "Point", coordinates: [10, 20, 5] } };
}
const feed = (...features) => ({ type: "FeatureCollection", features });
const t1 = "2026-01-01T00:01:00Z", t2 = "2026-01-01T00:02:00Z", t3 = "2026-01-01T00:03:00Z";
async function connection(value) { const client = new Client({ connectionString: value }); await client.connect(); return client; }
async function noAppTables(db) {
  const tables = await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'spatial_ref_sys'");
  assert.equal(tables.rows.length, 0, "Use new empty disposable test databases");
}
async function blockedBy(db, client) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const blockers = await db.query("SELECT pg_blocking_pids($1) AS pids", [client.processID]);
    if (blockers.rows[0].pids.length) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Expected transaction barrier was not observed");
}
async function counts(db) {
  const result = await db.query(`SELECT
    (SELECT count(*)::int FROM lm_observations) AS observations,
    (SELECT count(*)::int FROM lm_observation_revisions) AS revisions,
    (SELECT count(*)::int FROM lm_outbox) AS outbox,
    (SELECT count(*)::int FROM lm_change_log) AS changes,
    (SELECT count(*)::int FROM lm_events_current) AS current`);
  return result.rows[0];
}
const a = await connection(sourceUrl);
const b = await connection(sourceUrl);
const observer = await connection(sourceUrl);
const restored = await connection(restoreUrl);
try {
  await noAppTables(a);
  await noAppTables(restored);
  for (const name of ["001_usgs_evidence.sql", "002_usgs_recovery.sql"]) {
    await a.query(await readFile(new URL(`../db/migrations/${name}`, import.meta.url), "utf8"));
  }
  const versions = {
    server: (await a.query("SHOW server_version")).rows[0].server_version,
    postgis: (await a.query("SELECT PostGIS_Version() AS version")).rows[0].version,
    dump: (await run("pg_dump", ["--version"])).stdout.trim(),
    restore: (await run("pg_restore", ["--version"])).stdout.trim(),
  };
  await a.query("UPDATE lm_source_policies SET collection_enabled = true WHERE source_id = 'usgs'");
  await commitUsgsFeed(a, { jobId: "usgs:native:1", feed: feed(feature("native-one", 5, t1)), retrievedAt: t1 });
  await commitUsgsFeed(a, { jobId: "usgs:native:2", feed: feed(feature("native-two", 4, t1)), retrievedAt: t1 });

  let release;
  let entered;
  const holding = new Promise((resolve) => { release = resolve; });
  const reached = new Promise((resolve) => { entered = resolve; });
  const firstDispatch = dispatchUsgsOutbox(a, { limit: 1, now: t1, beforeCommit: async () => { entered(); await holding; } });
  await reached;
  const secondDispatch = dispatchUsgsOutbox(b, { limit: 1, now: t1 });
  await blockedBy(observer, b);
  const beforeCommit = await (await createChangesResponse(new Request("https://local.test/api/changes"), { db: observer })).json();
  assert.equal(beforeCommit.changes.length, 0);
  release();
  assert.deepEqual(await Promise.all([firstDispatch, secondDispatch]), [{ processed: 1, surfaced: 1 }, { processed: 1, surfaced: 1 }]);
  const allChanges = await (await createChangesResponse(new Request("https://local.test/api/changes"), { db: observer })).json();
  assert.equal(allChanges.changes.length, 2);
  assert.ok(Number(allChanges.changes[0].id.split(":").at(-1)) < Number(allChanges.changes[1].id.split(":").at(-1)));

  let releaseCollector, enteredCollector;
  const collectorHolding = new Promise((resolve) => { releaseCollector = resolve; });
  const collectorReached = new Promise((resolve) => { enteredCollector = resolve; });
  const collectorA = commitUsgsFeed(a, { jobId: "usgs:native:3", feed: feed(feature("native-one", 6, t2)), retrievedAt: t2,
    beforeCommit: async () => { enteredCollector(); await collectorHolding; } });
  await collectorReached;
  const collectorB = commitUsgsFeed(b, { jobId: "usgs:native:4", feed: feed(feature("native-one", 5, t1)), retrievedAt: t3 });
  await blockedBy(observer, b);
  releaseCollector();
  await Promise.all([collectorA, collectorB]);
  const current = await observer.query("SELECT event_json->'metadata'->>'magnitude' AS mag FROM lm_events_current WHERE source_record_id = 'native-one'");
  assert.equal(current.rows[0].mag, "6");
  assert.equal((await observer.query("SELECT last_committed_job_id FROM lm_collection_checkpoints WHERE source_id='usgs'")).rows[0].last_committed_job_id, "usgs:native:4");
  await assert.rejects(commitUsgsFeed(a, { jobId: "usgs:native:rollback", feed: feed(feature("native-failed", 3, t3)), retrievedAt: t3,
    beforeCommit: async () => { throw new Error("injected interruption"); } }), /injected interruption/);
  assert.equal((await observer.query("SELECT count(*)::int AS n FROM lm_observations WHERE source_record_id='native-failed'")).rows[0].n, 0);
  assert.equal((await observer.query("SELECT count(*)::int AS n FROM lm_collection_runs WHERE job_id='usgs:native:rollback'")).rows[0].n, 0);

  // A new connection resumes committed work after a simulated worker restart.
  const restarted = await connection(sourceUrl);
  try {
    assert.ok((await dispatchUsgsOutbox(restarted, { now: t3 })).processed > 0);
    assert.deepEqual(await dispatchUsgsOutbox(restarted, { now: t3 }), { processed: 0, surfaced: 0 });
    await commitUsgsFeed(restarted, { jobId: "usgs:native:pending", feed: feed(feature("native-pending", 3, t3)), retrievedAt: t3 });
  } finally { await restarted.end(); }
  const preRestoreCursor = (await (await createChangesResponse(new Request("https://local.test/api/changes"), { db: observer })).json()).nextCursor;
  const sourceCounts = await counts(observer);
  const sourceSnapshot = await readStoredUsgs(observer, { now: Date.parse(t3), hours: 24 });
  const archiveDir = new URL("../artifacts/usgs-native-recovery-local/", import.meta.url);
  await mkdir(archiveDir, { recursive: true });
  const archive = new URL(`./archive-${Date.now()}.dump`, archiveDir);
  const archivePath = decodeURIComponent(archive.pathname.replace(/^\/(?=[A-Za-z]:\/)/, ""));
  const start = performance.now();
  await run("pg_dump", ["-Fc", "-f", archivePath, "-d", source.database], { env: pgEnv(source), maxBuffer: 1024 * 1024 });
  await run("pg_restore", ["--no-owner", "--no-privileges", "-d", restore.database, archivePath], { env: pgEnv(restore), maxBuffer: 1024 * 1024 });
  const restoreDurationMs = Math.round(performance.now() - start);
  const archiveSha256 = createHash("sha256").update(await readFile(archivePath)).digest("hex");
  assert.deepEqual(await counts(restored), sourceCounts);
  assert.deepEqual((await readStoredUsgs(restored, { now: Date.parse(t3), hours: 24 })).events.map((event) => event.id).sort(),
    sourceSnapshot.events.map((event) => event.id).sort());
  assert.equal((await restored.query("SELECT count(*)::int AS n FROM pg_indexes WHERE tablename='lm_events_current' AND indexdef ILIKE '%gist%' ")).rows[0].n, 1);
  assert.ok((await restored.query("SELECT count(*)::int AS n FROM lm_outbox WHERE dispatched_at IS NULL")).rows[0].n > 0);
  assert.equal((await (await createChangesResponse(new Request("https://local.test/api/changes"), { db: restored })).json()).changes.length,
    (await (await createChangesResponse(new Request("https://local.test/api/changes"), { db: observer })).json()).changes.length);
  await rotateUsgsCursorEpoch(restored);
  assert.equal((await createChangesResponse(new Request(`https://local.test/api/changes?cursor=${preRestoreCursor}`), { db: restored })).status, 409);
  await commitUsgsFeed(restored, { jobId: "usgs:native:restored", feed: feed(feature("native-one", 7, t3)), retrievedAt: t3 });
  assert.ok((await dispatchUsgsOutbox(restored, { now: t3 })).processed > 0);
  console.log(JSON.stringify({ status: "PASS", versions, sourceCounts, archiveSha256, archivePath, restoreDurationMs,
    nativeConcurrency: "observed blocked connections", restoredIngestion: "passed" }));
} finally {
  await Promise.allSettled([a.end(), b.end(), observer.end(), restored.end()]);
}
