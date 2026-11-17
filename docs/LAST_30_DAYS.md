# Last 30 Days

Last updated: 2026-10-21.

## 2026-10-21 - Frozen grid-region incident extension

- Extended the existing offline multi-site evaluation container to schema v2 for
  Reuters-attributed Ukrainian grid-region reports. Kept exact assets, physical
  damage, outage start, restoration, and cessation verification unknown or false;
  Odesa's 32,700 families is explicitly a report-time regional observation.
- Focused query/negative tests and feature-standard gates are documented in
  `MULTI_SITE_INCIDENT_EVALUATION.md`. No provider, public API, or UI change.

## 2026-10-19 - Hosted acceptance probe (PARTIAL)

- Fetched remote main `5aabf0f` read-only; globe/workbench foundation is merged.
  Older local-only/open-PR statements below remain historical.
- Cloudflare 2D/globe and real USGS source-snapshot journey worked; five frontend
  assets match main. Serving Worker version remains unbound. Netlify globe 404
  was reproduced without a serving SHA.
- Mobile Map cleared selection; USGS Evidence ledger navigation opened Hormuz;
  export source-count terminology differs from inspector independent evidence;
  one API 503 exposed an incorrect future retry label before manual recovery.
- Details and locally retained receipts: `HOSTED_ACCEPTANCE_2026-10-19.md`.
  No deployment or runtime edits. Hosted acceptance and owner review remain open.

## 2026-10-18 - Frozen multi-site incident evaluation

- Added one offline St. Petersburg four-site case and negative mutation tests in
  `tests/multi-site-incident-evaluation-tests.mjs`, wired into the platform suite.
- AP/Reuters/RFE-RL search excerpts only; full-page retrieval failed. All claims
  retain attribution and uncertainty; ceasefire terms remain brief-only.
- No runtime/API/provider changes. Operational-evidence/workbench and PortWatch
  sample files are absent on this base. See `MULTI_SITE_INCIDENT_EVALUATION.md`.

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
