import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as satelliteApi from '../hosting/beta/node_modules/satellite.js/dist/index.js';
import { validElements, collectElements, calculatedSatellites } from '../src/beta/satellite-service.js';
import { liveRecords } from '../src/candidates/intelligence-workbench/data/live-records.js';
import { timeExclusion } from '../src/candidates/intelligence-workbench/core/time.js';
const seed=JSON.parse(await readFile(new URL('../hosting/beta/functions/lib/stations-seed.json',import.meta.url),'utf8'));
const now=Date.parse('2026-10-02T02:30:00Z');
function store(){let data=null;return {get:async()=>data,set:async(_,value)=>{data=value;return true;}};}
test('Genuine elements propagate with UTC epoch, finite physical km/m altitude and exact calculation clock',()=>{
  assert.equal(validElements(seed.elements).length,22);
  const data=calculatedSatellites({elements:seed.elements,lastSuccessAt:seed.retrievedAt},now,satelliteApi);
  assert.ok(data.events.length>0);const iss=data.events.find(e=>e.providerEventId==='25544');assert.ok(iss.calculatedHeightKm>100&&iss.calculatedHeightKm<600);
  const record=liveRecords({schema:'live-map-beta/1',mode:'live-beta',canonicalEvents:[iss]})[0];
  assert.equal(record.position.renderHeightMeters,iss.calculatedHeightKm*1000);assert.equal(record.valueOrigin,'calculated');assert.equal(record.time.observedAt,null);
  assert.equal(timeExclusion(record,{asOf:now,knownAt:now}),null);assert.equal(timeExclusion(record,{asOf:now-60000,knownAt:now}),'calculation-for-another-time');
  const moved=calculatedSatellites({elements:seed.elements,lastSuccessAt:seed.retrievedAt},now+60000,satelliteApi).events.find(e=>e.providerEventId==='25544');assert.notEqual(moved.longitude,iss.longitude);
});
test('Retained first genuine retrieval seeds once; two-hour cadence causes no repeated provider fetch',async()=>{
  const storage=store();let requests=0;const fetchImpl=async()=>{requests++;throw new Error('should not request');};
  await collectElements(storage,{seed,now,fetchImpl});await collectElements(storage,{seed,now:now+60000,fetchImpl});assert.equal(requests,0);assert.equal((await storage.get()).lastSuccessAt,seed.retrievedAt);
});
test('Any non200 halts further querying and retains real elements stale, while a first failure stays unavailable',async()=>{
  const storage=store();await collectElements(storage,{seed,now});let requests=0;const fetchImpl=async()=>{requests++;return new Response('',{status:403});};
  await collectElements(storage,{now:now+7200000,fetchImpl});await collectElements(storage,{now:now+14400000,fetchImpl});assert.equal(requests,1);assert.equal((await storage.get()).halted,true);assert.equal(calculatedSatellites(await storage.get(),now,satelliteApi).status.availability,'Stale');
  const empty=store();await collectElements(empty,{now,fetchImpl});assert.equal(calculatedSatellites(await empty.get(),now,satelliteApi).status.availability,'Unavailable');
});
test('Invalid orbital fields and elements older than48h never create source-like positions',()=>{
  assert.equal(validElements([{...seed.elements[0],ECCENTRICITY:null},{...seed.elements[0],EPOCH:4}]).length,0);
  const data=calculatedSatellites({elements:seed.elements,lastSuccessAt:seed.retrievedAt},now+72*3600000,satelliteApi);assert.equal(data.events.length,0);assert.ok(data.status.staleEpochCount>0);
  const failed=calculatedSatellites({elements:seed.elements,lastSuccessAt:seed.retrievedAt},now,{json2satrec(){throw new Error('propagation unavailable');}});
  assert.equal(failed.status.availability,'Unavailable');assert.equal(failed.events.length,0);
});
test('Atomic retrieval reservation prevents overlapping collectors querying the same two-hour update',async()=>{
  let data=null,version=0,requests=0,release,started;
  const begin=new Promise(resolve=>{started=resolve;}),gate=new Promise(resolve=>{release=resolve;});
  const adapter=()=>{let readVersion;return {get:async()=>{readVersion=version;return data;},set:async(_,value)=>{if(readVersion!==version)return false;data=value;version++;return true;}};};
  const fetchImpl=async()=>{requests++;started();await gate;return Response.json(seed.elements);};
  const first=collectElements(adapter(),{now,fetchImpl});await begin;
  const second=await collectElements(adapter(),{now,fetchImpl});assert.equal(second.skipped,true);release();await first;
  assert.equal(requests,1);assert.equal(data.halted,false);assert.equal(data.elements.length,22);
});
