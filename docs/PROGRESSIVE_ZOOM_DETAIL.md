# Progressive zoom detail

Implemented locally 2026-09-13 in the primary Workspace Live_Map repository (Zacharon/live-map), on the existing codex/zoom-aware-map-foundation branch. Existing uncommitted foundation work was preserved. No reference copy, providers, deployment or account configuration was changed.

## Bounded slice

The shared event attention selector previously filled its marker budget even with minor events. It now uses existing normalized severity to determine zoom eligibility:

| Zoom | Eligible severity | Maximum displayed records |
| --- | --- | --- |
| Below 4 | High, critical | 18 |
| 4 to below 7 | Medium, high, critical | 80 |
| 7 and above | All, including unknown | 240 |

Existing tie order is severity, reported impact, confidence, occurrence time, then ID. This is display priority, not verification or a new risk score. Sparse global views remain sparse. Filters and valid viewport geography are applied first. An inspected event can bypass the severity threshold but cannot bypass filters, viewport checks or the display cap. It uses a free slot if available, otherwise replaces the last ranked record.

The disclosure distinguishes records hidden by scale from those hidden by budget and explains the inspected-event exception. The full filtered list remains available. Existing Leaflet clustering still groups nearby detail until zoom 8; the counts describe event records, not cluster icons. Original event objects, source links, timestamps, precision and verification fields pass through unchanged.

## Files changed for this slice

- `src/map/attention-policy.js`: significance thresholds, selection retention and hidden counts.
- `src/app-controller.js`: density disclosure text.
- `tests/zoom-density-tests.mjs`: threshold, selection, filter, viewport, ordering, cap and immutable provenance regressions.
- `tests/run-tests.mjs`: runs the focused regressions with platform tests.
- `tests/foundation-tests.mjs`: expected counts for the existing 10k-record fixture.
- `docs/LAST_30_DAYS.md`, `docs/NEXT_TASK_QUEUE.md`, `docs/ZOOM_AWARE_MAP_FOUNDATION.md`, and this report.

## Verification

- `node tests/zoom-density-tests.mjs`: passed.
- `node tests/foundation-tests.mjs`: passed (10k events / 2k objects).
- `npm.cmd run check:syntax`: passed.
- `npm.cmd run validate -- --offline`: passed, 10 checks / 0 failures. Provider-unavailable warnings and skipped source-URL reachability are expected in offline mode.
- `node --import ./tests/offline-network.mjs tests/run-tests.mjs`: passed.
- `git diff --check`: passed; existing Windows line-ending warnings only.

Browser exercised through the existing local static preview, using explicitly labeled synthetic foundation data centered on Japan. Zoom buttons transitioned from world to regional to local. World showed 12 of 120 records (108 hidden by scale), compared with the previous policy's 18. At regional zoom, Japan showed 3 of 10; local zoom showed 10 of 10, with nine nearby records grouped by Leaflet. Global and local screenshots were inspected during the task. Search for Japan reduced the list to 10 records. These are local fixture observations, not live provider or production evidence.

## Next logical slice

Screen-space decluttering for overlapping high-severity markers, with a way to inspect every grouped event. Keep existing providers, severity thresholds and provenance. This follow-on was not implemented.
