#!/usr/bin/env node
/**
 * Headless replay of the frozen PortWatch Hormuz extract through the existing workbench.
 * No network. Does not approve the genuine case.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { serializeCase } from "../src/intelligence/case-io.js";
import { projectPublicAssessment, renderPublicMarkdown } from "../src/intelligence/public-projection.js";
import {
  applyEvidenceMutation,
  approvalStillValid,
  reviewAssessment,
} from "../src/intelligence/investigation-cycle.js";
import {
  FROZEN_RETRIEVED_AT,
  TEST_ONLY_REVIEWER,
  cloneCaseForAutomatedTest,
  createGenuineHormuzCase,
} from "../src/intelligence/portwatch-frozen-sample.js";
import { loadFrozenExtract } from "./load-frozen-extract.mjs";

const loaded = loadFrozenExtract();
if (!loaded.ok) {
  console.error(loaded.errors);
  process.exit(1);
}
const genuine = createGenuineHormuzCase({ json: loaded.json, sha256: loaded.sha256, retrievedAt: FROZEN_RETRIEVED_AT });
const projection = projectPublicAssessment(genuine.assessments.at(-1), genuine, { audience: "local-preview" });
const markdown = renderPublicMarkdown(projection);
const outDir = path.resolve("artifacts/hormuz-portwatch-2025-01/drafts");
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "genuine-case.json"), serializeCase(genuine));
writeFileSync(path.join(outDir, "genuine-assessment.md"), markdown);
writeFileSync(path.join(outDir, "genuine-projection.json"), JSON.stringify(projection, null, 2));

const testCase = cloneCaseForAutomatedTest(genuine);
const reviewed = reviewAssessment(testCase.assessments.at(-1), {
  reviewer: TEST_ONLY_REVIEWER,
  audience: "local-analyst",
  now: new Date(FROZEN_RETRIEVED_AT),
});
if (!reviewed.ok) {
  console.error(reviewed);
  process.exit(1);
}
testCase.assessments[testCase.assessments.length - 1] = reviewed.assessment;
const removed = applyEvidenceMutation(testCase, {
  removeId: "portwatch:chokepoint6:2025-01-07:n_total",
  now: new Date(FROZEN_RETRIEVED_AT),
});
writeFileSync(path.join(outDir, "TEST-ONLY-approval-invalidation.json"), serializeCase(removed.caseObject));
writeFileSync(path.join(outDir, "TEST-ONLY-README.txt"), [
  "TEST-ONLY artifacts. Reviewer is automated-test-only:hormuz-frozen-sample.",
  "These approvals do not authorize the genuine draft.",
  `Invalidated: ${removed.invalidated}`,
  `Superseded valid: ${approvalStillValid(removed.caseObject.assessments.find((item) => item.extra.reviewState === "superseded"), removed.caseObject).valid}`,
  `Genuine reviewState: ${genuine.assessments.at(-1).extra.reviewState}`,
].join("\n"));

console.log(JSON.stringify({
  genuineReviewState: genuine.assessments.at(-1).extra.reviewState,
  operationalStatus: genuine.lastOperational.operationalStatus,
  evidence: genuine.evidence.length,
  policy: genuine.assessments.at(-1).extra.policyVersion,
  testInvalidated: removed.invalidated,
  outDir,
}, null, 2));
