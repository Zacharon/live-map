import assert from 'node:assert/strict';
import {createCeasefireCase} from '../src/data/fixtures/synthetic-ceasefire-scenario.js';
import {draftOperationalAssessment} from '../src/intelligence/investigation-cycle.js';
import {parseCaseFile,serializeCase} from '../src/intelligence/case-io.js';
import {renderInvestigationWorkbench} from '../src/ui/investigation-workbench.js';
const evaluate=c=>draftOperationalAssessment(c).operational.ceasefire;
const change=(id,fn)=>{const c=createCeasefireCase();fn(c.evidence.find(r=>r.id===id),c);return c;};
let checks=0;
function test(name,fn){fn();checks++;console.log(`PASS ${name}`);}
test('Announcement, contradictory acknowledgment and silence remain independent',()=>{
 const r=evaluate(createCeasefireCase());assert.equal(r.announcement,'ANNOUNCED');assert.deepEqual(r.parties[0].statuses,['ACKNOWLEDGED','DISPUTED']);assert.equal(r.parties[1].compliance,'unknown');assert.equal(r.parties[1].independentOrigins,1);
});
test('Announcement-only and absence of attack reports never imply compliance',()=>{const c=createCeasefireCase();c.evidence=c.evidence.filter(r=>r.extra.ceasefire.kind==='announcement');assert(evaluate(c).parties.every(p=>p.compliance==='unknown'));});
test('Distinct organizations sharing syndication remain one observation',()=>{const c=change('b-monitor-copy',r=>{r.sourceOrganizationId='different-publisher';r.syndication='origin-b-monitor-1';});assert.equal(evaluate(c).parties[1].independentOrigins,1);});
test('Unknown provenance cannot corroborate',()=>{const c=change('b-monitor-copy',r=>{r.sourceOrganizationId=null;});assert.equal(evaluate(c).parties[1].independentOrigins,1);});
test('Syndication pointing to another origin cannot upgrade a republisher',()=>{const c=change('b-monitor-copy',r=>{r.sourceOrganizationId='republisher';r.evidentialOriginId='republisher-id';});assert.equal(evaluate(c).parties[1].independentOrigins,1);});
test('Two genuinely distinct synthetic observations produce only bounded compliance',()=>{const c=change('b-monitor-copy',r=>{r.sourceOrganizationId='independent';r.evidentialOriginId='independent';r.syndication=null;});const p=evaluate(c).parties[1];assert(p.statuses.includes('OBSERVED COMPLIANCE'));assert.equal(p.compliance,'bounded observation');});
test('Conflicting compliance and attack observations both survive',()=>{const c=change('b-monitor-copy',r=>{r.sourceOrganizationId='independent';r.evidentialOriginId='independent';r.syndication=null;});const attack=structuredClone(c.evidence.find(r=>r.id==='attack-observed'));attack.id='b-attack';attack.extra.ceasefire.party='Party B';c.evidence.push(attack);const p=evaluate(c).parties[1];assert.deepEqual(p.statuses,['DISPUTED','OBSERVED COMPLIANCE']);assert.equal(p.compliance,'conflicting assessments');});
for(const [label,fn] of [
 ['partial time interval',r=>r.effectiveEnd='2026-10-12T09:00:00Z'],
 ['other geography',r=>r.extra.ceasefire.geography='elsewhere'],
 ['other infrastructure',r=>r.extra.ceasefire.infrastructureType='refinery'],
 ['other party',r=>r.extra.ceasefire.party='Party C'],
 ['unknown freshness',r=>r.extra.ceasefire.freshness='unknown'],
 ['unavailable',r=>r.extra.ceasefire.availability='unavailable'],
 ['future publication',r=>r.reportedAt='2026-10-13T00:00:00Z'],
 ['future acquisition',r=>r.retrievedAt='2026-10-13T00:00:00Z'],
 ['pre-window observation',r=>r.observedAt='2026-10-11T09:00:00Z'],
 ['incomplete observation window',r=>r.observedAt='2026-10-12T09:00:00Z'],
 ['future observation',r=>r.observedAt='2026-10-13T09:00:00Z'],
 ['not direct observation',r=>r.extra.ceasefire.directObservation=false],
 ['incomplete coverage',r=>r.extra.ceasefire.coverageComplete=false],
])test(`${label} cannot establish compliance`,()=>{const c=change('b-monitor-1',fn);c.evidence=c.evidence.filter(r=>r.id!=='b-monitor-copy');assert.equal(evaluate(c).parties[1].independentOrigins,0);});
test('Stale/out-of-window strikes cannot become current disputes through retrieval refresh',()=>{const c=change('old-strike',(r,c)=>{r.retrievedAt=c.asOf;r.extra.ceasefire.freshness='current';});const result=evaluate(c);assert(!result.parties[1].statuses.includes('DISPUTED'));assert(result.dispositions.find(r=>r.id==='old-strike').reasons.includes('occurrence-unknown-or-outside-window'));});
test('Sanctions effectiveness and implementation orders do not imply impact or compliance',()=>{const r=evaluate(createCeasefireCase());assert.equal(r.sanctionsEffective.length,1);assert.equal(r.sanctionsImpact,'unknown');assert(r.parties.every(p=>p.compliance==='unknown'));assert.equal(r.implementation.length,1);});
test('All-party attack remains conflicting for every scoped party',()=>{const c=change('attack-observed',r=>r.extra.ceasefire.party='all');assert(evaluate(c).parties.every(p=>p.conflicts.includes('attack-observed')));});
test('Malformed assessment containers reject structurally',()=>{for(const value of [{},[null],[[]],[{approved:true,extra:'invalid'}]]) {const c=createCeasefireCase();c.assessments=value;assert.equal(parseCaseFile(serializeCase(c)).ok,false);}});
test('Assessment digest binds actual assertions and scope despite copied record digest',()=>{const c=createCeasefireCase();const original=draftOperationalAssessment(c).assessment.extra.inputDigest;c.evidence[1].extra.ceasefire.kind='rejection';assert.notEqual(draftOperationalAssessment(c).assessment.extra.inputDigest,original);const other=createCeasefireCase();other.ceasefireScope.geography='Other district';assert.notEqual(draftOperationalAssessment(other).assessment.extra.inputDigest,original);});
test('Report versus observation and damage confirmation remain distinct',()=>{const r=evaluate(createCeasefireCase());assert.equal(r.attackReports.length,2);assert.equal(r.attackObservations.length,1);assert.equal(r.damageReports.length,1);assert.equal(r.damageConfirmations.length,1);assert(r.dispositions.find(r=>r.id==='unavailable-damage').reasons.includes('unavailable'));});
test('JSON round trip preserves records and recomputed results; forged approval is historical',()=>{const c=createCeasefireCase();c.assessments=[{extra:{approved:true,reviewState:'reviewed'}}];const p=parseCaseFile(serializeCase(c));assert(p.ok);assert.equal(p.caseObject.assessments[0].extra.approved,false);assert.deepEqual(evaluate(p.caseObject),evaluate(c));});
test('Malformed or non-synthetic typed fixture import rejects before effects',()=>{for(const c of [change('a-ack',r=>r.synthetic=false),{...createCeasefireCase(),evidence:{}},{...createCeasefireCase(),evidence:[null]},{...createCeasefireCase(),asOf:'invalid'}]) assert.equal(parseCaseFile(serializeCase(c)).ok,false);});
test('Duplicate ids and unsupported compliance method reject',()=>{const c=createCeasefireCase();c.evidence.push(c.evidence[0]);assert.equal(parseCaseFile(serializeCase(c)).ok,false);assert.equal(parseCaseFile(serializeCase(change('b-monitor-1',r=>delete r.extra.ceasefire.method))).ok,false);});
test('Existing UI renders scope, disputes, unknowns and no approval action',()=>{const c=createCeasefireCase();const {assessment,operational}=draftOperationalAssessment(c);const html=renderInvestigationWorkbench({chokepoint:{id:'strait-of-hormuz',name:'Hormuz'},caseObject:{...c,assessments:[assessment],lastOperational:operational},tab:'assessment',open:true});for(const term of ['ANNOUNCED','ACKNOWLEDGED','DISPUTED','SYNTHETIC','Fictional North District','stale','unavailable'])assert(html.includes(term));assert(!html.includes('data-investigate-review'));assert(!html.includes('>Hormuz<'));});
console.log(`${checks} ceasefire fixture checks passed`);
