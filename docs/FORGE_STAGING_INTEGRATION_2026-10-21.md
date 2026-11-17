# Forge USGS staging integration — 2026-10-21

## Scope

A reversible test harness connects the actual Forge WSGI HTTP API to Live Map's existing event builder and browser normalization/filter functions. It is confined to `scripts/staging/` and `tests/forge-staging-tests.mjs`; no production entry point imports it. No production routes, provider registration/defaults, environment variables, databases, source authorizations or deployment settings changed.

Inspected Live Map base: `bb1e64df51c1b2cb589831abfccbe15a5ce90c72`. Forge pin: `239c9570238230c110f474db4ec9246d59b3aa1e` (PR #4 merge). The test rejects a different Forge HEAD or tracked source modifications. CI checks out that exact Forge revision; `scripts/staging/forge-pin.json` records it locally.

All integration observations here are **synthetic, deterministic, local HTTP evidence**. This run does not repeat the earlier 332-record real-source verification, fetch USGS, or establish hosted connectivity.

## Integration boundary

Do not replace Live Map's `/api/events` with Forge's envelope. Live Map aggregates unrelated providers and owns its stored-USGS change cursor. Forge's envelope is structurally compatible but supplies neither the same identity convention nor compatible change tracking. Its `sourceStatus.osint-forge` describes successful projection, not USGS collection health.

| Concern | Staging behavior |
|---|---|
| Identity | `event:usgs-<id>` and `providerEventId: usgs-<id>` become `usgs:<id>` and `<id>`. If `metadata.usgsId` exists, it must agree. |
| Provenance | Retain Forge object id, original provider-event id, content hash and source URL. Diagnostic identity records retain the Forge alias/hash even when native data wins. Object HTTP checks verify the original USGS provenance locator, retrieval time and source hash. An ontology content hash is not the source-feature hash. |
| Measurements/clocks | Preserve magnitude, depth (including zero), occurrence, revision and ingestion clocks separately. Unknown publication time stays null. Use the existing canonical normalizer and legacy projection. |
| Verification | Preserve reviewed → `primary-confirmed` / 96 and automatic → `single-source` / 88. Both paths represent the same USGS publisher: one independent source. |
| Duplicate revision | Exact source identity wins over title/proximity. Keep the complete native record and report conflicts; never splice a newer clock into older measurements. Native precedence applies before filtering. |
| Distinct earthquakes | Different USGS ids remain separate in the staging merge even at identical coordinates/titles. Each Forge addition passes independently through the existing API builder so its heuristic deduplicator cannot collapse distinct source identities. Native provider behavior is unchanged. |
| Existing providers | Preserve their events, source health, metadata and diagnostics. Forge status is separate at `sourceStatus.forge-staging`; successful projection leaves collector health `unknown`. |
| Snapshot mode | Add unique Forge earthquakes, using the actual Live Map API filters and browser normalization. `changeCursor` remains null; refresh requires a complete snapshot. |
| Stored cursor mode | **Shadow comparison only**: no Forge events are injected or used to replace native revisions. Native event snapshot/cursor and subsequent correction/resync behavior remain intact. Forge-only events do not silently escape cursor tracking. |
| Failure | Connection refused, HTTP failure, timeout, redirect, malformed/stale envelope or oversized body retains native results and returns sanitized Forge-unavailable diagnostics. Invalid individual events are rejected and counted. No cached Forge data is invented. |
| Access | Forge URL must be numeric HTTP loopback (`127.0.0.1`) at `/api/events`; redirects rejected, two-second default request/body timeout, 4 MiB streamed body cap, 1,000 event cap. All native providers require explicit fixture overrides to prevent outbound polling. |

## Reproduce

Use clean sibling checkouts of Live Map and the pinned Forge revision, Node 20+ and Python 3.11+:

```bash
npm ci --ignore-scripts
npm run test:forge-staging -- ../osint-forge
```

The Python helper uses Forge's existing synthetic USGS fixture, ingests it into a disposable SQLite file, repeats ingestion without new revisions, closes/reopens the store and serves the real `ForgeApi` on an ephemeral loopback port. Only the projection clock is frozen to the shared contract fixture's clock. The Node tests read the upstream shared contract fixture directly and compare its exact expected HTTP envelope, rather than maintaining a divergent copy. No source-registry enablement or live CLI flags are used.

Tests forward staging responses over an actual second loopback HTTP boundary, and use Live Map's existing PGlite/PostGIS migrations, ingestion, outbox, event snapshot and change response builders. The stored-mode test advances a native correction and checks the resulting source identity and epoch-change `409` resync.

## Validation

- Six integration test groups pass: shared exact contract; source fields/provenance; additive identity/provider preservation; API/browser filters; failure/limit handling; stored cursor correction/resync. Positive staging requests allow ten seconds in the test runner to avoid competing SQL startup/syntax-scan load; the adapter default remains two seconds and the explicit timeout failure test uses 75 ms.
- `npm run check:syntax` passes, including Cloudflare route exports. New adapter/test syntax and Python helper parsing pass.
- Offline platform regressions pass (`node --import ./tests/offline-network.mjs tests/run-tests.mjs`).
- Offline validator passes all ten checks, with explicit skipped source-URL reachability and synthetic provider-failure warnings.
- Repository secret scan passes. The validator's browser secret scan passes.
- Unchanged pinned Forge full suite: 153 discovered, 129 passed, 24 PostgreSQL tests skipped (no native server configured here).
- `git diff --check` passes.
- **Full online `npm run validate` fails** one of ten checks: external source-URL reachability. Syntax, browser secret scan, local envelope/freshness/status/coordinates/attribution pass. Online provider orchestration reports partial data and five fetch failures (EONET, GDACS, CISA KEV, official RSS, Statuspage). This check invokes existing public-provider reads separately from the fixture-only integration; it does not grant new source authorization or establish Forge connectivity.

The failed reachability targets from that run were:

```text
https://www.swpc.noaa.gov/
https://nvd.nist.gov/developers/vulnerabilities
https://developers.cloudflare.com/radar/
https://earthquake.usgs.gov/earthquakes/eventpage/us6000u3yp
https://earthquake.usgs.gov/earthquakes/eventpage/us6000u3y1
https://earthquake.usgs.gov/earthquakes/eventpage/aka2026uwtlhl
https://earthquake.usgs.gov/earthquakes/eventpage/tx2026uthiey
https://earthquake.usgs.gov/earthquakes/eventpage/us6000u3xx
https://earthquake.usgs.gov/earthquakes/eventpage/us6000u3wh
https://earthquake.usgs.gov/earthquakes/eventpage/us6000u3w6
https://earthquake.usgs.gov/earthquakes/eventpage/nc75452891
https://earthquake.usgs.gov/earthquakes/eventpage/us6000u3un
https://earthquake.usgs.gov/earthquakes/eventpage/us6000u3uc
https://earthquake.usgs.gov/earthquakes/eventpage/us6000u3u9
https://earthquake.usgs.gov/earthquakes/eventpage/tx2026usvyyw
https://earthquake.usgs.gov/earthquakes/eventpage/aka2026uwdchl
https://earthquake.usgs.gov/earthquakes/eventpage/aka2026uwbjty
https://earthquake.usgs.gov/earthquakes/eventpage/aka2026uvzyoa
```

The online-validator failure remains a review/release limitation; the PR is submitted as a draft, not an all-green production candidate. No deployment or independent reviewer acceptance is implied by local checks.

## Remaining gates / rollback

This is not a production provider implementation or a background collector. Remove the harness files, npm test command and isolated CI job to reverse it; no production migration or environment rollback is necessary.

Before hosted integration, obtain the existing approvals for Forge hosting, source authorization and deployment. Define monitored source collection health, pagination/truncation and authorization boundaries, then run an approved staging HTTP connectivity check. A unified cursor/change model or explicit snapshot polling strategy must be reviewed before any additive Forge events enter stored-cursor mode. No native PostgreSQL concurrency/restore, browser UI or hosted behavior is claimed by this harness.
