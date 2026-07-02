# Architecture Snapshot

Last updated: 2026-07-02.

## Runtime Shape

- Static frontend is served from repo root; no build step is required.
- Netlify uses `netlify.toml` redirects to `netlify/functions/*.mjs`.
- Cloudflare Worker entrypoint is `src/worker.js`.
- Shared API builders live in `src/api/`.
- Provider orchestration lives in `src/data/providers/orchestrator.js`.
- Source governance lives in `src/sources/master-source-registry.js` and `src/data/providers/source-registry.js`.

## Frontend Surfaces

- Main app: `index.html`, `app.js`, `src/app-controller.js`.
- Source Explorer: `/sources`, `source-explorer.html`, `src/source-explorer-app.js`.
- Countries: `/countries`, `countries.html`, `src/countries-app.js`.
- Diagnostics: `/diagnostics`, `diagnostics.html`, `src/diagnostics-app.js`.

## API Flow

```text
Browser
-> Netlify redirect or Cloudflare Worker
-> route guard / body guard / rate limit
-> shared response builder
-> provider orchestrator or registry module
-> normalized JSON response
```

Cloudflare Worker currently handles `/api/events`, `/api/sources`, `/api/provider-health`, and JSON `404` for unknown `/api/*`. Netlify compatibility functions cover the wider route set listed in `docs/API_CONTRACTS.md`.

## Provider Flow

```text
Provider config
-> schedule / request budget / credential gate
-> fetch adapter
-> normalize event or observation
-> validation / publication policy
-> orchestration result
-> API response and sourceStatus
```

Adapters must surface degraded, disabled, configuration-required, and unavailable states honestly. Browser code must not call credentialed upstream providers directly.

## Validation

Smallest useful checks:

- Syntax only: `npm run check:syntax`
- Platform/unit coverage: `npm run test:platform`
- Full local test suite: `npm test`
- Secret checks: `npm run security:scan` and `npm run security:repo-scan`
- Local validator: `npm run validate`
