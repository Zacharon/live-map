import {connect,preview} from './design-browser.mjs';
const b=await connect();
try {await b.size(1440,900);await b.go(`${preview}/?demo=foundation`);console.log(await b.shot('candidate-global'));console.log(JSON.stringify(await b.evaluate('({...document.body.dataset})')));await b.click('[data-event-detail]');console.log(await b.shot('candidate-selected'));await b.size(390,844);console.log(await b.shot('candidate-mobile-detail'));console.log(JSON.stringify(b.errors));}finally{b.close();}
