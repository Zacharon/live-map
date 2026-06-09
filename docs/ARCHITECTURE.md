# Architecture

Live Map remains a Netlify-compatible static application with serverless functions.

## Current structure

- `index.html` provides the map-first shell.
- `app.js` bootstraps native JavaScript modules.
- `src/` contains frontend configuration, state, map, dashboard, event, risk, finance, alert, AI, and UI modules.
- `netlify/functions/events.mjs` preserves the working event feed for USGS, NASA EONET, NOAA/NWS, and GDACS through server-side provider orchestration.
- `netlify/functions/provider-health.mjs` exposes sanitized provider diagnostics for `/diagnostics`.
- `netlify/functions/country-risk.mjs` computes CII v2 country scores from orchestrated provider results.
- Additional Netlify Functions expose Phase 1 registry/scaffold APIs.
- `data/` stores lightweight data pointers and development-fixture notes.

## Phase 1 design

The platform is intentionally modular without adding a framework or build step. Heavy future features such as 3D globe rendering, network graphs, AI briefs, aviation, maritime, and licensed cyber feeds have adapter boundaries and documentation but are not falsely presented as live.

## Current risks

- EONET can intermittently return `503`; partial-data handling keeps the app usable.
- Market prices are not live until a lawful server-side provider is configured.
- CII v2 is an experimental analytic score, not an official risk rating.
- The Phase 2D country navigation layer uses simplified rectangular bounds for selection only, not precise legal borders.

## Phase 2D additions

- `/countries` provides searchable and sortable country CII v2 score views.
- `/diagnostics` contains detailed sanitized provider-health diagnostics.
- The main dashboard shows compact public data status instead of detailed provider internals.
- Provider capability metadata lives in `src/data/providers/capability-registry.js`.
- New open RSS provider groups are independently gated by environment variables and default to `configuration-required`.

