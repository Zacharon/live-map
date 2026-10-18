import { fnv1aHex } from './content-digest.js';
import { validateEvidenceRecord } from './evidence-records.js';

/** Read-only inspection of one historical cargo-provenance fixture.
 * Reporting, inference, and assessment stay distinct. This module does not
 * poll vessels, invent positions, or promote a sanctions-evasion assessment
 * into an established fact.
 */
export const CARGO_FIXTURE_ID = 'maritime-cargo-provenance-20261016';
export const CARGO_FIXTURE_TYPE = 'maritime-cargo-provenance-v1';
export const CARGO_CAPABILITY = 'maritime-cargo-provenance.inspect/v1';
export const CARGO_CAVEAT_ID = 'caveat-ais-false-identity';

export const PROVENANCE_LAYERS = [
  'vessel-identity',
  'physical-observation',
  'reported-cargo-identity',
  'inferred-cargo-origin',
  'observed-transfer',
  'reported-transfer',
  'reported-destination',
  'sanctions-status',
  'authorization-claim',
  'enforcement-action',
  'analytical-conclusion',
  'identity-caveat',
  'market-context',
];

export const CONCLUSION_TYPES = [
  'VESSEL IDENTITY REPORTED',
  'CARGO IDENTITY REPORTED',
  'CARGO ORIGIN INFERRED',
  'TRANSFER NOT OBSERVED',
  'DESTINATION REPORTED',
  'SANCTIONS STATUS REPORTED',
  'AUTHORIZATION NOT ESTABLISHED',
  'ENFORCEMENT NOT ESTABLISHED',
  'SANCTIONS EVASION ASSESSMENT',
];

const EMPTY_LAYERS = new Set(['physical-observation', 'observed-transfer']);
const FIELD_STATUSES = new Set(['reported', 'inferred', 'unknown', 'assessment']);
const FACT_VERDICTS = new Set(['reported', 'unverified', 'narrower-than-brief', 'not-found-in-primary']);
const SOURCED_IMO = new Map([
  ['APOLLO OCEAN', '9423322'],
  ['TARAWA', '9225342'],
]);
const RECORD_KEYS = ['evidence', 'claims', 'relationships', 'sources', 'sourceEvaluations', 'assessments', 'products', 'collections', 'feedback', 'parked', 'history'];
const ALLOWED_EDGES = new Set(['collected_with', 'possible_association', 'derived_from']);

const text = (value) => typeof value === 'string' && value.trim().length > 0;
const strings = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string');

export function isCargoProvenanceCase(caseObject) {
  return caseObject?.fixtureId === CARGO_FIXTURE_ID || caseObject?.fixtureType === CARGO_FIXTURE_TYPE;
}

function hasGeography(record) {
  if (!record || typeof record !== 'object') return false;
  if (record.lat != null || record.lon != null || record.geometry != null) return true;
  const extra = record.extra;
  if (!extra || typeof extra !== 'object') return false;
  if (extra.track != null || extra.legalBoundary != null || extra.position != null) return true;
  if (extra.reportedLocation?.coordinates != null) return true;
  return false;
}

function pushFieldErrors(record, errors) {
  const fields = record.extra?.fields;
  if (!Array.isArray(fields) || fields.length === 0 || fields.some((field) => !field || typeof field !== 'object' || Array.isArray(field))) {
    errors.push(`${record.id}: each field needs a source and an epistemic status`);
    return;
  }
  for (const field of fields) {
    if (!text(field.name) || !FIELD_STATUSES.has(field.status)) {
      errors.push(`${record.id}: field status must be reported, inferred, unknown, or assessment`);
      continue;
    }
    if (field.status === 'observed') errors.push(`${record.id}: ${field.name} cannot be observed by this fixture`);
    if (field.status === 'unknown' && field.value != null) errors.push(`${record.id}: unknown ${field.name} must stay null`);
    if ((field.status === 'reported' || field.status === 'inferred') && !text(field.sourceId)) {
      errors.push(`${record.id}: ${field.name} requires a source`);
    }
    if (field.status === 'assessment' && record.extra?.conclusionType !== 'SANCTIONS EVASION ASSESSMENT') {
      errors.push(`${record.id}: only the evasion assessment may use assessment status`);
    }
  }
}

function validateVessel(record, errors) {
  const vessel = record.extra?.vessel;
  if (!vessel) return;
  const name = vessel.reportedIdentity;
  if (name !== 'UNKNOWN' && !SOURCED_IMO.has(name)) errors.push(`${record.id}: unsourced vessel identity`);
  if (vessel.mmsi != null) errors.push(`${record.id}: current MMSI is unknown`);
  if (name === 'UNKNOWN') {
    if (vessel.imo != null) errors.push(`${record.id}: UNKNOWN identity cannot carry an IMO`);
    return;
  }
  if (vessel.imo !== SOURCED_IMO.get(name)) errors.push(`${record.id}: IMO does not match the sourced identity`);
}

export function validateCargoProvenance(caseObject) {
  const errors = [];
  if (!isCargoProvenanceCase(caseObject)) return { ok: false, errors: ['not a maritime cargo provenance case'] };
  if (caseObject.fixtureId !== CARGO_FIXTURE_ID || caseObject.fixtureType !== CARGO_FIXTURE_TYPE) errors.push('fixture identity mismatch');
  if (caseObject.live !== false || caseObject.providerPolling !== false) errors.push('fixture cannot be labeled live or polled');
  if (caseObject.acquisition !== 'historical-reporting' || caseObject.independentlyObserved !== false || caseObject.independentCorroboration !== 'unknown') {
    errors.push('reporting is not an app observation');
  }
  if (!Array.isArray(caseObject.provenanceLayers) || caseObject.provenanceLayers.join('|') !== PROVENANCE_LAYERS.join('|')) {
    errors.push('provenance layers must stay declared, including the empty observed layers');
  }
  for (const key of RECORD_KEYS) {
    if (!Array.isArray(caseObject[key]) || caseObject[key].some((item) => !item || typeof item !== 'object' || Array.isArray(item))) {
      errors.push(`${key}: typed record array required`);
    }
  }
  if (errors.length) return { ok: false, errors };
  if (caseObject.lastOperational) errors.push('fixture cannot import an operating status');
  if (caseObject.assessments.length || caseObject.products.length) errors.push('an assessment or product cannot be imported as approved');
  if (caseObject.sourceEvaluations.some((item) => item.code !== 'F')) errors.push('source reliability has not been independently judged');
  if (!caseObject.factChecks?.length || caseObject.factChecks.some((item) => !FACT_VERDICTS.has(item?.verdict))) {
    errors.push('brief claims must stay reported, unverified, narrower, or not found in a primary source');
  }
  for (const item of caseObject.parked) {
    if (!item.record || typeof item.record !== 'object' || Array.isArray(item.record) || !text(item.reason)) errors.push('parked: record object and reason required');
    else if (hasGeography(item.record)) errors.push('parked record cannot add geography');
  }
  const marketIds = new Set(caseObject.evidence.filter((record) => record.extra?.provenanceLayer === 'market-context').map((record) => record.id));
  const records = [...caseObject.evidence, ...caseObject.claims, ...caseObject.relationships];
  if (!caseObject.evidence.some((record) => record.id === CARGO_CAVEAT_ID && record.extra?.provenanceLayer === 'identity-caveat')) {
    errors.push('AIS spoofing and false-identity caveat is required');
  }
  for (const record of records) {
    let shapeOk = false;
    try { shapeOk = validateEvidenceRecord(record).valid; } catch { shapeOk = false; }
    if (!shapeOk) errors.push(`${record.id}: evidence shape invalid`);
    if (!PROVENANCE_LAYERS.includes(record.extra?.provenanceLayer)) errors.push(`${record.id}: unknown provenance layer`);
    if (EMPTY_LAYERS.has(record.extra?.provenanceLayer)) errors.push(`${record.id}: observed layer must stay empty`);
    if (hasGeography(record)) errors.push(`${record.id}: geography is unknown and must not be fabricated`);
    if (record.value != null || record.unit != null || record.evidenceKind === 'throughput-measurement' || record.evidenceKind === 'maritime-aggregate') {
      errors.push(`${record.id}: a reported quantity is not a measurement`);
    }
    if (record.valueOrigin === 'observed' || record.valueOrigin === 'synthetic' || record.valueOrigin === 'modeled' || record.synthetic !== false) {
      errors.push(`${record.id}: reporting cannot become an observation`);
    }
    if (record.observedAt != null || record.effectiveStart != null || record.effectiveEnd != null || record.reportedAt != null || record.geometryPrecision !== 'unknown' || record.chokepointId != null) {
      errors.push(`${record.id}: exact time, geometry, and chokepoint binding are unknown`);
    }
    if (record.extra?.established !== false || record.extra?.independentCorroboration !== 'unknown' || record.extra?.analyticalConfidence?.level !== 'unknown') {
      errors.push(`${record.id}: confidence and corroboration are unjudged`);
    }
    if (!text(record.extra?.attributedTo)) errors.push(`${record.id}: attribution required`);
    if (!strings(record.parentEvidenceIds) || !strings(record.qualityLimitations)) errors.push(`${record.id}: parent ids and limitations must be string arrays`);
    if (record.parentEvidenceIds?.some((id) => marketIds.has(id))) errors.push(`${record.id}: market context cannot support a cargo conclusion`);
    pushFieldErrors(record, errors);
    validateVessel(record, errors);
  }
  for (const claim of caseObject.claims) {
    if (claim.extra?.credibility?.code !== '6') errors.push(`${claim.id}: credibility has not been independently judged`);
    if (claim.extra?.epistemicStatus === 'observed') errors.push(`${claim.id}: a conclusion cannot be restated as observed`);
  }
  for (const type of CONCLUSION_TYPES) {
    const matching = caseObject.claims.filter((claim) => claim.extra?.conclusionType === type);
    if (matching.length !== 1) {
      errors.push(`${type}: one distinct conclusion required`);
      continue;
    }
    const claim = matching[0];
    if (claim.extra?.provenanceLayer !== 'analytical-conclusion' || claim.extra?.established !== false) {
      errors.push(`${type}: conclusion cannot become an established fact`);
    }
    if (type === 'SANCTIONS EVASION ASSESSMENT') {
      if (claim.valueOrigin !== 'inferred' || claim.extra?.assertionClass !== 'assessment' || claim.extra?.epistemicStatus !== 'assessment') {
        errors.push('SANCTIONS EVASION ASSESSMENT must stay an assessment');
      }
    } else if (type === 'CARGO ORIGIN INFERRED') {
      if (claim.valueOrigin !== 'inferred' || claim.extra?.assertionClass === 'assessment') errors.push('CARGO ORIGIN INFERRED must stay an inference');
    } else if (claim.valueOrigin !== 'reported' || claim.extra?.assertionClass !== 'reported') {
      errors.push(`${type}: reported conclusion cannot be upgraded`);
    }
  }
  if (caseObject.claims.length !== CONCLUSION_TYPES.length) errors.push('unexpected additional cargo conclusions');
  for (const edge of caseObject.relationships) {
    if (!ALLOWED_EDGES.has(edge.extra?.edgeType) || edge.valueOrigin === 'observed' || edge.extra?.assertionClass === 'observed') {
      errors.push(`${edge.id}: linkage cannot become an observed or causal fact`);
    }
    if (marketIds.has(edge.extra?.fromId) || marketIds.has(edge.extra?.toId)) errors.push(`${edge.id}: market context stays unlinked from cargo`);
  }
  for (const source of caseObject.sources) {
    if (source.availability === 'live' || source.status === 'live' || source.implementationStatus === 'live') errors.push(`${source.id}: source cannot be labeled live`);
    if (source.availability !== 'read-public-report' && source.availability !== 'read-official-notice' && source.availability !== 'unavailable') {
      errors.push(`${source.id}: unsupported source availability`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function inspectCargoProvenance(caseObject) {
  const checked = validateCargoProvenance(caseObject);
  if (!checked.ok) return { ok: false, errors: checked.errors };
  const evidence = caseObject.evidence;
  const claims = caseObject.claims;
  const sources = caseObject.sources;
  const records = [...evidence, ...claims, ...caseObject.relationships];
  const layers = Object.fromEntries(PROVENANCE_LAYERS.map((layer) => [layer, records.filter((record) => record.extra.provenanceLayer === layer).map((record) => record.id)]));
  const caveat = evidence.find((record) => record.id === CARGO_CAVEAT_ID);
  const caveatSource = sources.find((source) => source.id === caveat.sourceId);
  const caveatReadable = Boolean(caveatSource) && caveatSource.availability !== 'unavailable' && caveat.extra?.sourceUnavailable !== true;
  const conclusions = CONCLUSION_TYPES.map((type) => {
    const claim = claims.find((record) => record.extra.conclusionType === type);
    const assessment = type === 'SANCTIONS EVASION ASSESSMENT';
    return {
      type,
      class: assessment ? 'assessment' : claim.valueOrigin,
      established: false,
      state: assessment ? 'not-established' : claim.valueOrigin === 'inferred' ? 'attributed-inference' : 'reported-only',
      attributedTo: claim.extra.attributedTo,
      evidenceIds: claim.parentEvidenceIds.slice(),
    };
  });
  const identities = evidence.filter((record) => record.extra.vessel).map((record) => ({
    recordId: record.id,
    reportedIdentity: record.extra.vessel.reportedIdentity,
    imo: record.extra.vessel.imo ?? null,
    mmsi: null,
    position: null,
  }));
  const inputFingerprint = `fnv1a:${fnv1aHex(JSON.stringify({ evidence, claims, relationships: caseObject.relationships, sources }))}`;
  return {
    ok: true,
    capability: CARGO_CAPABILITY,
    caseId: caseObject.id,
    live: false,
    providerPolling: 'not-run',
    acquisition: 'historical-reporting',
    geography: 'unknown',
    physicalObservationCount: layers['physical-observation'].length,
    observedTransferCount: layers['observed-transfer'].length,
    identities,
    layers,
    conclusions,
    evasion: { class: 'assessment', established: false, state: 'not-established', independentlyEnforced: false },
    cargoOriginEstablished: false,
    aisIdentityCaveat: caveatReadable ? 'reported-unresolved' : 'unknown',
    marketContextProvesCargo: false,
    receipt: {
      capability: CARGO_CAPABILITY,
      operation: 'inspect',
      targetCaseId: caseObject.id,
      inputFingerprint,
      effect: 'none',
      actor: 'unauthenticated-local-reader',
      authority: 'read-only; no approval privileges',
      beforeRevision: null,
      afterRevision: null,
      outcome: 'inspected',
    },
  };
}
