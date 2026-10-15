// Loopback development only: explicit approved public sources, no credentials or production flags.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {normalizeUsgsFeature} from './providers/usgs.js';
import {normalizeNhcStorm} from './providers/nhc.js';
import {EVENT_PROVIDERS} from './providers/registry.js';
import {createEventsResponse} from '../api/events-response.js';

export const LOCAL_PUBLIC_SOURCES=[
 {id:'usgs',name:'USGS earthquakes',url:'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',coverage:'USGS reported magnitude 2.5+ earthquakes in the past day; worldwide reporting is incomplete',collection:'features',maxRecords:1000,normalize:normalizeUsgsFeature},
 {id:'nhc-current-storms',name:'NHC / CPHC advisories',url:'https://www.nhc.noaa.gov/CurrentStorms.json',coverage:'Issued cyclone advisories for the Atlantic, eastern and central North Pacific; not global cyclone coverage',collection:'activeStorms',maxRecords:100,normalize:normalizeNhcStorm},
];

async function boundedRead(url,fetchImpl){
 const response=await fetchImpl(url,{redirect:'error',signal:AbortSignal.timeout(10000),headers:{accept:'application/json','user-agent':'LiveMapLocalPreview/1.0'}});
 if(!response.ok)throw Error('Public source HTTP '+response.status);
 const reader=response.body.getReader();let length=0;const chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>2*1024*1024){await reader.cancel();throw Error('Public source byte cap');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 return {data:JSON.parse(new TextDecoder().decode(bytes)),httpDate:response.headers.get('date'),bytes:length};
}

export function createLocalPublicPreview({cacheFile,fetchImpl=fetch,now=()=>Date.now(),cacheOnly=false,refreshMs=300000,maxReadsPerSource=4}={}){
 const cached=new Map(),attempts=new Map(),pending=new Map(),lastAttempt=new Map();let hydratePromise=null,lastEnvelope=null,persistQueue=Promise.resolve();
 async function hydrate(){if(hydratePromise)return hydratePromise;hydratePromise=(async()=>{if(!cacheFile)return;try{const data=JSON.parse(await readFile(cacheFile,'utf8'));for(const source of LOCAL_PUBLIC_SOURCES){const row=data.sources?.[source.id];if(row&&row.sourceUrl===source.url&&Array.isArray(row.events)&&row.events.length<=source.maxRecords&&Number.isFinite(row.retrievedAt)){row.sourceClockAheadSeconds=typeof row.sourceGeneratedAt==='number'?Math.max(0,(row.sourceGeneratedAt-row.retrievedAt)/1000):null;cached.set(source.id,row);}}}catch{}})();return hydratePromise;}
 async function persist(){if(!cacheFile)return;persistQueue=persistQueue.catch(()=>{}).then(async()=>{await mkdir(path.dirname(cacheFile),{recursive:true});await writeFile(cacheFile,JSON.stringify({kind:'genuine-public-development-read',savedAt:new Date(now()).toISOString(),productionActivated:false,sources:Object.fromEntries(cached)},null,2));});await persistQueue;}
 async function sourceRead(source){
  if(pending.has(source.id))return pending.get(source.id);
  const time=now(),old=cached.get(source.id);let failure=null;
  if(cacheOnly)failure='Cache-only review: no upstream requests';
  else if(old&&time-old.retrievedAt>=0&&time-old.retrievedAt<refreshMs)return {...old,status:old.rejectedCount||old.sourceClockAheadSeconds>60?'degraded':'healthy',cached:true,stale:false};
  else if((attempts.get(source.id)||0)>=maxReadsPerSource)failure='Local session read cap reached; retained records are cached';
  else if(lastAttempt.has(source.id)&&time-lastAttempt.get(source.id)<refreshMs)failure='Recent source failure; retained records stay cached until the next five-minute window';
  if(!failure){
   if(pending.has(source.id))return pending.get(source.id);
   const work=(async()=>{attempts.set(source.id,(attempts.get(source.id)||0)+1);lastAttempt.set(source.id,time);try{
    const {data,httpDate,bytes}=await boundedRead(source.url,fetchImpl),rows=data[source.collection];if(!Array.isArray(rows)||rows.length>source.maxRecords)throw Error('Public source record cap/schema');
    const retrievedAt=now(),parsed=rows.map(row=>source.normalize(row,new Date(retrievedAt))),events=parsed.map(r=>r.event).filter(Boolean).map(event=>({...event,metadata:{...event.metadata,coverage:source.coverage,qualityLimitations:['One reporting organization; independent corroboration is not established.','Missing reports do not establish safety or absence.'],retrievedAt,sourceFeedUrl:source.url,publicDevelopmentRead:true}}));
    const sourceGeneratedAt=source.id==='usgs'?data.metadata?.generated??null:null,sourceClockAheadSeconds=typeof sourceGeneratedAt==='number'?Math.max(0,(sourceGeneratedAt-retrievedAt)/1000):null;
    if(sourceClockAheadSeconds>60)for(const event of events)event.metadata.qualityLimitations.push('Source feed clock is ahead of local retrieval; freshness is uncertain.');
    const row={providerId:source.id,sourceUrl:source.url,coverage:source.coverage,retrievedAt,sourceGeneratedAt,sourceClockAheadSeconds,httpDate,bytes,events,rejectedCount:parsed.filter(r=>!r.event).length};cached.set(source.id,row);await persist();return {...row,status:row.rejectedCount||sourceClockAheadSeconds>60?'degraded':'healthy',cached:false,stale:false};
   }catch{const retained=cached.get(source.id);return {...retained,providerId:source.id,sourceUrl:source.url,coverage:source.coverage,events:retained?.events||[],status:retained?'degraded':'unavailable',cached:Boolean(retained),stale:Boolean(retained),errorMessage:'Public source read failed; retry after the five-minute cache window',errorCode:'public-source-unavailable'};}
   })().finally(()=>pending.delete(source.id));pending.set(source.id,work);return work;
  }
  return {...old,providerId:source.id,sourceUrl:source.url,coverage:source.coverage,events:old?.events||[],status:old?'degraded':'unavailable',cached:Boolean(old),stale:Boolean(old),errorMessage:failure,errorCode:cacheOnly?'cache-only':'session-read-cap'};
 }
 return {async events(request){await hydrate();const reads=await Promise.all(LOCAL_PUBLIC_SOURCES.map(sourceRead));const active=new Map(reads.map(r=>[r.providerId,r]));
   const overrides=EVENT_PROVIDERS.map(p=>{const read=active.get(p.id);return read?{...read,fetchedAt:read.retrievedAt?new Date(read.retrievedAt).toISOString():null,lastSuccessfulAt:read.retrievedAt?new Date(read.retrievedAt).toISOString():null,recordCount:read.events.length,durationMs:0}:{providerId:p.id,status:'disabled',events:[],recordCount:0,rejectedCount:0,cached:false,stale:false,statusMessage:'Not selected for this local preview'};});
   const response=await createEventsResponse(request,{env:{},now:now(),providerResultsOverride:overrides,runtimeMode:'local-public-preview'}),body=await response.json();
   body.localPreview={mode:cacheOnly?'saved-public-read':'bounded-public-read',productionActivated:false,cacheOnly,sessionReadCapPerSource:maxReadsPerSource,refreshMs,sources:reads.map(r=>({id:r.providerId,url:r.sourceUrl,coverage:r.coverage,retrievedAt:r.retrievedAt??null,sourceGeneratedAt:r.sourceGeneratedAt??null,sourceClockAheadSeconds:r.sourceClockAheadSeconds??null,status:r.status,cached:r.cached,stale:r.stale,count:r.events.length,rejectedCount:r.rejectedCount??null,message:[r.errorMessage,r.rejectedCount?`${r.rejectedCount} source records excluded by identity, coordinate or advisory-time validation; this is not a valid empty-feed measurement`:null,r.sourceClockAheadSeconds>60?'Source feed clock ahead of retrieval; freshness uncertain':null].filter(Boolean).join('. ')||'Public source retrieved'}))};
   lastEnvelope=body;return new Response(JSON.stringify(body),{status:response.status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
  },getLastEnvelope:()=>lastEnvelope,getReadCounts:()=>Object.fromEntries(attempts)};
}
