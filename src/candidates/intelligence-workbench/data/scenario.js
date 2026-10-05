import { foundationEvents, foundationObjects } from '../../../data/foundation-demo.js';
import { positionContract, headingDegrees } from '../core/spatial.js';
import { timeContract } from '../core/time.js';
export const NOW = Date.parse('2026-10-01T12:00:00Z');
export const DATA_VERSION = 'foundation-2026-10-01.global-v2';
// Deliberately invented display scenarios, not observed routes or real vehicles.
export const VESSEL_SITES = [
  [36,-12,'Eastern Atlantic'],[43,-55,'North Atlantic'],[30,-72,'Western Atlantic'],[51,2,'English Channel'],
  [35,18,'Mediterranean'],[57,18,'Baltic Sea'],[64,-5,'Norwegian Sea'],[-5,-32,'Equatorial Atlantic'],
  [-30,10,'South Atlantic'],[-35,25,'South of Africa'],[-15,44,'Mozambique Channel'],[5,65,'Indian Ocean'],
  [14,59,'Arabian Sea'],[-27,90,'Southern Indian Ocean'],[-12,118,'Timor Sea'],[10,114,'South China Sea'],
  [30,145,'Northwest Pacific'],[18,-155,'Central Pacific'],[-20,-110,'South Pacific'],[30,-125,'Northeast Pacific'],
];
export const AIRCRAFT_SITES = [
  [45,-105,'North America'],[32,-90,'Gulf region'],[55,-115,'Western Canada'],[47,-30,'Transatlantic'],
  [51,-5,'Western Europe'],[42,8,'Southern Europe'],[30,27,'North Africa'],[5,20,'Central Africa'],
  [-20,25,'Southern Africa'],[35,45,'Western Asia'],[48,70,'Central Asia'],[24,80,'South Asia'],
  [38,115,'East Asia'],[50,145,'Northwest Pacific'],[0,110,'Southeast Asia'],[-25,135,'Australia'],
  [-38,175,'New Zealand region'],[-12,-65,'South America'],[8,-85,'Central America'],[15,-135,'Transpacific'],
];
function record(input, kind, index) {
  const contact = kind === 'contact';
  const layer = contact ? (input.objectType === 'aircraft' ? 'aircraft' : 'vessels') : 'events';
  const unknownHeight = contact && layer === 'aircraft' && index === 1;
  const pressureHeight = contact && layer === 'aircraft' && index === 3;
  const site = contact ? (layer==='aircraft'?AIRCRAFT_SITES:VESSEL_SITES)[Math.floor(index/2)] : null;
  const position = positionContract({ latitude: contact ? site[0] : input.lat, longitude: contact ? site[1] : input.lon,
    horizontalReference: 'WGS84', uncertaintyMeters: null,
    height: { value: contact ? unknownHeight ? null : input.altitude : null, unit: contact && input.altitude != null ? 'm' : 'unknown',
      quantity: contact && input.altitude != null ? pressureHeight ? 'barometric' : 'geometric' : 'unknown',
      reference: pressureHeight ? 'pressure-standard' : contact && input.altitude != null ? 'WGS84-ellipsoid' : 'unknown', uncertaintyMeters: null } });
  const locator = `${contact ? 'foundationObjects' : 'foundationEvents'}(${NOW},${contact ? 40 : 12})[${index}]`;
  return { ref: { source: 'synthetic-foundation', kind, id: input.id }, revision: 1, layer,
    title: contact ? input.displayName : input.title.replace('[DEMO] ', ''), place: contact ? `${site[2]} · synthetic position` : input.place,
    summary: contact ? 'Invented contact for inspection and projection testing. No real vessel or aircraft is represented.' : input.summary,
    position, heading: headingDegrees(input.heading), time: timeContract({ observedAt: contact ? input.observedAt : input.occurredAt,
      publishedAt: null, receivedAt: NOW, validFrom: null, validTo: null }),
    maxAgeMs: contact ? 20 * 60 * 1000 : 24 * 60 * 60 * 1000,
    source: { name: 'Synthetic test fixture', url: null, locator,
      version: DATA_VERSION, origin: 'synthetic', acquisition: 'local-generated', observedUnitPolicy: 'Fixture extension declares aircraft metres / WGS84 ellipsoid, except disclosed unknown and pressure fixtures.' },
    fieldLocators: {
      position: contact ? `candidate data/scenario.js ${layer==='aircraft'?'AIRCRAFT_SITES':'VESSEL_SITES'}[${Math.floor(index/2)}]: explicitly invented global WGS84 position; original regional fixture coordinates are overridden` : `${locator}.lat + lon; WGS84 is declared in candidate data/scenario.js record()`,
      'position.height': unknownHeight ? 'candidate data/scenario.js record(index=1): explicit unknown-height fixture override' : contact ? `${locator}.altitude; units/reference/quantity are declared in candidate data/scenario.js record()${pressureHeight?' (pressure-height override at index=3)':''}` : 'Not supplied by the source fixture',
      'position.renderHeightMeters': 'Derived display policy: candidate core/spatial.js positionContract() and application/projections.js anchor; not a source measurement',
      'time.observedAt': `${locator}.${contact?'observedAt':'occurredAt'}`,
      'time.publishedAt': 'Not supplied by the source fixture',
      'time.receivedAt': contact ? `${locator}.receivedAt` : 'candidate data/scenario.js record(): declared receipt at frozen snapshot NOW',
      heading: contact ? `${locator}.heading` : 'Not supplied by the source fixture',
      'position.uncertaintyMeters': 'Not supplied by the source fixture',
    },
    valueOrigin: 'synthetic', stale: contact ? input.stale : false, withdrawn: false };
}
function satellite(index) {
  const latitude=[15,48,-25,35,-10,55,-42,22,-5,40,-30,5][index];
  const longitude=[-130,-85,-45,-8,28,65,95,125,160,-165,-105,45][index];
  const locator=`candidate data/scenario.js satellite(${index})`;
  return {ref:{source:'synthetic-foundation',kind:'contact',id:`demo-satellite-${index}`},revision:1,layer:'satellites',
    title:`DEMO satellite ${index+1}`,place:'Orbital-height fixture · synthetic position',
    summary:'Invented satellite position at a frozen snapshot. No real satellite, orbital elements or propagation is represented.',
    position:positionContract({latitude,longitude,horizontalReference:'WGS84',height:{value:550+index*25,unit:'km',quantity:'geometric',reference:'WGS84-ellipsoid'}}),
    heading:null,time:timeContract({observedAt:NOW,receivedAt:NOW}),maxAgeMs:0,
    source:{name:'Synthetic satellite fixture',url:null,locator,version:DATA_VERSION,origin:'synthetic',acquisition:'local-generated'},
    fieldLocators:{position:`${locator}: invented latitude/longitude in WGS84`,'position.height':`${locator}: declared geometric ellipsoid height in kilometres; synthetic only`,
      'position.renderHeightMeters':'candidate core/spatial.js: declared kilometres converted once to metres',
      'time.observedAt':`${locator}: frozen synthetic snapshot NOW`,'time.receivedAt':`${locator}: frozen synthetic snapshot NOW`,
      'time.publishedAt':'Not supplied; synthetic fixture',heading:'Not supplied; no track inferred','position.uncertaintyMeters':'Not supplied; synthetic fixture'},
    valueOrigin:'synthetic',stale:false,withdrawn:false};
}
export function scenarioRecords() {
  const rows = [...foundationEvents(NOW, 12).map((item, i) => record(item, 'event', i)),
    ...foundationObjects(NOW, 40).map((item, i) => record(item, 'contact', i)),
    ...Array.from({length:12},(_,index)=>satellite(index))];
  function freeze(value) { if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); } return value; }
  return freeze(rows);
}
