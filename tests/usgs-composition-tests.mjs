import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createLocalPublicPreview} from '../src/data/local-public-preview.js';
import {buildEventArtifact} from '../src/artifacts/event-artifacts.js';
import {artifactToMarkdown,artifactToJsonString} from '../src/ui/osint-dashboard-v2/artifact-export.js';
const input=process.argv[2] || 'artifacts/usgs-composition-local/saved-cache.json';
const bytes=await readFile(input),hash=b=>createHash('sha256').update(b).digest('hex');
let reads=0;const now=Date.parse('2026-10-15T19:22:30.442Z');
const api=createLocalPublicPreview({cacheFile:input,cacheOnly:true,now:()=>now,fetchImpl:()=>{reads++;throw Error('No network');}});
const body=await(await api.events(new Request('http://127.0.0.1/api/events?hours=168'))).json();
for(const rows of [body.events,body.canonicalEvents,body.providerResults.find(r=>r.providerId==='usgs').events]){
 const e=rows.find(e=>e.id==='usgs:us6000u1us');assert.ok(e);assert.equal(e.freshnessScore,0);assert.equal(e.attentionScore,19);
}
const event=body.events.find(e=>e.id==='usgs:us6000u1us');const artifact=buildEventArtifact(event,{sourceStatus:body.sourceStatus,now});
assert.equal(artifact.evidenceRecord.id,event.id);assert.deepEqual(JSON.parse(artifactToJsonString(artifact)).evidenceRecord,artifact.evidenceRecord);assert.match(artifactToMarkdown(artifact),/Source feed clock is ahead/);
assert.equal(reads,0);assert.equal(hash(await readFile(input)),hash(bytes));
await writeFile('artifacts/usgs-composition-local/replay-export.json',JSON.stringify({sourceCacheSha256:hash(bytes),now,upstreamReads:reads,cacheUnchanged:true,artifact},null,2));
await writeFile('artifacts/usgs-composition-local/replay-export.md',artifactToMarkdown(artifact));
console.log('PASS genuine saved usgs:us6000u1us; all three representations freshness=0 attention=19; unchanged cache; zero upstream reads; JSON/Markdown export.');
