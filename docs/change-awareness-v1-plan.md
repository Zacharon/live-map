# Change Awareness v1 Plan

## Why This Exists

The dashboard shows live state but not **change over time**. Operators need to know what is new or updated since they last looked — that is the primary reason to return tomorrow.

v1 is **local-only** (browser `localStorage`) to avoid accounts, backends, or persistence infrastructure.

## What Is Stored

Key: `live-map:change-awareness:v1`

Per snapshot (current filtered view when marked seen):

- `schemaVersion` (1)
- `savedAt` timestamp
- Event map: `id → { signature, occurredAt, updatedAt, severity, category, source }`
- Cluster map: `clusterId → { signature, eventCount, severity }`

Signatures are hashes of public event metadata (title, times, severity, domain/category, source, rounded coords, place/country).

## What Is Not Stored

- Raw API responses
- Secrets, tokens, credentials
- Full event bodies or private operator notes
- Cross-device sync

## Classification Rules

| Case | Rule |
|------|------|
| New event | Stable id not in previous snapshot |
| Updated event | Id exists but signature hash changed |
| Unchanged | Id exists and signature matches |
| Removed | Id in snapshot but not in current view |
| New cluster | Cluster id not in previous snapshot |
| Changed cluster | Cluster id exists but member/count/severity signature changed |

Raw event objects are never mutated.

## UI

- Panel below summary cards: new/updated/cluster counts, last seen, top changed events, Mark seen
- Timeline + drawer badges for new/updated
- Subtle map marker ring for new/updated (no clutter)

## Known Limitations

- Snapshot is per-browser, per-device
- Reflects **current filtered view**, not global corpus
- Clearing browser data resets baseline
- No notifications or alerts
- Cluster change is heuristic (same as clustering v1)

## Follow-up

- P3: Source reliability + evidence drawer
- P4: Watch zones / saved filter presets
- Optional: dashboard-scoped snapshot keys per preset/filter set