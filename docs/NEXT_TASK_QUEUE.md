## 2026-10-17 - Globe visual pass awaiting owner review

- Owner visual acceptance of the globe pass (`docs/GLOBE_VISUAL_2026-10-17.md`, screenshots in `artifacts/globe-visual-2026-10-17/`).
- Production Cesium CSP: owner chose a separate globe page (`/globe.html` adds `'unsafe-eval'`; other pages stay strict). Confirm the per-path headers on a deploy preview before merge.
- Vendor the Natural Earth 1:110m boundary lines (public domain) if borders are approved; the loader is already in place.
- Merge order: draft PR #75 first, then the stacked follow-up PR.

## 2026-10-12 - Aviation installation decision pending

- Review the exact-file installation map, full hashes, ownership, dependencies and rollback card before any canonical writes. [Aviation scope and use](AVIATION_LOCAL_INTEGRATION_2026-10-12.md) describes the proposed local capability; installation remains NOT RUN pending a separate authorization and verified receipt.
- Preserve October 5 installed functionality/history and October 2 dated cache-only replay. Validate the aviation negative suite and existing maritime/selection/Watch behavior after any authorized installation; then request independent installed H3. Keep owner visual acceptance, source activation and deployment separate.
- Existing queue items and gates below remain unchanged; this entry records a proposal, not a priority override or accepted operational assessment.

## 2026-10-12 — Review the reproducible USGS spine

The isolated candidate `824d6aea6a34a00933922f6ca8ac09472778034d` now has genuine USGS/API/map/inspector/evidence/export identity, exact camera/filter/time continuity, source clocks and injected-failure browser proof. [Review evidence and limits](../artifacts/usgs-milestone-20261012/REVIEW.md). It is not installed in this checkout.

Next bounded work: reconcile the inherited platform cache-policy assertion, obtain independent H3 and owner review of this exact candidate, then decide integration. Keep #61 human acceptance and assessment/review/hosted-ingestion gates explicit. Additional live layers remain deferred. PR #73 is open separately; old PR-state and pending October 5 installation entries below are historical.

## 2026-10-05 - Local integration complete; remaining bounded work

- Approved 53-path integration is installed and checked; [installation proof](LOCAL_INTEGRATION_2026-10-05.md) supersedes prior pending-installation entries below. Preserve unrelated dirty work and frozen candidate packages.
- Obtain owner visual acceptance of actual Reports/search/inspector/mobile and the existing Evidence ledger flows; local integration does not close #61.
- Keep provider activation and hosted publication separate. The verification preview is cache-only October 2 replay; current public feeds, global AIS/cargo/security coverage and live corporate evidence are not demonstrated. Keep paid BYO disabled by default and zero paid budget.
- Continue existing owned-API/native PostgreSQL recovery work only within its separately authorized scope. Production Cesium CSP and native/hosted restore/concurrency gates remain open.

## 2026-10-02 · Owner decision after local selection/source review

1. Review isolated direct-selection/source candidate and H3 evidence; reconcile exact current file hashes before any application. Original maritime candidate/package remains historical.
2. Decide local installation separately from source/hosting activation. New source flags stay off; ADSB.lol production contact/ODbL review, OpenSky operational license and host clock synchronization remain explicit conditions.
3. Execute OWNED_API_INGESTION_PLAN.md incrementally through existing collector/read-model interfaces after native/hosted concurrency, budget and restore proof. Do not create duplicate dashboard or broad global tracking poller.
4. Prioritize AWC, CelesTrak, GIBS, regional Norway AIS/selected district/approved historical data only after per-source terms, geometry and chronology proof; 34 research leads are not working feeds.

# Next Task Queue

Small, agent-ready tasks only. Do not turn these into broad refactors.

## Maritime signal candidate (2026-10-02) — owner decision pending

- Review [the isolated maritime evidence slice](MARITIME_SIGNALS_LOCAL.md), independent review and actual browser/check artifacts. Reconcile baseline hashes with current canonical dirty source before deciding installation; this queue addition exists only in the candidate.
- Keep cargo confirmation separate from published estimates, AIS/dark visibility and security. Verified current-news examples may be attached only with actual source URL, publication/observation/retrieval clocks, method, units and coverage. Conditional forecasts remain context. No source activation or release is authorized here.

## Watch design/build reviewed locally (2026-09-30)

- Review the running interface and [editable design/evidence record](DESIGN_BUILD_2026-09-30.md) for owner visual acceptance. The local candidate implements mobile map/feed/source flows, loaded-data historical browsing and source-aware lens guides; it does not close #61 or release gates.
- The WebGL capability probe lifetime, saved-view renderer, inspector teardown/reset and hidden-pane keyboard repairs are locally verified. Keep source activation and continuous weather/radar/wind/space feeds as separate bounded tasks with provider policy and dated data contracts. The current wind is explicitly synthetic; current source maps are links.
- Repository validation still flags the known public Cesium token in unrelated generated backup copies. Reconcile scanner ownership without altering those concurrent artifacts or weakening token checks. Production globe CSP and native PostgreSQL/restore proof remain open.

## Audit repairs completed locally (2026-09-30)

- The authorized selective refactor is documented in [AUDIT_REFACTOR_2026-09-30.md](AUDIT_REFACTOR_2026-09-30.md). Existing queues and release gates continue to apply.
- Remaining bounded engineering candidates: explicit unknown severity across taxonomy/filter/risk consumers; Cesium screen-space decluttering; finer controller ownership and retirement of legacy CSS/compatibility routes after measured acceptance. No framework migration is required by these repairs.
- Review the Watch workspace visually against #61 human acceptance. Production Cesium CSP and native PostgreSQL/restore evidence remain open; local audit repair evidence does not close those gates.

## Durable ingestion candidate — local only

- Review [the USGS local slice](DURABLE_INGESTION_LOCAL.md). Next bounded validation is running the prepared native PostgreSQL/PostGIS concurrency and restore harness against two empty, disposable loopback `live_map_test_*` databases. The server and CLI tools are absent on this host, so this is NOT RUN. Then verify connection/role limits and exact Worker/Netlify route behavior. The migration and flags remain off; no collection or hosted switch is authorized by this queue entry.
- Before enabling a recurring USGS job, settle source policy and legal retention review, configure Cron/Queue/Hyperdrive with retry and dead-letter behavior, and complete H3 after native concurrency/restore evidence. Current independent H3 is PARTIAL for that missing native proof. Identity, R2, other providers, and notification delivery remain separate follow-ons.

## Current local Watch Desk follow-on (2026-09-29)

- Screen-space decluttering and bounded aircraft/vessel inspection on the existing 3D globe. Start from [the Watch Desk run](WATCH_DESK_2026-09-29.md), preserving the current feed-to-globe selection, camera, URL, and evidence state. Use only already fetched or approved observations; verify world/regional/local density, mobile layout, source/time labels, and repeated mode switches. #61 owner acceptance and production globe productization remain separate.
- #59 is a recorded product decision, not completed code. After the visual follow-on, implement versioned meaningful-change snapshots and source-organization-aware suppression in the operator UI. No browser push or public-map promotion.

## Context Updates

- Completed locally (2026-09-13): progressive event severity thresholds on the shared attention selector; see `PROGRESSIVE_ZOOM_DETAIL.md`. Next bounded density candidate: screen-space decluttering for overlapping high-severity markers while retaining inspectability and the current provider contracts. Not implemented in this slice.

- In review: Strategic chokepoints v1 on `feature/strategic-chokepoints-event-intelligence-v1`. Keep follow-on provider work separate from the local registry and do not label a source live without the source-registry contract.
- Completed: PR #37 created the ICM memory pack and made `AGENTS.md`, `docs/PROJECT_HANDOFF.md`, `docs/LAST_30_DAYS.md`, `docs/API_CONTRACTS.md`, `docs/SECURITY_INVARIANTS.md`, and this queue the first-read context for future agents.
- In progress: Future feature structure and feature-flag documentation on branch `feature/future-feature-structure`. Keep it docs/structure-only: no runtime imports, no fake UI, no unfinished feature activation.

## Upstream feature transfer

- Contact interactions and heading helper integrated from/inspired by God's Eye View; see `GODS_EYE_VIEW_REUSE.md`. Next bounded candidates are dated satellite orbital elements and launch timelines, each with source review and an explicit separate implementation task. Keep current Leaflet and provider-access boundaries.

## P0

### Human review of the genuine Hormuz draft (unchanged)

- Goal: owner reviews `artifacts/hormuz-portwatch-2025-01/drafts/genuine-assessment.md` (regenerate with `node scripts/replay-hormuz-frozen-sample.mjs`). Do not treat test-only approvals as human review. Provider stays off.
- Touch first: `docs/EVIDENCE_TO_ASSESSMENT_WORKBENCH.md`, frozen extract provenance.
- Test: none until the owner records an explicit review.

### Re-run isolated browser acceptance of 2D/3D inspector + Investigate

- 2026-09-25: local Cesium 1.145 renders on the preview (`artifacts/watchdesk-3d-2026-09-25/result.json`). Production `netlify.toml` still omits `'unsafe-eval'`, so deployed 3D is not claimed. The 2026-09-15 full-globe rows for density, wind, and recovery steps were not re-closed.
- Next: approved feed activation and one energy-context series. Do not enable providers from this note. Do not overwrite `artifacts/evidence-globe-runtime/2026-09-15T-runtime`.


### Vendor Cesium 1.145 locally and capture globe screenshots

- Goal: copy Apache-2.0 Cesium Build (workers, widgets, Natural Earth II) into `vendor/cesium/` without an ion token, then verify imagery in the local preview.
- Touch first: `src/map/cesium-adapter.js`, `scripts/preview-foundation.mjs`, `docs/EVIDENCE_SEMANTIC_GLOBE.md`.
- Test: `node tests/semantic-globe-weather-tests.mjs`; browser 2D/3D/Auto + WebGL-loss fallback.

### Bounded GFS subset once wgrib2 or a Windows-safe decoder exists

- Goal: replace the compact-field decoder fixture with a real recorded 10 m U/V subset.
- Touch first: `scripts/prepare-gfs-wind-sample.mjs`.
- Test: recorded field separate from synthetic; no full-archive download.

### Complete hosting parity for the redesigned map

- Local foundation implemented on `codex/zoom-aware-map-foundation`; see `docs/ZOOM_AWARE_MAP_FOUNDATION.md`.
- Next: fixture-test Cloudflare country, risk and bounded moving-object routes plus `/countries` and `/diagnostics` aliases; preserve structured unknown-API 404 and Netlify direct routes. Add equivalent asset security headers and public asset allowlisting.
- Measure Worker CPU/subrequests and durable provider quota strategy before a migration. Do not deploy or activate sources without an explicit next instruction.
- Finish browser stress/frame/heap and keyboard focus testing before claiming the entire attached milestone complete.

### Add governed official chokepoint notice adapters

- Goal: evaluate official canal, port, and maritime authority notices one source at a time for terms, attribution, cache, retention, provider health, and public safety boundaries.
- Touch first: `src/sources/master-source-registry.js`, `src/data/providers/`, `docs/STRATEGIC_DATA_SOURCE_ROADMAP.md`.
- Test: adapter fixtures, source-status degradation, `npm run validate`, `npm run test:platform`.

### Rebase or close PR #32

- Goal: decide whether `feature/input-validation-hardening` is still needed after PR #33 and PR #36.
- Touch first: GitHub PR #32, `src/api/events-response.js`, `src/api/sources-response.js`, `src/api/provider-health-response.js`, frontend query parsing files.
- Test: `npm run check:syntax`, `npm run test:platform`.

### Review source URL boundary repair candidate

- Candidate: `fix/audit-20261012-live-map` enforces absolute HTTP(S) and no embedded credentials at ingestion and every external source-link renderer. Review [candidate guide](AUDIT_REPAIR_2026-10-12.md); independent review, hosted CI and release are separate gates.
- Touch first: `src/events/normalized-event.js`, `src/app-controller.js`, `src/ui/dialogs.js`, provider normalizers that set `sourceUrl`.
- Test: add cases for `javascript:`, `data:`, `mailto:`, relative URLs, `http:`, and `https:`.

## P1

### Add Cloudflare asset security headers

- Goal: match Netlify CSP/security headers for Cloudflare static asset responses.
- Touch first: `src/worker.js`, `netlify.toml`, `tests/run-tests.mjs`.
- Test: Worker responses for `/`, `/app.js`, `/sources` include CSP, `X-Content-Type-Options`, and `Referrer-Policy`.

### Add bounded provider JSON helper

- Goal: avoid unbounded `response.json()` on upstream provider responses.
- Touch first: `src/data/providers/orchestrator.js`, direct provider `response.json()` calls.
- Test: over-cap JSON, malformed JSON, normal JSON.

### Stream RSS feed size cap

- Goal: stop reading RSS/Atom bodies after the configured byte cap.
- Touch first: `src/data/providers/rss-feed.js`.
- Test: fake over-cap feed response must not fully materialize.

## P2

### Harden RSS redirect policy

- Goal: disallow or tightly restrict redirects outside the feed registry.
- Touch first: `src/data/providers/rss-feed.js`, `src/data/providers/ssrf-protection.js`.
- Test: private host literals, link-local hosts, non-allowlisted redirect destinations.

### Draft evidence record model

- Goal: introduce evidence/claim/assessment terminology without changing public API shapes yet.
- Touch first: `docs/OSINT_FORGE_ALIGNMENT.md`, `src/events/normalized-event.js`, `docs/SOURCE_QUALITY_AND_VERIFICATION.md`.
- Test: documentation only unless adding schema helpers.

### Add advanced source-mode UI sketch

- Goal: let advanced users inspect provenance without overwhelming the public map.
- Touch first: `src/app-controller.js`, `src/ui/`, `docs/STANDARD_AND_ADVANCED_MODES.md`.
- Test: smallest frontend rendering/unit coverage available.
# Next: Review and activate approved open-news/social watchlists

Before enabling any new social/video provider, document official access, terms, attribution, quota budget, cache/retention policy, approved watchlists, and provider-specific test fixtures. Do not add scraping or browser credentials.
## 2026-10-02 — Working local Watch candidate owner decision

1. Review the running actual-public-data Reports workflow and independent evidence in WORKING_WATCH_LOCAL.md; accept or adjust the exact cumulative candidate after fresh canonical hash reconciliation.
2. Coordinate with the existing hosting/live-feed owner before canonical integration. Preserve inherited dirty work and immutable 16/41-path deliveries.
3. After explicit approval, use WORKING_WATCH_HOSTED_PLAN.md for a draft on the existing site. Resolve actual hosted source coverage, Cesium policy and durable-ingestion/recovery gates before publication; keep paid source budget zero.
