# Event Artifacts v1 Verification

## Branch

`feature/event-artifacts-v1` from `main@6d756a2` (change awareness already merged).

Worktree: `live-map-event-artifacts-v1`

## Commands Run

| Command | Result |
|---------|--------|
| `git switch -c feature/event-artifacts-v1` | OK from updated main |
| `npm run check` (pre-edit) | PASS |
| `npm run test:platform` (pre-edit) | PASS — 94 tests |
| `npm run validate` (pre-edit) | PASS — 10/10 |
| `npm run check` (post-edit) | PASS (includes new artifact modules) |
| `npm run test:platform` (post-edit) | PASS — all tests including 9 new artifact tests |
| `npm run validate` (post-edit) | PASS — 10/10 (one transient FAIL earlier due to upstream provider fetch outage; re-run clean) |
| `git diff --check` | PASS (no whitespace errors) |

## Privacy / Security Note

Artifacts are built client-side from already-loaded normalized event/cluster fields. Exports do not add backend storage, accounts, secrets, or new provider APIs. `.gitignore` adjusted from `artifacts/` to `/artifacts/` so only the root generated-output folder stays ignored; source module `src/artifacts/` is intentionally trackable.

## H3 Checks

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | Feature branch not main | PASS | `feature/event-artifacts-v1` |
| 2 | Based on updated main | PASS | Base `6d756a2` |
| 3 | Pre-edit gates | PASS | check / 94 tests / validate 10/10 |
| 4 | Event artifact builds | PASS | unit test + `buildEventArtifact` |
| 5 | Cluster artifact builds | PASS | unit test + `buildClusterArtifact` |
| 6 | Markdown sections present | PASS | unit test required headers |
| 7 | JSON parseable + schema v1 | PASS | unit test |
| 8 | Missing fields safe | PASS | unit test null/empty inputs |
| 9 | No mutation of raw events | PASS | unit test JSON equality |
| 10 | Related events deterministic | PASS | unit test |
| 11 | Confidence placeholder | PASS | unit test when no confidence |
| 12 | No backend/auth/DB/secrets | PASS | client-only modules |
| 13 | No provider changes | PASS | no provider file edits |
| 14 | No deploy | PASS | none performed |
| 15 | Drawer still works | PASS | existing drawer tests + artifact section append |
| 16 | Change awareness untouched | PASS | no edits to change-awareness modules |

## Manual Follow-up

Click an event in the drawer and exercise:

1. Copy Markdown  
2. Download Markdown  
3. Copy JSON  
4. Download JSON  

Confirm related-event buttons open the drawer.

## Known Limitations

- Related events are heuristic and limited to the current in-memory filtered view
- Confidence is passthrough / placeholder only (no source-confidence-v1 scoring)
- Analyst notes are read-only placeholder text
- No case pins, review states, or persistence
- Cluster export is a snapshot of the current clustering view, not a durable case file
- Clipboard may fail in restricted browser contexts (fallback attempted)

## Follow-up Tasks

1. Manual drawer export QA in browser  
2. `feature/dashboard-operator-usability-v1`  
3. Later: investigation workspace, source confidence, globe spike  
