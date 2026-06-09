# Country Navigation

Live Map supports country selection across the map, event feed, country scores, and URL state.

## URL state

The `country` query parameter stores an ISO 2 or ISO 3 country code:

```text
/?country=UKR
/countries?country=UKR
```

When a country is selected, the map filters visible events to that country, shows the country summary panel, and updates links to the country scores page.

## Map layer

The Phase 2D country layer uses public seed metadata from `src/data/countries.js` with country centroids and simplified rectangular bounds. It is intended as a selectable navigation layer, not a precise legal boundary layer.

Future work may replace rectangular bounds with reviewed open boundary polygons such as Natural Earth or geoBoundaries, with attribution and validation added at the same time.

## Event country matching

Events are matched by explicit country fields, ISO codes, provider metadata, and conservative place/name aliases. Non-geographic records remain non-geographic and are not forced onto a country merely to create a marker.
