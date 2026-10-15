import { inViewport, zoomBand } from './attention-policy.js';
// Display aggregation only. Every aggregate uses a member's actual coordinates.
// Viewport eligibility precedes grouping/budget, and selected records stand alone.
export function selectDisplayClusters(events,{zoom=3,bbox,selectedId,budget=480}={}) {
  const eligible=events.filter(e=>e.geographic!==false&&inViewport(e.lat,e.lon,bbox));
  const degrees=44*360/(256*2**zoom), groups=new Map();
  for(const event of eligible){
    const key=event.id===selectedId?`selected:${event.id}`:`${Math.floor((event.lon+180)/degrees)}:${Math.floor((event.lat+90)/degrees)}`;
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(event);
  }
  const displayed=[...groups.entries()].map(([key,members])=>{
    members.sort((a,b)=>String(a.id).localeCompare(String(b.id)));const first=members[0];
    return members.length===1?first:{...first,id:`display-cluster:${key}`,title:`${members.length} nearby records`,category:'other',severity:'medium',taxonomyColor:'#143f60',
      _displayCluster:true,memberIds:members.map(e=>e.id),recordKind:'event',coordinateMethod:"Display group anchored to an actual member; not an incident",geometry:null};
  }).sort((a,b)=>(b.id===selectedId)-(a.id===selectedId)||String(a.id).localeCompare(String(b.id)));
  const bounded=displayed.slice(0,budget), represented=bounded.reduce((n,e)=>n+(e.memberIds?.length||1),0);
  return {band:zoomBand(zoom),budget,displayed:bounded,eligible:eligible.length,represented,clusters:bounded.filter(e=>e._displayCluster).length,
    hiddenByScale:0,hiddenByBudget:eligible.length-represented,summarized:eligible.length-bounded.length,
    explanation:`${represented} records represented by ${bounded.length} clickable symbols. Nearby groups are display aggregation, not verified incidents. Zoom or open a group to choose a record.${displayed.length>budget?' Render budget reached; refine the map area.':''}`};
}
