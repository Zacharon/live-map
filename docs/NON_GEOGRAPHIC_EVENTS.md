# Non-Geographic Events

Live Map supports events that belong in feeds and dashboards but should not appear on the map.

Non-geographic records use:

```js
{
  geographic: false,
  geometry: null,
  mapDisplayStatus: "not-mapped",
  nonGeographicReason: "software vulnerability with no verified incident location"
}
```

CISA KEV and NVD CVE records are non-geographic by default. Missing coordinates are not replaced with country centroids unless the source supports that approximation and the event is safe to generalize.
