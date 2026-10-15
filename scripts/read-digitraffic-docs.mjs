import {writeFileSync,mkdirSync} from 'node:fs';
const url='https://meri.digitraffic.fi/swagger/openapi.json';
const r=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{'Accept-Encoding':'gzip','Digitraffic-User':'LiveMap/LocalReview'}});
if(!r.ok)throw Error('Docs HTTP '+r.status);
const json=await r.json();mkdirSync('evidence/sources',{recursive:true});
const subset={url,retrievedAt:new Date().toISOString(),path:json.paths['/api/ais/v1/locations'],schemas:{}};
for(const [k,v] of Object.entries(json.components?.schemas || {}))if(/ais|location|feature|geometry/i.test(k))subset.schemas[k]=v;
writeFileSync('evidence/sources/digitraffic-api-schema.json',JSON.stringify(subset,null,2));
console.log(JSON.stringify(subset.path));
