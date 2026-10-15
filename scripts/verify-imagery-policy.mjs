import { writeFile } from 'node:fs/promises';
import { BASEMAPS } from '../src/map/basemaps.js';
const services={};
for(const config of Object.values(BASEMAPS)) {
 const url=config.service+'?f=pjson', response=await fetch(url,{signal:AbortSignal.timeout(20000)}), metadata=await response.json();
 services[config.id]={url,retrievedAt:new Date().toISOString(),copyrightText:metadata.copyrightText,description:metadata.description,minScale:metadata.minScale,maxScale:metadata.maxScale,lods:metadata.tileInfo?.lods,spatialReference:metadata.tileInfo?.spatialReference};
}
await writeFile('artifacts/real-history-2026-09-30/imagery-metadata.json',JSON.stringify(services,null,2));
console.log('Saved actual service metadata, copyright, source vintages, effective maxScale and LODs.');
