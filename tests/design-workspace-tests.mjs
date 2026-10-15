import assert from 'node:assert/strict';
import { filteredEvents } from '../src/events/event-filters.js';
import { workspaceWindowEnd, workspaceCoverage, renderWatchEventCard } from '../src/ui/watch-workspace.js';
import { readMapView, writeMapView } from '../src/map/view-state.js';
import { webglAvailable } from '../src/map/cesium-adapter.js';
const end = Date.parse('2025-01-15T12:00:00Z');
const filters = { query:'', categories:new Set(['other']), severities:new Set(['low']) };
const event = (id, occurredAt) => ({ id, occurredAt, category:'other', severity:'low', title:id });
const events = [event('start',end-86400000), event('end',end), event('old',end-86400001), event('future',end+1), event('unknown',null)];
assert.deepEqual(filteredEvents(events, filters,24,'newest',end).map(e=>e.id).sort(), ['end','start','unknown']);
assert.equal(workspaceWindowEnd({events,sourceStatus:{},mapView:{asOf:'2025-01-15T12:00:00Z'}}),end);
assert.equal(workspaceWindowEnd({events,sourceStatus:{},mapView:{}}),end+1);
assert.notEqual(workspaceWindowEnd({events,sourceStatus:{x:{ok:true}},mapView:{}}),end);
assert.equal(workspaceCoverage({dataMode:'public',apiFailure:{kind:'offline-preview'}}).status,'historical');
assert.equal(workspaceCoverage({dataMode:'public',apiFailure:{kind:'timeout'}}).status,'unavailable');
assert.equal(readMapView(new URLSearchParams()).mapMode,'3d');
assert.equal(readMapView(new URLSearchParams('mapState=1')).mapMode,'2d');
for (const mode of ['2d','3d','auto']) {
  const p=new URLSearchParams();writeMapView(p,{mapMode:mode,asOf:new Date(end).toISOString(),lat:0,lon:0});
  assert.equal(readMapView(p).mapMode,mode);assert.equal(readMapView(p).asOf,new Date(end).toISOString());
}
assert.match(renderWatchEventCard({...event('epoch',0),sourceName:'Example'}),/1 Jan.*00:00 UTC/);
assert.match(renderWatchEventCard(event('undated',null)),/Time unknown/);
let created=0,released=0;
globalThis.document={createElement(){created++;return {getContext(){return {getExtension(name){assert.equal(name,'WEBGL_lose_context');return {loseContext(){released++;}};}};}};}};
for(let i=0;i<100;i++)assert.equal(webglAvailable(),true);
assert.equal(created,100);assert.equal(released,created);delete globalThis.document;
console.log('PASS historical interval boundaries, undated reports, available occurrence anchor, coverage failures, fresh and legacy map modes, URL round-trip and UTC occurrence labels');
