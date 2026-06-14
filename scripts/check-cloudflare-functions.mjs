import assert from "node:assert/strict";

const eventsFunction = await import("../functions/api/events.js");
const sourcesResponse = await import("../src/api/sources-response.js");
const providerHealthResponse = await import("../src/api/provider-health-response.js");
const worker = await import("../src/worker.js");

assert.equal(typeof eventsFunction.onRequest, "function", "functions/api/events.js must export onRequest(context)");
assert.equal(typeof sourcesResponse.createSourcesResponse, "function", "src/api/sources-response.js must export createSourcesResponse(request)");
assert.equal(typeof providerHealthResponse.createProviderHealthResponse, "function", "src/api/provider-health-response.js must export createProviderHealthResponse(request, options)");
assert.equal(typeof worker.default?.fetch, "function", "src/worker.js must export a default fetch handler");

console.log("Cloudflare exports are valid.");
