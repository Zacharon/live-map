// All records are invented test scenarios. Only loaded with ?demo=foundation.
export function foundationEvents(now = Date.now(), count = 120) {
  const places = [[35,140,'Japan','earthquake'],[38,24,'Greece','wildfire'],[15,-65,'Caribbean','storm'],[-4,105,'Indonesia','volcano'],[25,65,'Arabian Sea','infrastructure'],[0,179,'Pacific','earthquake'],[-22,-45,'Brazil','flood'],[33,-118,'California','wildfire'],[3,31,'East Africa','flood'],[49,28,'Eastern Europe','conflict'],[-35,150,'Australia','storm'],[22,39,'Red Sea','infrastructure']];
  return Array.from({length:count},(_,i) => { const [lat,lon,place,category] = places[i%places.length]; return {
    id:`demo-${i}`,title:`[DEMO] ${['Earthquake sequence','Wildfire advisory','Tropical storm warning','Volcanic activity','Port disruption','Ocean earthquake','Flood warning','Wildfire observation','Regional flooding','Security notice','Coastal weather warning','Maritime advisory'][i%12]}`,
    summary:'Synthetic scenario for interface testing. No real incident is represented.',category, severity:i<12?'high':i<30?'medium':'low',
    lat:lat+(i<12?0:(i%7)*.02),lon,place,country:place,occurredAt:now-(i+1)*600000,updatedAt:now-i*300000,
    sourceName:'Synthetic test fixture',source:'Synthetic test fixture',sourceType:'Demo',sourceUrl:'https://example.com/synthetic-fixture',confidence:80,
    verificationStatus:'Reported',coordinateMethod:'Approximate region — synthetic test location',geographic:true,recordKind:'event' }; });
}
export function foundationObjects(now = Date.now(), count = 40) {
  return Array.from({length:count},(_,i) => ({id:`demo-object-${i}`,objectType:i%2?'aircraft':'vessel',latitude:25+(i%10)*.1,longitude:56+Math.floor(i/10)*.1,
    observedAt:now-(i%5)*400000,receivedAt:now,displayName:`DEMO ${i%2?'aircraft':'vessel'} ${i+1}`,sourceName:'Synthetic test fixture',sourceUrl:'https://example.com/synthetic-fixture',
    heading:90,altitude:i%2?9000:null,speed:20,status:'Synthetic observation',dataAgeSeconds:(i%5)*400,stale:i%5>1}));
}
