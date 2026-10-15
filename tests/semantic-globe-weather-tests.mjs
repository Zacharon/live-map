import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { bandFromZoom, autoRenderer, leafletZoomFromMetersPerPixel, metersPerPixelFromCamera, metersPerPixelFromLeafletZoom, cameraHeightFromLeafletZoom } from "../src/map/semantic-bands.js";
import { readMapView, writeMapView, validateMapView } from "../src/map/view-state.js";
import { sampleWind, validateWindField, meteorologicalToFromDirection } from "../src/map/wind-field.js";
import { SHIPPING_DENSITY_META, paintOceanFromPortTotals, validateDensityGrid, PORTWATCH_META, activityLabel, densityLabel } from "../src/data/maritime-overlays.js";
import { portwatchQueryUrl, normalizePortwatchFeature, fetchPortwatchChokepoint } from "../src/data/providers/portwatch.js";
import { LAYER_ACCESS, scheduledFetchAllowed } from "../src/map/layer-access.js";
import { catalogId, elementIsStale, parseOmmRecords, shouldFetchElements, exaggerationDisclosure, propagateEstimate, SATELLITE_CACHE_MS } from "../src/orbital/satellite-proof.js";
import { CESIUM_VERSION, CESIUM_LICENSE, globeEventEligible } from "../src/map/cesium-adapter.js";
import { windVector } from "../src/map/wind-proof.js";

{
  assert.equal(bandFromZoom(8), "local");
  assert.equal(bandFromZoom(5), "regional");
  assert.equal(bandFromZoom(3), "weather-atmosphere");
  assert.equal(bandFromZoom(1), "orbital");
  assert.equal(bandFromZoom(3.2, "weather-atmosphere"), "weather-atmosphere");
  assert.equal(autoRenderer(2, { webgl: true, previous: "leaflet" }), "cesium");
  assert.equal(autoRenderer(6, { webgl: true, previous: "cesium" }), "leaflet");
  assert.equal(autoRenderer(2, { webgl: false }), "leaflet");
  const mpp = metersPerPixelFromLeafletZoom(4, 0);
  const z = leafletZoomFromMetersPerPixel(mpp, 0);
  assert.ok(Math.abs(z - 4) < 1e-6);
  const height = cameraHeightFromLeafletZoom(3, { latitude: 26, viewportWidthPx: 1280 });
  const back = metersPerPixelFromCamera({ heightMeters: height, latitude: 26, viewportWidthPx: 1280 });
  assert.ok(Math.abs(back - metersPerPixelFromLeafletZoom(3, 26)) / back < 0.15);
  const mobileHeight = cameraHeightFromLeafletZoom(5, { latitude: 26, viewportWidthPx: 390 });
  const mobileBack = metersPerPixelFromCamera({ heightMeters: mobileHeight, latitude: 26, viewportWidthPx: 390 });
  assert.ok(Math.abs(leafletZoomFromMetersPerPixel(mobileBack, 26) - 5) < 1e-6);
}

{
  const view = validateMapView({ lat: 0, lon: 179, zoom: 8, aircraft: true, vessels: true, ports: true, viewportOnly: true, verification: "supported", mapMode: "auto", graph: true });
  const params = new URLSearchParams();
  writeMapView(params, view);
  const roundTrip = readMapView(params);
  assert.equal(roundTrip.mapMode, "auto");
  assert.equal(roundTrip.graph, true);
  assert.equal(roundTrip.lon, 179);
  assert.equal(readMapView(new URLSearchParams("zoom=oops&lat=999")).lat, 85);
  assert.equal(readMapView(new URLSearchParams("mapState=1&lat=0&lon=0&zoom=2")).mapMode, "2d");
}

{
  const field = JSON.parse(readFileSync(new URL("../data/development-fixtures/gfs-10m-recorded-sample.json", import.meta.url), "utf8"));
  assert.equal(validateWindField(field).valid, true);
  assert.equal(field.live, false);
  assert.equal(field.cache, "recorded-gfs-development");
  assert.notEqual(field.cache, "synthetic");
  const sample = sampleWind(field, 26, 56);
  assert.equal(sample.nodata, false);
  assert.equal(sample.level, "10 m AGL");
  assert.ok(Number.isFinite(sample.fromDeg));
  const masked = sampleWind(field, 32, 48);
  assert.equal(masked.nodata, true);
  assert.equal(meteorologicalToFromDirection(0, 10), 180);
  assert.deepEqual(windVector(0, 0), { u: 12, v: 0 });
}

{
  assert.equal(SHIPPING_DENSITY_META.live, false);
  assert.match(densityLabel(), /SYNTHETIC FORMAT FIXTURE — NOT SOURCE MEASUREMENTS/);
  assert.equal(paintOceanFromPortTotals().allowed, false);
  assert.equal(validateDensityGrid({ live: true, observationPeriod: SHIPPING_DENSITY_META.observationPeriod }).valid, false);
  assert.equal(validateDensityGrid({ category: "oil-and-gas", interpretedAs: "tanker-lng", observationPeriod: SHIPPING_DENSITY_META.observationPeriod }).valid, false);
  assert.match(activityLabel({ locationName: "chokepoint6", vintage: "2026-06-10", unit: "estimated-transit-calls" }), /SYNTHETIC FORMAT FIXTURE — NOT SOURCE MEASUREMENTS/);
  assert.match(portwatchQueryUrl("chokepoint6"), /Daily_Chokepoints_Data/);
  assert.equal(normalizePortwatchFeature({ attributes: { portid: "chokepoint6", n_total: 12, date: "2026-06-01" } }).live, false);
  const gated = await fetchPortwatchChokepoint("chokepoint6");
  assert.equal(gated.status, "configuration-required");
  assert.ok(PORTWATCH_META.publicationCadence.includes("Tuesday"));
}

{
  assert.ok(!scheduledFetchAllowed(LAYER_ACCESS[0], { enabled: false, visible: true }));
  assert.ok(!scheduledFetchAllowed(LAYER_ACCESS[0], { enabled: true, visible: false }));
  assert.ok(!scheduledFetchAllowed(LAYER_ACCESS[0], { enabled: true, visible: true, hiddenDocument: true }));
}

{
  assert.equal(catalogId({ NORAD_CAT_ID: 25544 }), "25544");
  assert.equal(catalogId({ NORAD_CAT_ID: 123456 }), "123456");
  assert.equal(elementIsStale({ EPOCH: "2000-01-01T00:00:00Z" }, Date.parse("2026-09-15T00:00:00Z")), true);
  const parsed = parseOmmRecords([{ NORAD_CAT_ID: 987654, OBJECT_NAME: "TEST", EPOCH: "2026-09-15T00:00:00Z" }]);
  assert.equal(parsed[0].id, "987654");
  assert.equal(shouldFetchElements(1000, 0), true);
  assert.equal(shouldFetchElements(SATELLITE_CACHE_MS - 1, 1), false);
  assert.equal(shouldFetchElements(SATELLITE_CACHE_MS + 2, 1), true);
  const sat = {
    gstime: () => 0,
    propagate: () => ({ position: { x: 7000, y: 0, z: 0 } }),
    eciToGeodetic: () => ({ latitude: 0.1, longitude: 0.2, height: 420 }),
    degreesLat: (v) => v * 180 / Math.PI,
    degreesLong: (v) => v * 180 / Math.PI,
  };
  const pos = propagateEstimate({}, new Date("2026-09-15T00:00:00Z"), sat);
  assert.equal(pos.liveObservation, false);
  assert.equal(pos.altitudeMeters, 420000);
  assert.equal(exaggerationDisclosure(1200, 420).exaggerated, true);
  assert.equal(CESIUM_LICENSE, "Apache-2.0");
  assert.equal(CESIUM_VERSION, "1.145.0");
  assert.equal(globeEventEligible({ id: "zero", lat: 0, lon: 0 }), true);
  assert.equal(globeEventEligible({ id: "non-geographic", geographic: false, lat: 0, lon: 0 }), false);
  assert.equal(globeEventEligible({ id: "missing", lat: null, lon: 0 }), false);
  assert.equal(globeEventEligible({ id: "invalid", lat: 91, lon: 0 }), false);
}

console.log("Semantic globe / weather / maritime / orbital unit tests passed.");
