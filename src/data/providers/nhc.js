import {createNormalizedEvent} from '../../events/normalized-event.js';
import {providerActivation} from './provider-activation.js';
import {fetchBoundedPublicJson} from './public-tracking-fetch.js';
export const NHC_CURRENT_STORMS_URL='https://www.nhc.noaa.gov/CurrentStorms.json';
export const NHC_POLICY={id:'nhc-current-storms',activation:{billingClass:'free',enableEnvVar:'NHC_ENABLED'}};
export function normalizeNhcStorm(row,now=new Date()) {
  if(!/^(al|ep|cp)\d{6}$/i.test(row?.id || ''))return {event:null,errors:['Storm identity missing']};
  const issuance=row.publicAdvisory?.issuance || row.forecastAdvisory?.issuance || row.lastUpdate;
  const time=Date.parse(issuance);if(!Number.isFinite(time)||time>now.getTime()+60000)return {event:null,errors:['Advisory time missing or future']};
  const numeric=value=>typeof value==='number'&&Number.isFinite(value)?value:typeof value==='string'&&value.trim()!==''&&Number.isFinite(Number(value))?Number(value):null;
  const lat=numeric(row.latitudeNumeric),lon=numeric(row.longitudeNumeric);
  const point=lat!=null&&lon!=null&&lat>=-90&&lat<=90&&lon>=-180&&lon<=180;
  let sourceUrl=NHC_CURRENT_STORMS_URL;try{const url=new URL(row.publicAdvisory?.url || row.forecastAdvisory?.url);if(url.protocol==='https:'&&url.hostname==='www.nhc.noaa.gov'&&!url.username&&!url.password)sourceUrl=url.href;}catch{}
  const wind=numeric(row.intensity),pressure=numeric(row.pressure);
  const result=createNormalizedEvent({id:'nhc:'+row.id.toLowerCase(),provider:'nhc-current-storms',providerEventId:row.id,recordKind:'event',domain:'weather',category:'storm',type:'tropical-cyclone-advisory',title:`${row.name || row.id} · ${row.classification || 'tropical cyclone'} advisory`,description:'Issued NHC/CPHC advisory position. No interpolated current track; cones and forecast products remain forecast context.',latitude:point?lat:null,longitude:point?lon:null,geographic:point,mapDisplayStatus:point?'approximate':'not-mapped',nonGeographicReason:point?null:'Advisory coordinates not supplied',startedAt:issuance,updatedAt:row.publicAdvisory?.fileUpdateTime || row.lastUpdate || issuance,ingestedAt:now,sourcePublishedAt:issuance,status:'active',severity:wind==null?40:wind>=96?80:wind>=64?65:wind>=34?50:35,confidence:90,sourceName:'NOAA National Hurricane Center / Central Pacific Hurricane Center',sourceType:'Official',sourceUrl,tags:['NHC','CPHC','advisory'],metadata:{verificationStatus:'primary-confirmed',coordinateMethod:'Official advisory position, approximate',coverage:'Atlantic, eastern and central North Pacific; not global cyclones',attribution:'NOAA NHC / CPHC',licenseUrl:'https://www.weather.gov/disclaimer',observationType:'reported-advisory',advisoryNumber:row.publicAdvisory?.advNum || row.forecastAdvisory?.advNum || null,windKnots:wind,pressureHpa:pressure,forecastGeometry:null,details:{'Advisory issued':issuance,'Coverage':'Atlantic, eastern and central North Pacific','Wind / pressure':`${wind ?? 'unknown'} knots / ${pressure ?? 'unknown'} hPa`,'Position meaning':'Issued advisory; not a live tracked position','Source rights':'NOAA/NWS public information; no implied endorsement'}}});
  return {event:result.valid?result.event:null,errors:result.errors};
}
export async function fetchNhcEvents(context={}) {
  const gate=providerActivation(NHC_POLICY,context.env);if(!gate.allowed)return {events:[],status:gate.status,statusMessage:gate.reason};
  const now=Number(context.now ?? Date.now());const result=await fetchBoundedPublicJson(NHC_CURRENT_STORMS_URL,{providerId:NHC_POLICY.id,now,cacheMs:300000,fetchImpl:context.fetchImpl || fetch,maxBytes:1024*1024,signal:context.signal});
  if(!Array.isArray(result.data.activeStorms)||result.data.activeStorms.length>100)throw Error('Invalid or oversized active storm collection');
  const parsed=result.data.activeStorms.map(row=>normalizeNhcStorm(row,new Date(now))),events=parsed.map(r=>r.event).filter(Boolean),rejected=parsed.filter(r=>!r.event);
  return {events,rejected,status:rejected.length?'degraded':'healthy',cached:result.cached,statusMessage:events.length?'Issued regional cyclone advisories':'No active cyclones reported in this source coverage',warnings:['Advisory positions and forecast products have distinct times; this is not a global cyclone feed.']};
}
