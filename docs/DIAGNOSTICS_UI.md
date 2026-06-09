# Diagnostics UI

Detailed provider diagnostics are separated from the public dashboard and moved to `/diagnostics`.

The main map shows only a compact public data-status summary:

- Last refresh time.
- Available provider count.
- Degraded or stale provider count.
- Link to diagnostics.

The `/diagnostics` page fetches `/api/provider-health` and displays sanitized provider timing, counts, cache state, stale state, retry guidance, circuit-breaker state, source registry links, warnings, and sanitized errors.

Diagnostics are not a security boundary. They are intentionally sanitized, but provider credentials and raw upstream payloads must never be returned.
