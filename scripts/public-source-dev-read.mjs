// Explicit one-shot public development reads. No account, saved activation or polling.
import {fetchDigitrafficVessels} from '../src/data/providers/digitraffic.js';
import {fetchAdsbLolAircraft} from '../src/data/providers/adsb-lol.js';
import {fetchNhcEvents} from '../src/data/providers/nhc.js';
import {writeFileSync,mkdirSync} from 'node:fs';
const at=Date.now();
const finnish={south:60.05,west:24.7,north:60.3,east:25.2};
const aircraft={south:51.3,west:-0.5,north:51.7,east:0.2};
const log=[];
const shapes={};
async function inspectedFetch(url,options) {
 const response=await fetch(url,options);
 if(response.ok){const json=await response.clone().json();const sample=(json.ac || json.aircraft || json.features || json.activeStorms || [])[0];shapes[new URL(url).hostname]={httpDate:response.headers.get('date'),receivedAt:new Date().toISOString(),topLevelKeys:Object.keys(json),sourceNow:json.now,recordKeys:Object.keys(sample || {}),positionAge:sample?.seen_pos,sourceTimestamp:sample?.properties?.timestampExternal,identityFormat:sample?.hex?{length:String(sample.hex).length,tildePrefix:String(sample.hex).startsWith('~')}:null};}return response;
}
for(const [id,run] of [
 ['digitraffic-ais',()=>fetchDigitrafficVessels({bbox:finnish,env:{DIGITRAFFIC_ENABLED:'true'},limit:30,fetchImpl:inspectedFetch})],
 ['adsb-lol',()=>fetchAdsbLolAircraft({bbox:aircraft,env:{ADSB_LOL_ENABLED:'true',ADSB_LOL_TERMS_REVIEWED:'true'},limit:30,fetchImpl:inspectedFetch})],
 ['nhc-current-storms',()=>fetchNhcEvents({env:{NHC_ENABLED:'true'},fetchImpl:inspectedFetch})],
]){
 try{const result=await run();log.push({providerId:id,at:new Date(at).toISOString(),status:result.status,count:(result.objects || result.events || []).length,rejectedCount:result.status?.rejectedCount || result.rejected?.length || 0,sample:(result.objects || result.events || []).slice(0,1),warnings:result.warnings,developmentReadOnly:true,liveActivated:false});}catch(error){log.push({providerId:id,at:new Date(at).toISOString(),error:error.message,developmentReadOnly:true,liveActivated:false});}
}
mkdirSync('evidence/sources',{recursive:true});writeFileSync('evidence/sources/public-dev-read.json',JSON.stringify(log,null,2));
writeFileSync('evidence/sources/public-shapes.json',JSON.stringify(shapes,null,2));
console.log(JSON.stringify(log.map(({sample,...rest})=>rest),null,2));
