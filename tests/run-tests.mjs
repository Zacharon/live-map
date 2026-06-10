import assert from "node:assert/strict";
import fs from "node:fs";
import { SEVERITIES } from "../src/config.js";
import { LAYER_CATALOG } from "../src/data/layers.js";
import { DASHBOARDS } from "../src/data/dashboards.js";
import { EXCHANGES } from "../src/data/exchanges.js";
import { computeCountryRiskScores, ciiLevel } from "../src/risk/country-risk.js";
import { COUNTRIES, countryBoundsArray, countryByCode, countryForEvent } from "../src/data/countries.js";
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
import { gdacsSeverityScore, gdacsUrl, normalizeGdacsFeature, representativeGdacsPoint } from "../src/data/providers/gdacs.js";
import { normalizeCisaKevItem } from "../src/data/providers/cisa-kev.js";
import { normalizeNvdCve } from "../src/data/providers/nvd.js";
import { fetchReliefWebEvents, normalizeReliefWebRecord } from "../src/data/providers/reliefweb.js";
import { classifySecFiling, compliantSecContact, normalizeSecFiling } from "../src/data/providers/sec-edgar.js";
import { classifyFredObservation, fetchFredEvents, normalizeFredObservation } from "../src/data/providers/fred.js";
import { classifyEiaRecord, fetchEiaEvents, normalizeEiaRecord } from "../src/data/providers/eia.js";
import { PROVIDER_SCHEDULES, validateProviderSchedule } from "../src/data/providers/scheduling.js";
import { createMemoryRequestBudgetStore, retryAfterMs } from "../src/data/providers/request-budget.js";
import { createMemoryProviderStateStore } from "../src/data/providers/provider-state.js";
import { normalizeGdeltArticle } from "../src/data/providers/gdelt.js";
import { fetchOfficialFeedEvents, parseFeedItems, normalizeFeedItem } from "../src/data/providers/rss-feed.js";
import { normalizeStatuspageIncident } from "../src/data/providers/statuspage.js";
import { normalizeRipestatObservation } from "../src/data/providers/ripestat.js";
import { assertSafeFetchUrl } from "../src/data/providers/ssrf-protection.js";
import { applyPublicationPolicy } from "../src/data/providers/publication-policy.js";
import { createCompanyIdentity, sameCompany } from "../src/data/providers/company-identity.js";
import { createMemoryProviderCache } from "../src/data/providers/cache.js";
import { PROVIDER_SOURCE_REGISTRY, providersForDomain, DOMAIN_SOURCE_STATUS } from "../src/data/providers/source-registry.js";
import { providerCapability, validateProviderCapabilities } from "../src/data/providers/capability-registry.js";
import { CONSUMER_PRESETS, severitySetFromMinimum } from "../src/consumer/presets.js";
import { buildGlobalSearchResults } from "../src/search/global-search.js";
import { AIRPORTS } from "../src/data/airports.js";
import { PORTS } from "../src/data/ports.js";
import { normalizeMovingObject, validateBbox } from "../src/moving-objects/schema.js";
import { fetchOpenSkyAircraft, normalizeOpenSkyState, openskyAccessToken } from "../src/data/providers/opensky.js";
import { fetchGfwVessels, normalizeGfwVessel } from "../src/data/providers/global-fishing-watch.js";
import { classifyEvent, domainOptions, TAXONOMY_REGISTRY } from "../src/events/taxonomy.js";
import { sortEvents, groupEvents } from "../src/events/feed-organization.js";
import { shouldCluster, buildIncidents } from "../src/events/incident-clustering.js";
import { computeQualityDimensions, normalizeVerificationStatus } from "../src/events/event-quality.js";
import { providerState } from "../src/ui/provider-health-panel.js";
import { serializeView } from "../src/ui/saved-views.js";
import sourcesFunction from "../netlify/functions/sources.mjs";
import eventsFunction from "../netlify/functions/events.mjs";
import countriesFunction from "../netlify/functions/countries.mjs";
import countryRiskFunction from "../netlify/functions/country-risk.mjs";
import providerHealthFunction from "../netlify/functions/provider-health.mjs";
import movingObjectsFunction from "../netlify/functions/moving-objects.mjs";
import { validateProviderSourceLinks } from "../src/sources/provider-source-links.js";

const pendingTests = [];

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === "function") {
      pendingTests.push(
        result
          .then(() => console.log(`ok - ${name}`))
          .catch((error) => {
            console.error(`not ok - ${name}`);
            throw error;
          })
      );
    } else {
      console.log(`ok - ${name}`);
    }
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

test("Country registry supports ISO lookups, bounds, and event matching", () => {
  assert.ok(COUNTRIES.length >= 50);
  const ukraine = countryByCode("UKR");
  assert.equal(ukraine.iso2, "UA");
  assert.deepEqual(countryBoundsArray(ukraine).length, 2);
  assert.equal(countryForEvent({ country: "Ukraine" }).iso3, "UKR");
  assert.equal(countryForEvent({ countryCode: "ua" }).iso3, "UKR");
});

test("CII v2 avoids duplicate saturation and keeps evidence dimensions separate", () => {
  const now = Date.parse("2026-06-09T00:00:00Z");
  const repeatedIncident = Array.from({ length: 12 }, (_, index) => ({
    id: `repeat-${index}`,
    provider: `provider-${index}`,
    providerEventId: `same-${index}`,
    incidentId: "incident-one",
    country: "Ukraine",
    domain: "conflict-security",
    category: "armed-conflict",
    type: "ground-engagement",
    recordKind: "event",
    severity: 98,
    confidence: 94,
    impact: 90,
    occurredAt: now,
    updatedAt: now,
    sourceTier: "tier-1-primary-official",
    verification: { state: "primary-confirmed", independentSourceCount: 3 },
  }));
  const scores = computeCountryRiskScores(repeatedIncident, now, null, {
    usgs: { ok: true },
    gdacs: { ok: true },
    "security-rss": { ok: false },
  });
  const ukraine = scores.find((score) => score.iso3 === "UKR");
  assert.ok(ukraine.score < 95);
  assert.ok(Number.isFinite(ukraine.confidence));
  assert.ok(Number.isFinite(ukraine.completeness));
  assert.ok(Array.isArray(ukraine.topFactors));
  assert.ok(Array.isArray(scores.distributionWarnings));
});

test("CII v2 ignores retracted records and downweights discovery leads", () => {
  const now = Date.parse("2026-06-09T00:00:00Z");
  const confirmed = computeCountryRiskScores([
    { id: "confirmed", country: "Japan", domain: "natural-disaster", category: "earthquake", recordKind: "event", severity: 90, occurredAt: now, updatedAt: now, verification: { state: "primary-confirmed" } },
  ], now);
  const weak = computeCountryRiskScores([
    { id: "lead", country: "Japan", domain: "natural-disaster", category: "earthquake", recordKind: "discovery-lead", severity: 90, occurredAt: now, updatedAt: now, verification: { state: "unverified" } },
    { id: "retracted", country: "Japan", domain: "natural-disaster", category: "earthquake", recordKind: "event", severity: 100, occurredAt: now, updatedAt: now, verification: { state: "retracted" } },
  ], now);
  assert.ok(confirmed.find((score) => score.iso3 === "JPN").score > weak.find((score) => score.iso3 === "JPN").score);
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

test("Record kinds and publication policy preserve weak-source boundaries", () => {
  const lead = createNormalizedEvent({
    provider: "test",
    title: "Discovery lead",
    category: "other",
    recordKind: "discovery-lead",
    geographic: false,
    sourceName: "Test source",
    sourceUrl: "https://example.com/lead",
  });
  assert.equal(lead.valid, true);
  assert.equal(lead.event.recordKind, "discovery-lead");
  assert.equal(validateNormalizedEvent({ ...lead.event, recordKind: "rumor" }).valid, false);
  const excerpt = applyPublicationPolicy("<p>Hello</p>" + "x".repeat(500), { maxDescriptionChars: 10 });
  assert.ok(excerpt.length <= 10);
  assert.doesNotMatch(excerpt, /<p>/);
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
  assert.deepEqual(live.map((source) => source.adapterId).sort(), ["cisa-kev", "eonet", "gdacs", "nws-alerts", "official-rss", "statuspage", "usgs"]);
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

test("Provider capability registry covers runtime providers and controlled RSS groups", () => {
  const validation = validateProviderCapabilities();
  assert.deepEqual(validation.errors, []);
  assert.equal(validation.valid, true);
  assert.deepEqual(providerCapability("security-rss").supportedRecordKinds, ["discovery-lead"]);
  assert.ok(providerCapability("weather-rss").supportedDomains.includes("weather"));
  assert.equal(providerCapability("cloudflare-radar").defaultEnabled, false);
});

test("Controlled RSS provider groups stay disabled until explicitly configured", async () => {
  const previous = globalThis.process.env.SECURITY_RSS_ENABLED;
  delete globalThis.process.env.SECURITY_RSS_ENABLED;
  const result = await fetchOfficialFeedEvents({
    now: Date.parse("2026-06-09T00:00:00Z"),
    provider: { id: "security-rss", name: "Security RSS" },
    feedRegistry: [{ providerId: "security-rss", url: "https://example.com/feed.xml" }],
  });
  assert.equal(result.status, "configuration-required");
  assert.equal(result.requestAttempted, false);
  assert.equal(result.events.length, 0);
  if (previous !== undefined) globalThis.process.env.SECURITY_RSS_ENABLED = previous;
});

test("Provider schedules and request budgets protect upstream services", async () => {
  assert.equal(validateProviderSchedule(PROVIDER_SCHEDULES.reliefweb).valid, true);
  assert.equal(validateProviderSchedule({ providerId: "bad", refreshIntervalMs: 1000, cacheTtlMs: 1000, staleAfterMs: 1000, dailyRequestBudget: 1000 }).valid, false);
  const store = createMemoryRequestBudgetStore();
  const first = await store.recordRequest("test-budget", 2);
  const second = await store.recordRequest("test-budget", 2);
  assert.equal(first.remainingRequests, 1);
  assert.equal(second.status, "exhausted");
  assert.ok(retryAfterMs("60") >= 60000);
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

  const gdacs = await sourcesFunction(new Request("https://liveworldmap.netlify.app/api/sources?source=gdacs"));
  const gdacsBody = await gdacs.json();
  assert.equal(gdacsBody.data.selectedSource.id, "gdacs-alerts");
  assert.equal(gdacsBody.data.selectedSource.adapterId, "gdacs");
});

test("Country APIs support lookup, filtering, and distribution metadata", async () => {
  const lookup = await countriesFunction(new Request("https://liveworldmap.netlify.app/api/countries?country=UKR"));
  assert.equal(lookup.status, 200);
  const lookupBody = await lookup.json();
  assert.equal(lookupBody.data.iso3, "UKR");

  const missing = await countriesFunction(new Request("https://liveworldmap.netlify.app/api/countries?country=NOPE"));
  assert.equal(missing.status, 404);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes("earthquake.usgs.gov")) {
      return new Response(JSON.stringify({
        features: [{
          id: "country-risk-api",
          properties: { mag: 5.2, time: Date.now(), updated: Date.now(), url: "https://earthquake.usgs.gov/earthquakes/eventpage/country-risk-api", place: "Japan" },
          geometry: { type: "Point", coordinates: [140, 35, 5] },
        }],
      }), { status: 200 });
    }
    return new Response("unavailable", { status: 503 });
  };
  try {
    const risk = await countryRiskFunction(new Request("https://liveworldmap.netlify.app/api/country-risk?country=JPN"));
    assert.equal(risk.status, 200);
    const body = await risk.json();
    assert.equal(body.data.scores.length, 1);
    assert.equal(body.data.scores[0].iso3, "JPN");
    assert.ok(Array.isArray(body.data.distributionWarnings));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Provider health API returns sanitized diagnostics outside public dashboard", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes("earthquake.usgs.gov")) {
      return new Response(JSON.stringify({
        features: [{
          id: "provider-health-api",
          properties: { mag: 4.9, time: Date.now(), updated: Date.now(), url: "https://earthquake.usgs.gov/earthquakes/eventpage/provider-health-api", place: "Test" },
          geometry: { type: "Point", coordinates: [100, 10, 5] },
        }],
      }), { status: 200 });
    }
    return new Response("unavailable token=should-not-leak", { status: 503 });
  };
  try {
    const response = await providerHealthFunction(new Request("https://liveworldmap.netlify.app/api/provider-health"));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const body = await response.json();
    assert.ok(body.data.providers.length > 0);
    assert.doesNotMatch(JSON.stringify(body), /should-not-leak/);
    assert.ok(body.data.providers.every((provider) => !Object.hasOwn(provider, "rawPayload")));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Moving-object API rejects global requests and reports configuration-required providers", async () => {
  const missing = await movingObjectsFunction(new Request("https://liveworldmap.netlify.app/api/moving-objects?type=aircraft"));
  assert.equal(missing.status, 400);
  const missingBody = await missing.json();
  assert.match(missingBody.warnings.join(" "), /Zoom in|area/i);

  const global = await movingObjectsFunction(new Request("https://liveworldmap.netlify.app/api/moving-objects?type=aircraft&bbox=-90,-180,90,180"));
  assert.equal(global.status, 400);

  const response = await movingObjectsFunction(new Request("https://liveworldmap.netlify.app/api/moving-objects?type=all&bbox=40,-74,41,-73&limit=5"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(Array.isArray(body.data.data));
  assert.equal(body.data.providerStatus.opensky.status, "configuration-required");
  assert.equal(body.data.providerStatus["global-fishing-watch"].status, "configuration-required");
  assert.equal(body.data.truncated, false);
});

test("Events API preserves recordKind/domain filters", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes("earthquake.usgs.gov")) {
      return new Response(JSON.stringify({
        features: [{
          id: "api-filtered",
          properties: { mag: 4.8, time: Date.now(), updated: Date.now(), url: "https://earthquake.usgs.gov/earthquakes/eventpage/api-filtered", place: "Test" },
          geometry: { type: "Point", coordinates: [100, 10, 5] },
        }],
      }), { status: 200 });
    }
    return new Response("unavailable", { status: 503 });
  };
  try {
    const response = await eventsFunction(new Request("https://liveworldmap.netlify.app/api/events?recordKind=event&domain=natural-disaster"));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.filters.recordKind, "event");
    assert.ok(body.events.length >= 1);
    assert.ok(body.events.every((event) => event.recordKind === "event" && event.domain === "natural-disaster"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Events API preserves country filters", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes("earthquake.usgs.gov")) {
      return new Response(JSON.stringify({
        features: [{
          id: "api-country-filtered",
          properties: { mag: 4.8, time: Date.now(), updated: Date.now(), url: "https://earthquake.usgs.gov/earthquakes/eventpage/api-country-filtered", place: "Japan" },
          geometry: { type: "Point", coordinates: [140, 35, 5] },
        }],
      }), { status: 200 });
    }
    return new Response("unavailable", { status: 503 });
  };
  try {
    const response = await eventsFunction(new Request("https://liveworldmap.netlify.app/api/events?country=JPN"));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.filters.country, "JPN");
    assert.ok(body.events.length >= 1);
    assert.ok(body.events.every((event) => countryForEvent(event)?.iso3 === "JPN"));
  } finally {
    globalThis.fetch = originalFetch;
  }
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

test("Detailed diagnostics are separated from the public dashboard", () => {
  const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const diagnostics = fs.readFileSync(new URL("../diagnostics.html", import.meta.url), "utf8");
  assert.doesNotMatch(index, /providerHealthPanel/);
  assert.match(index, /publicDataStatus/);
  assert.match(diagnostics, /noindex,\s*nofollow/);
  assert.match(diagnostics, /diagnostics-app\.js/);
});

test("Consumer shell exposes simple navigation, tools, onboarding, and drawers", () => {
  const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(index, /Explore/);
  assert.match(index, /Live Feed/);
  assert.match(index, /Country Scores/);
  assert.match(index, /id="toolsMenu"/);
  assert.match(index, /id="globalSearch"/);
  assert.match(index, /id="onboardingDialog"/);
  assert.match(index, /id="filterDrawer"/);
  assert.match(index, /id="eventDrawer"/);
  assert.match(index, /Live Tracking/);
  assert.match(css, /\.drawer-left/);
  assert.match(css, /\.drawer-right/);
  assert.match(css, /\.standard-mode \.advanced-only/);
  assert.match(css, /46dvh/);
});

test("Consumer presets define safe default and tracking views", () => {
  assert.deepEqual(CONSUMER_PRESETS.explore.recordKinds, ["event"]);
  assert.equal(CONSUMER_PRESETS.explore.timeWindow, 24);
  assert.equal(CONSUMER_PRESETS.explore.aviationEnabled, false);
  assert.equal(CONSUMER_PRESETS.flights.aviationEnabled, true);
  assert.equal(CONSUMER_PRESETS.ships.maritimeEnabled, true);
  assert.ok(severitySetFromMinimum(SEVERITIES, "high").has("critical"));
  assert.equal(severitySetFromMinimum(SEVERITIES, "high").has("low"), false);
});

test("Global search covers countries, airports, ports, events, objects, and sources locally", () => {
  const results = buildGlobalSearchResults("JFK", [], []);
  assert.ok(results.some((item) => item.type === "Airports" && item.payload.icao === "KJFK"));
  assert.ok(buildGlobalSearchResults("Ukraine", [], []).some((item) => item.type === "Countries" && item.payload.iso3 === "UKR"));
  assert.ok(buildGlobalSearchResults("Rotterdam", [], []).some((item) => item.type === "Ports"));
  assert.ok(buildGlobalSearchResults("OpenSky", [], []).some((item) => item.type === "Sources"));
  assert.ok(buildGlobalSearchResults("TEST123", [], [{ objectType: "aircraft", displayName: "TEST123", identifiers: { icao24: "abc123" }, providerId: "opensky" }]).some((item) => item.type === "Aircraft"));
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

test("CISA KEV normalization creates safe non-geographic cyber events", () => {
  const result = normalizeCisaKevItem({
    cveID: "CVE-2026-0001",
    vendorProject: "Example",
    product: "Example Product",
    vulnerabilityName: "Example Product Vulnerability",
    dateAdded: "2026-06-09",
    shortDescription: "A vulnerability is known to be exploited.",
    requiredAction: "Apply vendor mitigation.",
    dueDate: "2026-06-30",
    knownRansomwareCampaignUse: "Known",
    notes: "https://nvd.nist.gov/vuln/detail/CVE-2026-0001",
    cwes: ["CWE-79"],
  }, new Date("2026-06-09T00:00:00Z"));
  assert.ok(result.event);
  assert.equal(result.event.provider, "cisa-kev");
  assert.equal(result.event.geographic, false);
  assert.equal(result.event.domain, "technology-cyber");
  assert.equal(result.event.metadata.knownRansomwareCampaignUse, "Known");
  assert.doesNotMatch(result.event.description, /exploit code|proof of concept/i);
});

test("NVD normalization enriches CVEs without map coordinates", () => {
  const result = normalizeNvdCve({
    cve: {
      id: "CVE-2026-0002",
      published: "2026-06-01T00:00:00.000",
      lastModified: "2026-06-08T00:00:00.000",
      vulnStatus: "Analyzed",
      descriptions: [{ lang: "en", value: "Example vulnerability description." }],
      metrics: { cvssMetricV31: [{ cvssData: { baseScore: 9.8 } }] },
    },
  }, new Date("2026-06-09T00:00:00Z"));
  assert.ok(result.event);
  assert.equal(result.event.provider, "nvd");
  assert.equal(result.event.geographic, false);
  assert.equal(result.event.metadata.cvss, 9.8);
});

test("ReliefWeb stays configuration-required without appname and limits report bodies", async () => {
  const previous = globalThis.process.env.RELIEFWEB_APPNAME;
  delete globalThis.process.env.RELIEFWEB_APPNAME;
  const status = await fetchReliefWebEvents({ now: Date.now(), hours: 72 });
  assert.equal(status.status, "configuration-required");
  assert.equal(status.events.length, 0);
  if (previous !== undefined) globalThis.process.env.RELIEFWEB_APPNAME = previous;

  const longBody = "Sensitive report body. ".repeat(200);
  const result = normalizeReliefWebRecord({
    id: "12345",
    fields: {
      title: "Displacement update in Sudan",
      body: longBody,
      date: { created: "2026-06-08T00:00:00Z", changed: "2026-06-09T00:00:00Z" },
      url: "https://reliefweb.int/report/sudan/example",
      source: [{ name: "Example NGO" }],
      country: [{ name: "Sudan", iso3: "SDN" }],
      theme: [{ name: "Protection and Human Rights" }],
    },
  }, new Date("2026-06-09T00:00:00Z"));
  assert.ok(result.event);
  assert.equal(result.event.domain, "humanitarian");
  assert.equal(result.event.metadata.coordinateMethod, "country-centroid");
  assert.equal(result.event.metadata.copyrightPolicy, "metadata-and-limited-excerpt-only");
  assert.ok(result.event.description.length <= 420);
  assert.notEqual(result.event.description, longBody);
});

test("SEC EDGAR classifies material filings without inventing geography", async () => {
  assert.equal(compliantSecContact("ops@example.com"), true);
  assert.equal(compliantSecContact("not-an-email"), false);
  assert.equal(classifySecFiling({ form: "8-K", items: "Item 1.05" }).eventType, "cybersecurity-disclosure");
  assert.equal(classifySecFiling({ form: "8-K", items: "Item 5.02" }).eventType, "executive-change");
  assert.equal(classifySecFiling({ form: "8-K", items: "Item 2.01" }).eventType, "acquisition-disposition");
  assert.equal(classifySecFiling({ form: "8-K", items: "Item 4.02" }).eventType, "non-reliance-restatement");
  const result = normalizeSecFiling(
    { form: "8-K", items: "Item 1.05", accessionNumber: "0000320193-26-000001", filingDate: "2026-06-08", reportDate: "2026-06-07", primaryDocument: "aapl-20260608.htm" },
    { cik: "0000320193", companyName: "Apple Inc.", tickerSymbols: ["AAPL", "AAPL.MX"], exchange: "XNAS" },
    new Date("2026-06-09T00:00:00Z")
  );
  assert.ok(result.event);
  assert.equal(result.event.geographic, false);
  assert.equal(result.event.domain, "finance-markets");
  assert.equal(result.event.type, "cybersecurity-disclosure");
  assert.equal(result.event.metadata.accessionNumber, "0000320193-26-000001");
  assert.match(result.event.metadata.primaryDocumentUrl, /aapl-20260608\.htm$/);
  assert.ok(result.event.metadata.companyIdentity.tickerSymbols.includes("AAPL.MX"));
  assert.equal(normalizeSecFiling({ form: "S-8", accessionNumber: "x" }, { cik: "1", companyName: "X" }).event, null);
});

test("Company identity prefers CIK and does not merge on similar names alone", () => {
  const a = createCompanyIdentity({ cik: "0000320193", legalName: "Apple Inc.", tickerSymbols: ["AAPL"] });
  const b = createCompanyIdentity({ cik: "0320193", legalName: "Apple Incorporated", tickerSymbols: ["AAPL.MX"] });
  const c = createCompanyIdentity({ legalName: "Apple Holdings" });
  assert.equal(a.id, "cik:320193");
  assert.equal(sameCompany(a, b), true);
  assert.equal(sameCompany(a, c), false);
});

test("FRED observations distinguish unchanged, revised, and material records", async () => {
  const series = { id: "FEDFUNDS", releaseId: "18", releaseName: "H.15 Selected Interest Rates", materialChange: 0.25 };
  const latest = { date: "2026-05-01", value: "5.50", realtime_start: "2026-06-01", realtime_end: "2026-06-01" };
  const previous = { date: "2026-04-01", value: "5.00", realtime_start: "2026-05-01", realtime_end: "2026-05-01" };
  const classification = classifyFredObservation(series, latest, previous, { title: "Federal Funds Effective Rate", units: "Percent" });
  assert.equal(classification.eventType, "macro-threshold-crossing");
  const normalized = normalizeFredObservation(series, latest, previous, { title: "Federal Funds Effective Rate", units: "Percent" }, new Date("2026-06-09T00:00:00Z"));
  assert.ok(normalized.event);
  assert.equal(normalized.event.geographic, false);
  assert.equal(normalized.observation.recordKind, "observation");
  const unchanged = normalizeFredObservation(series, { ...latest, value: "5.01" }, previous, {}, new Date("2026-06-09T00:00:00Z"));
  assert.equal(unchanged.event, null);
  const missing = normalizeFredObservation(series, { ...latest, value: "." }, previous, {}, new Date("2026-06-09T00:00:00Z"));
  assert.equal(missing.observation.value, null);
  const previousKey = globalThis.process.env.FRED_API_KEY;
  delete globalThis.process.env.FRED_API_KEY;
  const status = await fetchFredEvents({ now: Date.now() });
  assert.equal(status.status, "configuration-required");
  if (previousKey !== undefined) globalThis.process.env.FRED_API_KEY = previousKey;
});

test("EIA records create commodity signals only for configured thresholds", async () => {
  const dataset = { id: "weekly-crude-stocks", route: "petroleum/stoc/wstk/data", seriesId: "WCESTUS1", commodity: "crude-oil", type: "inventory-release", units: "thousand barrels", materialChange: 5000 };
  const latest = { period: "2026-06-05", value: "455000", series: "WCESTUS1", units: "thousand barrels", updated: "2026-06-06T14:00:00Z" };
  const previous = { period: "2026-05-29", value: "448500", series: "WCESTUS1", units: "thousand barrels", updated: "2026-05-30T14:00:00Z" };
  const signal = classifyEiaRecord(dataset, latest, previous);
  assert.equal(signal.type, "inventory-release");
  assert.ok(signal.material);
  const normalized = normalizeEiaRecord(dataset, latest, previous, new Date("2026-06-09T00:00:00Z"));
  assert.ok(normalized.event);
  assert.equal(normalized.event.domain, "commodity-supply-chain");
  assert.equal(normalized.event.geographic, false);
  assert.equal(normalized.observation.recordKind, "observation");
  const unchanged = normalizeEiaRecord(dataset, { ...latest, value: "448750", updated: previous.updated }, previous, new Date("2026-06-09T00:00:00Z"));
  assert.equal(unchanged.event, null);
  const previousKey = globalThis.process.env.EIA_API_KEY;
  delete globalThis.process.env.EIA_API_KEY;
  const status = await fetchEiaEvents({ now: Date.now() });
  assert.equal(status.status, "configuration-required");
  if (previousKey !== undefined) globalThis.process.env.EIA_API_KEY = previousKey;
});

test("Provider state prevents duplicate finance records after restart-like reuse", async () => {
  const store = createMemoryProviderStateStore();
  assert.equal(await store.hasProcessed("sec-edgar", "320193", "0000320193-26-000001"), false);
  await store.markProcessed("sec-edgar", "320193", "0000320193-26-000001", { lastAccessionNumber: "0000320193-26-000001" });
  assert.equal(await store.hasProcessed("sec-edgar", "320193", "0000320193-26-000001"), true);
  const state = await store.get("sec-edgar", "320193");
  assert.equal(state.lastAccessionNumber, "0000320193-26-000001");
  await store.setCacheEntry("gdelt", "query-pack", [{ id: "lead" }], { fresh: true });
  assert.equal((await store.getCacheEntry("gdelt", "query-pack")).payload[0].id, "lead");
  const lock = await store.acquireLock("official-rss", "refresh", 5000);
  assert.equal(lock.acquired, true);
  assert.equal((await store.acquireLock("official-rss", "refresh", 5000)).acquired, false);
  assert.equal(await store.releaseLock("official-rss", "refresh", lock.token), true);
});

test("GDELT discovery leads stay unverified and non-geographic", () => {
  const result = normalizeGdeltArticle({
    title: "Major port disruption reported",
    url: "https://example.com/news/port?utm_source=test",
    seendate: "2026-06-09T00:00:00Z",
    domain: "example.com",
    language: "English",
  }, { id: "supply-chain", domain: "commodity-supply-chain", category: "commodity", type: "shipping-disruption" }, new Date("2026-06-09T01:00:00Z"));
  assert.ok(result.event);
  assert.equal(result.event.recordKind, "discovery-lead");
  assert.equal(result.event.geographic, false);
  assert.equal(result.event.metadata.verificationStatus, "unverified");
  assert.equal(result.event.publicationPolicy.allowFullText, false);
});

test("Official feed parsing strips unsafe markup and rejects local feed URLs", () => {
  const items = parseFeedItems(`<?xml version="1.0"?><rss><channel><item><title><![CDATA[Test alert]]></title><link>https://example.gov/a</link><pubDate>Tue, 09 Jun 2026 00:00:00 GMT</pubDate><description><![CDATA[<script>x</script><b>Official</b> update]]></description></item></channel></rss>`);
  assert.equal(items.length, 1);
  const result = normalizeFeedItem(items[0], {
    id: "test-feed",
    providerId: "official-rss",
    name: "Test Feed",
    domain: "technology-cyber",
    category: "cyber",
    type: "cyber-advisory",
    sourceTier: "tier-1-primary-official",
    verificationState: "primary-confirmed",
    publicationPolicy: { maxDescriptionChars: 80, allowFullText: false },
  }, new Date("2026-06-09T01:00:00Z"));
  assert.ok(result.event);
  assert.equal(result.event.recordKind, "discovery-lead");
  assert.doesNotMatch(result.event.description, /script|<b>/i);
  assert.throws(() => assertSafeFetchUrl("http://127.0.0.1/feed.xml"), /Blocked/);
});

test("Statuspage incidents normalize only active user-impacting events", () => {
  const page = { id: "github-status", name: "GitHub Status", domain: "technology-cyber", category: "infrastructure", type: "service-outage", homepageUrl: "https://www.githubstatus.com/" };
  const active = normalizeStatuspageIncident({
    id: "abc",
    name: "Actions degraded",
    status: "investigating",
    impact: "major",
    created_at: "2026-06-09T00:00:00Z",
    updated_at: "2026-06-09T00:10:00Z",
    shortlink: "https://stspg.io/test",
    incident_updates: [{ body: "We are investigating delays." }],
  }, page, new Date("2026-06-09T01:00:00Z"));
  assert.ok(active.event);
  assert.equal(active.event.verification.state, "primary-confirmed");
  assert.equal(normalizeStatuspageIncident({ id: "resolved", name: "Resolved", status: "resolved", impact: "major" }, page).event, null);
});

test("RIPEstat observations become events only on conservative anomaly rules", () => {
  const anomaly = normalizeRipestatObservation("AS64496", { data: { visibility: 12 }, time: "2026-06-09T00:00:00Z" }, new Date("2026-06-09T01:00:00Z"));
  assert.ok(anomaly.event);
  assert.equal(anomaly.event.domain, "infrastructure");
  assert.equal(anomaly.event.metadata.verificationStatus, "observed");
  const normal = normalizeRipestatObservation("AS64496", { data: { visibility: 90 }, time: "2026-06-09T00:00:00Z" }, new Date("2026-06-09T01:00:00Z"));
  assert.equal(normal.event, null);
  assert.equal(normal.observation.recordKind, "observation");
});

test("Moving-object schema validates bounded viewport and public object shape", () => {
  assert.equal(validateBbox("0,0,10,10").valid, true);
  assert.equal(validateBbox("-90,-180,90,180").valid, false);
  assert.equal(validateBbox("10,170,20,-170").valid, true);
  const result = normalizeMovingObject({
    objectType: "aircraft",
    providerId: "opensky",
    latitude: 40,
    longitude: -73,
    identifiers: { icao24: "abc123", callsign: "TEST123" },
    observedAt: Date.now() - 700000,
    sourceName: "OpenSky Network",
    sourceUrl: "https://opensky-network.org/",
  });
  assert.ok(result.object);
  assert.equal(result.object.id, "aircraft:abc123");
  assert.equal(result.object.stale, true);
  assert.equal(normalizeMovingObject({ objectType: "aircraft", latitude: 999, longitude: 0 }).object, null);
});

test("OpenSky normalization and configuration boundary are safe", async () => {
  const now = Date.parse("2026-06-09T00:00:00Z");
  const normalized = normalizeOpenSkyState(["abc123", "TEST123 ", "United States", now / 1000 - 20, now / 1000 - 10, -73.8, 40.6, 1000, false, 230, 85, 1, null, 1200, null, false, 0, 3], now);
  assert.ok(normalized.object);
  assert.equal(normalized.object.objectType, "aircraft");
  assert.equal(normalized.object.identifiers.callsign, "TEST123");
  assert.equal(normalized.object.status, "airborne");

  const previousEnabled = globalThis.process.env.OPENSKY_ENABLED;
  const previousId = globalThis.process.env.OPENSKY_CLIENT_ID;
  const previousSecret = globalThis.process.env.OPENSKY_CLIENT_SECRET;
  delete globalThis.process.env.OPENSKY_ENABLED;
  delete globalThis.process.env.OPENSKY_CLIENT_ID;
  delete globalThis.process.env.OPENSKY_CLIENT_SECRET;
  const result = await fetchOpenSkyAircraft({ bbox: { south: 40, west: -74, north: 41, east: -73 }, limit: 10, now });
  assert.equal(result.status.status, "configuration-required");
  assert.equal(result.objects.length, 0);
  await assert.rejects(() => openskyAccessToken(async () => new Response("{}")), /not configured/i);
  if (previousEnabled !== undefined) globalThis.process.env.OPENSKY_ENABLED = previousEnabled;
  if (previousId !== undefined) globalThis.process.env.OPENSKY_CLIENT_ID = previousId;
  if (previousSecret !== undefined) globalThis.process.env.OPENSKY_CLIENT_SECRET = previousSecret;
});

test("Global Fishing Watch vessel boundary normalizes but stays configuration-required", async () => {
  const vessel = normalizeGfwVessel({ mmsi: "123456789", vesselName: "Test Vessel", lat: 1.2, lon: 103.8, speed: 8, course: 90, timestamp: "2026-06-09T00:00:00Z", destination: "SGSIN" }, Date.parse("2026-06-09T00:05:00Z"));
  assert.ok(vessel.object);
  assert.equal(vessel.object.objectType, "vessel");
  assert.equal(vessel.object.identifiers.mmsi, "123456789");
  assert.equal(vessel.object.providerMetadata.public.destination, "SGSIN");
  assert.equal(normalizeGfwVessel({ lat: 1, lon: 2 }).object, null);
  const previousEnabled = globalThis.process.env.GFW_ENABLED;
  const previousToken = globalThis.process.env.GFW_API_TOKEN;
  delete globalThis.process.env.GFW_ENABLED;
  delete globalThis.process.env.GFW_API_TOKEN;
  const result = await fetchGfwVessels();
  assert.equal(result.status.status, "configuration-required");
  assert.equal(result.objects.length, 0);
  if (previousEnabled !== undefined) globalThis.process.env.GFW_ENABLED = previousEnabled;
  if (previousToken !== undefined) globalThis.process.env.GFW_API_TOKEN = previousToken;
});

test("Non-geographic normalized events remain valid", () => {
  const result = createNormalizedEvent({
    provider: "test",
    title: "Non-geographic event",
    category: "cyber",
    domain: "technology-cyber",
    type: "exploited-vulnerability",
    geographic: false,
    sourceName: "Test source",
    sourceUrl: "https://example.com/non-geo",
  });
  assert.equal(result.valid, true);
  assert.equal(result.event.geographic, false);
  assert.equal(validateNormalizedEvent(result.event).valid, true);
});

test("GDACS normalizes disaster alert taxonomy, severity, and source links", () => {
  const result = normalizeGdacsFeature({
    type: "Feature",
    bbox: [125.0469, 5.5918, 125.0469, 5.5918],
    geometry: { type: "Point", coordinates: [125.0469, 5.5918] },
    properties: {
      eventtype: "EQ",
      eventid: 1544720,
      episodeid: 1710268,
      name: "Earthquake in Philippines",
      description: "Earthquake in Philippines",
      htmldescription: "Orange M 7.8 Earthquake in Philippines.",
      alertlevel: "Orange",
      episodealertlevel: "Orange",
      episodealertscore: 1.8124,
      iscurrent: "true",
      country: "Philippines",
      fromdate: "2026-06-07T23:37:40",
      todate: "2026-06-07T23:37:40",
      datemodified: "2026-06-09T00:12:24",
      source: "NEIC",
      url: {
        geometry: "https://www.gdacs.org/gdacsapi/api/polygons/getgeometry?eventtype=EQ&eventid=1544720&episodeid=1710268",
        report: "https://www.gdacs.org/report.aspx?eventid=1544720&episodeid=1710268&eventtype=EQ",
        details: "https://www.gdacs.org/gdacsapi/api/events/geteventdata?eventtype=EQ&eventid=1544720",
      },
      affectedcountries: [{ iso2: "PH", iso3: "PHL", countryname: "Philippines" }],
      severitydata: { severity: 7.8, severitytext: "Magnitude 7.8M, Depth:55.193km", severityunit: "M" },
    },
  }, new Date("2026-06-09T01:00:00Z"));
  assert.ok(result.event);
  assert.equal(result.event.provider, "gdacs");
  assert.equal(result.event.domain, "natural-disaster");
  assert.equal(result.event.category, "earthquake");
  assert.equal(result.event.type, "earthquake");
  assert.equal(result.event.severityLabel, "high");
  assert.equal(result.event.metadata.verificationStatus, "reported");
  assert.match(result.event.sourceUrl, /^https:\/\/www\.gdacs\.org\/report\.aspx/);
  assert.equal(result.event.metadata.alertLevel, "Orange");
});

test("GDACS handles polygons, tropical cyclone weather mapping, and invalid geometry", () => {
  const polygon = {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [[[-90, 10], [-88, 10], [-88, 12], [-90, 12], [-90, 10]]] },
    properties: {
      eventtype: "TC",
      eventid: 1001275,
      episodeid: 3,
      name: "Tropical Cyclone CRISTINA-26",
      alertlevel: "Red",
      episodealertlevel: "Red",
      episodealertscore: 3,
      iscurrent: "true",
      country: "Honduras, El Salvador, Nicaragua, Guatemala",
      fromdate: "2026-06-08T15:00:00",
      datemodified: "2026-06-09T02:06:04",
      url: { report: "https://www.gdacs.org/report.aspx?eventid=1001275&episodeid=3&eventtype=TC" },
      severitydata: { severitytext: "Tropical Storm" },
    },
  };
  const point = representativeGdacsPoint(polygon.geometry);
  assert.ok(point.latitude >= 10 && point.latitude <= 12);
  assert.equal(gdacsSeverityScore(polygon.properties), 92);
  const result = normalizeGdacsFeature(polygon, new Date("2026-06-09T02:30:00Z"));
  assert.ok(result.event);
  assert.equal(result.event.domain, "weather");
  assert.equal(result.event.category, "storm");
  assert.equal(result.event.type, "tropical-cyclone");
  assert.equal(result.event.severityLabel, "critical");
  assert.equal(result.event.geometry.type, "Polygon");
  assert.equal(normalizeGdacsFeature({ properties: { eventtype: "FL", eventid: 1 } }).event, null);
  assert.match(gdacsUrl(168, Date.UTC(2026, 5, 9)), /eventtypes=EQ%2CTC%2CFL%2CVO%2CDR%2CWF%2CTS/);
});

test("GDACS cross-provider earthquake reports can cluster without deleting source records", () => {
  const usgs = {
    id: "usgs:eq",
    title: "Earthquake in Philippines",
    type: "earthquake",
    domain: "natural-disaster",
    lat: 5.59,
    lon: 125.04,
    occurredAt: Date.parse("2026-06-07T23:37:40Z"),
    updatedAt: Date.parse("2026-06-09T00:12:24Z"),
    provider: "usgs",
    providerId: "usgs-eq",
    country: "Philippines",
  };
  const gdacs = { ...usgs, id: "gdacs:eq", provider: "gdacs", providerId: "EQ:1544720:1710268", title: "Orange earthquake in Philippines" };
  assert.equal(shouldCluster(usgs, gdacs), true);
  const incidents = buildIncidents([usgs, gdacs]);
  assert.equal(incidents.length, 1);
  assert.deepEqual(incidents[0].eventIds.sort(), ["gdacs:eq", "usgs:eq"]);
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
  assert.ok(PROVIDER_SOURCE_REGISTRY.some((provider) => provider.id === "gdelt" && provider.status === "configuration-required" && provider.implemented));
  assert.ok(PROVIDER_SOURCE_REGISTRY.some((provider) => provider.id === "official-rss" && provider.status === "live"));
  assert.ok(PROVIDER_SOURCE_REGISTRY.some((provider) => provider.id === "statuspage" && provider.status === "live"));
  assert.ok(PROVIDER_SOURCE_REGISTRY.some((provider) => provider.id === "ripestat" && provider.status === "configuration-required"));
  assert.ok(PROVIDER_SOURCE_REGISTRY.some((provider) => provider.id === "acled" && provider.credentialRequired));
});

await Promise.all(pendingTests);
console.log("All tests passed.");
