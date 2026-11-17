import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,readFile,readdir,mkdir} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {connect} from './design-browser.mjs';
import {normalizeUsgsFeature} from '../src/data/providers/usgs.js';
const now=Date.parse('2026-11-16T12:00:00Z'),origin='http://127.0.0.1:18817';
const dir=await mkdtemp(path.join(os.tmpdir(),'usgs-flow-')),out=path.resolve('artifacts/usgs-flow-20261116');await mkdir(out,{recursive:true});
const event=normalizeUsgsFeature({id:'flow-fixture',geometry:{type:'Point',coordinates:[-127,40,10]},properties:{mag:2.8,place:'SYNTHETIC browser test',time:now-3600000,updated:now-300000,status:'reviewed',url:'https://earthquake.usgs.gov/earthquakes/eventpage/flow-fixture'}},new Date(now)).event;
event.title='SYNTHETIC USGS browser fixture';event.metadata={...event.metadata,synthetic:true,retrievedAt:now,qualityLimitations:['Synthetic offline browser fixture; not a live observation.']};
const cache=path.join(dir,'cache.json');await writeFile(cache,JSON.stringify({kind:'synthetic-offline-browser-fixture',productionActivated:false,sources:{usgs:{providerId:'usgs',sourceUrl:'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',retrievedAt:now,events:[event]}}}));
const server=spawn(process.execPath,['scripts/preview-usgs-milestone.mjs','18817',cache,'--now=2026-11-16T12:00:00Z'],{stdio:'ignore',windowsHide:true});
let b;const checks=[];const check=async(name,expr)=>{const v=await b.evaluate(expr);assert.equal(v,true,`${name}: ${JSON.stringify(v)}`);checks.push(name);};
async function enter(selector){await b.evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await b.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await b.pause(500);}
try{
 b=await connect({port:9477,profileName:'usgs-flow-'+Date.now()});await b.send('Network.setBlockedURLs',{urls:['https://*']});
 await b.send('Page.addScriptToEvaluateOnNewDocument',{source:`{const NativeDate=Date;window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[${now}]))}static now(){return ${now}}};}`});
 await b.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:dir,eventsEnabled:true});
 await b.size(1440,900);await b.go(origin+'/?view=feed&hours=168&mapMode=2d&basemap=dark-offline');
 await b.pause(1500);await check('offline fixture visible',"document.querySelector('#eventList').textContent.includes('SYNTHETIC USGS browser fixture')");
 await enter('[data-event-detail]');await check('keyboard selection focuses Back',"document.activeElement.classList.contains('inspector-back')");
 await check('shared evidence identity',"document.querySelector('[data-event-evidence]').dataset.eventEvidence==='usgs:flow-fixture'");
 await b.click('.detail-extra:last-of-type>summary');await enter('[data-v2-artifact-action=download-json]');await b.pause(700);
 const json=(await readdir(dir)).find(n=>n.endsWith('.json')&&n!=='cache.json');assert.ok(json,'JSON downloaded');const artifact=JSON.parse(await readFile(path.join(dir,json),'utf8'));assert.equal(artifact.evidenceRecord.id,'usgs:flow-fixture');checks.push('actual JSON download preserves evidence');
 await enter('[data-v2-artifact-action=download-md]');await b.pause(700);const md=(await readdir(dir)).find(n=>n.endsWith('.md'));assert.ok(md);assert.match(await readFile(path.join(dir,md),'utf8'),/Retrieved/);checks.push('actual Markdown download');
 await b.click('.inspector-back');await check('Back restores source button focus',"document.activeElement.dataset.eventDetail==='usgs:flow-fixture'");
 await b.click('#toolsMenu>summary');await b.click('#advancedMode');await b.click('#toolsMenu>summary');await b.click('#layersDrawerToggle');await enter('[data-v2-timeline-event]');await check('timeline selects same record',"new URLSearchParams(location.search).get('event')==='usgs:flow-fixture'");await b.click('.inspector-back');
 await b.click('#timeBrowser>summary');await b.evaluate("document.querySelector('#asOfInput').value='2026-11-16T10:00'");await enter('#applyTime');await check('earlier replay excludes later occurrence',"!document.querySelector('[data-event-detail]')");
 await b.click('#timeBrowser>summary');await enter('#availableTime');await check('latest restores fixture',"!!document.querySelector('[data-event-detail]')");
 await b.size(390,844);await b.go(origin+'/?view=feed&hours=168&mapMode=2d&basemap=dark-offline');await b.pause(1000);await check('mobile no overflow',"document.documentElement.scrollWidth<=innerWidth");await enter('[data-event-detail]');await check('mobile Back visible and focused',"(()=>{const e=document.activeElement,r=e.getBoundingClientRect();return e.classList.contains('inspector-back')&&r.top>=0&&r.bottom<=innerHeight})()");
 await b.click('.detail-extra:last-of-type>summary');await enter('[data-v2-artifact-action=download-json]');await check('mobile export keeps focused control',"document.activeElement.dataset.v2ArtifactAction==='download-json'");
 await b.size(320,740);await check('narrow screen no horizontal overflow',"document.documentElement.scrollWidth<=innerWidth");
 await b.evaluate("document.querySelector('.inspector-back').focus()");
 for(let i=0;i<8;i++){
  await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await b.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert.equal(await b.evaluate("!document.activeElement.closest('[inert]')&&getComputedStyle(document.activeElement).visibility!=='hidden'"),true);
 }checks.push('native Tab traversal excludes inert/hidden panes');
 await b.size(1440,900);await b.go(origin+'/globe.html?view=feed&hours=168&mapMode=3d&basemap=local-earth');
 for(let i=0;i<200;i++){if(await b.evaluate("document.body.dataset.liveMapRenderer==='cesium'"))break;await b.pause(100);}
 await check('globe route uses actual Cesium',"document.body.dataset.liveMapRenderer==='cesium'");
 const viewExpr="(async()=>{const h=(await import('/src/map/globe-controller.js')).getGlobeHandle();return h.currentTarget()})()";
 const before=await b.evaluate(viewExpr);
 await enter('[data-event-detail]');await b.pause(2000);await check('globe selection retains evidence',"document.querySelector('[data-event-evidence]').dataset.eventEvidence==='usgs:flow-fixture'");
 await b.click('.inspector-back');await b.pause(2200);const after=await b.evaluate(viewExpr);

 assert.ok(Math.abs(before.lat-after.lat)<0.00001&&Math.abs(before.lon-after.lon)<0.00001&&Math.abs(before.zoom-after.zoom)<0.00001,'Back restores exact camera');checks.push('globe Back restores camera');
 for(let i=0;i<3;i++){await b.click('#refreshNow');await b.pause(300);}
 const refreshed=await b.evaluate(viewExpr);assert.deepEqual(refreshed,after);checks.push('repeated refresh preserves camera');
 await b.size(390,844);await b.pause(1000);await b.size(1440,900);await b.pause(1000);const resized=await b.evaluate(viewExpr);
 assert.ok(Math.abs(resized.lat-after.lat)<0.00001&&Math.abs(resized.lon-after.lon)<0.00001,'resize preserves target');checks.push('mobile/desktop resize camera target');
 assert.equal((await(await fetch(origin+'/__candidate')).json()).upstreamReads,0);assert.equal(JSON.parse(await readFile(cache,'utf8')).sources.usgs.events[0].metadata.retrievedAt,now);checks.push('zero upstream reads and original retrieval clock');
 assert.equal(b.errors.length,0);checks.push('zero unhandled browser exceptions');
}finally{await writeFile(path.join(out,'browser-results.json'),JSON.stringify({checks,errors:b?.errors},null,2));if(b){await b.send('Browser.close').catch(()=>{});b.close();}server.kill();}
console.log('PASS USGS browser flow: '+checks.length+' checks');
