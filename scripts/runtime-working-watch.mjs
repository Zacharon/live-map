import assert from 'node:assert/strict';
import fs from 'node:fs';
import {connect} from './design-browser.mjs';
const b=await connect({port:9366,profileName:'working-watch-audit'}),out='evidence/working-watch-browser',checks=[];
fs.mkdirSync(out,{recursive:true});
const url='http://127.0.0.1:8783/?view=feed&hours=24&sort=newest-occurred&mapMode=3d&basemap=local-earth';
async function check(name,expression){assert.equal(await b.evaluate(expression),true,name);checks.push({name,passed:true});}
async function shot(name){const r=await b.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(out+'/'+name+'.png',Buffer.from(r.data,'base64'));}
async function enter(selector){await b.evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await b.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await b.pause(400);}
try{
 await b.send('Network.setBlockedURLs',{urls:['https://*']});await b.size(1440,900);await b.go(url);
 for(let i=0;i<160;i++){if(await b.evaluate("document.querySelector('[data-event-detail]')&&document.body.dataset.liveMapRenderer==='cesium'"))break;await b.pause(100);}
 await b.pause(3000);
 await check('Real saved public reports available without globe interaction',"document.querySelectorAll('[data-event-detail]').length>0&&!new URLSearchParams(location.search).has('demo')");
 await check('Coverage exposes saved/degraded status and fixed public source links',"document.querySelector('#watchOperator').textContent.includes('cached')&&document.querySelector('#watchOperator a[href*=earthquake]')&&document.querySelector('#watchOperator a[href*=nhc]')?true:false");
 await check('Actual Cesium viewer and local earth assets loaded',"(async()=>{const h=(await import('/src/map/globe-controller.js')).getGlobeHandle();return !!h?.viewer?.scene?.globe&&performance.getEntriesByType('resource').some(e=>e.name.includes('NaturalEarthII')&&e.name.endsWith('.jpg'))})()");
 await shot('desktop-current-public-reports');
 const selected=await b.evaluate("document.querySelector('[data-event-detail]').dataset.eventDetail");await enter('[data-event-detail]');
 await check('Native list selection opens focused inspector with shared URL',`new URLSearchParams(location.search).get('event')===${JSON.stringify(selected)}&&document.activeElement.hasAttribute('data-v2-close-detail')`);
 await check('Inspector includes actual measurements, evidence limits and UTC clock',"(()=>{const t=document.querySelector('.v2-event-detail').textContent;return t.includes('Source coverage')&&t.includes('Limits of this evidence')&&t.includes('Retrieved')&&(t.includes('Magnitude')||t.includes('Wind / pressure'))&&t.includes('UTC')})()");
 await check('Selected globe record linked to inspector',`document.querySelector('#globeStage').dataset.globeSelectedEvent===${JSON.stringify(selected)}`);
 await check('Inspector receives drawer space',"getComputedStyle(document.querySelector('#watchOperator')).display==='none'");await shot('desktop-source-inspector');
 await b.click('.inspector-back');await check('Back restores native row focus',`document.activeElement.dataset.eventDetail===${JSON.stringify(selected)}&&!new URLSearchParams(location.search).has('event')`);
 await b.click('[data-watch-source=usgs]');await b.click('[data-v2-mark-seen]');await b.click('[data-watch-source=""]');
 await check('Filtered mark read applies to all loaded reports',"document.querySelector('[data-watch-changes=new]').textContent.trim()==='New 0'&&document.querySelector('[data-watch-changes=updated]').textContent.trim()==='Revised 0'");
 await b.click('[data-watch-changes=new]');await check('No new reports has explicit empty state',"document.querySelector('#eventList').textContent.includes('No events')");await b.click('[data-watch-reset]');
 await b.evaluate("document.querySelector('#globalSearch').focus()");await b.send('Input.insertText',{text:'zzzz-nonexistent-public-record-zzzz'});await check('Global no-result search explains scope and reset',"document.querySelector('#globalSearchResults').textContent.includes('No matches in this view')&&!!document.querySelector('#globalSearchResults [data-watch-reset]')");
 await b.click('#globalSearchResults [data-watch-reset]');await check('Clear filters restores loaded report list',"document.querySelectorAll('[data-event-detail]').length>0&&!new URLSearchParams(location.search).has('source')&&!new URLSearchParams(location.search).has('changes')");
 const title=await b.evaluate("document.querySelector('[data-event-detail]').textContent");await b.evaluate("document.querySelector('#globalSearch').focus()");await b.send('Input.insertText',{text:title});
 await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});await b.send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});
 await check('Search ArrowDown reaches native result button',"document.activeElement.hasAttribute('data-search-result')");await enter('[data-search-result]');await check('Keyboard global search opens same source inspector',`new URLSearchParams(location.search).get('event')===${JSON.stringify(selected)}&&document.activeElement.classList.contains('inspector-back')`);
 await b.go(await b.evaluate('location.href'));await b.pause(1600);await check('Actual report deep link restores inspector on reload',`new URLSearchParams(location.search).get('event')===${JSON.stringify(selected)}&&document.querySelector('.v2-detail-title')?.textContent===${JSON.stringify(title)}`);await b.click('.inspector-back');
 await b.send('Network.setBlockedURLs',{urls:['https://*','*://127.0.0.1:8783/api/events*']});await b.click('#refreshNow');await b.pause(1400);
 await check('Controlled API failure retains actual rows and marks cached coverage',"document.querySelectorAll('[data-event-detail]').length>0&&document.querySelector('[data-coverage]').textContent.includes('Retained records are cached')&&document.querySelector('#watchOperator').textContent.includes('cached or unavailable')");
 await b.send('Network.setBlockedURLs',{urls:['https://*']});await b.click('#refreshNow');await b.pause(1000);
 await b.evaluate(`(()=>{const original=window.fetch.bind(window);let seq=0;window.__watchFetchRestore=()=>{window.fetch=original};window.fetch=async(input,options)=>{if(!String(input).includes('/api/events'))return original(input,options);const n=++seq,response=await original(input,{...options,signal:undefined}),body=await response.json();const title=n===1?'Controlled slow old response':'Controlled newer response';for(const key of ['events','canonicalEvents'])if(body[key]?.[0])body[key][0].title=title;await new Promise(r=>setTimeout(r,n===1?1600:80));return new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json'}})}})()`);
 await b.click('#refreshNow');await b.evaluate("document.querySelector('#timeWindow').focus()");await b.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});await b.send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});await b.pause(1800);
 await check('Controlled late old response cannot overwrite newer request',"document.querySelector('#eventList').textContent.includes('Controlled newer response')&&!document.querySelector('#eventList').textContent.includes('Controlled slow old response')");
 await b.evaluate('window.__watchFetchRestore()');await b.click('#refreshNow');await b.pause(700);
 await b.evaluate(`(()=>{const original=Storage.prototype.getItem;window.__watchStorageRestore=()=>{Storage.prototype.getItem=original};Storage.prototype.getItem=function(key){if(key==='live-map:change-awareness:v1')throw Error('Controlled blocked baseline storage');return original.call(this,key)}})()`);await b.click('[data-watch-source=usgs]');
 await check('Blocked read-baseline storage is visibly explained',"(()=>{const e=document.querySelector('.watch-storage-notice');return !!e&&!e.hidden&&getComputedStyle(e).display!=='none'&&e.textContent.includes('storage is unavailable')})()");
 await b.evaluate('window.__watchStorageRestore()');await b.click('[data-watch-reset]');
 await b.size(390,844);await b.go(url);await b.pause(2500);
 await check('Mobile starts in Reports with visible search and no horizontal overflow',"document.body.dataset.mobileView==='feed'&&document.querySelector('#globalSearch').getBoundingClientRect().height>0&&document.documentElement.scrollWidth<=innerWidth");
 await check('Mobile shows a real report title before scrolling',"(()=>{const e=document.querySelector('[data-event-detail]'),r=e.getBoundingClientRect();return r.top>=0&&r.top<innerHeight})()");
 await shot('mobile-current-public-reports');await enter('[data-event-detail]');
 await check('Mobile selection has visible keyboard Back',"(()=>{const e=document.querySelector('.inspector-back'),r=e.getBoundingClientRect();return document.body.dataset.mobileView==='detail'&&document.activeElement===e&&r.top>=0&&r.bottom<=innerHeight})()");await shot('mobile-source-inspector');await b.click('.inspector-back');
 await b.click('[data-investigate-nav]');await b.pause(700);await b.click('[data-investigate-tab=assessment]');
 await check('Evidence workbench preserves four independent maritime signals',"document.querySelectorAll('[data-maritime-signal]').length===4");
 assert.equal(b.errors.length,0);checks.push({name:'No unhandled browser exceptions',passed:true});
}finally{fs.writeFileSync(out+'/working-watch-results.json',JSON.stringify({at:new Date().toISOString(),checks,exceptions:b.errors,externalRequestsBlocked:true,scope:'Replay of genuine public reads; no upstream requests or hosted activation'},null,2));b.close();}
console.log('runtime-working-watch: '+checks.length+' native checks passed');
