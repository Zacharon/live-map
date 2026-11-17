import { getStore, getDeployStore } from '@netlify/blobs';
export function snapshotStorage(){
  const production=globalThis.Netlify?.context?.deploy?.context==='production';
  const store=production?getStore({name:'live-map-beta-public-v1',consistency:'strong'}):getDeployStore({name:'live-map-beta-public-v1',consistency:'strong'});
  const versions=new Map();
  return {async get(id){const blob=await store.getWithMetadata(id,{type:'json'});let etag=blob?.etag;
      // Netlify's local Blobs emulator omits ETag on GET but returns it in
      // listings. Never confuse an existing value without ETag with a new key.
      if(blob&&!etag){
        if(production)throw new Error('snapshot-version-unavailable');
        const listing=await store.list({prefix:id});etag=listing.blobs.find(entry=>entry.key===id)?.etag;
        const current=await store.getWithMetadata(id,{type:'json'});
        const after=await store.list({prefix:id});
        if(after.blobs.find(entry=>entry.key===id)?.etag!==etag||JSON.stringify(current?.data)!==JSON.stringify(blob.data))throw new Error('snapshot-version-changed');
      }
      if(blob&&!etag)throw new Error('snapshot-version-unavailable');
      versions.set(id,etag||null);return blob?.data||null;},
    async set(id,value){const etag=versions.get(id);const result=await store.setJSON(id,value,etag?{onlyIfMatch:etag}:{onlyIfNew:true});
      if(!result.modified)return false;
      // SDK conditional-write results alone do not establish persistence.
      const retained=await store.getWithMetadata(id,{type:'json'});
      if(!retained)throw new Error('snapshot-write-not-retained');
      return JSON.stringify(retained.data)===JSON.stringify(value);}};
}
