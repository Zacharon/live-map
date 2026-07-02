# Security Audit Backlog

This backlog contains Medium and Low findings from the July 2026 full security audit. Critical and High items are not tracked here; they should be fixed before merge.

## Medium

### Provider-controlled event links allow non-web URL schemes before frontend rendering

- Affected files/routes: `src/events/normalized-event.js`, `src/app-controller.js`, `src/ui/dialogs.js`, provider normalizers that populate `sourceUrl`.
- Why it matters: provider data can supply event links that pass generic `new URL()` validation and later render into clickable `href` attributes. The app escapes HTML and uses `rel="noopener noreferrer"`, but it does not currently require `http:` or `https:` schemes for event source links.
- Exploit scenario: if an enabled upstream provider returns an event link with an active or unusual scheme, a user could be shown a trusted-looking "Source" link that navigates outside the expected web-source boundary.
- Minimal fix: normalize source links through one shared helper that accepts only `https:` and, where explicitly needed, `http:` for documented public sources; drop or replace all other schemes before events reach the frontend.
- Test recommendation: add unit tests for `javascript:`, `data:`, relative, `mailto:`, `http:`, and `https:` source URLs through event normalization and rendered event-card/dialog links.

### Cloudflare static asset responses do not apply the Netlify CSP/header policy

- Affected files/routes: `src/worker.js`, `netlify.toml`.
- Why it matters: Netlify serves the static app with CSP, `X-Content-Type-Options`, and `Referrer-Policy`, but the Cloudflare Worker currently delegates static assets to `env.ASSETS.fetch(request)` without adding equivalent browser security headers.
- Exploit scenario: a browser loading the Cloudflare-hosted app receives weaker response headers than the Netlify-hosted app, reducing defense in depth if a future frontend injection or content-type issue appears.
- Minimal fix: wrap Cloudflare asset responses and set the same CSP/security headers used in `netlify.toml`, preserving content type and cache headers.
- Test recommendation: add Worker tests for `/`, `/app.js`, and HTML aliases that assert CSP, `X-Content-Type-Options`, and `Referrer-Policy` headers.

## Low

### RSS/Atom provider buffers feed text before applying the intended max-size policy

- Affected file: `src/data/providers/rss-feed.js`.
- Why it matters: the RSS provider reads `response.text()` before slicing to the configured maximum size. Feed URLs are repository allowlisted, which keeps attacker control low, but oversized upstream responses can still waste memory.
- Exploit scenario: an allowed feed endpoint or redirect target returns an unexpectedly large XML response, increasing memory pressure before parsing rejects or truncates the content.
- Minimal fix: stream the response body with a byte counter and abort once the feed-size cap is reached.
- Test recommendation: add a fake feed response larger than the cap and assert the provider stops reading before materializing the full body.

### Shared provider JSON helpers materialize upstream JSON without a byte cap

- Affected files: `src/data/providers/orchestrator.js`, provider adapters using `context.fetchJson` or direct `response.json()`.
- Why it matters: most provider URLs are fixed in code, but a compromised or unexpectedly large upstream response can consume memory before JSON parsing finishes.
- Exploit scenario: a configured upstream API returns a very large JSON body, forcing the Worker/function to buffer and parse more data than needed for the public feed.
- Minimal fix: add a bounded JSON fetch helper that streams text up to a per-provider cap before `JSON.parse`, then migrate direct `response.json()` calls where practical.
- Test recommendation: add provider-helper tests for over-cap JSON, malformed JSON, and normal JSON responses.

### RSS redirect SSRF guard is textual and does not verify resolved IP ranges

- Affected file: `src/data/providers/rss-feed.js`.
- Why it matters: the feed registry is allowlisted and redirects are manually followed with host checks, but the checks do not prove that the final hostname resolves outside private/link-local/cloud metadata ranges.
- Exploit scenario: if an allowlisted RSS endpoint redirects to a hostname with DNS that resolves internally, the server-side fetch could reach a private network destination despite hostname text checks.
- Minimal fix: either disallow RSS redirects to hosts outside the existing feed registry or add DNS/IP-range validation where the runtime supports it.
- Test recommendation: add redirect tests for private host literals, link-local hosts, and non-allowlisted redirect destinations; document any runtime limitation around DNS resolution.
