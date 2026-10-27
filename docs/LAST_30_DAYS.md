## 2026-10-27 - Main merged into the install-check follow-up

Merged current main into the locked-install follow-up. Validate still runs `npm ci --ignore-scripts --no-audit --no-fund` before the existing checks, and the Electric SQL Dependabot comment still says grouping combines available updates. Main's fixture-only Forge staging job, security workflow updates, and the locked PGlite 0.5.11 / PostGIS 0.2.11 pair (exact peer 0.5.11, from #89) are kept. The lockfile matches main and was not hand-edited. No deployment.

## 2026-10-21 — Forge USGS staging harness

Added fixture-only Forge SQLite → real loopback HTTP → existing Live Map API/filter integration, pinned to Forge PR #4 merge. Exact USGS identity mapping retains Forge aliases; native duplicates win intact. Unrelated providers stay present; failures are sanitized. Stored-cursor mode is shadow-only because Forge has no compatible change feed. No production route/provider/source authorization or hosting changes. See [scope, evidence and remaining gates](FORGE_STAGING_INTEGRATION_2026-10-21.md).

## 2026-10-21 - Dependabot peer compatibility review candidate

PR #86 groups available `@electric-sql/*` version updates, but grouping permits a single changed member. PR #83's actual manifest/lockfile reproduces `npm ci` failure: PGlite 0.5.10 conflicts with PostGIS 0.2.8's exact 0.5.8 peer. After #82, the lock resolves PGlite 0.5.10 and PostGIS 0.2.10 (exact peer 0.5.10); the manifest's PGlite `^0.5.8` range accepts that resolution.

This follow-up adds `npm ci --ignore-scripts --no-audit --no-fund` to Validate, which previously ran checks without installing dependencies, and corrects the grouping comment. It reuses npm's compatibility checks rather than adding a custom version rule. Deployment configuration, manifests and lockfile are unchanged by that follow-up commit. GitHub review/merge remains pending; successful configuration-only previews do not demonstrate future Dependabot update behavior.

Local Node 20.20.2/npm 10.9.9 installation accepts the current pair and rejects #83 with `ERESOLVE`. Syntax, offline platform tests, 49 audit-repair tests and the offline validator pass. The online validator fails only its external USGS event-URL reachability row in this environment; that is not dependency-install evidence. Dependabot grouping was checked against official documentation and updater source, not a hosted future-update run.

## 2026-10-19 - PR #80 conflict reconciliation

Merged current main into the follow-up candidate, preserving its homepage routing, saved-view serialization and Back behavior alongside local borders, Cloudflare page headers and Netlify environment forwarding. Removed the duplicate globe-generation transform. CSP parity readers now normalize Windows line endings without changing policy assertions. Local syntax/Cloudflare exports, offline platform suite, offline validator, generated-page consistency and both secret scans pass. Production smoke and hosted acceptance remain separate evidence; no deployment.

## 2026-10-19 - Main page opens in 2D, borders vendored, Cloudflare CSP

The main page now opens in 2D; choosing 3D opens `/globe.html`, while Auto stays in 2D on the main page, and shared links asking for 3D redirect there. Natural Earth 1:110m boundary lines are vendored (owner approved the download). The Cloudflare Worker now sends the same page CSPs as `netlify.toml` from `src/security-headers.js`. Netlify `/api/events` now passes `process.env`, so `LIVE_MAP_STORED_USGS` can take effect there as it already did for `/api/changes`. A read-only review found hosted durable ingestion is not wired on either host (see the task queue). No deployment.

## 2026-10-19 — Homepage 2D / dedicated globe routing correction

Homepage HTML and URL-state defaults now select 2D; /globe and /globe.html default to 3D. Explicit 3D choices, legacy map=3d links and restored 3D saved views serialize current workspace state before navigating to /globe.html. The origin history entry is normalized to 2D so Back stays usable. Auto remains 2D under the homepage's strict CSP; Auto on the globe page retains adaptive rendering. Saved preferences do not silently choose a renderer on a fresh homepage; saved views remain explicit user actions. Globe-page generation independently selects 3D. netlify.toml is unchanged.

Local syntax, platform suite (including page-mode regression tests), generated-page consistency and browser-secret checks pass. Local controller/state execution checks cover defaults, serialization and navigation; no local interactive browser result is claimed because the connected browser is on a separate machine from this checkout. Regression payload is synthetic.

Read-only hosted checks at https://liveworldmap.netlify.app on October 19 UTC: / returns HTTP 200 with strict script-src 'self'; /globe.html returns HTTP 404 with the same strict policy, independently confirmed in the browser as Netlify's Page not found screen. This does not establish which commit is deployed. Hosted globe startup and candidate behavior remain unverified. No deployment or merge performed.

## 2026-10-17 - 3D globe gets its own page

Owner chose a separate globe page for the production Cesium CSP. `netlify.toml` now sets the CSP per path: `/globe` and `/globe.html` add `'unsafe-eval'` for Cesium's bundled Knockout, and every other page keeps the strict policy. `globe.html` is generated from `index.html` by `scripts/build-globe-page.mjs`. The fallback card on other pages links to the globe page. Header behaviour must still be confirmed on a deploy preview. No deployment.

## 2026-10-17 - Candidate committed, main merged, globe visual pass

The 53-path candidate and inherited foundation are committed on `feature/evidence-semantic-globe` (draft PR #75 to `main`). Current `main` (33d426f) is merged in. Main's audit-repair suite is reconciled with candidate semantics: undated records stay visible as "Time unknown", unknown exact clocks read "Not supplied", the browser direct-USGS fallback stays removed, and source URLs use the shared `safeSourceUrl` helper. The inherited registry cache-policy assertion is fixed. The validator now skips gitignored root evidence folders. The 3D globe gained a night-atlas restyle, atmosphere/terminator, stars, graticule, optional local borders, severity-styled clustered markers and smooth fly-to ([record and CSP implications](GLOBE_VISUAL_2026-10-17.md)). The repository ruleset requires PRs for updates to every branch, so follow-ups go out as a new stacked branch and PR. No deployment.

## 2026-10-12 - Aviation local installation proposal prepared

The dated aviation candidate has a separate exact-file installation proposal; canonical installation and owner acceptance remain NOT RUN until a verified application receipt exists. The proposed bytes add shared read-only Case/Evidence/Assessment/Changes inspection and a matching agent command. See [scope and ordinary/agent use](AVIATION_LOCAL_INTEGRATION_2026-10-12.md). Candidate H3 verification does not establish installation, incident authenticity or current operations.

The October 5 integration record and October 2 cache-only replay are preserved. Five overlapping destinations are explicitly mapped; all other October 5 files retain their hashes. Historical context follows unchanged. No deployment or provider activation is authorized by this record.

## 2026-10-12 — Genuine USGS spine verified in an isolated snapshot

Candidate `824d6aea6a34a00933922f6ca8ac09472778034d` identifies 889 exact committed files, including the inherited dirty/untracked application. Added shared read-only USGS evidence projection and fixed cumulative camera persistence drift. Six focused suites, syntax, candidate validator and revision-bound browser/export/outage checks pass. Full offline platform suite still fails an inherited registry cache-policy assertion. No canonical runtime installation, push, deployment or provider activation. [Evidence report](../artifacts/usgs-milestone-20261012/REVIEW.md).

## 2026-10-05 - Approved local integration installed

The owner-approved 53-path maritime, selection/source and Working Watch candidate is now installed in this canonical repository on branch `feature/evidence-semantic-globe` at unchanged HEAD `1640bed51a76fb916f570d755bf5e576ccc36646`. Exact preconditions, task-local backups and installed hashes were checked. This supersedes the older candidate-only/pending-installation notes below; the frozen candidate, review and Library archive remain historical artifacts. See [installed state and proof](LOCAL_INTEGRATION_2026-10-05.md).

Ten scoped suites, repository syntax/Cloudflare export checks, changed-module syntax and 23 native installed-browser checks passed. The browser proof uses explicitly dated October 2 saved public observations, not current data. New providers remain off and the paid API budget remains zero. No commit, push, merge, deployment, account, credential or security changes. Owner visual acceptance (#61), production Cesium policy, current-feed activation, and native/hosted durable-ingestion recovery remain separate decisions/gates.

## 2026-10-02 · Direct selection and public-source isolated candidate

Reproduced canonical Watch cards selecting directly; added omitted Evidence ledger entry and selectable schema-bound records, reload/case identity, mobile access and keyboard Back/focus. New candidate imports the prior maritime delta while preserving its historical 16-path freeze. Three public connectors (NHC, Digitraffic regional AIS, ADSB.lol aircraft) are locally implemented/tested but OFF; bounded public development reads are not activation. Free-default optional fork gate blocks paid/unknown-price adapters without explicit billing and genuine hard budget enforcement. Owned API plan reuses existing USGS durable ingestion and API envelopes. See DIRECT_SELECTION_AND_SOURCES_LOCAL.md and OWNED_API_INGESTION_PLAN.md. No canonical installation, credentials, source contact, paid activity or publication.

# Last 30 Days

Last updated: 2026-10-17 (branch merged with main; draft PR #75).

## Independent maritime signals — isolated local candidate

- Extended the existing operational evaluator and Assessment inspector with independent AIS visibility, dark-traffic inference, cargo-confirmation/published-estimate evidence, and security reports. Each retains provenance, clocks, coverage, confidence and unknowns; no AIS absence-to-zero-flow inference, averaging or safety/recovery score.
- Focused regression and independent semantic checks cover future/conditional/stale evidence, numeric/proxy guards, contradictions, case export and historical PortWatch labels. See [local candidate record](MARITIME_SIGNALS_LOCAL.md) and its linked evidence for actual browser/review status.
- Canonical repo remains untouched. No sources, routes, hosting, credentials or paid services changed. Installation and owner acceptance are pending; release gates remain open.

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
## 2026-10-02 — Useful Watch workflow with actual public reads (isolated candidate)

Extended the reviewed maritime/selection candidate into a running local Reports workflow using bounded genuine USGS and NHC/CPHC reads. Source/place search, direct inspector selection, source measurements/UTC clocks/coverage, full loaded read baseline, material revisions, mobile Reports/search and response-generation guards use existing UI/schema/Cesium/workbench. Excluded records and source-clock uncertainty remain visible. See WORKING_WATCH_LOCAL.md and WORKING_WATCH_HOSTED_PLAN.md. Canonical, previous candidate/Library freezes, production routing/flags and zero paid budget are preserved; owner integration and hosted gates remain pending.

# 2026-10-12 — bounded repository audit repair candidate

Separate branch `fix/audit-20261012-live-map` repairs source URL safety, nullable zero/unknown confidence and source clocks with ingestion kept separate, obsolete USGS documentation references, and enforceable local/CI regressions. CodeQL's unchanged supported job now fails on analysis errors. Existing main/canonical installations and release/hosted/provider gates remain separate. See [candidate editing guide](AUDIT_REPAIR_2026-10-12.md). Independent review and hosted CI are tracked in the external repair receipt, not assumed from local tests.
