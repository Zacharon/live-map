import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeNwsAlert, fetchNwsAlerts } from '../src/data/providers/nws.js';
import { toLegacyEvent } from '../src/events/normalized-event.js';
import { normalizeEvent } from '../src/events/event-normalizer.js';
import { globeEventEligible } from '../src/map/cesium-adapter.js';
import { renderEventDetailDrawer } from '../src/ui/osint-dashboard-v2/event-detail-drawer.js';
import { createEventsResponse } from '../src/api/events-response.js';
import { EVENT_PROVIDERS } from '../src/data/providers/registry.js';

const now = new Date('2026-06-08T00:30:00Z');
const fixture = { properties: { id:'no-geometry', event:'Heat Advisory', headline:'Heat Advisory', severity:'Moderate', urgency:'Expected', certainty:'Likely', areaDesc:'Test County', sent:'2026-06-08T00:00:00Z', web:'https://api.weather.gov/alerts/no-geometry' } };
const polygon = { type:'Polygon', coordinates:[[[-90,40],[-89,40],[-89,41],[-90,41],[-90,40]]] };
const point = { type:'Point', coordinates:[0,0] };
const browser = event => normalizeEvent(toLegacyEvent(event));

test('missing and invalid geometry retains alert without invented coordinates', () => {
  for (const geometry of [undefined, null, {}, {type:'Point',coordinates:[]}, {type:'Point',coordinates:[[0,0]]}, {type:'Point',coordinates:[0,0,[1,2]]}, {type:'Point',coordinates:[181,0]}, {type:'Point',coordinates:[0,91]}, {type:'Polygon',coordinates:[]}, {type:'Polygon',coordinates:[[[0,0]]]}, {type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,1]]]}, {type:'Polygon',coordinates:[[[0,0],[181,0]]]}, {type:'MultiPolygon',coordinates:[[[[0,91]]]]}, {type:'MultiPolygon',coordinates:[]}, {type:'LineString',coordinates:[[0,0],[1,1]]}]) {
    const event = normalizeNwsAlert({...fixture, geometry}, now).event;
    assert.ok(event); assert.equal(event.latitude, null); assert.equal(event.longitude, null);
    assert.equal(event.geographic, false); assert.equal(event.mapDisplayStatus, 'not-mapped');
    assert.match(event.nonGeographicReason, /geometry/i); assert.match(event.metadata.coordinateMethod, /geometry/i);
    assert.equal(event.id, 'nws-alerts:no-geometry'); assert.equal(event.region, 'Test County');
    assert.equal(event.countryCode, 'US'); assert.equal(event.sourceUrl, fixture.properties.web);
    assert.equal(event.startedAt, '2026-06-08T00:00:00.000Z'); assert.equal(event.sourcePublishedAt, event.startedAt);
    const view = browser(event); assert.equal(view.lat, null); assert.equal(view.lon, null);
    assert.equal(globeEventEligible(view), false); assert.match(renderEventDetailDrawer(view), /without a map pin/i);
  }
});

test('zero point and existing polygon remain mapped', () => {
  const zero = normalizeNwsAlert({...fixture, geometry:point}, now).event;
  assert.equal(zero.latitude, 0); assert.equal(zero.longitude, 0); assert.equal(globeEventEligible(browser(zero)), true);
  const area = normalizeNwsAlert({...fixture, geometry:polygon}, now).event;
  assert.equal(area.geographic, true); assert.equal(area.metadata.coordinateMethod, 'representative alert geometry centroid'); assert.deepEqual(area.geometry, polygon);
});

test('source clocks and recovery stay honest without mutating inputs', async () => {
  const missingClock = normalizeNwsAlert({properties:{...fixture.properties, sent:undefined}}, now).event;
  assert.equal(missingClock.startedAt, null); assert.equal(missingClock.updatedAt, null); assert.equal(missingClock.sourcePublishedAt, null); assert.equal(missingClock.freshnessScore, null);
  const old = normalizeNwsAlert({properties:{...fixture.properties, sent:'2020-01-01T00:00:00Z'}}, now).event;
  assert.equal(old.startedAt, '2020-01-01T00:00:00.000Z');
  const input = structuredClone(fixture); const before = structuredClone(input);
  for (const geometry of [null, point, null]) {
    const result = await fetchNwsAlerts({now, fetchJson:async () => ({features:[{...input, geometry}]})});
    assert.equal(result.rejected.length, 0); assert.equal(result.events.length, 1);
    assert.equal(result.events[0].id, 'nws-alerts:no-geometry'); assert.equal(result.events[0].geographic, geometry !== null);
  }
  assert.deepEqual(input, before);
});

test('synthetic API projection retains response envelope and source health', async () => {
  for (const geometry of [null, point, null]) {
    const normalized = await fetchNwsAlerts({now, fetchJson:async () => ({features:[{...fixture, geometry}]})});
    const overrides = EVENT_PROVIDERS.map(p => ({providerId:p.id, status:p.id === 'nws-alerts' ? 'healthy' : 'unavailable', events:p.id === 'nws-alerts' ? normalized.events : [], fetchedAt:now.toISOString(), lastSuccessfulAt:p.id === 'nws-alerts' ? now.toISOString() : null, recordCount:p.id === 'nws-alerts' ? 1 : 0, rejectedCount:0, cached:false, stale:false}));
    const response = await createEventsResponse(new Request('https://example.test/api/events'), {now:now.getTime(), env:{}, providerResultsOverride:overrides});
    assert.equal(response.status, 200); const body = await response.json();
    const expected = geometry ? 0 : null;
    assert.equal(body.canonicalEvents[0].latitude, expected); assert.equal(body.events[0].lat, expected);
    assert.equal(body.canonicalEvents[0].id, 'nws-alerts:no-geometry');
    assert.equal(body.sourceStatus['nws-alerts'].ok, true); assert.equal(body.providerResults.length, EVENT_PROVIDERS.length); assert.equal(body.providerResults.find(x => x.providerId === 'nws-alerts').recordCount, 1);
    assert.equal(body.systemStatus, 'partial-data'); assert.ok(Array.isArray(body.sources));
  }
});

const h3Rings = {
  mismatched3d: [[-90,40,1],[-89,40,1],[-89,41,1],[-90,40,2]],
  identical: [[5,6],[5,6],[5,6],[5,6]],
  collinear: [[0,0],[1,1],[2,2],[0,0]],
  mixedDimensions: [[-90,40,1],[-89,40],[-89,41,1],[-90,40,1]],
  closed3d: [[-90,40,1],[-89,40,1],[-89,41,1],[-90,40,1]],
};
for (const name of ['mismatched3d', 'identical', 'collinear', 'mixedDimensions']) {
  test(`malformed ${name} ring retains an unmapped alert`, () => {
    const geometry = {type:'Polygon', coordinates:[h3Rings[name]]};
    const input = {...structuredClone(fixture), geometry};
    const before = structuredClone(input);
    const event = normalizeNwsAlert(input, now).event;
    assert.ok(event);
    assert.equal(event.geographic, false);
    assert.equal(event.mapDisplayStatus, 'not-mapped');
    assert.equal(event.latitude, null);
    assert.equal(event.longitude, null);
    assert.deepEqual(input, before);
  });
}
test('closed 3D Polygon and MultiPolygon remain mapped', () => {
  for (const geometry of [
    {type:'Polygon', coordinates:[h3Rings.closed3d]},
    {type:'MultiPolygon', coordinates:[[h3Rings.closed3d]]},
  ]) {
    const input = {...structuredClone(fixture), geometry};
    const before = structuredClone(input);
    const event = normalizeNwsAlert(input, now).event;
    assert.equal(event.geographic, true);
    assert.equal(event.latitude, 40.25);
    assert.equal(event.longitude, -89.5);
    assert.deepEqual(input, before);
  }
});
