# Durable USGS ingestion — local candidate

This slice implements a bounded, centrally collected USGS path inside the existing Live Map application. It is **local proof**, not a hosted database, active queue, live collector, or production migration. Existing non-USGS providers still use request-time orchestration. No credentials or account resources are created here.

The exact tested source hashes, command results, and browser evidence are in the [local durability run record](../artifacts/usgs-durability-local/REPORT.md).

## Shape and gates

`Cron → USGS queue message → bounded USGS fetch → PostgreSQL/PostGIS transaction → current-event read model + outbox → material-change log → /api/events and /api/changes`

- `db/migrations/001_usgs_evidence.sql` creates source policy, collection runs, observations, immutable revisions, current-event read model, checkpoint, health, outbox, and material-change log. `002_usgs_recovery.sql` adds cursor epoch/floor/high state and an explicit outbox expiration result. The seeded USGS policy has `collection_enabled = false`, `raw_retention = none`, and `normalized_retention_days = 90`. Raw provider responses are not persisted. That 90-day setting can now be executed by the local retention runner, but production policy/legal review and scheduling remain open.
- The job requires both the runtime `LIVE_MAP_INGEST_USGS=true` and the database source policy to be enabled. No Cron Trigger, Queue binding, Hyperdrive binding, database URL, or scheduled deployment is configured in this repository. The route switches to stored USGS only with `LIVE_MAP_STORED_USGS=true` and an available PostgreSQL connection. Otherwise the existing server-side provider path remains in place.
- The collector accepts at most 1,000 features and a 4 MiB HTTPS response from the fixed USGS URL, with timeout and redirects rejected. It requires stable source IDs, checks timestamps/coordinates, and uses a job key and revision hash to survive repeat delivery. A committed duplicate job skips another fetch. The source policy row serializes overlapping collectors; native simultaneous-connection proof remains outstanding. A revision, current read model, checkpoint, and outbox row commit together. Older source revisions remain historical and do not replace the current version. Only explicit source `deleted` or `withdrawn` records cause a tombstone; absence from a summary feed does not.
- USGS `properties.time` is event occurrence, and `properties.updated` is provider revision time. The feed does not provide a distinct publication timestamp here, so `source_published_at` is null. Retrieval and processing times are recorded separately. Coordinates are approximate official epicenters, never inferred `(0,0)` for missing values.
- `/api/events` preserves its envelope. In stored mode it reads at most the newest 200 matching USGS events from a repeatable-read snapshot and returns a `changeCursor` captured with that snapshot. It surfaces health, staleness, and truncation. A failed database read reports USGS unavailable; it does not silently fetch the source in the browser or request handler. Other providers are not yet moved to durable collection.
- The outbox writes only material changes: new source record, withdrawal, severity band, review upgrade, magnitude or epicenter correction. Metadata-only corrections remain in immutable revisions but are suppressed from the change log. Dispatch locks the feed-state row before allocating a change ID, so application dispatch commits are serialized. `/api/changes` uses versioned epoch cursors and a repeatable-read high-water snapshot. Invalid syntax returns `400`; expired, incompatible, restored-epoch, or ahead-of-database cursors return `409 resync-required` with `/api/events` as the snapshot URL. The browser polls changes while visible and reloads the authoritative stored events on a change or resync. This is not a notification delivery system.
- `cleanupUsgsRetention` uses the source policy and an injected clock. It runs one bounded batch (1–200), reports a dry run by default, and redacts expired normalized revision payloads and geography. Expired current events leave the read model; expired pending outbox rows retain an inspectable `retention-expired` outcome; old change-log rows are removed as a prefix and move the cursor floor. Expiring pending work or a current event rotates the cursor epoch. The immutable identifiers, hashes, and minimal audit relationships remain. This local execution does not settle whether that metadata retention is legally appropriate.

## Local verification and manual use

`npm.cmd run test:ingestion` runs both migrations twice and exercises PostGIS, duplicate jobs and revisions, rollback, chronological corrections, withdrawal, outbox dispatch, stored `/api/events`, `/api/changes`, health degradation, and fetch limits against in-process PGlite/PostGIS. `npm.cmd run test:recovery` covers snapshot/cursor handoff, correction delivery, rollback ID gaps, tied timestamps, pagination, cursor invalidation, retention dry run/execution, pending-work expiration, and source-window absence. These are in-process SQL tests, not a native Windows PostgreSQL result.

`npm.cmd run preview:usgs:stored` starts a loopback test server at `127.0.0.1:8877` with synthetic stored USGS-shaped records and unavailable non-USGS providers. In a second terminal, `npm.cmd run test:browser:usgs:stored` runs isolated Edge acceptance: feed/marker, source inspector, correction via `/api/changes`, reload, API outage/cache honesty, and network request inspection. Restart the preview before repeating this stateful journey. The recorded pass and screenshots are in [`artifacts/usgs-stored-browser-local/1790691186183/`](../artifacts/usgs-stored-browser-local/1790691186183/). No real USGS response or hosted runtime was used.

`npm.cmd run test:ingestion:native` is the prepared native concurrency and restore harness. It was **NOT RUN** here: native `psql`, `pg_dump`, `pg_restore`, PostgreSQL, and PostGIS were absent on this host. Supply an existing local PostgreSQL server with PostGIS and two distinct, empty, disposable databases named `live_map_test_*`. Set `DATABASE_URL` and `RESTORE_DATABASE_URL` to loopback connection URLs, then run the script. It checks the database names and empty targets before migrations, uses separate PostgreSQL connections and barriers for overlap, exports a custom archive, restores to the second database, verifies state and API behavior, and saves an archive checksum and run result. The test roles need `CREATE EXTENSION postgis` privilege and schema creation rights; a logical dump does not provision roles, server settings, or extensions on a new host. Never point this harness at an existing database with application data.

For a disposable loopback test database already migrated, retention is explicit:

```powershell
$env:DATABASE_URL = 'postgres://...@127.0.0.1/...live_map_test_...'
node scripts/run-usgs-retention.mjs --limit 100
$env:LIVE_MAP_TEST_RETENTION = 'true'
node scripts/run-usgs-retention.mjs --execute --limit 100
```

The runner refuses non-loopback and non-`live_map_test_*` databases in both modes; execution also requires `LIVE_MAP_TEST_RETENTION=true`. Repeat bounded batches only after inspecting results. It is not scheduled.

With an independently provisioned, authorized PostgreSQL/PostGIS database, the explicit scripts are:

```powershell
$env:DATABASE_URL = '<private connection string>'
node scripts/apply-db-migrations.mjs
# Owner-governed policy review and enablement must happen separately.
node scripts/run-usgs-collection.mjs --fixture '<approved GeoJSON fixture path>'
```

The fixture command still requires the database policy to be enabled. The script accepts `--live` only with `LIVE_MAP_INGEST_USGS=true`; use of a live service requires the separate source and hosting authorization. Do not put connection strings in tracked files or logs. Do not set the stored read flag before migration, collection, failure behavior, and hosting parity have been verified on the target runtime.

## Remaining production work

The proposed Supabase/PostGIS, Hyperdrive, Queue, Cron, R2, identity/permissions, workspace records, scheduled retention, hosted backup/restore, and per-source policy review remain unprovisioned or incomplete. Before activating this candidate: review USGS terms/attribution and retention; run the native or hosted PostgreSQL/PostGIS concurrency and restore harness; configure queue retry/dead-letter and scheduling; prove connection pooling, rate limits, read/write role separation, and deployed route parity. Extend other sources incrementally through their own contracts. Local tests do not authorize source activation or deployment.
