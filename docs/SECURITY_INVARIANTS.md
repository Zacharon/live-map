# Security Invariants

These rules capture the current security baseline, including PR #36.

October 4 local energy follow-up: explicit six-family metadata never promotes headline context into output, transit, emergency release or local cost evidence. Unknown/null and original clocks remain distinct; ordinary EIA inventory changes are not emergency withdrawals. Existing providers stay gated. Six fixed primary-source links are external-only. The isolated preview reads retained public cache on loopback without upstream collection and excludes private files. Its two exact Cesium bundle paths join the existing public-token SHA-256 exception; replacement or added JWTs still fail. [Contract and evidence](../artifacts/energy-state-2026-10-04/REPORT.md). No hosted change.

Separate Systems Desk beta (2026-10-02): fixed server-side GDACS EVENTS4APP and NOAA SWPC alerts feeds join the existing bounded collector; fifteen-minute cache, twelve-second timeout, no redirects, 2 MB/1 MB caps, conditional shared writes and backoff. Browser/API readers never invoke upstream providers. Only HTTP(S) links without embedded credentials reach inspection; all source text is escaped. GDACS representative points and model alert levels remain reported, never measured positions or inferred confidence; missing status/clocks remain unknown. NOAA notices have no invented point/observation clock. The allowlisted public build excludes caches, raw research, tests, reports and dependencies. Existing CSP/runtime constraints and nonactivated aircraft/ship boundaries are preserved. [Dated policy/evidence](../artifacts/evidence-ledger-2026-10-02/REPORT.md).

## API Abuse Controls

- Every public `/api/*` path must have Free-compatible abuse protection.
- Cloudflare Worker API routes use `src/api/rate-limit.js` in `src/worker.js`.
- Netlify compatibility functions must use `withPublicApiGuard()` from `netlify/functions/lib/response.mjs`.
- `/api/changes` follows the same Worker, Pages, and Netlify public API guards and bounded query contract.
- Rate-limit failures return JSON `429` with `Retry-After`.
- Oversized request bodies return JSON `413`.
- Unknown Cloudflare `/api/*` routes return JSON `404`, not frontend HTML.

## JSON Body Handling

- Do not use naked `request.json()` on public routes.
- JSON POST routes must parse through bounded helpers.
- Malformed JSON returns JSON `400`.
- Empty valid bodies may be treated as `{}` only when route behavior explicitly allows it.
- Parsing must fail closed when body size cannot be bounded.

## Secrets

- No real API keys, tokens, OAuth secrets, auth emails used as credentials, or private keys in source, docs, tests, fixtures, screenshots, or frontend bundles.
- The browser-secret validator exempts only the exact public Cesium 1.145 default ion token embedded in `vendor/cesium/index.js` and `vendor/cesium/Cesium.js`, using its SHA-256 digest. This does not permit application credentials or replacement tokens.
- `.env`, `.env.*`, secret files, `secrets/`, `.wrangler/`, and `.dev.vars` stay ignored.
- `.env.example` may contain variable names only with empty values.
- Cloudflare/GitHub/provider secret names may be documented by name only.

## Frontend Exposure

- Local foundation normalizes event source/provider URLs to HTTP(S) without embedded user/password credentials. Moving-object coordinates reject missing/null values, and OpenSky position time must be present independently of last-contact time.

- Browser JS/HTML must not include provider credentials or private auth emails.
- Links from provider data must be escaped. Backlog item: enforce `http:`/`https:` scheme allowlisting before rendering provider-controlled source links.
- Netlify assets have CSP/security headers in `netlify.toml`. Backlog item: add equivalent headers around Cloudflare `env.ASSETS.fetch()` responses.

## Provider Fetch Safety

- Provider URLs should be fixed, registry-controlled, or explicitly allowlisted.
- USGS ingestion uses a fixed HTTPS feed URL with redirects rejected, timeout and byte cap. Imported USGS event links are restricted to `https://earthquake.usgs.gov/`.
- Stored ingestion errors and `/api/changes` database failures return sanitized public status; database connection details remain server-side.
- Server-side fetch helpers need timeouts, bounded retries, cache/backoff, and sanitized errors.
- Provider errors must not expose stack traces, raw payloads, tokens, keys, or private contact emails.
- RSS redirects and upstream response size caps are backlog hardening items.

## Required Regression Tests For Security Changes

- `npm run check:syntax`
- `npm run test:platform`
- `npm run security:scan`
- `npm run security:repo-scan`
- Add or update focused tests in `tests/run-tests.mjs` for any changed route invariant.
