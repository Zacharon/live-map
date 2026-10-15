// Loopback-only verification of the exact public build and genuine delivery cache.
import http from 'node:http';
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { collectSources, readSnapshots } from '../src/beta/snapshot-service.js';
import { fileStorage } from '../src/beta/file-storage.mjs';
import { calculatedSatellites } from '../src/beta/satellite-service.js';
import * as satelliteApi from '../hosting/beta/node_modules/satellite.js/dist/index.js';
const artifacts='artifacts/evidence-ledger-2026-10-02',storage=fileStorage(`${artifacts}/local-cache`);
if(process.argv.includes('--collect')){
  const result=await collectSources(storage,{trigger:'manual-local-verification'});
  await writeFile(`${artifacts}/source-check.json`,JSON.stringify({at:new Date().toISOString(),runtime:'Local Node; not deployed',result},null,2));
  console.log('Actual local source collection:',Object.fromEntries(Object.entries(result).map(([id,s])=>[id,{records:s.recordCount,status:s.availability,error:s.error}])));
}
const manifest=JSON.parse(await readFile('artifacts/live-beta-2026-10-01/public-manifest.json','utf8'));
const allowed=new Set(manifest.files.map(f=>f.path));
const seed=JSON.parse(await readFile('hosting/beta/functions/lib/stations-seed.json','utf8'));
async function envelope(){const now=Date.now(),result=await readSnapshots(storage,now);const satellites=calculatedSatellites({...seed,lastSuccessAt:seed.retrievedAt,acquisition:'Local verification uses the retained genuine 2026-10-02 retrieval; no additional CelesTrak request'},now,satelliteApi);result.canonicalEvents.push(...satellites.events);result.sourceStatus.celestrak=satellites.status;result.events=result.canonicalEvents;return result;}
await writeFile(`${artifacts}/local-api.json`,JSON.stringify(await envelope(),null,2));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'};
const csp="default-src 'self'; script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://server.arcgisonline.com; connect-src 'self'; worker-src 'self' blob:; child-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'";
http.createServer(async(req,res)=>{
  const headers={'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Content-Security-Policy':csp,'Cache-Control':'no-store'};
  try{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,headers);res.end();return;}
    const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    if(pathname==='/api/events'||pathname==='/.netlify/functions/events'){const data=await envelope();res.writeHead(data.systemStatus==='unavailable'?503:200,{...headers,'Content-Type':'application/json'});res.end(req.method==='HEAD'?undefined:JSON.stringify(data));return;}
    if(pathname.startsWith('/api/')){res.writeHead(503,{...headers,'Content-Type':'application/json'});res.end(JSON.stringify({unavailable:true}));return;}
    const file=pathname==='/'?'index.html':pathname.slice(1);
    if(!allowed.has(file)){res.writeHead(404,headers);res.end('Unavailable');return;}
    const bytes=await readFile(path.join('hosting/beta/dist',file));res.writeHead(200,{...headers,'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:bytes);
  }catch{res.writeHead(500,headers);res.end('Local verification unavailable');}
}).listen(8773,'127.0.0.1',()=>console.log(`Local beta verification http://127.0.0.1:8773 · PID ${process.pid} · no upstream requests from readers`));
