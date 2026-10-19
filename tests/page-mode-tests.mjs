import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { readMapView } from '../src/map/view-state.js';
import { globePageHref } from '../src/map/globe-controller.js';
import { buildGlobePage } from '../scripts/build-globe-page.mjs';

for (const path of ['/', '/index.html']) {
  assert.equal(readMapView(new URLSearchParams(), path).mapMode, '2d');
}
for (const path of ['/globe', '/globe.html']) {
  assert.equal(readMapView(new URLSearchParams(), path).mapMode, '3d');
  assert.equal(readMapView(new URLSearchParams('mapState=1'), path).mapMode, '3d');
  assert.equal(readMapView(new URLSearchParams('mapMode=2d'), path).mapMode, '2d');
}
for (const mode of ['2d', '3d', 'auto']) {
  assert.equal(readMapView(new URLSearchParams('mapMode=' + mode), '/').mapMode, mode);
}
assert.equal(readMapView(new URLSearchParams('map=3d'), '/').mapMode, '3d');
assert.equal(readMapView(new URLSearchParams('mapMode=bogus'), '/').mapMode, '2d');

const index = fs.readFileSync('index.html', 'utf8');
assert.match(index, /value="2d" selected>2D map/);
assert.match(buildGlobePage(index), /value="3d" selected>3D globe/);

// Exercise actual serializer with state changed after initial load (saved-view path).
let location = new URL('https://example.test/?demo=foundation#selection');
globalThis.window = { location, history: { replaceState(_a, _b, url) { location = url; window.location = url; } } };
const { state, dashboardFilters, syncUrlState } = await import('../src/state.js');
state.hours = 72;
state.mapView = { ...state.mapView, lat: 26.4, lon: 56.2, zoom: 7, asOf: '2026-10-01T00:00:00.000Z', mapMode: '3d' };
state.mapMode = '3d';
dashboardFilters().domains.add('natural-disaster');
state.queryByDashboard.set(state.dashboard, 'test query');
syncUrlState();
const destination = new URL(globePageHref(location), location);
for (const key of ['lat','lon','zoom','asOf','hours','domains','q','demo','categories','severities','records']) {
  assert.equal(destination.searchParams.get(key), location.searchParams.get(key), key);
}
assert.equal(destination.pathname, '/globe.html');
assert.equal(destination.hash, '#selection');
assert.equal(destination.searchParams.get('mapMode'), '3d');

// Execute the real render entry guard: 3D redirects before renderer startup;
// 2D and globe-page 3D continue without a navigation loop.
const controller = fs.readFileSync('src/app-controller.js', 'utf8');
const guard = controller.split('  function render() {')[1].split('    const renderStarted=')[0];
for (const [mode, globe, expected] of [['3d', false, true], ['2d', false, false], ['3d', true, false], ['auto', false, false]]) {
  const calls = [];
  vm.runInNewContext('(function(){' + guard + '})()', {
    state: { mapMode: mode, mapView: { mapMode: mode } }, isGlobePage: () => globe,
    syncUrlState: () => calls.push('sync'), globePageHref: () => '/globe.html?state',
    window: { location: { assign: href => calls.push(href) } },
  });
  assert.deepEqual(calls, expected ? ['sync', 'sync', '/globe.html?state'] : []);
}
delete globalThis.window;
console.log('page-mode-tests: ok');
