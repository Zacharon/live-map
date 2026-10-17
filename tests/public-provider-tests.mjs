import assert from 'node:assert/strict';
import {providerActivation} from '../src/data/providers/provider-activation.js';
import {fetchDigitrafficVessels,normalizeDigitrafficFeature} from '../src/data/providers/digitraffic.js';
import {fetchAdsbLolAircraft,normalizeAdsbLolAircraft} from '../src/data/providers/adsb-lol.js';
import {fetchNhcEvents,normalizeNhcStorm} from '../src/data/providers/nhc.js';
import {viewportCircle,fetchBoundedPublicJson} from '../src/data/providers/public-tracking-fetch.js';
import {validateSourceRegistry} from '../src/sources/master-source-registry.js';
import {validateProviderSourceLinks} from '../src/sources/provider-source-links.js';
import {validateProviderCapabilities} from '../src/data/providers/capability-registry.js';
import {runProvider} from '../src/data/providers/orchestrator.js';
import {EVENT_PROVIDERS} from '../src/data/providers/registry.js';
import {movingObjectPublicView} from '../src/moving-objects/schema.js';
import {renderContactDetail} from '../src/map/contact-roster.js';
const now=Date.parse('2026-10-02T15:00:00Z'),bbox={south:60,west:24,north:61,east:25};
let reads=0;const blocked=async()=>{reads++;throw Error('Unexpected upstream read');};
for(const call of [()=>fetchDigitrafficVessels({bbox,env:{},fetchImpl:blocked}),()=>fetchAdsbLolAircraft({bbox,env:{},fetchImpl:blocked}),()=>fetchNhcEvents({env:{},fetchImpl:blocked})]){const r=await call();assert.equal(typeof r.status==='string'?r.status:r.status.status,'disabled');}
assert.equal(reads,0);
const nhcProvider=EVENT_PROVIDERS.find(p=>p.id==='nhc-current-storms');let budgetReads=0;
const disabled=await runProvider(nhcProvider,{env:{},requestBudgetStore:{recordRequest:()=>{budgetReads++;}}});assert.equal(disabled.status,'disabled');assert.equal(budgetReads,0);
const paid={enabled:true,activation:{billingClass:'paid',enableEnvVar:'FORK_PROVIDER_ENABLED',hardBudgetEnforced:true}};
assert.equal(providerActivation(paid,{}).allowed,false);
assert.equal(providerActivation(paid,{FORK_PROVIDER_ENABLED:'true'}).allowed,false);
assert.equal(providerActivation(paid,{FORK_PROVIDER_ENABLED:'true',LIVE_MAP_PROVIDER_MODE:'byo-paid',LIVE_MAP_ALLOW_PAID:'true',LIVE_MAP_PAID_MONTHLY_CAP_USD:'5'}).allowed,true);
assert.equal(providerActivation({...paid,activation:{...paid.activation,hardBudgetEnforced:false}},{FORK_PROVIDER_ENABLED:'true',LIVE_MAP_PROVIDER_MODE:'byo-paid',LIVE_MAP_ALLOW_PAID:'true',LIVE_MAP_PAID_MONTHLY_CAP_USD:'5'}).allowed,false);
assert.equal(viewportCircle({south:-90,west:-180,north:90,east:180}),null);
const feature={mmsi:123456789,geometry:{type:'Point',coordinates:[24.5,60.5]},properties:{timestampExternal:now-120000,sog:102.3,cog:360,heading:511,navStat:15}};
const vessel=normalizeDigitrafficFeature(feature,now).object;assert.equal(vessel.observedAt,now-120000);assert.equal(vessel.speed,null);assert.equal(vessel.heading,null);assert.equal(vessel.providerMetadata.public.cogDegrees,null);assert.equal(vessel.providerMetadata.public.cargoManifest,null);
assert.equal(normalizeDigitrafficFeature({...feature,properties:{timestamp:30}},now).object,null);
assert.equal(normalizeDigitrafficFeature({...feature,geometry:{type:'Point',coordinates:[false,60]}},now).object,null);
assert.equal(normalizeDigitrafficFeature({...feature,properties:{...feature.properties,timestampExternal:now+200000}},now).object.stale,true);
assert.equal(normalizeDigitrafficFeature({...feature,properties:{...feature.properties,timestampExternal:now+600000}},now).object,null);
const row={hex:'abcdef',lat:60.5,lon:24.5,seen_pos:12,alt_baro:10000,alt_geom:11000,gs:100,type:'adsb_icao'};
const plane=normalizeAdsbLolAircraft(row,now,now).object;assert.equal(plane.observedAt,now-12000);assert.equal(plane.altitude,3352.8);assert.equal(plane.providerMetadata.public.barometricAltitudeFeet,10000);assert.equal(plane.status,'position reported');
for(const object of [vessel,plane]){
  const publicObject=movingObjectPublicView(object),detail=renderContactDetail(publicObject);
  for(const field of ['licenseId','licenseUrl','attribution','changes','coverage','timestampBasis'])assert.ok(detail.includes(object.providerMetadata.public[field]),'API/public contact notice '+field);
  assert.ok(renderContactDetail(object).includes(object.providerMetadata.public.licenseId),'Nested local contact compatibility');
}
assert.equal(normalizeAdsbLolAircraft({...row,seen_pos:null},now,now).object,null);
assert.equal(normalizeAdsbLolAircraft({...row,lat:null},now,now).object,null);
const storm={id:'al012026',name:'TEST FIXTURE',classification:'TS',intensity:'40',pressure:'1000',latitudeNumeric:0,longitudeNumeric:0,lastUpdate:new Date(now).toISOString(),publicAdvisory:{advNum:'1',issuance:new Date(now).toISOString()}};
assert.equal(normalizeNhcStorm(storm,new Date(now)).event.latitude,0);
assert.equal(normalizeNhcStorm({...storm,latitudeNumeric:null},new Date(now)).event.geographic,false);
assert.equal(normalizeNhcStorm({...storm,lastUpdate:null,publicAdvisory:null},new Date(now)).event,null);
for(const malformed of [[],{},true,false,'','   ',Infinity]){
 const event=normalizeNhcStorm({...storm,latitudeNumeric:malformed,longitudeNumeric:malformed,intensity:malformed,pressure:malformed},new Date(now)).event;
 assert.equal(event.geographic,false,'Malformed coordinate is unknown');assert.equal(event.metadata.windKnots,null,'Malformed wind is unknown');assert.equal(event.metadata.pressureHpa,null,'Malformed pressure is unknown');
}
assert.equal(normalizeNhcStorm({...storm,latitudeNumeric:'0',longitudeNumeric:'0'},new Date(now)).event.latitude,0,'Real numeric zero remains valid');
const response=data=>new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
let aisReads=0;const aisFetch=async url=>{aisReads++;assert.equal(new URL(url).hostname,'meri.digitraffic.fi');assert.ok(new URL(url).searchParams.get('radius'));return response({features:[feature],dataUpdatedTime:new Date(now).toISOString()});};
const env={DIGITRAFFIC_ENABLED:'true'};const ais=await fetchDigitrafficVessels({bbox,now,env,fetchImpl:aisFetch});assert.equal(ais.objects.length,1);
await fetchDigitrafficVessels({bbox,now,env,fetchImpl:aisFetch});assert.equal(aisReads,1);
const limited=await fetchDigitrafficVessels({bbox:{...bbox,east:25.1},now:now+1000,env,fetchImpl:aisFetch});assert.equal(limited.status.status,'rate-limited');assert.equal(aisReads,1);
let airReads=0;const air=await fetchAdsbLolAircraft({bbox,now,env:{ADSB_LOL_ENABLED:'true',ADSB_LOL_TERMS_REVIEWED:'true'},fetchImpl:async()=>{airReads++;return response({ac:[row],now});}});assert.equal(air.objects.length,1);assert.equal(airReads,1);
const empty=await fetchNhcEvents({now,env:{NHC_ENABLED:'true'},fetchImpl:async()=>response({activeStorms:[]})});assert.equal(empty.status,'healthy');assert.equal(empty.events.length,0);
await assert.rejects(fetchBoundedPublicJson('https://www.nhc.noaa.gov/test-limit',{providerId:'nhc-current-storms',now:now+61000,maxBytes:10,fetchImpl:async()=>response({activeStorms:[]})}),/byte limit/);
for(const check of [validateSourceRegistry(),validateProviderSourceLinks(),validateProviderCapabilities()])assert.equal(check.valid,true,check.errors.join('\n'));
console.log('public-provider-tests: disabled defaults, bounded cache/budget, schema/clock/units, empty NHC and registry parity passed');
