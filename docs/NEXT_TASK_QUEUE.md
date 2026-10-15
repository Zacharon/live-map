# Next Task Queue

Small, agent-ready tasks only. Do not turn these into broad refactors.

## Real history and globe follow-on — completed locally (2026-09-30)

- The named implementation is recorded in [REAL_HISTORY_2026-09-30.md](REAL_HISTORY_2026-09-30.md). Ordinary Watch now has source-backed September 2024 History, shared finer US imagery, viewport-first display groups and a globe running under production-equivalent local CSP.
- Remaining bounded acceptance: actual 200% browser zoom/reduced-motion preference in a supporting browser, owner #61 visual acceptance, hosted CSP/runtime validation, native PostgreSQL/restore. No deployment, background collector activation or provider credential work is authorized.
- Fine global imagery beyond US coverage needs a separately eligible source; the public USGS service is intentionally honest about coarse coverage elsewhere. Additional archive months remain separate bounded acquisitions.

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

### Add source URL scheme allowlist

- Goal: prevent provider-controlled event links from rendering non-web schemes.
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
