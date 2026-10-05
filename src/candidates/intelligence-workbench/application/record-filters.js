// A shared register contract: camera visibility is optional, never a prerequisite.
export const REGIONS = Object.freeze([
  {id:'all',label:'Worldwide'}, {id:'north-america',label:'North America',bounds:[-170,5,-30,85]},
  {id:'south-america',label:'South America',bounds:[-85,-60,-30,15]},
  {id:'europe',label:'Europe',bounds:[-25,35,45,72]}, {id:'africa',label:'Africa',bounds:[-20,-40,55,38]},
  {id:'asia',label:'Asia',bounds:[40,-10,180,80]}, {id:'oceania',label:'Oceania',bounds:[110,-55,-130,15]},
  {id:'non-geographic',label:'No point location'},
]);
export function recordClock(record) {
  if(record.time.calculatedFor!=null)return {at:record.time.calculatedFor,label:'Calculated'};
  if(record.time.observedAt!=null)return {at:record.time.observedAt,label:'Event time'};
  return {at:record.time.publishedAt??null,label:record.time.publishedAt==null?'Unknown time':'Issued'};
}
export function recordType(record) {return record.layer==='satellites'?'satellite':record.category||record.type||record.layer;}
export function inRegion(record,id) {
  if(id==='all'||!id)return true;
  if(id==='non-geographic')return !record.position.valid;
  // Source zone metadata can include Pacific U.S. territories. Real points
  // always take precedence; nationality is not a continent assignment.
  if(!record.position.valid&&record.ref?.source==='nws')return (record.metadata?.navigationRegions||[]).includes(id);
  const bounds=REGIONS.find(r=>r.id===id)?.bounds;
  if(!bounds||!record.position.valid)return false;
  const [west,south,east,north]=bounds, {longitude:lon,latitude:lat}=record.position;
  return lat>=south&&lat<=north&&(west<=east?lon>=west&&lon<=east:lon>=west||lon<=east);
}
export function matchesFilters(record,filters,asOf) {
  const clock=recordClock(record).at;
  const age=filters.days==='all'?Infinity:Number(filters.days||30)*86400000;
  return (filters.source==='all'||!filters.source||record.ref.source===filters.source)
    && (filters.type==='all'||!filters.type||recordType(record)===filters.type||(record.ref.source==='nws'&&filters.type===`nws:${record.metadata?.alertEvent}`))
    && inRegion(record,filters.region)
    && (!filters.energy||filters.energy==='all'||record.energy?.dimension===filters.energy)
    && (clock==null || (clock<=asOf && asOf-clock<=age))
    && `${record.title} ${record.place} ${record.summary||''} ${record.ref.source} ${record.source.name} ${record.ref.id} ${recordType(record)} ${record.countryName||''}`.toLowerCase().includes((filters.search||'').trim().toLowerCase());
}
export function registerPage(rows,{page=0,pageSize=50,visibleOnly=false}={}) {
  const matches=rows.filter(row=>row.reason!=='filter-excluded'&&(!visibleOnly||row.renderable))
    .sort((a,b)=>(recordClock(b.record).at??-Infinity)-(recordClock(a.record).at??-Infinity)||a.key.localeCompare(b.key));
  const lastPage=Math.max(0,Math.ceil(matches.length/pageSize)-1),current=Math.min(Math.max(0,page),lastPage);
  return {entries:matches.slice(current*pageSize,(current+1)*pageSize),page:current,lastPage,total:matches.length,start:matches.length?current*pageSize+1:0,end:Math.min(matches.length,(current+1)*pageSize)};
}
