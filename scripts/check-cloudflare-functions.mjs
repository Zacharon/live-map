import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const eventsFunction = await import("../functions/api/events.js");
const sourcesResponse = await import("../src/api/sources-response.js");
const providerHealthResponse = await import("../src/api/provider-health-response.js");
const worker = await import("../src/worker.js");
const { SEVERITIES } = await import("../src/config.js");
const { CONSUMER_PRESETS, severitySetFromMinimum } = await import("../src/consumer/presets.js");
const { normalizeEvent } = await import("../src/events/event-normalizer.js");
const { filteredEvents } = await import("../src/events/event-filters.js");
const { sourceStatusText } = await import("../src/ui/source-health.js");

assert.equal(typeof eventsFunction.onRequest, "function", "functions/api/events.js must export onRequest(context)");
assert.equal(typeof sourcesResponse.createSourcesResponse, "function", "src/api/sources-response.js must export createSourcesResponse(request)");
assert.equal(typeof providerHealthResponse.createProviderHealthResponse, "function", "src/api/provider-health-response.js must export createProviderHealthResponse(request, options)");
assert.equal(typeof worker.default?.fetch, "function", "src/worker.js must export a default fetch handler");

const wranglerConfig = await readFile(new URL("../wrangler.toml", import.meta.url), "utf8");
assert.match(wranglerConfig, /run_worker_first\s*=\s*\[[^\]]*"\/api\/\*"[^\]]*"\/sources"[^\]]*\]/, "wrangler.toml must route /api/* and /sources through the Worker before static assets");

const originalFetch = globalThis.fetch;

function providerResponse(url) {
  if (String(url).includes("earthquake.usgs.gov")) {
    return new Response(JSON.stringify({
      features: [{
        id: "cloudflare-worker-visible",
        properties: {
          mag: 7.2,
          time: Date.now() - 60_000,
          updated: Date.now(),
          url: "https://earthquake.usgs.gov/earthquakes/eventpage/cloudflare-worker-visible",
          place: "10 km S of Test",
        },
        geometry: { type: "Point", coordinates: [140, 35, 5] },
      }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  }
  return new Response("private-upstream-body-should-not-leak", { status: 503 });
}

function cloudflareEnv() {
  return {
    ASSETS: {
      fetch: async (request) => {
        const pathname = new URL(request.url).pathname;
        const title = pathname === "/source-explorer.html" ? "Source Explorer - Live Map" : "asset";
        return new Response(`<!doctype html><title>${title}</title>`, {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      },
    },
  };
}

function defaultExploreVisible(events) {
  const explore = CONSUMER_PRESETS.explore;
  return filteredEvents(events, {
    domains: new Set(explore.domains),
    categories: new Set(explore.layers),
    severities: severitySetFromMinimum(SEVERITIES, explore.minimumSeverity),
    recordKinds: new Set(explore.recordKinds),
    query: "",
  }, explore.timeWindow, "highest-severity");
}

try {
  globalThis.fetch = async (url) => providerResponse(url);

  const eventsResponse = await worker.default.fetch(new Request("https://worker.test/api/events?hours=24"), cloudflareEnv());
  assert.equal(eventsResponse.status, 200, "Cloudflare Worker /api/events should return 200");
  assert.match(eventsResponse.headers.get("content-type") || "", /json/, "Cloudflare Worker /api/events should return JSON");
  const eventsBody = await eventsResponse.json();
  assert.ok(Array.isArray(eventsBody.events), "Cloudflare Worker /api/events must expose an events array");
  assert.ok(eventsBody.events.length >= 1, "Cloudflare Worker /api/events should keep successful public provider events");
  const visible = defaultExploreVisible(eventsBody.events.map(normalizeEvent));
  assert.ok(visible.length >= 1, "Cloudflare Worker /api/events should produce frontend-visible default Explore events");

  const sourcesRouteResponse = await worker.default.fetch(new Request("https://worker.test/api/sources?domain=natural-disaster&status=live"), cloudflareEnv());
  assert.equal(sourcesRouteResponse.status, 200, "Cloudflare Worker /api/sources should return 200");
  assert.match(sourcesRouteResponse.headers.get("content-type") || "", /json/, "Cloudflare Worker /api/sources should return JSON");
  const sourcesBody = await sourcesRouteResponse.json();
  assert.equal(sourcesBody.data.registryVersion, "1", "Cloudflare Worker /api/sources should preserve registry version");
  assert.ok(Array.isArray(sourcesBody.data.sources), "Cloudflare Worker /api/sources should expose source records");
  assert.ok(sourcesBody.data.statistics.total >= sourcesBody.data.sources.length, "Cloudflare Worker /api/sources should expose registry statistics");

  const healthResponse = await worker.default.fetch(new Request("https://worker.test/api/provider-health?hours=24"), cloudflareEnv());
  assert.equal(healthResponse.status, 200, "Cloudflare Worker /api/provider-health should return 200");
  assert.match(healthResponse.headers.get("content-type") || "", /json/, "Cloudflare Worker /api/provider-health should return JSON");
  const healthBody = await healthResponse.json();
  assert.ok(Array.isArray(healthBody.data.providers), "Cloudflare Worker /api/provider-health should expose providers");
  assert.ok(healthBody.data.providers.some((provider) => provider.providerId === "usgs" && provider.ok), "Provider health should report successful public providers");
  assert.doesNotMatch(JSON.stringify(healthBody), /private-upstream-body-should-not-leak/i, "Provider health must not leak raw upstream response bodies");

  const sourceText = sourceStatusText(eventsBody);
  assert.doesNotMatch(sourceText, /waiting for live feeds/i, "Source health text must not keep the waiting state after an API response");
  assert.match(sourceText, /live|degraded|unavailable|fallback|disabled/i, "Source health text should expose user-facing status words");

  const missingRouteResponse = await worker.default.fetch(new Request("https://worker.test/api/unknown-route"), cloudflareEnv());
  assert.equal(missingRouteResponse.status, 404, "Cloudflare Worker unknown /api/* routes should return 404");
  assert.match(missingRouteResponse.headers.get("content-type") || "", /json/, "Cloudflare Worker unknown /api/* routes should return JSON");
  const missingBody = await missingRouteResponse.json();
  assert.equal(missingBody.error, "not-found", "Cloudflare Worker unknown /api/* routes should not serve static HTML");

  const sourcesPageResponse = await worker.default.fetch(new Request("https://worker.test/sources"), cloudflareEnv());
  assert.equal(sourcesPageResponse.status, 200, "Cloudflare Worker /sources should serve Source Explorer");
  assert.match(await sourcesPageResponse.text(), /Source Explorer - Live Map/, "Cloudflare Worker /sources should map to source-explorer.html");
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Cloudflare exports are valid.");
