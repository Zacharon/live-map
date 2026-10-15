# God's Eye View reuse

Reviewed 2026-09-09 at upstream revision `759652207fd1279ece97f0f19af566feb9a82146`.

## Integrated in this milestone

- Nearby aircraft/vessel contact roster: nearest 30 within 250 km and the visible viewport, drawn only from already fetched, bounded observations.
- Click a contact or marker to center it, inspect source/time/heading, and show up to 20 recorded track samples. Return to previous view restores the entry camera center and zoom. No following or inferred positions.
- Distinct north-facing SVG aircraft and vessel silhouettes with heading rotation; upstream's wrapped-angle stabilization prevents sub-degree jitter across 0/360 degrees.
- MIT license and pinned provenance retained under `vendor/gods-eye-view`. No runtime dependency or build step added.

## Feature transfer map

| Upstream feature | Live Map treatment |
| --- | --- |
| Contacts + context return | Implemented above on Leaflet |
| Composable layers, saved/shareable view | Implemented in the foundation, with existing Live Map filters and URL contracts |
| Aircraft and AIS tracks | Existing server adapters remain opt-in; UI proved with clearly synthetic observations |
| Earthquakes and fires | Existing Live Map event adapters and source statuses retained |
| Satellite catalog/orbits | Future separate layer: orbit positions must be labeled calculated from dated orbital elements; source review and budget needed |
| Launch timelines | Future separate adapter; preserve scheduled/actual/reconstructed distinctions |
| 3D cities, cockpit, shaders | Not ported: conflicts with this milestone's retained Leaflet/static architecture and may require licensed imagery |
| CCTV, traffic, radio, bike share | Not activated; individual licenses, coverage/privacy, retention and source adapters need review |
| Submarine cables | Not imported: upstream specifies CC BY-NC-SA 3.0; commercial permission cannot be inferred from MIT |
| Datacenters/dams | Not imported: upstream specifies ODbL attribution/share-alike obligations for data |
| Voice agent | Not imported; adds paid API and credential requirements |

Source code permission does not activate provider access. This work does not add keys, buy services, provision hosting, or publish the app.

Sources: [upstream license](https://github.com/bilawalsidhu/gods-eye-view/blob/759652207fd1279ece97f0f19af566feb9a82146/LICENSE), [data sources](https://github.com/bilawalsidhu/gods-eye-view/blob/759652207fd1279ece97f0f19af566feb9a82146/DATA_SOURCES.md), [orientation helper](https://github.com/bilawalsidhu/gods-eye-view/blob/759652207fd1279ece97f0f19af566feb9a82146/src/data/iconOrientation.js).
