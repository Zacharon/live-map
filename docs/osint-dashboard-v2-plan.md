# OSINT Dashboard v2 — Implementation Plan

**Branch:** `feature/osint-dashboard-v2`  
**Date:** 2026-07-08  
**Milestone:** Dashboard shell with event filters, provider health, and event detail drawer

## Before State (audited)

| Area | Finding |
|------|---------|
| Framework | Vanilla ES modules, no React/Vue; Leaflet map |
| Entry | `index.html` → `app.js` → `src/app-controller.js` |
| Layout | 3-column grid: left filter sidebar, map center, right event feed |
| Filters | Domain, layer/category, severity, time window, search — in `filterDrawer` |
| Event detail | Modal `<dialog>` via `src/ui/dialogs.js` |
| Provider health | Text summary in `#sourceHealth`; domain breakdown in `#sourcesStatusPanel`; full panel in diagnostics |
| Stats | Basic 4-cell grid (`visibleCount`, `highCount`, `countryCount`, `updatedAt`) |
| APIs | `/api/events`, `/api/sources`, `/api/provider-health`, `/api/source-status`, etc. |
| Tests | `npm run check`, `npm test` (platform + validate + e2e + sources) |

### Gaps

1. No unified operator summary — stats scattered across sidebar sections.
2. Provider health is verbose in advanced mode but hard to scan at a glance.
3. Event detail requires modal; no persistent drawer for feed/map workflow.
4. Active filter state not summarized — operators must scan multiple sections.
5. Empty/error/loading states exist but are not grouped in one operator surface.

## Smallest Safe Increment

Add a **Dashboard v2 shell layer** (`src/ui/osint-dashboard-v2/`) that:

- Renders summary cards (events, active/degraded sources, last refresh)
- Renders compact provider health rows with stale/offline warnings
- Renders active filter chips (read-only summary + clear actions)
- Renders event detail drawer when an event is selected from the feed
- Does **not** change API routes, provider adapters, or filter logic
- Does **not** add new dependencies or providers

## Files to Change

| File | Action |
|------|--------|
| `src/ui/osint-dashboard-v2/*.js` | Create — shell components |
| `dashboard-v2.css` | Create — v2 layout/styles |
| `index.html` | Add v2 containers + CSS link |
| `src/app-controller.js` | Wire v2 render + event selection |
| `package.json` | Add syntax checks for new modules |
| `tests/run-tests.mjs` | Add unit tests for v2 helpers |
| `docs/osint-dashboard-v2-verification.md` | Create after implementation |

## Files Not to Touch

- `netlify/functions/*` — API behavior unchanged
- `src/data/providers/*` — no new providers
- `.env`, secrets, deployment config
- SmoothOps / Obsidian vault files
- Existing filter/event normalization logic (only consume)

## Follow-Up (out of scope for this milestone)

- Source scoring
- Event clustering UI
- Timeline mode
- OSINT source catalog expansion
- Infrastructure / conflict security layers