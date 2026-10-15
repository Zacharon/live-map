import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {connect} from './design-browser.mjs';
const b=await connect({port:9364,profileName:'maritime-isolated-user'});
const base='http://127.0.0.1:8779';
const out='evidence/selection-browser';mkdirSync(out,{recursive:true});
const checks=[];
async function check(name,expression){assert.ok(await b.evaluate(expression),name);checks.push({name,passed:true});}
async function go(query){await b.go(base+'/?'+query);for(let i=0;i<150;i++){if(await b.evaluate("document.body.dataset.liveMapReady==='1'&&document.body.dataset.liveMapRenderer==='cesium'"))break;await b.pause(150);}await b.pause(200);}
async function shot(name){const r=await b.send('Page.captureScreenshot',{format:'png'});writeFileSync(out+'/'+name+'.png',Buffer.from(r.data,'base64'));}
async function enter(selector){await b.evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await b.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await b.pause(200);}
try{
 await b.send('Network.setBlockedURLs',{urls:['https://*']});await b.size(1440,900);
 await go('demo=foundation&mapMode=3d&view=explore');
 await check('Cesium starts before any map selection',"document.body.dataset.liveMapRenderer==='cesium'&&!new URLSearchParams(location.search).has('event')");
 await enter('[data-event-detail]');
 await check('Native keyboard list selection opens shared event inspector and URL',"new URLSearchParams(location.search).get('event')==='demo-0'&&document.querySelector('.v2-detail-title').textContent.includes('Earthquake')&&document.activeElement.classList.contains('inspector-back')");
 const selectedUrl=await b.evaluate('location.href');await b.go(selectedUrl);await b.pause(1200);
 await check('Selected event survives reload without globe input',"new URLSearchParams(location.search).get('event')==='demo-0'&&document.querySelector('.v2-detail-title').textContent.includes('Earthquake')");
 await b.click('[data-v2-clear-selection]');
 await check('Back clears selected event',"!new URLSearchParams(location.search).has('event')");
 await b.click('[data-event-detail]');
 await b.evaluate("const s=document.querySelector('#search');s.value='zz-no-record-matches';s.dispatchEvent(new Event('input',{bubbles:true}))");await b.pause(250);
 await check('Filter removes excluded selection and shows empty list',"!new URLSearchParams(location.search).has('event')&&document.querySelector('#eventList .empty')?.textContent.includes('No events')");
 await go('demo=foundation&mapMode=3d&view=explore');
 await enter('[data-investigate-nav]');
 for(let i=0;i<50;i++){if(await b.evaluate("!!document.querySelector('[data-evidence-select]')"))break;await b.pause(100);}
 await check('Ledger entry selects passage and opens evidence outside globe',"document.querySelector('[data-workbench-tab=evidence]')&&document.querySelector('[data-evidence-select]')&&new URLSearchParams(location.search).get('chokepoint')==='strait-of-hormuz'&&new URLSearchParams(location.search).get('workbench')==='1'");
 await enter('[data-evidence-select]');
 const evidenceId=await b.evaluate("document.querySelector('[data-evidence-detail]').dataset.evidenceDetail");
 await check('Evidence selection exposes actual historical coverage and clocks',"(()=>{const t=document.querySelector('[data-evidence-detail]').textContent;return t.includes('class-specific counts and capacity fields were not requested')&&t.includes('historical')&&t.includes('AIS visibility proxy')&&document.activeElement.hasAttribute('data-evidence-back')&&new URLSearchParams(location.search).has('evidence')})()");
 await shot('desktop-selected-ledger');
 await b.go(await b.evaluate('location.href'));await b.pause(1500);
 await check('Ledger selection survives direct reload',`document.querySelector('[data-evidence-detail]')?.dataset.evidenceDetail===${JSON.stringify(evidenceId)}`);
 await b.click('[data-evidence-back]');
 await check('Evidence Back restores native ledger focus and empty inspector',"document.activeElement.hasAttribute('data-evidence-select')&&document.querySelector('[data-evidence-empty]')&&!new URLSearchParams(location.search).has('evidence')");
 await enter('.evidence-id-list li:last-child [data-evidence-select]');
 await check('Last ledger record brings detail into the visible drawer',"(()=>{const e=document.querySelector('[data-evidence-back]'),r=e.getBoundingClientRect(),d=document.querySelector('#chokepointDetailDrawer').getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return document.activeElement===e&&r.top>=d.top&&r.bottom<=Math.min(d.bottom,innerHeight)&&(hit===e||e.contains(hit))})()");
 const lastId=await b.evaluate("document.querySelector('[data-evidence-detail]').dataset.evidenceDetail");
 await b.go(await b.evaluate('location.href'));await b.pause(1500);
 await check('Historical last-row direct reload reveals the selected detail',`(()=>{const e=document.querySelector('[data-evidence-back]'),r=e?.getBoundingClientRect(),d=document.querySelector('#chokepointDetailDrawer').getBoundingClientRect(),hit=r&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return document.querySelector('[data-evidence-detail]')?.dataset.evidenceDetail===${JSON.stringify(lastId)}&&document.activeElement===e&&r.top>=d.top&&r.bottom<=Math.min(d.bottom,innerHeight)&&(hit===e||e.contains(hit))})()`);
 await b.click('[data-evidence-back]');
 await b.evaluate("const s=document.querySelector('[data-investigate-case]');s.value='synthetic-hormuz-2026-06';s.dispatchEvent(new Event('change',{bubbles:true}))");await b.pause(300);
 await enter('[data-evidence-select]');const syntheticId=await b.evaluate("document.querySelector('[data-evidence-detail]').dataset.evidenceDetail");
 await b.go(await b.evaluate('location.href'));await b.pause(1000);
 await check('Synthetic case and selected record survive reload',`new URLSearchParams(location.search).get('case')==='synthetic-hormuz-2026-06'&&document.querySelector('[data-evidence-detail]')?.dataset.evidenceDetail===${JSON.stringify(syntheticId)}&&document.activeElement.hasAttribute('data-evidence-back')`);
 await b.click('[data-area=explore]');
 await check('Leaving ledger removes case/evidence/workbench URL context',"!['workbench','evidence','case'].some(k=>new URLSearchParams(location.search).has(k))");
 await go('demo=foundation&mapMode=3d&workbench=1&evidence=missing-record');
 await check('Unavailable direct evidence shows an explicit notice and clear state',"document.querySelector('[data-evidence-notice]').textContent.includes('unavailable')&&document.querySelector('[data-evidence-empty]')&&!new URLSearchParams(location.search).has('evidence')");
 await b.click('[data-investigate-tab=assessment]');
 await check('Four maritime signals remain separate',"document.querySelectorAll('[data-maritime-signal]').length===4&&document.querySelector('[data-maritime-signal=cargoThroughput]').dataset.state==='unknown'");
 await b.size(390,844);
 await go('demo=foundation&mapMode=3d&workbench=1');
 await check('Mobile direct ledger entry has no map prerequisite',"document.body.dataset.mobileView==='feed'&&!document.getElementById('eventDrawer').inert&&document.querySelector('[data-evidence-select]')&&document.documentElement.scrollWidth<=innerWidth");
 await enter('[data-evidence-select]');
 await check('Mobile evidence detail is visible and keyboard accessible',"(()=>{const e=document.querySelector('[data-evidence-back]');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !e.closest('[inert]')&&r.top>=0&&r.bottom<=innerHeight&&(h===e||e.contains(h))})()");
 await shot('mobile-selected-ledger');
 await b.click('[data-evidence-back]');await b.click('[data-investigate-close]');await b.click('[data-area=explore]');await b.click('[data-mobile-pane=feed]');
 await enter('[data-event-detail]');
 await check('Mobile event list opens inspector independently',"document.body.dataset.mobileView==='detail'&&document.querySelector('.v2-detail-title')&&new URLSearchParams(location.search).has('event')");
 await shot('mobile-selected-event');
 await check('Cesium survives independent inspector paths',"document.body.dataset.liveMapRenderer==='cesium'&&document.querySelector('#globeStage canvas').width>0");
 assert.equal(b.errors.length,0);checks.push({name:'No unhandled browser exceptions',passed:true});
}finally{writeFileSync(out+'/results.json',JSON.stringify({at:new Date().toISOString(),checks,exceptions:b.errors,networkFailures:b.network.length,externalRequestsBlocked:true,scope:'Isolated local candidate; explicitly synthetic demo and historical extract; no live activation.'},null,2));b.close();}
console.log('runtime-direct-selection: '+checks.length+' checks passed');
