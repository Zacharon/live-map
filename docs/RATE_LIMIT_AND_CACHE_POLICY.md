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

ReliefWeb, CISA KEV, and NVD use explicit provider schedules and request budgets. ReliefWeb defaults to a 20-minute interval and 144 requests/day when configured, CISA KEV defaults to 60 minutes and 48 requests/day, and NVD defaults to focused enrichment no more often than every two hours.

SEC EDGAR, FRED, and EIA also use explicit schedules. SEC defaults to 5-minute active-window polling with a compliant contact and CIK allowlist, FRED defaults to 60-minute polling for allowlisted series, and EIA defaults to 60-minute dataset polling. None of these providers should re-fetch unchanged data or fan out browser-side requests.

