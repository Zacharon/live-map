# API Contracts

Preserve route names and response shapes. Add fields compatibly; do not remove existing top-level fields without a migration.

## Common Rules

- Public API responses are JSON.
- CORS for shared API builders is `access-control-allow-origin: *`.
- Public API routes are rate-limited and body-limited.
- Errors must be structured JSON and must not include stack traces or secrets.

## Route Table

| Route | Runtime | Method | Contract |
| --- | --- | --- | --- |
| `/api/events` | Netlify + Cloudflare | `GET`, `OPTIONS` | Event feed envelope. |
| `/.netlify/functions/events` | Netlify direct | `GET`, `OPTIONS` | Same as `/api/events`. Preserve direct endpoint. |
| `/api/sources` | Netlify + Cloudflare | `GET`, `OPTIONS` | Source registry envelope. |
| `/api/provider-health` | Netlify + Cloudflare | `GET` | Sanitized provider diagnostics. |
| `/api/countries` | Netlify | `GET` | Country list or one country. |
| `/api/country-risk` | Netlify | `GET` | Country score envelope. |
| `/api/moving-objects` | Netlify | `GET` | Bounded viewport aircraft/vessel envelope. |
| `/api/layers` | Netlify | `GET` | Layer catalog envelope. |
| `/api/markets` | Netlify | `GET` | Fixture market cards; not live prices. |
| `/api/infrastructure` | Netlify | `GET` | Scaffolded infrastructure layers; not outage status. |
| `/api/source-status` | Netlify | `GET` | Layer/source status summary. |
| `/api/briefs` | Netlify | `POST` | Disabled scaffold; no AI provider call. |
| `/api/alerts/test` | Netlify | `POST` | Rule validation preview only; no external delivery. |

## `/api/events`

Query params:

- `hours`: clamped to 24-720; default `168`.
- `recordKind`, `verification`, `domain`, `country`: optional filters.

Response fields:

- `events`: legacy visible event array.
- `canonicalEvents`: canonical normalized event array.
- `generatedAt`: epoch milliseconds.
- `filters`: applied filter echo.
- `sources`: provider display names with successful source status.
- `sourceStatus`: per-provider status object.
- `sourceRegistry`, `providerSourceRegistry`, `domainSourceStatus`: public source metadata.
- `providerResults`: sanitized provider result summaries.
- `systemStatus`, `mode`, `errors`.

## `/api/sources`

Query params include `q`, `domain`, `category`, `accessMode` or `access`, `status`, `sourceTier`, `official`, `implemented`, `credentialRequired`, `legalReviewRequired`, and `source`.

Response fields:

- `data.sources`, `data.statistics`, `data.registryVersion`, `data.selectedSource`, `data.domainLabels`.
- Compatibility top-level fields: `sources`, `stats`, `filters`, `selectedSource`, `domainLabels`, `valid`, `errors`, `warnings`, `requestId`.

## `/api/provider-health`

Response fields:

- `data.systemStatus`, `data.mode`, `data.providers`, `data.note`.
- Provider entries include sanitized counts, timing, request budget, retry state, cache mode, stale flag, source registry URL, and warnings.
- Must never expose raw upstream payloads, stack traces, credentials, or secret values.

## Other Netlify Envelopes

Netlify helper responses use:

- `data`
- `generatedAt`
- `sourceStatus`
- `warnings`
- `errors`
- `requestId`

`/api/moving-objects` currently nests public objects at `data.data` for compatibility. Do not change that shape casually.
