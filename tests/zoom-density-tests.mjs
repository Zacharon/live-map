import assert from 'node:assert/strict';
import { selectMapEvents } from '../src/map/attention-policy.js';

const events = ['critical', 'high', 'medium', 'low', 'unknown'].map((severity, i) => ({
  id: severity, severity, lat: 0, lon: 0, occurredAt: i,
}));
const ids = result => result.displayed.map(e => e.id);
for (const zoom of [2, 3.99]) {
  const result = selectMapEvents(events, { zoom });
  assert.deepEqual(ids(result), ['critical', 'high']);
  assert.equal(result.hiddenByScale, 3);
  assert.equal(result.hiddenByBudget, 0);
}
for (const zoom of [4, 6.99]) assert.deepEqual(ids(selectMapEvents(events, { zoom })), ['critical', 'high', 'medium']);
assert.deepEqual(ids(selectMapEvents(events, { zoom: 7 })), events.map(e => e.id));
assert.equal(selectMapEvents(events.slice(2), { zoom: 2 }).displayed.length, 0, 'Do not fill a quiet world with minor events');
const selected = selectMapEvents(events, { zoom: 2, selectedId: 'low' });
assert.deepEqual(ids(selected), ['critical', 'high', 'low']);
assert.equal(selected.hiddenByScale, 2);
assert.ok(selected.selectionIncluded);
assert.match(selected.explanation, /Inspected event retained/);
assert.equal(selectMapEvents([events[3]], { selectedId: 'low' }).displayed.length, 1);
assert.ok(!ids(selectMapEvents(events.slice(0, 3), { selectedId: 'low' })).includes('low'), 'Selection cannot bypass filters');
assert.equal(selectMapEvents(events, { selectedId: 'low', bbox: { south: 1, north: 2, west: 1, east: 2 } }).displayed.length, 0);
const dense = Array.from({ length: 300 }, (_, i) => ({ ...events[0], id: `major-${i}` }));
for (const [zoom, budget] of [[2, 18], [4, 80], [7, 240]]) {
  const input = [...dense, events[3]];
  const result = selectMapEvents(input, { zoom, selectedId: 'low' });
  assert.equal(result.displayed.length, budget);
  assert.ok(ids(result).includes('low'));
  assert.equal(result.displayed.length + result.hiddenByScale + result.hiddenByBudget, input.length);
  assert.deepEqual(ids(result), ids(selectMapEvents(input.toReversed(), { zoom, selectedId: 'low' })));
}
assert.equal(selectMapEvents([{ ...events[0], geographic: false }]).displayed.length, 0);
const sourced = Object.freeze({ ...events[0], sourceName: 'Existing provider', sourceUrl: 'https://example.com/event', updatedAt: 123, verificationStatus: 'Reported', coordinateMethod: 'Approximate region' });
const immutableInput = Object.freeze([sourced]);
for (const zoom of [2, 4, 7]) assert.equal(selectMapEvents(immutableInput, { zoom }).displayed[0], sourced, 'Keep original provenance, freshness and geography unchanged');
console.log('Zoom-density tests passed: thresholds, quiet world, progressive reveal, selection, filters, viewport, budgets and stable ordering.');
