import assert from "node:assert/strict";
import fs from "node:fs";
import { borderLines, clusterSpec, flightDuration, globeStyleFor, graticuleLines, markerSpec, severityRank, NATURAL_EARTH_BORDERS_URL } from "../src/map/globe-style.js";
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

// No ion token, keys or remote imagery in the adapter.
const adapter = fs.readFileSync("src/map/cesium-adapter.js", "utf8");
assert.match(adapter, /Ion\.defaultAccessToken = ""/);
assert.doesNotMatch(adapter, /https?:\/\/(?!127\.0\.0\.1)/);
assert.doesNotMatch(adapter, /IonImageryProvider|createWorldTerrain|createWorldImagery|BingMaps/);

console.log("globe-style-tests: ok");
