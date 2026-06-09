# Incident Clustering

Phase 1C adds a conservative incident-clustering foundation.

An incident contains:

- incident ID
- title
- domain
- category
- type
- status
- start and last update times
- primary location
- affected area
- event IDs
- provider IDs
- independent source count
- confidence
- severity
- timeline

## Matching Rules

Events are clustered only when there is strong evidence:

- compatible domain or type
- close event time
- geographic proximity
- title/entity overlap
- matching provider identifiers where available

The system prefers false negatives over incorrectly combining unrelated events. Individual source events remain visible and retain their own map/event details.
