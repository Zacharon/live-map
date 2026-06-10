# Moving Objects

Moving objects are normalized separately from events.

Supported object types:

- `aircraft`
- `vessel`

Moving objects use `recordKind: moving-object` only at the UI/schema boundary and are not mixed into incident deduplication, event clustering, or Country Risk Score calculations.

The `/api/moving-objects` endpoint requires a bounded viewport. Global requests are rejected.

Response data includes object identity, observation time, received time, coordinates, altitude where available, speed, heading, vertical rate, status, display name, classification, source, age, stale flag, and sanitized provider metadata.
