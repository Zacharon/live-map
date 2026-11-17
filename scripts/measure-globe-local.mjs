// Synthetic, loopback-only headless measurement. No desktop session is used.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { connect } from './design-browser.mjs';
const label=process.argv[2] || 'baseline';
const out='artifacts/globe-performance'; mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['scripts/preview-foundation.mjs','8797'],{windowsHide:true,stdio:'ignore'});
let b;
try {
 for(let i=0;i<50;i++){try{if((await fetch('http://127.0.0.1:8797/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 b=await connect({port:9397,profileName:`perf-${label}`});
 await b.send('Network.setBlockedURLs',{urls:['https://*','http://localhost/*']});
 await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__probes=[]; const get=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(type,...args){const t=performance.now();const result=get.call(this,type,...args);if(type==='webgl2'||type==='webgl')window.__probes.push({ms:performance.now()-t,at:t});return result;};window.__firstGlobe=null;const timer=setInterval(()=>{if(document.body?.dataset.liveMapRenderer==='cesium'){window.__firstGlobe=performance.now();clearInterval(timer)}},10);`});
 const runs=[];
 for(let run=0;run<2;run++){
  if(!run)await b.send('Network.clearBrowserCache');
  await b.send('Page.navigate',{url:'http://127.0.0.1:8797/?demo=foundation&mapMode=3d&basemap=local-earth'});
  let ready=false;
  for(let i=0;i<200;i++){try{ready=await b.evaluate("document.body?.dataset.liveMapRenderer==='cesium' && window.__firstGlobe!==null");}catch{}if(ready)break;await b.pause(100);}
  assert.ok(ready,'Cesium ready');
  const start=await b.evaluate(`({ready:window.__firstGlobe,probes:window.__probes,resources:performance.getEntriesByType('resource').map(e=>({name:new URL(e.name).pathname,duration:e.duration,size:e.transferSize}))})`);
  const repeat=await b.evaluate(`(async()=>{const m=await import('/src/map/globe-controller.js');const h=m.getGlobeHandle(),v=h.viewer;const before=v.camera.position.clone();v.camera.rotateRight(0.1);v.scene.requestRender();const rotated=!Cesium.Cartesian3.equals(before,v.camera.position);const n=window.__probes.length,t=performance.now();for(let i=0;i<20;i++){const e=document.querySelector('#chokepointsToggle');e.checked=!e.checked;e.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,0));}return {ms:performance.now()-t,probes:window.__probes.slice(n),sameViewer:m.getGlobeHandle()?.viewer===v,rotated,creates:m.globeCreateCount(),renderer:document.body.dataset.liveMapRenderer};})()`);
  assert.ok(repeat.sameViewer && repeat.rotated && repeat.renderer==='cesium');
  runs.push({condition:run?'warm-process reload (server no-store)':'cold browser cache',...start,repeat});
 }
 const regressions=await b.evaluate(`(async()=>{const m=await import('/src/map/globe-controller.js');history.replaceState(null,'','?demo=foundation&mapMode=3d&failWebgl=1');const failed=await m.setGlobeMode('3d',[],{zoom:2});const forcedFallback=failed.renderer==='leaflet-fallback';history.replaceState(null,'','?demo=foundation&mapMode=3d');const n=window.__probes.length;const restored=await m.setGlobeMode('3d',[],{zoom:2});const recreated=restored.renderer==='cesium'&&window.__probes.length>n;await m.setGlobeMode('2d',[],{zoom:2});const n2=window.__probes.length;const returned=await m.setGlobeMode('3d',[],{zoom:2});return {forcedFallback,recreated,reprobedAfter2d:returned.renderer==='cesium'&&window.__probes.length>n2};})()`);
 assert.ok(Object.values(regressions).every(Boolean));
 writeFileSync(`${out}/${label}.json`,JSON.stringify({label,runs,regressions,exceptions:b.errors,scope:'Local headless Edge; synthetic foundation; HTTPS blocked; no-store server; readiness sampled every 10 ms, rotation checked separately'},null,2));
 console.log(JSON.stringify(runs.map(r=>({condition:r.condition,ready:r.ready,repeat:r.repeat})),null,2));
 assert.equal(b.errors.length,0);
} finally {if(b){await b.send('Browser.close').catch(()=>{});b.close();}server.kill();}
