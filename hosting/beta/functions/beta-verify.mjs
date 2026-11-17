import { collectSources, readSnapshots } from '../../../src/beta/snapshot-service.js';
import { withPublicApiGuard } from '../../../netlify/functions/lib/response.mjs';
import { snapshotStorage } from './lib/storage.mjs';
// Bounded read-only deployed verification: inject failure in isolated memory,
// never contact a provider or modify the public snapshots. No fixture positions.
export default async function verify(request){return withPublicApiGuard(request,async()=>{
  if(request.method!=='GET')return Response.json({error:'method-not-allowed'},{status:405});
  try{
    const real=await snapshotStorage().get('usgs');if(!real?.events?.length)return Response.json({error:'real-usgs-snapshot-required'},{status:503});
    const now=Math.max(Date.now(),real.nextAttemptAt+1);
    const memory=initial=>{let data=initial;return {get:async id=>id==='usgs'?data:null,set:async(_,value)=>{data=value;return true;}};};
    const retained=memory(structuredClone(real)),empty=memory(null);
    const fail=async()=>new Response('Injected verification failure',{status:503});
    await collectSources(retained,{now,ids:['usgs'],fetchImpl:fail,trigger:'isolated-runtime-verification'});
    await collectSources(empty,{now,ids:['usgs'],fetchImpl:fail,trigger:'isolated-runtime-verification'});
    const stale=await readSnapshots(retained,now),missing=await readSnapshots(empty,now);
    const checks={lastGoodRetained:stale.canonicalEvents.length===real.events.length&&stale.canonicalEvents.every((e,i)=>e.providerEventId===real.events[i].providerEventId),stale:stale.sourceStatus.usgs.availability==='Stale',firstFailureUnavailable:missing.sourceStatus.usgs.availability==='Unavailable',noReplacement:missing.canonicalEvents.length===0};
    return Response.json({ok:Object.values(checks).every(Boolean),kind:'simulated HTTP503 in deployed code, isolated memory only',checks,sourceId:real.events[0].providerEventId,publicSnapshotLastSuccessAt:real.lastSuccessAt,publicCacheWrites:0,upstreamRequests:0},{headers:{'Cache-Control':'public, max-age=600'}});
  }catch{return Response.json({error:'verification-unavailable'},{status:503});}
});}
