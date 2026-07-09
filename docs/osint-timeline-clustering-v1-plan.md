# OSINT Timeline + Event Clustering v1 — Plan

**Branch:** `feature/osint-timeline-clustering-v1`  
**Base:** `main` @ `a03f504` (Dashboard v2 merged)  
**Date:** 2026-07-08

## Dashboard v2 Baseline

Already provides: summary cards, provider health, filter chips, event detail drawer, mobile shell, existing modal.

## What This Adds

1. **Timeline panel** — events grouped into operator time buckets in the left dashboard shell.
2. **Cluster summary** — deterministic client-side clusters from existing filtered events.
3. **Cluster/event selection** — reuses event detail drawer; clusters show member list.

## Event Fields Used

| Field | Timeline | Clustering |
|-------|----------|------------|
| `occurredAt` | bucket assignment | 24h time cell |
| `updatedAt` | display fallback | — |
| `lat` / `lon` | — | rounded geo cell (~0.1°) |
| `geographic` | — | skip geo when false |
| `domain` / `domainLabel` | display | cluster key |
| `category` / `typeLabel` | display | cluster key |
| `severity` | display, attention | max severity summary |
| `sourceName` / `provider` | display | source count |
| `place` / `country` | location label | representative location |
| `title` | display | — |

## Clustering Strategy (deterministic)

- **Geo cell:** round coordinates to 1 decimal degree, or `nogeo:{domain}:{category}` when unmapped.
- **Time cell:** floor `occurredAt` to 24-hour windows.
- **Cluster key:** `{domain}|{category}|{geoCell}|{timeCell}`
- Only clusters with **≥2 events** are surfaced.
- Sorted by event count, then highest severity score.

Separate from `incident-clustering.js` (provider dedup/incidents). This is dashboard operator grouping only.

## Files to Change

| File | Action |
|------|--------|
| `src/events/timeline.js` | Create — bucket helpers |
| `src/events/clustering.js` | Create — cluster builders |
| `src/ui/osint-dashboard-v2/timeline-panel.js` | Create — timeline HTML |
| `src/ui/osint-dashboard-v2/cluster-summary.js` | Create — cluster cards HTML |
| `src/ui/osint-dashboard-v2/event-detail-drawer.js` | Update — cluster detail view |
| `src/ui/osint-dashboard-v2/shell.js` | Update — include new panels |
| `src/app-controller.js` | Update — click handlers |
| `dashboard-v2.css` | Update — timeline/cluster styles |
| `package.json` | Update — syntax checks |
| `tests/run-tests.mjs` | Update — unit tests |

## Known Limitations

- Clusters are heuristic, not incident-grade deduplication.
- Timeline capped at 5 events per bucket in UI (performance).
- No map highlight ring for cluster bounds in v1.
- No persistence of selected cluster across refresh.