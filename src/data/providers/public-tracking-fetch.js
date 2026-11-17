import { createLinkedSignal } from "./fetch-timeout.js";

// Fixed-host, bounded public read shared by the optional tracking/current-storm adapters.
const hosts={'digitraffic-ais':'meri.digitraffic.fi','adsb-lol':'api.adsb.lol','nhc-current-storms':'www.nhc.noaa.gov'};
const cache=new Map(),pending=new Map(),lastAttempt=new Map();
export function viewportCircle(bbox) {
  if(!bbox || bbox.antimeridian || ![bbox.south,bbox.west,bbox.north,bbox.east].every(Number.isFinite) || bbox.south>=bbox.north || bbox.west>=bbox.east || bbox.south < -90 || bbox.north >90 || bbox.west < -180 || bbox.east >180 || (bbox.north-bbox.south)*(bbox.east-bbox.west)>400) return null;
  const latitude=(bbox.south+bbox.north)/2,longitude=(bbox.west+bbox.east)/2;
  const rad=Math.PI/180;
  const dlat=(bbox.north-latitude)*rad,dlon=(bbox.east-longitude)*rad;
  const a=Math.sin(dlat/2)**2+Math.cos(latitude*rad)*Math.cos(bbox.north*rad)*Math.sin(dlon/2)**2;
  const radiusKm=Math.ceil(6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))*10)/10;
  return {latitude,longitude,radiusKm};
}
export function withinBbox(object,bbox){return object.latitude>=bbox.south&&object.latitude<=bbox.north&&object.longitude>=bbox.west&&object.longitude<=bbox.east;}
export async function fetchBoundedPublicJson(url,{providerId,fetchImpl=fetch,now=Date.now(),cacheMs=60000,maxBytes=2*1024*1024,signal}={}) {
  const target=new URL(url);
  if(target.protocol!=='https:'||target.hostname!==hosts[providerId]||target.username||target.password)throw Error('Unsupported provider URL');
  const key=target.href,cached=cache.get(key);
  if(cached&&now-cached.fetchedAt>=0&&now-cached.fetchedAt<cacheMs)return {...cached,cached:true};
  if(pending.has(key))return pending.get(key);
  if(lastAttempt.has(providerId)&&now-lastAttempt.get(providerId)<60000)throw Error('Local provider request budget exhausted');
  lastAttempt.set(providerId,now);
  const work=(async()=>{
    const linked=createLinkedSignal(signal,12000);
    try {
    const response=await fetchImpl(target,{redirect:'error',signal:linked.signal,headers:{accept:'application/json','accept-encoding':'gzip','Digitraffic-User':'LiveMap/LocalReview','user-agent':'LiveMap/LocalReview'}});
    if(!response.ok)throw Error('Provider HTTP '+response.status);
    if(Number(response.headers.get('content-length'))>maxBytes)throw Error('Provider response exceeds byte limit');
    const reader=response.body.getReader();let size=0;const chunks=[];
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw Error('Provider response exceeds byte limit');}chunks.push(value);}}finally{reader.releaseLock();}
    const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.byteLength;}
    const result={data:JSON.parse(new TextDecoder().decode(bytes)),fetchedAt:now,cached:false};
    cache.set(key,result);while(cache.size>128)cache.delete(cache.keys().next().value);return result;
    } finally { linked.clear(); }
  })().finally(()=>pending.delete(key));pending.set(key,work);return work;
}
