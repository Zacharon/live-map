/**
 * Event Artifacts v1 — pure client-side OSINT artifact builders.
 * No DOM, fetch, localStorage, or mutation of input events/clusters.
 */

import { clusterKeyForEvent, findClusterById } from "../events/clustering.js";

export const ARTIFACT_SCHEMA_VERSION = "v1";
export const RELATED_EVENTS_MAX = 8;
export const CLUSTER_MEMBER_EXPORT_MAX = 20;
export const RELATED_TIME_WINDOW_MS = 24 * 3600 * 1000;

export const ANALYST_NOTES_V1 =
  "Analyst notes are read-only in v1. No editable case notes, reviews, or assessments are stored. Editable notes ship with investigation-workspace-v1.";

export const ARTIFACT_CAVEATS_V1 = [
  "This artifact is a client-side snapshot of currently loaded Live Map data, not a permanent case file.",
  "Informational only — not emergency dispatch, legal advice, or operational guidance.",
  "Related events and clusters are heuristic groupings; false positives and false negatives are expected.",
  "Corroboration count is distinct source/provider labels among related or co-clustered events, not independent primary confirmation.",
  "Confidence describes trust in the record when provided by the platform; it is not a danger rating.",
  "When confidence shows \"Not scored in v1\", see methodology id source-confidence-v1; do not treat absence as zero risk or full trust.",
  "Source URLs and provider content remain under original rights; this export does not grant redistribution rights.",
  "Geography may be missing, generalized, or provider-estimated; non-geographic records must not be force-mapped.",
  "Timestamps reflect provider-reported or normalized values and may be revised upstream.",
  "Verification status and source tier, when present, are platform fields — not human-reviewed OSINT assessments.",
];

function asString(value, fallback = "") {
  if (value == null) return fallback;
  return String(value);
}

function asNullableString(value) {
  if (value == null || value === "") return null;
  return String(value);
}

function asTimestamp(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function asCoord(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function eventIdOf(event) {
  if (!event || typeof event !== "object") return "unknown-event";
  if (event.id) return String(event.id);
  if (event.providerId) return String(event.providerId);
  return "unknown-event";
}

function sourceKey(event) {
  const provider = asString(event?.provider || event?.providerName || "").trim().toLowerCase();
  if (provider) return provider;
  const name = asString(event?.sourceName || event?.source || "").trim().toLowerCase();
  if (name) return name;
  return "unknown";
}

function sourceNameOf(event) {
  return asNullableString(event?.sourceName || event?.providerName || event?.source || event?.provider);
}

function providerOf(event) {
  return asNullableString(event?.provider || event?.providerName);
}

function placeOf(event) {
  return asNullableString(event?.place || event?.locationName || event?.location);
}

function countryOf(event) {
  return asNullableString(event?.country || event?.countryName);
}

function domainOf(event) {
  return asNullableString(event?.domain);
}

function categoryOf(event) {
  return asNullableString(event?.category || event?.type);
}

function fieldEntry(key, label, value, valueType = "string") {
  const present = value !== null && value !== undefined && value !== "";
  return {
    key,
    label,
    value: present ? value : null,
    valueType,
    present: Boolean(present),
    source: "event",
  };
}

export function resolveConfidence(entity) {
  if (!entity || typeof entity !== "object") {
    return {
      mode: "not-scored",
      score: null,
      display: "Not scored in v1",
      note: "Confidence scoring is deferred to feature/source-confidence-v1.",
    };
  }
  const label = entity.confidenceLabel || entity.confidence_label;
  if (typeof label === "string" && label.trim()) {
    return {
      mode: "label",
      score: null,
      display: label.trim(),
      note: "Confidence is a record-quality label, not a danger rating.",
    };
  }
  const n = Number(entity.confidence);
  if (Number.isFinite(n)) {
    const score = Math.max(0, Math.min(100, n));
    return {
      mode: "numeric",
      score,
      display: `${Math.round(score)}%`,
      note: "Confidence describes trust in the record when provided by the platform; it is not a danger rating.",
    };
  }
  return {
    mode: "not-scored",
    score: null,
    display: "Not scored in v1",
    note: "Confidence scoring is deferred to feature/source-confidence-v1.",
  };
}

export function computeCorroboration(events = []) {
  const keys = new Set();
  for (const event of events) {
    if (!event) continue;
    keys.add(sourceKey(event));
  }
  const sourceKeys = [...keys].sort();
  const distinctSourceCount = sourceKeys.length;
  return {
    distinctSourceCount,
    sourceKeys,
    ruleId: "corroboration-count-v1",
    display: `${distinctSourceCount} distinct source${distinctSourceCount === 1 ? "" : "s"} (related/co-cluster)`,
  };
}

function findSubjectCluster(event, clusters = []) {
  if (!event) return null;
  if (event.clusterId) {
    const byId = findClusterById(clusters, event.clusterId);
    if (byId) return byId;
  }
  const key = clusterKeyForEvent(event);
  return clusters.find((cluster) => cluster.key === key) || null;
}

function relatedRef(event, matchReasons, matchScore) {
  return {
    eventId: eventIdOf(event),
    title: asString(event.title, "Untitled event"),
    occurredAt: asTimestamp(event.occurredAt),
    sourceName: sourceNameOf(event),
    provider: providerOf(event),
    country: countryOf(event),
    place: placeOf(event),
    category: categoryOf(event),
    domain: domainOf(event),
    clusterId: asNullableString(event.clusterId),
    matchReasons: [...matchReasons].sort(),
    matchScore,
  };
}

/**
 * Deterministic related-event discovery from in-memory data only.
 */
export function findRelatedEvents(event, allEvents = [], clusters = [], maxN = RELATED_EVENTS_MAX) {
  if (!event || typeof event !== "object") return [];
  const subjectId = eventIdOf(event);
  const subjectCluster = findSubjectCluster(event, clusters);
  const memberIds = new Set((subjectCluster?.events || []).map((item) => eventIdOf(item)));
  const subjectProvider = asString(event.provider || event.providerName || "").trim().toLowerCase();
  const subjectCountry = asString(countryOf(event) || "").trim().toLowerCase();
  const subjectPlace = asString(placeOf(event) || "").trim().toLowerCase();
  const subjectCategory = asString(categoryOf(event) || "").trim().toLowerCase();
  const subjectDomain = asString(domainOf(event) || "").trim().toLowerCase();
  const subjectTs = asTimestamp(event.occurredAt);

  const scored = [];
  for (const candidate of allEvents) {
    if (!candidate || typeof candidate !== "object") continue;
    const candidateId = eventIdOf(candidate);
    if (candidateId === subjectId) continue;

    const reasons = [];
    let score = 0;

    if (memberIds.has(candidateId)) {
      reasons.push("same-cluster");
      score += 40;
    }

    const candidateProvider = asString(candidate.provider || candidate.providerName || "").trim().toLowerCase();
    if (subjectProvider && candidateProvider && subjectProvider === candidateProvider) {
      reasons.push("same-provider");
      score += 15;
    }

    const candidateCountry = asString(countryOf(candidate) || "").trim().toLowerCase();
    const candidatePlace = asString(placeOf(candidate) || "").trim().toLowerCase();
    if (
      (subjectCountry && candidateCountry && subjectCountry === candidateCountry)
      || (subjectPlace && candidatePlace && subjectPlace === candidatePlace)
    ) {
      reasons.push("same-place");
      score += 15;
    }

    const candidateCategory = asString(categoryOf(candidate) || "").trim().toLowerCase();
    const candidateDomain = asString(domainOf(candidate) || "").trim().toLowerCase();
    if (
      (subjectCategory && candidateCategory && subjectCategory === candidateCategory)
      || (subjectDomain && candidateDomain && subjectDomain === candidateDomain)
    ) {
      reasons.push("same-category-domain");
      score += 15;
    }

    const candidateTs = asTimestamp(candidate.occurredAt);
    if (subjectTs != null && candidateTs != null && Math.abs(candidateTs - subjectTs) <= RELATED_TIME_WINDOW_MS) {
      reasons.push("close-time");
      score += 15;
    }

    if (!reasons.length) continue;
    scored.push(relatedRef(candidate, reasons, score));
  }

  scored.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    const at = a.occurredAt || 0;
    const bt = b.occurredAt || 0;
    if (bt !== at) return bt - at;
    return a.eventId.localeCompare(b.eventId);
  });

  return scored.slice(0, Math.max(0, maxN));
}

export function mapEventNormalizedFields(event) {
  if (!event || typeof event !== "object") {
    return [
      fieldEntry("id", "Event ID", null),
      fieldEntry("title", "Title", null),
    ];
  }
  const lat = asCoord(event.lat ?? event.latitude);
  const lon = asCoord(event.lon ?? event.longitude);
  const confidence = resolveConfidence(event);
  return [
    fieldEntry("id", "Event ID", eventIdOf(event)),
    fieldEntry("title", "Title", asString(event.title, "Untitled event")),
    fieldEntry("summary", "Summary", asNullableString(event.summary || event.description)),
    fieldEntry("occurred_at", "Occurred At", asTimestamp(event.occurredAt), "timestamp"),
    fieldEntry("updated_at", "Updated At", asTimestamp(event.updatedAt ?? event.occurredAt), "timestamp"),
    fieldEntry("lat", "Latitude", lat, "coord"),
    fieldEntry("lon", "Longitude", lon, "coord"),
    fieldEntry("geographic", "Geographic", event.geographic === false ? false : lat != null && lon != null, "boolean"),
    fieldEntry("place", "Place", placeOf(event)),
    fieldEntry("country", "Country", countryOf(event)),
    fieldEntry("severity", "Severity", asNullableString(event.severity), "enum"),
    fieldEntry("domain", "Domain", domainOf(event)),
    fieldEntry("domain_label", "Domain Label", asNullableString(event.domainLabel)),
    fieldEntry("category", "Category", categoryOf(event), "enum"),
    fieldEntry("type_label", "Type Label", asNullableString(event.typeLabel)),
    fieldEntry("source_name", "Source Name", sourceNameOf(event)),
    fieldEntry("source_url", "Source URL", asNullableString(event.sourceUrl), "url"),
    fieldEntry("provider", "Provider", providerOf(event)),
    fieldEntry("provider_id", "Provider ID", asNullableString(event.providerId || event.providerEventId)),
    fieldEntry("verification_status", "Verification", asNullableString(event.verificationStatus || event.verification)),
    fieldEntry("confidence_display", "Confidence", confidence.display),
    fieldEntry("cluster_id", "Cluster ID", asNullableString(event.clusterId)),
    fieldEntry("record_kind", "Record Kind", asNullableString(event.recordKind)),
    fieldEntry("source_tier", "Source Tier", asNullableString(event.sourceTier)),
  ];
}

function buildSourceAttribution(event) {
  return {
    sourceName: sourceNameOf(event),
    sourceUrl: asNullableString(event?.sourceUrl),
    provider: providerOf(event),
    providerUrl: asNullableString(event?.providerUrl),
    sourceType: asNullableString(event?.sourceType),
    sourceTier: asNullableString(event?.sourceTier),
    publisher: asNullableString(event?.publisher),
    verificationStatus: asNullableString(event?.verificationStatus || event?.verification),
  };
}

function resolveRelatedEventObjects(relatedRefs, allEvents) {
  const byId = new Map(allEvents.map((event) => [eventIdOf(event), event]));
  return relatedRefs.map((ref) => byId.get(ref.eventId)).filter(Boolean);
}

/**
 * @param {object} event
 * @param {{ allEvents?: object[], clusters?: object[], now?: number|string|Date, changeStatus?: string|null, relatedMax?: number }} [opts]
 */
export function buildEventArtifact(event, opts = {}) {
  const allEvents = Array.isArray(opts.allEvents) ? opts.allEvents : [];
  const clusters = Array.isArray(opts.clusters) ? opts.clusters : [];
  const now = opts.now != null ? new Date(opts.now) : new Date();
  const generatedAt = Number.isNaN(now.getTime()) ? new Date().toISOString() : now.toISOString();
  const relatedMax = Number.isFinite(opts.relatedMax) ? opts.relatedMax : RELATED_EVENTS_MAX;

  if (!event || typeof event !== "object") {
    return {
      schemaVersion: ARTIFACT_SCHEMA_VERSION,
      artifactType: "event",
      artifactId: "event-artifact:unknown",
      generatedAt,
      title: "Untitled event",
      eventId: "unknown-event",
      providerId: null,
      source: buildSourceAttribution(null),
      occurredAt: null,
      updatedAt: null,
      locationLabel: "Unknown",
      country: null,
      latitude: null,
      longitude: null,
      domain: null,
      category: null,
      typeLabel: null,
      severity: null,
      confidence: resolveConfidence(null),
      corroborationCount: 0,
      corroboration: computeCorroboration([]),
      relatedEvents: [],
      normalizedFields: mapEventNormalizedFields(null),
      analystNotes: ANALYST_NOTES_V1,
      limitations: [...ARTIFACT_CAVEATS_V1],
      caveats: [...ARTIFACT_CAVEATS_V1],
      context: { changeStatus: opts.changeStatus || null },
    };
  }

  const subjectCluster = findSubjectCluster(event, clusters);
  const relatedEvents = findRelatedEvents(event, allEvents, clusters, relatedMax);
  const relatedObjects = resolveRelatedEventObjects(relatedEvents, allEvents);
  const pool = [event, ...relatedObjects, ...(subjectCluster?.events || [])];
  const uniquePool = [];
  const seen = new Set();
  for (const item of pool) {
    const id = eventIdOf(item);
    if (seen.has(id)) continue;
    seen.add(id);
    uniquePool.push(item);
  }
  const corroboration = computeCorroboration(uniquePool);
  const lat = asCoord(event.lat ?? event.latitude);
  const lon = asCoord(event.lon ?? event.longitude);
  const place = placeOf(event);
  const country = countryOf(event);
  const locationLabel = event.geographic === false
    ? "No map location"
    : place || country || (lat != null && lon != null ? `${lat}, ${lon}` : "Location pending");

  const eventId = eventIdOf(event);
  return {
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    artifactType: "event",
    artifactId: `event-artifact:${eventId}`,
    generatedAt,
    title: asString(event.title, "Untitled event"),
    eventId,
    providerId: asNullableString(event.providerId || event.providerEventId),
    source: buildSourceAttribution(event),
    sourceName: sourceNameOf(event),
    sourceUrl: asNullableString(event.sourceUrl),
    providerName: providerOf(event),
    occurredAt: asTimestamp(event.occurredAt),
    updatedAt: asTimestamp(event.updatedAt ?? event.occurredAt),
    locationLabel,
    country,
    latitude: lat,
    longitude: lon,
    geographic: event.geographic === false ? false : lat != null && lon != null,
    domain: domainOf(event),
    domainLabel: asNullableString(event.domainLabel),
    category: categoryOf(event),
    typeLabel: asNullableString(event.typeLabel),
    severity: asNullableString(event.severity),
    confidence: resolveConfidence(event),
    corroborationCount: corroboration.distinctSourceCount,
    corroboration,
    relatedEvents,
    clusterId: asNullableString(subjectCluster?.clusterId || event.clusterId),
    normalizedFields: mapEventNormalizedFields(event),
    analystNotes: ANALYST_NOTES_V1,
    limitations: [...ARTIFACT_CAVEATS_V1],
    caveats: [...ARTIFACT_CAVEATS_V1],
    context: { changeStatus: opts.changeStatus || null },
  };
}

function mapClusterNormalizedFields(cluster, corroboration, confidence) {
  return [
    fieldEntry("cluster_id", "Cluster ID", asNullableString(cluster?.clusterId)),
    fieldEntry("event_count", "Event Count", Number(cluster?.eventCount) || 0, "number"),
    fieldEntry("domain", "Domain", asNullableString(cluster?.domain)),
    fieldEntry("domain_label", "Domain Label", asNullableString(cluster?.domainLabel)),
    fieldEntry("category", "Category", asNullableString(cluster?.category)),
    fieldEntry("type_label", "Type Label", asNullableString(cluster?.typeLabel)),
    fieldEntry("severity", "Severity", asNullableString(cluster?.severity), "enum"),
    fieldEntry("location_label", "Location", asNullableString(cluster?.locationLabel)),
    fieldEntry("started_at", "Started At", asTimestamp(cluster?.startedAt), "timestamp"),
    fieldEntry("ended_at", "Ended At", asTimestamp(cluster?.endedAt), "timestamp"),
    fieldEntry("source_count", "Source Count", Number(cluster?.sourceCount) || 0, "number"),
    fieldEntry("sources", "Sources", Array.isArray(cluster?.sources) ? cluster.sources.join(", ") : null),
    fieldEntry("corroboration_count", "Corroboration", corroboration.display),
    fieldEntry("confidence_display", "Confidence", confidence.display),
  ].map((entry) => ({ ...entry, source: "cluster" }));
}

/**
 * @param {object} cluster
 * @param {{ allEvents?: object[], now?: number|string|Date, memberMax?: number }} [opts]
 */
export function buildClusterArtifact(cluster, opts = {}) {
  const now = opts.now != null ? new Date(opts.now) : new Date();
  const generatedAt = Number.isNaN(now.getTime()) ? new Date().toISOString() : now.toISOString();
  const memberMax = Number.isFinite(opts.memberMax) ? opts.memberMax : CLUSTER_MEMBER_EXPORT_MAX;
  const members = Array.isArray(cluster?.events) ? cluster.events : [];

  if (!cluster || typeof cluster !== "object") {
    const emptyCorroboration = computeCorroboration([]);
    const emptyConfidence = resolveConfidence(null);
    return {
      schemaVersion: ARTIFACT_SCHEMA_VERSION,
      artifactType: "cluster",
      artifactId: "cluster-artifact:unknown",
      generatedAt,
      clusterId: "unknown-cluster",
      title: "Related cluster",
      eventCount: 0,
      domain: null,
      domainLabel: null,
      category: null,
      typeLabel: null,
      severity: null,
      severitySummary: null,
      startedAt: null,
      endedAt: null,
      locationLabel: null,
      locationSummary: null,
      sources: [],
      sourceCount: 0,
      providerSummary: "",
      representativeEvents: [],
      relatedEvents: [],
      memberEventIds: [],
      confidence: emptyConfidence,
      corroborationCount: 0,
      corroboration: emptyCorroboration,
      normalizedFields: mapClusterNormalizedFields(null, emptyCorroboration, emptyConfidence),
      analystNotes: ANALYST_NOTES_V1,
      limitations: [...ARTIFACT_CAVEATS_V1],
      caveats: [...ARTIFACT_CAVEATS_V1],
    };
  }

  const sortedMembers = [...members].sort((a, b) => {
    const at = asTimestamp(a?.occurredAt) || 0;
    const bt = asTimestamp(b?.occurredAt) || 0;
    if (bt !== at) return bt - at;
    return eventIdOf(a).localeCompare(eventIdOf(b));
  });

  const representativeEvents = sortedMembers.slice(0, memberMax).map((event) => relatedRef(event, ["cluster-member"], 100));
  const corroboration = computeCorroboration(members);
  const confidence = resolveClusterConfidence(members);
  const locationLabel = asNullableString(cluster.locationLabel) || "Location pending";
  const sources = Array.isArray(cluster.sources) ? [...cluster.sources] : [];
  const clusterId = asString(cluster.clusterId, "unknown-cluster");

  return {
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    artifactType: "cluster",
    artifactId: `cluster-artifact:${clusterId}`,
    generatedAt,
    clusterId,
    title: `Related cluster — ${locationLabel}`,
    attentionLabel: asNullableString(cluster.attentionLabel),
    eventCount: Number(cluster.eventCount) || members.length,
    domain: asNullableString(cluster.domain),
    domainLabel: asNullableString(cluster.domainLabel),
    category: asNullableString(cluster.category),
    typeLabel: asNullableString(cluster.typeLabel),
    severity: asNullableString(cluster.severity),
    severitySummary: asNullableString(cluster.severity),
    startedAt: asTimestamp(cluster.startedAt),
    endedAt: asTimestamp(cluster.endedAt),
    locationLabel,
    locationSummary: locationLabel,
    sources,
    sourceCount: Number(cluster.sourceCount) || sources.length,
    providerSummary: sources.join(", "),
    representativeEvents,
    relatedEvents: representativeEvents,
    memberEventIds: sortedMembers.map((event) => eventIdOf(event)),
    confidence,
    corroborationCount: corroboration.distinctSourceCount,
    corroboration,
    normalizedFields: mapClusterNormalizedFields(cluster, corroboration, confidence),
    analystNotes: ANALYST_NOTES_V1,
    limitations: [...ARTIFACT_CAVEATS_V1],
    caveats: [...ARTIFACT_CAVEATS_V1],
  };
}

function resolveClusterConfidence(members) {
  const scores = members
    .map((event) => Number(event?.confidence))
    .filter((n) => Number.isFinite(n));
  if (!scores.length) return resolveConfidence(null);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (min === max) {
    return {
      mode: "numeric",
      score: min,
      display: `${Math.round(min)}% (member)`,
      note: "Cluster confidence is a member-range summary, not an independent assessment.",
    };
  }
  return {
    mode: "label",
    score: null,
    display: `${Math.round(min)}–${Math.round(max)}% (member range)`,
    note: "Cluster confidence is a member-range summary, not an independent assessment. Full scoring is deferred to feature/source-confidence-v1.",
  };
}
