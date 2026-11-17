import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { multiSiteIncidentFixture as fixture } from "./fixtures/st-petersburg-20261018.mjs";
import { validateMultiSiteIncidentFixture as validate } from "./helpers/multi-site-incident-evaluation.mjs";

export function runMultiSiteIncidentEvaluationTests() {
  assert.deepEqual(validate(fixture), { valid: true, errors: [] });
  let rejected = 0;
  const rejects = (mutate, expected) => {
    const candidate = structuredClone(fixture);
    mutate(candidate);
    const result = validate(candidate);
    assert.equal(result.valid, false);
    assert.match(result.errors.join("; "), expected);
    rejected++;
  };
  rejects(c => { c.live = true; c.mode = "live"; }, /never live/);
  rejects(c => { c.label = "Live incident"; }, /frozen label/);
  rejects(c => { c.nonSiteRecords[2].evidence.evidenceKind = "observation"; c.nonSiteRecords[2].evidence.verification = "independently-established"; }, /cannot become observation/);
  rejects(c => { c.nonSiteRecords[2].launchTotal = 1015; }, /not launches or damage/);
  rejects(c => { c.nonSiteRecords[2].physicalDamage = 1015; }, /not launches or damage/);
  rejects(c => { c.nonSiteRecords[2].unit = "drones-launched"; }, /not launches or damage/);
  for (let i = 0; i < 4; i++) {
    rejects(c => { c.sites[i].operationalStatus.value = "closed"; }, /operations unknown/);
    rejects(c => { c.sites[i].physicalDamageObserved = structuredClone(c.sites[0].physicalDamageClaimed); }, /not observed damage/);
    rejects(c => { c.sites[i].casualties.value = { killed: 1, injured: 5 }; }, /cannot be allocated/);
  }
  rejects(c => { c.sites[3].operationalStatus = structuredClone(c.sites[3].commercialServiceEffects); }, /operations unknown/);
  for (const key of ["severity", "confidence", "impact", "corroboration"]) {
    rejects(c => { delete c.sites[0].dimensions[key]; c.sites[0].dimensions.score = 90; }, /dimensions must remain separate/);
  }
  rejects(c => { c.sites[0].dimensions.corroboration = 2; }, /dimensions must remain separate/);
  rejects(c => { c.sites[0].reportedAttack.publisher = "Independent imagery"; }, /provenance mismatch/);
  rejects(c => { c.sites[0].geography.geometry = { type: "Point", coordinates: [30, 60] }; }, /no sourced geometry/);
  rejects(c => { c.sites[0].restorationUpdates.push("restored"); }, /restoration not sourced/);
  rejects(c => { c.nonSiteRecords[5].mutuallyConfirmedTerms = "agreed"; }, /terms unconfirmed/);
  assert.deepEqual(fixture.sites.map(site => site.casualties.value), [null, null, null, null]);
  assert.notEqual(fixture.nonSiteRecords[0].evidence.scope, fixture.nonSiteRecords[1].evidence.scope);
  assert.equal(fixture.sources.reuters.organization, fixture.sources.reutersRegional.organization);
  assert.equal(fixture.sites[3].commercialServiceEffects.value, "normal-service-claimed");
  assert.equal(fixture.sites[3].physicalDamageClaimed.value, null);
  console.log(`Multi-site frozen evaluation passed: valid fixture and ${rejected} rejected unsafe mutations.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runMultiSiteIncidentEvaluationTests();
