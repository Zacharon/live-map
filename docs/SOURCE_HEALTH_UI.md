# Source Health UI

Phase 1C adds a detailed provider-health panel backed by Phase 1B diagnostics.

For every provider, the panel can show:

- provider name
- operational state
- last attempted refresh
- last successful response
- most recent source event
- request duration
- received count
- accepted count
- rejected count
- duplicate count
- stale-cache status
- cache age
- retry count
- safe error message
- provider documentation link
- manual retry button

Provider states are:

- operational
- degraded
- stale
- unavailable
- rate-limited
- authentication-required
- disabled

The panel must not expose credentials, raw stack traces or sensitive request information.
