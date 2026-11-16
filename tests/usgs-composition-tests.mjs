import os from 'node:os';
import path from 'node:path';
import {normalizeUsgsFeature} from '../src/data/providers/usgs.js';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createLocalPublicPreview} from '../src/data/local-public-preview.js';
import {buildEventArtifact} from '../src/artifacts/event-artifacts.js';
import {artifactToMarkdown,artifactToJsonString} from '../src/ui/osint-dashboard-v2/artifact-export.js';
let reads=0;const now=Date.parse('2026-10-15T19:22:30.442Z');
const dir=await mkdtemp(path.join(os.tmpdir(),'usgs-export-'));
const input=process.argv[2] || path.join(dir,'cache.json');
if(!process.argv[2]) {
 const revision=now-75*3600000;
 const e=normalizeUsgsFeature({id:'export-regression',geometry:{type:'Point',coordinates:[-127,40,10]},properties:{mag:2.8,time:revision,updated:revision,status:'reviewed',url:'https://earthquake.usgs.gov/earthquakes/eventpage/export-regression'}},new Date(revision)).event;
 e.title='SYNTHETIC export regression';e.metadata={...e.metadata,qualityLimitations:['Source feed clock is ahead of local retrieval; freshness is uncertain.']};
 await writeFile(input,JSON.stringify({sources:{usgs:{providerId:'usgs',sourceUrl:'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',retrievedAt:revision,events:[e]}}}));
}
const bytes=await readFile(input),hash=b=>createHash('sha256').update(b).digest('hex');
const api=createLocalPublicPreview({cacheFile:input,cacheOnly:true,now:()=>now,fetchImpl:()=>{reads++;throw Error('No network');}});
const targetId=process.argv[2] ? 'usgs:us6000u1us' : 'usgs:export-regression';
const body=await(await api.events(new Request('http://127.0.0.1/api/events?hours=168'))).json();
for(const rows of [body.events,body.canonicalEvents,body.providerResults.find(r=>r.providerId==='usgs').events]){
 const e=rows.find(e=>e.id===targetId);assert.ok(e);assert.equal(e.freshnessScore,0);assert.equal(e.attentionScore,19);
}
const event=body.events.find(e=>e.id===targetId);const artifact=buildEventArtifact(event,{sourceStatus:body.sourceStatus,now});
assert.equal(artifact.evidenceRecord.id,event.id);assert.deepEqual(JSON.parse(artifactToJsonString(artifact)).evidenceRecord,artifact.evidenceRecord);assert.match(artifactToMarkdown(artifact),/Source feed clock is ahead/);
assert.equal(reads,0);assert.equal(hash(await readFile(input)),hash(bytes));
await writeFile(path.join(dir,'replay-export.json'),JSON.stringify({sourceCacheSha256:hash(bytes),now,upstreamReads:reads,cacheUnchanged:true,artifact},null,2));
await writeFile(path.join(dir,'replay-export.md'),artifactToMarkdown(artifact));
console.log('PASS cache replay/export (synthetic by default, optional supplied cache); all three representations freshness=0 attention=19; unchanged cache; zero upstream reads; JSON/Markdown export.');
