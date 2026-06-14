import assert from "node:assert/strict";

const eventsFunction = await import("../functions/api/events.js");
const worker = await import("../src/worker.js");

assert.equal(typeof eventsFunction.onRequest, "function", "functions/api/events.js must export onRequest(context)");
assert.equal(typeof worker.default?.fetch, "function", "src/worker.js must export a default fetch handler");

console.log("Cloudflare exports are valid.");
