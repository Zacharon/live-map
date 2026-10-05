import { SOURCE_POLICY, fetchSourceJson, normalizeSource } from './public-sources.js';

export function sourceState(id, snapshot, now=Date.now()) {
  const p=SOURCE_POLICY[id],last=snapshot?.lastSuccessAt??null;
  const age=last==null?null:Math.max(0,now-last);
  const availability=last==null?'Unavailable':snapshot.lastError||age>p.staleMs?'Stale':age>p.intervalMs*2?'Delayed':'Fresh';
  return {id,name:p.name,dataKind:p.kind,availability,coverage:p.coverage,url:p.url,lastSuccessAt:last,lastAttemptAt:snapshot?.lastAttemptAt??null,sourceGeneratedAt:snapshot?.sourceGeneratedAt??null,
    nextAttemptAt:snapshot?.nextAttemptAt??null,recordCount:snapshot?.events?.length||0,error:snapshot?.lastError||null,stale:availability==='Stale',intervalMs:p.intervalMs,rejectedCount:snapshot?.rejectedCount||0};
}
// Collector is the sole upstream reader. Public API reads this replaceable
// delivery cache, never invokes a provider or substitutes fixture records.
export async function collectSources(storage,{now=Date.now(),fetchImpl=fetch,trigger='scheduled',ids=Object.keys(SOURCE_POLICY)}={}) {
  const result={};
  await Promise.all(ids.map(async id=>{
    const p=SOURCE_POLICY[id];const old=await storage.get(id);
    if(old?.nextAttemptAt>now){result[id]={skipped:true,...sourceState(id,old,now)};return;}
    let next;
    try {
      const normalized=normalizeSource(id,await fetchSourceJson(p,fetchImpl),now);
      next={schema:1,...normalized,lastSuccessAt:now,lastAttemptAt:now,nextAttemptAt:now+p.intervalMs,lastError:null,failures:0,trigger};
    }catch(error){
      const failures=Math.min(6,(old?.failures||0)+1);
      const message=/^(HTTP \d{3}|response-too-large|invalid-source-envelope)$/.test(error.message)?error.message:'source-fetch-failed';
      next={...(old||{schema:1,events:[],lastSuccessAt:null}),lastAttemptAt:now,nextAttemptAt:now+Math.min(3600000,p.intervalMs*2**(failures-1)),lastError:message,failures,trigger};
    }
    // Storage adapter performs a conditional atomic write against the version
    // read above. A slower overlapping collector cannot overwrite newer data.
    const written=await storage.set(id,next);
    result[id]={written,...sourceState(id,next,now)};
  }));
  return result;
}
export async function readSnapshots(storage,now=Date.now()) {
  const sourceStatus={},canonicalEvents=[];
  for(const id of Object.keys(SOURCE_POLICY)){
    const snapshot=await storage.get(id);const status=sourceState(id,snapshot,now);sourceStatus[id]=status;
    for(const event of snapshot?.events||[])canonicalEvents.push({...event,sourceAvailability:status.availability});
  }
  return {schema:'live-map-beta/1',mode:'live-beta',generatedAt:now,canonicalEvents,events:canonicalEvents,sourceStatus,
    sources:Object.values(sourceStatus).filter(s=>s.lastSuccessAt!=null).map(s=>s.name),
    systemStatus:sourceStatus.usgs.availability==='Unavailable'?'unavailable':Object.values(sourceStatus).every(s=>s.availability==='Fresh')?'fresh':'partial',
    errors:Object.values(sourceStatus).filter(s=>s.error).map(s=>({source:s.id,error:s.error})),
    unavailableLayers:{aircraft:'Disabled — no permitted pilot activated',vessels:'Unavailable — permitted AIS collector not configured',satellites:'Disabled — real elements/propagation not yet connected'}};
}
