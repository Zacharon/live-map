import { positionContract } from '../core/spatial.js';
import { timeContract, instant } from '../core/time.js';
import { normalizeEnergyEvidence } from '../../../intelligence/energy-state.js';

export function liveRecords(envelope) {
  if(envelope?.schema!=='live-map-beta/1'||envelope.mode!=='live-beta'||!Array.isArray(envelope.canonicalEvents))throw new Error('Invalid beta API response');
  return envelope.canonicalEvents.map(e=>{
    const calculated=e.provider==='celestrak'&&e.dataKind==='Calculated';
    const ref={source:e.provider,kind:calculated?'contact':'event',id:e.providerEventId};
    const locator=e.sourceLocator;
    return {ref,energy:normalizeEnergyEvidence(e.energy??e.metadata?.energy),revision:calculated?instant(e.calculation?.calculatedAt):instant(e.updatedAt)??1,layer:calculated?'satellites':'events',category:e.category,type:e.type,countryCode:e.countryCode,countryName:e.countryName,title:e.title,place:e.locationName||'Location not supplied',summary:e.description,links:e.links||[],
      position:{...positionContract({latitude:e.latitude,longitude:e.longitude,horizontalReference:'WGS84',height:calculated?{value:e.calculatedHeightKm,unit:'km',quantity:'calculated',reference:'WGS84-ellipsoid'}:{value:null,unit:'unknown',quantity:'unknown',reference:'unknown'}}),...(calculated?{calculation:e.calculation}:{})},
      heading:null,time:timeContract({observedAt:e.startedAt,publishedAt:e.sourcePublishedAt,receivedAt:e.collectionTime,validTo:e.provider==='nws'?e.metadata?.expires:null,calculatedFor:e.calculation?.calculatedFor,calculatedAt:e.calculation?.calculatedAt}),
      maxAgeMs:e.maxAgeMs,source:{name:e.sourceName,url:e.sourceUrl,locator,version:String(e.updatedAt||'unknown'),origin:'public-primary',acquisition:'server-collected',kind:e.dataKind,availability:e.sourceAvailability},
      fieldLocators:{position:calculated?`${locator}: ${e.calculation?.modelVersion} / ${e.calculation?.transformation}`:`${locator}: ${e.geographic===false?'no point location; retain named area and original geometry':'geometry coordinates [longitude, latitude]; WGS84'}`,
        'position.height':calculated?'SGP4 calculated geodetic altitude in kilometers above WGS84 ellipsoid':'Not supplied as ellipsoid height; earthquake depth is a separate source measurement',
        'position.renderHeightMeters':calculated?'Calculated kilometers converted to meters once; no altitude exaggeration':'Surface display proxy, not a measured physical height',
        'time.observedAt':`${locator}: ${e.provider==='usgs'?'properties.time':e.provider==='eonet'?'geometry.date':e.provider==='gdacs'?'properties.fromdate (upstream UTC convention)':e.provider==='swpc'?'observation time not supplied':'properties.effective'}`,
        'time.publishedAt':`${locator}: ${e.provider==='nws'?'properties.sent':e.provider==='swpc'?'issue_datetime (UTC)':'publication time not supplied'}`,
        'time.receivedAt':'Server collection time, not source occurrence/publication',heading:'Not supplied','position.uncertaintyMeters':'Not supplied'},
      valueOrigin:calculated?'calculated':e.dataKind==='Observed'?'observed':'reported',stale:['Stale','Delayed'].includes(e.sourceAvailability),withdrawn:false,
      sourceId:e.providerEventId,updatedAt:instant(e.updatedAt),metadata:e.metadata||{},geometry:e.geometry};
  });
}
