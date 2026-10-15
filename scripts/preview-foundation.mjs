import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.wasm':'application/wasm','.txt':'text/plain; charset=utf-8','.xml':'application/xml','.ico':'image/x-icon','.webp':'image/webp'};
const aliases={'/':'/index.html','/sources':'/source-explorer.html','/countries':'/countries.html','/diagnostics':'/diagnostics.html'};
const denied=/^\/(?:\.env|\.git|artifacts|qa-artifacts|secrets|\.wrangler)(?:\/|$)/i;
const allowed=/^\/(?:(?:index|404|source-explorer|countries|diagnostics|about)\.html|[a-z0-9-]+\.(?:css|js|txt|xml|svg|ico|png|webp)|(?:src|vendor|data)\/[a-z0-9_./-]+)$/i;
const port=Number(process.env.LIVE_MAP_PREVIEW_PORT || process.argv[2] || 8766);
// Cesium 1.145 bundles Knockout 3.5.1, which calls eval("this") while the
// module evaluates and new Function when widget bindings parse. wasm-unsafe-eval
// does not cover that. This local preview allows it so the globe can start.
// netlify.toml stays without unsafe-eval; production CSP is unchanged.
const previewCsp="default-src 'self'; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://server.arcgisonline.com https://services.arcgisonline.com https://*.basemaps.cartocdn.com; script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self'; worker-src 'self' blob:; child-src 'self' blob:; object-src 'none'";
http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', previewCsp);
  if(url.pathname.startsWith('/api/')) {res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'offline-preview',message:'Use ?demo=foundation for synthetic preview; no provider APIs run here.'}));return;}
  if(denied.test(url.pathname) || url.pathname.includes('..')) {res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');return;}
  const requested=aliases[url.pathname] || url.pathname;
  if(!allowed.test(requested)) {res.writeHead(404,{'Content-Type':requested.startsWith('/api/')?'application/json':'text/html'});res.end(requested.startsWith('/api/')?JSON.stringify({error:'not-found'}):await readFile(path.join(root,'404.html')).catch(()=>Buffer.from('<!doctype html><title>Not found</title><h1>Not found</h1>')));return;}
  try {const file=path.resolve(root,'.'+requested);if(!file.startsWith(root+path.sep))throw new Error('invalid path');const body=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)] || 'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Local synthetic preview: http://127.0.0.1:${port}/?demo=foundation&view=chokepoints&chokepoint=strait-of-hormuz`));
