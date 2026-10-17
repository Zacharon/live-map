import { CATEGORIES, SEVERITIES } from "../config.js";
import { computeQualityDimensions } from "./event-quality.js";
import { classifyEvent } from "./taxonomy.js";
import { safeSourceUrl } from "../sources/source-url.js";
import { finiteNumber, nullableScore, timestampMs, validCoordinates } from "./value-semantics.js";

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

export { safeSourceUrl };

export function safeCategory(category) {
  return CATEGORIES[category] ? category : "other";
}

export function safeSeverity(severity) {
  return SEVERITIES[severity] ? severity : "low";
}

function firstTimestamp(...values) {
  for (const value of values) {
    const parsed = timestampMs(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

export function normalizeEvent(event) {
  const rawLat=event.lat ?? event.latitude, rawLon=event.lon ?? event.longitude;
  const coordinatesPresent = validCoordinates(rawLat, rawLon);
  const sourceName = event.sourceName || event.source || event.providerName || "Unknown source";
  const severityKey = event.uiSeverity || event.severityLabel || event.severity;
  const occurredAt = firstTimestamp(event.occurredAt, event.startedAt);
  const updatedAt = firstTimestamp(event.updatedAt, event.updatedAtIso);
  const taxonomy = classifyEvent(event);
  const normalized = {
    ...event,
    category: safeCategory(event.category),
    domain: event.domain || taxonomy.domain,
    domainLabel: event.domainLabel || taxonomy.domainLabel,
    taxonomyCategory: event.taxonomyCategory || taxonomy.category,
    categoryLabel: event.categoryLabel || taxonomy.categoryLabel,
    type: event.type || taxonomy.type,
    typeLabel: event.typeLabel || taxonomy.typeLabel,
    subtype: event.subtype || taxonomy.subtype,
    taxonomyColor: event.taxonomyColor || taxonomy.color,
    recordKind: event.recordKind || "event",
    severity: safeSeverity(severityKey === "moderate" ? "medium" : severityKey),
    severityScore: Number(event.severityScore ?? (typeof event.severity === "number" ? event.severity : 0)),
    occurredAt,
    updatedAt,
    lat: coordinatesPresent ? finiteNumber(rawLat) : null,
    lon: coordinatesPresent ? finiteNumber(rawLon) : null,
    geographic: event.geographic !== false && coordinatesPresent,
    mapDisplayStatus: event.geographic === false || !coordinatesPresent ? "not-mapped" : "mapped",
    nonGeographicReason: event.nonGeographicReason || null,
    confidence: nullableScore(event.confidence),
    source: sourceName,
    sourceName,
    sourceUrl: safeSourceUrl(event.sourceUrl),
    providerUrl: safeSourceUrl(event.providerUrl),
    sourceType: event.sourceType || "Unknown",
    sourceTier: event.sourceTier || null,
    publisher: event.publisher || sourceName,
    language: event.language || null,
    verification: event.verification || null,
    publicationPolicy: event.publicationPolicy || null,
    clusterId: event.clusterId || null,
    verificationStatus: event.verificationStatus || "unverified",
    coordinateMethod: event.coordinateMethod || "Precision not supplied",
    details: event.details || {},
    place: event.place || event.locationName || event.countryName || "Unknown location",
    country: event.country || event.countryName || "Multiple/unknown",
  };
  const quality = computeQualityDimensions(normalized);
  const { severity: qualitySeverity, ...qualityRest } = quality;
  return { ...normalized, qualitySeverity, ...qualityRest };
}

export function relativeTime(timestamp, now = Date.now()) {
  const time = timestampMs(timestamp);
  if (time === null) return "Time unknown";
  if (time > now) return "Future-dated";
  const delta = now - time;
  const minutes = Math.floor(delta / 60000);
  const hours = Math.floor(minutes / 60);
  if (minutes < 1) return "just now";
  if (hours < 1) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function exactTime(timestamp) {
  const time = timestampMs(timestamp);
  return time === null ? "Not supplied" : new Date(time).toLocaleString([], { dateStyle: "medium", timeStyle: "long", timeZone: "UTC" });
}
