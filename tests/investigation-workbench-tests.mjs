import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { SYNTHETIC_CHOKEPOINT_ID, syntheticChokepointRecords } from "../src/data/fixtures/synthetic-chokepoint-scenario.js";
import { chokepointById } from "../src/data/strategic-chokepoints.js";
import { createEvidenceRecord, RECORD_KINDS, EDGE_TYPES } from "../src/intelligence/evidence-records.js";
import { contentDigest } from "../src/intelligence/content-digest.js";
import {
  attachEvidence,
  applyEvidenceMutation,
  approvalStillValid,
  chokepointOperatingWatch,
  createInvestigationCase,
  createClaim,
  draftOperationalAssessment,
  groupEvidentialOrigins,
  independenceSummary,
  officialNoticeClaim,
  reviewAssessment,
  SYNTHETIC_NOW,
} from "../src/intelligence/investigation-cycle.js";
import {
  defaultSourceEvaluation,
  reliabilityFromCategory,
  UNKNOWN_CREDIBILITY,
  UNKNOWN_RELIABILITY,
} from "../src/intelligence/evaluation-vocabulary.js";
import { importUpstreamFlags, resourceCatalog, supportingResourcesForWatch } from "../src/intelligence/resource-catalog.js";
import { parseCaseFile, serializeCase, validateCasePayload } from "../src/intelligence/case-io.js";
import { assertProjectionSafe, projectPublicAssessment, renderPublicMarkdown } from "../src/intelligence/public-projection.js";
import { renderInvestigationWorkbench } from "../src/ui/investigation-workbench.js";
import { renderChokepointDetail } from "../src/ui/chokepoints.js";

{
  assert.ok(RECORD_KINDS.includes("requirement"));
  assert.ok(EDGE_TYPES.includes("collected_with"));
  assert.ok(EDGE_TYPES.includes("possible_association"));
}

const hormuz = chokepointById(SYNTHETIC_CHOKEPOINT_ID);
const caseObject = createInvestigationCase({ chokepointId: SYNTHETIC_CHOKEPOINT_ID, now: new Date(SYNTHETIC_NOW) });

{
  assert.equal(caseObject.requirement.extra.standing, true);
  assert.match(caseObject.requirement.extra.question, /operating conditions/i);
  const earthquake = createEvidenceRecord({
    id: "park-me-quake",
    recordKind: "observation",
    evidenceKind: "public-report",
    subjectDomain: "natural-disaster",
    title: "Unrelated earthquake",
    chokepointId: "suez-canal",
    sourceUrl: "https://example.com/quake",
  });
  const parked = attachEvidence(caseObject, earthquake, { now: new Date(SYNTHETIC_NOW) });
  assert.equal(parked.parked, true);
  assert.equal(parked.attached, false);
  assert.ok(parked.caseObject.parked.some((item) => item.record.id === "park-me-quake"));
  assert.equal(parked.caseObject.evidence.some((item) => item.id === "park-me-quake"), false);
}

{
  const imported = importUpstreamFlags({ live: true, api: true, t: true, d: true });
  assert.equal(imported.upstreamStatus, "live");
  assert.equal(imported.upstreamApi, true);
  assert.equal(imported.implementationStatus, "link-only");
  assert.equal(imported.automationEnabled, false);
  const catalog = resourceCatalog();
  assert.ok(catalog.length <= 20);
  assert.ok(catalog.length >= 10);
  const framework = catalog.find((item) => item.id === "osint-framework-directory");
  assert.equal(framework.upstreamStatus, "live");
  assert.equal(framework.automationEnabled, false);
  assert.equal(framework.implementationStatus, "link-only");
  const portwatch = catalog.find((item) => item.id === "imf-portwatch");
  assert.equal(portwatch.automationEnabled, false);
  assert.notEqual(portwatch.implementationStatus, "live");
}

{
  const records = syntheticChokepointRecords().filter((item) => item.id === "syn-diplomacy-1" || item.id === "syn-diplomacy-1-mirror");
  const groups = groupEvidentialOrigins(records);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].count, 2);
  const summary = independenceSummary(records);
  assert.equal(summary.acquisitionCount, 2);
  assert.equal(summary.independentOriginCount, 1);
}

{
  const filing = createEvidenceRecord({
    id: "sec-filing",
    title: "Same filing",
    canonicalUrl: "https://www.sec.gov/Archives/edgar/data/1/a.htm",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1/a.htm",
    sourceOrganizationId: "sec",
  });
  const collectors = ["c1", "c2", "c3"].map((id) => createEvidenceRecord({
    ...filing,
    id,
    sourceOrganizationId: "sec",
    canonicalUrl: filing.canonicalUrl,
    sourceUrl: filing.sourceUrl,
  }));
  const summary = independenceSummary(collectors);
  assert.equal(summary.independentOriginCount, 1);
  assert.equal(summary.acquisitionCount, 3);
}

{
  const claim = createClaim({
    proposition: "Traffic recovered",
    supporting: [],
    llmAgreement: true,
    credibilityCode: "1",
  });
  assert.match(claim.extra.credibility.rationale, /LLM agreement is not an evidential origin/);
  const unknown = defaultSourceEvaluation({});
  assert.equal(unknown.code, UNKNOWN_RELIABILITY);
  assert.equal(unknown.unknown, true);
  const auto = reliabilityFromCategory("official");
  assert.equal(auto.code, "F");
  assert.equal(auto.autoAssigned, false);
}

{
  const restriction = caseObject.evidence.find((item) => item.evidenceKind === "official-notice" || item.recordKind === "restriction-geometry");
  const notice = officialNoticeClaim(restriction, new Date(SYNTHETIC_NOW));
  assert.equal(notice.extra.officialNoticeDisplay, true);
  assert.equal(notice.extra.credibility.code, UNKNOWN_CREDIBILITY);
  assert.match(notice.extra.credibility.rationale, /does not confirm measured zero throughput/);
}

{
  const digestA = contentDigest({ id: "x", title: "same", retrievedAt: "2026-06-01T00:00:00.000Z" });
  const digestB = contentDigest({ id: "x", title: "same", retrievedAt: "2026-06-26T00:00:00.000Z" });
  assert.equal(digestA, digestB);
  const digestC = contentDigest({ id: "x", title: "changed", retrievedAt: "2026-06-01T00:00:00.000Z" });
  assert.notEqual(digestA, digestC);
}

{
  const ops = caseObject.lastOperational;
  assert.ok(ops);
  assert.notEqual(ops.dimensions.diplomacy.state, ops.dimensions.throughput.state);
  assert.equal(typeof ops.confidence, "number");
  assert.equal(ops.score, null);
}

{
  const reviewed = reviewAssessment(caseObject.assessments.at(-1), { now: new Date(SYNTHETIC_NOW) });
  assert.equal(reviewed.ok, true);
  caseObject.assessments[caseObject.assessments.length - 1] = reviewed.assessment;
  assert.equal(approvalStillValid(reviewed.assessment, caseObject).valid, true);

  const refresh = applyEvidenceMutation(caseObject, {
    retrievedAtOnly: { id: caseObject.evidence[0].id, retrievedAt: "2026-06-26T11:59:00.000Z" },
    now: new Date(SYNTHETIC_NOW),
  });
  assert.equal(refresh.invalidated, false);

  const removed = applyEvidenceMutation(refresh.caseObject, { removeId: "syn-t-06-12", now: new Date(SYNTHETIC_NOW) });
  assert.equal(removed.invalidated, true);
  assert.equal(removed.assessment.extra.reviewState, "review_required");
  const superseded = removed.caseObject.assessments.find((item) => item.extra.reviewState === "superseded");
  assert.ok(superseded);
  assert.equal(approvalStillValid(superseded, removed.caseObject).valid, false);
}

{
  const empty = createInvestigationCase({
    chokepointId: SYNTHETIC_CHOKEPOINT_ID,
    records: [],
    now: new Date(SYNTHETIC_NOW),
  });
  assert.equal(empty.lastOperational.operationalStatus, "unknown");
}

{
  const html = renderInvestigationWorkbench({
    chokepoint: hormuz,
    caseObject,
    open: true,
    tab: "assessment",
  });
  assert.match(html, /Investigate/);
  assert.doesNotMatch(html, /8\.7 \/ 10|HIGH RISK/i);
  const detail = renderChokepointDetail(hormuz, [caseObject.lastOperational], new Map(), null, caseObject.evidence, html);
  assert.match(detail, /data-investigate-tab/);
}

{
  const projection = projectPublicAssessment(caseObject.assessments.at(-1), caseObject, { audience: "public-map" });
  const safety = assertProjectionSafe(projection);
  assert.equal(safety.ok, true);
  assert.doesNotMatch(JSON.stringify(projection), /C:\\\\Users/);
  const markdown = renderPublicMarkdown(projection);
  assert.match(markdown, /not a composite risk score/);
}

{
  const json = serializeCase(caseObject);
  const parsed = parseCaseFile(json);
  assert.equal(parsed.ok, true);
  const importedApproved = JSON.parse(json);
  importedApproved.case.assessments[0].extra.approved = true;
  importedApproved.case.assessments[0].extra.reviewState = "reviewed";
  const neutralized = parseCaseFile(JSON.stringify(importedApproved));
  assert.equal(neutralized.caseObject.assessments[0].extra.importedApproval, true);
  const cannot = reviewAssessment(neutralized.caseObject.assessments[0]);
  assert.equal(cannot.ok, false);

  const proto = validateCasePayload(JSON.stringify({ kind: "live-map-investigation-case", ["__proto__"]: { polluted: true } }));
  assert.equal(proto.ok, false);
  const huge = validateCasePayload(`{"kind":"live-map-investigation-case","notes":"${"x".repeat(5000)}"}`);
  assert.equal(huge.ok, false);
  const jsUrl = validateCasePayload(JSON.stringify({ kind: "live-map-investigation-case", sourceUrl: "javascript:alert(1)" }));
  assert.equal(jsUrl.ok, false);
}

{
  const samplePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../data/development-fixtures/portwatch-chokepoint6-sample.json");
  const sample = JSON.parse(readFileSync(samplePath, "utf8"));
  assert.equal(sample.live, false);
  assert.match(sample.note, /synthetic placeholders/i);
}

{
  const watch = chokepointOperatingWatch(SYNTHETIC_CHOKEPOINT_ID);
  assert.equal(watch.extra.standing, true);
  const supporting = supportingResourcesForWatch();
  assert.ok(supporting.some((item) => item.watchRelevance.includes("maritime")));
  assert.ok(supporting.every((item) => item.automationEnabled === false || item.implementationStatus === "live"));
}

console.log("investigation-workbench-tests: ok");
