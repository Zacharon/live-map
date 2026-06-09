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

Initial budgets are conservative: ReliefWeb 144 calls/day, CISA KEV 48 calls/day, NVD 40 calls/day. ReliefWeb's documented maximum is 1000 calls/day, so the default plan leaves substantial headroom.
