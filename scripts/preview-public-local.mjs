import http from 'node:http';import {readFile} from 'node:fs/promises';import path from 'node:path';
import {createLocalPublicPreview} from '../src/data/local-public-preview.js';
import {createSourcesResponse} from '../src/api/sources-response.js';
const root=process.cwd(),port=Number(process.argv[2]||8782),cacheOnly=process.argv.includes('--cache-only');
const preview=createLocalPublicPreview({cacheFile:path.join(root,'evidence/public-preview-cache.json'),cacheOnly});
const aliases={'/':'/index.html','/sources':'/source-explorer.html','/countries':'/countries.html','/diagnostics':'/diagnostics.html'};
const allowed=/^\/(?:(?:index|404|source-explorer|countries|diagnostics|about)\.html|[a-z0-9-]+\.(?:css|js|txt|xml|svg|ico|png|webp)|(?:src|vendor|data)\/[a-z0-9_./-]+)$/i;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.wasm':'application/wasm','.xml':'application/xml','.ico':'image/x-icon','.webp':'image/webp'};
http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://127.0.0.1:'+port);res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 // Existing local Cesium CSP exception only; production netlify.toml stays unchanged.
 res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data: blob:; script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self'; worker-src 'self' blob:; child-src 'self' blob:; object-src 'none'");
 if(['/api/events','/.netlify/functions/events'].includes(url.pathname)){
  const response=await preview.events(new Request(url,{method:req.method}));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
 }
 if(url.pathname==='/api/sources'){const response=await createSourcesResponse(new Request(url));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;}
 if(url.pathname==='/api/provider-health'){const body=preview.getLastEnvelope();res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({data:{mode:'local-public-preview',systemStatus:body?.systemStatus||'not-loaded',providers:body?.providerResults||[],note:'Only explicitly bounded local public reads. Production activation unchanged.'}}));return;}
 if(url.pathname.startsWith('/api/')){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'local-module-unavailable',status:'unavailable',message:'This local slice has no hosted database, durable change log, tracking or economic series.'}));return;}
 const requested=aliases[url.pathname]||url.pathname;if(!allowed.test(requested)||requested.includes('..')){res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');return;}
 const file=path.resolve(root,'.'+requested);if(!file.startsWith(root+path.sep))throw Error('Invalid path');const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(bytes);
 }catch{res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'local-preview-unavailable',status:'unavailable'}));}
}).listen(port,'127.0.0.1',()=>console.log(`Local ${cacheOnly?'cached public review':'public-data'} preview: http://127.0.0.1:${port}/?view=feed&hours=24&sort=newest-occurred&mapMode=3d&basemap=local-earth`));
