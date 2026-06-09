# Rate Limit and Cache Policy

All upstream calls must be centralized server-side.

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

