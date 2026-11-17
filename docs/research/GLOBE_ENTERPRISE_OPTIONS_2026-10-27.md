# Globe enterprise options (2026-10-27)

Research only. No app code, commit, push, or pull request. The recommendation is to keep CesiumJS and change what it draws. A renderer migration is the expensive way to get a look the current adapter can already reach.

Captured against the local synthetic preview (`node scripts/preview-foundation.mjs 8791`, `?demo=foundation`). The data on screen is the foundation demo, not a live feed. Production `netlify.toml` still omits `'unsafe-eval'`, and Cesium 1.145 loads Knockout, which calls `eval`. On the deployed site the 3D globe still fails closed to the 2D map. These screenshots are the local preview, where that eval is allowed.

## 1. Current state

### What is on screen

Global view, zoom 3, camera height about 13.4 million metres, night style, 12 markers:

![Global night globe with markers](../../artifacts/globe-enterprise-research-2026-10-27/global-zoom3.png)

File: `artifacts/globe-enterprise-research-2026-10-27/global-zoom3.png`

Regional view, Japan, zoom 6, camera height about 1.46 million metres, night style, one cluster badge of 3:

![Regional zoom, blurred Japan, cluster badge](../../artifacts/globe-enterprise-research-2026-10-27/regional-japan-zoom6.png)

File: `artifacts/globe-enterprise-research-2026-10-27/regional-japan-zoom6.png`

Runtime attributes read from the page after load: `data-globe-style="night"`, `data-globe-graticule="30"`, `data-globe-border-lines="0"`, renderer `cesium`.

### Imagery

`src/map/cesium-adapter.js` builds one imagery layer from the vendored TMS pyramid `vendor/cesium/Assets/Textures/NaturalEarthII`, credited as Natural Earth / CesiumJS Apache-2.0, low-resolution, not live. `tilemapresource.xml` lists three levels only. Level 2 is `0.17578125` degrees per pixel, about 20 km per pixel at the equator. The pyramid is 43 JPEGs, 476 KB. There is no level 3 or above, so any closer camera stretches those same tiles. The regional screenshot is that stretch: Japan is a dark green smear, the ocean is near black, and a cluster badge is the only crisp mark.

The night look is a grade on that same raster, not a night-lights image. `src/map/globe-style.js` sets brightness `0.36`, contrast `1.6`, saturation `0.6` for `night`. The default style is night unless `basemap` is `natural`. At global height the sun lighting is still on (`lightingFadeOutDistance` 6,000 km, `lightingFadeInDistance` 14,000 km), so the day side still reads as a painted school globe. Inside the fade, the grade and the stretched tiles collapse together, which is the Japan frame.

Terrain is `EllipsoidTerrainProvider`. No 3D Tiles, no buildings, no ion asset. `Cesium.Ion.defaultAccessToken` is set to an empty string. The Cesium Viewer credit widget is still in the accessibility tree as a "Cesium ion" link, because the widget ships with the Viewer even when ion is unused.

### Markers, labels, lighting

Markers are canvas billboards from `markerSpec`: a category-coloured core, a severity ring, a halo for high, critical, or selected, half opacity for non-event leads. They scale slightly with distance. Entity clustering is on (`pixelRange` 34, `minimumClusterSize` 3). The badge uses the most severe member's colour and a count. The selected record is kept out of the cluster and is the only event that gets a title label (`system-ui`, 13px, dark pill).

Chokepoint names use a screen-space budget (none below zoom 4, then 8, then 12) and avoid the chrome. Country borders are fetched from `vendor/natural-earth/ne_110m_admin_0_boundary_lines_land.json`. That directory is not in the tree, so the fetch fails and `data-globe-border-lines` stays `"0"`. There are no country or city labels on the globe.

Lighting: sun-driven globe lighting, ground atmosphere, sky atmosphere with a small night shift, stars from the default Viewer sky box. The sun and moon billboards are hidden. Fog is off. `requestRenderMode` is on, so the scene draws on demand. That is why the globe stays cheap while idle, and why a continuous pulse or bloom would need an explicit render clock.

Graph edges, when the graph layer is on, are flat 2px geodesic polylines. They are not raised arcs. There is no heat layer, no hex bin, and no post-process bloom in the adapter.

Chrome over the globe is two text buttons, North up and Focus selection. Global view is in the DOM and hidden in CSS (`map-workspace.css` sets `[data-globe-global] { display:none }`) because the workspace already has a World button. Fly-to already eases: `flightDuration` is 0.7–2.2 s, quadratic in-out. Initial load and resize stay instant.

The workspace around the globe is already the denser part of the product: Inter on the map workspace, a mono stack on the v2 dashboard, a dark panel, and an honest "Synthetic demo" strip. The globe is the surface that still looks like a default Cesium ball inside that shell.

### What reads as basic

- The land is a colour-graded painting that cannot survive a regional zoom.
- Coastlines and borders are soft or absent. The border file the loader expects was never vendored.
- Nothing on the globe names a country, a sea, or a city. The only text on the sphere is a selected title or a chokepoint that cleared the budget.
- Markers are flat discs. Severity is a ring colour. There is no motion, and at world scale several of them read as the same dot.
- The 30° graticule is a classroom overlay on an otherwise empty sphere.
- The day side at world scale is the stock Natural Earth palette. The night grade only becomes obvious once the camera is close, and then the picture is mostly black.
- The ion credit remains even though ion is deliberately unused.
- The HUD is competent and dark. It is also a stack of equal-weight buttons and disclosures. Enterprise reference products spend their contrast on a few numbers and let the map be quiet.

The 17 October visual pass already added the night grade, atmosphere, terminator, stars, graticule, clustering, and eased flights (`docs/GLOBE_VISUAL_2026-10-17.md`). The remaining gap is resolution, names, and a quieter frame. It is not a missing 3D engine.

## 2. Comparison

Constraints used for every row: static Netlify publish of the repo root, no build step unless `README.md`, `netlify.toml`, and CI change together, no paid service without an explicit approval, no API key in browser code, and a licence that allows commercial use with attribution the app can actually show.

| Option | Look | Performance and size | Static host | Licence, price, attribution | Migration from this code | Clusters, labels, heat, arcs |
| --- | --- | --- | --- | --- | --- | --- |
| CesiumJS 1.145, kept | Real ellipsoid, atmosphere, terminator, stars. Look quality is the imagery you attach. | Vendored tree 22.8 MB. ESM `index.js` 4.75 MB, IIFE `Cesium.js` 6.04 MB, plus workers. `requestRenderMode` keeps idle cost low. Already loaded. | Already vendored. New imagery can be same-origin or a CSP host. | Apache-2.0. Engine is free for commercial use. | None. The adapter, view-state, picking ids, and tests stay. | Clustering and pick ids exist. Labels exist for selection and chokepoints. Arcs can be raised polylines. Heat and hex are custom. |
| Cesium ion imagery and 3D Tiles | Sentinel-2 at about 10 m, Bing or Google imagery, Blue Marble asset 3845, Earth at Night asset 3812, terrain, photorealistic buildings. This is the showcase look. | Streaming, not a bigger JS bundle. Session and byte quotas apply. | Needs a token. A browser token conflicts with the repo rule. A server proxy is a paid integration. | Community plan is personal and non-commercial. Commercial is $149/month individual. Global imagery sessions: 1,000/month community, 5,000 commercial. | Small code change (`IonImageryProvider`), large policy change. | Same Cesium layers as today. |
| NASA GIBS WMTS on the current Cesium globe | Earth at Night 2012 (`VIIRS_CityLights_2012`) and Blue Marble shaded relief (`BlueMarble_ShadedRelief_Bathymetry`). 500 m matrix, levels through 7 in NASA's Cesium demo. Far sharper than 20 km pixels, still not a street map. | JPEGs, CORS `*`. A level-2 night tile measured here was 19 KB; a Blue Marble tile was 37 KB. First view waits on NASA. Local NE2 can paint first. | No key, no build. `img-src` must allow `https://gibs.earthdata.nasa.gov`. | No key. NASA asks for a GIBS acknowledgement and forbids implying NASA endorsement. Unmarked NASA-led mission data is CC0. These layers are historical browse, not a live picture. | A provider in `cesium-adapter.js` plus the CSP line. | Unchanged. Imagery only. |
| MapLibre GL JS globe | Crisp vector coasts, place labels, a real dark style, atmosphere via `sky.atmosphere-blend`. The official globe-with-atmosphere example drapes raster tiles on `projection.type: 'globe'`. | `maplibre-gl@5.14.0` `dist/maplibre-gl.js` is 1,011,731 bytes on jsDelivr. v6 is ESM-only. Much smaller than the Cesium tree. | Fine if the bundle is vendored like Cesium. Tiles still need a host. | BSD. The library is free for commercial use. Tile licences are separate. | Rewrite `cesium-adapter.js`: camera height, clustering, chokepoint declutter, graph lines, picking ids, and the WebGL fallback. 2D Leaflet can stay. | Symbols and collision labels are native. GeoJSON clustering is a source option. Heatmap-on-globe is a documented example. Arcs need a custom layer. |
| OpenFreeMap as the vector source | Dark, Fiord, Liberty, Positron, Bright. Street-level labels. This is the "Bloomberg map" half of the look, on a globe only if the renderer is MapLibre. | Public tiles, no key. Self-host of the planet image is about 300 GB and a dedicated machine, which is not a Netlify static publish. | Public instance is a third-party origin in CSP. No SLA. | Commercial use is allowed. Attribution: OpenFreeMap (optional), OpenMapTiles, OpenStreetMap. Project code is MIT. Map data is ODbL. Bulk download of the public instance is capped at 3,000 tiles or 50 MB, 4 parallel requests, and a unique User-Agent. | Useless to Cesium as-is. The tiles are vector, not a raster TMS. | Depends on MapLibre. |
| Protomaps PMTiles, self-hosted | Same class of vector basemap, styled by you, including a dark flavour. Raster PMTiles also exist. | One file, HTTP range reads. A full planet build is not a static-site file. A low-zoom extract can be. | Netlify must honour Range requests for a raw `.pmtiles`. A Z/X/Y front door needs a function or another server. | PMTiles spec is public domain. Reference code and basemap tooling are BSD. OSM data inside a basemap is ODbL. The hosted Protomaps API needs a key and is non-commercial unless you sponsor them. | `pmtiles.js` plus MapLibre, or a Z/X/Y proxy in front of Cesium. A second renderer. | Same as MapLibre if that is the client. |
| Mapbox GL JS globe | The reference dark globe: atmosphere, vector labels, studio styles. v12 styles default to globe. | Similar weight class to MapLibre. The cost is the account, not the JS. | Token in the page, or a proxy you operate. | Free tier is 50,000 web map loads a month, then $5 per 1,000 in the first paid band. A load is one Map object, up to 12 hours. | Same rewrite as MapLibre, plus a token. The repo forbids API keys in browser code. | Native symbols, clustering, heatmaps. Arcs are custom. |
| deck.gl `GlobeView` | Strong for arcs, columns, and large point sets. The globe itself is a view, not a basemap. | Pulls `@deck.gl/core` and whichever layer packages you import. A second stack beside Cesium. | Static-friendly if vendored. Basemap tiles are still your problem. | MIT. | New camera and pick model. Known issues mixing GlobeView and MapView. | `ArcLayer` works if `cullMode` is `none`. The docs say `HeatmapLayer` and `ContourLayer` do not work in this view. Precision is weak past zoom 12. Tile and MVT layers are experimental. |
| globe.gl / three-globe | The demo people mean by "arcs and hex on a sphere": points, arcs, heat, hex bins, rings, HTML markers, a slippy tile skin, and a day/night example. | Depends on Three.js. Shipping it next to Cesium loads two 3D engines. | Static-friendly. | Both MIT. | Replaces the adapter. Orbit controls and `pointOfView` do not speak the current zoom/height view-state. Picking ids, the 2D fallback, and chokepoint declutter would be rewritten. | Hex bin, heatmap, and arcs are first-class. Clustering is not. Labels are HTML or text markers you manage. |

### Sources

- Cesium ion plans, Community limited to personal and non-commercial use, Commercial from $149/month, imagery session quotas: <https://cesium.com/pricing/>
- Sentinel-2 on ion, asset 3954, about 10 m, terms point at the ion agreement: <https://cesium.com/content/sentinel2/>
- Ion imagery tutorial, Earth at Night asset 3812 and Blue Marble asset 3845: <https://cesium.com/learn/cesiumjs-learn/cesiumjs-imagery/>
- Quota notes, including Sentinel-2 as the non-Bing fallback: <https://cesium.com/docs/tutorials/optimizing-quotas/>
- Cesium bloom stage (`scene.postProcessStages.bloom`, off by default): <https://cesium.com/learn/cesiumjs/ref-doc/PostProcessStageCollection.html> and the stage uniforms described at <https://jetbrains.github.io/kotlin-wrappers/kotlin-cesium-engine/cesium.engine/-post-process-stage-collection/bloom.html>
- MapLibre globe, released in 5.0 (December 2024): <https://maplibre.org/roadmap/maplibre-gl-js/globe-view/>
- MapLibre atmosphere example: <https://www.maplibre.org/maplibre-gl-js/docs/examples/display-a-globe-with-an-atmosphere/>
- MapLibre globe projection notes: <https://github.com/maplibre/maplibre-gl-js/blob/main/developer-guides/globe.md>
- Measured bundle: `https://cdn.jsdelivr.net/npm/maplibre-gl@5.14.0/dist/maplibre-gl.js` returned `Content-Length: 1011731` on 2026-10-27. v6 examples import `maplibre-gl.mjs`.
- OpenFreeMap, commercial use allowed, attribution, public-instance bulk cap, MIT code, OSM data: <https://openfreemap.org/>
- Protomaps, PMTiles range requests, self-host versus hosted API key, spec public domain, code BSD: <https://docs.protomaps.com/pmtiles/> and <https://protomaps.com/about>
- Hosted Protomaps API, key required, commercial use via GitHub Sponsors: <https://protomaps.com/api>
- Mapbox globe and atmosphere: <https://docs.mapbox.com/mapbox-gl-js/guides/globe/>
- Mapbox web map-load pricing, 50,000 free then $5 per 1,000: <https://www.mapbox.com/pricing/> and <https://docs.mapbox.com/mapbox-gl-js/guides/pricing/>
- deck.gl GlobeView limits, including heatmap and contour: <https://deck.gl/docs/api-reference/core/globe-view>
- deck.gl arcs on a globe: <https://deck.gl/docs/api-reference/layers/arc-layer>
- globe.gl MIT and layer list: <https://github.com/vasturiano/globe.gl> (`package.json` `"license": "MIT"`, depends on `three` and `three-globe`)
- three-globe MIT: <https://github.com/vasturiano/three-globe/blob/master/LICENSE>
- NASA GIBS overview, WMTS, acknowledgement text: <https://nasa-gibs.github.io/gibs-api-docs/> and <https://www.earthdata.nasa.gov/engage/open-data-services-software-policies/data-use-guidance>
- GIBS REST tile pattern: <https://nasa-gibs.github.io/gibs-api-docs/access-basics/>
- NASA Cesium examples and the note to use `GeographicTilingScheme` for EPSG:4326: <https://github.com/nasa-gibs/gibs-web-examples>
- Layer ids and the 500 m matrix `maximumLevel: 7`: <https://raw.githubusercontent.com/nasa-gibs/gibs-web-examples/main/examples/cesium/gibs-layers/demo.js>
- Checked from this machine on 2026-10-27, both `200 image/jpeg` with `Access-Control-Allow-Origin: *`:
  - `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/VIIRS_CityLights_2012/default/2012-01-01/500m/2/1/1.jpg`
  - `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_ShadedRelief_Bathymetry/default/2004-07-01/500m/2/1/1.jpg`

## 3. Techniques, ranked for this code

The night-atlas direction stays: background `#02050b`, globe base `#050b16`, severity colours already shared with the 2D key. New colour belongs on the imagery (city lights) and on those markers. A second accent palette would fight the shell that is already there.

1. **NASA night imagery, with the local pyramid as the first paint.** Highest impact, one provider and a CSP host. `VIIRS_CityLights_2012` matches the brand better than a brightness cut on a daytime painting. Blue Marble shaded relief is the right companion if someone switches the style to `natural`. Say "2012 VIIRS browse" in the credit. Do not say live imagery. Effort is a Cesium `WebMapTileServiceImageryProvider` on the geographic endpoint, `maximumLevel` 7, and a fallback when the provider errors. Risk is NASA latency and a hard dependency on one public host. The 476 KB local pyramid covers that gap.

2. **Crisp coastlines and a few names.** The border loader and the credit string already exist. Vendoring Natural Earth 1:110m land lines (public domain, simplified, not legal boundaries) turns `data-globe-border-lines` from `"0"` into a real layer. A short capital or admin-centroid list, drawn with the same screen-space budget as chokepoints, gives the globe the labels a terminal has. Effort is data plus a small label pass. Impact at regional zoom is immediate, including on top of GIBS.

3. **Retire the classroom overlays once the imagery is real.** Fade the 30° graticule out as the camera comes inside a few thousand kilometres. Remove the ion credit widget, since the token is already blank, and keep one Natural Earth or GIBS line. This is CSS and a few Cesium flags. It is what makes the Japan frame look finished instead of empty.

4. **Raised arcs for the graph that already exists.** `setGraph` draws geodesic polylines at width 2. A modest height and a glow material, in the existing steel and amber colours, is the Palantir-style link layer without a new engine. Only when the graph layer is on. Effort is local to that function.

5. **A gated pulse on high and critical markers.** The halo is already drawn. Motion wants a clock, and `requestRenderMode` will not animate unless something asks for frames. Pulse only while those markers are in view, and stop the clock when they are not. An always-on bloom stage (`scene.postProcessStages.bloom`) is cheaper to switch on than it is to art-direct, and it will tax the GPU on every frame. Leave bloom off unless a later pass measures it.

6. **Hex or heat density.** Useful when a region is crowded, and easy to make the map look like a game. Cesium can draw either as polygons or as a canvas. deck.gl's heatmap layer does not work on `GlobeView`, so this is not a reason to switch. Do it after the basemap is sharp, and keep it off at world zoom, where the attention policy already hides minor events.

7. **Fly-to.** Already eased, 0.7–2.2 seconds. Leave it.

8. **A self-hosted dark vector basemap (PMTiles or OpenFreeMap).** Best label quality in the survey. It wants MapLibre. A full planet does not fit a static Netlify site (OpenFreeMap's own host image is about 300 GB). A low-zoom extract is a later project, not the next PR.

9. **HDR, 3D buildings, photorealistic tiles, Mapbox, ion.** Each one is either a paid service, a browser token, or a non-commercial plan. They also pull the picture toward a satellite product. The night-atlas brief is a dark operational globe, not Google Earth.

## 4. Recommendation

Keep Cesium. Upgrade the imagery, vendor the borders the code already knows how to draw, and quiet the chrome. The adapter already has atmosphere, a terminator, stars, clustering, selection labels, screen-space chokepoint labels, eased flights, and an on-demand render loop. MapLibre would load less JavaScript and would label countries for free, and it would throw that work away. globe.gl would make prettier arcs and would replace the camera, the pick ids, and the 2D fallback. deck.gl's globe view still documents missing heatmap support and weak precision past zoom 12. Mapbox and Cesium ion are paid, and both want a credential in or behind the browser. Ion Community cannot carry a commercial deployment.

The production CSP decision stays a separate owner choice: allow `'unsafe-eval'` on the globe route, or vendor a Knockout-free Cesium widget build. None of the visual steps below require that decision for local proof. They do require it before a deployed user sees the globe at all.

### Phased plan

**PR 1. Night imagery, local fallback.** Add a GIBS `WebMapTileServiceImageryProvider` for `VIIRS_CityLights_2012` (geographic, 500 m matrix, max level 7) as the night basemap. Keep the Natural Earth TMS underneath or as the error fallback so the globe paints if NASA is slow or blocked. Credit it as 2012 VIIRS browse from NASA GIBS, not live imagery. Add `https://gibs.earthdata.nasa.gov` to `img-src` in `netlify.toml` and in the local preview CSP. Optional: Blue Marble shaded relief when the style is `natural`.

Risk: NASA availability and tile latency. A missing CSP host fails silently to a blank ellipsoid if the fallback is wired wrong. The layer is a 2012 composite; shipping it without the year would over-claim.

**PR 2. Borders and a few names.** Vendor Natural Earth 1:110m land boundaries into the path `globe-style.js` already fetches. Add a small public-domain label set (capitals or admin centroids) and draw it with the chokepoint screen-space budget. Keep the existing "simplified, not legal boundaries" credit.

Risk: label collision with the feed chrome and with markers. The budget code is the mitigation. A 1:10m file would be heavier than this globe needs.

**PR 3. Frame.** Fade the graticule with camera height. Drop the unused ion credit. Keep one attribution line. Do not restyle the workspace.

Risk: low. The credit widget is easy to hide and easy to hide too aggressively. The Natural Earth or GIBS line has to stay visible.

**PR 4. Links and marker motion.** Raise the existing graph polylines into short arcs in the current steel and amber. Add a pulse only for high and critical markers, scheduled so `requestRenderMode` stays idle when none are on screen.

Risk: a render loop that never stops will hurt the smoothness the owner asked for. Gate it, and check frame time on the Japan zoom with the cluster badge visible.

**PR 5. Stop, or measure one extra.** If the night imagery, borders, names, and arcs still feel thin, try bloom behind a flag and compare screenshots at world and regional zoom. A MapLibre spike belongs in a branch that does not replace `cesium-adapter.js` until that comparison is in front of the owner. Hex or heat density is a follow-on for crowded regions, off at world zoom.

Risk of PR 5: bloom and hex bins are how a serious globe starts to look like a template. The night palette and the severity key should stay the only saturated marks.

### What this does not approve

No Cesium ion token, no Mapbox token, no Protomaps hosted API key, no new paid plan, no second 3D engine in the page, and no claim that GIBS frames are current satellite pictures.
