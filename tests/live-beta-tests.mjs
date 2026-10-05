import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeSource, publicUrl, SOURCE_POLICY, fetchSourceJson } from '../src/beta/public-sources.js';
import { collectSources, readSnapshots, sourceState } from '../src/beta/snapshot-service.js';
import { liveRecords } from '../src/candidates/intelligence-workbench/data/live-records.js';
import { timeExclusion } from '../src/candidates/intelligence-workbench/core/time.js';
const now=Date.parse('2026-10-01T12:00:00Z');
const feature=(overrides={})=>({id:'us-test-1',geometry:{type:'Point',coordinates:[0,0,12.5]},properties:{time:now-60000,updated:now-30000,mag:4.1,status:'reviewed',place:'Test source location',url:'https://earthquake.usgs.gov/earthquakes/eventpage/us-test-1'},...overrides});
function memoryBackend(){const values=new Map();return ()=>{const read=new Map();return {async get(id){const old=values.get(id);read.set(id,old?.version||0);return old?structuredClone(old.value):null;},async set(id,value){const old=values.get(id);if((old?.version||0)!==read.get(id))return false;values.set(id,{version:(old?.version||0)+1,value:structuredClone(value)});return true;}};};}
const jsonResponse=data=>new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
test('USGS actual source ID and occurrence/revision survive; km depth is not ellipsoid height',()=>{
  const normalized=normalizeSource('usgs',{features:[feature()]},now);const e=normalized.events[0];assert.equal(e.providerEventId,'us-test-1');assert.equal(e.startedAt,new Date(now-60000).toISOString());assert.equal(e.updatedAt,new Date(now-30000).toISOString());assert.equal(e.metadata.depthKm,12.5);
  const r=liveRecords({schema:'live-map-beta/1',mode:'live-beta',canonicalEvents:[e]})[0];assert.equal(r.position.latitude,0);assert.equal(r.position.longitude,0);assert.equal(r.position.renderHeightMeters,null);assert.equal(r.time.receivedAt,now);
});
test('USGS null/malformed coordinates and missing IDs are rejected; unknown depth remains unknown',()=>{
  const data=normalizeSource('usgs',{features:[feature({geometry:{type:'Point',coordinates:[null,0,0]}}),feature({id:null}),feature({geometry:{type:'Point',coordinates:[0,0,null]}})]},now);assert.equal(data.rejectedCount,2);assert.equal(data.events.length,1);assert.equal(data.events[0].metadata.depthKm,null);
});
test('NWS Actual alerts retain named area, effective/sent/expiry and original polygon without an invented point',()=>{
  const geometry={type:'Polygon',coordinates:[[[-100,35],[-99,35],[-99,36],[-100,35]]]};const raw={id:'https://api.weather.gov/alerts/test',geometry,properties:{status:'Actual',event:'Flood Warning',effective:new Date(now-1000).toISOString(),sent:new Date(now-2000).toISOString(),expires:new Date(now+1000).toISOString(),areaDesc:'Test area'}};
  const data=normalizeSource('nws',{features:[raw,{...raw,id:'exercise',properties:{...raw.properties,status:'Exercise'}}]},now);assert.equal(data.events.length,1);assert.equal(data.events[0].latitude,null);assert.equal(data.events[0].longitude,null);assert.deepEqual(data.events[0].geometry,geometry);assert.equal(data.events[0].locationName,'Test area');assert.equal(data.rejectedCount,1);
});
test('EONET missing date and polygon cannot become collection-time point observations',()=>{
  const common={id:'EONET_test',title:'Reported event',categories:[{title:'Wildfires'}],sources:[{url:'https://eonet.gsfc.nasa.gov/'}]};
  const data=normalizeSource('eonet',{events:[{...common,geometry:[{type:'Point',coordinates:[10,20]}]},{...common,geometry:[{type:'Polygon',date:new Date(now).toISOString(),coordinates:[[[10,20],[11,21]]]}]},{...common,geometry:[{type:'Point',date:new Date(now-1000).toISOString(),coordinates:[10,20]}]}]},now);assert.equal(data.events.length,1);assert.equal(data.rejectedCount,2);assert.equal(data.events[0].startedAt,new Date(now-1000).toISOString());
});
test('Separate collector/read invocations share cache; readers and not-due collectors make no upstream requests',async()=>{
  const backend=memoryBackend();let requests=0;const fetchImpl=async()=>{requests++;return jsonResponse({features:[feature()]});};
  await collectSources(backend(),{now,fetchImpl,ids:['usgs']});const a=await readSnapshots(backend(),now+1000);const b=await readSnapshots(backend(),now+2000);await collectSources(backend(),{now:now+2000,fetchImpl,ids:['usgs']});assert.equal(requests,1);assert.equal(a.canonicalEvents[0].id,b.canonicalEvents[0].id);assert.equal(a.sourceStatus.usgs.availability,'Fresh');
});
test('Upstream failure keeps last good real record stale; empty first failure stays unavailable and backs off',async()=>{
  const backend=memoryBackend();await collectSources(backend(),{now,fetchImpl:async()=>jsonResponse({features:[feature()]}),ids:['usgs']});const fail=async()=>new Response('error',{status:503});
  await collectSources(backend(),{now:now+300001,fetchImpl:fail,ids:['usgs']});const old=await readSnapshots(backend(),now+300001);assert.equal(old.sourceStatus.usgs.availability,'Stale');assert.equal(old.canonicalEvents[0].providerEventId,'us-test-1');assert.equal(old.canonicalEvents[0].sourceAvailability,'Stale');
  const empty=memoryBackend();await collectSources(empty(),{now,fetchImpl:fail,ids:['usgs']});const missing=await readSnapshots(empty(),now);assert.equal(missing.sourceStatus.usgs.availability,'Unavailable');assert.equal(missing.canonicalEvents.length,0);assert.equal(missing.sourceStatus.usgs.error,'HTTP 503');assert.ok(missing.sourceStatus.usgs.nextAttemptAt>now);
});
test('Overlapping collector uses conditional write; slow earlier response cannot overwrite newer success',async()=>{
  const backend=memoryBackend();let release,started;const start=new Promise(resolve=>{started=resolve;});const gate=new Promise(resolve=>{release=resolve;});
  const slow=collectSources(backend(),{now,ids:['usgs'],fetchImpl:async()=>{started();await gate;return jsonResponse({features:[feature()]});}});await start;
  await collectSources(backend(),{now:now+1000,ids:['usgs'],fetchImpl:async()=>jsonResponse({features:[feature({id:'us-newer'})]})});release();const result=await slow;assert.equal(result.usgs.written,false);assert.equal((await readSnapshots(backend(),now+1000)).canonicalEvents[0].providerEventId,'us-newer');
});
test('Public links reject script schemes and embedded credentials',()=>{assert.equal(publicUrl('javascript:alert(1)'),null);assert.equal(publicUrl('https://user:pass@example.com'),null);assert.equal(publicUrl('https://earthquake.usgs.gov/'),'https://earthquake.usgs.gov/');});
test('Provider time is not manufactured when missing and historical cutoff cannot imply retained revisions',()=>{const e=normalizeSource('usgs',{features:[feature({properties:{mag:4,status:'reviewed'}})]},now).events[0];assert.equal(e.startedAt,null);const r=liveRecords({schema:'live-map-beta/1',mode:'live-beta',canonicalEvents:[e]})[0];assert.equal(timeExclusion(r,{asOf:now,knownAt:now}),'unknown-observation-time');});
test('Bounded fetch rejects oversized and redirect/error responses',async()=>{await assert.rejects(fetchSourceJson({...SOURCE_POLICY.usgs,maxBytes:10},async()=>jsonResponse({features:[feature()]})),/response-too-large/);await assert.rejects(fetchSourceJson(SOURCE_POLICY.usgs,async()=>new Response('',{status:429})),/HTTP 429/);});
test('Live adapter refuses demo or malformed envelopes',()=>{assert.throws(()=>liveRecords({mode:'demo',canonicalEvents:[]}));assert.throws(()=>liveRecords(null));});
test('Malformed EONET Point arrays and out-of-range or null values never become averaged coordinates',()=>{
  const geometry=coordinates=>({type:'Point',date:new Date(now).toISOString(),coordinates});
  const events=[[[10,20],[12,22]],[181,10],[10,91],[null,10],['10',20]].map((coordinates,i)=>({id:`invalid-${i}`,geometry:[geometry(coordinates)]}));
  assert.equal(normalizeSource('eonet',{events},now).events.length,0);
});
test('Primary source beta does not expose adapter confidence, severity or verification heuristics as measurements',()=>{
  const e=normalizeSource('usgs',{features:[feature()]},now).events[0];
  for(const key of ['severity','confidence','attentionScore','freshnessScore','qualityReasons'])assert.equal(e[key],null);
  assert.equal(e.verificationStatus,'not-reviewed');assert.equal(e.metadata.tsunami,null);
  assert.equal(e.metadata.details.Tsunami,undefined);
  const report=normalizeSource('eonet',{events:[{id:'dated',title:'Reported event',geometry:[{type:'Point',date:new Date(now).toISOString(),coordinates:[10,20]}]}]},now).events[0];
  assert.equal(report.sourcePublishedAt,null);assert.equal(report.startedAt,new Date(now).toISOString());
  const n=normalizeSource('nws',{features:[{id:'missing-expiry',properties:{status:'Actual',effective:new Date(now).toISOString()}}]},now).events[0];
  assert.equal(liveRecords({schema:'live-map-beta/1',mode:'live-beta',canonicalEvents:[n]})[0].time.validTo,null);
});
