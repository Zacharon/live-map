# Security Invariants

These rules capture the current security baseline, including PR #36.

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
- Provider-controlled external links must pass the shared absolute HTTP(S), no-credentials boundary at ingestion and rendering; rejected or missing destinations render unavailable text. Escape HTML and attributes after validation. See `src/sources/source-url.js` and `tests/audit-repair-tests.mjs`.
- Netlify assets have CSP/security headers in `netlify.toml`. Backlog item: add equivalent headers around Cloudflare `env.ASSETS.fetch()` responses.

## Provider Fetch Safety

- Provider URLs should be fixed, registry-controlled, or explicitly allowlisted.
- USGS ingestion uses a fixed HTTPS feed URL with redirects rejected, timeout and byte cap. Imported USGS event links are restricted to `https://earthquake.usgs.gov/`.
- Stored ingestion errors and `/api/changes` database failures return sanitized public status; database connection details remain server-side.
- Server-side fetch helpers need timeouts, bounded retries, cache/backoff, and sanitized errors.
- Provider errors must not expose stack traces, raw payloads, tokens, keys, or private contact emails.
- RSS redirects must remain on the validated configured feed origin (same scheme,
  hostname and effective port). Missing destinations, credentials and IPv6 literal
  feed hosts are refused before another fetch. No feed currently requires an IPv6
  literal; such support needs a separately reviewed address policy.
- The portable RSS guard does not resolve DNS or pin addresses. The configured
  feed's DNS and deployed egress restrictions remain trust assumptions, not
  verified public-address guarantees. Cross-origin provider moves fail closed and
  require review of the registry URL; do not auto-enroll redirect destinations.
- RSS bodies enforce the existing 1 MiB default on streamed response bytes before
  decoding or retaining each chunk. Oversized declared lengths refuse before a
  read; absent/incorrect lengths still hit the streaming counter. Overflow cancels
  the reader, and the lock is released on success or failure. Streaming UTF-8
  decoding preserves split multibyte characters. Other provider body caps remain
  separate work.

## Required Regression Tests For Security Changes

- `npm run check:syntax`
- `npm run test:platform`
- `npm run security:scan`
- `npm run security:repo-scan`
- Add or update focused tests in `tests/run-tests.mjs` for any changed route invariant.
