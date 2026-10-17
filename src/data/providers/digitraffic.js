import {normalizeMovingObject} from '../../moving-objects/schema.js';
import {providerActivation} from './provider-activation.js';
import {fetchBoundedPublicJson,viewportCircle,withinBbox} from './public-tracking-fetch.js';
export const DIGITRAFFIC_POLICY={id:'digitraffic-ais',activation:{billingClass:'free',enableEnvVar:'DIGITRAFFIC_ENABLED'}};
const sourceUrl='https://www.digitraffic.fi/en/marine-traffic/';
const licenseUrl='https://creativecommons.org/licenses/by/4.0/';
export function digitrafficStatus(message='Optional Finnish AIS adapter is disabled.',status='disabled'){return {providerId:DIGITRAFFIC_POLICY.id,status,ok:false,message,coverage:'Finnish waterways; receiver-dependent AIS, not global cargo/traffic measurement',nextRefreshAfterMs:60000,attribution:'Fintraffic / digitraffic.fi',licenseUrl};}
export function normalizeDigitrafficFeature(feature,now=Date.now()) {
  const p=feature?.properties || {},mmsi=String(feature?.mmsi ?? p.mmsi ?? '');
  const observedAt=p.timestampExternal;
  if(!/^\d{9}$/.test(mmsi)||typeof observedAt!=='number'||!Number.isFinite(observedAt)||observedAt<=0||observedAt>now+300000||feature?.geometry?.type!=='Point')return {object:null,errors:['Missing identity, point or valid location-record timestamp']};
  const [longitude,latitude]=feature.geometry.coordinates || [];
  if(![longitude,latitude].every(v=>typeof v==='number'&&Number.isFinite(v)))return {object:null,errors:['Coordinates missing or invalid']};
  const numeric=(value,sentinel)=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<sentinel?value:null;
  return normalizeMovingObject({id:'vessel:'+mmsi,objectType:'vessel',providerId:DIGITRAFFIC_POLICY.id,latitude,longitude,observedAt,receivedAt:now,dataAgeSeconds:Math.max(0,Math.round((now-observedAt)/1000)),stale:observedAt>now,speed:numeric(p.sog,102.3),heading:numeric(p.heading,360),identifiers:{mmsi},displayName:mmsi,status:'AIS position reported',sourceName:'Fintraffic / digitraffic.fi',sourceUrl,providerMetadata:{public:{licenseId:'CC-BY-4.0',licenseUrl,attribution:'Fintraffic / digitraffic.fi',changes:'Filtered to viewport and normalized AIS sentinels to null.',coverage:'Finnish waterways; incomplete receiver coverage',clockSkewSeconds:Math.max(0,(observedAt-now)/1000),timestampBasis:'timestampExternal: provider location-record time, not reconstructed AIS message UTC',sogUnit:'knots',cogDegrees:numeric(p.cog,360),navigationStatus:p.navStat??null,cargoManifest:null}}});
}
export async function fetchDigitrafficVessels({bbox,limit=500,now=Date.now(),env,fetchImpl=fetch}={}) {
  const gate=providerActivation(DIGITRAFFIC_POLICY,env);if(!gate.allowed)return {objects:[],status:digitrafficStatus(gate.reason,gate.status),warnings:[],truncated:false};
  const circle=viewportCircle(bbox);if(!circle||circle.radiusKm>250)return {objects:[],status:digitrafficStatus('Choose a bounded local viewport before requesting positions.','viewport-required'),warnings:[],truncated:false};
  if(bbox.north<59||bbox.south>71||bbox.east<19||bbox.west>32)return {objects:[],status:digitrafficStatus('This viewport is outside the Finnish regional coverage envelope.','no-coverage'),warnings:['No AIS observations here does not establish no vessels or zero cargo.'],truncated:false};
  const url=new URL('https://meri.digitraffic.fi/api/ais/v1/locations');for(const [k,v] of Object.entries({latitude:circle.latitude,longitude:circle.longitude,radius:circle.radiusKm,from:Math.floor(now/60000)*60000-600000}))url.searchParams.set(k,String(v));
  try{const result=await fetchBoundedPublicJson(url,{providerId:DIGITRAFFIC_POLICY.id,fetchImpl,now});
    if(!Array.isArray(result.data.features)||result.data.features.length>10000)throw Error('Invalid or oversized AIS feature collection');
    const parsed=result.data.features.map(f=>normalizeDigitrafficFeature(f,now));const objects=parsed.map(r=>r.object).filter(o=>o&&withinBbox(o,bbox));const rejected=parsed.filter(r=>!r.object).length;const cap=Math.min(1000,Math.max(1,Number(limit)||500));
    const skew=objects.some(o=>o.providerMetadata.public.clockSkewSeconds>0);
    return {objects:objects.slice(0,cap),status:{...digitrafficStatus('Bounded AIS observations; absence is not zero throughput.',rejected||skew?'degraded':'live'),ok:true,count:Math.min(objects.length,cap),rejectedCount:rejected,fetchedAt:result.fetchedAt,cached:result.cached,sourceUpdatedAt:result.data.dataUpdatedTime||null},warnings:['Regional AIS only; no cargo manifest, dark-traffic conclusion or global completeness.',...(skew?['Source/host clock skew: future-dated positions are marked stale; do not interpret them as current.']:[])],truncated:objects.length>cap};
  }catch(error){return {objects:[],status:digitrafficStatus(/budget|429/.test(error.message)?'Request budget exhausted; wait before retry.':'AIS source unavailable or rejected; no positions inferred.',/budget|429/.test(error.message)?'rate-limited':'provider-unavailable'),warnings:['AIS unavailable is an observability state, not no vessels.'],truncated:false};}
}
