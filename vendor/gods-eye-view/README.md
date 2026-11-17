# gods-eye-view attribution

Upstream: https://github.com/bilawalsidhu/gods-eye-view

Reviewed revision: `759652207fd1279ece97f0f19af566feb9a82146` (2026-09-09).

Copyright (c) 2026 Bilawal Sidhu. Source code is MIT licensed; the full upstream license and its third-party exclusions are retained in `LICENSE`.

`src/map/contact-orientation.js` adapts `stabilizeScreenRotation` from upstream `src/data/iconOrientation.js`. The default constant is expressed without Cesium. Only heading stabilization is reused; no 3D projection, movement prediction, or datasets are imported.

`src/map/contact-roster.js` and the controller's inspect/return interaction are original Leaflet implementations inspired by upstream's nearby contacts and context restoration UX. They filter already fetched observations within the current viewport and 250 km of its center; they do not load a global fleet or claim complete coverage.
