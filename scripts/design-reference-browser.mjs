import { connect, out } from './design-browser.mjs';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
const b = await connect();
const observations = [];
try {
  await b.size(1440, 900);
  for (const [name,url] of [
    ['liveuamap','https://liveuamap.com/'],
    ['cfr','https://www.cfr.org/global-conflict-tracker'],
    ['vesselfinder','https://www.vesselfinder.com/'],
    ['earth-wind','https://earth.nullschool.net/'],
    ['fincept','https://fincept.in/'],
    ['satellitemap','https://satellitemap.space/'],
  ]) {
    await b.go(url); await b.pause(2500);
    observations.push({url,screenshot:await b.shot(`reference-${name}`),title:await b.evaluate('document.title'),text:(await b.evaluate('document.body.innerText')).slice(0,1100)});
    console.log(name);
  }
  writeFileSync(path.join(out,'reference-browser.json'),JSON.stringify(observations,null,2));
} finally {b.close();}
