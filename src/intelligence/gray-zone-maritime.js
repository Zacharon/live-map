import { fnv1aHex } from './content-digest.js';

/** Read-only historical-report inspection, inside the existing case workflow.
 * Proximity is evidence of co-occurrence, never a mission/coordination verdict.
 * Unknown coordinates and a withheld day must survive import without invention.
 */
export const GRAY_ZONE_FIXTURE_ID = 'gray-zone-maritime-taiwan-2026-08';
export const GRAY_ZONE_CAPABILITY = 'gray-zone-maritime.inspect/v1';
export const CONCLUSION_TYPES = ['VESSEL OBSERVED', 'COORDINATION INFERRED', 'BLOCKADE PREPARATION CLAIMED'];

export function isGrayZoneMaritime(caseObject) {
  return caseObject?.fixtureId === GRAY_ZONE_FIXTURE_ID || caseObject?.fixtureType === 'gray-zone-maritime-report-v1';
}

export function validateGrayZoneMaritime(caseObject) {
  if (!isGrayZoneMaritime(caseObject)) return { valid: true, errors: [] };
  const errors = [];
  for (const key of ['evidence', 'claims', 'relationships', 'sources', 'sourceEvaluations', 'assessments', 'products', 'collections', 'feedback', 'parked', 'history']) {
    if (!Array.isArray(caseObject[key]) || caseObject[key].some(item => !item || typeof item !== 'object' || Array.isArray(item))) errors.push(`${key}: typed record array required`);
  }
  if (errors.length) return { valid: false, errors };
  for (const item of caseObject.parked) {
    if (!item.record || typeof item.record !== 'object' || Array.isArray(item.record) || typeof item.reason !== 'string') errors.push('parked: record object and reason required');
  }
  if (caseObject.sourceEvaluations.some(item => item.code !== 'F')) errors.push('source reliability has not been independently judged');
  if (caseObject.fixtureId !== GRAY_ZONE_FIXTURE_ID || caseObject.fixtureType !== 'gray-zone-maritime-report-v1') errors.push('unknown maritime fixture identity');
  if (caseObject.acquisition !== 'historical-reporting' || caseObject.independentlyObserved !== false || caseObject.independentCorroboration !== 'unknown') errors.push('reporting is not app observation or independent corroboration');
  const evidence = caseObject.evidence || [];
  const claims = caseObject.claims || [];
  if (caseObject.lastOperational || (caseObject.assessments || []).length || (caseObject.products || []).length) errors.push('reporting fixture cannot import an operating assessment or approved product');
  for (const record of [...evidence, ...claims, ...(caseObject.relationships || [])]) {
    // Validate fields used by both inspection and rendering before an imported
    // case can replace the working session. Truthy objects are not record lists.
    for (const key of ['parentEvidenceIds', 'qualityLimitations']) {
      if (!Array.isArray(record[key]) || record[key].some(item => typeof item !== 'string')) errors.push(`${record.id}: ${key} must be a string array`);
    }
    if (record.extra?.associatedVessels != null && (!Array.isArray(record.extra.associatedVessels) || record.extra.associatedVessels.some(item => typeof item !== 'string'))) errors.push(`${record.id}: associatedVessels must be a string array`);
    if (record.lat != null || record.lon != null || record.geometry != null || record.extra?.track != null) errors.push(`${record.id}: unsupported geography/track`);
    if (record.extra?.reportedLocation?.coordinates != null || record.extra?.legalBoundary != null) errors.push(`${record.id}: unsupported precise location/legal boundary`);
    if (record.observedAt != null || record.effectiveStart != null || record.effectiveEnd != null || record.reportedAt != null || record.geometryPrecision !== 'unknown') errors.push(`${record.id}: exact occurrence/geometry and publication time are unknown`);
    if (record.synthetic !== false || record.extra?.analyticalConfidence?.level !== 'unknown') errors.push(`${record.id}: historical reporting retains unjudged confidence, not synthetic evidence`);
    if (record.extra?.independentCorroboration !== 'unknown') errors.push(`${record.id}: corroboration is unestablished`);
    if (typeof record.extra?.attributedTo !== 'string' || !record.extra.attributedTo.trim()) errors.push(`${record.id}: attribution required`);
    const originCount = record.extra?.independence?.independentOriginCount;
    if (originCount != null && (!Number.isInteger(originCount) || originCount < 0 || originCount > 1)) errors.push(`${record.id}: independent origin count must be an unpromoted integer`);
    if (record.evidenceKind !== 'public-report' || record.value != null || record.extra?.maritimeSignal) errors.push(`${record.id}: reporting cannot become an operational measurement`);
  }
  for (const record of evidence) {
    if (record.valueOrigin !== 'reported' || record.synthetic === true) errors.push(`${record.id}: sighting must retain reported provenance`);
    if (record.extra?.vessel && (!record.extra.vessel.reportedIdentity || !record.extra.vessel.reportedClass)) errors.push(`${record.id}: missing reported vessel identity/class`);
    if (record.extra?.vessel?.mmsi != null || record.extra?.vessel?.imo != null) errors.push(`${record.id}: registry identity unverified`);
  }
  for (const type of CONCLUSION_TYPES) {
    const matching = claims.filter(record => record.extra?.conclusionType === type);
    if (matching.length !== 1) { errors.push(`${type}: one distinct conclusion required`); continue; }
    const record = matching[0];
    const requiredOrigin = type === 'COORDINATION INFERRED' ? 'inferred' : 'reported';
    if (record.valueOrigin !== requiredOrigin || record.extra?.established !== false) errors.push(`${type}: inference/claim cannot become established observation`);
    if (record.extra?.credibility?.code !== '6') errors.push(`${type}: credibility has not been independently judged`);
  }
  if (claims.length !== CONCLUSION_TYPES.length) errors.push('unexpected additional maritime conclusions');
  for (const edge of caseObject.relationships || []) {
    if (!['collected_with', 'possible_association'].includes(edge.extra?.edgeType) || edge.extra?.assertionClass !== 'reported' || edge.valueOrigin !== 'reported') errors.push(`${edge.id}: co-occurrence must remain reported, not coordination/hostile intent`);
  }
  return { valid: errors.length === 0, errors };
}

export function inspectGrayZoneMaritime(caseObject) {
  const checked = validateGrayZoneMaritime(caseObject);
  if (!isGrayZoneMaritime(caseObject) || !checked.valid) return { ok: false, errors: checked.errors.length ? checked.errors : ['not a gray-zone maritime case'] };
  const sources = caseObject.sources || [];
  const evidence = caseObject.evidence || [];
  const available = record => Boolean(record?.sourceUrl) && sources.some(source => source.id === record.sourceId && source.availability === 'read-public-report') && record.extra?.sourceUnavailable !== true;
  const conclusions = CONCLUSION_TYPES.map(type => {
    const claim = caseObject.claims.find(record => record.extra.conclusionType === type);
    const supporting = (claim.parentEvidenceIds || []).map(id => evidence.find(record => record.id === id));
    const hasSupport = supporting.length > 0 && supporting.every(available) && available(claim);
    return { type, state: hasSupport ? type === 'VESSEL OBSERVED' ? 'reported-sighting' : type === 'COORDINATION INFERRED' ? 'attributed-inference' : 'attributed-claim' : 'unknown',
      attributedTo: claim.extra.attributedTo, sourceUrl: claim.sourceUrl || null, evidenceIds: (claim.parentEvidenceIds || []).slice(),
      established: false, independentlyObserved: false, independentCorroboration: 'unknown',
      limitations: claim.qualityLimitations || [], reason: hasSupport ? 'Historical reporting only; not established by this app.' : 'Supporting report or evidence unavailable; historical claim retained for inspection.' };
  });
  // This fingerprint includes attribution/availability in extra, unlike the
  // generic factual digest. It identifies read input; it is not authentication.
  const inputFingerprint = `fnv1a:${fnv1aHex(JSON.stringify({evidence,claims:caseObject.claims,relationships:caseObject.relationships,sources}))}`;
  const receipt = { capability:GRAY_ZONE_CAPABILITY, operation:'inspect', targetCaseId:caseObject.id, inputFingerprint,
    safeInputSummary:{evidenceCount:evidence.length,conclusionCount:conclusions.length,classification:'public-safe historical reporting'},
    actor:'unauthenticated-local-reader',representedUser:null,delegation:'none',authority:'read-only; no approval privileges',
    beforeRevision:null,afterRevision:null,effect:'none',outcome:'inspected',recovery:'repeat inspection of the same immutable input'};
  return { ok: true, capability: GRAY_ZONE_CAPABILITY, caseId: caseObject.id, acquisition: 'historical-reporting', conclusions, receipt,
    currentTracking: 'not-run', mission: 'unknown', hostileIntent: 'unknown', legalBoundary: 'unknown' };
}
