import assert from "node:assert/strict";
import fs from "node:fs";
import { default as eventsFunction } from "../netlify/functions/events.mjs";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");

assert.match(html, /id="map"/);
assert.match(html, /id="eventList"/);
assert.match(html, /id="sourcesStatusPanel"/);
assert.match(html, /id="mapHealth"/);
assert.match(html, /vendor\/leaflet\/leaflet\.css/);
assert.match(css, /\.left-panel\{overflow-y:auto/);
assert.match(css, /\.event-list\{min-height:0;flex:1 1 auto;overflow-y:auto/);
assert.match(css, /\.map-health/);

const request = new Request("https://local.test/api/events?hours=24", { method: "GET" });
const response = await eventsFunction(request);
assert.equal(response.status, 200);
const payload = await response.json();
assert.ok(Array.isArray(payload.events));
assert.ok(payload.sourceRegistry?.["nws-alerts"]);
assert.ok(payload.providerSourceRegistry?.gdelt);
assert.ok(payload.domainSourceStatus?.weather);

console.log("E2E smoke checks passed.");
