import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { THRESHOLD_POLICY } from "../src/intelligence/threshold-policy.js";
import {
  applyEvidenceMutation,
  applySourceDisposition,
  approvalStillValid,
  createInvestigationCase,
  draftOperationalAssessment,
  independenceSummary,
  reviewAssessment,
} from "../src/intelligence/investigation-cycle.js";
import { parseCaseFile, serializeCase } from "../src/intelligence/case-io.js";
import { projectPublicAssessment, renderPublicMarkdown } from "../src/intelligence/public-projection.js";
import {
  FROZEN_BYTES,
  FROZEN_PORTID,
  FROZEN_PORTNAME,
  FROZEN_RETRIEVED_AT,
  FROZEN_SHA256,
  FROZEN_SOURCE_ID,
  TEST_ONLY_REVIEWER,
  cloneCaseForAutomatedTest,
  createGenuineHormuzCase,
  mapFrozenFeature,
  parseDateOnly,
  validateFrozenPayload,
} from "../src/intelligence/portwatch-frozen-sample.js";
import { syntheticChokepointRecords } from "../src/data/fixtures/synthetic-chokepoint-scenario.js";
import { compareThroughputRecords } from "../src/intelligence/operational-evaluator.js";
import { loadFrozenExtract } from "../scripts/load-frozen-extract.mjs";

const extractPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../data/development-fixtures/portwatch-hormuz-2025-01-extract.json");
const frozenText = readFileSync(extractPath, "utf8");
const frozenSha = createHash("sha256").update(frozenText).digest("hex");
const frozenJson = JSON.parse(frozenText);

assert.equal(frozenSha, FROZEN_SHA256);
assert.equal(Buffer.byteLength(frozenText), FROZEN_BYTES);
assert.equal(frozenJson.error, undefined);
assert.equal(frozenJson.exceededTransferLimit, undefined);

const loaded = loadFrozenExtract();
assert.equal(loaded.ok, true, loaded.errors.join("; "));
assert.equal(loaded.sha256, FROZEN_SHA256);

{
  const parsed = parseDateOnly("2025-01-01");
  assert.equal(parsed.ok, true);
  assert.equal(parsed.calendarDate, "2025-01-01");
  assert.equal(parsed.observedAt, "2025-01-01T00:00:00.000Z");
  assert.equal(parseDateOnly(1735689600000).ok, false);
  assert.match(parseDateOnly(1735689600000).reason, /unix-ms-not-applied/);
}

{
  const dateField = frozenJson.fields.find((field) => field.name === "date");
  assert.equal(dateField.type, "esriFieldTypeDateOnly");
  const first = frozenJson.features[0].attributes;
  assert.equal(first.portid, FROZEN_PORTID);
  assert.equal(first.portname, FROZEN_PORTNAME);
  assert.equal(typeof first.date, "string");
  assert.equal(typeof first.n_total, "number");
}

const validation = validateFrozenPayload(frozenJson);
assert.equal(validation.ok, true, validation.errors.join("; "));
assert.deepEqual(validation.dates, ["2025-01-01", "2025-01-02", "2025-01-03", "2025-01-04", "2025-01-05", "2025-01-06", "2025-01-07"]);

const genuine = createGenuineHormuzCase({ json: frozenJson, sha256: frozenSha, retrievedAt: FROZEN_RETRIEVED_AT });
assert.equal(genuine.genuine, true);
assert.equal(genuine.live, false);
assert.equal(genuine.providerEnabled, false);
assert.equal(genuine.evidence.length, 7);
assert.equal(genuine.collections[0].id, "collection:portwatch-hormuz-2025-01-01-2025-01-07");
assert.equal(genuine.relationships[0].extra.edgeType, "collected_with");
assert.equal(genuine.relationships[0].extra.toId, FROZEN_SOURCE_ID);

{
  const jan1Source = frozenJson.features[0].attributes;
  const jan1 = genuine.evidence.find((item) => item.id === "portwatch:chokepoint6:2025-01-01:n_total");
  assert.ok(jan1);
  assert.equal(jan1.value, jan1Source.n_total);
  assert.equal(jan1.extra.originalFields.n_total, jan1Source.n_total);
  assert.equal(jan1.extra.originalFields.date, jan1Source.date);
  assert.equal(jan1.observedAt, "2025-01-01T00:00:00.000Z");
  assert.equal(jan1.retrievedAt, FROZEN_RETRIEVED_AT);
  assert.notEqual(jan1.observedAt.slice(0, 10), jan1.retrievedAt.slice(0, 10));
  assert.equal(jan1.synthetic, false);
  assert.equal(jan1.extra.live, false);
  assert.equal(jan1.reportedAt, null);
}

{
  const zero = mapFrozenFeature({ portid: FROZEN_PORTID, portname: FROZEN_PORTNAME, date: "2025-01-01", n_total: 0 });
  assert.equal(zero.record.value, 0);
  assert.doesNotMatch(zero.record.title, /\bclosed\b/i);
  assert.match(zero.record.summary, /not unique vessels/);
}

{
  const malformed = validateFrozenPayload({ features: [{ attributes: { portid: "x", portname: "y", date: 1735689600000, n_total: 1 } }] });
  assert.equal(malformed.ok, false);
}

{
  const summary = independenceSummary(genuine.evidence);
  assert.equal(summary.independentOriginCount, 1);
  const mirror = genuine.evidence.map((item) => ({ ...item, id: `${item.id}:mirror`, sourceUrl: item.sourceUrl }));
  assert.equal(independenceSummary([...genuine.evidence, ...mirror]).independentOriginCount, 1);
}

{
  const assessment = genuine.assessments.at(-1);
  assert.equal(assessment.extra.reviewState, "review_required");
  assert.equal(assessment.extra.approved, false);
  assert.equal(assessment.extra.policyVersion, THRESHOLD_POLICY.version);
  assert.equal(assessment.extra.policyId, THRESHOLD_POLICY.id);
  const ops = genuine.lastOperational;
  assert.equal(ops.operationalStatus, "unknown");
  assert.equal(ops.evidenceRank, "reported");
  assert.notEqual(ops.evidenceRank, "confirmed");
  assert.equal(ops.dimensions.throughput.state, "unknown");
  assert.equal(ops.dimensions.diplomacy.state, "unknown");
  assert.equal(ops.dimensions.physicalAccess.state, "unknown");
  assert.equal(ops.dimensions.commercialAccess.state, "unknown");
  assert.match(genuine.claims[0].extra.proposition, /not a claim of current disruption/);
}

{
  const projection = projectPublicAssessment(genuine.assessments.at(-1), genuine, { audience: "local-preview" });
  const markdown = renderPublicMarkdown(projection);
  assert.doesNotMatch(markdown, /\blive provider\b/i);
  assert.match(markdown, /unknown/);
  assert.equal(projection.provenance.acquisition, "historical_public");
  assert.equal(projection.provenance.live, false);
  assert.match(projection.provenance.sourceUrl, /^https:\/\/portwatch\.imf\.org\//);
  assert.deepEqual(projection.provenance.observationPeriod, { start: "2025-01-01", end: "2025-01-07" });
  assert.equal(projection.provenance.publicationDate, null);
  assert.match(projection.provenance.publicationDateNote, /row-level publishedAt/);
  assert.equal(projection.provenance.retrievedAt, FROZEN_RETRIEVED_AT);
  assert.equal(projection.provenance.originalUnit, "n_total:ais-derived-estimated-transit-calls");
  assert.match(projection.provenance.geographicCoverage, /Strait of Hormuz/);
  assert.match(projection.provenance.limitations, /measured throughput/i);
  assert.match(projection.provenance.limitations, /Not unique vessels/);
  assert.match(projection.provenance.reuseTerms, /attribution/i);
  assert.match(markdown, /historical_public/);
  assert.match(markdown, /n_total:ais-derived-estimated-transit-calls/);
  assert.doesNotMatch(markdown, /[A-Za-z]:\\Users\\/);
  const json = serializeCase(genuine);
  assert.doesNotMatch(json, /"reviewState": "reviewed"/);
  assert.equal(json.includes(TEST_ONLY_REVIEWER), false);
  const parsed = parseCaseFile(json);
  assert.equal(parsed.ok, true, parsed.errors.join("; "));
  assert.equal(parsed.caseObject.assessments.at(-1).extra.reviewState === "reviewed", false);
  assert.ok(parsed.caseObject.relationships || genuine.relationships);
}

{
  const testCase = cloneCaseForAutomatedTest(genuine);
  assert.equal(testCase.testOnly, true);
  assert.equal(testCase.genuine, false);
  const reviewed = reviewAssessment(testCase.assessments.at(-1), {
    reviewer: TEST_ONLY_REVIEWER,
    audience: "local-analyst",
    now: new Date(FROZEN_RETRIEVED_AT),
  });
  assert.equal(reviewed.ok, true);
  assert.equal(reviewed.binding.reviewer, TEST_ONLY_REVIEWER);
  testCase.assessments[testCase.assessments.length - 1] = reviewed.assessment;
  assert.equal(approvalStillValid(reviewed.assessment, testCase).valid, true);

  const removed = applyEvidenceMutation(testCase, {
    removeId: "portwatch:chokepoint6:2025-01-07:n_total",
    now: new Date(FROZEN_RETRIEVED_AT),
  });
  assert.equal(removed.invalidated, true);
  assert.equal(removed.assessment.extra.reviewState, "review_required");
  const superseded = removed.caseObject.assessments.find((item) => item.extra.reviewState === "superseded");
  assert.ok(superseded);
  assert.equal(approvalStillValid(superseded, removed.caseObject).valid, false);

  const refresh = applyEvidenceMutation(removed.caseObject, {
    retrievedAtOnly: { id: "portwatch:chokepoint6:2025-01-01:n_total", retrievedAt: "2026-09-16T08:32:00.000Z" },
    now: new Date(FROZEN_RETRIEVED_AT),
  });
  assert.equal(approvalStillValid(superseded, refresh.caseObject).valid, false);

  const exported = serializeCase(refresh.caseObject);
  const reloaded = parseCaseFile(exported);
  assert.equal(reloaded.ok, true, reloaded.errors.join("; "));
  const importedReviewed = reloaded.caseObject.assessments.find((item) => item.extra.importedApproval);
  if (importedReviewed) {
    const reuse = reviewAssessment(importedReviewed, { reviewer: TEST_ONLY_REVIEWER });
    assert.equal(reuse.ok, false);
  }

  const genuineAgain = serializeCase(genuine);
  assert.equal(genuineAgain.includes(TEST_ONLY_REVIEWER), false);
  assert.match(genuineAgain, /review_required/);
}

{
  const testCase = cloneCaseForAutomatedTest(genuine);
  const diplomacy = {
    id: "test-only-diplomacy",
    recordKind: "observation",
    evidenceKind: "diplomatic-statement",
    subjectDomain: "conflict-security",
    title: "TEST-ONLY diplomatic statement",
    chokepointId: "strait-of-hormuz",
    sourceUrl: "https://press.un.org/en/security-council",
    synthetic: true,
    valueOrigin: "synthetic",
  };
  const mixed = applyEvidenceMutation;
  void mixed;
  const { attachEvidence } = await import("../src/intelligence/investigation-cycle.js");
  const attached = attachEvidence(testCase, diplomacy, { now: new Date(FROZEN_RETRIEVED_AT) });
  assert.equal(attached.attached || attached.parked, true);
  assert.equal(genuine.evidence.some((item) => item.id === "test-only-diplomacy"), false);
  assert.equal(genuine.lastOperational.dimensions.diplomacy.state, "unknown");
  assert.equal(attached.attached, true, attached.reason);
  const { operational } = draftOperationalAssessment(attached.caseObject, { now: Date.parse(FROZEN_RETRIEVED_AT), asOf: FROZEN_RETRIEVED_AT });
  assert.equal(operational.dimensions.diplomacy.state, "improving");
  assert.equal(operational.dimensions.throughput.state, "unknown");
  assert.equal(operational.dimensions.physicalAccess.state, "unknown");
  assert.equal(operational.dimensions.commercialAccess.state, "unknown");
  assert.notEqual(operational.operationalStatus, "normal");
  assert.notEqual(operational.dimensions.throughput.state, "disrupted");
}

{
  const proxy = genuine.evidence.find((item) => item.id === "portwatch:chokepoint6:2025-01-01:n_total");
  const baseline = {
    ...proxy,
    id: "test-only-baseline",
    evidenceKind: "baseline-observation",
    value: 100,
    extra: { ...proxy.extra, role: "baseline" },
  };
  const comparison = compareThroughputRecords(proxy, baseline);
  assert.equal(comparison.comparable, false);
  assert.equal(comparison.reason, "vessel-activity-proxy-is-not-measured-throughput");
}

{
  const asOf = "2026-06-12T20:00:00.000Z";
  const now = new Date(asOf);
  const records = syntheticChokepointRecords().filter((record) => (
    record.evidenceKind === "throughput-measurement"
    || record.evidenceKind === "baseline-observation"
    || record.id === "syn-diplomacy-1"
  ));
  const opened = createInvestigationCase({ records, now });
  const drafted = draftOperationalAssessment(opened, { now: now.getTime(), asOf });
  assert.equal(drafted.operational.dimensions.diplomacy.state, "improving");
  assert.equal(drafted.operational.dimensions.throughput.state, "disrupted");
  const reviewed = reviewAssessment(drafted.assessment, { reviewer: TEST_ONLY_REVIEWER, now });
  assert.equal(reviewed.ok, true);
  opened.assessments = [reviewed.assessment];
  opened.lastOperational = drafted.operational;
  for (const disposition of ["aged-out", "invalidated"]) {
    const retired = applySourceDisposition(opened, { sourceId: "imf-portwatch", disposition, now, asOf });
    assert.equal(retired.invalidated, true, disposition);
    assert.equal(retired.operational.dimensions.diplomacy.state, "improving", disposition);
    assert.equal(retired.operational.dimensions.throughput.state, "unknown", disposition);
    assert.equal(retired.assessment.extra.reviewState, "review_required", disposition);
    assert.equal(approvalStillValid(retired.caseObject.assessments.find((item) => item.extra.reviewState === "superseded"), retired.caseObject).valid, false);
    assert.ok(retired.caseObject.evidence.some((item) => item.sourceId === "imf-portwatch" && item.freshnessPolicy === (disposition === "aged-out" ? "source-aged-out" : "source-invalidated")));
    assert.doesNotMatch(retired.operational.dimensions.throughput.reasons.join(" "), /R7=/);
  }
}

console.log("portwatch-hormuz-frozen-sample-tests: ok");
