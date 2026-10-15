import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { normalizeSource } from '../src/beta/public-sources.js';
import { collectSources, readSnapshots } from '../src/beta/snapshot-service.js';
import { liveRecords } from '../src/candidates/intelligence-workbench/data/live-records.js';
import { matchesFilters, inRegion, recordClock, registerPage } from '../src/candidates/intelligence-workbench/application/record-filters.js';
const now=Date.parse('2026-10-02T17:15:00Z');
const gdacs=JSON.parse(await readFile('artifacts/evidence-ledger-2026-10-02/gdacs-raw.json'));
const swpc=JSON.parse(await readFile('artifacts/evidence-ledger-2026-10-02/swpc-raw.json'));
const adapt=events=>liveRecords({schema:'live-map-beta/1',mode:'live-beta',canonicalEvents:events});
test('Retained genuine GDACS reports keep IDs, source centroid meaning, null publication and original links',()=>{
  const actual=gdacs.features[0],e=normalizeSource('gdacs',{features:[actual]},now).events[0];
  assert.equal(e.providerEventId,`${actual.properties.eventtype}:${actual.properties.eventid}:${actual.properties.episodeid}`);
  assert.equal(e.longitude,actual.geometry.coordinates[0]);assert.equal(e.latitude,actual.geometry.coordinates[1]);
  assert.match(e.metadata.coordinateMethod,/not a measured position/);assert.equal(e.sourcePublishedAt,null);assert.equal(e.lastVerifiedAt,null);assert.equal(e.confidence,null);assert.equal(e.severity,null);
  assert.equal(e.startedAt,new Date(actual.properties.fromdate+'Z').toISOString());assert.equal(e.status,'unknown');assert.equal(e.metadata.sourceIsCurrent,actual.properties.iscurrent);assert.equal(e.metadata.details['Provider status'],undefined);
  assert.ok(e.links.some(l=>l.url===actual.properties.url.report));assert.ok(e.links.some(l=>l.url===actual.properties.url.details));
});
test('GDACS missing clocks stay unknown; polygons, nested/null/out-of-range points cannot create locations',()=>{
  const raw=structuredClone(gdacs.features[0]);delete raw.properties.fromdate;delete raw.properties.datemodified;
  const e=normalizeSource('gdacs',{features:[raw]},now).events[0];assert.equal(e.startedAt,null);assert.equal(e.updatedAt,null);
  for(const geometry of [{type:'Polygon',coordinates:[[[1,2],[3,4]]]},...[[null,2],['1',2],[181,2],[1,91],[[1,2],[3,4]]].map(coordinates=>({type:'Point',coordinates}))])assert.equal(normalizeSource('gdacs',{features:[{...raw,geometry}]},now).events.length,0);
});
test('NOAA actual notice preserves message and issue clock without an observation time or fake globe point',()=>{
  const raw=swpc[0],e=normalizeSource('swpc',[raw],now).events[0],r=adapt([e])[0];
  assert.equal(e.description,raw.message);assert.equal(e.metadata.productId,raw.product_id);assert.equal(e.geographic,false);assert.equal(e.latitude,null);assert.equal(e.startedAt,null);
  assert.equal(r.time.publishedAt,Date.parse(raw.issue_datetime.replace(' ','T')+'Z'));assert.equal(recordClock(r).label,'Issued');assert.equal(r.position.valid,false);
  assert.equal(normalizeSource('swpc',[{...raw,issue_datetime:'invalid'}],now).events.length,0);
});
test('Invalid calendar dates cannot roll into invented source clocks; legitimate UTC offsets survive',()=>{
  const raw=structuredClone(gdacs.features[0]);raw.properties.fromdate='2026-02-30T12:00:00';raw.properties.datemodified='2026-10-02T25:00:00';const e=normalizeSource('gdacs',{features:[raw]},now).events[0];assert.equal(e.startedAt,null);assert.equal(e.updatedAt,null);
  assert.equal(normalizeSource('swpc',[{...swpc[0],issue_datetime:'2026-02-30 12:00:00'}],now).events.length,0);
  const offset=normalizeSource('swpc',[{...swpc[0],issue_datetime:'2026-10-02T12:00:00+02:00'}],now).events[0];assert.equal(adapt([offset])[0].time.publishedAt,Date.parse('2026-10-02T10:00:00Z'));
});
test('Independent source/type/region/search/date filters work without a map selection, including issue-only records',()=>{
  const rows=adapt([...normalizeSource('gdacs',gdacs,now).events,...normalizeSource('swpc',swpc,now).events]);
  const base={source:'all',type:'all',region:'all',days:'all',search:''};
  const earthquakes=rows.filter(r=>matchesFilters(r,{...base,source:'gdacs',type:'earthquake'},now));assert.ok(earthquakes.length>0);assert.ok(earthquakes.every(r=>r.ref.source==='gdacs'&&r.category==='earthquake'));
  const notices=rows.filter(r=>matchesFilters(r,{...base,source:'swpc',region:'non-geographic',search:swpc[0].product_id},now));assert.ok(notices.length>0);
  const oldest=rows.find(r=>r.ref.source==='swpc'&&now-r.time.publishedAt>86400000);assert.ok(oldest);assert.equal(matchesFilters(oldest,{...base,days:'1'},now),false);
  for(const region of ['south-america','africa','asia','oceania'])assert.ok(rows.some(r=>inRegion(r,region)),region);
});
test('Named NWS alert types can be selected separately from the weather family',()=>{
  const events=normalizeSource('nws',{features:['Flood Warning','Heat Advisory'].map((event,i)=>({id:`type-${i}`,properties:{status:'Actual',event,effective:new Date(now-1000).toISOString(),sent:new Date(now-2000).toISOString(),geocode:{UGC:['FLZ125']}}}))},now).events;
  const rows=adapt(events),base={source:'nws',type:'nws:Flood Warning',region:'north-america',days:'all',search:''};assert.equal(rows.filter(r=>matchesFilters(r,base,now)).length,1);assert.equal(rows.filter(r=>matchesFilters(r,{...base,type:'weather'},now)).length,2);
});
test('Dateline region matching and U.S. alert area metadata do not fabricate point locations',()=>{
  const base={position:{valid:true,latitude:-20,longitude:175},time:{},countryCode:null};assert.equal(inRegion(base,'oceania'),true);assert.equal(inRegion({...base,position:{...base.position,longitude:-150}},'oceania'),true);
  assert.equal(inRegion({...base,countryCode:'US'},'north-america'),false);
  const area={...base,position:{valid:false},ref:{source:'nws'},metadata:{navigationRegions:['oceania']}};assert.equal(inRegion(area,'north-america'),false);assert.equal(inRegion(area,'oceania'),true);
});
test('Pagination exposes every match, clamps after narrowing and ignores viewport by default',()=>{
  const rows=Array.from({length:331},(_,i)=>({key:String(i).padStart(3,'0'),record:{time:{observedAt:i}},reason:i%2?'outside-viewport':'projected',renderable:i%2===0}));
  const seen=[];for(let page=0;page<7;page++){const result=registerPage(rows,{page});seen.push(...result.entries.map(r=>r.key));assert.equal(result.total,331);}assert.equal(new Set(seen).size,331);
  assert.equal(registerPage(rows.slice(0,3),{page:6}).page,0);assert.equal(registerPage(rows,{visibleOnly:true}).total,166);
});
test('New feed failure retains last success and read-only snapshots never invoke an upstream request',async()=>{
  const values=new Map(),storage={get:async key=>values.get(key)||null,set:async(key,value)=>{values.set(key,value);return true;}};let calls=0;
  await collectSources(storage,{now,ids:['gdacs','swpc'],fetchImpl:async url=>{calls++;return new Response(JSON.stringify(url.includes('gdacs')?gdacs:swpc));}});
  const before=calls;await readSnapshots(storage,now+1000);await collectSources(storage,{now:now+1000,ids:['gdacs','swpc'],fetchImpl:()=>{throw Error('must not call');}});assert.equal(calls,before);
  await collectSources(storage,{now:now+900001,ids:['gdacs','swpc'],fetchImpl:async()=>new Response('',{status:503})});const result=await readSnapshots(storage,now+900001);assert.equal(result.sourceStatus.gdacs.availability,'Stale');assert.equal(result.sourceStatus.swpc.availability,'Stale');assert.ok(result.canonicalEvents.length>0);
});
test('Source-provided links reject scripts and embedded credentials before reaching the UI',()=>{
  const raw=structuredClone(gdacs.features[0]);raw.properties.url={report:'javascript:alert(1)',details:'https://user:pass@example.com/',geometry:'https://www.gdacs.org/'};
  const e=normalizeSource('gdacs',{features:[raw]},now).events[0];assert.ok(e.links.every(l=>!l.url.includes('javascript:')&&!l.url.includes('user:pass')));
});
