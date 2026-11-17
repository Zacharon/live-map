## 2026-10-12 — Revision-bound local USGS candidate

A complete isolated Systems Desk/Cesium snapshot now exists at commit `824d6aea6a34a00933922f6ca8ac09472778034d`. One genuine USGS record was traced through API, map/list, inspector, typed evidence snapshot and actual JSON download. Renderer/refresh/camera/filter/time continuity and injected-outage retention passed locally. The candidate is not installed here; canonical runtime bytes are preserved. See [full evidence and remaining gates](../artifacts/usgs-milestone-20261012/REVIEW.md).

Read-only remote reconciliation: main remains `84a4dff47fa8f96a1d8eb482a446743900a3275e`, but PR #73 is now open. #61 has no acceptance response. Older open-PR and pending-installation notes below are historical; the October 5 installation is already complete. New candidate H3/owner acceptance, hosted ingestion and production globe gates remain open.

# Project Handoff

Live Map is a static frontend plus server-side provider orchestration for public-information events, source transparency, country risk context, diagnostics, and bounded aviation/maritime prototypes.

## What It Is

- Public map/feed UI backed by `/api/events`.
- Source registry and Source Explorer backed by `/api/sources`.
- Provider diagnostics backed by `/api/provider-health` and `/diagnostics`.
- Country scores backed by `/api/country-risk`.
- Netlify-compatible static app with Cloudflare Worker compatibility for selected routes.

## What It Is Not

- Not emergency dispatch or operational guidance.
- Not a live intelligence verdict engine.
- Not a scraper of private, paid, or restricted sources.
- Not a place to expose provider credentials in frontend code.
- Not a system where raw social/OSINT claims directly control map layers.

## Fast Start For Agents

Read first: `AGENTS.md`, this file, `docs/LAST_30_DAYS.md`, `docs/API_CONTRACTS.md`, `docs/SECURITY_INVARIANTS.md`, `docs/NEXT_TASK_QUEUE.md`.

Only then inspect targeted code:

- Frontend map/feed: `app.js`, `src/app-controller.js`, `src/ui/`, `src/map/`.
- API routes: `netlify/functions/`, `src/api/`, `src/worker.js`.
- Providers: `src/data/providers/`, `src/sources/master-source-registry.js`.
- Risk/scoring: `src/risk/`, `src/events/`, `docs/CII_V2_METHODOLOGY.md`.
- Tests: `tests/run-tests.mjs`, `scripts/live-map-validator.mjs`.

## Current Safety Bias

Prefer honest disabled/configuration-required states over fake completeness. Weak or unverified OSINT may become a lead or evidence record, not a public map claim.
