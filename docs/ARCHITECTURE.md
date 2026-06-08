# Architecture

Live Map remains a Netlify-compatible static application with serverless functions.

## Current structure

- `index.html` provides the map-first shell.
- `app.js` bootstraps native JavaScript modules.
- `src/` contains frontend configuration, state, map, dashboard, event, risk, finance, alert, AI, and UI modules.
- `netlify/functions/events.mjs` preserves the working USGS and NASA EONET event feed.
- Additional Netlify Functions expose Phase 1 registry/scaffold APIs.
- `data/` stores lightweight data pointers and development-fixture notes.

## Phase 1 design

The platform is intentionally modular without adding a framework or build step. Heavy future features such as 3D globe rendering, network graphs, AI briefs, aviation, maritime, and licensed cyber feeds have adapter boundaries and documentation but are not falsely presented as live.

## Current risks

- EONET can intermittently return `503`; partial-data handling keeps the app usable.
- Market prices are not live until a lawful server-side provider is configured.
- CII is a prototype, not an official risk rating.

