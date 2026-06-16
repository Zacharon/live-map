# Rate Limit and Cache Policy

All upstream calls must be centralized server-side.

## Public Cloudflare API Abuse Protection

Cloudflare Worker `/api/*` routes use a lightweight fixed-window limiter in `src/api/rate-limit.js`.

- Default public API limit: 120 requests per 60 seconds per client key and API path.
- Client key: `CF-Connecting-IP` when Cloudflare provides it, then local-development fallbacks.
- Failure mode: JSON `429` with `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`.
- Oversized request behavior: `/api/*` requests with `Content-Length` above 16 KiB are rejected with JSON `413` before route handling.
- Compatibility: no KV, D1, Durable Object, database, secret, or paid-only Cloudflare feature is required.
- Tuning: set non-secret Worker variables `API_RATE_LIMIT_REQUESTS`, `API_RATE_LIMIT_WINDOW_SECONDS`, or `API_MAX_BODY_BYTES` if the production traffic profile needs adjustment.

This is best-effort per Worker isolate. It is intentionally Free-compatible and does not claim globally consistent enforcement across the Cloudflare edge. If the project later adopts Cloudflare-native Rate Limiting bindings or WAF rate limiting rules, keep those controls optional and documented rather than required defaults.

There are currently no first-party auth or login API routes. No auth-specific 5-attempts-per-15-minutes limiter was added because there is no auth route to protect. If an auth endpoint is introduced, it must add a stricter max 5 attempts per 15 minutes per IP/client key before merge.

Provider adapters should use:

- timeouts
- bounded retries
- exponential backoff
- circuit breakers
- cache-control handling
- conditional requests where supported
- randomized polling jitter

Browser visitors must not directly call upstream providers except the existing emergency USGS fallback documented for `/api/events`.

Provider failure must be visible in source status. External service failure should not be reported as a successful provider run.

GDACS is polled server-side with a 10-minute provider interval, 15-minute freshness target, bounded timeout/retry behavior, and stale-cache fallback. The browser must not fan out direct GDACS API calls.

ReliefWeb, CISA KEV, and NVD use explicit provider schedules and request budgets. ReliefWeb defaults to a 20-minute interval and 144 requests/day when configured, CISA KEV defaults to 60 minutes and 48 requests/day, and NVD defaults to focused enrichment no more often than every two hours.

SEC EDGAR, FRED, and EIA also use explicit schedules. SEC defaults to 5-minute active-window polling with a compliant contact and CIK allowlist, FRED defaults to 60-minute polling for allowlisted series, and EIA defaults to 60-minute dataset polling. None of these providers should re-fetch unchanged data or fan out browser-side requests.

