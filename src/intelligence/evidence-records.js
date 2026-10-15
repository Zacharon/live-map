/**
 * Typed public-information records. Extends existing event/observation language.
 * Unknown stays unknown. Zero coordinates remain valid when explicitly supplied.
 */

import { canonicalizeObservationUrl } from "./source-observations.js";
import { sourceIndependence } from "./source-independence.js";

export const RECORD_KINDS = [
  "observation",
  "claim",
  "evidence",
  "incident",
  "asset",
  "chokepoint",
  "restriction-geometry",
  "flow-observation",
  "supply-exposure",
  "relationship",
  "assessment",
  "requirement",
  "collection",
  "product",
  "feedback",
];

export const VALUE_ORIGINS = ["observed", "reported", "modeled", "inferred", "synthetic"];

export const EVIDENCE_KINDS = [
  "official-notice",
  "public-report",
  "weather-model-observation",
  "weather-station-observation",
  "maritime-aggregate",
  "throughput-measurement",
  "insurer-quote",
  "freight-quote",
  "physical-security-report",
  "diplomatic-statement",
  "energy-economic-observation",
  "cyber-network-record",
  "orbital-element",
  "restriction-geometry",
  "flow-observation",
  "baseline-observation",
  "commercial-terms",
];

export const SUBJECT_DOMAINS = [
  "maritime",
  "weather",
  "conflict-security",
  "infrastructure",
  "commodity-supply-chain",
  "aviation",
  "technology-cyber",
  "finance-markets",
  "orbital",
  "humanitarian",
];

export const NODE_TYPES = [
  "public-report",
  "official-notice",
  "weather-model-observation",
  "maritime-aggregate",
  "infrastructure",
  "energy-economic-observation",
  "cyber-network-record",
  "orbital-element",
];

export const EDGE_TYPES = [
  "reported_by",
  "derived_from",
  "supports",
  "contradicts",
  "affects",
  "depends_on",
  "routes_via",
  "observed_reroute",
  "possible_association",
  "collected_with",
];

export const ASSERTION_CLASSES = ["observed", "reported", "hypothesized", "heuristic"];

export const EVIDENCE_RANKS = ["insufficient", "reported", "corroborated", "confirmed", "contested"];

export const OPERATIONAL_STATES = ["unknown", "restricted", "disrupted", "closed", "recovering", "normal"];

export const DIMENSION_IDS = ["diplomacy", "physicalAccess", "throughput", "commercialAccess"];

export const DIMENSION_STATES = ["unknown", "impaired", "restricted", "disrupted", "improving", "normal"];

export const GEOMETRY_PRECISIONS = ["exact", "approximate", "region", "unknown"];

const HTTPS = /^https:\/\//i;

function finiteOrNull(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isoOrNull(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function textOrNull(value, max = 2000) {
  if (value == null) return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : null;
}

export function nodeTypeForRecord(record = {}) {
  if (NODE_TYPES.includes(record.nodeType)) return record.nodeType;
  const kind = record.evidenceKind || record.recordKind;
  if (kind === "official-notice" || record.recordKind === "restriction-geometry") return "official-notice";
  if (kind === "weather-model-observation" || kind === "weather-station-observation") return "weather-model-observation";
  if (kind === "maritime-aggregate" || kind === "throughput-measurement" || kind === "flow-observation") return "maritime-aggregate";
  if (kind === "energy-economic-observation" || record.recordKind === "supply-exposure") return "energy-economic-observation";
  if (kind === "cyber-network-record") return "cyber-network-record";
  if (kind === "orbital-element") return "orbital-element";
  if (record.recordKind === "asset" || record.recordKind === "chokepoint") return "infrastructure";
  return "public-report";
}

export function createEvidenceRecord(input = {}, now = new Date()) {
  const retrievedAt = isoOrNull(input.retrievedAt) || now.toISOString();
  const geometry = input.geometry && typeof input.geometry === "object" ? input.geometry : null;
  const lat = finiteOrNull(input.lat ?? input.latitude);
  const lon = finiteOrNull(input.lon ?? input.longitude);
  const hasExplicitCoordinates = lat != null && lon != null;
  const sourceUrl = textOrNull(input.sourceUrl || input.url, 2000);
  const canonicalUrl = canonicalizeObservationUrl(input.canonicalUrl || sourceUrl) || null;
  const id = textOrNull(input.id, 180) || `record:${nodeTypeForRecord(input)}:${retrievedAt}:${Math.abs(hashString(`${input.title || ""}:${canonicalUrl || ""}`))}`;
  return {
    id,
    recordKind: RECORD_KINDS.includes(input.recordKind) ? input.recordKind : "observation",
    evidenceKind: EVIDENCE_KINDS.includes(input.evidenceKind) ? input.evidenceKind : "public-report",
    subjectDomain: SUBJECT_DOMAINS.includes(input.subjectDomain) ? input.subjectDomain : "maritime",
    nodeType: nodeTypeForRecord(input),
    title: textOrNull(input.title, 500) || "Untitled record",
    summary: textOrNull(input.summary || input.excerpt, 2000),
    sourceId: textOrNull(input.sourceId, 120),
    sourceUrl: sourceUrl && HTTPS.test(sourceUrl) ? sourceUrl : null,
    canonicalUrl,
    upstreamOrganization: textOrNull(input.upstreamOrganization || input.sourceOrganizationName, 200),
    sourceOrganizationId: textOrNull(input.sourceOrganizationId, 120),
    syndication: textOrNull(input.syndication, 160),
    observedAt: isoOrNull(input.observedAt),
    reportedAt: isoOrNull(input.reportedAt),
    retrievedAt,
    effectiveStart: isoOrNull(input.effectiveStart || input.validFrom),
    effectiveEnd: isoOrNull(input.effectiveEnd || input.validTo),
    lat: hasExplicitCoordinates ? lat : null,
    lon: hasExplicitCoordinates ? lon : null,
    geometry,
    geometryPrecision: GEOMETRY_PRECISIONS.includes(input.geometryPrecision)
      ? input.geometryPrecision
      : geometry || hasExplicitCoordinates ? "approximate" : "unknown",
    value: input.value == null ? null : input.value,
    unit: textOrNull(input.unit, 80),
    coverage: input.coverage && typeof input.coverage === "object" ? input.coverage : null,
    freshnessPolicy: textOrNull(input.freshnessPolicy, 240),
    qualityLimitations: Array.isArray(input.qualityLimitations) ? input.qualityLimitations.map((item) => String(item).slice(0, 400)) : [],
    rightsAttribution: textOrNull(input.rightsAttribution || input.attribution, 400),
    parentEvidenceIds: Array.isArray(input.parentEvidenceIds) ? input.parentEvidenceIds.map(String) : [],
    valueOrigin: VALUE_ORIGINS.includes(input.valueOrigin) ? input.valueOrigin : "reported",
    claimScope: input.claimScope && typeof input.claimScope === "object" ? input.claimScope : null,
    chokepointId: textOrNull(input.chokepointId, 80),
    synthetic: input.synthetic === true || input.valueOrigin === "synthetic",
    extra: input.extra && typeof input.extra === "object" ? input.extra : {},
  };
}

export function createRelationship(input = {}, now = new Date()) {
  return createEvidenceRecord({
    ...input,
    recordKind: "relationship",
    evidenceKind: input.evidenceKind || "public-report",
    extra: {
      fromId: String(input.fromId || ""),
      toId: String(input.toId || ""),
      edgeType: EDGE_TYPES.includes(input.edgeType) ? input.edgeType : "affects",
      assertionClass: ASSERTION_CLASSES.includes(input.assertionClass) ? input.assertionClass : "heuristic",
      scope: input.scope || null,
      ...(input.extra || {}),
    },
  }, now);
}

export function createAssessmentRecord(input = {}, now = new Date()) {
  return createEvidenceRecord({
    ...input,
    recordKind: "assessment",
    evidenceKind: input.evidenceKind || "public-report",
    extra: {
      policyId: input.policyId || null,
      policyVersion: input.policyVersion || null,
      baselineVersion: input.baselineVersion || null,
      dataVintage: input.dataVintage || null,
      evaluationTime: isoOrNull(input.evaluationTime) || now.toISOString(),
      result: input.result || null,
      reasons: Array.isArray(input.reasons) ? input.reasons : [],
      inputIds: Array.isArray(input.inputIds) ? input.inputIds.map(String) : [],
      transitions: Array.isArray(input.transitions) ? input.transitions : [],
      ...(input.extra || {}),
    },
  }, now);
}

export function validateGeometry(geometry, { approximate = false } = {}) {
  if (!geometry) return { valid: approximate, errors: approximate ? [] : ["missing geometry"] };
  const type = geometry.type;
  if (type === "Point") {
    const [lon, lat] = geometry.coordinates || [];
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      return { valid: false, errors: ["invalid point coordinates"] };
    }
    return { valid: true, errors: [] };
  }
  if (type === "Polygon" || type === "MultiPolygon") {
    const polygons = type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
    if (!Array.isArray(polygons) || !polygons.length) return { valid: false, errors: ["empty polygon"] };
    for (const rings of polygons) {
      const ring = rings?.[0];
      if (!Array.isArray(ring) || ring.length < 4) return { valid: false, errors: ["polygon ring too short"] };
      for (const pair of ring) {
        if (!Number.isFinite(pair?.[0]) || !Number.isFinite(pair?.[1])) return { valid: false, errors: ["non-numeric polygon vertex"] };
      }
    }
    return { valid: true, errors: [] };
  }
  if (type === "LineString") {
    if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2) return { valid: false, errors: ["line too short"] };
    return { valid: true, errors: [] };
  }
  return { valid: false, errors: [`unsupported geometry type ${type}`] };
}

export function validateEvidenceRecord(record) {
  const errors = [];
  if (!record?.id) errors.push("missing id");
  if (!RECORD_KINDS.includes(record?.recordKind)) errors.push("invalid recordKind");
  if (record?.evidenceKind && !EVIDENCE_KINDS.includes(record.evidenceKind)) errors.push("invalid evidenceKind");
  if (record?.subjectDomain && !SUBJECT_DOMAINS.includes(record.subjectDomain)) errors.push("invalid subjectDomain");
  if (record?.valueOrigin && !VALUE_ORIGINS.includes(record.valueOrigin)) errors.push("invalid valueOrigin");
  if (record?.sourceUrl && !HTTPS.test(record.sourceUrl)) errors.push("sourceUrl must use HTTPS");
  if (record?.lat != null && record?.lon != null) {
    if (!Number.isFinite(record.lat) || !Number.isFinite(record.lon)) errors.push("non-finite coordinates");
    else if (Math.abs(record.lat) > 90 || Math.abs(record.lon) > 180) errors.push("coordinates out of range");
  }
  if (record?.geometry) {
    const geometry = validateGeometry(record.geometry, { approximate: record.geometryPrecision === "approximate" });
    if (!geometry.valid) errors.push(...geometry.errors);
  }
  if (record?.recordKind === "relationship") {
    if (!EDGE_TYPES.includes(record.extra?.edgeType)) errors.push("invalid edgeType");
    if (!record.extra?.fromId || !record.extra?.toId) errors.push("relationship requires fromId and toId");
  }
  return { valid: errors.length === 0, errors };
}

export function recordsKnownBy(records = [], asOf) {
  if (!asOf) return records.slice();
  const cutoff = new Date(asOf).getTime();
  if (!Number.isFinite(cutoff)) return records.slice();
  return records.filter((record) => {
    const known = new Date(record.retrievedAt || record.reportedAt || 0).getTime();
    return Number.isFinite(known) && known <= cutoff;
  });
}

export function occurredBy(records = [], asOf) {
  if (!asOf) return records.slice();
  const cutoff = new Date(asOf).getTime();
  return records.filter((record) => {
    const occurred = new Date(record.observedAt || record.effectiveStart || record.reportedAt || 0).getTime();
    return Number.isFinite(occurred) && occurred <= cutoff;
  });
}

export function uniqueOriginKeys(records = []) {
  const groups = [];
  for (const record of records) {
    const observation = {
      id: record.id,
      sourceOrganizationId: record.sourceOrganizationId,
      canonicalUrl: record.canonicalUrl,
      url: record.sourceUrl,
      syndication: record.syndication,
    };
    if (groups.every((existing) => sourceIndependence(existing, observation).independent)) groups.push(observation);
  }
  return groups.map((item) => item.id);
}

function hashString(value) {
  let hash = 0;
  const text = String(value);
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  return hash;
}
