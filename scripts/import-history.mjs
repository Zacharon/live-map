import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { normalizeUsgsFeature } from '../src/data/providers/usgs.js';
import { normalizeEonetEvent, representativePoint } from '../src/data/providers/eonet.js';
const start='2024-09-01', end='2024-09-30', retrievedAt=new Date().toISOString();
const out=new URL('../data/history/september-2024/',import.meta.url);
await mkdir(new URL('../',out),{recursive:true});
// Immutable version: refuse overwrite before any network request.
await mkdir(out);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifest={version:1,importer:'live-map-history-v1',start,end,retrievedAt,providers:{},limitations:['Current catalog extract of historical occurrences/observations, not point-in-time knowledge.', 'USGS magnitude >= 4.5; EONET coverage is curated natural hazards, not all hazards or global news.', 'Basemap imagery is reference imagery, not dated to these events.']};
const records=[];
for(const provider of ['usgs','eonet']) {
  const url=provider==='usgs' ? `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${start}T00%3A00%3A00Z&endtime=${end}T23%3A59%3A59.999Z&minmagnitude=4.5&eventtype=earthquake&orderby=time-asc&limit=20000` : `https://eonet.gsfc.nasa.gov/api/v3/events?start=${start}&end=${end}&status=all&limit=5000`;
  const receipt={url,requestedAt:new Date().toISOString(),accepted:0,rejected:[],duplicates:0};
  manifest.providers[provider]=receipt;
  try {
    const response=await fetch(url,{signal:AbortSignal.timeout(60000),redirect:'error'});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    if(Number(response.headers.get('content-length'))>16000000) throw new Error('response too large');
    const chunks=[]; let size=0; for await(const chunk of response.body){size+=chunk.length;if(size>16000000)throw new Error('response too large');chunks.push(chunk);}
    const bytes=Buffer.concat(chunks); receipt.sha256=hash(bytes);receipt.bytes=bytes.length;
    const body=JSON.parse(bytes); const input=provider==='usgs'?body.features:body.events;
    if(!Array.isArray(input))throw new Error('invalid collection');
    receipt.returned=input.length; receipt.cap=provider==='usgs'?20000:5000; receipt.capReached=input.length>=receipt.cap;
    if(receipt.capReached)throw new Error('response reached cap; partition required');
    await writeFile(new URL(`${provider}-response.json`,out),bytes);
    const seen=new Set();
    for(const raw of input){
      if(!raw.id){receipt.rejected.push({id:null,reason:'missing provider ID'});continue;}
      if(seen.has(raw.id)){receipt.duplicates++;continue;}seen.add(raw.id);
      let result;
      if(provider==='usgs')result=normalizeUsgsFeature(raw,new Date(retrievedAt));
      else {
        const observations=(raw.geometry||[]).map(g=>({observedAt:g.date,geometry:{type:g.type,coordinates:g.coordinates},magnitudeValue:g.magnitudeValue??null,magnitudeUnit:g.magnitudeUnit??null,point:representativePoint(g)})).filter(g=>g.point&&Number.isFinite(Date.parse(g.observedAt))).sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt));
        const bounded=observations.filter(g=>Date.parse(g.observedAt)<=Date.parse(end+'T23:59:59.999Z'));
        result=normalizeEonetEvent({...raw,geometry:bounded.map(g=>({...g.geometry,date:g.observedAt}))},new Date(retrievedAt));
        if(result.event){const e=result.event;e.metadata.verificationStatus='observed';e.verificationStatus='observed';e.metadata.details['Geometry limitation']='Curated EONET observations; approximate spatial/temporal extent, not a proven onset or official warning.';e.startedAt=null;e.updatedAt=null;e.sourcePublishedAt=null;e.description=`NASA EONET ${raw.categories.map(c=>c.title).join(', ')} observations. Event onset and publication time are not supplied.`;e.confidence=null;e.metadata.observationSeries=bounded;e.metadata.categories=raw.categories;e.metadata.sources=raw.sources;e.metadata.catalogUrl=raw.link;e.metadata.closedAt=raw.closed??null;e.metadata.details['Time basis']='Dated geometry observation; event onset unknown';e.metadata.details.Status=raw.closed?'Closed in retrieved catalog':'Open in retrieved catalog';}
      }
      if(!result.event){receipt.rejected.push({id:raw.id,reason:result.errors});continue;}
      result.event.metadata.acquisitionMode='historical_public';result.event.metadata.retrievedAt=retrievedAt;
      if(provider==='usgs'){result.event.metadata.magnitudeType=raw.properties.magType??null;result.event.metadata.details['Magnitude type']=raw.properties.magType??'Not supplied';}
      records.push(result.event);receipt.accepted++;
    }
    receipt.status='available';
  } catch(error){receipt.status='unavailable';receipt.error=error.message;}
}
manifest.accepted=records.length;manifest.recordSha256=hash(JSON.stringify(records));
await writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2)+'\n');
await writeFile(new URL('snapshot.js',out),'// Immutable public factual archive. Generated by scripts/import-history.mjs.\nexport const historySnapshot = '+JSON.stringify({manifest,records})+';\n');
console.log(JSON.stringify(manifest,null,2));
if(!records.length)process.exitCode=1;
