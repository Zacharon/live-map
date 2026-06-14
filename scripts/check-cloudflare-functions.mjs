import assert from "node:assert/strict";

const eventsFunction = await import("../functions/api/events.js");

assert.equal(typeof eventsFunction.onRequest, "function", "functions/api/events.js must export onRequest(context)");

console.log("Cloudflare Pages Functions exports are valid.");
