# 3D globe visual pass (2026-10-17, local only)

The owner said the globe "is still just base Cesium". This pass gives it a styled look and makes it more useful. It uses no new keys, no paid services and no Cesium ion. Nothing was deployed.

## What changed

| Area | Before | After |
| --- | --- | --- |
| Basemap | Natural Earth II raster as shipped (bright, flat) | "Night atlas" restyle of the same local raster: darker, higher contrast, deep navy oceans. `basemap=natural` (or `globeStyle: "natural"`) keeps the original look |
| Sky / atmosphere | Black background, no sky box | Local Cesium star sky box, sky and ground atmosphere, sun-lit day/night terminator at global scale. Lighting fades out below about 6,000 km camera height, so regional views stay evenly lit |
| Reference | None | 30° graticule with a brighter equator, drawn as non-pickable polylines |
| Borders | None | Optional Natural Earth 1:110m land boundary lines loaded from `vendor/natural-earth/ne_110m_admin_0_boundary_lines_land.json` when that file is vendored. If the file is missing, the globe skips borders without error. They are simplified and are not legal boundaries |
| Event markers | Flat points | Canvas billboards: the core keeps the category colour used by the 2D map key, the ring carries severity, size grows with severity, and high/critical records get a halo. Lead records are drawn at half opacity. The selected record gets a cyan ring and a title label |
| Decluttering | None | Entity clustering (34 px). Badges show the count and are ringed in the most severe member's colour, never an average. Clicking a badge flies to its members. The selected record never joins a cluster |
| Camera | Instant jumps | Feed or globe selection, Focus selection and Global view use smooth flights (0.7–2.2 s, eased, scaled by distance). Initial load and resize preservation stay instant |

Code: `src/map/globe-style.js` holds the pure rules (style choice, marker and cluster specs, graticule, border parsing, flight timing). `src/map/cesium-adapter.js` handles rendering. Tests: `tests/globe-style-tests.mjs`, wired into `npm run test:platform`.

The 2D Leaflet map, the WebGL/Cesium fallback card (`?failWebgl=1`, `?failCesium=1`), all `/api/*` routes, picking ids (`event:<id>`), and the runtime `data-globe-*` attributes are unchanged. New attributes: `data-globe-style`, `data-globe-graticule`, `data-globe-border-lines`, `data-globe-last-flight`, and `data-globe-last-pick="cluster:<n>"`.

## Tile placeholders (2026-10-27)

The night grade itself is unchanged. Unloaded terrain was drawing `#050b16`, which read as black cubes and bars against the graded ocean, especially while `requestRenderMode` held a frame after the camera stopped. The placeholder is now `#123044`. A level-0 sheet of the same local Natural Earth pyramid sits under the level 0-2 layer. Fog is on again and still only affects cameras below Cesium's 800 km cutoff. `data-globe-tiles-loading` is the terrain/imagery queue length.

## CSP implications

- **No new origins.** The imagery, sky box, star textures, border file and marker canvases are all same-origin, or canvas objects passed directly to Cesium. The existing `img-src 'self' data: blob:` and `connect-src 'self'` cover them.
- **The production blocker is unchanged.** Cesium 1.145 bundles Knockout 3.5.1, which calls `eval("this")` when the module loads. Production `netlify.toml` sends `script-src 'self' 'wasm-unsafe-eval'` without `'unsafe-eval'`, so on the deployed site the 3D globe fails to start and the 2D fallback card is shown. Only the local preview servers add `'unsafe-eval'`.
- Choices for the owner (not made here): (a) add `'unsafe-eval'` to production `script-src`, which weakens XSS defence site-wide; (b) serve the globe from a separate route or page with its own relaxed CSP; or (c) replace the vendored bundle with a Cesium build without Knockout (engine only, `CesiumWidget` instead of `Viewer`). This pass works with all three.

## Evidence

Screenshots are in `artifacts/globe-visual-2026-10-17/` (`before-*.png` and `after-*.png` at 1440×900 for global, selected and Hormuz, plus 390×844 mobile, and `after-cluster-probe-synthetic.png`). They were captured in headless Edge against `node scripts/preview-foundation.mjs 8770` with the synthetic `?demo=foundation` data, using `node scripts/capture-globe-visual.mjs before|after`. Browser exception logs were empty for both runs.

An interaction check in the same browser covered:
- Clicking a globe marker selects it, opens the inspector and starts a 0.92 s flight.
- Global view and Focus selection fly smoothly.
- `?failWebgl=1` shows the 2D fallback.
- `mapMode=2d` renders Leaflet.
- No exceptions were thrown.

The data is synthetic. This is not live-feed evidence, and owner visual acceptance is still pending.
