from pathlib import Path
root=Path(__file__).resolve().parent.parent
def edit(name,old,new):
    p=root/name; s=p.read_text(encoding='utf-8'); assert old in s,(name,old[:100]); p.write_text(s.replace(old,new),encoding='utf-8',newline='\n')
for name in ['vendor/cesium/index.js','vendor/cesium/Cesium.js']:
    p=root/name;s=p.read_text(encoding='utf-8'); import re
    old='(0,eval)('+chr(34)+'this'+chr(34)+')'
    assert s.count(old)==1; p.write_text(s.replace(old,'globalThis'),encoding='utf-8',newline='\n')
edit('scripts/preview-foundation.mjs',"const previewCsp=", "const previewCsp=") if False else None
p=root/'scripts/preview-foundation.mjs';s=p.read_text(encoding='utf-8');s=s.replace("'unsafe-eval' ","");s=s.replace("connect-src 'self';", "connect-src 'self' https://basemap.nationalmap.gov;");s=s.replace("img-src 'self' data: blob:","img-src 'self' data: blob: https://basemap.nationalmap.gov")
s=s.replace("import http from 'node:http';", "import http from 'node:http';\nimport { createEventsResponse } from '../src/api/events-response.js';")
s=s.replace("  if(url.pathname.startsWith('/api/'))", "  if((url.pathname === '/api/events' || url.pathname === '/.netlify/functions/events') && url.searchParams.get('period')==='history') { const reply=await createEventsResponse(new Request(url)); res.writeHead(reply.status,Object.fromEntries(reply.headers));res.end(await reply.text());return; }\n  if(url.pathname.startsWith('/api/'))")
p.write_text(s,encoding='utf-8',newline='\n')
edit('netlify.toml',"img-src 'self' data: blob:","img-src 'self' data: blob: https://basemap.nationalmap.gov")
edit('netlify.toml',"connect-src 'self'", "connect-src 'self' https://basemap.nationalmap.gov")
with (root/'map-workspace.css').open('a') as f:f.write('''\n/* Real historical browsing: dates sit above the geography, outside the map hit area. */
.history-controls{grid-column:1 / -1;display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 16px;background:#e6edf4;color:#20384e;border-bottom:1px solid #b8c8d6;font-size:12px}
.history-controls[hidden]{display:none}.history-controls strong{margin-right:auto}.history-controls label{display:flex;align-items:center;gap:5px}.history-controls input{font:inherit;color:#20384e;background:#fff;border:1px solid #b8c8d6;border-radius:4px;padding:5px}.history-controls button{font:inherit;border:1px solid #a6bacb;background:white;color:#20384e;padding:5px 8px;border-radius:4px}.history-controls span{color:#526b80}.history-controls button:disabled{opacity:.4}
.imagery-status{position:absolute;left:12px;bottom:30px;max-width:360px;background:rgba(12,27,42,.88);color:#e5edf4;font-size:11px;line-height:1.4;padding:7px 10px;border-radius:5px;pointer-events:none;z-index:6}
.event-marker{width:18px!important;height:18px!important;border:2px solid white!important;box-shadow:0 0 0 2px #142b40!important}.event-marker-selected{width:22px!important;height:22px!important;border:3px solid #54d8ee!important}
@media(max-width:760px){.history-controls{padding:7px 10px;gap:5px}.history-controls strong{flex-basis:100%}.history-controls span{display:none}.imagery-status{bottom:48px;max-width:240px;font-size:10px}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
''')


