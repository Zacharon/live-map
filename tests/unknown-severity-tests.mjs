import assert from 'node:assert/strict';
import { normalizeEvent } from '../src/events/event-normalizer.js';
import { createNormalizedEvent, toLegacyEvent } from '../src/events/normalized-event.js';
import { filteredEvents } from '../src/events/event-filters.js';
import { computeCountryRiskScores } from '../src/risk/country-risk.js';
import { buildIncidents } from '../src/events/incident-clustering.js';
import { buildEventClusters } from '../src/events/clustering.js';
import { computeThreatLevel, computeClusterThreatLevel } from '../src/intelligence/threat-level.js';
const base = { id:'synthetic', provider:'test', title:'Synthetic record', category:'other', geographic:false, country:'Japan', domain:'natural-disaster', occurredAt:1790000000000 };
for (const severity of [undefined,null,'', 'unknown']) {
  const event = normalizeEvent({...base,severity});
  assert.equal(event.severity,'unknown');
  assert.equal(event.severityScore,null);
  assert.equal(toLegacyEvent(createNormalizedEvent({...base,severity}).event).severity,'unknown');
  assert.equal(computeThreatLevel(event).score,null);
}
const events = [normalizeEvent(base),normalizeEvent({...base,id:'zero',severity:0}),normalizeEvent({...base,id:'high',severity:70})];
assert.deepEqual(events.map(e=>e.severityScore),[null,0,70]);
const filters={categories:new Set(['other']), severities:new Set(['unknown','low','high']),query:''};
assert.deepEqual(filteredEvents(events,filters,24,'severity',1790000000000).map(e=>e.id),['high','zero','synthetic']);
filters.severities=new Set(['unknown']);
assert.deepEqual(filteredEvents(events,filters,24,'severity',1790000000000).map(e=>e.id),['synthetic']);
const risk=computeCountryRiskScores(events,1790000000000).find(e=>e.countryName==='Japan');
assert.equal(risk.unknownSeverityEvents,1);
assert.ok(Number.isFinite(risk.score));
console.log('PASS unknown, zero, known normalization/filter/sort/risk/threat regression');

assert.equal(buildIncidents([events[0]])[0].severity,null);
assert.equal(buildEventClusters([events[0],{...events[0],id:'second'}])[0].severity,'unknown');

for (const field of ['severity','severityLabel']) {
  for (const value of ['toString','constructor','__proto__']) {
    const event = normalizeEvent({...base,[field]:value});
    assert.equal(event.severityScore,null);
    assert.equal(createNormalizedEvent({...base,[field]:value}).event.severity,null);
    assert.equal(computeThreatLevel(event).score,null);
  }
}
assert.equal(normalizeEvent({...base,uiSeverity:'high'}).severity,'high');
assert.equal(normalizeEvent({...base,severity:0,uiSeverity:'high'}).severityScore,0);
assert.equal(normalizeEvent({...base,severity:0,uiSeverity:'high'}).severity,'low');
const coLocated = events.map(e=>({...e,lat:1,lon:1,geographic:true,providerId:'same'}));
assert.equal(buildIncidents(coLocated)[0].severity,70);
assert.equal(buildIncidents(coLocated.slice(0,2))[0].severity,0);
assert.equal(buildEventClusters(coLocated)[0].severity,'high');
assert.equal(buildEventClusters(coLocated.slice(0,2))[0].severity,'low');
assert.equal(computeClusterThreatLevel({events:[events[0],{...events[0],id:'second'}]}).score,null);
const japan = records => computeCountryRiskScores(records,1790000000000).find(e=>e.countryName==='Japan');
assert.deepEqual(japan([events[0]]).factors,japan([]).factors);
assert.deepEqual(japan(events).factors,japan(events.slice(1)).factors);
console.log('PASS Sol S1/S2 and mixed cluster/risk pressure regressions');
