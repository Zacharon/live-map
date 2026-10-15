import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseCaseFile,serializeCase} from '../src/intelligence/case-io.js';
import {inspectAviationIncident,validateAviationCase} from '../src/intelligence/aviation-incident.js';
import {renderInvestigationWorkbench} from '../src/ui/investigation-workbench.js';
const text=fs.readFileSync(new URL('../data/development-fixtures/aviation-riyadh-2026-10.json',import.meta.url),'utf8');
const parsed=parseCaseFile(text);assert.equal(parsed.ok,true,parsed.errors.join('; '));
const c=parsed.caseObject, result=inspectAviationIncident(c);
assert.equal(result.ok,true);assert.equal(c.events.length,2);
assert.deepEqual(result.facets.casualties.map(r=>[r.eventId,r.fields.killed,r.fields.injured]),[['ruh-2026-10-10',null,null],['ruh-2026-10-10',12,309],['ruh-2026-10-10',13,300],['ruh-2026-10-11',1,11]]);
assert.equal(result.casualtyTotals,null);assert.equal(result.airportCurrentState,'unknown');assert.equal(result.officialAirspaceClosure,'unknown');
assert.equal(result.facets.flightDisruption[0].fields.flights.length,6);assert.equal(result.facets.flightDisruption[1].fields.flights.length,6);
assert.equal(result.facets.flightDisruption[1].fields.flights.filter(f=>f.date==='2026-10-12').length,4);
assert.equal(result.facets.economic.length,0);assert.equal(result.corroboration.independentAttackObservations,null);
assert.deepEqual(inspectAviationIncident(parseCaseFile(serializeCase(c)).caseObject),result);
assert.deepEqual(inspectAviationIncident(c),result);assert.equal(result.receipt.effect,'none');
const snapshot=JSON.stringify(c);inspectAviationIncident(c);assert.equal(JSON.stringify(c),snapshot);
let n=0;
function reject(mut){const d=structuredClone(c);mut(d);const checked=parseCaseFile(JSON.stringify({kind:'live-map-investigation-case',case:d}));assert.equal(checked.ok,false,`negative ${n}`);n++;}
for(const mut of [
 d=>d.caseType='other',d=>d.genuine=false,d=>d.reviewState='approved',d=>d.asOf=null,d=>d.events=null,d=>d.events[0].eventDate='Saturday',
 d=>d.sources=null,d=>d.sources[0].url='javascript:alert(1)',d=>d.sources[0].clocks.retrievedAt=null,d=>d.sources[0].clocks.updatedAt='yesterday',
 d=>d.evidence=null,d=>d.evidence[0].extra.aviation=null,d=>d.evidence[0].summary={},d=>d.evidence[0].parentEvidenceIds={},d=>d.evidence[0].qualityLimitations={},
 d=>d.evidence[0].extra.aviation.facet='unknown',d=>d.evidence[0].extra.aviation.state='verified-attack',d=>d.evidence[0].extra.aviation.eventId='ruh-2026-10-08',
 d=>d.evidence[0].valueOrigin='observed',d=>d.evidence[0].sourceOrganizationId='invented-independent-source',d=>d.evidence[0].extra.aviation.snapshotId='absent',
 d=>d.evidence[2].extra.aviation.fields.killed=-1,d=>d.evidence[2].extra.aviation.fields.injured='309',d=>d.evidence[2].extra.aviation.fields.injuredQualifier='verified',
 d=>d.evidence[13].extra.aviation.fields.flights={},d=>d.evidence[13].extra.aviation.fields.flights[0].date=null,
 d=>d.evidence[10].extra.aviation.state='official-closure',d=>d.products=[{approved:true}],d=>d.assessments=[{extra:{approved:true}}],d=>d.history={},d=>d.lastOperational={state:'normal'},
])reject(mut);
// Second H3 review: unquantified reports cannot acquire counts, and threats
// cannot enter the physical-attack facet even through a valid-looking import.
for(const mut of [
 d=>{const f=d.evidence.find(r=>r.id==='casualties-10-initial').extra.aviation.fields;f.killed=13;f.killedQualifier='exact-reported';},
 d=>{const f=d.evidence.find(r=>r.id==='casualties-10-initial').extra.aviation.fields;f.injured=11;f.injuredQualifier='exact-reported';},
 d=>d.evidence.find(r=>r.id==='casualties-10-initial').extra.aviation.state='reported-count',
 d=>d.evidence.find(r=>r.id==='casualties-10-followup').extra.aviation.fields.killedQualifier='unknown',
 d=>d.evidence.find(r=>r.id==='casualties-10-followup').extra.aviation.fields.injuredQualifier='unknown',
 d=>d.evidence.find(r=>r.id==='casualties-10-followup').extra.aviation.fields.killed=null,
 d=>{d.evidence=d.evidence.filter(r=>r.id==='threat-houthi');Object.assign(d.evidence[0].extra.aviation,{facet:'attack',state:'threat-only'});},
])reject(mut);
// Independent H3 reproductions: refuse malformed input without throwing or
// introducing a different identity, chronology or confidence in human views.
for(const mut of [
 d=>d.evidence[0].geometry={type:'Point',coordinates:{}},
 d=>d.evidence[0].id={spoof:1},d=>d.evidence[0].id='',
 d=>d.events[0].eventDate='2026-99-99',d=>d.events[0].eventDate='2026-02-30',
 d=>d.events[1].id=d.events[0].id,
 d=>d.evidence[0].reportedAt='2027-01-01T00:00:00Z',
 d=>d.evidence[0].observedAt='2027-01-01T00:00:00Z',
 d=>d.evidence[0].retrievedAt='2027-01-01T00:00:00Z',
 d=>d.evidence[0].reportedAt='2026-02-30T00:00:00Z',
 d=>d.evidence[0].reportedAt='2026-10-09T00:00:00Z',
 d=>d.evidence[0].extra.aviation.confidence={level:'certain',source:'confirmed',rationale:'Physical event verified'},
 d=>d.evidence[0].extra.aviation.confidence.level='certain',
 d=>d.evidence[0].extra.aviation.confidence.source='confirmed',
 d=>d.evidence[0].extra.analyticalConfidence={level:'high',rationale:'Physical event verified'},
 d=>{d.id='case:other';d.events=[{id:'elsewhere',eventDate:'2020-01-01',period:'unknown'}];d.evidence.forEach(r=>r.extra.aviation.eventId='elsewhere');},
 d=>d.evidence[13].extra.aviation.fields.flights[0].date='2026-02-30',
 d=>d.sources[0].clocks.retrievalWindow.end='2027-01-01T00:00:00Z',
 d=>d.sources=d.sources.filter(s=>s.id!=='reuters-initial'),
])reject(mut);
const op=structuredClone(c);const partial=structuredClone(op.evidence.find(r=>r.id==='ops-canada'));partial.id='synthetic-conflicting-operations';partial.extra.aviation.state='reported-partial';partial.summary='TEST ONLY conflicting partial operations report';op.evidence.push(partial);
const conflicting=inspectAviationIncident(op);assert.equal(conflicting.ok,true);assert.equal(conflicting.operationalConflict,true);assert.equal(conflicting.airportCurrentState,'unknown');
const threat=structuredClone(c);threat.evidence=threat.evidence.filter(r=>r.id==='threat-houthi');const tr=inspectAviationIncident(threat);assert.equal(tr.facets.attack.length,0);assert.equal(tr.airportCurrentState,'unknown');assert.equal(tr.officialAirspaceClosure,'unknown');
const threatUi=renderInvestigationWorkbench({open:true,caseObject:threat,tab:'assessment'});
assert.ok(threatUi.includes('Physical attack reports · unknown'));assert.equal(threatUi.includes('Physical attack reports · 1'),false);
const partialCount=structuredClone(c);const f=partialCount.evidence.find(r=>r.id==='casualties-10-followup').extra.aviation.fields;f.injured=null;f.injuredQualifier='unknown';assert.equal(validateAviationCase(partialCount).ok,true);
const suspension=structuredClone(c);suspension.evidence=suspension.evidence.filter(r=>r.id==='klm-suspension');assert.equal(inspectAviationIncident(suspension).facets.airportOperations.length,0);
const none=structuredClone(c);none.evidence=[];assert.equal(inspectAviationIncident(none).facets.flightDisruption.length,0);assert.equal(inspectAviationIncident(none).casualtyTotals,null);
const mirrors=structuredClone(c);mirrors.evidence=mirrors.evidence.filter(r=>r.sourceOrganizationId==='reuters');assert.equal(inspectAviationIncident(mirrors).corroboration.independentPublisherOrigins,1);
const sourceLoss=structuredClone(c);sourceLoss.evidence=sourceLoss.evidence.filter(r=>r.sourceOrganizationId!=='reuters');assert.equal(inspectAviationIncident(sourceLoss).facets.attack.length,0);assert.equal(inspectAviationIncident(sourceLoss).facets.casualties.some(r=>r.fields.killed===13),false);
const withdrawn=structuredClone(c);withdrawn.evidence=withdrawn.evidence.filter(r=>!['casualties-10-revised','flights-etihad-later'].includes(r.id));
assert.equal(parseCaseFile(JSON.stringify({case:withdrawn})).ok,true);
const changes=renderInvestigationWorkbench({open:true,caseObject:withdrawn,tab:'changes'});
assert.equal(changes.includes('13 killed'),false);assert.equal(changes.includes('etihad-later'),false);assert.equal(changes.includes('EY555'),false);
assert.ok(changes.includes('etihad-early'));assert.ok(changes.includes('12 killed'));
const unavailable=structuredClone(c);unavailable.sources[0].access='unavailable';
assert.equal(inspectAviationIncident(unavailable).facets.attack.some(r=>r.evidenceId==='attack-10'),true);
assert.ok(renderInvestigationWorkbench({open:true,caseObject:unavailable,tab:'changes'}).includes('unavailable'));
const ui=renderInvestigationWorkbench({open:true,caseObject:c,chokepoint:{id:'strait-of-hormuz'},tab:'assessment'});
for(const label of ['Casualties by event','Airport operations','Economic effects','review_required','Shared inspection receipt','No casualty total'])assert.ok(ui.includes(label),label);
assert.equal(ui.includes('data-investigate-review'),false);assert.equal(ui.includes('data-dimension='),false);assert.equal(ui.includes('SYNTHETIC SCENARIO'),false);
console.log(JSON.stringify({pass:true,negativeImports:n,positiveChecks:'event/revision isolation, source clocks, conflicts, syndication, threat/suspension non-promotion, missing telemetry/economics, read-only parity/recovery, human review boundaries'}));
