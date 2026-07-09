# Change Awareness v1 Verification

## Branch

`feature/change-awareness-v1` from `main@0d6922e`

## Commands Run

| Command | Result |
|---------|--------|
| `git switch main && git pull` | OK |
| `npm run check` (pre-edit on main) | PASS |
| `npm run test:platform` (pre-edit) | PASS — 90 tests |
| `npm run validate` (pre-edit) | PASS — 10/10 |
| `npm run check` (post-edit) | PASS |
| `npm run test:platform` (post-edit) | PASS — 94 tests |
| `npm run validate` (post-edit) | PASS — 10/10 |
| Visual QA | PASS — 21 checks |

## Privacy Note

Change awareness stores only hashed public event metadata in `localStorage` under `live-map:change-awareness:v1`. No credentials or raw provider payloads.

## Modal / Drawer

Change list and timeline use existing drawer-only inspection (no modal).

## Known Limitations

- Filter changes alter what counts as new/updated
- No cross-tab sync
- Visual QA script may remain untracked locally

## Follow-up Tasks

1. P3: Source reliability + evidence drawer
2. Commit visual QA script to repo
3. Optional per-dashboard snapshot keys