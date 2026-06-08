# Frontend Stability and CSP

## Vendored Frontend Assets

Live Map self-hosts its browser map libraries so production no longer depends on `unpkg.com`.

- Leaflet `1.9.4` from `leaflet@1.9.4`
- Leaflet MarkerCluster `1.5.3` from `leaflet.markercluster@1.5.3`

The vendored files live under `vendor/leaflet/` and `vendor/leaflet-markercluster/`. Leaflet image assets, README files, and license files are included. Production `sourceMappingURL` comments were removed from the vendored minified JavaScript because the matching source maps are not shipped. Library logic was not changed.

## Content Security Policy

The CSP in `netlify.toml` is intentionally explicit:

- `script-src 'self'`
- no `unsafe-eval`
- no wildcard source
- no `unpkg.com`
- tile image/connect sources are limited to the actual Esri, OpenStreetMap, and CARTO tile hosts used by the app
- provider `connect-src` entries include the implemented and planned official API hosts

`frame-src 'self' https://app.netlify.com` exists for the optional Netlify deploy-preview toolbar frame. It is separate from the map.

## Extension and Preview-Tooling Warnings

Repository tests search for `eval(`, `new Function(`, `setTimeout("`, and `setInterval("`. The app does not use those patterns. A console warning from `content.js` is therefore treated as extension or preview-tooling noise unless a future repository change introduces an eval-like pattern. Do not add an `unsafe-eval` CSP exception for that warning.

## Map Layout and Lifecycle

The app uses a stable desktop grid: left controls, center map, and right feed. The left panel and right event list scroll independently. The map controller owns map sizing through `ResizeObserver`, debounced `invalidateSize({ pan: false })`, window resize, orientation change, and 2D/3D mode transitions.

## Map Health

The map controller tracks requested tiles, loaded tiles, failed tiles, last successful tile time, last tile error time, and container size. If the active basemap becomes unavailable, the UI shows a small warning and offers switches to Dark Map or Street Map. Markers and feed data remain available.

