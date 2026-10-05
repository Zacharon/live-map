import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
// Loopback verification adapter only. Hosted runtime uses conditional Netlify
// Blobs writes; these files are outside the public deployment allowlist.
export function fileStorage(folder){
  const versions=new Map();
  const digest=data=>createHash('sha256').update(data).digest('hex');
  async function bytes(id){try{return await readFile(path.join(folder,`${id}.json`),'utf8');}catch(e){if(e.code==='ENOENT')return null;throw e;}}
  return {async get(id){const data=await bytes(id);versions.set(id,data==null?null:digest(data));return data==null?null:JSON.parse(data);},async set(id,value){
    const data=await bytes(id);if((data==null?null:digest(data))!==versions.get(id))return false;
    await mkdir(folder,{recursive:true});const temporary=path.join(folder,`${id}-${randomUUID()}.tmp`);await writeFile(temporary,JSON.stringify(value));await rename(temporary,path.join(folder,`${id}.json`));return true;}};
}
