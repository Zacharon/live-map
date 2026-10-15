// Read-only HTTP verification; never invokes the collector or providers.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base=process.argv[2],folder='artifacts/evidence-ledger-2026-10-02';
if(!base||!/^https?:\/\//.test(base))throw Error('Pass the exact beta URL');
const get=relative=>fetch(new URL(relative,base),{redirect:'error',signal:AbortSignal.timeout(25000)});
const manifest=JSON.parse(await readFile(`${folder}/public-manifest.json`));
const assetChecks=[],htmlChecks=[];
for(const file of manifest.files.filter(f=>f.path==='index.html'||f.path.startsWith('src/candidates/intelligence-workbench/'))){
  const response=await get('/'+file.path);assert.equal(response.status,200,file.path);const bytes=Buffer.from(await response.arrayBuffer()),sha256=createHash('sha256').update(bytes).digest('hex');
  if(file.path.endsWith('.html')){
    const expected=await readFile('hosting/beta/dist/'+file.path,'utf8'),actual=bytes.toString('utf8');
    for(const [,id] of expected.matchAll(/\bid="([^"]+)"/g))assert.ok(actual.includes(`id="${id}"`)||actual.includes(`id='${id}'`),id);
    const scriptSources=text=>[...text.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)].map(m=>m[1]).sort();
    const hostedSources=scriptSources(actual),netlifyHud='/.netlify/scripts/hud?variant=public';
    assert.deepEqual(hostedSources.filter(src=>src!==netlifyHud),scriptSources(expected));
    const hostingScripts=hostedSources.filter(src=>src===netlifyHud);assert.ok(hostingScripts.length<=1);
    assert.match(actual,/data-theme=["']dark["']/);assert.match(actual,/<title>Live Map · Systems Desk beta<\/title>/);
    htmlChecks.push({path:file.path,buildSha256:file.sha256,hostSha256:sha256,exactBytes:sha256===file.sha256,allControlIds:true,expectedAppScriptSources:true,hostingScripts,transformation:'Netlify hosting comment, pretty-URL anchor rewrites, and the exact same-origin public HUD script'});
  }else assert.equal(sha256,file.sha256,file.path);
  assetChecks.push(file.path);
}
const shell=await get('/');assert.equal(shell.headers.get('x-content-type-options'),'nosniff');assert.ok(shell.headers.get('content-security-policy')?.includes("connect-src 'self'"));
const response=await get('/api/events');assert.equal(response.status,200);const data=await response.json();assert.equal(data.schema,'live-map-beta/1');assert.equal(data.mode,'live-beta');
for(const id of ['usgs','nws','eonet','gdacs','swpc','celestrak'])assert.ok(data.sourceStatus[id],id);
for(const id of ['gdacs','swpc'])assert.ok(data.canonicalEvents.some(e=>e.provider===id),`${id} not collected yet`);
const gdacs=data.canonicalEvents.filter(e=>e.provider==='gdacs'),swpc=data.canonicalEvents.filter(e=>e.provider==='swpc');
assert.ok(gdacs.every(e=>e.status==='unknown'&&e.sourcePublishedAt==null&&e.confidence==null&&e.metadata.details['Provider status']==null));
assert.ok(gdacs.every(e=>e.links.length>=2&&e.metadata.coordinateMethod.includes('not a measured position')));
assert.ok(swpc.every(e=>e.geographic===false&&e.latitude==null&&e.longitude==null&&e.startedAt==null&&e.sourcePublishedAt&&e.metadata.originalMessage===e.description));
assert.match(data.sourceStatus.usgs.coverage,/7 days/);assert.ok(data.sourceStatus.usgs.recordCount>100);
assert.ok(data.canonicalEvents.some(e=>e.provider==='nws'&&e.metadata.navigationRegions?.length&&e.metadata.instruction));
assert.ok(data.canonicalEvents.every(e=>e.providerEventId&&['Observed','Reported','Calculated'].includes(e.dataKind)));
const direct=await get('/.netlify/functions/events');assert.equal(direct.status,200);const directData=await direct.json();assert.equal(directData.sourceStatus.gdacs.lastSuccessAt,data.sourceStatus.gdacs.lastSuccessAt);
const counts=data.canonicalEvents.reduce((n,e)=>{n[e.provider]=(n[e.provider]||0)+1;return n;},{});
await writeFile(`${folder}/hosted-api.json`,JSON.stringify(data,null,2));
const report={base,checkedAt:new Date().toISOString(),assetChecks,htmlChecks,counts,sourceStatus:data.sourceStatus,checks:['Exact current candidate JS/CSS; HTML controls/scripts retained through Netlify processing','Read-only shared cache and direct endpoint','New GDACS/NOAA clocks, links, source truth','Seven-day USGS and rich NWS zone/instruction metadata','No demo replacement']};
await writeFile(`${folder}/hosted-verification.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({assets:assetChecks.length,counts,status:data.systemStatus}));
