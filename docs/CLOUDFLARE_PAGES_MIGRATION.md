# Cloudflare Pages Migration Notes

## 2026-09-09 hosting recommendation (no cutover performed)

Prefer **Cloudflare Workers + Static Assets** for the public application after compatibility work. Despite this document's historical Pages title, the checked-in `wrangler.toml` already uses a Worker with an ASSETS binding. Retain Netlify as the current compatibility target until a tested cutover is explicitly authorized.

| Option | Fit and connector status | Decision |
|---|---|---|
| Cloudflare Workers + Static Assets | Existing Worker source and config. Direct Cloudflare plugin is not installed in this task. [Static asset requests are free/unlimited](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/); dynamic Worker requests retain quotas. [Workers Free limits](https://developers.cloudflare.com/workers/platform/limits/) include 100,000 requests/day; CPU/subrequest limits must be measured for this aggregator. | Preferred public-hosting target, conditional on measured fit. No claim that the API is free at arbitrary traffic. |
| Sites | Native connector is callable; read-only `list_sites` succeeded. Hosting skill supports Workers-compatible bundles. Existing app would need deliberate Worker packaging and complete API compatibility; static-only publication would lose server routes. No site created. | Connector-managed alternative, especially for controlled review access. Account entitlement, packaging, custom domain and runtime limits still need confirmation before choosing it. |
| Netlify | Existing full function route support and available connector. Repository records a historical usage_exceeded outage; current account plan/usage was not inspected. [Credit plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/) pool usage costs. | Preserve current service during local work; don't assume a visual redesign fixes quota exhaustion. |

The recommendation is an architectural inference from the current repository and official platform documentation, not a completed load test or a deployment. No paid tier is selected or authorized.

Concrete migration sequence:

1. Complete and locally test `/api/countries`, `/api/country-risk`, `/api/moving-objects`, `/countries`, `/diagnostics`, and required remaining Netlify API contracts. Keep `/api/events`, `/api/sources`, `/api/provider-health`, and structured JSON 404 behavior. Preserve the Netlify direct events endpoint in the supported Netlify deployment.
2. Add asset security-header parity and publish only public assets. The current root asset directory needs a deliberate exclude/allowlist review, especially before packaging local outputs or development scripts.
3. Measure dynamic Worker CPU and upstream subrequest use under partial provider failure. Implement durable account-wide quota enforcement before enabling licensed tracking. A per-instance cache/budget alone does not constrain all server instances.
4. Package an isolated preview artifact and verify all routes with fixtures. Choose direct Cloudflare tooling or the accessible Sites connector without migrating frameworks or creating a replacement repository.
5. Present the tested artifact, costs/limits, deployment destination, DNS plan and rollback to the owner. Publish/change DNS only on explicit deployment authorization. Keep the previous deployment available for rollback.

AIS ingestion remains a separate decision: neither static hosting nor a short-lived request function should silently become a persistent upstream stream consumer. No new infrastructure, subscriptions or credentials were created.

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
- `run_worker_first = ["/api/*", "/sources"]` makes API routes and the Source Explorer alias enter the Worker before static asset lookup.
- `src/worker.js` handles `/api/events` by calling the shared `src/api/events-response.js` response builder with Cloudflare `env` bindings.
- `src/worker.js` handles `/api/sources` by calling the shared `src/api/sources-response.js` response builder.
- `src/worker.js` handles `/api/provider-health` by calling the shared `src/api/provider-health-response.js` response builder with Cloudflare `env` bindings.
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

## `/api/sources` And `/api/provider-health` Compatibility

Cloudflare Workers Static Assets maps `/api/sources` and `/api/provider-health` through `src/worker.js` when deployed with `wrangler.toml`.

Netlify keeps the existing redirects:

- `/api/sources` -> `/.netlify/functions/sources`
- `/api/provider-health` -> `/.netlify/functions/provider-health`

Both runtimes call shared response builders in `src/api/`:

- `/api/sources` uses `src/api/sources-response.js` and returns the public source registry envelope used by Source Explorer.
- `/api/provider-health` uses `src/api/provider-health-response.js` and returns sanitized provider diagnostics. Cloudflare passes Worker `env` bindings into provider orchestration so credential-gated providers remain server-side and disabled unless configured.

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
