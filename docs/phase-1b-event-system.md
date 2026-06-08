# Phase 1B Event System

Live Map Phase 1B establishes a reliable event-feed foundation for public-information events. It keeps the existing static frontend and Netlify Function deployment model while moving provider reliability concerns into testable modules.

## Architecture

- `app.js` boots the browser app through `src/app-controller.js`.
- The browser requests `/api/events`, which redirects to `netlify/functions/events.mjs`.
- `netlify/functions/events.mjs` is a thin API boundary around `src/data/providers/orchestrator.js`.
- Provider metadata lives in `src/data/providers/registry.js`.
- Provider adapters live in `src/data/providers/usgs.js` and `src/data/providers/eonet.js`.
- Canonical event validation lives in `src/events/normalized-event.js`.
- Conservative event deduplication lives in `src/events/event-deduplication.js`.

## Event Lifecycle

1. Provider adapter fetches the official source.
2. Raw records are normalized into the canonical event model.
3. Invalid records are rejected without failing the whole provider.
4. Provider results are reported with accepted and rejected counts.
5. The orchestrator combines partial provider results with all-settled behavior.
6. Last successful provider data is retained in warm function memory and marked stale when reused after a provider failure.
7. Events are conservatively deduplicated before returning to the browser.
8. The response includes compatibility event fields for current map rendering plus `canonicalEvents` for inspection and future migration.

## Canonical Schema

Each normalized event includes a stable ID, provider ID, provider event ID, title, description, category, coordinates, location fields, ISO timestamps, numeric severity, severity label, confidence, status, source attribution, optional geometry, tags and provider metadata.

Provider-specific raw fields are preserved only in `metadata` where useful.

## Provider Adapter Contract

Adapters are independently testable functions that return accepted normalized events and rejected-record diagnostics. The orchestrator wraps each adapter with timeout, retry and source-health behavior.

Provider failures must not prevent successful providers from displaying events.

## Provider Registry

The registry records provider ID, display name, homepage, attribution, enabled state, categories, refresh interval, timeout, integration type and freshness expectations. Map and dashboard components should not hard-code provider URLs.

## Refresh, Retry and Timeout Policy

- Browser refresh remains 120 seconds.
- Function cache headers remain 60 seconds plus stale-while-revalidate.
- Provider requests use short timeouts and conservative retry.
- Transient failures are retried with light jitter.
- Malformed records are rejected individually rather than retried forever.
- Public APIs are not aggressively polled.

## Caching

The Netlify Function keeps last successful provider results in warm in-memory state. This does not require a database and may disappear when the function instance is recycled. Stale data is labeled through provider diagnostics.

No secrets are stored in browser storage. No paid monitoring service, scheduled function or database was added.

## Deduplication

Deduplication is conservative. It merges exact same provider/provider-event IDs and compatible category events with close time, close location and similar normalized titles. It avoids merging unrelated nearby events. Merged events preserve source references in metadata.

## Severity

Severity describes potential or observed event scale. USGS magnitude is converted into a bounded 0-100 platform-derived score. NASA EONET category severity is platform-derived because EONET does not publish a single official hazard severity score.

Severity is not an official government score unless a provider explicitly supplies one.

## Confidence

Confidence describes confidence in the event record, not danger. It considers source authority, record completeness, coordinate validity, timestamp validity and freshness. It is not an emergency or safety rating.

## Source Health

The API returns provider diagnostics:

- healthy, degraded or unavailable
- last attempted refresh
- last successful refresh
- request duration
- accepted and rejected counts
- cached and stale flags
- safe error message
- attribution and homepage URL

Overall system status is `operational`, `partial-data`, `major-provider-outage` or `no-current-provider-data`.

## Error Handling

Provider failures do not prevent successful providers from displaying. User-facing errors are sanitized. Raw stack traces and internal details are not exposed to the browser.

## Security Decisions

- No credentials are committed.
- No paid APIs are added.
- External links are escaped and opened with safe attributes.
- Provider-controlled text is escaped before rendering.
- Browser-side secret scanning remains part of validation.
- No destructive testing is performed against external providers.

## Privacy

The current providers are public event feeds. Live Map does not identify private people, expose restricted owner information, or perform individual aircraft/vessel targeting in Phase 1B.

## Known Limitations

- Last-success cache is in memory only and is not durable across cold starts.
- NASA EONET outages can still produce partial data.
- Browser-side direct USGS fallback remains a last resort if the Netlify Function is unavailable.
- The 3D globe is still a beta/fallback surface.
- Future providers should use the same registry and adapter contract.

## Future Provider Integration

To add a provider safely:

1. Add provider metadata to `src/data/providers/registry.js`.
2. Create a provider adapter that returns normalized events and rejected-record diagnostics.
3. Register the adapter in the orchestrator.
4. Add tests for normalization, provider failure and partial success.
5. Update docs, source attribution and `.env.example` if credentials are needed.
6. Never label fixtures or unavailable providers as live.
