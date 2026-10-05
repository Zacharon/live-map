# Last 30 Days

## October 5 — reproducible Systems Desk USGS baseline

Preserved 907 candidate source hashes on an isolated branch from the actual `1640bed` parent. Repaired full-source-reference URL persistence across reload and surfaced IDs/original links in the register and map entities. Dated public ledger test responses are now versioned fixtures. The existing adapter/collector/API supports a USGS-only local acceptance runner with genuine acquisition and explicit stale/unavailable/API-failure simulations. See [source and reproduction](USGS_BASELINE_20261005.md). Original candidate/canonical work, main, hosted beta, source activation and #61 acceptance remain unchanged.

Last updated: 2026-10-04.

## Six energy evidence states — local only (2026-10-04)

Owner follow-up separates production policy, actual output, export/loadings, transit, emergency stock release and price in the existing core model, API and candidate. Shared energy/source filters work in every desk. EIA commercial inventory changes no longer classify as emergency releases; benchmarks/retail/local quotes stay separate. Retained runtime data contains no qualifying energy records, so all six states are unknown with external primary-source references. [Dated implementation, checks and limits](../artifacts/energy-state-2026-10-04/REPORT.md). No deployment, provider activation, canonical integration or CBH price write.

## Evidence register and worldwide public sources (2026-10-02)

The existing [Systems Desk beta](https://live-map-systems-beta.netlify.app/?layout=ledger) now supports direct record selection and persistent source, named event-type, region, date and text filters in every desk. The register stays visible during inspection; paged results include off-map and non-geographic records. Original descriptions, instructions, source clocks and supporting links are inspectable. USGS coverage expands to seven days; GDACS disaster reports and NOAA space-weather notices join the shared cache, plus six external-only source references. Actual hosted samples: 963 then 962 records, automatic new-feed acquisition after publication, desktop/mobile direct-selection checks and English map verified. Independent pre-release and hosted H3 VERIFIED, recorded in the [follow-up report](../artifacts/evidence-ledger-2026-10-02/REPORT.md). Mobile selection proof is the browser trace; mobile PNGs show top controls. CelesTrak is visibly stale/halted after a genuine element fetch failure; retained valid elements produce calculated positions only. Coverage remains bounded; no durable archive, aircraft/ships, canonical integration or old-production update.

## Systems Desk public beta (2026-10-01)

Owner-selected Systems Desk is published at [the separate live-data beta](https://live-map-systems-beta.netlify.app/) on Zacharon's Free team. Genuine USGS/NWS/EONET snapshots and CelesTrak calculated station positions use the shared collector/cache/read-only API. Automatic five-minute execution, hosted globe/English map, source trace, HTTP/security and isolated failure checks are evidenced in the [beta report](../artifacts/live-beta-2026-10-01/REPORT.md). Demo is explicit. Aircraft/ships, archival recovery and publication remain unavailable; canonical integration and existing production are separate. Earlier synthetic/local-only records below are historical.

## Intelligence workbench — isolated local candidate (2026-10-01)

- Owner language follow-up: dark 2D now uses attributed Esri World Dark Gray base/reference tiles with English place names; actual world and regional screenshots confirm labels. [English map evidence](../artifacts/intelligence-workbench-2026-10-01/english-map/REPORT.md). Earlier OSM map evidence is historical.

- Owner visual follow-up fixes Systems relationships/gaps overlap;2D now uses attributed OSM map tiles; original plane/ship/satellite SVGs and global synthetic positions replace regional-only glyphs.64actualscene entities and32focused checks. [Latest visual repair evidence](../artifacts/intelligence-workbench-2026-10-01/visual-fixes/REPORT.md). No live tracking feed or canonical UI promotion.

- Three distinct working compositions default to dark mode after owner steering: Instrument Atlas, Evidence Ledger and Systems Desk. Reused Cesium supports a continuous global-to-local camera and actual event/contact entities, shared domain selection, explicit source fields and historical knowledge cutoff. Canonical UI has not been overwritten.
- [Architecture, concepts, checks and continuation](../src/candidates/intelligence-workbench/REPORT.md). This worktree-only record is not canonical installation or owner design acceptance. Synthetic prototype, database fixture proof, institutional pilot specification and production gates remain distinct. No push/deployment or provider activation.

## Watch design/build candidate — local only

- Implemented the reference-informed map-first Watch interface, native editable Figma screens and prototype flows, source-first inspector, occurrence-based historical browser, mobile Map/Reports panes and on-demand Weather/Sea/Air/Space guides. Current wind reference links are included; wind visualization remains a synthetic 2D proof.
- Browser/independent review repaired stale selection/reset state, saved-view renderer restoration, hidden-pane keyboard access and temporary WebGL capability-context leaks. Cesium survives mobile selection and 40 rerenders with the same viewer. Native 200% zoom and export download bytes are evidenced.
- See [design/build record](DESIGN_BUILD_2026-09-30.md) for exact checks, screenshots, Figma and provider-state fixture limitations. Required syntax/platform and focused checks pass; full offline validator reports known public Cesium tokens in unrelated backup copies. Independent H3 verifies the scoped local candidate. Owner visual acceptance, production CSP, native database recovery and source activation gates remain separate. No push/deployment.

## Current-local audit repairs — local only

- Refactored the primary screen into Watch, Passages, and Open reports, with a separate feed/inspector, explicit scope/time/coverage, and a larger global globe frame. Kept the existing Cesium engine, evidence workbench, provider envelope, and durable ingestion.
- Repaired missing-coordinate/coercion, confidence, source-type, occurrence/publication/revision/verification clocks, exact verification mapping, independent-source counts, and heuristic-impact conflation. Undated records now survive the API and remain inspectable. Export preserves unknown revision times and legitimate zero timestamps. Provider environments are request-scoped; blocked storage fails softly.
- Stable event IDs retain Leaflet markers and Cesium event entities; unchanged inspector/feed markup retains keyboard focus and disclosures. Actual browser checks found and repaired 2D hidden-layout recovery and an opaque offline ocean layer.
- Evidence and bounded limitations: [audit repair report](AUDIT_REFACTOR_2026-09-30.md). Local syntax, platform, truth, renderer/API, SQL ingestion/recovery, offline validator, static handler/source smoke, and secret scan checks are recorded there. Browser evidence is synthetic; hosted/runtime/native PostgreSQL and owner acceptance are separate. No deployment or source activation.

## Durable USGS ingestion — local candidate

- Added a repeatable-read snapshot cursor, serialized change-log dispatch, explicit `409` resync after cursor expiry/restore, policy-based bounded retention with pending-work expiration, a native PostgreSQL concurrency/restore harness, and stored-data browser polling. `npm.cmd run test:recovery` passes against PGlite/PostGIS. The synthetic stored-data Edge journey passed all seven checks with zero exceptions; see [browser result](../artifacts/usgs-stored-browser-local/1790691186183/result.json). Native PostgreSQL and restore are NOT RUN because the server and CLI tools are absent. The source is still disabled and no hosted behavior is claimed.
- Added PostGIS evidence tables, policy-disabled USGS collector, idempotent transactional commit/outbox, material-change log, stored-USGS read mode for the existing event envelope, and bounded `/api/changes`. Removed browser direct-USGS outage fallback. No database, queue, Cron, Hyperdrive, or live source was provisioned or enabled.
- In-process PGlite/PostGIS integration is the current SQL proof. Independent H3 is PARTIAL: the reviewer matched 25 source hashes and reran both focused suites twice, but native concurrency and restore remain NOT RUN. Hosted read/write roles and runtime parity remain open. See [durable ingestion](DURABLE_INGESTION_LOCAL.md).
- Local syntax, platform, ingestion, repository-secret, security, and full validator checks pass. Replaced a stale USGS feed-directory link with the working GeoJSON documentation page. The browser-secret scanner has an exact-digest exception for Cesium's bundled public default ion token; any other JWT match is still reported. No hosted or independent verification is implied.

## 3D Watch Desk event journey — local only

- Reconciled stale #59 vault frontier: #59/#60 decisions closed, #61 human grammar acceptance open, PR #69 merged; #59 semantic implementation still deferred. See [run record](WATCH_DESK_2026-09-29.md).
- Existing Cesium globe now displays attention-budgeted geographic events, opens the source inspector from feed or globe picks, retains event/time/camera context across 2D/3D and reload, and keeps the selected marker visible above the mobile inspector. No provider, asset, or dataset was activated.
- Syntax and platform suite pass. Validator still fails vendored Cesium JWT-pattern scanning and an external USGS feed directory 404. Older Edge acceptance runner has stale scenario selectors; its 3D initialization, state, ten-switch, WebGL-fallback, and no-exception rows pass. No deploy or independent H3 claim.

## Hormuz historical sample journey — local only

- Reused the 2026-09-16 IMF PortWatch extract (`portid` chokepoint6, 2025-01-01 through 2025-01-07, sha256 `f5e8367a93451cb2a69dfda436c72a31e5769e5f6373e32a577d7e993ecfe69b`). Not re-fetched. Acquisition `historical_public`. Row publication date remains unknown. `n_total` stays an AIS transit-call estimate, not measured throughput. Evidence rank for that extract is `reported`. Operating status stays `unknown`.
- Scenario replay now evaluates restrictions at the scenario as-of, so the synthetic diplomacy step keeps physical access restricted. Diplomacy can read improving while throughput is disrupted (synthetic fixture) or unknown (historical extract). Invalidating or aging out `imf-portwatch` drops the throughput conclusion and supersedes a test-only approval.
- Browser journey on `127.0.0.1:8768` passed Question, Evidence, Assessment, Changes, and Export, including provenance. No deploy.

## Watch Desk globe — local only

- Cesium 1.145 `Build/Cesium` is vendored. `index.js` is the ESM bundle (`import { Viewer }`). `Cesium.js` is the IIFE (`var Cesium=`). Knockout 3.5.1 inside that bundle calls `eval("this")` while the module evaluates. The strict preview CSP blocked it, so `Viewer` never finished initializing. WebGL itself was available.
- Local preview now allows `'unsafe-eval'` for that bundle. `netlify.toml` is unchanged and still has no `'unsafe-eval'`, so a deployed page would still stop the globe. Passing `skyAtmosphere: true` was also wrong: Cesium treats that option as an instance, and the boolean caused `setDynamicLighting is not a function`.
- Edge on `127.0.0.1:8768` rendered the Natural Earth globe, moved the camera, kept the Hormuz selection through Investigation and back to 2D, resized, drew at longitude 179, and kept a usable 2D map when WebGL was forced off. Evidence: `artifacts/watchdesk-3d-2026-09-25/`. The measurement dock shows the existing PortWatch `n_total` series as `historical_public` with throughput unknown. No provider was enabled. Not independent H3.

## Investigation desk expansion — local only

## Investigation desk expansion — local only

- 2D Hormuz Investigate path repaired (`Map has no maxZoom specified` on local-earth). Genuine PortWatch series (75/65/67/77/56/54/63) renders in table+chart. Human review still pending.
- CISA KEV and NHC TWO snapshots frozen and shown as non-geographic feed records. Preview denies `/artifacts` and `/.env`. Website vibe audit is a **local adaptation** 12/12 on :8767, not original 20/20.
- Preview: `http://127.0.0.1:8767/?demo=foundation&view=chokepoints&chokepoint=strait-of-hormuz`

## Frozen PortWatch Hormuz sample — local only

- Bounded public query of IMF PortWatch `Daily_Chokepoints_Data` for `portid=chokepoint6` / Strait of Hormuz, calendar dates 2025-01-01 through 2025-01-07. `date` is `esriFieldTypeDateOnly` (not Unix ms). Field `n_total` mapped as AIS-derived estimated transit calls.
- Genuine case stays `review_required`. Operational status **unknown** (no baseline). Isolated `automated-test-only:hormuz-frozen-sample` approval is invalidated when one day is withdrawn. Provider not enabled. No deploy.
- Replay: `node scripts/replay-hormuz-frozen-sample.mjs` (no network). Tests: `node tests/portwatch-hormuz-frozen-sample-tests.mjs`.

## Evidence-to-assessment workbench v1 — local only

- On `feature/evidence-semantic-globe` (HEAD still `1640bed` plus inherited dirty foundation). Standing chokepoint watch, origin-vs-acquisition grouping, L01–L11 draft assessment, review binding, stale-approval invalidation, Source Explorer catalog overlay (`upstreamStatus` ≠ provider live), Investigate panel on the existing inspector.
- Synthetic Hormuz scenario remains labeled synthetic. PortWatch sample file is still a schema fixture, not a genuine dated measurement. No deploy, no new live provider, no FAIR/TAXII.
- See `docs/EVIDENCE_TO_ASSESSMENT_WORKBENCH.md`.

## Evidence model + semantic-zoom globe — local only

- On `feature/evidence-semantic-globe` from the zoom-aware foundation (HEAD `1640bed` plus inherited uncommitted foundation). L01–L11 operational evaluator, integrated chokepoint inspector, 2D/3D/Auto renderer boundary, compact wind-field decoder, maritime overlay distinction, and a satellite proof module.
- No-evidence assessments are `unknown`, not `normal`. Thresholds are `engineering-default-unvalidated`. Synthetic Hormuz scenario is labeled synthetic.
- Cesium ion is not used. NOAA GRIB decode is blocked on this Windows host (no wgrib2). PortWatch/World Bank/CelesTrak are not live-activated.
- See `docs/EVIDENCE_SEMANTIC_GLOBE.md`. Nothing pushed or deployed.


## Progressive event density — local only

- Shared event selection now requires high/critical severity at world zoom, adds medium at regional zoom, and allows all severities locally, within existing 18/80/240 budgets. Quiet views no longer fill with minor events.
- Filters and viewport checks precede selection; an inspected eligible record is retained within the cap. UI distinguishes scale-hidden records from budget-hidden records. Existing provenance/freshness and providers are unchanged.
- Focused tests are wired into the platform suite. See `PROGRESSIVE_ZOOM_DETAIL.md` for policy, local browser observations and verification. No deployment.

## Local zoom-aware foundation — not published

- User-requested God's Eye View reuse: contact roster, source/track inspector, return-to-view and MIT heading stabilization from pinned upstream revision. See `GODS_EYE_VIEW_REUSE.md`. No datasets or new live providers imported.

- On `codex/zoom-aware-map-foundation` from Phase 9 HEAD `1640bed`, rebuilt the map workspace, added filter-first world/regional/local attention budgets, list pagination, source precision facts, URL/saved map views, bounded transport scheduling/coalescing, and demo-only vector wind.
- OpenStreetMap street default; old CARTO dark endpoint visibly returned access-required tiles during QA and is disabled.
- No provider activation or hosting change. Existing Cloudflare Worker has only events/sources/provider-health API parity. Sites connector read access is available; migration remains gated on parity and local validation.
- See `docs/ZOOM_AWARE_MAP_FOUNDATION.md` for authority evidence, source matrix, benchmark, tests, screenshots and explicit remaining limits. July entries below are historical.

## Merged Recently

- Strategic chokepoints v1 is in review on `feature/strategic-chokepoints-event-intelligence-v1`: generalized registry, deterministic local correlations, explainable condition assessment, map/detail UI, URL state, and focused tests. It uses no new live provider.

- PR #37: added the ICM memory pack (`AGENTS.md`, project handoff, API contracts, security invariants, and next-task queue) so future agents start from repo context before broad exploration.
- PR #36: guarded Netlify compatibility APIs. Added rate limiting/body limits to Netlify `/api/*`, bounded JSON parsing for `/api/briefs` and `/api/alerts/test`, and `docs/SECURITY_AUDIT_BACKLOG.md`.
- PR #35: disabled scheduled production smoke test after production returned `503 usage_exceeded`; manual smoke testing remains available.
- PR #33: added Free-compatible Cloudflare Worker `/api/*` abuse protection in `src/api/rate-limit.js`.
- PR #31: documented local validation toolchain repair.
- PR #30: clarified user trust and navigation.
- PR #29: fixed Cloudflare `/sources` alias and documented public source backlog.
- PR #28: added Cloudflare source health routes.
- PR #25: covered Cloudflare events render path.
- PR #24: added open-source roadmap and core stability baseline.
- PR #23: added repo automation scaffolding.
- PR #22: added security policy and public risk controls.

## Open Context

- Branch `feature/future-feature-structure`: pending docs/structure PR to add future feature folders, feature-flag documentation, and data-model notes without runtime wiring.
- PR #34: Dependabot bump for `actions/checkout`.
- PR #32: input-validation hardening branch remains open but was dirty against current `main` during the July 2 audit. Do not assume it is merged.

## Current Known Issues

- `docs/SECURITY_AUDIT_BACKLOG.md` tracks Medium/Low hardening work: event source URL scheme allowlisting, Cloudflare asset header parity, provider response byte caps, and RSS redirect hardening.
- Cloudflare Worker handles fewer API routes than Netlify; unknown Cloudflare `/api/*` must remain JSON `404`.
- Production smoke schedule is intentionally disabled; use manual smoke tests when production quota is healthy.

## Recent Verification Baseline

PR #36 passed GitHub checks: `cloudflare-validation`, `validate`, browser secret scan, repo secret scan, CodeQL, and Workers Builds. Local checks passed: `npm.cmd run check`, `npm.cmd run test:platform`, `npm.cmd run security:scan`, `npm.cmd run security:repo-scan`, `npm.cmd run validate`, `npm.cmd run test:e2e`, `npm.cmd run test:sources`, and `git diff --check`.
# 2026-07-15 - Open News and Social Signal Fusion v1

Added metadata-only source observations, source-organization-aware storylines, and configuration-gated open news/social provider boundaries. Latest Intelligence separates trend velocity from verification and displays coverage gaps.
