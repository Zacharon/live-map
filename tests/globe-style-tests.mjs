import assert from "node:assert/strict";
import fs from "node:fs";
import { borderLines, clusterSpec, flightDuration, globeStyleFor, graticuleLines, markerSpec, severityRank, NATURAL_EARTH_BORDERS_URL, GLOBE_STYLES, GLOBE_TILE_LOADING, naturalEarthIiTilePaths, naturalEarthTileKey } from "../src/map/globe-style.js";
import { SEVERITIES } from "../src/config.js";

// Style selection: night atlas by default, natural only on request.
assert.equal(globeStyleFor({}), "night");
assert.equal(globeStyleFor({ basemap: "local-earth" }), "night");
assert.equal(globeStyleFor({ basemap: "natural" }), "natural");
assert.equal(globeStyleFor({ globeStyle: "natural", basemap: "dark" }), "natural");
assert.equal(globeStyleFor({ globeStyle: "bogus" }), "night");

// Marker grammar: category core, severity ring, size grows with severity, halo only for high+/selected.
const low = markerSpec({ severity: "low", taxonomyColor: "#112233" });
const high = markerSpec({ severity: "high", taxonomyColor: "#112233" });
const critical = markerSpec({ severity: "critical", taxonomyColor: "#112233" });
const selected = markerSpec({ severity: "low", taxonomyColor: "#112233" }, true);
assert.equal(low.fill, "#112233");
assert.equal(low.ring, SEVERITIES.low.color);
assert.equal(critical.ring, SEVERITIES.critical.color);
assert.ok(low.core < high.core && high.core < critical.core);
assert.equal(low.halo, false);
assert.equal(high.halo, true);
assert.equal(selected.halo, true);
assert.ok(selected.size > critical.size - 1);
assert.notEqual(low.key, selected.key);
assert.equal(markerSpec({ severity: "high", recordKind: "lead" }).alpha, 0.5);
assert.equal(markerSpec({ severity: "unknown-value" }).ring, SEVERITIES.low.color);
assert.equal(severityRank("nonsense"), 0);

// Cluster badge reflects the most severe member, never an average.
const cluster = clusterSpec(["low", "medium", "critical", "low"]);
assert.equal(cluster.count, 4);
assert.equal(cluster.severity, "critical");
assert.equal(cluster.ring, SEVERITIES.critical.color);
assert.equal(clusterSpec(new Array(120).fill("low")).label, "99+");

// Graticule: 12 meridians + 5 parallels incl. the equator, all coordinates in range.
const lines = graticuleLines(30);
assert.equal(lines.filter((l) => l.kind === "meridian").length, 12);
assert.equal(lines.filter((l) => l.kind === "equator").length, 1);
assert.equal(lines.length, 17);
assert.ok(lines.every((l) => l.points.every(([lon, lat]) => Math.abs(lon) <= 180 && Math.abs(lat) <= 90)));

// Borders: GeoJSON and compact forms; invalid coordinates are dropped, never invented.
assert.deepEqual(borderLines(null), []);
assert.deepEqual(borderLines({ features: [{ geometry: { type: "LineString", coordinates: [[0, 0], [1, 1], [500, 1]] } }] }), [[[0, 0], [1, 1]]]);
assert.equal(borderLines({ features: [{ geometry: { type: "MultiLineString", coordinates: [[[0, 0], [1, 1]], [[2, 2]]] } }] }).length, 1);
assert.deepEqual(borderLines({ lines: [[0, 0, 1, 1], [0, 0, 1], ["x", 0, 1, 1]] }), [[[0, 0], [1, 1]]]);
assert.match(NATURAL_EARTH_BORDERS_URL, /^\.\/vendor\/natural-earth\//);

// Flights are bounded so selection stays responsive.
assert.equal(flightDuration(null, { lat: 0, lon: 0 }), 1.2);
assert.equal(flightDuration({ lat: 0, lon: 0 }, { lat: 0, lon: 0 }), 0.7);
assert.equal(flightDuration({ lat: 0, lon: -170 }, { lat: 0, lon: 10 }), 2.2);

// Missing tiles should read as graded ocean, not a black hole.
const nightRgb = Number.parseInt(GLOBE_STYLES.night.baseColor.slice(1), 16);
const nightRed = (nightRgb >> 16) & 255;
const nightGreen = (nightRgb >> 8) & 255;
const nightBlue = nightRgb & 255;
assert.notEqual(GLOBE_STYLES.night.baseColor.toLowerCase(), "#050b16");
assert.notEqual(GLOBE_STYLES.night.baseColor.toLowerCase(), "#000000");
assert.ok(nightBlue > nightRed && nightBlue > nightGreen);
assert.ok(nightRed < 40 && nightGreen < 80 && nightBlue < 100);
assert.equal(GLOBE_STYLES.night.background, "#02050b");
assert.equal(GLOBE_TILE_LOADING.preloadAncestors, true);
assert.equal(GLOBE_TILE_LOADING.preloadSiblings, false);
assert.equal(GLOBE_TILE_LOADING.pyramidMaximumLevel, 2);
assert.ok(GLOBE_TILE_LOADING.tileCacheSize >= 300 && GLOBE_TILE_LOADING.tileCacheSize <= 1000);
assert.equal(GLOBE_TILE_LOADING.maximumScreenSpaceError, 4);
assert.equal(GLOBE_TILE_LOADING.loadingDescendantLimit, 20);

// The vendored pyramid is 42 JPEGs, levels 0-2, and the cache key flips Cesium's north-origin y.
const tilePaths = naturalEarthIiTilePaths();
assert.equal(tilePaths.length, 42);
assert.equal(tilePaths[0], "0/0/0.jpg");
assert.equal(tilePaths.filter((item) => item.startsWith("2/")).length, 32);
assert.equal(naturalEarthTileKey(0, 1, 0, 1), "0/1/0");
assert.equal(naturalEarthTileKey(1, 3, 0, 2), "1/3/1");
const tileRoot = "vendor/cesium/Assets/Textures/NaturalEarthII";
const onDisk = fs.readdirSync(tileRoot, { recursive: true })
  .map((name) => String(name).replaceAll("\\", "/"))
  .filter((name) => name.endsWith(".jpg"))
  .sort();
assert.deepEqual(onDisk, [...tilePaths].sort());

// No ion token, keys or remote imagery in the adapter.
const adapter = fs.readFileSync("src/map/cesium-adapter.js", "utf8");
assert.match(adapter, /Ion\.defaultAccessToken = ""/);
assert.match(adapter, /GLOBE_TILE_LOADING/);
assert.match(adapter, /warmNaturalEarthPyramid/);
assert.match(adapter, /naturalEarthTileKey/);
assert.match(adapter, /tileLoadProgressEvent/);
assert.match(adapter, /preloadSiblings/);
assert.doesNotMatch(adapter, /addImageryProvider/);
assert.doesNotMatch(adapter, /fog\.enabled = false/);
assert.doesNotMatch(adapter, /imageryLayers\.remove/);
assert.doesNotMatch(adapter, /https?:\/\/(?!127\.0\.0\.1)/);
assert.doesNotMatch(adapter, /IonImageryProvider|createWorldTerrain|createWorldImagery|BingMaps/);

console.log("globe-style-tests: ok");
