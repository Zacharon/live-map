import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { landFeatureCollection, OFFLINE_BASEMAP_CREDIT } from "../src/map/offline-basemap.js";
import { validateMapView } from "../src/map/view-state.js";
import { CESIUM_BASE, CESIUM_VERSION } from "../src/map/cesium-adapter.js";
import { indexItemsByChokepoint, renderChokepointBriefList } from "../src/ui/chokepoint-brief.js";
import { STRATEGIC_CHOKEPOINTS } from "../src/data/strategic-chokepoints.js";

const land = landFeatureCollection();
assert.equal(land.type, "FeatureCollection");
assert.ok(land.features.length >= 8);
assert.match(OFFLINE_BASEMAP_CREDIT, /Offline dark basemap — simplified geography/);

const darkView = validateMapView({ basemap: "dark", lat: 26.5, lon: 56.3, zoom: 5 });
assert.equal(darkView.basemap, "dark");
assert.equal(validateMapView({ basemap: "local-earth" }).basemap, "local-earth");

assert.equal(CESIUM_VERSION, "1.145.0");
assert.equal(CESIUM_BASE, "./vendor/cesium/");
const indexJs = fs.readFileSync(path.join("vendor", "cesium", "index.js"), "utf8");
assert.match(indexJs, / as Viewer[,}]/);
const iifeHead = fs.readFileSync(path.join("vendor", "cesium", "Cesium.js")).subarray(0, 1200).toString("utf8");
assert.match(iifeHead, /var Cesium=\(\(\)=>/);

const empty = indexItemsByChokepoint(STRATEGIC_CHOKEPOINTS.filter((item) => item.id === "suez-canal"), [], [], []);
const html = renderChokepointBriefList(STRATEGIC_CHOKEPOINTS.filter((item) => item.id === "suez-canal"), [], empty, "suez-canal");
assert.match(html, /No matching records in loaded sources/);
assert.doesNotMatch(html, /\bSafe\b|\bNormal operations\b/);

const multi = [
  { id: "e1", title: "Notice A", occurredAt: "2026-06-01T00:00:00Z", sourceName: "Authority", synthetic: false },
  { id: "e1", title: "Notice A copy", occurredAt: "2026-06-01T00:00:00Z", sourceName: "Mirror", synthetic: false },
];
const corr = [
  { chokepointId: "suez-canal", eventId: "e1", relationship: "directly-references" },
  { chokepointId: "strait-of-hormuz", eventId: "e1", relationship: "possible-indirect-impact" },
];
const indexed = indexItemsByChokepoint(STRATEGIC_CHOKEPOINTS, multi, corr, []);
assert.equal(indexed.get("suez-canal").events.length, 1);
assert.equal(indexed.get("strait-of-hormuz").related.length, 1);

console.log("usability-dark-globe-tests: ok");
