import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCaseFile, serializeCase } from '../src/intelligence/case-io.js';
import { validateEvidenceRecord } from '../src/intelligence/evidence-records.js';
import { inspectCargoProvenance, PROVENANCE_LAYERS } from '../src/intelligence/maritime-cargo-provenance.js';

const bytes = readFileSync(new URL('../data/development-fixtures/maritime-cargo-provenance-20261016.json', import.meta.url), 'utf8');
const parsed = parseCaseFile(bytes);
assert.equal(parsed.ok, true, JSON.stringify(parsed.errors));
const original = parsed.caseObject;
assert.equal(original.live, false);
assert.equal(original.providerPolling, false);
assert.deepEqual(original.provenanceLayers, PROVENANCE_LAYERS);
for (const record of [...original.evidence, ...original.claims, ...original.relationships]) {
  assert.equal(validateEvidenceRecord(record).valid, true, record.id);
  assert.equal(record.lat, null);
  assert.equal(record.lon, null);
  assert.equal(record.geometry, null);
  assert.equal(record.value, null);
  assert.equal(record.synthetic, false);
}
assert.deepEqual(original.evidence.filter((record) => record.extra.vessel).map((record) => [record.extra.vessel.reportedIdentity, record.extra.vessel.imo, record.extra.vessel.mmsi]), [
  ['UNKNOWN', null, null],
  ['APOLLO OCEAN', '9423322', null],
  ['TARAWA', '9225342', null],
  ['UNKNOWN', null, null],
]);

const result = inspectCargoProvenance(original);
assert.equal(result.ok, true, JSON.stringify(result.errors));
assert.equal(result.live, false);
assert.equal(result.providerPolling, 'not-run');
assert.equal(result.geography, 'unknown');
assert.equal(result.physicalObservationCount, 0);
assert.equal(result.observedTransferCount, 0);
assert.deepEqual(result.evasion, { class: 'assessment', established: false, state: 'not-established', independentlyEnforced: false });
assert.equal(result.cargoOriginEstablished, false);
assert.equal(result.aisIdentityCaveat, 'reported-unresolved');
assert.equal(result.marketContextProvesCargo, false);
assert.equal(result.receipt.effect, 'none');
assert.equal(result.conclusions.find((item) => item.type === 'SANCTIONS EVASION ASSESSMENT').class, 'assessment');
assert.equal(result.conclusions.find((item) => item.type === 'CARGO ORIGIN INFERRED').class, 'inferred');
assert.equal(JSON.stringify(result).includes('"established":true'), false);
assert.equal(JSON.stringify(result).includes('confirmed'), false);
const snapshot = JSON.stringify(original);
inspectCargoProvenance(original);
assert.equal(JSON.stringify(original), snapshot);
assert.deepEqual(inspectCargoProvenance(parseCaseFile(serializeCase(original)).caseObject).conclusions, result.conclusions);

function rejected(name, mutate) {
  const changed = structuredClone(original);
  mutate(changed);
  const checked = parseCaseFile(serializeCase(changed));
  assert.equal(checked.ok, false, name);
}
const evasion = (changed) => changed.claims.find((claim) => claim.extra.conclusionType === 'SANCTIONS EVASION ASSESSMENT');
const jet = (changed) => changed.evidence.find((record) => record.id === 'vessel-jet-fuel');

rejected('evasion assessment cannot become established', (value) => { evasion(value).extra.established = true; });
rejected('evasion assessment cannot become an observation', (value) => { evasion(value).valueOrigin = 'observed'; });
rejected('evasion assessment cannot be reclassed as confirmed', (value) => { evasion(value).extra.assertionClass = 'confirmed'; evasion(value).extra.epistemicStatus = 'observed'; });
rejected('imported assessment cannot approve the case', (value) => { value.assessments = [{ extra: { approved: true } }]; });
rejected('fixture cannot be labeled live', (value) => { value.live = true; });
rejected('source cannot be labeled live', (value) => { value.sources[0].availability = 'live'; });
rejected('provider polling cannot be turned on', (value) => { value.providerPolling = true; });
rejected('no fabricated coordinates', (value) => { value.evidence[0].lat = 24.6; value.evidence[0].lon = 58.4; });
rejected('no nested fabricated coordinates', (value) => { value.evidence[1].extra.reportedLocation = { coordinates: [58.4, 24.6] }; });
rejected('no fabricated track', (value) => { value.evidence[1].extra.track = [[58, 24], [104, 1]]; });
rejected('no fabricated geometry', (value) => { value.evidence[3].geometry = { type: 'Point', coordinates: [96.1, 16.8] }; });
rejected('no invented IMO', (value) => { jet(value).extra.vessel.imo = '9263382'; });
rejected('no invented vessel name', (value) => { jet(value).extra.vessel.reportedIdentity = 'REEF'; jet(value).extra.vessel.imo = '9263382'; });
rejected('reported quantity cannot become a measurement', (value) => { value.evidence.find((record) => record.id === 'cargo-lpg-cohort').value = 4100000; });
rejected('cargo report cannot become throughput', (value) => { const cargo = value.evidence.find((record) => record.id === 'cargo-lpg-cohort'); cargo.evidenceKind = 'throughput-measurement'; cargo.value = 4100000; });
rejected('market context cannot cause a cargo conclusion', (value) => { value.relationships.push({ ...value.relationships[0], id: 'rel-price-causes-cargo', extra: { ...value.relationships[0].extra, edgeType: 'affects', fromId: 'market-brent-wti', toId: 'cargo-lpg-cohort' } }); });
rejected('market context cannot support the evasion assessment', (value) => { evasion(value).parentEvidenceIds.push('market-brent-wti'); });
rejected('AIS caveat cannot be removed', (value) => { value.evidence = value.evidence.filter((record) => record.id !== 'caveat-ais-false-identity'); });
rejected('credibility cannot be promoted', (value) => { evasion(value).extra.credibility.code = '1'; });
rejected('source reliability cannot be promoted', (value) => { value.sourceEvaluations[0].code = 'A'; });
rejected('corroboration cannot be promoted', (value) => { value.independentCorroboration = 'confirmed'; });
rejected('brief claim cannot be marked observed', (value) => { value.factChecks[0].verdict = 'observed'; });
rejected('observed transfer layer must stay empty', (value) => { value.evidence[0].extra.provenanceLayer = 'observed-transfer'; value.evidence[0].valueOrigin = 'observed'; });
rejected('physical observation layer must stay empty', (value) => { value.evidence[1].extra.provenanceLayer = 'physical-observation'; });

const lost = structuredClone(original);
lost.sources.find((source) => source.id === 'reuters-lpg').availability = 'unavailable';
assert.equal(parseCaseFile(serializeCase(lost)).ok, true);
const lostResult = inspectCargoProvenance(lost);
assert.equal(lostResult.ok, true);
assert.equal(lostResult.aisIdentityCaveat, 'unknown');
assert.deepEqual(lostResult.evasion, result.evasion);
assert.equal(lostResult.physicalObservationCount, 0);

console.log('maritime-cargo-provenance-tests: layers held, evasion stayed an assessment, live and geography mutations rejected');
