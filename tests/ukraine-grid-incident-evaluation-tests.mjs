import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { ukraineGridIncidentFixture as fixture } from "./fixtures/ukraine-grid-20261020.mjs";
import { queryGridIncidentFixture, validateMultiSiteIncidentFixture } from "./helpers/multi-site-incident-evaluation.mjs";

export function runUkraineGridIncidentEvaluationTests() {
  assert.deepEqual(validateMultiSiteIncidentFixture(fixture), { valid: true, errors: [] });
  const answer = queryGridIncidentFixture(fixture);
  assert.deepEqual(Object.keys(answer), ["newlyReportedWesternRegions", "odesa", "energyAttackHalt"]);
  assert.deepEqual(Object.keys(answer.odesa), ["reportedFacilityCount", "customersAffected", "specificAsset", "physicalDamage", "outageStart", "restorationUpdate", "source", "observationTime"]);
  assert.deepEqual(answer.newlyReportedWesternRegions, ["Zhytomyr", "Lviv", "Rivne", "Ternopil", "Khmelnytskyi"]);
  assert.equal(answer.odesa.reportedFacilityCount, 3);
  assert.deepEqual(answer.odesa.customersAffected, { count: 32700, unit: "families", temporalScope: "point-in-time-at-report", permanence: "not-established", incidentAllocation: "not-established" });
  assert.equal(answer.odesa.observationTime.exact, null);
  assert.equal(answer.odesa.observationTime.reportedAsOfDate, "2026-10-20");
  assert.equal(answer.odesa.outageStart, null);
  assert.equal(answer.odesa.restorationUpdate, null);
  assert.equal(answer.odesa.specificAsset, null);
  assert.equal(answer.odesa.physicalDamage, null);
  assert.equal(answer.energyAttackHalt.cessationVerified, false);
  assert.equal(answer.energyAttackHalt.announcer, "Donald Trump");
  assert.equal(answer.energyAttackHalt.announcementDate, null);
  assert.equal(fixture.nonSiteRecords[0].evidence.eventDate, "2026-10-18");
  assert.equal(fixture.sites[6].customersAffected.evidenceKind, "claim");
  assert.deepEqual(Object.keys(fixture.sites[6].dimensions), ["severity", "confidence", "impact", "corroboration", "freshness", "completeness"]);
  let rejected = 0;
  const rejects = (mutate, message) => {
    const changed = structuredClone(fixture);
    mutate(changed);
    const result = validateMultiSiteIncidentFixture(changed);
    assert.equal(result.valid, false);
    assert.match(result.errors.join("; "), message);
    assert.throws(() => queryGridIncidentFixture(changed));
    rejected++;
  };
  rejects(c => { c.sites[0].reportedTargetRegion.value.name = "Unknown"; }, /regional expansion|unsupported value/);
  rejects(c => { c.sites[6].customersAffected.value.temporalScope = "permanent"; }, /unsupported value/);
  rejects(c => { c.sites[6].customersAffected.value.permanence = "permanent"; }, /unsupported value/);
  rejects(c => { c.sites[6].customersAffected.value.count = 32700 * 3; }, /unsupported value/);
  rejects(c => { c.sites[6].specificAsset.value = "Odesa substation A"; }, /unsupported value/);
  rejects(c => { c.sites[6].physicalDamage.value = "confirmed"; }, /unsupported value/);
  rejects(c => { c.sites[6].outageStart.value = "2026-10-20T00:00:00Z"; }, /unsupported value/);
  rejects(c => { c.sites[6].restorationUpdate.value = "restored"; }, /unsupported value/);
  rejects(c => { c.sites[6].observationTime.exact = "2026-10-20T11:50:00Z"; }, /observation clock/);
  rejects(c => { c.nonSiteRecords[0].cessationVerified = true; }, /not verified cessation/);
  rejects(c => { c.sites[6].geography.geometry = { type: "Point", coordinates: [30, 46] }; }, /precise site/);
  rejects(c => { c.sources.reuters.organization = "independent-second-source"; }, /source snapshot/);
  // Independent adversarial paths found in H3 round 1: extra keys must fail closed.
  rejects(c => { c.sites[6].permanentOutage = true; }, /unexpected or missing keys/);
  rejects(c => { c.nonSiteRecords[0].ceasefire = "verified"; }, /unexpected or missing keys/);
  rejects(c => { c.sites[6].geography.coordinates = [30.7, 46.4]; }, /unexpected or missing keys/);
  rejects(c => { c.sites[6].geography.label = "Odesa TPP-2, Ukraine"; }, /precise site/);
  rejects(c => { c.label = "Live grid feed"; }, /frozen label/);
  rejects(c => { c.corroboration = 2; }, /unexpected or missing keys/);
  rejects(c => { c.sources.ap = {}; }, /unexpected or missing keys/);
  rejects(c => { c.sources.reuters.snapshotFacts[3] = "Ceasefire verified"; }, /source snapshot/);
  rejects(c => { c.sites[6].customersAffected.claimant = "independent observer"; }, /attribution/);
  rejects(c => { c.nonSiteRecords[0].evidence.evidenceKind = "observation"; }, /provenance/);
  rejects(c => { c.sources.reuters.updatedAt = "2026-10-20T12:00:00Z"; }, /source snapshot/);
  rejects(c => { c.sites[0].reportedExpansion.claimant = "Reuters"; }, /attribution/);
  rejects(c => { c.sites[6].reportedTargetRegion.value.toJSON = () => ({ name: "Odesa", area: "southern" }); c.sites[6].reportedTargetRegion.value.preciseAsset = "Odesa TPP-2"; }, /unexpected or missing keys|unsupported value/);
  console.log(`Ukraine grid multi-site evaluation passed: 7 regional reports, 32,700 families at report time, ${rejected} rejected unsafe mutations.`);
  console.log(JSON.stringify(answer));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runUkraineGridIncidentEvaluationTests();
