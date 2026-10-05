# Live Map current-local audit repairs

The user requested implementation of the supplied audit findings and a substantial quality upgrade. The attached audit-only mission was background evidence, not a command overriding that request. This slice repairs the current dirty Windows checkout, not the remote `84a4dff` snapshot. It preserves the already implemented Cesium globe, evidence/assessment workbench, historical PortWatch extract, and durable ingestion.

Work started in an isolated `codex/live-map-audit-fixes` worktree from `1640bed51a76fb916f570d755bf5e576ccc36646`, overlaid with the existing local source bytes. The before-byte manifest, changed-path hashes, tests, browser screenshots, and guarded integration receipt are in [the evidence directory](../artifacts/audit-refactor-2026-09-30/). No commit, push, deployment, credential change, database provisioning, or source activation is included.

## Repairs and migration decisions

| Finding / choice | Result |
| --- | --- |
| Missing/blank/container coordinates became zero | Strict finite-number parsing and bounds checks; valid numeric zero stays valid. Missing locations remain unmapped. USGS depth and magnitude also reject coercible missing values. |
| Missing confidence/source type/clocks became authoritative defaults | Confidence stays null; source type becomes Unknown. Occurrence, source publication, ingestion, revision, and verification remain distinct. Unknown/future source revision has unknown freshness. Epoch timestamps survive inspector/export. |
| Verification substring upgrade | Exact normalized allowlist and one explicit legacy provider-reviewed alias. Negative/invalid labels stay unverified. |
| Article counts became independent-source counts | Only explicit valid independent counts affect the quality metric. Missing organization identities cannot establish independence. |
| Severity/support/freshness marketed as impact | Explicit supplied impact stays separate from the labeled inspection-priority heuristic. No assessment means impact unknown. |
| Undated records lost before frontend | Provider orchestration and feed retain them with unknown occurrence; undated grouping and unknown-score sorting are safe. |
| Process-global API environment mutation | Removed request-time process.env replacement; provider keys/flags/cache receive explicit request environments, including empty environments. |
| Storage failures broke the workspace | Best-effort storage returns safely; failed saved-view persistence tells the user to copy the URL. |
| Whole-marker/whole-entity rebuilds | Event IDs retain marker/entity identity; only changed rendering fields update, absent events remove. Graph/reference overlays retain their existing implementation. |
| Competing tabs and overlays | Watch is the primary workspace. Passages and Open reports remain discoverable; country/source/diagnostic tools move into Tools. Map and feed use separate regions. Inspector replaces feed with keyboard-accessible return. Historical chart appears only in its passage context. |
| Repeated DOM replacement | Unchanged feed/inspector markup remains mounted; focus/disclosure state survives camera updates. Explicit 2D mode is serialized for reload. |
| Basemap absent despite healthy offline state | Removed the redundant ocean rectangle that obscured land. Offline geometry remains deliberately coarse and labeled. |
| Static smoke labeled E2E | Log now identifies HTML/CSS/handler checks; actual browser evidence is separately recorded. |

Kept static hosting and the API envelope because these repairs do not justify a framework rewrite. Extracted value semantics, storage, and pure feed/coverage rendering from controller responsibilities. Legacy CSS outside the Watch shell and compatibility routes remain until a measured retirement plan exists. Existing source, observation, event, relationship, and human-owned assessment boundaries remain intact.

## Verification

Read [browser evidence](../artifacts/audit-refactor-2026-09-30/browser-evidence.json) and the adjacent test logs for exact observations and limits. Browser checks use the real local renderer with synthetic reports and existing historical data. They establish local interface behavior, not provider availability or production parity.

| Check | Evidence |
| --- | --- |
| Syntax and platform behavior | syntax.txt, platform.txt |
| Unknown values, verification, clocks, coverage, USGS depth, inspector/export | truth.txt (8 focused journeys) |
| Stable marker identity, 240-marker repeated mock updates, request environments, undated API projection, blocked storage | renderer.txt; mock duration is not browser FPS |
| Existing in-process PostGIS ingestion/recovery | ingestion.txt, recovery.txt; native PostgreSQL is not run |
| Offline validator and repository secret scan | validator.txt (10 checks), repo-scan.txt; external source URL reachability is explicitly not checked |
| Static handler and source contracts | static-smoke.txt, sources-smoke.txt; these are not browser tests |
| Real browser journey | desktop.jpg, mobile-inspector.jpg, empty-results.jpg, webgl-fallback.jpg, public-unavailable.jpg, mode-switches.json |
| Independent H3 and exact-byte integration | H3.md and integration-receipt.json in the evidence directory |

## Capability and remaining-risk boundaries

The Cesium and Leaflet renderers execute locally. The source catalog describes candidate/configured capabilities; it does not establish live global coverage. Synthetic fixtures are explicit. The PortWatch series is a dated historical AIS transit-call estimate, not measured cargo throughput or a current operating verdict. Durable ingestion passes PGlite/PostGIS checks, while native concurrency/restore and hosted roles/runtime parity remain unverified. No source was enabled.

Generic missing severity still follows the pre-existing taxonomy fallback of 25/low. These repairs do not claim every unknown field is solved. Aircraft/vessel rendering and screen-space decluttering remain separate follow-ons. The controller still owns orchestration; this is a selective refactor, not complete frontend decomposition. Formal accessibility certification, actual 200% browser zoom, reduced-motion browser emulation, and real browser FPS are not claimed.

Production `netlify.toml` retains its existing strict CSP. Local preview permits the previously documented Cesium bundle evaluation; production globe readiness remains blocked by that separate incompatibility. #61 human visual acceptance and genuine assessment acceptance remain human-owned. Independent H3 for this bounded repair does not promote these other gates.

Rollback uses the exact before-byte copies for changed existing paths and the explicit new-file list, only after checking that no later edits would be overwritten. HEAD is not a valid rollback baseline for the inherited dirty work.
