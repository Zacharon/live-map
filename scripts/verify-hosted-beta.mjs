import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const base='https://live-map-systems-beta.netlify.app';
const manifest=JSON.parse(await readFile('artifacts/live-beta-2026-10-01/public-manifest.json','utf8'));
// Netlify postprocesses HTML links and adds its Free-plan badge. Compare the
// executable/style assets byte-for-byte and validate the hosted shell itself.
const paths=['src/candidates/intelligence-workbench/presentation/workbench.css','src/candidates/intelligence-workbench/presentation/workbench.js','src/candidates/intelligence-workbench/data/live-records.js'];
for(const path of paths){const response=await fetch(`${base}/${path}`,{signal:AbortSignal.timeout(15000)});assert.equal(response.status,200);assert.equal(createHash('sha256').update(new Uint8Array(await response.arrayBuffer())).digest('hex'),manifest.files.find(f=>f.path===path).sha256,path);}
const shell=await (await fetch(base)).text();assert.match(shell,/Systems Desk beta/);assert.match(shell,/data-theme="dark"/);assert.match(shell,/Calculated satellites · CelesTrak/);
const response=await fetch(`${base}/.netlify/functions/events`,{signal:AbortSignal.timeout(15000)});assert.equal(response.status,200);const data=await response.json();
const usgs=data.canonicalEvents.find(e=>e.providerEventId==='us6000tyxk');assert.equal(usgs.latitude,36.0904);assert.equal(usgs.longitude,139.7487);assert.equal(usgs.metadata.depthKm,65.032);
assert.ok(data.canonicalEvents.filter(e=>e.provider!=='celestrak').every(e=>e.confidence==null&&e.severity==null&&e.attentionScore==null));assert.ok(data.canonicalEvents.filter(e=>e.provider==='eonet').every(e=>e.sourcePublishedAt==null));
const sat=data.canonicalEvents.find(e=>e.provider==='celestrak'&&e.providerEventId==='25544');assert.ok(sat,'Real calculated ISS must be present');assert.equal(sat.dataKind,'Calculated');assert.equal(sat.startedAt,null);assert.equal(Date.parse(sat.calculation.calculatedFor),data.generatedAt);assert.ok(sat.calculatedHeightKm>100&&sat.calculatedHeightKm<600);
const fault=await (await fetch(`${base}/.netlify/functions/beta-verify`,{signal:AbortSignal.timeout(15000)})).json();assert.equal(fault.ok,true);assert.equal(fault.publicCacheWrites,0);assert.equal(fault.upstreamRequests,0);
for(const path of ['/hosting/beta/functions/lib/stations-seed.json','/hosting/beta/package.json'])assert.equal((await fetch(base+path)).status,404);
await writeFile('artifacts/live-beta-2026-10-01/hosted-api-final.json',JSON.stringify(data,null,2));
await writeFile('artifacts/live-beta-2026-10-01/hosted-final-verification.json',JSON.stringify({checkedAt:new Date().toISOString(),base,exactHostedAssets:paths,sourceStatus:data.sourceStatus,sourceId:usgs.providerEventId,satellite:sat,simulatedFailure:fault},null,2));
console.log(JSON.stringify({assets:paths.length,records:data.canonicalEvents.length,satellite:sat.providerEventId,sourceId:usgs.providerEventId,failureChecks:Object.keys(fault.checks).length}));
