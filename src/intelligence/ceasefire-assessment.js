import { createAssessmentRecord } from './evidence-records.js';
import { contentDigest, inputManifest, manifestDigest } from './content-digest.js';
import { sourceIndependence } from './source-independence.js';

export const CEASEFIRE_CASE = 'ceasefire-v1';
const KINDS = new Set(['announcement', 'acknowledgment', 'rejection', 'silence', 'attack-report', 'attack-observation', 'damage-report', 'damage-confirmation', 'sanctions-announcement', 'sanctions-effective', 'implementation', 'compliance-observation']);
const time = value => typeof value === 'string' && value ? Date.parse(value) : NaN;
function originCount(records) {
  let groups=[];
  for(const r of records){
    const matches=groups.filter(g=>g.some(other=>other.evidentialOriginId===r.evidentialOriginId || other.evidentialOriginId===r.syndication || other.syndication===r.evidentialOriginId || !sourceIndependence({...other,url:other.sourceUrl},{...r,url:r.sourceUrl}).independent));
    groups=groups.filter(g=>!matches.includes(g));
    groups.push([r,...matches.flat()]);
  }
  return groups.length;
}

export function validateCeasefireCase(c) {
  const errors = [];
  const s = c?.ceasefireScope || {};
  if (!Array.isArray(s.parties) || !s.parties.length || s.parties.some(p => typeof p !== 'string' || !p.trim())) errors.push('Scope requires named parties');
  if (typeof s.geography !== 'string' || !s.geography.trim() || typeof s.infrastructureType !== 'string' || !s.infrastructureType.trim()) errors.push('Scope requires geography and infrastructure type');
  if (![s.start, s.end, c.asOf].every(x => Number.isFinite(time(x))) || time(s.start) >= time(s.end) || time(s.end) > time(c.asOf)) errors.push('Scope requires start < end <= asOf');
  if (!Array.isArray(c.evidence) || c.evidence.length > 200) errors.push('Evidence must be an array of at most 200 records');
  for (const key of ['assessments','products','claims','collections','feedback','relationships','parked','history']) {
    if (c[key] != null && (!Array.isArray(c[key]) || c[key].some(x=>!x || typeof x!=='object' || Array.isArray(x)))) errors.push(`${key} must be an array of records`);
  }
  for (const key of ['assessments','products']) for (const record of Array.isArray(c[key]) ? c[key] : []) {
    if (record?.extra != null && (typeof record.extra !== 'object' || Array.isArray(record.extra))) errors.push(`${key} extra must be an object`);
  }
  const ids = new Set();
  for (const r of Array.isArray(c.evidence) ? c.evidence : []) {
    if (!r || typeof r !== 'object') { errors.push('Evidence records must be objects'); continue; }
    if (r.synthetic !== true || r.valueOrigin !== 'synthetic') errors.push('This capability accepts synthetic fixture records only');
    if (!r.id || ids.has(r.id)) errors.push('Evidence IDs must be unique');
    ids.add(r.id);
    const e = r.extra?.ceasefire;
    if (!e || !KINDS.has(e.kind)) errors.push(`Invalid ceasefire record kind: ${r.id}`);
    if (e?.kind === 'compliance-observation' && (!e.method || !e.coverageBasis)) errors.push(`Compliance observation requires method and coverage basis: ${r.id}`);
  }
  return errors;
}

export function draftCeasefireAssessment(c) {
  const errors = validateCeasefireCase(c);
  if (errors.length) throw new Error(errors.join('; '));
  const s = c.ceasefireScope;
  const cutoff = time(c.asOf);
  const rows = c.evidence.map(r => {
    const e = r.extra.ceasefire;
    const reasons = [];
    if (!r.sourceOrganizationId || !r.sourceUrl || !r.evidentialOriginId) reasons.push('unknown-provenance');
    if (!Number.isFinite(time(r.reportedAt)) || time(r.reportedAt) > cutoff) reasons.push('publication-unknown-or-after-cutoff');
    if (!Number.isFinite(time(r.retrievedAt)) || time(r.retrievedAt) > cutoff) reasons.push('unavailable-at-cutoff');
    if (e.availability !== 'available') reasons.push(e.availability || 'availability-unknown');
    if (e.freshness !== 'current') reasons.push(e.freshness || 'freshness-unknown');
    if (e.geography !== s.geography || e.infrastructureType !== s.infrastructureType) reasons.push('outside-geography-or-infrastructure');
    if (e.party !== 'all' && !s.parties.includes(e.party)) reasons.push('outside-party-scope');
    // Occurrence governs attacks/damage; a recent publication cannot revive an old strike.
    const occurrenceKinds = ['attack-report', 'attack-observation', 'damage-report', 'damage-confirmation'];
    if (occurrenceKinds.includes(e.kind) && (!Number.isFinite(time(r.observedAt)) || time(r.observedAt) < time(s.start) || time(r.observedAt) > time(s.end))) reasons.push('occurrence-unknown-or-outside-window');
    if (['compliance-observation', 'implementation', 'sanctions-effective'].includes(e.kind) &&
        (!Number.isFinite(time(r.effectiveStart)) || !Number.isFinite(time(r.effectiveEnd)) || time(r.effectiveStart) > time(s.start) || time(r.effectiveEnd) < time(s.end))) reasons.push('insufficient-interval-coverage');
    if (e.kind === 'compliance-observation' && (!Number.isFinite(time(r.observedAt)) || time(r.observedAt) < time(s.end) || time(r.observedAt) > cutoff)) reasons.push('observation-does-not-complete-window-or-after-cutoff');
    return { id: r.id, kind: e.kind, party: e.party, usable: reasons.length === 0, reasons, record: r };
  });
  const usable = rows.filter(r => r.usable);
  const kind = k => usable.filter(r => r.kind === k);
  const parties = s.parties.map(party => {
    const scoped = usable.filter(r => r.party === party);
    const ids = k => scoped.filter(r => r.kind === k).map(r => r.id);
    const acknowledgments = ids('acknowledgment'), rejections = ids('rejection');
    const observations = scoped.filter(r => r.kind === 'compliance-observation' && r.record.extra.ceasefire.directObservation === true && r.record.extra.ceasefire.coverageComplete === true && r.record.extra.ceasefire.finding === 'compliant');
    const conflicts = usable.filter(r => (r.party === party || r.party === 'all') && (['attack-report', 'attack-observation'].includes(r.kind) || (r.kind === 'compliance-observation' && r.record.extra.ceasefire.finding === 'noncompliant')));
    // Two attributed independent observations are an explicit conservative fixture rule,
    // not empirical certification. Silence and sanctions never enter this candidate set.
    const origins = originCount(observations.map(r => r.record));
    const statuses = [];
    if (acknowledgments.length) statuses.push('ACKNOWLEDGED');
    if (rejections.length || conflicts.length) statuses.push('DISPUTED');
    if (origins >= 2) statuses.push('OBSERVED COMPLIANCE');
    return { party, statuses: statuses.length ? statuses : ['UNKNOWN'], acknowledgments, rejections,
      silence: ids('silence'), observations: observations.map(r => r.id), independentOrigins: origins,
      conflicts: conflicts.map(r => r.id), compliance: origins >= 2 ? (conflicts.length ? 'conflicting assessments' : 'bounded observation') : 'unknown' };
  });
  const result = { method:'ceasefire-assessment/v1', scope:s, asOf:c.asOf,
    announcement:kind('announcement').length ? 'ANNOUNCED' : 'UNKNOWN', parties,
    attackReports:kind('attack-report').map(r => r.id), attackObservations:kind('attack-observation').map(r => r.id),
    damageReports:kind('damage-report').map(r => r.id), damageConfirmations:kind('damage-confirmation').map(r => r.id),
    sanctionsAnnouncements:kind('sanctions-announcement').map(r => r.id), sanctionsEffective:kind('sanctions-effective').map(r => r.id),
    implementation:kind('implementation').map(r => r.id), sanctionsImpact:'unknown',
    dispositions:rows.map(({record,...row}) => row),
    note:'Independent attributed dimensions. Absence of reports is not compliance. Sanctions adoption/effectiveness is not observed impact. No global ceasefire verdict.' };
  // The inherited digest excludes extra; bind the typed assertion explicitly and
  // recompute instead of trusting a digest imported with edited fixture records.
  const manifest = inputManifest(c.evidence.map(r=>({...r,contentDigest:contentDigest({...r,contentDigest:null,ceasefireAssertion:r.extra.ceasefire})})));
  const assessment = createAssessmentRecord({ id:`assessment:${c.id}:${c.asOf}`, title:'Ceasefire claim verification — SYNTHETIC',
    subjectDomain:'conflict-security', summary:result.note, synthetic:true, valueOrigin:'synthetic', result,
    inputIds:c.evidence.map(r => r.id), evaluationTime:c.asOf,
    extra:{reviewState:'review_required',approved:false,currentApplicability:'bounded-historical-fixture',knowledgeCutoff:c.asOf,
      inputManifest:manifest,inputDigest:manifestDigest({manifest,scope:s,asOf:c.asOf}),audience:'local-analyst',gaps:['Synthetic fixture only; no current real-world claim.'],
      contradictions:parties.flatMap(p => p.conflicts.map(id => ({id,contradictsId:`compliance:${p.party}`})))} },new Date(c.asOf));
  return {assessment,operational:{ceasefire:result,operationalStatus:'unknown',dimensions:{}}};
}
