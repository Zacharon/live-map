# Natural Earth borders

`ne_110m_admin_0_boundary_lines_land.json` holds the country boundary lines drawn on the 3D globe.

- Source: Natural Earth 1:110m Cultural Vectors, "Admin 0 – Boundary Lines" (land), GeoJSON from `nvkelso/natural-earth-vector` (`geojson/ne_110m_admin_0_boundary_lines_land.geojson`, 340,010 bytes, SHA-256 `d42479fd79552cca4eec7f85fcdca717a790d29ff06be7676f1af0568c6d3f7c`), downloaded 2026-10-19.
- License: public domain. See https://www.naturalearthdata.com/about/terms-of-use/. The globe shows the credit "Borders: Natural Earth 1:110m (public domain), simplified, not legal boundaries" (`BORDER_CREDIT` in `src/map/globe-style.js`).
- Changes: kept only line geometry, rounded coordinates to 0.01°, dropped repeated points, and stored each line as a flat `[lon, lat, lon, lat, ...]` array under `lines` (the compact form `borderLines()` in `src/map/globe-style.js` reads).
- These are simplified display lines. They are not legal or precise boundaries.
