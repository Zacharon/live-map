import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ENERGY_DIMENSIONS,normalizeEnergyEvidence,buildEnergyState,energyTimestamp} from '../src/intelligence/energy-state.js';
import {createNormalizedEvent,toLegacyEvent} from '../src/events/normalized-event.js';
import {normalizeEiaRecord} from '../src/data/providers/eia.js';
import {normalizeFredObservation} from '../src/data/providers/fred.js';
import {EIA_DATASETS,FRED_SERIES_ALLOWLIST} from '../src/data/providers/finance-commodity-config.js';
import {createEventsResponse} from '../src/api/events-response.js';
import {EVENT_PROVIDERS} from '../src/data/providers/registry.js';
import {liveRecords} from '../src/candidates/intelligence-workbench/data/live-records.js';
import {matchesFilters} from '../src/candidates/intelligence-workbench/application/record-filters.js';
const now=Date.parse('2026-10-04T16:00:00Z');
const fixture=(dimension,extra={})=>createNormalizedEvent({id:'test:'+dimension,provider:'test',title:'Synthetic energy contract test',category:'commodity',type:'energy-evidence',geographic:false,startedAt:'2026-10-04T10:00:00Z',ingestedAt:'2026-10-04T11:00:00Z',sourcePublishedAt:'2026-10-04T10:30:00Z',sourceUrl:'https://example.org/test',energy:{dimension,stage:ENERGY_DIMENSIONS.find(d=>d.id===dimension)?.stages[0],value:1,units:'test units',commodity:'test commodity',...extra}}).event;
test('Six energy families exist independently; a policy target cannot fill physical supply',()=>{
  const state=buildEnergyState([fixture('PRODUCTION_POLICY',{period:'2026-11'})],{asOf:now});
  assert.equal(Object.keys(state.dimensions).length,6);assert.equal(state.dimensions.PRODUCTION_POLICY.records.length,1);
  for(const d of ENERGY_DIMENSIONS.filter(d=>d.id!=='PRODUCTION_POLICY'))assert.equal(state.dimensions[d.id].status,'unknown');
  assert.equal(state.dimensions.PRODUCTION_POLICY.records[0].energy.period,'2026-11');
});
test('Explicit evidence routes only to its own family and never sums incompatible quantities',()=>{
  const rows=ENERGY_DIMENSIONS.map(d=>fixture(d.id));const state=buildEnergyState(rows,{asOf:now});
  for(const d of ENERGY_DIMENSIONS){assert.equal(state.dimensions[d.id].records.length,1);assert.equal(state.dimensions[d.id].value,undefined);}
  assert.equal(buildEnergyState([{...rows[0],title:'Produced exported delivered oil'}],{asOf:now}).dimensions.ACTUAL_OUTPUT.status,'unknown');
});
test('Announcements, allocations, withdrawals and deliveries cannot substitute for one another',()=>{
  const state=buildEnergyState(['ANNOUNCED','ALLOCATED','WITHDRAWN','DELIVERED'].map((stage,i)=>({...fixture('EMERGENCY_STOCK_RELEASE',{stage}),id:'stage:'+i})),{asOf:now});
  assert.deepEqual(state.dimensions.EMERGENCY_STOCK_RELEASE.records.map(r=>r.energy.stage),['ANNOUNCED','ALLOCATED','WITHDRAWN','DELIVERED']);
  assert.equal(normalizeEnergyEvidence({dimension:'PRODUCTION_POLICY',stage:'DELIVERED'}).stage,null);
});
test('Missing, invalid and zero amounts retain their actual meaning; generic inventory is unclassified',()=>{
  assert.equal(normalizeEnergyEvidence({dimension:'unknown'}),null);
  for(const value of [null,'',false,[],{},undefined])assert.equal(normalizeEnergyEvidence({dimension:'ACTUAL_OUTPUT',value}).value,null);
  assert.equal(normalizeEnergyEvidence({dimension:'ACTUAL_OUTPUT',value:0}).value,0);
  assert.equal(createNormalizedEvent({...fixture('ACTUAL_OUTPUT'),energy:null,metadata:{},title:'Emergency stock release'}).event.energy,null);
});
test('Future occurrence, publication, receipt, unknown knowledge and withdrawn rows cannot fill past state',()=>{
  const valid=fixture('PRODUCTION_POLICY');
  for(const change of [{startedAt:now+1},{sourcePublishedAt:now+1},{ingestedAt:now+1},{ingestedAt:null},{withdrawn:true}])assert.equal(buildEnergyState([{...valid,...change}],{asOf:now}).dimensions.PRODUCTION_POLICY.status,'unknown');
  assert.equal(buildEnergyState([{...valid,stale:true}],{asOf:now}).dimensions.PRODUCTION_POLICY.records[0].availability,'Stale');
});
test('Real configured stock datasets are stock-level changes, never emergency releases',()=>{
  for(const dataset of EIA_DATASETS.filter(d=>d.id.includes('stocks')||d.id.includes('storage'))){
    const result=normalizeEiaRecord(dataset,{period:'2026-10-02',value:10000,updated:'2026-10-03'},{period:'2026-09-25',value:0,updated:'2026-09-26'},new Date(now));
    assert.equal(result.event.type,'inventory-level-change');assert.equal(result.event.energy,null);assert.equal(result.observation.energy,null);
  }
});
test('EIA reported generation keeps commodity, units and period; event plus observation counts once',()=>{
  const dataset=EIA_DATASETS.find(d=>d.id==='electricity-generation');
  const result=normalizeEiaRecord(dataset,{period:'2026-10-03',value:100,units:'megawatthours',updated:'2026-10-04T09:00:00Z'},{value:10,updated:'2026-10-03T09:00:00Z'},new Date(now));
  assert.equal(result.event.energy.stage,'REPORTED');assert.equal(result.observation.energy.commodity,'electricity');
  const state=buildEnergyState([result.event,result.observation],{asOf:now});assert.equal(state.dimensions.ACTUAL_OUTPUT.records.length,1);assert.equal(state.dimensions.TRANSIT_FLOW.status,'unknown');
});
test('FRED benchmark prices stay distinct from retail prices, and neither supplies a local shop quote',()=>{
  for(const id of ['DCOILBRENTEU','GASREGW']){
    const result=normalizeFredObservation(FRED_SERIES_ALLOWLIST.find(s=>s.id===id),{date:'2026-10-03',value:'100',realtime_start:'2026-10-04'},{value:'90'}, {units:'source units'},new Date(now));
    assert.equal(result.observation.energy.priceBasis,id==='GASREGW'?'RETAIL':'BENCHMARK');assert.notEqual(result.observation.energy.priceBasis,'LOCAL_QUOTE');
    assert.equal(buildEnergyState([result.event,result.observation],{asOf:now}).dimensions.RETAIL_WHOLESALE_PRICE.records.length,1);
  }
});
test('Canonical, legacy, beta record mapping and combined register filters retain explicit energy metadata',()=>{
  const event=fixture('TRANSIT_FLOW',{stage:'AIS_ESTIMATE',value:0,units:'calls',scope:'test route'});assert.equal(toLegacyEvent(event).energy.stage,'AIS_ESTIMATE');
  const [record]=liveRecords({schema:'live-map-beta/1',mode:'live-beta',canonicalEvents:[{...event,providerEventId:event.id,dataKind:'Reported',collectionTime:event.ingestedAt}]});
  assert.equal(record.position.valid,false);assert.equal(record.energy.value,0);
  const filters={source:'test',type:'all',region:'non-geographic',days:'all',search:'',energy:'TRANSIT_FLOW'};
  assert.equal(matchesFilters(record,filters,now),true);assert.equal(matchesFilters(record,{...filters,energy:'EXPORT_LOADINGS'},now),false);
});
test('FRED missing scalars and containers stay unknown without fabricating material changes',()=>{
  const config=FRED_SERIES_ALLOWLIST.find(s=>s.id==='DCOILBRENTEU');
  for(const value of ['', ' ', false, true, [], [12], {}, null, undefined, '.']){
    const result=normalizeFredObservation(config,{date:'2026-10-03',value},{value:'100'},{},new Date(now));
    assert.equal(result.observation.energy.value,null);assert.equal(result.observation.change,null);assert.equal(result.event,null);
  }
  assert.equal(normalizeFredObservation(config,{date:'2026-10-03',value:'0'},{value:'100'},{},new Date(now)).observation.energy.value,0);
});
test('Missing FRED or EIA observation dates cannot inherit the collection clock',()=>{
  const fred=normalizeFredObservation(FRED_SERIES_ALLOWLIST.find(s=>s.id==='DCOILBRENTEU'),{value:'100'},{value:'1'},{},new Date(now));
  assert.equal(fred.event.startedAt,null);assert.equal(buildEnergyState([fred.event,fred.observation],{asOf:now}).dimensions.RETAIL_WHOLESALE_PRICE.status,'unknown');
  const eia=normalizeEiaRecord(EIA_DATASETS.find(d=>d.id==='electricity-generation'),{value:100},{value:1},new Date(now));
  assert.equal(eia.event.startedAt,null);assert.equal(buildEnergyState([eia.event,eia.observation],{asOf:now}).dimensions.ACTUAL_OUTPUT.status,'unknown');
});
test('EIA containers and missing scalar values never fabricate quantities or changes',()=>{
  const config=EIA_DATASETS.find(d=>d.id==='electricity-generation');
  for(const value of ['',false,true,[],[12],{},null]){
    const result=normalizeEiaRecord(config,{period:'2026-10-03',value},{value:100},new Date(now));
    assert.equal(result.observation.energy.value,null);assert.equal(result.observation.change,null);assert.equal(result.event,null);
  }
});
test('Impossible dates and unknown temporal boundaries cannot fill energy state; leap days and offsets stay valid',()=>{
  for(const date of ['2026-02-30','2025-02-29','2026-13-01','2026-10-03T24:00:00Z']){
    assert.equal(energyTimestamp(date),null);
    const fred=normalizeFredObservation(FRED_SERIES_ALLOWLIST.find(s=>s.id==='DCOILBRENTEU'),{date,value:'100'},{value:'1'},{},new Date(now));
    const eia=normalizeEiaRecord(EIA_DATASETS.find(d=>d.id==='electricity-generation'),{period:date,value:100},{value:1},new Date(now));
    assert.equal(fred.event.startedAt,null);assert.equal(eia.event.startedAt,null);
    assert.equal(buildEnergyState([fred.event,fred.observation,eia.event,eia.observation],{asOf:now}).dimensions.ACTUAL_OUTPUT.status,'unknown');
  }
  assert.equal(energyTimestamp('2024-02-29'),Date.parse('2024-02-29'));
  assert.equal(energyTimestamp('2026'),Date.parse('2026-01-01'));
  assert.equal(energyTimestamp('2026-02-28T23:30:00-02:00'),Date.parse('2026-03-01T01:30:00Z'));
  for(const options of [{asOf:NaN},{asOf:now,knownAt:NaN},{asOf:Infinity},{asOf:now,knownAt:'2026-02-30'}])assert.equal(buildEnergyState([fixture('ACTUAL_OUTPUT')],options).dimensions.ACTUAL_OUTPUT.status,'unknown');
});
test('Core energy API propagates stale provider state into both paired events and observations',async()=>{
  const fred=normalizeFredObservation(FRED_SERIES_ALLOWLIST.find(s=>s.id==='DCOILBRENTEU'),{date:'2026-10-03',value:'100'},{value:'1'},{},new Date(now));
  for(const eventPresent of [true,false]){
    const overrides=EVENT_PROVIDERS.map(p=>({providerId:p.id,status:p.id==='fred'?'degraded':'healthy',stale:p.id==='fred',events:p.id==='fred'&&eventPresent?[fred.event]:[],observations:p.id==='fred'?[fred.observation]:[],fetchedAt:new Date(now).toISOString()}));
    const response=await createEventsResponse(new Request('https://local.test/api/events'),{env:{},now,providerResultsOverride:overrides});const data=await response.json();
    assert.equal(data.sourceStatus.fred.stale,true);assert.equal(data.energyState.dimensions.RETAIL_WHOLESALE_PRICE.records.length,1);assert.equal(data.energyState.dimensions.RETAIL_WHOLESALE_PRICE.records[0].availability,'Stale');
  }
});
test('An energy family requires named attribution and a credential-free HTTP source link',()=>{
  const row=fixture('ACTUAL_OUTPUT');
  for(const change of [{sourceName:null},{sourceName:' '},{sourceUrl:null},{sourceUrl:'javascript:alert(1)'},{sourceUrl:'https://user:password@example.org/'}])assert.equal(buildEnergyState([{...row,...change}],{asOf:now}).dimensions.ACTUAL_OUTPUT.status,'unknown');
});
test('Equal same-series quantities on distinct observation dates remain distinct',()=>{
  const row={...fixture('ACTUAL_OUTPUT'),seriesId:'synthetic-series'};
  const distinct={...row,id:'second-date',startedAt:'2026-10-03T10:00:00Z'};
  assert.equal(buildEnergyState([row,distinct],{asOf:now}).dimensions.ACTUAL_OUTPUT.records.length,2);
  assert.equal(buildEnergyState([row,{...row,id:'paired-observation'}],{asOf:now}).dimensions.ACTUAL_OUTPUT.records.length,1);
});
test('Both route callers receive additive six-state API data without upstream calls',async()=>{
  const event=fixture('PRODUCTION_POLICY');
  const overrides=EVENT_PROVIDERS.map(p=>({providerId:p.id,ok:true,status:'operational',events:p.id==='eia'?[event]:[],canonicalEvents:p.id==='eia'?[event]:[],observations:[],rejected:[],fetchedAt:new Date(now).toISOString(),recordCount:p.id==='eia'?1:0}));
  for(const route of ['/api/events','/.netlify/functions/events']){
    const response=await createEventsResponse(new Request('https://local.test'+route),{env:{},now,providerResultsOverride:overrides});assert.equal(response.status,200);
    const data=await response.json();assert.equal(data.energyState.schema,'energy-state/1');assert.equal(data.energyState.dimensions.PRODUCTION_POLICY.records.length,1);assert.ok(data.sourceStatus);assert.ok(data.canonicalEvents);
  }
});
