# Provider Request Budgets

Provider refresh intervals are separate from browser polling. Browser refreshes call Live Map's server-side API and must not fan out to upstream providers per visitor.

Each provider schedule tracks:

```js
{
  providerId,
  refreshIntervalMs,
  cacheTtlMs,
  staleAfterMs,
  retryIntervalMs,
  circuitBreakerCooldownMs,
  requestTimeoutMs,
  maximumRetries,
  backoffBaseMs,
  dailyRequestBudget,
  enabled
}
```

Each budget tracks:

```js
{
  providerId,
  period,
  allowedRequests,
  usedRequests,
  remainingRequests,
  resetsAt,
  lastRequestAt,
  status
}
```

`/api/events` does not wait for the slowest provider schedule. Orchestration aborts at 8 seconds and serves whatever finished, marking the rest degraded or unavailable in `sourceStatus`. Allowlisted official feeds and status pages inside one provider run concurrently, so their timeouts do not stack. A timed-out attempt is not retried. See `docs/API_CONTRACTS.md`.

Initial budgets are conservative: ReliefWeb 144 calls/day, CISA KEV 48 calls/day, NVD 40 calls/day, SEC EDGAR 180 calls/day, FRED 48 calls/day, and EIA 72 calls/day. ReliefWeb's documented maximum is 1000 calls/day, and SEC fair access is higher than this app's default polling plan, so defaults leave substantial headroom.
