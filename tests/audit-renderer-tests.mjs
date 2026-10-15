import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { renderMarkers } from "../src/map/marker-renderer.js";
import { createEventsResponse } from "../src/api/events-response.js";
import { EVENT_PROVIDERS } from "../src/data/providers/registry.js";
import { fetchFredEvents } from "../src/data/providers/fred.js";
import { fetchEiaEvents } from "../src/data/providers/eia.js";
import { fetchSecEdgarEvents } from "../src/data/providers/sec-edgar.js";
import { workspaceStorage } from "../src/ui/workspace-storage.js";
import { createNormalizedEvent } from "../src/events/normalized-event.js";

let creates = 0;
globalThis.L = {
  divIcon: (value) => value,
  marker: (position, options) => {
    creates++;
    return { position, options, on(name, callback) { this[name] = callback; return this; }, bindTooltip(value) { this.tooltip = value; return this; }, setLatLng(value) { this.position = value; }, setIcon(value) { this.icon = value; }, setOpacity(value) { this.opacity = value; }, setZIndexOffset(value) { this.z = value; } };
  },
  geoJSON: () => ({ on() { return this; }, bindTooltip() { return this; } }),
};
const layer = () => ({ items: new Set(), addLayer(item) { this.items.add(item); }, removeLayer(item) { this.items.delete(item); }, clearLayers() { throw new Error("Whole-layer rebuild is forbidden"); } });
const normal = layer(), priority = layer();
let clicked;
const event = { id: "a", title: "A", lat: 0, lon: 0, severity: "low", category: "other", geographic: true, occurredAt: 0 };
assert.equal(renderMarkers(normal, [event], (e) => { clicked = e; }, { priorityLayer: priority }).created, 1);
const marker = [...normal.items][0];
assert.equal(renderMarkers(normal, [{ ...event }], (e) => { clicked = e; }, { priorityLayer: priority }).retained, 1);
assert.equal(renderMarkers(normal, [{ ...event, title: "Revised" }], (e) => { clicked = e; }, { priorityLayer: priority, selectedEventId: "a" }).updated, 1);
assert.equal(priority.items.has(marker), true);
assert.equal(normal.items.size, 0);
marker.click();
assert.equal(clicked.title, "Revised");
assert.equal(creates, 1);
assert.equal(renderMarkers(normal, [], () => {}, { priorityLayer: priority }).removed, 1);
assert.equal(priority.items.size, 0);
console.log("PASS stable marker identity, latest pick data, priority move, removal, no full clears");

const stress = Array.from({ length: 240 }, (_, i) => ({ ...event, id: String(i), lat: i % 80, lon: i % 170 }));
renderMarkers(normal, stress, () => {}, { priorityLayer: priority });
const before = creates, durations = [];
for (let i = 0; i < 100; i++) {
  const start = performance.now();
  const result = renderMarkers(normal, stress, () => {}, { priorityLayer: priority });
  durations.push(performance.now() - start);
  assert.equal(result.created, 0); assert.equal(result.retained, 240);
}
assert.equal(creates, before);
durations.sort((a, b) => a - b);
console.log(`PASS 100 unchanged 240-marker updates: 0 new markers; mock synchronous p95 ${durations[94].toFixed(2)} ms (not browser FPS)`);

const originalEnv = process.env;
const overrides = EVENT_PROVIDERS.map((provider) => ({ providerId: provider.id, events: [], canonicalEvents: [], status: "configuration-required", ok: false, requestAttempted: false }));
const requests = ["false", "true"].map((value) => createEventsResponse(new Request("https://local.test/api/events"), { env: { GDELT_ENABLED: value }, providerResultsOverride: overrides }));
assert.equal(process.env, originalEnv);
const responses = await Promise.all(requests);
assert.ok(responses.every((response) => response.status === 200));
assert.equal(process.env, originalEnv);
for (const provider of [fetchFredEvents, fetchEiaEvents, fetchSecEdgarEvents]) {
  const result = await provider({ env: {}, now: Date.now(), fetchJson() { throw new Error("Disabled provider queried"); } });
  assert.equal(result.requestAttempted, false);
}
console.log("PASS concurrent API requests retain process.env identity and explicit empty provider environments stay disabled");

const { event: undated } = createNormalizedEvent({ id: 'undated-probe', provider: 'usgs', title: 'Undated provider record', category: 'earthquake', latitude: 0, longitude: 0, severity: 45, sourceUrl: 'https://example.com/undated', ingestedAt: new Date().toISOString() });
const undatedResponse = await createEventsResponse(new Request('https://local.test/api/events'), { env: {}, providerResultsOverride: overrides.map((result) => result.providerId === 'usgs' ? { ...result, ok: true, status: 'operational', events: [undated], canonicalEvents: [undated] } : result) });
const undatedPayload = await undatedResponse.json();
assert.equal(undatedPayload.events.find((item) => item.id === 'undated-probe')?.occurredAt, null);
assert.equal(undatedPayload.canonicalEvents.find((item) => item.id === 'undated-probe')?.startedAt, null);
console.log('PASS undated canonical record survives orchestration and API projection without an invented occurrence');

Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("Blocked storage"); } });
assert.equal(workspaceStorage.getItem("test"), null);
assert.equal(workspaceStorage.setItem("test", "value"), false);
delete globalThis.localStorage;
console.log("PASS blocked storage fails softly");
delete globalThis.L;
