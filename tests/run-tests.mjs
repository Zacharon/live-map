import assert from "node:assert/strict";
import { LAYER_CATALOG } from "../src/data/layers.js";
import { DASHBOARDS } from "../src/data/dashboards.js";
import { EXCHANGES } from "../src/data/exchanges.js";
import { computeCountryRiskScores, ciiLevel } from "../src/risk/country-risk.js";
import { validateAlertRule } from "../src/alerts/alert-rules.js";
import { escapeHtml } from "../src/events/event-normalizer.js";
import { distanceKm, correlateEventsToMarkets } from "../src/events/event-correlation.js";
import { createNormalizedEvent, severityLabelFromScore, validateNormalizedEvent } from "../src/events/normalized-event.js";
import { arePotentialDuplicates, mergeDuplicateEvents } from "../src/events/event-deduplication.js";
import { normalizeUsgsFeature } from "../src/data/providers/usgs.js";
import { normalizeEonetEvent } from "../src/data/providers/eonet.js";
import { orchestrateProviders } from "../src/data/providers/orchestrator.js";
import { IMPLEMENTATION_STATUSES, MASTER_SOURCE_REGISTRY, SOURCE_ACCESS_CLASSIFICATIONS, SOURCE_DOMAINS, SOURCE_QUALITY_TIERS, VERIFICATION_STATES, filterSources, sourceRegistryStats, validateSourceRegistry } from "../src/sources/master-source-registry.js";
import { classifyProviderError, createAdapterResult, nextRefreshWithBackoff, sanitizeProviderError, shouldOpenCircuitBreaker } from "../src/sources/source-adapter-contract.js";

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

test("Normalized event model validates bounds and timestamps", () => {
  const result = createNormalizedEvent({
    provider: "test",
    title: "Validated event",
    category: "other",
    latitude: 10,
    longitude: 20,
    startedAt: "2026-06-08T00:00:00Z",
    severity: 120,
    confidence: 999,
    sourceName: "Official test source",
    sourceUrl: "https://example.com/event",
  });
  assert.equal(result.valid, true);
  assert.equal(result.event.severity, 100);
  assert.equal(result.event.confidence, 100);
  assert.equal(severityLabelFromScore(result.event.severity), "critical");
  assert.equal(validateNormalizedEvent({ ...result.event, latitude: 999 }).valid, false);
});

test("USGS normalization rejects invalid coordinates and maps severity", () => {
  const valid = normalizeUsgsFeature({
    id: "abc",
    properties: { mag: 6.2, time: Date.now(), updated: Date.now(), url: "https://earthquake.usgs.gov/earthquakes/eventpage/abc", place: "10 km S of Test" },
    geometry: { type: "Point", coordinates: [140, 35, 20] },
  });
  assert.ok(valid.event);
  assert.equal(valid.event.provider, "usgs");
  assert.ok(valid.event.severity >= 0 && valid.event.severity <= 100);
  const invalid = normalizeUsgsFeature({ id: "bad", properties: {}, geometry: { type: "Point", coordinates: [999, 999] } });
  assert.equal(invalid.event, null);
});

test("NASA EONET normalization handles polygon-like geometry", () => {
  const result = normalizeEonetEvent({
    id: "EONET_1",
    title: "Wildfire test",
    categories: [{ title: "Wildfires" }],
    geometry: [{ type: "Polygon", date: "2026-06-08T00:00:00Z", coordinates: [[[10, 20], [12, 22], [11, 21]]] }],
    sources: [{ id: "NASA", url: "https://eonet.gsfc.nasa.gov/" }],
  });
  assert.ok(result.event);
  assert.equal(result.event.category, "wildfire");
  assert.ok(result.event.latitude >= -90 && result.event.latitude <= 90);
});

test("Conservative deduplication merges exact provider duplicates only when defensible", () => {
  const base = createNormalizedEvent({
    provider: "usgs",
    providerEventId: "same",
    title: "M 5.0 earthquake near Test",
    category: "earthquake",
    latitude: 35,
    longitude: 140,
    startedAt: "2026-06-08T00:00:00Z",
    severity: 55,
    sourceName: "USGS",
    sourceUrl: "https://example.com/a",
  }).event;
  const duplicate = { ...base, id: "usgs:same-updated", severity: 65 };
  const nearbyDifferent = { ...base, id: "other", providerEventId: "other", title: "Wildfire near Test", category: "wildfire" };
  assert.equal(arePotentialDuplicates(base, duplicate), true);
  assert.equal(arePotentialDuplicates(base, nearbyDifferent), false);
  const merged = mergeDuplicateEvents([base, duplicate, nearbyDifferent]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].severity, 65);
});

test("Provider orchestration reports partial failure without dropping successful providers", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes("earthquake.usgs.gov")) {
      return new Response(
        JSON.stringify({
          features: [
            {
              id: "orchestrated",
              properties: { mag: 5, time: Date.now(), updated: Date.now(), url: "https://earthquake.usgs.gov/earthquakes/eventpage/orchestrated", place: "Test" },
              geometry: { type: "Point", coordinates: [100, 10, 5] },
            },
          ],
        }),
        { status: 200 }
      );
    }
    return new Response("unavailable", { status: 503 });
  };
  try {
    const result = await orchestrateProviders({ now: Date.now(), hours: 168 });
    assert.ok(result.events.length >= 1);
    assert.equal(result.sourceStatus.usgs.ok, true);
    assert.equal(result.sourceStatus.eonet.ok, false);
    assert.equal(result.systemStatus, "partial-data");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Master source registry schema and enums stay valid", () => {
  const validation = validateSourceRegistry();
  assert.deepEqual(validation.errors, []);
  assert.equal(validation.valid, true);
  assert.ok(MASTER_SOURCE_REGISTRY.length >= 80);
  assert.ok(SOURCE_ACCESS_CLASSIFICATIONS.includes("commercial-license"));
  assert.ok(IMPLEMENTATION_STATUSES.includes("authentication-required"));
  assert.ok(SOURCE_QUALITY_TIERS.includes("tier-5-discovery-only"));
  assert.ok(VERIFICATION_STATES.includes("retracted"));
  assert.ok(SOURCE_DOMAINS.includes("maritime"));
});

test("Master source registry protects licensing and implementation state", () => {
  const live = MASTER_SOURCE_REGISTRY.filter((source) => source.status === "live");
  assert.deepEqual(live.map((source) => source.adapterId).sort(), ["eonet", "usgs"]);
  assert.ok(live.every((source) => source.implemented && !source.legalReviewRequired));
  assert.ok(MASTER_SOURCE_REGISTRY.every((source) => source.accessMode !== "prohibited-or-unclear" || source.status === "disabled"));
  assert.ok(MASTER_SOURCE_REGISTRY.every((source) => source.status !== "link-only" || !source.implemented));
  assert.ok(MASTER_SOURCE_REGISTRY.every((source) => source.status !== "live" || source.commercialUse !== "unknown"));
  assert.ok(MASTER_SOURCE_REGISTRY.every((source) => source.status !== "live" || source.redistribution !== "unknown"));
});

test("Master source registry has attribution, HTTPS URLs, tiers, and domain coverage", () => {
  const ids = new Set();
  const urls = new Set();
  for (const source of MASTER_SOURCE_REGISTRY) {
    assert.ok(source.attribution);
    assert.match(source.sourceUrl, /^https:\/\//);
    assert.ok(source.sourceTier.startsWith("tier-"));
    assert.ok(source.sourceStatusPolicy.includes("surfaced"));
    assert.ok(source.cachePolicy.includes("server-side"));
    assert.ok(source.takedownPolicy.includes("takedown"));
    assert.equal(ids.has(source.id), false, `duplicate id ${source.id}`);
    assert.equal(urls.has(source.sourceUrl), false, `duplicate URL ${source.sourceUrl}`);
    ids.add(source.id);
    urls.add(source.sourceUrl);
    for (const envVar of source.environmentVariables) assert.match(envVar, /^[A-Z][A-Z0-9_]+$/);
  }
  const stats = sourceRegistryStats();
  for (const domain of ["conflicts-security", "natural-disasters", "weather", "major-news", "finance-markets", "technology-cyber", "commodities-supply-chain", "infrastructure", "aviation", "maritime", "humanitarian", "positive-developments"]) {
    assert.ok(stats.domains[domain] > 0, `${domain} missing`);
  }
  assert.ok(stats.openOrPublic > stats.live);
  assert.ok(stats.licensedOrCredentialed > 0);
  assert.ok(stats.linkOnlyOrDisabled > 0);
});

test("Source Explorer search and filters preserve useful source groups", () => {
  assert.ok(filterSources(undefined, { q: "weather" }).length >= 5);
  assert.ok(filterSources(undefined, { domain: "aviation" }).some((source) => source.name.includes("OpenSky")));
  assert.ok(filterSources(undefined, { accessMode: "commercial-license" }).every((source) => source.status === "license-required"));
  assert.ok(filterSources(undefined, { implemented: "true" }).every((source) => source.implemented));
  assert.ok(filterSources(undefined, { official: "true" }).every((source) => source.official));
});

test("Source adapter contract sanitizes errors and opens breakers safely", () => {
  const result = createAdapterResult({ providerId: "test", status: "partial", receivedCount: 3, acceptedCount: 2 });
  assert.equal(result.providerId, "test");
  assert.equal(result.status, "partial");
  assert.equal(classifyProviderError("HTTP 401 token=abc123 user=test@example.com"), "authentication-required");
  assert.equal(sanitizeProviderError("Bearer abc.def.ghi api_key=secret user=test@example.com").includes("secret"), false);
  assert.equal(shouldOpenCircuitBreaker({ consecutiveFailures: 3, lastStatus: "provider-unavailable" }), true);
  assert.equal(shouldOpenCircuitBreaker({ consecutiveFailures: 0, accessMode: "commercial-license", legalReviewRequired: true }), true);
  assert.ok(nextRefreshWithBackoff({ now: 1000, baseRefreshMs: 1000, consecutiveFailures: 2 }) > 1000);
});

console.log("All tests passed.");
