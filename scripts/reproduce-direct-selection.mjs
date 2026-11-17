import {connect} from './design-browser.mjs';
import {writeFileSync,mkdirSync} from 'node:fs';
const b=await connect({port:9364,profileName:'maritime-isolated-user'});
mkdirSync('evidence/selection-browser',{recursive:true});
try{
 await b.send('Network.setBlockedURLs',{urls:['https://*']});
 await b.size(1440,900);await b.go('http://127.0.0.1:8778/?demo=foundation&mapMode=3d');
 const before=await b.evaluate(`({ready:document.body.dataset.liveMapReady,renderer:document.body.dataset.liveMapRenderer,investigateNav:!!document.querySelector('[data-investigate-nav]'),eventButtons:document.querySelectorAll('[data-event-detail]').length,selected:new URLSearchParams(location.search).get('event')})`);
 await b.click('[data-event-detail]');
 const selected=await b.evaluate(`({event:new URLSearchParams(location.search).get('event'),title:document.querySelector('.v2-detail-title')?.textContent,renderer:document.body.dataset.liveMapRenderer})`);
 await b.go('http://127.0.0.1:8778/?demo=foundation&mapMode=3d&view=chokepoints&chokepoint=strait-of-hormuz');
 await b.click('[data-investigate-open="strait-of-hormuz"]');
 const ledger=await b.evaluate(`({rows:document.querySelectorAll('.evidence-id-list li').length,buttons:document.querySelectorAll('.evidence-id-list button').length,workbench:document.body.dataset.liveMapWorkbench})`);
 writeFileSync('evidence/selection-browser/canonical-reproduction.json',JSON.stringify({at:new Date().toISOString(),origin:'canonical read-only preview 8778',before,selected,ledger,exceptions:b.errors,externalRequestsBlocked:true},null,2));
 console.log(JSON.stringify({before,selected,ledger,exceptions:b.errors.length}));
}finally{b.close();}
