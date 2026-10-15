# Watch design and build — local candidate

The current local checkout now has a larger map-first Watch workspace, an occurrence-based time browser, source-first report inspection, deliberate mobile Map/Reports views, and on-demand Weather, Sea, Air and Space explanations. The real Cesium/Leaflet engines and evidence workbench remain in use. This is local candidate evidence, not hosted or provider activation evidence.

## Open the result

- [Running synthetic preview](http://127.0.0.1:8770/?demo=foundation&mapMode=3d). Every report is an invented fixture.
- [Loaded public snapshots](http://127.0.0.1:8770/?mapMode=3d). Saved extracts are labeled historical; APIs deliberately return unavailable in this static preview.
- [Editable Figma file](https://www.figma.com/design/v7SdHELk5PqEF8r8a90Qai).
- [Desktop prototype](https://www.figma.com/proto/v7SdHELk5PqEF8r8a90Qai?node-id=6-16) and [mobile prototype](https://www.figma.com/proto/v7SdHELk5PqEF8r8a90Qai?node-id=6-348).

The preview uses `node scripts/preview-foundation.mjs 8770`. It is running on loopback only. The existing preview permits Cesium's eval-dependent initialization; production CSP was not changed and its readiness gate remains open.

## Research to implementation

Firecrawl retrieved public content and returned reference screenshots where available. Installed Edge supplied actual page observations. Access challenges and incomplete canvases were retained as limitations, not treated as rendered-product proof.

| Reference family | Useful pattern | Implemented decision |
| --- | --- | --- |
| [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view/), [Earth3D](https://earth3dmap.com/), [F4map](https://www.f4map.com/) | Geographic exploration; spatial context and deliberate controls | A larger real globe, restrained chrome, selection ring and return to camera context. No copied assets or engine replacement. |
| [Liveuamap](https://liveuamap.com/), [Citizen](https://citizen.com/), [CFR](https://www.cfr.org/global-conflict-tracker), [Military Summary](https://militarysummary.com/map), [DeepState](https://deepstatemap.live/en), [ACLED](https://acleddata.com/series/acled-conflict-index) | Geographic report feed, visible provenance, distinct event versus analytical context | Occurrence clock in the feed, supporting source near the inspector top, coverage disclosure and heuristic sections behind disclosures. Liveuamap browser access challenged; CFR map rendering incomplete. No territory or conflict data imported. |
| [Fincept repository](https://github.com/Fincept-Corporation/FinceptTerminal), [Fincept](https://fincept.in/) | Analytical depth with organized navigation | Watch / Passages / Open reports remain distinct; grouping, saved views and deeper evidence controls are progressively disclosed. Marketing page and terminal illustration were observed, not the running terminal. |
| [MarineTraffic](https://www.marinetraffic.com/en/ais/home/centerx:-12.0/centery:25.0/zoom:4), [VesselFinder](https://www.vesselfinder.com/), [Marine Vessel Traffic](https://www.marinevesseltraffic.com/), [MyShipTracking](https://www.myshiptracking.com/), [Flightradar24](https://www.flightradar24.com/51.47,0.46/6), [FlightAware](https://www.flightaware.com/) | Contacts, position time, nearby observations and reference infrastructure | Sea/Air lens opens the existing bounded contact roster. Delayed positions and ports/airports keep their distinct meanings. VesselFinder browser access returned Forbidden; no rendering claim for that page. No new AIS/ADS-B polling. |
| [SatelliteMap](https://satellitemap.space/), [Satmap](https://satmap.space/), [NOAA imagery](https://www.nesdis.noaa.gov/imagery/satellite-maps) | Orbital legend, model time and imagery playback context | Space guide distinguishes software proof, unloaded orbital elements and local basemap imagery. SatelliteMap controls observed but canvas incomplete; Satmap timed out. NOAA official text verified through web fallback. No live orbital/imagery feed. |
| [NWS](https://www.weather.gov/forecastmaps/), [WPC overview](https://www.wpc.ncep.noaa.gov/#page=ovw), [WPC chart](https://www.wpc.ncep.noaa.gov/NationalForecastChart/map.php), [Digital NWS](https://digital.weather.gov/), [AccuWeather](https://www.accuweather.com/en/us/national/weather-forecast-maps), [Weather.com](https://weather.com/maps/currentusweather), [Windy](https://www.windy.com/), [Earth Nullschool](https://earth.nullschool.net/) | Broadcast-style map key, valid time, field/model clarity and wind direction | Weather desk has a concise legend and validity panel. Current wind source links are available. Synthetic arrows switch to their actual 2D renderer and remain explicitly synthetic. Earth Nullschool's wind globe was observed. Several weather pages denied retrieval; their full visual layouts were not claimed as inspected. |

Current wind references were found and inspected; they are reference destinations, not Live Map's data providers. A continuous radar/forecast field, model-run timeline, approved wind adapter and related source-policy work are future implementation scope.

## Editable design and implementation correspondence

Figma contains seven native screens: desktop global exploration, selected report, historical window and Weather desk; mobile map, report feed and source inspector. Twelve navigation reactions connect the primary flows. Frames contain native text and reusable instances, not flattened UI screenshots.

The file includes a shared variable collection, primitive-to-semantic color aliases, scoped spacing/radius variables, five text styles, Default/Hover/Selected/Focus/Disabled/Loading control variants, reusable report cards, and Historical/Loading/Empty/Unavailable/Stale/Unknown coverage variants. UI groups use auto-layout; screen canvases position the map and panels deliberately. The running app uses system font fallbacks, so typography can differ slightly from Figma's Inter.

Only geography is a labeled raster reference captured from the local WebGL globe. The temporary capture hides the native map heading to avoid duplicating text. Figma cannot pan that geographic reference. Detail geography and sample clocks are illustrative; actual camera, source clocks and evidence come from the application. Use the running preview for map interaction, filters and export.

## Changed behavior and repair evidence

- `index.html` and the owned Watch portion of `map-workspace.css`: coherent tokens, larger text, calmer controls, explicit mobile views, source-first inspection and shorter-height reflow. Watch text uses rem sizes and honors reduced motion. The retained workbench CSS tail is preserved.
- `watch-workspace.js` and `event-filters.js`: time windows use occurrence, retain undated reports, enforce explicit historical upper/lower bounds and anchor saved extracts to available occurrence dates. The UI does not make a historical provider request.
- `view-state.js`: fresh visits choose 3D, while legacy saved URLs without an explicit mode retain 2D. Explicit modes remain serialized.
- `app-controller.js`: inspector teardown restores camera only, preserving newer lens/layer/time choices; mobile pane changes remove selection; Reset clears destination-dashboard queries, optional overlays and synthetic wind. Saved views restore the actual renderer and move an already-active Cesium camera as well as restoring stored map state. Hidden panes are inert; drawer Escape restores its trigger.
- `event-detail-drawer.js`: source, original link, occurrence and source revision precede heuristic context; unknowns and zero timestamps remain intact.
- `cesium-adapter.js`: the temporary capability probe now releases its WebGL context. Repeated probes previously could exhaust Chromium's active-context limit and evict the actual globe. Browser regression confirms 40 renders retain the same viewer and mobile selection stays in Cesium.

Exact before copies and hashes were captured before changes, including the adapter before its late lifetime repair. They are under [the task artifact folder](../artifacts/design-build-2026-09-30/). The baseline was the dirty local checkout, not HEAD. `state.js` and contact-roster logic were backed up but not edited. No commit, push, deployment, account change or provider activation occurred.

## Verification

Mechanical and semantic checks passed: required syntax/Cloudflare exports, offline platform suite, eight truth journeys, renderer/API suite, focused historical/probe tests, and offline handler/static/source-explorer smoke checks. Actual command exits are in [check results](../artifacts/design-build-2026-09-30/check-results.json) and [smoke results](../artifacts/design-build-2026-09-30/smoke-results.json).

Actual Edge screenshots cover 1440×900, 1280×800, 768×1024 and 390×844. [Main browser evidence](../artifacts/design-build-2026-09-30/browser-results.json) records 33 passing checks for map/feed/detail transitions, keyboard focus, historical range/reset, overlays, reduced motion, enlarged text and stable viewer identity. [Additional browser evidence](../artifacts/design-build-2026-09-30/extra-browser-results.json) records 11 passing checks for saved view/reload, existing-3D camera restoration, new-tab source action, downloaded JSON bytes, injected loading/unavailable/stale/historical-without-diagnostics states and forced WebGL fallback. All record zero exceptions and network failures. Injected provider states prove UI behavior only; the source navigation used a synthetic URL and proves navigation, not authentic source content.

[Native 200% browser zoom](../artifacts/design-build-2026-09-30/native-zoom-results.json) passed with `tabs.getZoom()` reporting 2, actual CSS width 708 and no horizontal page overflow. This uses a separate isolated Edge profile and a loopback-only QA extension, following [the Chrome Tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs). No personal browser settings changed. The separate 720×450 capture is only a reflow equivalent and is labeled accordingly.

The full offline validator **failed its browser secret scan** on two unrelated generated backup copies of Cesium. Both copies are byte-identical to the canonical vendor bundles, which contain the known public default token allowed by exact digest at the canonical path. No token bytes were printed, no backup was altered and no scanner rule was broadened. Other validator checks passed. This repository-wide result remains a reported limitation, not a green result.

Independent H3 reviewed the exact candidate delta, reran focused tests, identified and verified the selection/reset/ARIA/WebGL repairs, and reviewed browser artifacts. It did not independently drive those browser journeys. The local candidate verdict is VERIFIED; hosted CSP, provider rights/activation, production, native database recovery and owner visual acceptance remain separate.

## Evidence to review

- [Global map](../artifacts/design-build-2026-09-30/after-1440-global.png), [regional selection](../artifacts/design-build-2026-09-30/after-1440-selected.png).
- [Mobile map](../artifacts/design-build-2026-09-30/after-390-map.png), [reports](../artifacts/design-build-2026-09-30/after-390-feed.png), [selected source](../artifacts/design-build-2026-09-30/after-390-detail.png).
- [Visible supporting evidence](../artifacts/design-build-2026-09-30/after-source-evidence-visible.png), [Weather desk](../artifacts/design-build-2026-09-30/after-weather-desk.png), [wind proof](../artifacts/design-build-2026-09-30/after-weather-wind-proof.png).
- [Historical measurement dock](../artifacts/design-build-2026-09-30/after-historical-workbench.png), [evidence workbench](../artifacts/design-build-2026-09-30/after-evidence-workbench.png), [native zoom](../artifacts/design-build-2026-09-30/after-native-200-percent-zoom.png).

The existing delivery-preparation builder also produced a non-dispatched candidate packet and receipt in `40_Knowledge/Obsidian_Vault/09_TOOLS/agent_runner_v1/runs/2026-09-30_live-map-watch-design-candidate/`; its integrity recheck passed. It is preparation evidence, not release permission, and does not modify the vault project state or global queue.

To reverse this task, compare current hashes with the final candidate manifest, then restore only the declared file deltas from the before copies. Stop on any mismatch; do not restore the whole checkout or remove inherited dirty/untracked files. Cloud Figma edits remain a candidate for owner review and were not publicly shared.
