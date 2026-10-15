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
| `/api/changes` | Netlify + Cloudflare | `GET`, `OPTIONS` | Bounded material USGS change log when stored ingestion is configured; JSON `503` otherwise. |
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
- `changeCursor`: optional opaque cursor from the same stored-USGS snapshot as the event read model; null outside stored mode. Use it for subsequent `/api/changes` polling.

The optional stored-USGS path uses the same envelope and a PostgreSQL current-event read model. `sourceStatus.usgs` reports storage mode, last successful collection, staleness, and unavailable state. The browser never fetches USGS directly after an API error. See [durable ingestion](DURABLE_INGESTION_LOCAL.md).

## `/api/changes`

- `GET` query params: opaque versioned `cursor` (omit to start from the earliest retained change) and `limit` (integer 1–200, default 50). Malformed values return JSON `400`.
- Response: `changes`, `nextCursor`, `hasMore`, `mode: stored-usgs`. Each change has stable `id`, `eventId`, `kind`, `reason`, title, occurrence, source update and commit times, source name, source URL, and `evidenceStatus` (`retained` or `expired`). This route is public metadata, not an alert delivery receipt or assessment approval.
- A cursor behind the retention floor, from another epoch/version, or ahead of the current database returns JSON `409` with `error: resync-required`, a reason, and `snapshotUrl: /api/events`. Clients must load that snapshot and resume from its `changeCursor`. A successful empty page does not indicate a cursor failure.
- Stored ingestion disabled or failed read returns JSON `503` with `status: unavailable` and a sanitized reason. `OPTIONS` returns `204`. Responses are `no-store`.

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

Local foundation (2026-09-09): moving-object envelopes are unchanged. Missing coordinates and missing OpenSky position timestamps now reject a record; valid zero coordinates remain valid. `lastContactAt` is optional and distinct from `observedAt`. Requests coalesce by cache region and have a warm-instance shared budget; this is not a distributed account-quota guarantee.

Netlify helper responses use:

- `data`
- `generatedAt`
- `sourceStatus`
- `warnings`
- `errors`
- `requestId`

`/api/moving-objects` currently nests public objects at `data.data` for compatibility. Do not change that shape casually.
# Open News and Social Response Fields

`GET /api/events` remains backward compatible and may additionally return bounded `observations`, `storylines`, and `observationSummary`. Observation data is metadata-only. Storyline trend fields must never be interpreted as verification; use `storyline.verification` and its independent-source count.
