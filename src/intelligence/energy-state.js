import { finiteNumber, timestampMs } from '../events/value-semantics.js';

// These are evidence families, not interchangeable measures of oil supply.
export const ENERGY_DIMENSIONS = Object.freeze([
  {id:'PRODUCTION_POLICY',label:'Production policy',meaning:'Targets and permissions; not actual output.',stages:['TARGET']},
  {id:'ACTUAL_OUTPUT',label:'Actual output',meaning:'Produced quantities, with commodity, period and reporting method.',stages:['REPORTED','MEASURED','ESTIMATED']},
  {id:'EXPORT_LOADINGS',label:'Export / loadings',meaning:'Loaded or exported cargo; not proof of transit or delivery.',stages:['LOADED','EXPORTED']},
  {id:'TRANSIT_FLOW',label:'Transit flow',meaning:'Passage counts or estimated volumes; not inferred cargo or delivery.',stages:['TRANSITED','AIS_ESTIMATE']},
  {id:'EMERGENCY_STOCK_RELEASE',label:'Emergency stock release',meaning:'Announcement, allocation, withdrawal and delivery remain distinct.',stages:['ANNOUNCED','AUTHORIZED','ALLOCATED','WITHDRAWN','DELIVERED']},
  {id:'RETAIL_WHOLESALE_PRICE',label:'Retail / wholesale price',meaning:'Benchmark, wholesale, retail and local quote bases remain distinct.',stages:['PRICE','QUOTE']},
]);
const priceBases=new Set(['BENCHMARK','WHOLESALE','RETAIL','LOCAL_QUOTE']);
const text=value=>typeof value==='string'&&value.trim()?value.trim().slice(0,500):null;
function sourceLink(value){try{const url=new URL(value);return typeof value==='string'&&['http:','https:'].includes(url.protocol)&&!url.username&&!url.password?url.href:null;}catch{return null;}}
export function energyTimestamp(value){
  if(typeof value==='string'){
    const match=/^(\d{4})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2}))?)?)?$/i.exec(value.trim());
    if(!match)return finiteNumber(value)===null?null:timestampMs(value);
    const year=Number(match[1]),month=Number(match[2]||1),day=Number(match[3]||1);
    const days=[31,year%4===0&&(year%100!==0||year%400===0)?29:28,31,30,31,30,31,31,30,31,30,31];
    if(month<1||month>12||day<1||day>days[month-1]||Number(match[4]||0)>23||Number(match[5]||0)>59||Number(match[6]||0)>59)return null;
    return Number.isFinite(Date.parse(value.trim()))?Date.parse(value.trim()):null;
  }
  return timestampMs(value);
}
export function normalizeEnergyEvidence(input) {
  const dimension=ENERGY_DIMENSIONS.find(d=>d.id===input?.dimension);
  if(!dimension)return null; // Never classify from a headline, country or generic energy tag.
  return {dimension:dimension.id,stage:dimension.stages.includes(input.stage)?input.stage:null,
    value:finiteNumber(input.value),units:text(input.units),commodity:text(input.commodity),
    period:text(input.period),scope:text(input.scope),method:text(input.method),
    priceBasis:dimension.id==='RETAIL_WHOLESALE_PRICE'&&priceBases.has(input.priceBasis)?input.priceBasis:null};
}
export function buildEnergyState(records=[],{asOf=Date.now(),knownAt=asOf,sourceStatus={}}={}) {
  asOf=energyTimestamp(asOf);knownAt=energyTimestamp(knownAt);
  const dimensions=Object.fromEntries(ENERGY_DIMENSIONS.map(d=>[d.id,{label:d.label,meaning:d.meaning,status:'unknown',records:[]} ]));
  if(asOf===null||knownAt===null)return {schema:'energy-state/1',asOf,knownAt,dimensions};
  const seen=new Set();
  for(const record of records){
    const energy=normalizeEnergyEvidence(record.energy);
    if(!energy||record.withdrawn)continue;
    const occurred=energyTimestamp(record.startedAt??record.occurredAt??record.time?.observedAt);
    const published=energyTimestamp(record.sourcePublishedAt??record.publishedAt??record.time?.publishedAt);
    const received=energyTimestamp(record.ingestedAt??record.collectionTime??record.time?.receivedAt);
    // The target month is context. The decision/event clock governs visibility.
    // Unknown or future knowledge cannot fill a historical state.
    if(occurred===null||occurred>asOf||received===null||received>knownAt||(published!==null&&published>knownAt))continue;
    const sourceUrl=sourceLink(record.sourceUrl??record.source?.url);
    const sourceName=text(record.sourceName??record.source?.name);
    if(!sourceUrl||!sourceName)continue;
    const id=record.id??(record.ref?`${record.ref.source}/${record.ref.kind}/${record.ref.id}`:`${sourceUrl}:${record.seriesId}:${occurred}`);
    // A threshold event and its attached series observation describe one datum.
    const series=record.seriesId??record.metadata?.seriesId;
    const identity=series?JSON.stringify([sourceUrl,series,occurred,published,energy]):`${id}:${energy.dimension}`;
    if(seen.has(identity))continue;seen.add(identity);
    dimensions[energy.dimension].records.push({id,sourceName,sourceUrl,
      occurredAt:occurred,publishedAt:published,receivedAt:received,
      availability:record.stale===true||sourceStatus[record.provider??record.ref?.source]?.stale===true?'Stale':record.sourceAvailability??record.source?.availability??'Unknown',energy});
    dimensions[energy.dimension].status='records-present';
  }
  // No sums, substitution, causal verdicts or freshness/verification promotion.
  return {schema:'energy-state/1',asOf,knownAt,dimensions};
}
