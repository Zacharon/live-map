import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const base=process.argv[2];
if(!base||!/^https?:\/\//.test(base))throw new Error('Pass the exact beta URL');
const checks=[];
async function get(path){return fetch(new URL(path,base),{redirect:'error',signal:AbortSignal.timeout(20000)});}
const page=await get('/');assert.equal(page.status,200);assert.match(await page.text(),/Systems Desk beta/);
for(const [key,value] of [['x-content-type-options','nosniff'],['x-frame-options','DENY']])assert.equal(page.headers.get(key),value);
const csp=page.headers.get('content-security-policy');assert.ok(csp?.includes("worker-src 'self' blob:"));assert.ok(csp?.includes("connect-src 'self'"));checks.push('shell and security headers');
for(const path of ['/vendor/cesium/index.js','/vendor/cesium/Widgets/widgets.css','/vendor/cesium/Workers/createBoxGeometry.js','/vendor/cesium/Assets/Textures/NaturalEarthII/0/0/0.jpg','/vendor/leaflet/leaflet.js','/src/candidates/intelligence-workbench/presentation/workbench.js']){assert.equal((await get(path)).status,200,path);}checks.push('Cesium modules, worker, globe texture, Leaflet and current candidate');
const snapshots=[];
for(const path of ['/api/events','/.netlify/functions/events','/api/events']){const response=await get(path);assert.equal(response.status,200);const data=await response.json();assert.equal(data.schema,'live-map-beta/1');assert.equal(data.mode,'live-beta');assert.ok(data.canonicalEvents.some(e=>e.provider==='usgs'));assert.ok(data.canonicalEvents.every(e=>e.providerEventId&&['Observed','Reported','Calculated'].includes(e.dataKind)));snapshots.push(data);}
for(const data of snapshots.slice(1))assert.equal(data.sourceStatus.usgs.lastSuccessAt,snapshots[0].sourceStatus.usgs.lastSuccessAt);checks.push('separate read-only invocations return the shared genuine USGS snapshot');
for(const path of ['/api/reviews','/api/sources','/api/moving-objects'])assert.equal((await get(path)).status,503,path);
for(const path of ['/artifacts/live-beta-2026-10-01/source-check.json','/.env','/package.json','/docs/API_CONTRACTS.md','/tests/live-beta-tests.mjs'])assert.equal((await get(path)).status,404,path);checks.push('unavailable APIs and excluded private/development paths');
const post=await fetch(new URL('/api/events',base),{method:'POST',signal:AbortSignal.timeout(10000)});assert.equal(post.status,405);checks.push('read API rejects writes');
const report={base,checkedAt:new Date().toISOString(),checks,sourceStatus:snapshots[0].sourceStatus,usgsTrace:snapshots[0].canonicalEvents.find(e=>e.provider==='usgs')};
await writeFile('artifacts/live-beta-2026-10-01/'+(base.includes('localhost')?'local':'hosted')+'-smoke.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:checks.length,records:snapshots[0].canonicalEvents.length,usgs:report.usgsTrace.providerEventId,base}));
