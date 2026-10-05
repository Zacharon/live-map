# Evidence model, chokepoint operations, and semantic-zoom globe

Local implementation: 2026-09-15. Working name: Live Map / OSINT Forge.

Status: **PARTIAL — locally usable operational model and 2D/3D renderer boundary; not production-ready; nothing deployed.**

## Architecture decision

Keep one shared application state (filters, selection, time/as-of, layers, URL/saved views) and two renderers:

- Leaflet remains the working 2D map and the low-resource / no-WebGL fallback.
- CesiumJS 1.145 (Apache-2.0) is the lazy-loaded globe. No Cesium ion account, no default demo token, no paid terrain.
- Auto switches by visible ground scale with hysteresis. Camera height changes presentation, not evidence quality or dataset altitude.

Do not add MapLibre, deck.gl, Three.js, or a force-graph library in this slice. Do not migrate to React/Next or a graph database.

## Reference transfer (3D globe v1)

| Reference | Adopted behavior | Implementation | Verification |
| --- | --- | --- | --- |
| WebGL Earth 2 (unmaintained; recommends Cesium) | Leaflet-like select, fly-to, globe navigation | Existing Cesium 1.145 vendor + `globe-controller.js` | Browser 3D canvas or explicit 2D fallback |
| TrueSize | Clear selection, orbital controls, geographic scale | North-up / Global / Focus chrome; camera height from visible ground scale | 2D↔3D shared lat/lon/selection |
| Earth3DMap | Globe as the main canvas, not a widget | `#globeStage` fills the map stage | Screenshot of globe occupying the workspace |
| Flourish 2023 article | Spatial/temporal presentation, selected annotations | Brief panel cards; globe labels only for selected + budget | Labels do not dump workbench onto the globe |

These pages are interaction references only. Their engines, imagery rights, and hosted products are not copied.

## Threshold policy

File: `src/intelligence/threshold-policy.js`

Label: **engineering-default-unvalidated** version `2026-09-15.1`.

The originating brief supplied no numeric thresholds. These values exist for fixtures and sensitivity tests. They are not recovered, calibrated, or production-approved. Production auto-promotion is disabled.

- Comparable daily throughput `T_d` and positive expected baseline `B_d` (same unit, vessel class, direction, geographic scope, compatible coverage).
- `R7 = sum(T_d)/sum(B_d)` over seven complete eligible UTC days.
- Persistent-degraded candidate: `R7 < 0.75` on 14 consecutive eligible calendar-day evaluations.
- Broad-recovery candidate: `R7 >= 0.90` on 7 consecutive eligible evaluations, at least 3 of 4 groups improving, throughput and physical access required, no veto.
- Missing/incomparable days invalidate continuity; they are not zero traffic.
- Fourteen consecutive 7-day evaluations need at least 20 calendar days of comparable history plus the baseline vintage.
- Diplomacy is not an operational recovery group.

## L01–L11 mapping

| ID | Requirement | Code | Tests |
| --- | --- | --- | --- |
| L01 | No qualifying operational evidence → unknown, not normal | `operational-evaluator.js`, `chokepoint-condition.js` | `operational-evidence-tests.mjs`, platform chokepoint tests |
| L02 | Evidence ranks vs operational states; last-known preserved; stale feeds cannot resolve | same | scenario + last-known case |
| L03 | Independent diplomacy / physical / throughput / commercial | `evaluateDimensions` | diplomacy-with-low-throughput stage |
| L04 | Evidence-backed exposure; proximity is not verified causality | `evaluateExposure` | hypothesized + proximity-rejected |
| L05 | Nominal vs deliverable; no stock+flow sums | `evaluateSupply` | stock/flow rejection |
| L06 | Restriction geometry, scope, interval; expiry ≠ recovery | `evaluateRestriction` | restriction stage + over-claim |
| L07 | Regime duration with versioned policy | `evaluateRegimeDuration`, `threshold-policy.js` | persistent-shortfall + sensitivity |
| L08 | Commercial friction sourced separately | commercial records in evaluator | costly-access stage |
| L09 | Observed diversion only with alternative route + period | `evaluateDisplacement` | diversion stage |
| L10 | Recovery breadth, fixed denominator, missing stays in denominator | `evaluateRecoveryBreadth` | isolated + broader stages |
| L11 | Capability/access streams; oil-range unbound | `operational-streams.js`, source registry | registry + streams module |
| Globe | Cesium lazy load, 2D/3D/Auto, shared URL state | `cesium-adapter.js`, `globe-controller.js`, `view-state.js` | `semantic-globe-weather-tests.mjs` |
| Graph | Typed nodes/edges, bounded neighborhood | `knowledge-graph.js` | neighborhood + antimeridian |
| Weather | Compact field + synthetic cache separation | `wind-field.js`, `wind-proof.js` | field sample + synthetic vector |
| Maritime | Density vs activity vs corridors | `maritime-overlays.js`, `portwatch.js` | live-label rejection |
| Orbital | OMM ids, stale, throttle, estimate-only | `orbital/satellite-proof.js` | catalog 6-digit + cache |

## Source / access matrix (2026-09-15)

Implemented means local code, not production activation.

| Layer | Status | Notes |
| --- | --- | --- |
| Existing USGS/EONET/NWS/GDACS | unchanged | Not re-activated |
| NOAA GFS 10 m U/V | preprocessor + compact JSON fixture | No wgrib2 on this Windows host; not a live NOMADS pull |
| Synthetic wind | demo-only separate cache | Unchanged |
| IMF PortWatch | discovered ArcGIS REST; fixture adapter | Daily observations, weekly Tuesday publish. Polling not activated |
| World Bank shipping density | overlay format sample | 2015-01–2021-02; not live; not a full raster download |
| CelesTrak OMM | proof module, no live fetch | Cache ≥ 2h; satellite.js not vendored in this slice |
| CesiumJS | adapter ready; local assets optional | Leaflet fallback if WebGL or vendor assets missing |

## Synthetic scenario

`src/data/fixtures/synthetic-chokepoint-scenario.js` — invented records anchored on Strait of Hormuz geography, labeled `[SYNTHETIC]`. Stages: restriction → diplomacy with low throughput → costly access → diversion → persistent shortfall → isolated improvement → broader recovery → stale/contradiction.

Preview: `http://127.0.0.1:8766/?demo=foundation&view=chokepoints&chokepoint=strait-of-hormuz`

Workbench (2026-09-16): Investigate on that inspector. See `docs/EVIDENCE_TO_ASSESSMENT_WORKBENCH.md`. Does not replace L01–L11.

## What is not claimed

- Not live-verified GFS, PortWatch, World Bank, or CelesTrak.
- Not production-ready. Not deployed. No ion tokens. No new accounts.
- Fixture success is not predictive accuracy.
