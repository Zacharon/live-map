# Security Invariants

These rules capture the current security baseline, including PR #36.

## API Abuse Controls

- Every public `/api/*` path must have Free-compatible abuse protection.
- Cloudflare Worker API routes use `src/api/rate-limit.js` in `src/worker.js`.
- Netlify compatibility functions must use `withPublicApiGuard()` from `netlify/functions/lib/response.mjs`.
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
- `.env`, `.env.*`, secret files, `secrets/`, `.wrangler/`, and `.dev.vars` stay ignored.
- `.env.example` may contain variable names only with empty values.
- Cloudflare/GitHub/provider secret names may be documented by name only.

## Frontend Exposure

- Browser JS/HTML must not include provider credentials or private auth emails.
- Links from provider data must be escaped. Backlog item: enforce `http:`/`https:` scheme allowlisting before rendering provider-controlled source links.
- Netlify assets have CSP/security headers in `netlify.toml`. Backlog item: add equivalent headers around Cloudflare `env.ASSETS.fetch()` responses.

## Provider Fetch Safety

- Provider URLs should be fixed, registry-controlled, or explicitly allowlisted.
- Server-side fetch helpers need timeouts, bounded retries, cache/backoff, and sanitized errors.
- Provider errors must not expose stack traces, raw payloads, tokens, keys, or private contact emails.
- RSS redirects and upstream response size caps are backlog hardening items.

## Required Regression Tests For Security Changes

- `npm run check:syntax`
- `npm run test:platform`
- `npm run security:scan`
- `npm run security:repo-scan`
- Add or update focused tests in `tests/run-tests.mjs` for any changed route invariant.
