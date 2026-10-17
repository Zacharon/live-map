import {connect,preview,out} from './design-browser.mjs';
import {writeFileSync} from 'node:fs';
import path from 'node:path';
const b=await connect();try {await b.size(1440,900);await b.go(`${preview}/?demo=foundation&mapMode=3d`);await b.evaluate("document.querySelector('.map-context').style.visibility='hidden'");const r=await b.send('Page.captureScreenshot',{format:'png',clip:{x:200,y:210,width:656,height:636,scale:1}});writeFileSync(path.join(out,'map-reference.png'),Buffer.from(r.data,'base64'));await b.evaluate("document.querySelector('.map-context').style.visibility=''");console.log('Saved cropped WebGL geography reference with UI heading temporarily hidden.');}finally{b.close();}
