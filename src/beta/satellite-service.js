import { fetchSourceJson } from './public-sources.js';
import { propagateEstimate, SATELLITE_CACHE_MS } from '../orbital/satellite-proof.js';
export const SATELLITE_POLICY={url:'https://celestrak.org/NORAD/elements/gp.php?GROUP=STATIONS&FORMAT=JSON',maxBytes:1000000};
export function validElements(rows){
  if(!Array.isArray(rows)||rows.length>100)throw new Error('invalid-elements');
  return rows.filter(r=>r&&Number.isInteger(r.NORAD_CAT_ID)&&r.NORAD_CAT_ID>0&&typeof r.OBJECT_NAME==='string'&&typeof r.EPOCH==='string'&&Number.isFinite(Date.parse(`${r.EPOCH.replace(/Z$/,'')}Z`))&&
    ['MEAN_MOTION','ECCENTRICITY','INCLINATION','RA_OF_ASC_NODE','ARG_OF_PERICENTER','MEAN_ANOMALY','BSTAR','MEAN_MOTION_DOT','MEAN_MOTION_DDOT'].every(k=>typeof r[k]==='number'&&Number.isFinite(r[k]))&&r.MEAN_MOTION>0&&r.ECCENTRICITY>=0&&r.ECCENTRICITY<1&&r.INCLINATION>=0&&r.INCLINATION<=180);
}
export async function collectElements(storage,{now=Date.now(),fetchImpl=fetch,seed=null}={}){
  const old=await storage.get('celestrak');
  if(old?.halted||old?.nextAttemptAt>now)return {skipped:true,halted:old.halted||false};
  // Reserve this retrieval atomically BEFORE contacting the source. A slow
  // overlapping invocation must not download the same two-hour update again.
  // The reservation fails closed (halted) if execution cannot finish.
  const leaseId=crypto.randomUUID();
  const claimed=await storage.set('celestrak',{...(old||{elements:[],lastSuccessAt:null}),nextAttemptAt:now+SATELLITE_CACHE_MS,halted:true,lastError:'element-retrieval-incomplete',leaseId});
  if(!claimed)return {skipped:true,contended:true};
  let next;
  try{
    // Reuse the genuine first retrieval once, rather than requery the same
    // two-hour source update merely because hosting changed.
    const seeded=!old&&seed&&now-seed.retrievedAt<SATELLITE_CACHE_MS;
    const rows=seeded?seed.elements:await fetchSourceJson(SATELLITE_POLICY,async(...args)=>{
      const response=await fetchImpl(...args);if(response.status!==200)throw new Error(`HTTP ${response.status}`);return response;
    });
    const elements=validElements(rows);if(!elements.length)throw new Error('invalid-elements');
    const retrievedAt=seeded?seed.retrievedAt:now;
    next={elements,lastSuccessAt:retrievedAt,lastAttemptAt:now,nextAttemptAt:retrievedAt+SATELLITE_CACHE_MS,lastError:null,halted:false,acquisition:seeded?'Initial genuine retrieval retained before deployment':'Hosted CelesTrak collector'};
  }catch(error){
    next={...(old||{elements:[],lastSuccessAt:null}),lastAttemptAt:now,nextAttemptAt:null,lastError:/^HTTP \d{3}$/.test(error.message)?error.message:'element-fetch-failed',halted:true};
  }
  if((await storage.get('celestrak'))?.leaseId!==leaseId)return {skipped:true,contended:true};
  return {written:await storage.set('celestrak',next),halted:next.halted,elementCount:next.elements.length,lastError:next.lastError};
}
export function calculatedSatellites(snapshot,now,satelliteApi){
  const events=[];let rejected=0,staleEpochs=0;
  for(const row of snapshot?.elements||[]){
    const elementEpoch=row.EPOCH.endsWith('Z')?row.EPOCH:`${row.EPOCH}Z`,epoch=Date.parse(elementEpoch);
    if(!Number.isFinite(epoch)||now-epoch>48*3600000||epoch>now+3600000){staleEpochs++;continue;}
    try{
      const p=propagateEstimate(satelliteApi.json2satrec(row),new Date(now),satelliteApi);
      if(!p.ok||![p.latitude,p.longitude,p.altitudeKm].every(Number.isFinite)||p.altitudeKm<0){rejected++;continue;}
      events.push({provider:'celestrak',providerEventId:String(row.NORAD_CAT_ID),recordKind:'contact',layer:'satellites',title:row.OBJECT_NAME,category:'space',locationName:'Calculated orbital position',description:'SGP4 estimate from real CelesTrak stations elements; not a measured observation.',
        latitude:p.latitude,longitude:p.longitude,calculatedHeightKm:p.altitudeKm,geographic:true,startedAt:null,sourcePublishedAt:null,updatedAt:new Date(epoch).toISOString(),collectionTime:snapshot.lastSuccessAt,
        sourceName:'CelesTrak',sourceUrl:'https://celestrak.org/NORAD/elements/',sourceLocator:`${SATELLITE_POLICY.url}#NORAD_CAT_ID=${row.NORAD_CAT_ID}`,dataKind:'Calculated',sourceAvailability:snapshot.lastError||now-snapshot.lastSuccessAt>SATELLITE_CACHE_MS*2?'Stale':'Fresh',
        calculation:{elementEpoch,calculatedFor:new Date(now).toISOString(),calculatedAt:new Date(now).toISOString(),modelVersion:'satellite.js 7.1.0 / SGP4',inputFrame:'TEME',outputFrame:'WGS84-geodetic',transformation:p.frame},metadata:{elementEpoch,elementAcquisition:snapshot.acquisition,noradCatalogId:row.NORAD_CAT_ID},maxAgeMs:null});
    }catch{rejected++;}
  }
  return {events,status:{id:'celestrak',name:'CelesTrak',dataKind:'Calculated',availability:!events.length?'Unavailable':snapshot.lastError||staleEpochs?'Stale':now-snapshot.lastSuccessAt>SATELLITE_CACHE_MS*2?'Stale':'Fresh',coverage:'Stations group only · SGP4 calculated positions · elements older than48h suppressed',lastSuccessAt:snapshot?.lastSuccessAt??null,sourceGeneratedAt:null,nextAttemptAt:snapshot?.nextAttemptAt??null,error:snapshot?.lastError??null,halted:snapshot?.halted||false,recordCount:events.length,rejectedCount:rejected,staleEpochCount:staleEpochs,intervalMs:SATELLITE_CACHE_MS,url:SATELLITE_POLICY.url}};
}
