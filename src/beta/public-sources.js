import { normalizeUsgsFeature } from '../data/providers/usgs.js';
import { normalizeEonetEvent } from '../data/providers/eonet.js';
import { normalizeGdacsFeature } from '../data/providers/gdacs.js';
import { createNormalizedEvent } from '../events/normalized-event.js';
import { timestampMs } from '../events/value-semantics.js';

export const SOURCE_POLICY = Object.freeze({
  usgs: { name:'USGS Earthquake Hazards Program', url:'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson', intervalMs:300000, staleMs:900000, maxAgeMs:604800000, kind:'Observed', coverage:'Global earthquakes M2.5+ · past 7 days', maxBytes:2000000 },
  nws: { name:'National Weather Service', url:'https://api.weather.gov/alerts/active?status=actual', intervalMs:300000, staleMs:900000, maxAgeMs:604800000, kind:'Reported', coverage:'U.S. active actual alerts · area records; no invented point locations', maxBytes:5000000 },
  eonet: { name:'NASA EONET', url:'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30&limit=100', intervalMs:1800000, staleMs:5400000, maxAgeMs:2592000000, kind:'Reported', coverage:'Recent reported open natural events · 30 days · up to 100', maxBytes:2000000 },
  gdacs: { name:'GDACS / European Commission JRC / originating agencies', url:'https://www.gdacs.org/gdacsapi/api/Events/geteventlist/EVENTS4APP', intervalMs:900000, staleMs:2700000, maxAgeMs:2592000000, kind:'Reported', coverage:'Worldwide disaster reports · latest app feed, up to 100 · provider representative points', maxBytes:2000000 },
  swpc: { name:'NOAA Space Weather Prediction Center', url:'https://services.swpc.noaa.gov/products/alerts.json', intervalMs:900000, staleMs:2700000, maxAgeMs:2592000000, kind:'Reported', coverage:'Space-weather watches, warnings and alerts · non-geographic notices', maxBytes:1000000 },
});
export function publicUrl(value) {
  try { const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null; } catch{return null;}
}
function utcDate(value) {
  if(typeof value!=='string')return null;
  const parts=value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})?$/);
  if(!parts)return null;
  const [year,month,day,hour,minute,second]=parts.slice(1,7).map(Number),calendar=new Date(Date.UTC(year,month-1,day,hour,minute,second));
  if(calendar.getUTCFullYear()!==year||calendar.getUTCMonth()!==month-1||calendar.getUTCDate()!==day||calendar.getUTCHours()!==hour||calendar.getUTCMinutes()!==minute||calendar.getUTCSeconds()!==second)return null;
  return timestampMs(value.replace(' ','T')+(parts[7]?'':'Z'));
}
function isoUtcDate(value) {const at=utcDate(value);return at==null?null:new Date(at).toISOString();}
const point = geometry => geometry?.type==='Point' && Array.isArray(geometry.coordinates) && geometry.coordinates.length===2
  && geometry.coordinates.every(n=>typeof n==='number'&&Number.isFinite(n)) && Math.abs(geometry.coordinates[0])<=180 && Math.abs(geometry.coordinates[1])<=90;
function sourceLinks(items) {return items.map(([label,url])=>({label,url:publicUrl(url)})).filter(link=>link.url);}
function nwsRegions(ugc) {
  if(!Array.isArray(ugc))return [];
  const oceanic=new Set(['HI','GU','MP','AS','PH','PM','PS']),northAmerican=new Set(['AK','AL','AR','AZ','CA','CO','CT','DC','DE','FL','GA','IA','ID','IL','IN','KS','KY','LA','MA','MD','ME','MI','MN','MO','MS','MT','NC','ND','NE','NH','NJ','NM','NV','NY','OH','OK','OR','PA','PR','RI','SC','SD','TN','TX','UT','VA','VI','VT','WA','WI','WV','WY','AM','AN','GM','LC','LE','LH','LM','LO','LS','PZ','PK']);
  return [...new Set(ugc.filter(code=>typeof code==='string'&&/^[A-Z]{2}[CZ]\d{3}$/.test(code)).map(code=>oceanic.has(code.slice(0,2))?'oceania':northAmerican.has(code.slice(0,2))?'north-america':null).filter(Boolean))];
}
export async function fetchSourceJson(policy, fetchImpl=fetch) {
  const response=await fetchImpl(policy.url,{redirect:'error',signal:AbortSignal.timeout(12000),headers:{Accept:'application/geo+json, application/json','User-Agent':'LiveMapBeta (https://github.com/Zacharon/live-map)'}});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  if(Number(response.headers.get('content-length'))>policy.maxBytes)throw new Error('response-too-large');
  const reader=response.body.getReader();let size=0;const chunks=[];
  try { for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>policy.maxBytes)throw new Error('response-too-large');chunks.push(value);} }
  finally {await reader.cancel().catch(()=>{});}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder().decode(bytes));
}
export function normalizeSource(id, raw, now) {
  const policy=SOURCE_POLICY[id];const events=[],rejected=[];
  const inputs=id==='swpc'?raw:id==='eonet'?raw?.events:raw?.features;
  if(!Array.isArray(inputs)||inputs.length>1500)throw new Error('invalid-source-envelope');
  for(const input of inputs){
    const p=input?.properties||{};
    const sourceId=id==='gdacs'&&/^[A-Z]{2}$/.test(p.eventtype)&&Number.isInteger(p.eventid)&&Number.isInteger(p.episodeid)?`${p.eventtype}:${p.eventid}:${p.episodeid}`
      :id==='swpc'&&typeof input?.product_id==='string'&&utcDate(input.issue_datetime)!=null?`${input.product_id}:${new Date(utcDate(input.issue_datetime)).toISOString()}`:input?.id || p.id;
    if(typeof sourceId!=='string'||!sourceId){rejected.push('missing-source-id');continue;}
    let result;
    if(id==='usgs')result=normalizeUsgsFeature(input,new Date(now));
    else if(id==='eonet') {
      // Do not let an absent source observation date become collection time, or
      // a polygon centroid become a measured point through the older adapter.
      const geometry=[...(input.geometry||[])].filter(g=>timestampMs(g.date)!=null&&g.type==='Point'&&Array.isArray(g.coordinates)&&g.coordinates.length===2&&g.coordinates.every(n=>typeof n==='number'&&Number.isFinite(n))&&Math.abs(g.coordinates[0])<=180&&Math.abs(g.coordinates[1])<=90).sort((a,b)=>timestampMs(b.date)-timestampMs(a.date))[0];
      if(!geometry){rejected.push('missing-dated-point');continue;}
      result=normalizeEonetEvent({...input,geometry:[geometry]},new Date(now));
    } else if(id==='gdacs') {
      // Preserve only an explicitly supplied point, never average a polygon.
      if(!point(input.geometry)){rejected.push('missing-provider-point');continue;}
      result=normalizeGdacsFeature(input,new Date(now));
      if(result.event){const details={...result.event.metadata.details};delete details['Provider status'];
        result.event={...result.event,providerEventId:sourceId,startedAt:isoUtcDate(p.fromdate),updatedAt:isoUtcDate(p.datemodified),sourcePublishedAt:null,lastVerifiedAt:null,status:'unknown',
          metadata:{...result.event.metadata,details,sourceIsCurrent:p.iscurrent??null,coordinateMethod:'GDACS representative point / centroid; not a measured position',sourceEventTime:p.fromdate||null,sourceEndTime:p.todate||null,sourceUpdateTime:p.datemodified||null,sourceSeverityText:p.severitydata?.severitytext||null}};}
    } else if(id==='swpc') {
      if(typeof input.message!=='string'||!input.message.trim()||input.message.length>20000){rejected.push('missing-or-oversized-message');continue;}
      const issued=utcDate(input.issue_datetime);
      const title=input.message.split(/\r?\n/).find(line=>/^\s*(?:CONTINUED\s+)?(?:ALERT|WARNING|WATCH|SUMMARY|CANCELLED|EXTENDED)[ :]/.test(line))?.trim() || `Space-weather notice ${input.product_id}`;
      result=createNormalizedEvent({id:`swpc:${sourceId}`,provider:'swpc',providerEventId:sourceId,title,description:input.message,category:'space-weather',type:'space-weather-notice',
        geographic:false,latitude:null,longitude:null,locationName:'Non-geographic space-weather notice',nonGeographicReason:'Source supplies no point observation',startedAt:null,updatedAt:issued,sourcePublishedAt:issued,ingestedAt:new Date(now),status:'unknown',sourceName:policy.name,sourceUrl:'https://www.swpc.noaa.gov/products/notifications-timeline',sourceType:'Official',
        metadata:{productId:input.product_id,serialNumber:input.message.match(/Serial Number:\s*(\d+)/)?.[1]||null,originalMessage:input.message},severity:0,confidence:null});
    } else {
      const p=input.properties||{};
      if(p.status!=='Actual'){rejected.push('not-actual');continue;}
      result=createNormalizedEvent({id:`nws:${sourceId}`,provider:'nws',providerEventId:sourceId,title:p.headline||p.event||'Weather alert',description:p.description||'',category:'weather',type:'weather-warning',
        geographic:false,latitude:null,longitude:null,nonGeographicReason:'Alert applies to named areas; no point observation supplied',geometry:input.geometry||null,locationName:p.areaDesc||'Area not supplied',
        startedAt:p.effective,updatedAt:p.sent,sourcePublishedAt:p.sent,ingestedAt:new Date(now),status:'active',sourceName:policy.name,sourceUrl:publicUrl(p['@id'])||publicUrl(sourceId)||'https://www.weather.gov/alerts',sourceType:'Official',
        countryCode:'US',countryName:'United States',metadata:{alertEvent:p.event,instruction:p.instruction||null,senderName:p.senderName||null,expires:p.expires,ends:p.ends,severity:p.severity,urgency:p.urgency,certainty:p.certainty,areaDesc:p.areaDesc,navigationRegions:nwsRegions(p.geocode?.UGC),regionMethod:'Broad navigation region from source NWS UGC zone codes; no point inferred',affectedZones:(p.affectedZones||[]).map(publicUrl).filter(Boolean),messageType:p.messageType},severity:0,confidence:null});
    }
    if(!result.event){rejected.push(sourceId);continue;}
    const event=result.event;
    // The legacy adapter supplies inspection heuristics. They are not primary
    // source measurements or analyst verification, so this beta omits them.
    const metadata={...event.metadata};delete metadata.verificationStatus;delete metadata.severityReason;
    const links=sourceLinks([['Original source',event.sourceUrl],['Source feed',policy.url],
      ...(id==='eonet'?[['NASA event record',input.link],...(input.sources||[]).map(s=>[s.id||'Originating report',s.url])]:[]),
      ...(id==='gdacs'?[['GDACS report',p.url?.report],['GDACS event details',p.url?.details],['Source geometry',p.url?.geometry]]:[]),
      ...(id==='nws'?(metadata.affectedZones||[]).map((url,i)=>[`Affected zone ${i+1}`,url]):[])]);
    if(id==='usgs'){
      metadata.tsunami=typeof input.properties?.tsunami==='number'?input.properties.tsunami!==0:null;
      if(metadata.tsunami==null&&metadata.details){metadata.details={...metadata.details};delete metadata.details.Tsunami;}
    }
    events.push({...event,metadata,links,severity:null,severityLabel:null,confidence:null,attentionScore:null,freshnessScore:null,qualityReasons:null,verificationStatus:'not-reviewed',
      sourcePublishedAt:id==='eonet'?null:event.sourcePublishedAt,
      sourceUrl:publicUrl(event.sourceUrl)||policy.url,collectionTime:now,dataKind:policy.kind,coverage:policy.coverage,sourceLocator:`${policy.url}#${sourceId}`,maxAgeMs:policy.maxAgeMs});
  }
  return {events,rejectedCount:rejected.length,sourceGeneratedAt:timestampMs(id==='usgs'?raw.metadata?.generated:id==='nws'?raw.updated:null)};
}
