/**
 * Frozen IMF PortWatch Hormuz extract → existing evidence schema.
 * Browser-safe. Never fetches. Never sets a provider live. Node file loading
 * lives in tests/scripts only.
 */

import { SYNTHETIC_CHOKEPOINT_ID } from "../data/fixtures/synthetic-chokepoint-scenario.js";
import { THRESHOLD_POLICY } from "./threshold-policy.js";
import {
  attachEvidence,
  chokepointOperatingWatch,
  createClaim,
  createCollectionRecord,
  createRelationshipEdge,
  draftOperationalAssessment,
  stampRecord,
} from "./investigation-cycle.js";

export const TEST_ONLY_REVIEWER = "automated-test-only:hormuz-frozen-sample";
export const FROZEN_PARSER_VERSION = "2026-09-16.frozen-v1";
export const FROZEN_SOURCE_ID = "imf-portwatch";
export const FROZEN_CHOKEPOINT_ID = SYNTHETIC_CHOKEPOINT_ID;
export const FROZEN_PORTID = "chokepoint6";
export const FROZEN_PORTNAME = "Strait of Hormuz";
export const FROZEN_INTERVAL = { start: "2025-01-01", end: "2025-01-07" };
export const FROZEN_SHA256 = "f5e8367a93451cb2a69dfda436c72a31e5769e5f6373e32a577d7e993ecfe69b";
export const FROZEN_BYTES = 1394;
export const FROZEN_RETRIEVED_AT = "2026-09-16T08:32:51.761Z";
export const FROZEN_QUERY_URL = "https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query?where=portid%20%3D%20'chokepoint6'%20AND%20date%20%3E%3D%20DATE%20'2025-01-01'%20AND%20date%20%3C%3D%20DATE%20'2025-01-07'&outFields=portid%2Cportname%2Cdate%2Cn_total&returnGeometry=false&orderByFields=date&resultRecordCount=7&f=json";
export const FROZEN_LANDING_URL = "https://portwatch.imf.org/datasets/imf-dataviz%3A%3Adaily-chokepoints-data";
export const FROZEN_EXTRACT_RELATIVE = "data/development-fixtures/portwatch-hormuz-2025-01-extract.json";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateOnly(value, field = "date") {
  if (typeof value === "number") {
    return { ok: false, reason: `${field}-is-numeric-not-dateonly; unix-ms-not-applied`, calendarDate: null };
  }
  const text = String(value || "").trim();
  if (!DATE_ONLY.test(text)) {
    return { ok: false, reason: `${field}-not-yyyy-mm-dd`, calendarDate: null };
  }
  const [year, month, day] = text.split("-").map(Number);
  const utc = Date.UTC(year, month - 1, day);
  const roundTrip = new Date(utc).toISOString().slice(0, 10);
  if (roundTrip !== text) {
    return { ok: false, reason: `${field}-timezone-shift-detected`, calendarDate: null };
  }
  return {
    ok: true,
    calendarDate: text,
    observedAt: `${text}T00:00:00.000Z`,
    precision: "date-only",
    timeReference: "source-calendar-date; esriFieldTypeDateOnly; not unix milliseconds",
  };
}

export function validateFrozenPayload(json) {
  const errors = [];
  const dateField = (json.fields || []).find((field) => field.name === "date");
  if (dateField && dateField.type !== "esriFieldTypeDateOnly") errors.push("date-field-type-unexpected");
  const features = json.features || [];
  const dates = [];
  for (const feature of features) {
    const attrs = feature.attributes || {};
    if (attrs.portid !== FROZEN_PORTID) errors.push(`unexpected-portid:${attrs.portid}`);
    if (attrs.portname !== FROZEN_PORTNAME) errors.push(`unexpected-portname:${attrs.portname}`);
    const parsed = parseDateOnly(attrs.date);
    if (!parsed.ok) errors.push(parsed.reason);
    else dates.push(parsed.calendarDate);
    if (attrs.n_total == null) errors.push(`missing-n_total:${attrs.date}`);
    else if (!Number.isInteger(attrs.n_total)) errors.push(`n_total-not-integer:${attrs.date}`);
  }
  const unique = new Set(dates);
  if (unique.size !== dates.length) errors.push("duplicate-dates");
  const expected = [];
  for (let day = 1; day <= 7; day += 1) expected.push(`2025-01-0${day}`);
  const missing = expected.filter((day) => !unique.has(day));
  if (missing.length) errors.push(`missing-days:${missing.join(",")}`);
  const extra = dates.filter((day) => !expected.includes(day));
  if (extra.length) errors.push(`out-of-window:${extra.join(",")}`);
  return {
    ok: errors.length === 0,
    errors,
    dates,
    missing,
    receivedStart: dates[0] || null,
    receivedEnd: dates.at(-1) || null,
    truncated: Boolean(json.exceededTransferLimit) || features.length > 7,
  };
}

export function mapFrozenFeature(attrs, { retrievedAt = FROZEN_RETRIEVED_AT, collectionId, sha256 } = {}) {
  const parsed = parseDateOnly(attrs.date);
  if (!parsed.ok) {
    return { ok: false, reason: parsed.reason, record: null };
  }
  const original = { portid: attrs.portid, portname: attrs.portname, date: attrs.date, n_total: attrs.n_total };
  const record = stampRecord({
    id: `portwatch:${attrs.portid}:${parsed.calendarDate}:n_total`,
    recordKind: "observation",
    evidenceKind: "throughput-measurement",
    subjectDomain: "maritime",
    title: `PortWatch n_total for ${attrs.portname} on ${parsed.calendarDate}`,
    summary: `Source-reported field n_total=${attrs.n_total} for ${attrs.portname} (${attrs.portid}) on calendar date ${parsed.calendarDate}. AIS-derived estimated transit calls; not unique vessels, delivered cargo, or an operating-state inference.`,
    chokepointId: FROZEN_CHOKEPOINT_ID,
    sourceId: FROZEN_SOURCE_ID,
    sourceUrl: "https://portwatch.imf.org/pages/data-and-methodology",
    canonicalUrl: FROZEN_QUERY_URL,
    sourceOrganizationId: "imf-portwatch",
    upstreamOrganization: "IMF PortWatch",
    observedAt: parsed.observedAt,
    reportedAt: null,
    retrievedAt,
    effectiveStart: parsed.observedAt,
    effectiveEnd: `${parsed.calendarDate}T23:59:59.000Z`,
    value: attrs.n_total,
    unit: "n_total:ais-derived-estimated-transit-calls",
    valueOrigin: "reported",
    synthetic: false,
    coverage: { sourceId: FROZEN_SOURCE_ID, completeness: null, exclusions: "class-specific counts and capacity fields were not requested" },
    rightsAttribution: "Sources: Kpler; UN Global Platform; IMF (PortWatch)",
    parentEvidenceIds: collectionId ? [collectionId] : [],
    extra: {
      originalFields: original,
      datePrecision: parsed.precision,
      timeReference: parsed.timeReference,
      measurementMeaning: "PortWatch daily chokepoint transit-call estimate from AIS. Not unique vessels, tonnage, capacity, energy flow, or measured throughput.",
      proxyNotThroughput: true,
      historicalPublic: true,
      geographicCoverage: "IMF PortWatch portid chokepoint6, published name Strait of Hormuz. Geometry was not requested.",
      reuseTerms: "IMF statistical-data usage requires accurate attribution. Commercial redistribution is review-required. Local historical replay only; provider polling stays off.",
      frozenSample: true,
      live: false,
      providerEnabled: false,
      publicationTimestamp: null,
      publicationTimestampReason: "dataset-last-edit-is-not-row-publication-time; source did not identify a row-level publishedAt",
      sourceResponseSha256: sha256 || FROZEN_SHA256,
      parserVersion: FROZEN_PARSER_VERSION,
      queryUrl: FROZEN_QUERY_URL,
      landingUrl: FROZEN_LANDING_URL,
    },
  }, new Date(retrievedAt));
  return { ok: true, record, parsed };
}

export function createGenuineHormuzCase({ json, sha256 = FROZEN_SHA256, retrievedAt = FROZEN_RETRIEVED_AT } = {}) {
  const validation = validateFrozenPayload(json);
  const now = new Date(retrievedAt);
  const requirement = chokepointOperatingWatch(FROZEN_CHOKEPOINT_ID, now);
  requirement.extra.timeWindow = { start: `${FROZEN_INTERVAL.start}T00:00:00.000Z`, end: `${FROZEN_INTERVAL.end}T23:59:59.000Z` };
  requirement.extra.question = `What n_total (AIS-derived estimated transit calls) did IMF PortWatch publish for the Strait of Hormuz (portid ${FROZEN_PORTID}) on each calendar date from ${FROZEN_INTERVAL.start} through ${FROZEN_INTERVAL.end}? Do not treat that extract as today's operating condition, a baseline, or recovery.`;
  requirement.extra.standing = true;
  requirement.extra.audience = "local-analyst";
  requirement.extra.historicalWindow = true;
  const collection = createCollectionRecord({
    id: "collection:portwatch-hormuz-2025-01-01-2025-01-07",
    requirementId: requirement.id,
    sourceId: FROZEN_SOURCE_ID,
    methodId: "bounded-public-arcgis-query-frozen",
    capabilityId: "imf-portwatch",
    title: "Frozen PortWatch Hormuz extract 2025-01-01..2025-01-07",
    chokepointId: FROZEN_CHOKEPOINT_ID,
    requestedInterval: FROZEN_INTERVAL,
    receivedInterval: { start: validation.receivedStart, end: validation.receivedEnd },
    result: validation.ok ? "success" : "partial",
    accessState: "historical-public-frozen",
    budget: { count: 7, bytes: FROZEN_BYTES, timeMs: 1678 },
  }, now);
  const collectedWith = createRelationshipEdge({
    id: "rel:collected-with:portwatch-hormuz-2025-01",
    fromId: collection.id,
    toId: FROZEN_SOURCE_ID,
    edgeType: "collected_with",
    assertionClass: "observed",
    evidenceKind: "maritime-aggregate",
    subjectDomain: "maritime",
    title: "Collected using IMF PortWatch Daily Chokepoints Data",
    chokepointId: FROZEN_CHOKEPOINT_ID,
    sourceId: FROZEN_SOURCE_ID,
    sourceUrl: FROZEN_LANDING_URL,
  }, now);
  let caseObject = {
    id: "case:portwatch-hormuz-2025-01",
    revision: 1,
    unsaved: true,
    genuine: true,
    live: false,
    providerEnabled: false,
    requirement,
    collections: [collection],
    evidence: [],
    parked: [],
    claims: [],
    assessments: [],
    products: [],
    feedback: [],
    relationships: [collectedWith],
    history: [{ type: "opened-genuine-frozen", at: retrievedAt }],
    sourceEvaluations: [],
  };
  const mapped = [];
  for (const feature of json.features || []) {
    const result = mapFrozenFeature(feature.attributes, { retrievedAt, collectionId: collection.id, sha256 });
    if (!result.ok) {
      caseObject.parked.push({ record: feature.attributes, reason: result.reason, parkedAt: retrievedAt });
      continue;
    }
    const attached = attachEvidence(caseObject, result.record, { now });
    caseObject = attached.caseObject;
    if (attached.attached) mapped.push(result.record);
  }
  const claim = createClaim({
    id: "claim:portwatch-hormuz-n_total-2025-01-01-2025-01-07",
    proposition: `IMF PortWatch Daily Chokepoints Data reports field n_total (AIS-derived estimated transit calls) for ${FROZEN_PORTNAME} (portid ${FROZEN_PORTID}) on each calendar date from ${FROZEN_INTERVAL.start} through ${FROZEN_INTERVAL.end} as in the frozen extract. This is not a claim of current disruption, closure, recovery, delivered cargo, or downstream loss.`,
    predicate: "source-reported-n_total",
    subject: FROZEN_CHOKEPOINT_ID,
    chokepointId: FROZEN_CHOKEPOINT_ID,
    evidenceKind: "throughput-measurement",
    supporting: caseObject.evidence,
    credibilityCode: "6",
    credibilityRationale: "Credibility of the underlying AIS-derived estimate is not judged from this extract. The claim is that the published table contains these n_total values for these dates.",
    gaps: [
      "No comparable baseline series in this extract.",
      "No restriction geometry, commercial quotes, or recovery indicators.",
      "n_total is not unique vessels, tonnage, or capacity.",
    ],
    validStart: `${FROZEN_INTERVAL.start}T00:00:00.000Z`,
    validEnd: `${FROZEN_INTERVAL.end}T23:59:59.000Z`,
  }, now);
  caseObject.claims = [claim];
  const knowledgeCutoff = retrievedAt;
  const { assessment, operational } = draftOperationalAssessment(caseObject, {
    now: Date.parse(retrievedAt),
    asOf: knowledgeCutoff,
    audience: "local-analyst",
  });
  assessment.extra.reviewState = "review_required";
  assessment.extra.approved = false;
  assessment.extra.genuineDraft = true;
  assessment.extra.policyVersion = THRESHOLD_POLICY.version;
  assessment.extra.policyId = THRESHOLD_POLICY.id;
  assessment.extra.gaps = [
    ...(assessment.extra.gaps || []),
    "No comparable baseline in this extract; duration, recovery, displacement, and commercial conditions remain unknown.",
    "Registry official-source status for the published table is not a confirmed operating regime.",
  ];
  caseObject.assessments = [assessment];
  caseObject.lastOperational = operational;
  caseObject.validation = validation;
  caseObject.knowledgeCutoff = knowledgeCutoff;
  caseObject.observationWindow = FROZEN_INTERVAL;
  return caseObject;
}

export function cloneCaseForAutomatedTest(caseObject) {
  const clone = JSON.parse(JSON.stringify({
    ...caseObject,
    lastOperational: undefined,
  }));
  clone.id = `${caseObject.id}:test-only`;
  clone.genuine = false;
  clone.testOnly = true;
  clone.reviewerAllowed = TEST_ONLY_REVIEWER;
  delete clone.lastOperational;
  return clone;
}

export { THRESHOLD_POLICY };
