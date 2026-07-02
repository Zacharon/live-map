# Provider Contracts

Provider work must preserve legal, security, and source-quality boundaries.

## Provider Lifecycle

1. Register source metadata in `src/sources/master-source-registry.js`.
2. Register runtime/provider metadata in `src/data/providers/source-registry.js` and `src/data/providers/registry.js` when applicable.
3. Add adapter code under `src/data/providers/`.
4. Add schedule/budget metadata in `src/data/providers/scheduling.js` and `src/data/providers/request-budget.js` when the provider is polled.
5. Add tests in `tests/run-tests.mjs`.
6. Document source terms, attribution, rate limits, cache policy, retention, and limitations.

## Enablement Rules

- Do not mark a source `live` unless adapter, tests, attribution, terms review, cache behavior, and failure behavior exist.
- Credentialed providers must be `configuration-required` until server-side env vars are present.
- Planned, licensed, link-only, prohibited, unclear, and scaffolded sources must not populate live events.
- Weak open-web or OSINT feeds produce `discovery-lead` records until corroborated or reviewed.

## Runtime Rules

- Provider calls are server-side only.
- Browser visitors must not fan out to upstream providers except documented emergency public fallbacks.
- Use timeouts, bounded retries, cache/backoff, request budgets, and sanitized errors.
- Preserve `sourceStatus` for success, degraded, disabled, configuration-required, provider-unavailable, and stale-cache states.
- Do not hide provider failure behind a successful-looking result.

## Source URL Policy

- Source URLs must point to the original public source when possible.
- Registry `sourceUrl` values must be HTTPS.
- Backlog: normalize provider-controlled event source links through an `http:`/`https:` allowlist before frontend rendering.

## Sensitive Domains

- Aviation/maritime: viewport-limited, capped, cached, no global polling, no private-owner inference, no complete-coverage claims.
- Finance/commodity: observations are not automatically price-causality claims.
- SEC EDGAR: material filings are non-geographic unless separate evidence supports geography.
- Humanitarian/conflict: generalize or suppress precise locations when publication could increase risk.
- Cyber: non-geographic by default unless a real-world location is independently supported.

## Environment Variable Names

Document names only, never values. Current examples include `NVD_API_KEY`, `SEC_CONTACT_EMAIL`, `SEC_CIKS`, `FRED_API_KEY`, `EIA_API_KEY`, `OPENSKY_CLIENT_ID`, `OPENSKY_CLIENT_SECRET`, `GFW_API_TOKEN`, and `CLOUDFLARE_RADAR_TOKEN`.
