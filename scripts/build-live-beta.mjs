import { readFile, writeFile, mkdir, cp, readdir, lstat, rm } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root=process.cwd(),energyPreview=process.argv.includes('--preview-energy');
const outputRelative=energyPreview?'artifacts/energy-state-2026-10-04/public':'hosting/beta/dist';
const manifestRelative=energyPreview?'artifacts/energy-state-2026-10-04':'artifacts/live-beta-2026-10-01';
const out=path.join(root,outputRelative);
if(!out.startsWith(root+path.sep)||path.relative(root,out)!==path.normalize(outputRelative))throw new Error('Invalid build target');
const old=await lstat(out).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});if(old?.isSymbolicLink())throw new Error('Build target must not be a link');
if(old)await rm(out,{recursive:true}); // Only this declared, regenerable public build directory.
const included=new Set();
async function copySource(relative){
  relative=relative.replaceAll('\\','/');if(included.has(relative))return;
  if(!/^src\/[a-z0-9_./-]+\.(js|css)$/.test(relative)||relative.includes('..'))throw new Error(`Outside public module allowlist: ${relative}`);
  included.add(relative);const source=await readFile(path.join(root,relative),'utf8');
  if(relative.endsWith('.js'))for(const match of source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g))await copySource(path.posix.normalize(path.posix.join(path.posix.dirname(relative),match[1])));
  const target=path.join(out,relative);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,source);
}
await mkdir(out,{recursive:true});
await copySource('src/candidates/intelligence-workbench/presentation/workbench.js');
await copySource('src/candidates/intelligence-workbench/presentation/workbench.css');
const html=await readFile(path.join(root,'src/candidates/intelligence-workbench/index.html'),'utf8');
for(const relative of ['index.html','src/candidates/intelligence-workbench/index.html']){const target=path.join(out,relative);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,html);}
for(const relative of ['vendor/leaflet/leaflet.js','vendor/leaflet/leaflet.css','vendor/leaflet/LICENSE','vendor/cesium/Assets','vendor/cesium/Workers','vendor/cesium/ThirdParty','vendor/cesium/Widgets','vendor/cesium/index.js','vendor/cesium/Cesium.js','vendor/cesium/LICENSE.md']){
  await mkdir(path.dirname(path.join(out,relative)),{recursive:true});await cp(path.join(root,relative),path.join(out,relative),{recursive:true});
}
await writeFile(path.join(out,'404.html'),'<!doctype html><html lang="en"><meta charset="utf-8"><title>Unavailable</title><body style="background:#10232d;color:#dce9e9;font-family:system-ui"><h1>Unavailable in this beta</h1><a href="/" style="color:#8ed6c6">Return to Systems Desk</a></body></html>');
const files=[];
async function inspect(folder){for(const entry of await readdir(folder,{withFileTypes:true})){const filename=path.join(folder,entry.name);if(entry.isDirectory()){await inspect(filename);continue;}const relative=path.relative(out,filename).replaceAll('\\','/');
  if(!/^(index\.html|404\.html|src\/[a-z0-9_./-]+\.(js|css|html)|vendor\/(leaflet|cesium)\/[a-z0-9_./@-]+)$/i.test(relative)||/(^|\/)(?:\.env|artifacts|docs|tests|reports|secrets|node_modules)(\/|$)/i.test(relative)||/\.(map|md)$/i.test(relative)&&!/^vendor\/.+\/LICENSE\.md$/.test(relative))throw new Error(`Forbidden public asset: ${relative}`);
  const bytes=await readFile(filename);files.push({path:relative,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}}
await inspect(out);
await mkdir(path.join(root,manifestRelative),{recursive:true});
await writeFile(path.join(root,manifestRelative,'public-manifest.json'),JSON.stringify({files,totalBytes:files.reduce((n,f)=>n+f.bytes,0)},null,2));
console.log(`Allowlisted beta: ${files.length} files; ${Math.round(files.reduce((n,f)=>n+f.bytes,0)/1024/1024)} MiB. Reports, tests, private files and dependency folders excluded.`);
