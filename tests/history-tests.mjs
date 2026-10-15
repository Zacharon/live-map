import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { historySnapshot } from '../data/history/september-2024/snapshot.js';
import { readHistory, historyWindow } from '../src/data/history-repository.js';
import { createEventsResponse } from '../src/api/events-response.js';
import { selectDisplayClusters } from '../src/map/display-clusters.js';
import { filteredEvents } from '../src/events/event-filters.js';
import { readFile } from 'node:fs/promises';
import { buildEventClusters } from '../src/events/clustering.js';
import { renderClusterDetailDrawer, renderEventDetailDrawer } from '../src/ui/osint-dashboard-v2/event-detail-drawer.js';
import { normalizeEvent } from '../src/events/event-normalizer.js';
const params=new URLSearchParams('period=history&start=2024-09-01&end=2024-09-30');
assert.equal(createHash('sha256').update(JSON.stringify(historySnapshot.records)).digest('hex'),historySnapshot.manifest.recordSha256);
assert.equal(historySnapshot.records.length,1202);
assert.equal(historySnapshot.records.filter(e=>e.provider==='usgs').length,481);
assert.equal(historySnapshot.records.filter(e=>e.provider==='eonet').length,721);
assert.throws(()=>historyWindow(new URLSearchParams('start=2024-02-30')));
assert.throws(()=>historyWindow(new URLSearchParams('start=2024-09-05&end=2024-09-02')));
assert.throws(()=>historyWindow(new URLSearchParams('cursor=2024-10-01')));
const full=readHistory(params);assert.equal(full.events.length,1202);
const early=readHistory(new URLSearchParams('period=history&start=2024-09-01&end=2024-09-30&cursor=2024-09-10'));
assert(early.events.length<full.events.length);
for(const e of early.canonicalEvents){if(e.provider==='eonet'){
  assert.equal(e.startedAt,null);assert.equal(e.updatedAt,null);assert.equal(e.sourcePublishedAt,null);
  assert(e.metadata.observationSeries.every(o=>Date.parse(o.observedAt)<=early.history.cursorMs));
  const last=e.metadata.observationSeries.filter(o=>Date.parse(o.observedAt)>=early.history.startMs).at(-1);
  assert.equal(e.latitude,last.point.latitude);assert.equal(e.longitude,last.point.longitude);
}else assert(Date.parse(e.startedAt)<=early.history.cursorMs);}
assert.equal(readHistory(new URLSearchParams('start=2024-10-01&end=2024-10-31')).events.length,0);
const synthetic={manifest:historySnapshot.manifest,records:[{...historySnapshot.records[0],startedAt:'2024-09-01T00:00:00.000Z'},{...historySnapshot.records[0],id:'boundary:end',startedAt:'2024-09-30T23:59:59.999Z'},{...historySnapshot.records[0],id:'boundary:after',startedAt:'2024-10-01T00:00:00.000Z'}]};
assert.equal(readHistory(params,synthetic).events.length,2);
const sample=full.events.map(normalizeEvent);const categories=new Set(sample.map(e=>e.category)), severities=new Set(sample.map(e=>e.severity));
assert.equal(filteredEvents(sample,{categories,severities,query:''},168,'newest',{period:'history'}).length,1202);
assert.equal(filteredEvents(sample,{categories,severities,query:''},168,'newest').length,721); // EONET onset remains unknown, never fabricated recent.
const selected=sample.find(e=>e.provider==='usgs');
const display=selectDisplayClusters(sample,{zoom:3,selectedId:selected.id});
assert.equal(display.represented,1202);assert(display.displayed.length<1202);assert(display.displayed.some(e=>e.id===selected.id));
for(const e of display.displayed.filter(e=>e._displayCluster)){assert.deepEqual([e.lat,e.lon],[sample.find(m=>m.id===e.memberIds[0]).lat,sample.find(m=>m.id===e.memberIds[0]).lon]);}
const outOfArea=Array.from({length:10000},(_,i)=>({...selected,id:'outside:'+i,lat:0,lon:0}));
const regional=selectDisplayClusters([...outOfArea,{...selected,id:'in-region',lat:35,lon:-118}],{zoom:12,bbox:{south:34,north:36,west:-119,east:-117}});
assert.equal(regional.displayed[0].id,'in-region');assert.equal(regional.eligible,1);
for(const id of ['usgs','eonet']) {const raw=await readFile(new URL(`../data/history/september-2024/${id}-response.json`,import.meta.url));assert.equal(createHash('sha256').update(raw).digest('hex'),historySnapshot.manifest.providers[id].sha256);}
const cluster=buildEventClusters(sample)[0];assert(cluster);assert.doesNotThrow(()=>renderClusterDetailDrawer(cluster,{allEvents:sample}));
const detail=renderEventDetailDrawer(selected,{allEvents:sample,clusters:[]});assert.equal((detail.match(/data-v2-focus-selection/g)||[]).length,1);
const oldFetch=globalThis.fetch;globalThis.fetch=()=>{throw new Error('History API must not query live providers')};
const response=await createEventsResponse(new Request('http://localhost/api/events?period=history'));assert.equal(response.status,200);const body=await response.json();for(const key of ['events','canonicalEvents','sourceRegistry','providerSourceRegistry','domainSourceStatus','observationSummary','sourceStatus','history','filters','warnings'])assert(key in body,key);assert.equal(body.hours,null);assert.equal(body.events.length,1202);
assert.equal((await createEventsResponse(new Request('http://localhost/api/events?period=history&start=bad'))).status,400);
globalThis.fetch=oldFetch;
console.log(`PASS real archive identity, ${full.events.length} records, date inclusivity, cursor (${early.events.length}), no future EONET observations, no recent cutoff, viewport-before-budget, source-backed cluster anchors and offline API.`);
