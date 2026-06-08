import assert from "node:assert/strict";
import { LAYER_CATALOG } from "../src/data/layers.js";
import { DASHBOARDS } from "../src/data/dashboards.js";
import { EXCHANGES } from "../src/data/exchanges.js";
import { computeCountryRiskScores, ciiLevel } from "../src/risk/country-risk.js";
import { validateAlertRule } from "../src/alerts/alert-rules.js";
import { escapeHtml } from "../src/events/event-normalizer.js";
import { distanceKm, correlateEventsToMarkets } from "../src/events/event-correlation.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("CII score boundaries map to expected levels", () => {
  assert.equal(ciiLevel(0).level, "stable");
  assert.equal(ciiLevel(20).level, "guarded");
  assert.equal(ciiLevel(40).level, "elevated");
  assert.equal(ciiLevel(60).level, "high");
  assert.equal(ciiLevel(100).level, "critical");
});

test("CII handles missing data with reduced confidence", () => {
  const scores = computeCountryRiskScores([], 1000);
  assert.ok(scores.length > 0);
  assert.ok(scores.every((score) => score.confidence <= 40));
  assert.ok(scores.every((score) => score.limitations.length > 0));
});

test("CII handles event data and keeps score in range", () => {
  const scores = computeCountryRiskScores([
    { id: "e1", country: "Japan", place: "Japan", category: "earthquake", severity: "critical", confidence: 95, occurredAt: Date.now(), updatedAt: Date.now(), sourceName: "USGS" },
  ]);
  const japan = scores.find((score) => score.countryCode === "JP");
  assert.ok(japan);
  assert.ok(japan.score >= 0 && japan.score <= 100);
  assert.ok(japan.confidence > 40);
});

test("Layer registry has at least 45 valid definitions", () => {
  assert.ok(LAYER_CATALOG.length >= 45);
  for (const layer of LAYER_CATALOG) {
    for (const key of ["id", "name", "category", "description", "dashboard", "sourceName", "sourceUrl", "sourceType", "refreshInterval", "credentialRequired", "enabled", "implemented", "status", "attribution", "legalNotes"]) {
      assert.ok(Object.hasOwn(layer, key), `${layer.id} missing ${key}`);
    }
  }
});

test("Five dashboard modes exist", () => {
  assert.deepEqual(DASHBOARDS.map((dashboard) => dashboard.id), ["primary", "finance", "technology", "commodity", "happy"]);
});

test("Exchange registry has 92 entries", () => {
  assert.equal(EXCHANGES.length, 92);
});

test("Alert validation rejects incomplete rules", () => {
  const result = validateAlertRule({ name: "x", conditions: null, cooldownMinutes: -1 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 2);
});

test("HTML escaping protects unsafe text", () => {
  assert.equal(escapeHtml("<script>alert('x')</script>"), "&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
});

test("Correlation distance and matching work", () => {
  const distance = distanceKm({ lat: 40.7, lon: -74 }, { lat: 40.75, lon: -73.98 });
  assert.ok(distance < 10);
  const correlations = correlateEventsToMarkets([
    { id: "event-1", title: "High severity event", severity: "high", lat: 40.7, lon: -74, occurredAt: Date.now() },
  ], [{ id: "xnys", name: "NYSE", coordinates: { lat: 40.7069, lon: -74.0113 } }]);
  assert.equal(correlations.length, 1);
  assert.match(correlations[0].explanation, /not evidence of causality/i);
});

console.log("All tests passed.");
