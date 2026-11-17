import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { normalizeUsgsFeature } from '../src/data/providers/usgs.js';
import { createLocalPublicPreview } from '../src/data/local-public-preview.js';
import { toLegacyEvent } from '../src/events/normalized-event.js';
import { normalizeEvent } from '../src/events/event-normalizer.js';
import { SOURCE_CLOCK_AHEAD_LIMITATION } from '../src/events/event-quality.js';
import { projectUsgsEvidence } from '../src/intelligence/event-evidence.js';
import { buildEventArtifact } from '../src/artifacts/event-artifacts.js';
import { renderEventDetailDrawer } from '../src/ui/osint-dashboard-v2/event-detail-drawer.js';
import { artifactToMarkdown } from '../src/ui/osint-dashboard-v2/artifact-export.js';
const now=Date.now();
const event=toLegacyEvent(normalizeUsgsFeature({id:'unit-only',geometry:{type:'Point',coordinates:[0,0,0]},properties:{mag:0,time:now-10000,updated:now-5000,url:'https://earthquake.usgs.gov/earthquakes/eventpage/unit-only',status:'reviewed'}},new Date(now)).event);
const sourceStatus={usgs:{status:'healthy',stale:false}};
const evidence=projectUsgsEvidence(event,{sourceStatus,now});
assert.equal(evidence.id,event.id);assert.equal(evidence.value,0);assert.equal(evidence.lat,0);
assert.equal(evidence.observedAt,new Date(now-10000).toISOString());assert.equal(evidence.extra.sourceRevisionAt,new Date(now-5000).toISOString());
assert.equal(evidence.retrievedAt,new Date(now).toISOString());assert.equal(evidence.extra.freshness,'current');assert.equal(evidence.extra.reviewStatus,'not-reviewed');
assert.equal(evidence.qualityLimitations.includes(SOURCE_CLOCK_AHEAD_LIMITATION),false);
const artifact=buildEventArtifact(event,{sourceStatus,now});assert.deepEqual(artifact.evidenceRecord,evidence);
assert.match(renderEventDetailDrawer(event,{sourceStatus}),/data-event-evidence="usgs:unit-only"/);
assert.match(renderEventDetailDrawer(event,{sourceStatus}),/Freshness: current/);
assert.match(artifactToMarkdown(artifact),/Retrieved.*\d{4}-/);
for(const state of ['degraded','unavailable']){
 const failed=projectUsgsEvidence(event,{sourceStatus:{usgs:{status:state,stale:true}},now});
 assert.equal(failed.extra.freshness,'stale');assert.equal(failed.retrievedAt,evidence.retrievedAt);assert.equal(failed.id,event.id);
}
assert.equal(projectUsgsEvidence(event,{sourceStatus,now:now+900001}).extra.freshness,'stale');
assert.equal(projectUsgsEvidence(event,{sourceStatus,now:now-1}).extra.freshness,'unknown');
assert.equal(projectUsgsEvidence(event,{now}).extra.freshness,'unknown');
const missing=projectUsgsEvidence({...event,ingestedAt:null,occurredAt:null,startedAt:null,updatedAt:null},{sourceStatus,now});
assert.equal(missing.retrievedAt,null);assert.equal(missing.observedAt,null);assert.equal(missing.extra.sourceRevisionAt,null);assert.equal(missing.extra.freshness,'unknown');
assert.equal(projectUsgsEvidence({...event,provider:'fixture'}),null);
for(const sourceUrl of ['javascript:alert(1)','https://evil.invalid/','https://user:pass@earthquake.usgs.gov/'])assert.equal(projectUsgsEvidence({...event,sourceUrl}),null);
assert.equal(projectUsgsEvidence({...event,id:'other:unit-only'}),null);
const clocked={...event,metadata:{...event.metadata,qualityLimitations:['One reporting organization; independent corroboration is not established.',SOURCE_CLOCK_AHEAD_LIMITATION]}};
const clockedEvidence=projectUsgsEvidence(clocked,{sourceStatus,now});
assert.deepEqual(clockedEvidence.qualityLimitations,[
  'One reporting organization; independent corroboration is not established.',
  'An epicenter is not an impact footprint.',
  SOURCE_CLOCK_AHEAD_LIMITATION,
]);
assert.match(artifactToMarkdown(buildEventArtifact(clocked,{sourceStatus,now})),/Source feed clock is ahead of local retrieval/);
const replayNow=Date.parse('2026-10-15T19:22:30.442Z');
const revision=replayNow-75*3600000;
const cached=normalizeUsgsFeature({id:'replay-stale',geometry:{type:'Point',coordinates:[-127.0627,40.6928,10]},properties:{mag:2.8,place:'Replay fixture',time:revision,updated:revision,status:'reviewed',url:'https://earthquake.usgs.gov/earthquakes/eventpage/replay-stale'}},new Date(revision)).event;
cached.freshnessScore=99;cached.attentionScore=34;
cached.metadata={...cached.metadata,retrievedAt:revision,qualityLimitations:[SOURCE_CLOCK_AHEAD_LIMITATION]};
const cacheDir=await mkdtemp(path.join(os.tmpdir(),'live-map-freshness-'));
const cacheFile=path.join(cacheDir,'cache.json');
await writeFile(cacheFile,JSON.stringify({kind:'genuine-public-development-read',savedAt:new Date(revision).toISOString(),productionActivated:false,sources:{usgs:{providerId:'usgs',sourceUrl:'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',coverage:'fixture',retrievedAt:revision,sourceGeneratedAt:revision+186558,sourceClockAheadSeconds:186.558,events:[cached],rejectedCount:0}}}));
const replay=createLocalPublicPreview({cacheFile,cacheOnly:true,now:()=>replayNow,fetchImpl:()=>{throw Error('Replay must never call upstream');}});
const body=await (await replay.events(new Request('http://127.0.0.1/api/events?hours=168'))).json();
const served=body.canonicalEvents.find((item)=>item.id==='usgs:replay-stale');
const legacy=body.events.find((item)=>item.id==='usgs:replay-stale');
assert.equal(served.freshnessScore,0);assert.equal(served.attentionScore,19);
assert.equal(legacy.freshnessScore,0);assert.equal(legacy.attentionScore,19);
assert.equal(normalizeEvent(legacy,replayNow).freshnessScore,0);assert.equal(normalizeEvent(legacy,replayNow).attentionScore,19);
assert.equal(body.providerResults.find((result)=>result.providerId==='usgs').events[0].freshnessScore,0);
const replayEvidence=projectUsgsEvidence(served,{sourceStatus:body.sourceStatus,now:replayNow});
assert.ok(replayEvidence.qualityLimitations.includes(SOURCE_CLOCK_AHEAD_LIMITATION));
assert.equal(JSON.parse(await readFile(cacheFile,'utf8')).sources.usgs.events[0].freshnessScore,99);
console.log('USGS spine: stable identity, human/agent/export parity, separate clocks, unknowns, zero, stale/future boundaries, read-time freshness and source rejection passed; synthetic unit input only.');

// A later duplicate revision must replace the old score after merge; unknown
// and future clocks must stay unknown across every response representation.
for (const updatedAt of [null, replayNow+60000, replayNow-3600000]) {
 const original=JSON.parse(await readFile(cacheFile,'utf8'));
 const base={...cached,updatedAt,freshnessScore:99,attentionScore:99};
 original.sources.usgs.events=updatedAt===replayNow-3600000 ? [cached,base] : [base];
 await writeFile(cacheFile,JSON.stringify(original));
 const before=await readFile(cacheFile,'utf8');let reads=0;
 const local=createLocalPublicPreview({cacheFile,cacheOnly:true,now:()=>replayNow,fetchImpl:()=>{reads++;throw Error('forbidden');}});
 const result=await(await local.events(new Request('http://localhost/api/events?hours=168'))).json();
 for(const rows of [result.events,result.canonicalEvents,result.providerResults.find(r=>r.providerId==='usgs').events]) {
  const last=rows.at(-1);assert.equal(last.freshnessScore,updatedAt===replayNow-3600000?96:null);assert.notEqual(last.attentionScore,99);
 }
 assert.equal(result.canonicalEvents.length,1);assert.equal(reads,0);assert.equal(await readFile(cacheFile,'utf8'),before);
}
console.log('PASS post-dedupe newer revision, unknown/future API clocks, attention recomputation, all representations and byte-preserving zero-read replay.');
