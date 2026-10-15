// Local static preview: reads retained genuine delivery cache; no collector/upstream call.
import http from 'node:http';
import path from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {readSnapshots} from '../src/beta/snapshot-service.js';
import {fileStorage} from '../src/beta/file-storage.mjs';
import {buildEnergyState} from '../src/intelligence/energy-state.js';
const folder='artifacts/energy-state-2026-10-04',root=path.resolve(folder,'public');
const manifest=JSON.parse(await readFile(`${folder}/public-manifest.json`));
const allowed=new Set(manifest.files.map(f=>f.path));
const storage=fileStorage('artifacts/evidence-ledger-2026-10-02/local-cache');
async function envelope(){const now=Date.now(),data=await readSnapshots(storage,now);data.energyState=buildEnergyState(data.canonicalEvents,{asOf:now});return data;}
await writeFile(`${folder}/local-api.json`,JSON.stringify(await envelope(),null,2));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'};
const csp="default-src 'self'; script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://server.arcgisonline.com; connect-src 'self'; worker-src 'self' blob:; child-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'";
http.createServer(async(req,res)=>{const headers={'X-Content-Type-Options':'nosniff','Content-Security-Policy':csp,'Cache-Control':'no-store'};
  try{if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,headers);res.end();return;}
    const url=new URL(req.url,'http://127.0.0.1');
    if(['/api/events','/.netlify/functions/events'].includes(url.pathname)){res.writeHead(200,{...headers,'Content-Type':'application/json'});res.end(req.method==='HEAD'?undefined:JSON.stringify(await envelope()));return;}
    const relative=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
    if(!allowed.has(relative)){res.writeHead(404,headers);res.end('Unavailable');return;}
    const bytes=await readFile(path.join(root,relative));res.writeHead(200,{...headers,'Content-Type':types[path.extname(relative)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:bytes);
  }catch{res.writeHead(500,headers);res.end('Local preview unavailable');}
}).listen(8774,'127.0.0.1',()=>console.log(`Energy state preview http://127.0.0.1:8774 · PID ${process.pid} · retained snapshots, no new collection`));
