# Cluster Highlight + Modal Cleanup Plan

## Goal

Make timeline/clustering feel like an operator tool: selected clusters are visible on the map, and inspection uses one surface (drawer) instead of drawer + modal.

## Scope

1. **Selected cluster map highlighting**
   - Bounds rectangle + optional circle for single-point clusters
   - Member markers get `event-marker-cluster` styling
   - Selected event markers get `event-marker-selected` styling
   - Shell banner when a cluster is selected; stale-id fallback when filters change

2. **Modal cleanup**
   - Timeline click → drawer only
   - Cluster click → drawer only
   - Feed card / map marker / View details → drawer only (fly-to map, no modal)
   - Legacy `#eventDialog` kept for moving-object tracking and other non-dashboard flows

3. **Clear selection**
   - Close button, explicit Clear selection, shell banner Clear
   - Clears highlight overlay and returns drawer to empty state

## Files

| File | Change |
|------|--------|
| `src/events/clustering.js` | `clusterMemberIds`, `clusterGeographicBounds`, `findClusterById` |
| `src/map/cluster-highlight.js` | Leaflet overlay + fit bounds |
| `src/map/marker-renderer.js` | Selected/cluster marker classes |
| `src/map/map-controller.js` | `clusterHighlightLayer` |
| `src/app-controller.js` | Wire highlight, modal defaults, clear selection |
| `src/ui/osint-dashboard-v2/*` | Selection banner, selected card state, clear affordances |
| `dashboard-v2.css` | Highlight + banner styles |
| `tests/run-tests.mjs` | Pure logic tests |
| `scripts/dashboard-v2-visual-qa.mjs` | Highlight + modal checks |

## Out of scope

- Source scoring, new providers/APIs, persistence, framework migration
- Incident-grade deduplication changes

## Follow-up (after merge)

- "What changed since last visit" layer (P2)
- Source reliability + evidence drawer (P3)