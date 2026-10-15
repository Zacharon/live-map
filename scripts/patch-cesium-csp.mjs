// Cesium 1.145 bundles Knockout's global-object lookup. It needs no eval.
// Optional widgets requiring expression compilation remain disabled.
import { readFile, writeFile, rename } from 'node:fs/promises';
const original='(0,eval)("this")';
for(const name of ['index.js','Cesium.js']) {
  const file=new URL(`../vendor/cesium/${name}`,import.meta.url);
  const bytes=await readFile(file,'utf8');
  const count=bytes.split(original).length-1;
  if(count===0 && bytes.includes('globalThis')) {console.log(`${name}: already patched; verify after any vendor upgrade.`);continue;}
  if(count!==1) throw new Error(`Unexpected ${name} global lookup count: ${count}. Review the vendor update.`);
  const temp=new URL(file.href+'.csp.tmp');
  await writeFile(temp,bytes.replace(original,'globalThis'));
  await rename(temp,file);
  console.log(`${name}: replaced the global lookup; CSP remains strict.`);
}
