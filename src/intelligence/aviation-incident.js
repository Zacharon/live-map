/**
 * Read-only aviation view over the existing bounded investigation case.
 * Reports are retained per event and source snapshot. This command never turns
 * warnings, carrier decisions or absent telemetry into airport/airspace closure.
 * It neither approves nor publishes an operational assessment.
 */
import { validateEvidenceRecord, uniqueOriginKeys } from './evidence-records.js';

export const AVIATION_CASE_ID = 'aviation-riyadh-2026-10';
export const AVIATION_CAPABILITY = 'aviation-incident.inspect/v1';
export const AVIATION_FACETS = ['attack','damage','casualties','airportOperations','flightDisruption','airspace','airlineSuspension','economic'];
const STATES = {
  attack:['reported-attack'], damage:['reported-damage','assessment-underway'],
  casualties:['reported-count','unquantified'], airportOperations:['reported-suspended','reported-closed','reported-partial','reported-reopened','unknown'],
  flightDisruption:['listed-cancellations','reported-diversions','unknown'],
  airspace:['threat','avoidance-advisory','official-restriction','official-closure','unknown'],
  airlineSuspension:['voluntary-suspension','unknown'], economic:['reported','observed','calculated','unknown'],
};
const plain = v => v && typeof v === 'object' && !Array.isArray(v);
const strings = v => Array.isArray(v) && v.every(x=>typeof x==='string');
const text = (v,max=180) => typeof v==='string' && v.trim().length>0 && v.length<=max;
const id = v => text(v) && /^[A-Za-z0-9][A-Za-z0-9:_-]*$/.test(v);
const day = v => typeof v==='string' && /^\d{4}-\d\d-\d\d$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,10)===v;
const clock = v => v === null || (typeof v === 'string' && /^\d{4}-\d\d-\d\dT(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(v) && day(v.slice(0,10)) && Number.isFinite(Date.parse(v)));
const sameClock = (a,b) => a===null && b===null || a!==null && b!==null && Date.parse(a)===Date.parse(b);
const SOURCE_CONFIDENCE = 'attributed-public-source; independently unauthenticated here';
function evidenceValid(r) {
  // The inherited generic geometry validator may throw on malformed structures.
  // Imports must refuse before session replacement, including those structures.
  try { return validateEvidenceRecord(r).valid; } catch { return false; }
}
const count = v => v===null || (Number.isSafeInteger(v)&&v>=0);
const https = v => {try {const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
export function isAviationCase(c) { return c?.caseType==='aviation-infrastructure-incident-v1'; }

/** Validate consumed fields before a browser import replaces any session state. */
export function validateAviationCase(c) {
  const errors=[];
  if(!isAviationCase(c))return {ok:false,errors:['Expected aviation case type']};
  if(c.id!==`case:${AVIATION_CASE_ID}`||c.genuine!==true||c.reviewState!=='review_required')errors.push('Case identity/review boundary invalid');
  if(!clock(c.asOf)||c.asOf===null)errors.push('Frozen asOf required');
  if(!plain(c.requirement)||typeof c.requirement.summary!=='string')errors.push('Requirement missing');
  const expectedEvents = new Map([['ruh-2026-10-10','2026-10-10'],['ruh-2026-10-11','2026-10-11']]);
  if(!Array.isArray(c.events)||c.events.length!==2||new Set(c.events.map(e=>e?.id)).size!==2||c.events.some(e=>!plain(e)||!id(e.id)||!day(e.eventDate)||expectedEvents.get(e.id)!==e.eventDate||!text(e.period,4000)||e.airport!=='RUH/OERK'))errors.push('Event scope invalid');
  const events=new Set((Array.isArray(c.events)?c.events:[]).map(e=>e?.id));
  if(!Array.isArray(c.sources)||!c.sources.length||c.sources.length>40)errors.push('Source snapshots required');
  const sources=new Map();
  for(const s of Array.isArray(c.sources)?c.sources:[]) {
    if(!plain(s)||!id(s.id)||sources.has(s.id)||!https(s.url)||!text(s.organization)||!id(s.originGroup)||!text(s.access)||!text(s.attribution,4000)||!plain(s.clocks)||!['publishedAt','updatedAt','retrievedAt'].every(k=>clock(s.clocks[k]))||s.clocks.retrievedAt===null||!text(s.clocks.raw,4000)||!strings(s.limitations)) {errors.push('Source snapshot invalid');continue;}
    sources.set(s.id,s);
    if (['publishedAt','updatedAt','retrievedAt'].some(k=>s.clocks[k]!==null&&Date.parse(s.clocks[k])>Date.parse(c.asOf))) errors.push('Source snapshot is after frozen asOf');
    const window=s.clocks.retrievalWindow;
    if(window!=null&&(!plain(window)||!clock(window.start)||!clock(window.end)||window.start===null||window.end===null||Date.parse(window.start)>Date.parse(window.end)||Date.parse(window.end)>Date.parse(s.clocks.retrievedAt)))errors.push('Source retrieval window invalid');
  }
  if(!Array.isArray(c.evidence)||c.evidence.length>100)errors.push('Evidence list invalid');
  const ids=new Set();
  for(const r of Array.isArray(c.evidence)?c.evidence:[]) {
    const a=r?.extra?.aviation, s=sources.get(a?.snapshotId);
    if(!plain(r)||!id(r.id)||!evidenceValid(r)||ids.has(r.id)||r.subjectDomain!=='aviation'||r.valueOrigin!=='reported'||r.synthetic!==false||!strings(r.qualityLimitations)||!plain(r.coverage)||!strings(r.parentEvidenceIds)||typeof r.summary!=='string'||!plain(a)||!AVIATION_FACETS.includes(a.facet)||!STATES[a.facet]?.includes(a.state)||!events.has(a.eventId)||!s||r.sourceUrl!==s.url||r.sourceOrganizationId!==s.originGroup||!clock(r.reportedAt)||!clock(r.observedAt)||!clock(r.retrievedAt)||r.retrievedAt===null||typeof a.asOfText!=='string'||!plain(a.fields)||!plain(a.confidence)||!['low','medium','high','unknown'].includes(a.confidence.level)||a.confidence.source!==SOURCE_CONFIDENCE||!text(a.confidence.rationale,4000)||r.extra.analyticalConfidence!=null) {errors.push(`Invalid aviation evidence ${typeof r?.id==='string'?r.id:'unknown'}`);continue;}
    ids.add(r.id);
    if(['reportedAt','observedAt','retrievedAt'].some(k=>r[k]!==null&&Date.parse(r[k])>Date.parse(c.asOf)))errors.push('Evidence clock is after frozen asOf');
    if(!sameClock(r.reportedAt,s.clocks.publishedAt)||!sameClock(r.retrievedAt,s.clocks.retrievedAt))errors.push('Evidence clock differs from source snapshot');
    if(a.facet==='casualties') {
      const fields=a.fields;
      const pairsValid=['killed','injured'].every(k=>count(fields[k])&&(fields[k]===null?fields[k+'Qualifier']==='unknown':['exact-reported','at-least','more-than'].includes(fields[k+'Qualifier'])));
      const hasCount=fields.killed!==null||fields.injured!==null;
      if(!pairsValid||a.state==='unquantified'&&hasCount||a.state==='reported-count'&&!hasCount)errors.push('Casualty state/count/qualifiers invalid');
    }
    if(a.facet==='flightDisruption'&&(!Array.isArray(a.fields.flights)||a.fields.flights.some(f=>!plain(f)||!text(f.number)||!day(f.date)||!['cancelled','diverted'].includes(f.status)||!text(f.from)||!text(f.to))))errors.push('Flight rows invalid');
    if(a.facet==='airspace'&&['official-closure','official-restriction'].includes(a.state)&&(!a.fields.noticeId||typeof a.fields.closureOrder!=='string'||!a.fields.closureOrder||s.authority!=='aviation-regulator'))errors.push('Official airspace action requires identified regulator order, not advisory');
    if(a.facet==='economic'&&a.state!=='unknown'&&(!Number.isFinite(a.fields.value)||typeof a.fields.unit!=='string'||typeof a.fields.method!=='string'))errors.push('Economic measurement requires value/unit/method');
  }
  // This capability is inspection only. Imported approvals/products cannot grant
  // authority, and unrelated operational assessments cannot enter its result.
  for(const k of ['claims','assessments','products','parked','feedback','collections','relationships'])if(!Array.isArray(c[k])||c[k].length)errors.push(`${k} must be empty for read-only aviation case`);
  if(!Array.isArray(c.history)||c.history.some(x=>!plain(x)||typeof x.type!=='string'||!clock(x.at)))errors.push('History invalid');
  if(c.lastOperational)errors.push('Aviation case cannot contain chokepoint operating result');
  return {ok:errors.length===0,errors};
}

function fingerprint(value) { let h=2166136261; for(const c of JSON.stringify(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0'); }
export function inspectAviationIncident(c) {
  const checked=validateAviationCase(c);
  if(!checked.ok)return {ok:false,errors:checked.errors};
  const facets=Object.fromEntries(AVIATION_FACETS.map(f=>[f,[]]));
  for(const r of c.evidence){const a=r.extra.aviation,s=c.sources.find(s=>s.id===a.snapshotId);facets[a.facet].push({evidenceId:r.id,...a,summary:r.summary,source:s,reportedAt:r.reportedAt,retrievedAt:r.retrievedAt,coverage:r.coverage,limitations:r.qualityLimitations,freshness:'frozen-snapshot; current status unestablished'});}
  const operations=facets.airportOperations.map(r=>r.state);
  return {ok:true,caseId:c.id,asOf:c.asOf,reviewState:'review_required',facets,
    casualtyTotals:null,airportCurrentState:'unknown',officialAirspaceClosure:facets.airspace.some(r=>r.state==='official-closure')?'reported-notice':'unknown',
    flightCoverage:'Named carrier sectors only; no airport-wide denominator or flight telemetry; diversions unknown',
    operationalReportStates:[...new Set(operations)],operationalConflict:operations.includes('reported-closed')&&operations.some(s=>['reported-partial','reported-reopened'].includes(s)),
    corroboration:{independentPublisherOrigins:uniqueOriginKeys(c.evidence).length,independentAttackObservations:null,note:'Publisher count is not independent observation. Shared GACA/coalition statements and Reuters syndication do not corroborate themselves.'},
    completeness:{unknownFacets:AVIATION_FACETS.filter(f=>!facets[f].length),note:'No complete closure/reopening sequence, all-carrier traffic, audited damage or economic-loss measurement.'},
    receipt:{operation:AVIATION_CAPABILITY,actor:'anonymous-local-reader',representedUser:null,delegation:null,target:c.id,inputFingerprint:fingerprint({id:c.id,asOf:c.asOf,events:c.events,sources:c.sources,evidence:c.evidence}),beforeRevision:null,afterRevision:null,outcome:'inspected',effect:'none',recovery:'Repeat same frozen input; rejected import preserves prior session. Fingerprint is not authentication or cryptographic approval.'}};
}
