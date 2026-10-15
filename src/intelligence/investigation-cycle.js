/**
 * Intelligence-cycle workbench around existing evidence and L01–L11.
 * Forge owns the workflow; Live Map owns the geographic projection.
 */

import { chokepointById } from "../data/strategic-chokepoints.js";
import { SYNTHETIC_CHOKEPOINT_ID, SYNTHETIC_NOW, syntheticChokepointRecords } from "../data/fixtures/synthetic-chokepoint-scenario.js";
import { contentDigest, inputManifest, manifestDigest } from "./content-digest.js";
import {
  createAssessmentRecord,
  createEvidenceRecord,
  createRelationship,
  recordsKnownBy,
  uniqueOriginKeys,
} from "./evidence-records.js";
import { defaultClaimCredibility, defaultSourceEvaluation } from "./evaluation-vocabulary.js";
import { evaluateChokepointOperations } from "./operational-evaluator.js";
import { THRESHOLD_POLICY } from "./threshold-policy.js";
import { sourceIndependence } from "./source-independence.js";
import { isAuthoritativeSource } from "./source-authority.js";
import { draftCeasefireAssessment } from './ceasefire-assessment.js';

export const STANDING_WATCH_ID = "standing-watch:chokepoint-operating";
export const WORKBENCH_METHOD = "chokepoint-operating-l01-l11";
export const WORKBENCH_METHOD_VERSION = "2026-10-02.workbench-v1-maritime-signals";

const WATCH_DOMAINS = new Set(["maritime", "weather", "conflict-security", "commodity-supply-chain", "infrastructure"]);
const WATCH_KINDS = new Set([
  "official-notice",
  "throughput-measurement",
  "baseline-observation",
  "maritime-aggregate",
  "insurer-quote",
  "freight-quote",
  "commercial-terms",
  "physical-security-report",
  "diplomatic-statement",
  "restriction-geometry",
  "flow-observation",
  "weather-model-observation",
  "energy-economic-observation",
]);

export function evidentialOriginId(record = {}) {
  return record.evidentialOriginId
    || record.canonicalUrl
    || record.syndication
    || (record.sourceOrganizationId && record.title ? `${record.sourceOrganizationId}:${record.title}` : null)
    || record.id;
}

export function groupEvidentialOrigins(records = []) {
  const groups = [];
  for (const record of records) {
    const observation = {
      id: record.id,
      sourceOrganizationId: record.sourceOrganizationId,
      canonicalUrl: record.canonicalUrl || record.sourceUrl,
      url: record.sourceUrl,
      syndication: record.syndication,
      evidentialOriginId: evidentialOriginId(record),
    };
    const existing = groups.find((group) => !sourceIndependence(group.representative, observation).independent
      || group.representative.evidentialOriginId === observation.evidentialOriginId);
    if (existing) {
      existing.acquisitions.push(record.id);
      existing.count += 1;
    } else {
      groups.push({
        originId: observation.evidentialOriginId,
        representative: observation,
        acquisitions: [record.id],
        count: 1,
      });
    }
  }
  return groups;
}

export function independenceSummary(records = []) {
  const origins = groupEvidentialOrigins(records);
  const originIds = uniqueOriginKeys(records);
  return {
    acquisitionCount: records.length,
    independentOriginCount: origins.length,
    uniqueOriginKeys: originIds,
    unknownIndependence: origins.length <= 1 && records.length > 1
      ? "multiple-acquisitions-or-mirrors-of-one-origin"
      : origins.length === 0 ? "no-records" : "evaluated-from-organization-url-syndication",
    note: "Independent acquisition is not independent corroboration of the underlying assertion.",
  };
}

export function stampRecord(input = {}, now = new Date()) {
  const record = createEvidenceRecord(input, now);
  record.revision = Number(input.revision) > 0 ? Number(input.revision) : 1;
  record.evidentialOriginId = evidentialOriginId({ ...input, ...record });
  record.contentDigest = contentDigest(record);
  return record;
}

export function createRequirement(input = {}, now = new Date()) {
  const created = stampRecord({
    id: input.id || STANDING_WATCH_ID,
    recordKind: "requirement",
    evidenceKind: input.evidenceKind || "public-report",
    subjectDomain: input.subjectDomain || "maritime",
    title: input.title || "Chokepoint operating watch",
    summary: input.question || input.summary,
    chokepointId: input.chokepointId || null,
    extra: {
      question: input.question || "Track physical access, throughput, commercial access, and relevant downstream exposure. Separate announcements from operating evidence.",
      audience: input.audience || "local-analyst",
      handling: input.handling || "synthetic-or-public-safe",
      timeWindow: input.timeWindow || null,
      allowedSourceIds: input.allowedSourceIds || [],
      excludedData: input.excludedData || [],
      definitionOfDone: input.definitionOfDone || "Dated evidence inspected; independent dimensions assessed; contradictions visible; product reviewed or explicitly insufficient.",
      reviewOwner: input.reviewOwner || "human-operator",
      status: input.status || "active",
      standing: input.standing !== false,
      domainScope: input.domainScope || [...WATCH_DOMAINS],
      geography: input.geography || input.chokepointId || null,
    },
  }, now);
  return created;
}

export function chokepointOperatingWatch(chokepointId = SYNTHETIC_CHOKEPOINT_ID, now = new Date()) {
  const chokepoint = chokepointById(chokepointId);
  return createRequirement({
    id: `${STANDING_WATCH_ID}:${chokepointId}`,
    chokepointId,
    title: `${chokepoint?.name || chokepointId} operating watch`,
    question: `Assess operating conditions at ${chokepoint?.name || chokepointId} during the selected period. Keep diplomacy, physical access, throughput, and commercial access separate. Announcements are not operating evidence.`,
    standing: true,
    audience: "local-analyst",
    timeWindow: { start: "2026-06-01T00:00:00.000Z", end: "2026-06-26T12:00:00.000Z" },
    allowedSourceIds: [],
    definitionOfDone: "Independent L01–L11 dimensions computed; origin grouping shown; contradictions retained; review bound to exact revisions.",
  }, now);
}

export function inWatchScope(requirement, record) {
  const extra = requirement?.extra || {};
  if (extra.excludedData?.includes(record.id) || extra.excludedData?.includes(record.evidenceKind)) {
    return { inScope: false, reason: "excluded-by-requirement" };
  }
  if (requirement.chokepointId && record.chokepointId && record.chokepointId !== requirement.chokepointId) {
    return { inScope: false, reason: "different-chokepoint" };
  }
  const allowed = extra.allowedSourceIds || [];
  if (allowed.length && record.sourceId && !allowed.includes(record.sourceId) && record.evidenceKind !== "diplomatic-statement") {
    return { inScope: false, reason: "source-not-on-allowlist" };
  }
  if (record.subjectDomain && extra.domainScope?.length && !extra.domainScope.includes(record.subjectDomain) && !WATCH_DOMAINS.has(record.subjectDomain)) {
    return { inScope: false, reason: "domain-out-of-scope" };
  }
  if (record.evidenceKind && !WATCH_KINDS.has(record.evidenceKind) && record.recordKind !== "restriction-geometry") {
    return { inScope: false, reason: "evidence-kind-out-of-scope" };
  }
  return { inScope: true, reason: "standing-watch-accepts-in-scope-maritime-operating-evidence" };
}

export function createCollectionRecord(input = {}, now = new Date()) {
  return stampRecord({
    id: input.id || `collection:${Date.now()}`,
    recordKind: "collection",
    evidenceKind: input.evidenceKind || "public-report",
    subjectDomain: input.subjectDomain || "maritime",
    title: input.title || "Collection run",
    summary: input.summary,
    sourceId: input.sourceId,
    chokepointId: input.chokepointId,
    extra: {
      requirementId: input.requirementId,
      methodId: input.methodId || "manual-public-safe-json",
      capabilityId: input.capabilityId || null,
      requestedInterval: input.requestedInterval || null,
      receivedInterval: input.receivedInterval || null,
      budget: input.budget || { count: 0, bytes: 0, timeMs: 0 },
      result: input.result || "success",
      accessState: input.accessState || "local-import",
    },
  }, now);
}

export function attachEvidence(caseObject, record, { collection = null, now = new Date() } = {}) {
  const evidence = stampRecord(record, now);
  const scope = inWatchScope(caseObject.requirement, evidence);
  const next = { ...caseObject, unsaved: true };
  if (collection) next.collections = [...(next.collections || []), collection];
  if (!scope.inScope) {
    next.parked = [...(next.parked || []), { record: evidence, reason: scope.reason, parkedAt: now.toISOString() }];
    return { caseObject: next, attached: false, parked: true, reason: scope.reason };
  }
  next.evidence = [...(next.evidence || []), evidence];
  return { caseObject: next, attached: true, parked: false, reason: scope.reason };
}

export function createClaim(input = {}, now = new Date()) {
  const supporting = input.supporting || [];
  const contradicting = input.contradicting || [];
  const independence = independenceSummary(supporting);
  const credibility = defaultClaimCredibility({
    code: input.credibilityCode,
    rationale: input.credibilityRationale,
    evaluator: input.evaluator,
  });
  if (input.llmAgreement === true) {
    credibility.rationale = `${credibility.rationale} LLM agreement is not an evidential origin.`;
  }
  return stampRecord({
    id: input.id || `claim:${input.predicate || "proposition"}:${now.toISOString()}`,
    recordKind: "claim",
    evidenceKind: input.evidenceKind || "public-report",
    subjectDomain: input.subjectDomain || "maritime",
    title: input.title || input.proposition,
    summary: input.proposition,
    chokepointId: input.chokepointId,
    extra: {
      proposition: input.proposition,
      predicate: input.predicate || null,
      subject: input.subject || null,
      scope: input.scope || null,
      validStart: input.validStart || null,
      validEnd: input.validEnd || null,
      supportingRevisions: inputManifest(supporting),
      contradictingRevisions: inputManifest(contradicting),
      credibility,
      independence,
      alternatives: input.alternatives || [],
      assumptions: input.assumptions || [],
      gaps: input.gaps || [],
      reviewState: input.reviewState || "draft",
      officialNoticeDisplay: input.officialNoticeDisplay === true,
    },
  }, now);
}

export function officialNoticeClaim(record, now = new Date()) {
  const authoritative = isAuthoritativeSource(record);
  return createClaim({
    id: `claim:notice-issued:${record.id}`,
    proposition: `The responsible authority issued this restriction or operating notice (${record.title}).`,
    predicate: "issued-notice",
    subject: record.chokepointId,
    chokepointId: record.chokepointId,
    supporting: [record],
    officialNoticeDisplay: true,
    credibilityCode: "6",
    credibilityRationale: authoritative
      ? "An authoritative notice may be shown as issued under a reviewed domain rule. That does not confirm measured zero throughput or independently corroborate every sentence in the notice."
      : "Notice display still requires source attribution. Credibility of underlying physical claims remains unevaluated.",
    gaps: ["Physical occurrence of the described restriction is a separate claim.", "Throughput impact is a separate claim."],
  }, now);
}

export function draftOperationalAssessment(caseObject, { now = SYNTHETIC_NOW, asOf = null, audience = "local-analyst" } = {}) {
  if (caseObject.caseType === 'ceasefire-v1') return draftCeasefireAssessment(caseObject);
  const chokepoint = chokepointById(caseObject.requirement.chokepointId);
  const known = recordsKnownBy(caseObject.evidence || [], asOf || now);
  const operational = evaluateChokepointOperations({
    chokepoint,
    events: caseObject.events || [],
    correlations: caseObject.correlations || [],
    records: known,
    now,
    asOf,
    policy: THRESHOLD_POLICY,
  });
  const claims = caseObject.claims || [];
  const contradictions = (operational.contradictions || []).concat(
    known.filter((record) => record.extra?.contradictsId).map((record) => ({ id: record.id, contradictsId: record.extra.contradictsId })),
  );
  const manifest = inputManifest(known);
  const assessment = createAssessmentRecord({
    id: `assessment:${chokepoint.id}:${new Date(now).toISOString()}`,
    chokepointId: chokepoint.id,
    subjectDomain: "maritime",
    title: `${chokepoint.name} operating assessment`,
    summary: operational.explanation,
    policyId: THRESHOLD_POLICY.id,
    policyVersion: THRESHOLD_POLICY.version,
    baselineVersion: operational.regimeDuration?.current?.usedDays ? "pre-2026-05" : null,
    evaluationTime: new Date(now).toISOString(),
    result: {
      operational: operational.operationalStatus,
      evidenceRank: operational.evidenceRank,
      dimensions: operational.dimensions,
      maritimeSignals: operational.maritimeSignals,
      regime: operational.regimeDuration,
      recovery: operational.recoveryBreadth,
      method: WORKBENCH_METHOD,
      methodVersion: WORKBENCH_METHOD_VERSION,
    },
    reasons: operational.reasons,
    inputIds: known.map((record) => record.id),
    synthetic: known.some((record) => record.synthetic),
    valueOrigin: known.some((record) => record.synthetic) ? "synthetic" : "inferred",
    extra: {
      requirementId: caseObject.requirement.id,
      requirementRevision: caseObject.requirement.revision,
      claimRevisions: inputManifest(claims),
      inputManifest: manifest,
      inputDigest: manifestDigest(manifest),
      audience,
      reviewState: "draft",
      currentApplicability: "current",
      approved: false,
      alternatives: [
        "Announced diplomacy without operating evidence.",
        "Scoped restriction without measured traffic change.",
        "Insufficient comparable throughput/baseline.",
      ],
      gaps: operational.caveats,
      contradictions,
      knowledgeCutoff: asOf ? new Date(asOf).toISOString() : new Date(now).toISOString(),
      policyUnvalidated: true,
    },
  }, new Date(now));
  assessment.contentDigest = contentDigest(assessment);
  assessment.revision = 1;
  return { assessment, operational };
}

export function reviewBindingFields(assessment, { reviewer = "human-operator", audience = "local-analyst" } = {}) {
  return {
    assessmentId: assessment.id,
    assessmentRevision: assessment.revision || 1,
    contentDigest: assessment.contentDigest,
    inputDigest: assessment.extra?.inputDigest,
    policyId: assessment.extra?.policyId || assessment.extra?.result ? THRESHOLD_POLICY.id : THRESHOLD_POLICY.id,
    policyVersion: THRESHOLD_POLICY.version,
    methodVersion: WORKBENCH_METHOD_VERSION,
    audience,
    reviewer,
    knowledgeCutoff: assessment.extra?.knowledgeCutoff,
  };
}

export function reviewAssessment(assessment, { reviewer = "human-operator", audience = "local-analyst", now = new Date() } = {}) {
  if (assessment.extra?.importedApproval) {
    return { ok: false, reason: "imported-approval-cannot-authorize", assessment };
  }
  if (assessment.extra?.reviewState === "historical") {
    return { ok: false, reason: "historical-assessment-cannot-authorize", assessment };
  }
  const binding = reviewBindingFields(assessment, { reviewer, audience });
  const reviewed = {
    ...assessment,
    extra: {
      ...assessment.extra,
      reviewState: "reviewed",
      currentApplicability: "current",
      approved: true,
      reviewedAt: now.toISOString(),
      binding,
    },
  };
  reviewed.contentDigest = contentDigest(reviewed);
  return { ok: true, reason: "reviewed", assessment: reviewed, binding };
}

export function approvalStillValid(assessment, caseObject, { audience = "local-analyst" } = {}) {
  if (!assessment?.extra?.approved || assessment.extra.reviewState !== "reviewed") {
    return { valid: false, reason: "not-currently-reviewed" };
  }
  if (assessment.extra.importedApproval) return { valid: false, reason: "imported-approval" };
  if (assessment.extra.audience && assessment.extra.audience !== audience) {
    return { valid: false, reason: "audience-mismatch" };
  }
  const known = recordsKnownBy(caseObject.evidence || [], assessment.extra?.knowledgeCutoff);
  const currentDigest = manifestDigest(inputManifest(known));
  if (currentDigest !== assessment.extra.inputDigest) {
    return { valid: false, reason: "input-manifest-changed", changed: true };
  }
  if (assessment.extra.result?.methodVersion && assessment.extra.result.methodVersion !== WORKBENCH_METHOD_VERSION) {
    return { valid: false, reason: "method-version-changed" };
  }
  if (THRESHOLD_POLICY.version !== (assessment.extra.policyVersion || THRESHOLD_POLICY.version) && assessment.policyVersion !== THRESHOLD_POLICY.version) {
    return { valid: false, reason: "policy-version-changed" };
  }
  return { valid: true, reason: "binding-matches" };
}

export function applySourceDisposition(caseObject, { sourceId, disposition = "invalidated", now = new Date(), asOf = null } = {}) {
  const policy = disposition === "aged-out" ? "source-aged-out" : disposition === "invalidated" ? "source-invalidated" : null;
  if (!sourceId || !policy) {
    return { caseObject, invalidated: false, invalidationReason: "disposition-not-applied", assessment: (caseObject.assessments || []).at(-1) || null, operational: caseObject.lastOperational || null };
  }
  const history = [...(caseObject.history || [])];
  let changed = 0;
  const evidence = (caseObject.evidence || []).map((record) => {
    if (record.sourceId !== sourceId || record.freshnessPolicy === policy) return record;
    changed += 1;
    const next = stampRecord({
      ...record,
      freshnessPolicy: policy,
      revision: (Number(record.revision) || 1) + 1,
      extra: { ...record.extra, sourceDisposition: policy },
    }, now);
    history.push({ type: policy, id: record.id, sourceId, at: now.toISOString() });
    return next;
  });
  const nextCase = { ...caseObject, evidence, history, unsaved: true };
  if (!changed) {
    return { caseObject: nextCase, invalidated: false, invalidationReason: "source-already-retired", assessment: (caseObject.assessments || []).at(-1) || null, operational: caseObject.lastOperational || null };
  }
  const previous = (caseObject.assessments || []).at(-1);
  const validity = previous ? approvalStillValid(previous, nextCase, { audience: previous.extra?.audience || "local-analyst" }) : { valid: false, reason: "no-prior-assessment" };
  let assessments = [...(caseObject.assessments || [])];
  if (previous && (previous.extra?.approved || previous.extra?.reviewState === "reviewed") && !validity.valid) {
    assessments = assessments.map((item, index) => (index === assessments.length - 1 ? {
      ...previous,
      extra: {
        ...previous.extra,
        reviewState: "superseded",
        currentApplicability: "expired",
        approved: false,
        invalidation: { reason: policy, at: now.toISOString(), changedInput: sourceId },
      },
    } : item));
  }
  const evaluationNow = typeof now === "number" ? now : (now?.getTime?.() || Date.now());
  const { assessment, operational } = draftOperationalAssessment(nextCase, {
    now: evaluationNow,
    asOf: asOf || nextCase.asOf || previous?.extra?.knowledgeCutoff || new Date(evaluationNow).toISOString(),
  });
  assessment.extra.reviewState = "review_required";
  assessment.extra.gaps = [...(assessment.extra.gaps || []), `Source ${sourceId} is ${policy}; operating conclusions that depended on it are withdrawn.`];
  assessments = [...assessments, assessment];
  return {
    caseObject: { ...nextCase, assessments, lastOperational: operational },
    invalidated: Boolean(previous && !validity.valid && (previous.extra?.approved || previous.extra?.reviewState === "reviewed")),
    invalidationReason: policy,
    assessment,
    operational,
  };
}

export function applyEvidenceMutation(caseObject, { removeId = null, replace = null, retrievedAtOnly = null, now = new Date() } = {}) {
  let evidence = [...(caseObject.evidence || [])];
  const history = [...(caseObject.history || [])];
  if (removeId) {
    const removed = evidence.find((record) => record.id === removeId);
    evidence = evidence.filter((record) => record.id !== removeId);
    if (removed) history.push({ type: "evidence-removed", id: removeId, at: now.toISOString(), contentDigest: removed.contentDigest });
  }
  if (replace) {
    evidence = evidence.map((record) => {
      if (record.id !== replace.id) return record;
      const next = stampRecord({ ...record, ...replace, revision: (Number(record.revision) || 1) + 1, extra: { ...record.extra, ...replace.extra } }, now);
      history.push({ type: "evidence-revised", id: record.id, from: record.contentDigest, to: next.contentDigest, at: now.toISOString() });
      return next;
    });
  }
  if (retrievedAtOnly) {
    evidence = evidence.map((record) => {
      if (record.id !== retrievedAtOnly.id) return record;
      return { ...record, retrievedAt: retrievedAtOnly.retrievedAt };
    });
    history.push({ type: "retrieved-at-refresh", id: retrievedAtOnly.id, at: now.toISOString(), note: "Retrieval timestamp refresh does not create a content revision." });
  }
  const nextCase = { ...caseObject, evidence, history, unsaved: true };
  const previous = (caseObject.assessments || []).at(-1);
  const validity = previous ? approvalStillValid(previous, nextCase, { audience: previous.extra?.audience || "local-analyst" }) : { valid: false, reason: "no-prior-assessment" };
  if (retrievedAtOnly && !removeId && !replace && validity.valid) {
    return {
      caseObject: nextCase,
      invalidated: false,
      invalidationReason: "retrieved-at-refresh-is-not-a-content-revision",
      assessment: previous,
      operational: caseObject.lastOperational || null,
    };
  }
  let assessments = [...(caseObject.assessments || [])];
  if (previous && (previous.extra?.approved || previous.extra?.reviewState === "reviewed") && !validity.valid) {
    const superseded = {
      ...previous,
      extra: {
        ...previous.extra,
        reviewState: "superseded",
        currentApplicability: "expired",
        approved: false,
        invalidation: { reason: validity.reason, at: now.toISOString?.() || new Date(now).toISOString(), changedInput: removeId || replace?.id || null },
      },
    };
    assessments = assessments.map((item, index) => (index === assessments.length - 1 ? superseded : item));
  }
  const evaluationNow = typeof now === "number" ? now : (now?.getTime?.() || SYNTHETIC_NOW);
  const { assessment, operational } = draftOperationalAssessment(nextCase, {
    now: evaluationNow,
    asOf: nextCase.asOf || previous?.extra?.knowledgeCutoff || new Date(evaluationNow).toISOString(),
  });
  assessment.extra.reviewState = "review_required";
  assessments = [...assessments, assessment];
  return {
    caseObject: { ...nextCase, assessments, lastOperational: operational },
    invalidated: Boolean(previous && !validity.valid && (previous.extra?.approved || previous.extra?.reviewState === "reviewed")),
    invalidationReason: validity.reason,
    assessment,
    operational,
  };
}

export function createInvestigationCase({ chokepointId = SYNTHETIC_CHOKEPOINT_ID, records = null, now = new Date() } = {}) {
  const requirement = chokepointOperatingWatch(chokepointId, now);
  const collection = createCollectionRecord({
    id: `collection:synthetic:${chokepointId}`,
    requirementId: requirement.id,
    sourceId: "synthetic-fixture",
    methodId: "synthetic-scenario",
    title: "Synthetic Hormuz scenario load",
    chokepointId,
    result: "success",
  }, now);
  let caseObject = {
    id: `case:${chokepointId}`,
    revision: 1,
    unsaved: true,
    requirement,
    collections: [collection],
    evidence: [],
    parked: [],
    claims: [],
    assessments: [],
    products: [],
    feedback: [],
    history: [{ type: "opened", at: now.toISOString() }],
    sourceEvaluations: [],
  };
  const pool = records || syntheticChokepointRecords();
  for (const record of pool) {
    const attached = attachEvidence(caseObject, record, { now });
    caseObject = attached.caseObject;
  }
  const notices = caseObject.evidence.filter((record) => record.evidenceKind === "official-notice" || record.recordKind === "restriction-geometry");
  caseObject.claims = notices.map((record) => officialNoticeClaim(record, now));
  const { assessment, operational } = draftOperationalAssessment(caseObject, { now: SYNTHETIC_NOW, asOf: new Date(SYNTHETIC_NOW).toISOString() });
  caseObject.assessments = [assessment];
  caseObject.lastOperational = operational;
  caseObject.sourceEvaluations = [...new Set(caseObject.evidence.map((record) => record.sourceId).filter(Boolean))]
    .map((sourceId) => defaultSourceEvaluation({ sourceId, domain: "maritime" }));
  return caseObject;
}

export function createRelationshipEdge(input, now = new Date()) {
  return createRelationship(input, now);
}

export { SYNTHETIC_CHOKEPOINT_ID, SYNTHETIC_NOW, THRESHOLD_POLICY };
