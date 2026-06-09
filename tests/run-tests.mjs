import assert from "node:assert/strict";
import fs from "node:fs";
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
import { normalizeNwsAlert, nwsSeverityScore, representativeNwsPoint } from "../src/data/providers/nws.js";
import { createMemoryProviderCache } from "../src/data/providers/cache.js";
import { PROVIDER_SOURCE_REGISTRY, providersForDomain, DOMAIN_SOURCE_STATUS } from "../src/data/providers/source-registry.js";
import { classifyEvent, domainOptions, TAXONOMY_REGISTRY } from "../src/events/taxonomy.js";
import { sortEvents, groupEvents } from "../src/events/feed-organization.js";
import { shouldCluster, buildIncidents } from "../src/events/incident-clustering.js";
import { computeQualityDimensions, normalizeVerificationStatus } from "../src/events/event-quality.js";
import { providerState } from "../src/ui/provider-health-panel.js";
import { serializeView } from "../src/ui/saved-views.js";
import sourcesFunction from "../netlify/functions/sources.mjs";
import { validateProviderSourceLinks } from "../src/sources/provider-source-links.js";

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
  assert.deepEqual(live.map((source) => source.adapterId).sort(), ["eonet", "nws-alerts", "usgs"]);
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
  for (const domain of ["conflict-security", "natural-disaster", "weather", "major-news", "finance-markets", "technology-cyber", "commodity-supply-chain", "infrastructure", "aviation", "maritime", "humanitarian", "positive-development", "health", "geospatial-reference"]) {
    assert.ok(stats.domains[domain] > 0, `${domain} missing`);
  }
  assert.ok(stats.openOrPublic > stats.live);
  assert.ok(stats.licensedOrCredentialed > 0);
  assert.ok(stats.linkOnlyOrDisabled > 0);
});

test("Source Explorer search and filters preserve useful source groups", () => {
  assert.ok(filterSources(undefined, { q: "weather" }).length >= 5);
  assert.ok(filterSources(undefined, { domain: "aviation" }).some((source) => source.name.includes("OpenSky")));
  assert.ok(filterSources(undefined, { domain: "geospatial-reference" }).length >= 1);
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

test("Runtime providers map to master source registry entries", () => {
  const validation = validateProviderSourceLinks();
  assert.deepEqual(validation.errors, []);
  assert.equal(validation.valid, true);
  for (const provider of PROVIDER_SOURCE_REGISTRY.filter((item) => item.implemented)) {
    assert.ok(provider.sourceRegistryId, `${provider.id} needs sourceRegistryId`);
  }
});

test("Source API returns JSON envelope, filters, and invalid source warnings", async () => {
  const response = await sourcesFunction(new Request("https://liveworldmap.netlify.app/api/sources?domain=aviation&access=open-api&status=planned"));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /json/);
  const body = await response.json();
  assert.equal(body.data.registryVersion, "1");
  assert.ok(body.data.statistics.total >= 80);
  assert.ok(body.data.sources.every((source) => source.domain === "aviation" && source.accessMode === "open-api" && source.status === "planned"));

  const invalid = await sourcesFunction(new Request("https://liveworldmap.netlify.app/api/sources?source=does-not-exist"));
  const invalidBody = await invalid.json();
  assert.equal(invalidBody.data.selectedSource, null);
  assert.ok(invalidBody.warnings.some((warning) => warning.includes("Unknown source id")));
});

test("Source Explorer markup supports routing, fallback state, and escaping-safe controls", () => {
  const html = fs.readFileSync(new URL("../source-explorer.html", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../src/source-explorer-app.js", import.meta.url), "utf8");
  const netlifyConfig = fs.readFileSync(new URL("../netlify.toml", import.meta.url), "utf8");
  assert.match(netlifyConfig, /from = "\/api\/sources"[\s\S]*to = "\/\.netlify\/functions\/sources"/);
  assert.match(netlifyConfig, /from = "\/sources"[\s\S]*to = "\/source-explorer\.html"/);
  assert.match(html, /role="listbox"/);
  assert.match(html, /id="sourceExplorerStatus"/);
  assert.match(html, /id="sourceRetry"/);
  assert.match(app, /popstate/);
  assert.match(app, /encodeURIComponent|URLSearchParams/);
  assert.match(app, /escapeHtml/);
  assert.match(app, /local source registry fallback/i);
});

test("Taxonomy maps provider categories and preserves unknowns safely", () => {
  assert.ok(TAXONOMY_REGISTRY.length > 40);
  assert.equal(classifyEvent({ category: "earthquake" }).domain, "natural-disaster");
  assert.equal(classifyEvent({ category: "storm" }).domain, "weather");
  assert.equal(classifyEvent({ category: "very-strange-provider-value" }).domain, "other");
  assert.ok(domainOptions().some((domain) => domain.id === "technology-cyber"));
});

test("Sort modes preserve time-field meaning and stable tie-breaking", () => {
  const events = [
    { id: "b", occurredAt: 1000, firstReportedAt: 5000, updatedAt: 2000, severityScore: 20, confidence: 50, country: "Zulu" },
    { id: "a", occurredAt: 3000, firstReportedAt: 1000, updatedAt: 4000, severityScore: 90, confidence: 80, country: "Alpha" },
  ];
  assert.equal(sortEvents(events, "newest-occurred")[0].id, "a");
  assert.equal(sortEvents(events, "newest-reported")[0].id, "b");
  assert.equal(sortEvents(events, "recently-updated")[0].id, "a");
  assert.equal(sortEvents(events, "country")[0].id, "a");
});

test("Grouping builds collapsible feed groups with stats", () => {
  const groups = groupEvents([
    { id: "1", domain: "natural-disaster", domainLabel: "Natural Disasters", severity: "high", updatedAt: Date.now(), provider: "usgs" },
    { id: "2", domain: "weather", domainLabel: "Weather", severity: "low", updatedAt: Date.now(), provider: "eonet" },
  ], "domain", { eonet: { ok: false } });
  assert.equal(groups.length, 2);
  assert.equal(groups.find((group) => group.id === "weather").stats.providerWarning, true);
});

test("Quality dimensions remain separate", () => {
  const quality = computeQualityDimensions({ severityScore: 80, confidence: 66, updatedAt: Date.now(), independentSourceCount: 2, verificationStatus: "Provider reviewed" });
  assert.equal(quality.severity, 80);
  assert.equal(quality.confidence, 66);
  assert.ok(quality.impactScore >= 0 && quality.impactScore <= 100);
  assert.equal(normalizeVerificationStatus("Provider reviewed"), "primary-confirmed");
});

test("Provider health state conversion is explicit", () => {
  assert.equal(providerState({ ok: true, status: "healthy" }), "operational");
  assert.equal(providerState({ ok: true, stale: true }), "stale");
  assert.equal(providerState({ ok: false, message: "Rate limit" }), "rate-limited");
  assert.equal(providerState({ ok: false, message: "Authentication required" }), "authentication-required");
});

test("Incident clustering prefers strong matches", () => {
  const base = { id: "1", title: "Earthquake near Tokyo", type: "earthquake", domain: "natural-disaster", lat: 35, lon: 140, occurredAt: Date.now(), updatedAt: Date.now(), provider: "usgs", country: "Japan" };
  const related = { ...base, id: "2", title: "Tokyo earthquake update", lat: 35.1, lon: 140.1 };
  const unrelated = { ...base, id: "3", title: "Wildfire in Canada", type: "wildfire", lat: 60, lon: -110, country: "Canada" };
  assert.equal(shouldCluster(base, related), true);
  assert.equal(shouldCluster(base, unrelated), false);
  assert.equal(buildIncidents([base, related, unrelated]).length, 2);
});

test("Saved view serialization captures shareable feed state", () => {
  const view = serializeView(
    { dashboard: "primary", sort: "recently-updated", groupBy: "domain", cardMode: "compact", hours: 168 },
    { domains: new Set(["natural-disaster"]), categories: new Set(["earthquake"]), severities: new Set(["high"]), query: "japan" },
    "Japan hazards"
  );
  assert.equal(view.name, "Japan hazards");
  assert.deepEqual(view.domains, ["natural-disaster"]);
  assert.equal(view.query, "japan");
});

test("CSP is explicit and production assets are same-origin", () => {
  const netlifyConfig = fs.readFileSync(new URL("../netlify.toml", import.meta.url), "utf8");
  const csp = netlifyConfig.match(/Content-Security-Policy = "([^"]+)"/)?.[1] || "";
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(csp, /script-src 'self'/);
  assert.doesNotMatch(csp, /unsafe-eval|\*/);
  assert.doesNotMatch(csp, /unpkg\.com/);
  assert.doesNotMatch(html, /unpkg\.com/);
  assert.match(html, /vendor\/leaflet\/leaflet\.js/);
  assert.match(html, /vendor\/leaflet-markercluster\/leaflet\.markercluster\.js/);
});

test("Repository browser code does not use eval-like patterns", () => {
  const files = ["app.js", "src/app-controller.js", "src/map/map-controller.js", "src/events/event-normalizer.js"];
  const combined = files.map((file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8")).join("\n");
  assert.doesNotMatch(combined, /eval\s*\(|new Function\s*\(|setTimeout\s*\(\s*["']|setInterval\s*\(\s*["']/);
});

test("Layout CSS declares stable map and independently scrolling panels", () => {
  const css = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(css, /\.app-shell\{position:fixed;inset:0;height:100dvh/);
  assert.match(css, /grid-template-areas:"top top top" "side map events"/);
  assert.match(css, /\.left-panel\{overflow-y:auto/);
  assert.match(css, /\.right-panel\{overflow:hidden/);
  assert.match(css, /\.map-stage #map,.globe-stage\{grid-area:1\/1;min-width:0;min-height:360px/);
  assert.match(css, /\.globe-stage\[hidden\]\{display:none!important\}/);
});

test("NWS severity and polygon normalization map to weather taxonomy", () => {
  const feature = {
    id: "https://api.weather.gov/alerts/urn:oid:test",
    geometry: { type: "Polygon", coordinates: [[[-90, 40], [-89, 40], [-89, 41], [-90, 41], [-90, 40]]] },
    properties: {
      id: "urn:oid:test",
      event: "Severe Thunderstorm Warning",
      headline: "Severe Thunderstorm Warning issued",
      description: "Strong storms are occurring.",
      instruction: "Move indoors.",
      severity: "Severe",
      urgency: "Immediate",
      certainty: "Observed",
      areaDesc: "Test County",
      sent: "2026-06-08T00:00:00Z",
      effective: "2026-06-08T00:00:00Z",
      onset: "2026-06-08T00:10:00Z",
      expires: "2026-06-08T02:00:00Z",
      web: "https://api.weather.gov/alerts/urn:oid:test",
      senderName: "NWS Test Office",
    },
  };
  assert.ok(nwsSeverityScore(feature.properties) > 80);
  const point = representativeNwsPoint(feature.geometry);
  assert.ok(point.latitude >= 40 && point.latitude <= 41);
  const result = normalizeNwsAlert(feature, new Date("2026-06-08T00:30:00Z"));
  assert.ok(result.event);
  assert.equal(result.event.provider, "nws-alerts");
  assert.equal(result.event.domain, "weather");
  assert.equal(result.event.category, "storm");
  assert.equal(result.event.type, "severe-thunderstorm");
  assert.equal(result.event.geometry.type, "Polygon");
});

test("NWS alerts without geometry use labeled coverage fallback", () => {
  const result = normalizeNwsAlert({
    properties: {
      id: "no-geometry",
      event: "Heat Advisory",
      headline: "Heat Advisory",
      severity: "Moderate",
      urgency: "Expected",
      certainty: "Likely",
      sent: "2026-06-08T00:00:00Z",
      web: "https://api.weather.gov/alerts/no-geometry",
    },
  }, new Date("2026-06-08T00:30:00Z"));
  assert.ok(result.event);
  assert.equal(result.event.domain, "weather");
  assert.match(result.event.metadata.coordinateMethod, /fallback/);
});

test("Provider cache stores normalized payloads without raw secrets", async () => {
  const cache = createMemoryProviderCache();
  await cache.set("nws-alerts", [{ id: "safe-event" }], { lastSuccessfulFetchAt: "2026-06-08T00:00:00Z" });
  const record = await cache.get("nws-alerts");
  assert.equal(record.payload[0].id, "safe-event");
  assert.equal(record.cacheVersion, 1);
  assert.doesNotMatch(JSON.stringify(record), /api[_-]?key|token|secret/i);
});

test("Source registry covers every top-level domain with non-live planned states", () => {
  const domains = DOMAIN_SOURCE_STATUS.map(([domain]) => domain);
  for (const domain of domains) {
    assert.ok(providersForDomain(domain).length || domain === "other", `${domain} should have provider plan`);
  }
  assert.ok(PROVIDER_SOURCE_REGISTRY.some((provider) => provider.id === "nws-alerts" && provider.implemented));
  assert.ok(PROVIDER_SOURCE_REGISTRY.some((provider) => provider.id === "gdelt" && provider.status === "planned-discovery"));
  assert.ok(PROVIDER_SOURCE_REGISTRY.some((provider) => provider.id === "acled" && provider.credentialRequired));
});

console.log("All tests passed.");
