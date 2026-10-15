import { historySnapshot } from '../../data/history/september-2024/snapshot.js';
import { toLegacyEvent } from '../events/normalized-event.js';
import { computeQualityDimensions } from '../events/event-quality.js';
export const archiveManifest=historySnapshot.manifest;
export function validDay(value) {
  return typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value+'T00:00:00Z')) && new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
}
export function historyWindow(params) {
  const start=params.get('start')||archiveManifest.start, end=params.get('end')||archiveManifest.end;
  const cursor=params.get('cursor')||end;
  if(![start,end,cursor].every(validDay)||start>end||cursor<start||cursor>end)throw new Error('invalid-history-window');
  return {start,end,cursor,startMs:Date.parse(start+'T00:00:00Z'),endMs:Date.parse(end+'T23:59:59.999Z'),cursorMs:Date.parse(cursor+'T23:59:59.999Z')};
}
export function readHistory(params, snapshot=historySnapshot) {
  const window=historyWindow(params), canonicalEvents=[];
  for(const original of snapshot.records){
    let event=original;
    if(event.provider==='eonet'){
      const series=(event.metadata.observationSeries||[]).filter(o=>Date.parse(o.observedAt)<=window.cursorMs);
      const observations=series.filter(o=>Date.parse(o.observedAt)>=window.startMs&&Date.parse(o.observedAt)<=window.endMs);
      const latest=observations.at(-1);if(!latest)continue;
      event={...event,latitude:latest.point.latitude,longitude:latest.point.longitude,geometry:latest.geometry,
        metadata:{...event.metadata,observationSeries:series,observedAt:latest.observedAt,coordinateMethod:latest.point.method,
          closedAt:event.metadata.closedAt&&Date.parse(event.metadata.closedAt)<=window.cursorMs?event.metadata.closedAt:null,
          sources:(event.metadata.sources||[]),details:{...event.metadata.details,Status:'Retrieved catalog status; not reconstructed at cursor',
            'Observation (UTC)':latest.observedAt,'Observations through cursor':series.length,'Event onset':'Not supplied', 'Catalog retrieved (UTC)':snapshot.manifest.retrievedAt}}};
    } else {
      const time=Date.parse(event.startedAt);if(!Number.isFinite(time)||time<window.startMs||time>window.endMs||time>window.cursorMs)continue;
    }
    canonicalEvents.push({...event,...computeQualityDimensions(event)});
  }
  const sourceStatus=Object.fromEntries(Object.entries(snapshot.manifest.providers).map(([id,p])=>[id,{ok:p.status==='available',status:p.status==='available'?'historical':'unavailable',count:canonicalEvents.filter(e=>e.provider===id).length,accepted:p.accepted,retrievedAt:snapshot.manifest.retrievedAt,message:'Saved public catalog extract; no live collection.'}]));
  return {events:canonicalEvents.map(toLegacyEvent),canonicalEvents,generatedAt:Date.parse(snapshot.manifest.retrievedAt),mode:'historical-archive',systemStatus:'historical-archive',
    sources:Object.keys(sourceStatus).filter(id=>sourceStatus[id].ok).map(id=>id==='usgs'?'USGS':'NASA EONET'),sourceStatus,
    history:{...window,archiveStart:snapshot.manifest.start,archiveEnd:snapshot.manifest.end,totalImported:snapshot.manifest.accepted,selected:canonicalEvents.length,retrievedAt:snapshot.manifest.retrievedAt,limitations:snapshot.manifest.limitations},
    errors:Object.entries(snapshot.manifest.providers).filter(([,p])=>p.status!=='available').map(([id])=>`${id}: archive retrieval unavailable`),observations:[],storylines:[],providerResults:[],filters:{},changeCursor:null};
}
