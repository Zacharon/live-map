# OSINT Dashboard Productization v1 Verification

## Branch dependency

```text
main@6d756a2
  └── feature/event-artifacts-v1-exports@6d52274  (PR #43)
        └── feature/osint-dashboard-productization-v1  (this branch)
```

Event Artifacts v1 is **not** rebuilt here; this branch is intentionally stacked on top.

Worktree: `live-map-osint-dashboard-productization-v1`

## Commands run

| Command | Result |
|---------|--------|
| `npm run check` | PASS (includes intelligence + new UI modules) |
| `npm run test:platform` | PASS (all tests including threat/connections suite) |
| `npm run validate` | PASS — 10/10 |
| `git diff --check` | PASS |

## Privacy / security

- No backend, auth, database, secrets, `.env`, or provider changes
- Threat level + connections: pure client modules, no network
- Artifacts remain client-side exports of already-loaded public fields
- No deploy performed

## H3 verification

| Check | Result | Evidence |
|-------|--------|----------|
| Dashboard renders structure | PASS | shell still mounts all v2 panels + command bar + legend |
| Map/timeline/filters/clusters | PASS | modules untouched except timeline badge hook |
| Event/cluster drawers | PASS | upgraded with threat + connections + artifact |
| Artifact exports present | PASS | base commit + artifact section retained |
| Change awareness present | PASS | panel still in shell |
| Threat level v0 events | PASS | unit tests + drawer render |
| Threat level v0 clusters | PASS | `computeClusterThreatLevel` + cluster drawer |
| Connected events + click attrs | PASS | `data-v2-timeline-event` on connection rows |
| Empty focus copy | PASS | operator bar + empty-focus when zero events |
| Provider health | PASS | still rendered in shell |
| No backend/provider/secrets/deploy | PASS | file diff scoped to UI/intelligence/docs/tests |
| Existing artifact/change tests | PASS | still green in platform suite |

## Manual QA

| Check | Result |
|-------|--------|
| Open dashboard locally | **Partial** — `npm run validate` served live `/api/events` (384 events); full browser UI not driven |
| High-severity event threat reasons | **PASS (scripted)** — critical quake fixture → elevated+/reasons/caveats in drawer HTML |
| Connected event click-through | **PASS (scripted)** — related row uses `data-v2-timeline-event`; second event drawer renders |
| Export Markdown/JSON | **PASS (scripted)** — MD sections + parseable `schemaVersion: v1` JSON |
| Empty filters state | **PASS (scripted)** — operator bar + “No events/clear filters” copy |
| Provider health + change awareness | **PASS (scripted)** — panels still render with sample context |
| Tablet/mobile visual resize | **Deferred** — CSS media rules present; visual browser resize not run |

Scripted smoke: `node scripts/productization-smoke-qa.mjs` → **SMOKE_PASS all** (15 checks).

## Known limitations

- Threat level is a **heuristic**, not official warning levels
- Connections are in-memory and filter-scoped
- Manual browser QA not completed in this session
- Stacked on artifacts PR; merge order matters
- No toast feedback on export success/failure
- Dual legacy + v2 left-panel surfaces still coexist

## Follow-up

1. Manual browser QA checklist above  
2. Merge artifacts PR #43 before or with this branch  
3. Next: `feature/dashboard-operator-usability-v1` or source-confidence-v1  
