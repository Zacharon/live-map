import { readSnapshots } from '../../../src/beta/snapshot-service.js';
import { withPublicApiGuard } from '../../../netlify/functions/lib/response.mjs';
import { snapshotStorage } from './lib/storage.mjs';
import { calculatedSatellites } from '../../../src/beta/satellite-service.js';
import * as satelliteApi from 'satellite.js';
export default async function events(request){
  return withPublicApiGuard(request,async()=>{
    if(request.method!=='GET')return Response.json({error:'method-not-allowed'},{status:405,headers:{Allow:'GET'}});
    try{const storage=snapshotStorage(),envelope=await readSnapshots(storage);
      const satellites=calculatedSatellites(await storage.get('celestrak'),envelope.generatedAt,satelliteApi);
      envelope.canonicalEvents.push(...satellites.events);envelope.sourceStatus.celestrak=satellites.status;
      if(satellites.status.availability!=='Fresh'&&envelope.systemStatus==='fresh')envelope.systemStatus='partial';
      if(satellites.status.error)envelope.errors.push({source:'celestrak',error:satellites.status.error});
      envelope.unavailableLayers.satellites=satellites.events.length?null:'Unavailable — usable real elements not retained';
      return Response.json(envelope,{status:envelope.systemStatus==='unavailable'?503:200,headers:{'Cache-Control':'public, max-age=30, s-maxage=60','X-Live-Map-Mode':'live-beta'}});}
    catch{return Response.json({schema:'live-map-beta/1',mode:'live-beta',canonicalEvents:[],sourceStatus:{},systemStatus:'unavailable',errors:[{error:'snapshot-storage-unavailable'}]},{status:503,headers:{'Cache-Control':'no-store'}});}
  });
}
