# Local globe repeat-work measurement

Baseline: `390b9a6b79bc89b03baf03f4fe4b1e02aed29384`, origin `https://github.com/Zacharon/live-map.git`. Candidate exists only in orchestrator-bound `perf/globe-local-20261030`; no canonical application, push or deployment.

## OBSERVED

- `src/map/globe-controller.js:setGlobeMode` called `webglAvailable()` on every render. `src/map/cesium-adapter.js:19-30` creates a temporary canvas/context and releases it. Twenty synthetic chokepoint toggles produced 24 and 22 WebGL getContext calls, consuming 182.0 and 133.2 ms inside getContext alone.
- The focused change reuses `globeHandle.ok` while a viewer exists. Forced failure and context-loss guards take precedence; teardown clears the handle so a new probe occurs.
- Same scenario after the change produced zero repeat probes in both initial and verification runs. Rotation and viewer identity passed. No overall latency speedup is established: repeat elapsed times varied.
- Startup source path: index.html loads Leaflet and markercluster before app.js; app.js statically imports app-controller.js and its dependency graph. Cesium loads dynamically from cesium-adapter.js:118 onward, with an IIFE fallback. Resource durations do not isolate JS parse/evaluation time.
- Initial baseline Cesium module resource duration was 5245.6 ms for 4,754,611 transferred bytes, versus 151.7 ms on reload. The later cold-cache sample was 137.1 ms. OS/filesystem/antivirus/process warmup are uncontrolled; this is not evidence of an optimization to Cesium transfer or parsing.

| Sample | First renderer-ready ms | 20 toggles elapsed ms | Repeat probes |
| --- | ---: | ---: | ---: |
| Before, cold browser cache | 6776.3 | 1755.8 | 24 |
| Before, warm process reload | 1117.8 | 1459.6 | 22 |
| After, cold browser cache | 1667.2 | 1646.1 | 0 |
| After, warm process reload | 1119.3 | 1173.6 | 0 |
| Verification, cold browser cache | 1936.3 | 1826.8 | 0 |
| Verification, warm process reload | 1210.1 | 1617.0 | 0 |

Readiness is a 10 ms sampled renderer signal, followed by an explicit camera rotation assertion, not a user-input-to-photon metric. The loopback server sends no-store, so warm means process reload, not an HTTP asset-cache hit.

## Reproduce and correctness

Raw local evidence: [before](../artifacts/globe-performance/before.json), [after](../artifacts/globe-performance/after.json), [verification and regressions](../artifacts/globe-performance/after-verified.json). These generated artifacts are ignored by Git and remain in this local checkout.

`node scripts/measure-globe-local.mjs <label>` starts a loopback synthetic-only preview and isolated headless Edge, blocks HTTPS, clears browser cache for the first navigation, reloads, rotates the camera and toggles chokepoints twenty times. It writes `artifacts/globe-performance/<label>.json`, then closes its browser and server. Baseline data was collected before the controller change using the same measurement segment. Added post-measurement regressions verify forced WebGL fallback, recovery and probing after 2D teardown.

PASS: npm run check:syntax; offline validator (10 checks); semantic-globe-weather tests; globe-style tests; headless assertions, forced failure/recovery/2D teardown, zero unhandled exceptions. Offline source reachability intentionally omitted. No provider contacts or real user records used.

## INFERRED / UNKNOWN

INFERRED: reusing a live viewer removes redundant GPU capability work. MDN documents canvas context creation/reuse and context-loss notification: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext and https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextlost_event . This implementation preserves the existing context-loss callback/guard.

UNKNOWN / NOT RUN: physical GPU/device performance, hosted startup, actual input rotation latency, precise parse/long-task attribution, induced context loss, HTTP warm-cache performance and statistical latency benefit. No release/closure or H3 certification is claimed. Owner acceptance, production CSP and native recovery gates remain open. Auth, schemas, ingestion, public export and hosted configuration unchanged. No feature added; existing human controls and agent setGlobeMode command share this path, with no new authorization or durable state.

Tool discovery: Node v24.16.0 and installed Edge found; repository design-browser.mjs supplies headless CDP without dependencies. No REA-named tool surfaced in available-tool discovery and no rea/playwright executable was found by Get-Command. No installation attempted.

Primary upstream evidence: [Khronos WebGL specification, Context Creation](https://registry.khronos.org/webgl/specs/latest/1.0/#2.1) defines creation of a drawing buffer with a new WebGL context. Consulted editor draft dated June 30, 2026 (work in progress). This supports the allocation mechanism; measured timings come exclusively from local results above.

Independent read-only researcher corroborated adapter lines 19-28 create a new canvas for each probe, so same-canvas context reuse does not avoid this lifecycle. The reviewer identified the creation-success-only nature of `ok:true`: the patch retains contextLost/failWebgl precedence and existing teardown nulling. [Cesium Viewer.destroy documentation](https://cesium.com/learn/cesiumjs/ref-doc/Viewer.html#destroy) requires destruction when permanently removing the widget. This is a source review, not independent runtime or H3 certification.
