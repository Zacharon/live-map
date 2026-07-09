# Event Artifacts v1 Plan

## Purpose

Turn selected events and clusters into **exportable OSINT artifact cards** so operators can capture investigation snapshots (Markdown / JSON) without accounts, backend, or a new map engine.

## Product Gap

The dashboard already shows live feeds, filters, timeline, clusters, drawer detail, and change awareness. Operators could **view** signals but not **export a structured artifact** for notes, handoff, or offline review.

Artifacts are product substance. Globe mode and more providers can wait.

## Why Client-Only

- No auth/accounts surface yet
- No backend persistence or case store in this release
- Exports use only data already loaded and visible in the dashboard
- Avoids secrets, new APIs, and deploy risk

## Artifact Model

### Event artifact

- `schemaVersion: "v1"`, `artifactType: "event"`, `artifactId`, `generatedAt`
- Identity: event id, provider id, title
- Source attribution: source name/url, provider, verification
- When/where: occurredAt, updatedAt, place, country, lat/lon
- Classification: domain, category/type, severity
- Confidence: existing numeric label **or** `"Not scored in v1"`
- Corroboration: distinct source keys among related/co-cluster events
- Related events (in-memory heuristics, max 8)
- Normalized field table
- Analyst notes: fixed read-only placeholder
- Caveats / limitations list

### Cluster artifact

- Same schema version; `artifactType: "cluster"`
- Cluster id, title/label, event count, severity, time window, location, sources
- Representative member events
- Same notes/caveats/export path

## UI Behavior

- Artifact section lives in the existing right-side detail drawer (event and cluster)
- Summary chips, related list, normalized fields, caveats, read-only notes
- Buttons: Copy Markdown, Download Markdown, Copy JSON, Download JSON
- Related rows reuse `data-v2-timeline-event` to open the event drawer
- No modal; no full Dashboard v2 rewrite

## Export Behavior

- Markdown uses fixed section headers: Artifact Summary, Event / Cluster Details, Source Attribution, Location, Timeline, Related Events, Normalized Fields, Analyst Notes, Caveats, Generated Metadata
- JSON is structured with `schemaVersion: "v1"`
- Downloads via browser Blob + object URL
- Copy via `navigator.clipboard` with safe fallback
- No network calls; no server storage

## Related Events Rule

In-memory only, from current filtered events + clusters:

- same cluster, same provider, same country/place, same category/domain, close time (24h)
- Deterministic score + stable sort; max 8

## Privacy / Security

- No secrets, `.env`, auth, backend, database, or cloud sync
- No new providers or API keys
- Exports contain only normalized public event/cluster fields already on the client
- Caveats state snapshot is not a permanent case file

## Intentionally Deferred

| Item | Branch / later |
|------|----------------|
| Editable analyst notes / cases | `feature/investigation-workspace-v1` |
| Explainable confidence scoring | `feature/source-confidence-v1` |
| Operator usability pass | `feature/dashboard-operator-usability-v1` |
| Cesium / globe engine | `feature/globe-engine-spike-v1` |
| STIX export | cyber-only later |
| Backend persistence | not in roadmap near-term |

## Files

- `src/artifacts/event-artifacts.js`
- `src/ui/osint-dashboard-v2/artifact-export.js`
- `src/ui/osint-dashboard-v2/event-artifact-card.js`
- Drawer / shell / app-controller / CSS / tests / docs
