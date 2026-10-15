# Live Map local installation - 2026-10-05

The approved cumulative 53-path candidate is installed locally, rather than awaiting installation. Repository: https://github.com/Zacharon/live-map.git; branch: feature/evidence-semantic-globe; unchanged HEAD: 1640bed51a76fb916f570d755bf5e576ccc36646. No commit, push, merge or publication occurred. The original maritime16, selection/source41 and Working Watch53 candidate packages remain immutable.

## Behavior actually verified

Reports titles and keyboard global search select the existing shared source inspector, URL identity and globe record without clicking the globe. Back restores native row focus; reload restores selection. Mobile exposes search, a report title and keyboard Back. Read baselines cover all loaded reports, not merely filtered rows; revised evidence and retrieval-only refresh remain distinct. The inspector shows source measurements, occurrence/revision/retrieval clocks, coverage and limitations. Late responses cannot replace newer data; failures retain dated cached rows with unknown current coverage.

The existing workbench exposes independent visible AIS, dark/inferred traffic, cargo evidence and security signals with separate provenance, clocks, coverage, confidence and unknown states. Missing AIS cannot establish absent ships or zero cargo. Historical AIS transit proxies are not cargo measurements. Contradictory estimates retain method/date/coverage rather than an average; diplomacy is contextual. September LNG figures were not fabricated or promoted to current measurements.

Reloading an event URL restores its title, inspector and Cesium selection, but initial keyboard focus remains on the page body. Native report/search activation focuses the inspector Back control; Back returns focus to the exact originating row. Initial focus after URL reload remains a small usability limitation.

## Verification and precise source identity

- Ten scoped suites passed in the canonical repository: maritime-signals, operational-evidence, investigation-workbench, portwatch-hormuz-frozen-sample, chokepoint-brief, direct-selection, public-provider, working-watch, design-workspace, audit-truth.
- Repository check:syntax and Cloudflare exports passed; every changed JS/MJS module passed syntax. No auth/security suite or prior blocked security task was executed.
- 23 native browser checks passed against canonical-served bytes with actual Cesium and local NaturalEarth imagery. The harness controls API and browser Date to 2026-10-02T21:09:24.348Z solely for historical replay, with upstream requests blocked. It is not current-feed proof.
- The independent installed H3 report is C:/Users/zacha/Documents/Codex/2026-10-02/task-2/review/WORKING_WATCH_INSTALLED_H3_REVIEW_2026-10-05.md. It uses a separate browser profile; consult that report for actual-clock historical-window behavior and review limits.
- Task-local receipt, preflight, backups, served-byte verification, dated envelope, test logs and four screenshots are in C:/Users/zacha/Documents/Codex/2026-10-02/task-2/working-watch-integration-2026-10-05.
- Frozen manifest SHA-256: aeb3788b6a73f955ad17749b4c7adb72b52fab1282c1b9f6e0b9744adcbfc994. Frozen cumulative patch SHA-256: 66e9bd82449887c8399adcc8c8683db9fd5ab9afc686a9c2e6b19ac192d909de. Original review package SHA-256: 8f8cff0c5c5bc978f5028e44bb3194a593bf68c03ceeb03d3830eaa7f28da20a.

The saved USGS development read is from https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson, retrieved 2026-10-02T21:09:24.348Z, 27 normalized source records (24 in the captured 24-hour loaded window). Its source generation 2026-10-02T21:12:21Z is 176.652 seconds ahead of retrieval, so freshness is explicitly uncertain/degraded. Coverage is reported magnitude 2.5+ earthquakes, with incomplete worldwide reporting.

The saved NHC/CPHC read is from https://www.nhc.noaa.gov/CurrentStorms.json, retrieved 2026-10-02T21:09:24.337Z, two valid advisories issued at 21:00Z; source-generation time is unknown. Wind is in knots and pressure in hPa; positions are issued advisory positions, not continuous tracks. Coverage is Atlantic/eastern/central North Pacific, not worldwide. Source counts and loaded-window counts remain separate; cache replay marks both sources stale/degraded and shows 0/2 current.

Optional installed-source loopback preview: http://127.0.0.1:8785/?view=feed&hours=24&sort=newest-occurred&mapMode=3d&basemap=local-earth&asOf=2026-10-02T21%3A09%3A24.348Z. This explicitly selects an October 2 historical window with the real browser wall clock. Without that historical window, October 2 records are outside today's 24 hours. The task-local server imports and serves the canonical source; its API uses a historical clock and cache-only mode with an upstream-failure guard. Restart from the task-local integration directory using `node installed-replay-server.mjs 8785 --cache-only`. This is not production or the normal current-data reader.

## Boundaries and remaining gaps

Paid API budget is zero. New source switches and paid BYO defaults stay off. No credential access, provider activation, new upstream contact, deployment, routing change or OS MAPS change occurred. The cache is a development file, not hosted durable ingestion. Current AIS/dark traffic, measured cargo/security and corporate/institutional feeds remain unknown/unactivated. Owner visual acceptance, production Cesium CSP and native/hosted database restore/concurrency proof remain open. Historical candidate notes below other documents are superseded for installation only, not those gates.

## Exact reviewed implementation paths

```text
docs/DIRECT_SELECTION_AND_SOURCES_LOCAL.md
docs/LAST_30_DAYS.md
docs/MARITIME_SIGNALS_LOCAL.md
docs/NEXT_TASK_QUEUE.md
docs/OWNED_API_INGESTION_PLAN.md
docs/WORKING_WATCH_HOSTED_PLAN.md
docs/WORKING_WATCH_LOCAL.md
index.html
map-workspace.css
netlify/functions/moving-objects.mjs
package.json
scripts/preview-public-local.mjs
scripts/public-source-dev-read.mjs
scripts/read-digitraffic-docs.mjs
scripts/reproduce-direct-selection.mjs
scripts/runtime-direct-selection.mjs
scripts/runtime-maritime-signals.mjs
scripts/runtime-working-watch.mjs
src/app-controller.js
src/data/fixtures/synthetic-maritime-signals.js
src/data/local-public-preview.js
src/data/providers/adsb-lol.js
src/data/providers/capability-registry.js
src/data/providers/digitraffic.js
src/data/providers/nhc.js
src/data/providers/opensky.js
src/data/providers/orchestrator.js
src/data/providers/provider-activation.js
src/data/providers/public-tracking-fetch.js
src/data/providers/registry.js
src/data/providers/scheduling.js
src/data/providers/source-registry.js
src/events/change-awareness.js
src/events/event-normalizer.js
src/intelligence/investigation-cycle.js
src/intelligence/maritime-signals.js
src/intelligence/operational-evaluator.js
src/intelligence/public-projection.js
src/map/contact-roster.js
src/sources/master-source-registry.js
src/state.js
src/ui/chokepoint-brief.js
src/ui/chokepoints.js
src/ui/evidence-detail.js
src/ui/investigation-workbench.js
src/ui/maritime-signals.js
src/ui/osint-dashboard-v2/event-detail-drawer.js
src/ui/watch-operator.js
src/ui/watch-workspace.js
tests/direct-selection-tests.mjs
tests/maritime-signals-tests.mjs
tests/public-provider-tests.mjs
tests/working-watch-tests.mjs
```

The two context documents LAST_30_DAYS.md and NEXT_TASK_QUEUE.md retain the reviewed content and receive only a superseding installation entry. This record is the sole additional canonical path. All runtime/source/test bytes remain identical to the reviewed 53-path candidate.
