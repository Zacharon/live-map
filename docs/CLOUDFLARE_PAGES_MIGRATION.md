# Cloudflare Pages Migration Notes

Live Map remains a Netlify-hosted static site during this migration. These notes define the smallest safe Cloudflare Pages compatibility foundation without changing production hosting, API calls, or provider behavior.

## Current Hosting Baseline

- Netlify remains supported and must not be removed during migration.
- Netlify publishes the repository root (`.`) and runs server-side functions from `netlify/functions`.
- Cloudflare Pages should also publish the repository root for the current static site when it is configured later.
- There is no required build step for the current static site.
- Codex must not run deploy commands, build hooks, production-publish commands, or deployment APIs for Netlify, Cloudflare, Vercel, Wrangler, or similar tools unless explicitly requested.

## Secrets And Provider Credentials

- Provider credentials must remain server-side.
- Cloudflare provider credentials should be configured only in Cloudflare Pages environment variables later.
- Do not place provider tokens, auth emails, API keys, OAuth secrets, or paid-service credentials in frontend code, docs, fixtures, screenshots, or `.env.example`.
- Do not expose OpenSky, Global Fishing Watch, AISHub, ADS-B, AIS, finance, cyber, AI, or licensed-data credentials in browser-served files.

## Compatibility Requirements

- Preserve `/api/events` as the primary browser-facing events route.
- Preserve `/.netlify/functions/events` while Netlify remains supported.
- Do not delete Netlify Functions until matching Cloudflare Pages Functions have been implemented, reviewed, tested locally, and verified in a Cloudflare preview.
- Do not change frontend API calls until Cloudflare route parity exists.
- Do not label unavailable, fixture, planned, or placeholder providers as live.
- Keep provider attribution, source URLs, freshness, status, and partial-failure reporting visible for live data.

## First Backend Routes To Port

Port these routes before considering Cloudflare Pages a functional backend target:

- `/api/events`: required for the main map and live feed. This must be the first route ported and must preserve the existing response shape.
- `/api/sources`: required for the Source Explorer and public source registry.
- `/api/provider-health`: required for diagnostics and provider status transparency.
- `/api/countries`: required for country navigation and country score pages.
- `/api/country-risk`: required for Country Instability Index data.
- `/api/moving-objects`: required for bounded aviation and maritime tracking prototypes. This route must remain viewport-limited, cached, capped, server-side, and honest about incomplete coverage.

Additional scaffolded Netlify routes such as `/api/layers`, `/api/markets`, `/api/infrastructure`, `/api/source-status`, `/api/briefs`, and `/api/alerts/test` can be ported after the core public routes above.

## Cloudflare Workers Static Assets Plan

The current workers.dev target is a Cloudflare Workers Static Assets deployment. That deployment does not use `functions/api/events.js` for routing. It uses `wrangler.toml` and the Worker entrypoint at `src/worker.js`.

Workers routing:

- `wrangler.toml` points `main` to `src/worker.js`.
- `[assets]` publishes the repository root (`.`) through the `ASSETS` binding.
- `run_worker_first = ["/api/*"]` makes API routes enter the Worker before static asset lookup.
- `src/worker.js` handles `/api/events` by calling the shared `src/api/events-response.js` response builder with Cloudflare `env` bindings.
- Other `/api/*` paths return a JSON 404 until those routes are intentionally ported.
- Non-API requests fall through to `env.ASSETS.fetch(request)` so the static frontend continues to load.

Do not run `wrangler deploy` unless deployment is explicitly approved.

## Cloudflare Pages Functions Plan

The repository may add placeholder Cloudflare Pages documentation under `functions/`, but real provider code should not be duplicated into Cloudflare Pages Functions until the shared server-side module boundaries are clear.

Future implementation should prefer thin Cloudflare route handlers that call shared provider modules. That keeps Netlify Functions and Cloudflare Pages Functions aligned without copying large files.

## `/api/events` Compatibility

Cloudflare Workers Static Assets maps `/api/events` through `src/worker.js` when deployed with `wrangler.toml`.

Cloudflare Pages maps `functions/api/events.js` to `/api/events` only for a Pages Functions deployment.

Netlify keeps the existing redirect:

- `/api/events` -> `/.netlify/functions/events`

All runtimes now call the shared `src/api/events-response.js` response builder. The Netlify file `netlify/functions/events.mjs` remains in place and continues to export the existing Netlify handler. The Cloudflare Worker and Pages Function install Cloudflare runtime bindings into the server-only runtime environment before dynamically loading the shared events response module so provider modules that initialize from environment data see Cloudflare bindings at import time. The shared response builder also passes the runtime environment into provider orchestration for request-time settings such as user agents.

Runtime differences to keep in mind:

- Netlify Functions receive provider credentials through `process.env`.
- Cloudflare Workers receive provider credentials through `env`.
- Cloudflare Pages Functions receive provider credentials through `context.env`.
- Cloudflare does not use `netlify.toml` redirects for Workers or Pages Functions.
- The public response envelope remains compatible with the existing frontend.
- The `mode` field is runtime-specific for Cloudflare Workers and may report `cloudflare-workers` or `partial-cloudflare-workers`.
- The `mode` field is runtime-specific for Cloudflare Pages and may report `cloudflare-pages-function` or `partial-cloudflare-pages-function`.

Before a route is considered ported:

- The route returns the same public response shape as the Netlify route.
- Credential-gated providers remain disabled unless the required environment variables are configured.
- Provider failures remain visible in `sourceStatus` or equivalent diagnostics.
- Moving-object requests enforce bbox limits, caps, caching, and coverage disclaimers.
- Local syntax checks and route-level tests pass.
- Netlify behavior still passes existing checks.

## Non-Goals For This Patch

- No deployment.
- No `wrangler deploy`.
- No Netlify, Vercel, or Cloudflare deployment command.
- No production smoke test.
- No frontend API call changes.
- No provider porting.
- No deletion or replacement of Netlify configuration.
