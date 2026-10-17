import assert from 'node:assert/strict';import {mkdirSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';import path from 'node:path';
import {connect,preview,out} from './design-browser.mjs';
const b=await connect();const checks=[];const exportsPath=path.join(out,'exports',String(Date.now()));mkdirSync(exportsPath,{recursive:true});
const check=async(name,exp)=>{assert.ok(await b.evaluate(`(async()=>(${exp}))()`),name);checks.push(name);};
const change=async(selector,value)=>{await b.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await b.pause(500);};
try{
await b.size(1440,900);await b.go(`${preview}/?demo=foundation&mapMode=3d`);await b.click('#resetWorkspace');
await b.click('#timeBrowser>summary');await change('#asOfInput','2025-01-15T12:00');await b.click('#applyTime');
await b.click('.feed-options>summary');await b.evaluate("window.originalPrompt=window.prompt;window.prompt=()=> 'Design QA historical globe'");await b.click('#saveView');await b.evaluate('window.prompt=window.originalPrompt');
await b.click('#timeBrowser>summary');await b.click('#availableTime');await change('#mapMode','2d');
await change('#savedViews','Design QA historical globe');
await check('Saved view restores actual renderer and historical end',"(await import('/src/state.js')).state.mapMode==='3d' && (await import('/src/state.js')).state.mapView.asOf==='2025-01-15T12:00:00.000Z'");
const savedUrl=await b.evaluate('location.href');await b.go(savedUrl);
await check('Reload retains serialized time and mode',"document.body.dataset.liveMapMode==='3d' && document.body.dataset.liveMapAsOf==='2025-01-15T12:00:00.000Z'");
await b.evaluate("(async()=>{const g=(await import('/src/map/globe-controller.js')).getGlobeHandle();g.applyView({lat:0,lon:-80,zoom:5});})()");await b.pause(500);
await b.click('.feed-options>summary');await change('#savedViews','Design QA historical globe');await b.pause(500);
await check('Saved view moves an existing3D camera',"(()=>{const c=document.querySelector('#globeStage').dataset;return Number(c.globeCameraHeight)>10000000})()");
await b.click('#resetWorkspace');await b.click('[data-event-detail]');await b.pause(800);
await b.evaluate("document.querySelector('.detail-source-evidence').scrollIntoView({block:'center'})");await b.shot('after-source-evidence-visible');
await check('Original source link has safe URL and isolated target',"(()=>{const a=document.querySelector('.detail-source-evidence a');return /^https?:/.test(a.href)&&a.target==='_blank'&&a.rel.includes('noopener')&&a.rel.includes('noreferrer')})()");
const beforeTargets=await (await fetch('http://127.0.0.1:9355/json/list')).json();
await b.click('.detail-source-evidence a');await b.pause(800);const afterTargets=await (await fetch('http://127.0.0.1:9355/json/list')).json();const opened=afterTargets.find(t=>t.type==='page'&&!beforeTargets.some(p=>p.id===t.id));assert.ok(opened,'Source opens new browser tab');checks.push('Source action opens new browser tab');await b.send('Target.closeTarget',{targetId:opened.id});
const expectedRevision=await b.evaluate("(async()=>{const s=(await import('/src/state.js')).state;return [...s.intelligenceEvents,...s.events].find(e=>e.id===s.selectedEventId).updatedAt})()");
await b.click('.detail-extra:last-child>summary');await b.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:exportsPath});const oldFiles=new Set(readdirSync(exportsPath));await b.click('[data-v2-artifact-action="download-json"]');
let file;for(let i=0;i<30;i++){file=readdirSync(exportsPath).find(f=>f.endsWith('.json')&&!oldFiles.has(f));if(file)break;await b.pause(100);}assert.ok(file,'JSON downloaded');const artifact=JSON.parse(readFileSync(path.join(exportsPath,file),'utf8'));assert.ok(JSON.stringify(artifact).includes('[DEMO] Earthquake sequence'));assert.equal(artifact.updatedAt,expectedRevision);checks.push('Export JSON bytes preserve selected report and actual revision');
await b.click('[data-v2-close-detail]');
for(const [name,apiStatus,apiFailure,sourceStatus,expected]of[
['loading','loading',null,{},'loading'],['unavailable','ready',{kind:'timeout'},{},'unavailable'],['stale','ready',null,{test:{ok:true,stale:true,status:'stale'}},'partial'],['historical-without-diagnostics','ready',null,{},'historical']]){
await b.evaluate(`(async()=>{const s=(await import('/src/state.js')).state;Object.assign(s,{demo:false,dataMode:'public',apiStatus:${JSON.stringify(apiStatus)},apiFailure:${JSON.stringify(apiFailure)},sourceStatus:${JSON.stringify(sourceStatus)}});document.body.dataset.qaFixture='provider-state';document.getElementById('workspaceMessage').textContent='QA state fixture — reports remain synthetic';window.dispatchEvent(new Event('live-map-render-request'));})()`);await b.pause(250);await check('Provider '+name+' state is explicit',`document.querySelector('[data-coverage]').dataset.coverage===${JSON.stringify(expected)}`);await b.shot('after-provider-'+name+'-fixture');}
await b.go(`${preview}/?demo=foundation&mapMode=3d&failWebgl=1`);await check('Forced WebGL failure preserves usable Leaflet fallback',"document.body.dataset.liveMapRenderer==='leaflet-fallback' && document.getElementById('globeStage').textContent.includes('3D globe unavailable') && !!document.querySelector('[data-event-detail]')");await b.shot('after-webgl-unavailable');
assert.equal(b.errors.length,0);console.log(JSON.stringify({checks:checks.length,errors:b.errors.length}));
}finally{writeFileSync(path.join(out,'extra-browser-results.json'),JSON.stringify({checks,errors:b.errors,networkFailures:b.network,providerStateEvidence:'Injected UI fixtures; no provider calls or actual health claim',sourceLinkEvidence:'Synthetic source URL navigation only; content authenticity is not claimed'},null,2));b.close();}
