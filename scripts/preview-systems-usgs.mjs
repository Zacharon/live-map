// Reproduce the existing Systems Desk with one real provider and explicit local
// failure controls. No deployment, scheduler, provider activation or database.
import http from 'node:http';
import path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { collectSources, readSnapshots } from '../src/beta/snapshot-service.js';
import { fileStorage } from '../src/beta/file-storage.mjs';
import { SOURCE_POLICY } from '../src/beta/public-sources.js';
const folder='artifacts/usgs-baseline-2026-10-05';
await mkdir(folder,{recursive:true});
const storage=fileStorage(`${folder}/cache`);
if(process.argv.includes('--collect')) {
  const fetchImpl=async(url,options)=>{
    if(url!==SOURCE_POLICY.usgs.url)throw Error('Only the fixed USGS feed is allowed');
    const response=await fetch(url,options);
    if(!response.ok)return response;
    const raw=await response.clone().text();
    if(Buffer.byteLength(raw)>SOURCE_POLICY.usgs.maxBytes)throw Error('response-too-large');
    await writeFile(`${folder}/usgs-original.geojson`,raw);
    await writeFile(`${folder}/acquisition.json`,JSON.stringify({at:new Date().toISOString(),url,status:response.status,sha256:createHash('sha256').update(raw).digest('hex'),environment:'Local Node / one bounded public USGS read'},null,2));
    return response;
  };
  const result=await collectSources(storage,{fetchImpl,ids:['usgs'],trigger:'manual-local-baseline'});
  await writeFile(`${folder}/collection.json`,JSON.stringify(result,null,2));
  if(!result.usgs.lastSuccessAt||result.usgs.error)throw Error('Genuine USGS acquisition failed; no fixture replacement');
}
const good=await storage.get('usgs');
if(!good?.events?.length)throw Error('Run with --collect to acquire genuine records first');
const manifest=JSON.parse(await readFile('artifacts/live-beta-2026-10-01/public-manifest.json'));
const allowed=new Set(manifest.files.map(f=>f.path));
const git=(...args)=>execFileSync('git',['-c',`safe.directory=${process.cwd().replaceAll('\\','/')}`,...args],{encoding:'utf8'}).trim();
const revision={head:git('rev-parse','HEAD'),branch:git('branch','--show-current'),dirty:git('status','--porcelain','--untracked-files=no'),environment:'Loopback Node / Systems Desk / local replaceable cache; no native PostgreSQL or hosted evidence'};
await writeFile(`${folder}/runtime-source.json`,JSON.stringify(revision,null,2));
async function mode(){try{return (await readFile(`${folder}/control.txt`,'utf8')).trim();}catch(e){if(e.code==='ENOENT')return 'available';throw e;}}
async function envelope(selectedMode){
  let current=structuredClone(good);
  if(['upstream-failure','empty-failure'].includes(selectedMode)){
    current=selectedMode==='empty-failure'?null:{...current,nextAttemptAt:0};
    const memory={async get(id){return id==='usgs'?current:null;},async set(id,value){current=value;return true;}};
    await collectSources(memory,{ids:['usgs'],fetchImpl:async()=>new Response('Controlled local upstream failure',{status:503}),trigger:'local-failure-simulation'});
  }
  const data=await readSnapshots({async get(id){return id==='usgs'?current:null;}},Date.now());
  return {...data,sourceRevision:revision,verificationEnvironment:{mode:selectedMode,providerFailureSimulated:selectedMode!=='available',records:'Genuine retained USGS response; no synthetic replacement'}};
}
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'};
const csp="default-src 'self'; script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://server.arcgisonline.com; connect-src 'self'; worker-src 'self' blob:; child-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'";
http.createServer(async(req,res)=>{
  const headers={'Content-Security-Policy':csp,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'};
  try{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,headers);res.end();return;}
    const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    if(['/api/events','/.netlify/functions/events'].includes(pathname)){
      const selectedMode=await mode();
      if(selectedMode==='api-failure'){res.writeHead(503,{...headers,'Content-Type':'application/json'});res.end('{"error":"controlled-local-api-failure"}');return;}
      const data=await envelope(selectedMode);res.writeHead(data.systemStatus==='unavailable'?503:200,{...headers,'Content-Type':'application/json'});res.end(req.method==='HEAD'?undefined:JSON.stringify(data));return;
    }
    const relative=pathname==='/'?'index.html':pathname.slice(1);
    if(!allowed.has(relative)){res.writeHead(404,headers);res.end('Unavailable');return;}
    const bytes=await readFile(path.join('hosting/beta/dist',relative));res.writeHead(200,{...headers,'Content-Type':types[path.extname(relative)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:bytes);
  }catch{res.writeHead(500,headers);res.end('Local verification unavailable');}
}).listen(8789,'127.0.0.1',()=>console.log(`Systems Desk USGS: http://127.0.0.1:8789/ · ${revision.head} · control=${folder}/control.txt`));
