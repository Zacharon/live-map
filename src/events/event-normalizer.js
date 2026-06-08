import { CATEGORIES, SEVERITIES } from "../config.js";
import { computeQualityDimensions } from "./event-quality.js";
import { classifyEvent } from "./taxonomy.js";

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

export function safeCategory(category) {
  return CATEGORIES[category] ? category : "other";
}

export function safeSeverity(severity) {
  return SEVERITIES[severity] ? severity : "low";
}

function timestampMs(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
    const parsed = new Date(value).getTime();
    if (Number.isFinite(parsed)) return parsed;
  }
  return Date.now();
}

export function normalizeEvent(event) {
  const sourceName = event.sourceName || event.source || event.providerName || "Unknown source";
  const severityKey = event.uiSeverity || event.severityLabel || event.severity;
  const occurredAt = timestampMs(event.occurredAt, event.startedAt, event.sourcePublishedAt);
  const updatedAt = timestampMs(event.updatedAt, event.updatedAtIso, event.startedAt, occurredAt);
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
    severity: safeSeverity(severityKey === "moderate" ? "medium" : severityKey),
    severityScore: Number(event.severityScore ?? (typeof event.severity === "number" ? event.severity : 0)),
    occurredAt,
    updatedAt,
    lat: Number(event.lat ?? event.latitude),
    lon: Number(event.lon ?? event.longitude),
    confidence: Number(event.confidence || 80),
    source: sourceName,
    sourceName,
    sourceType: event.sourceType || "Unknown",
    verificationStatus: event.verificationStatus || "Single source",
    coordinateMethod: event.coordinateMethod || "provider coordinates",
    details: event.details || {},
    place: event.place || event.locationName || event.countryName || "Unknown location",
    country: event.country || event.countryName || "Multiple/unknown",
  };
  const quality = computeQualityDimensions(normalized);
  const { severity: qualitySeverity, ...qualityRest } = quality;
  return { ...normalized, qualitySeverity, ...qualityRest };
}

export function relativeTime(timestamp, now = Date.now()) {
  const delta = Math.max(0, now - Number(timestamp));
  const minutes = Math.floor(delta / 60000);
  const hours = Math.floor(minutes / 60);
  if (minutes < 1) return "just now";
  if (hours < 1) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function exactTime(timestamp) {
  return new Date(timestamp).toLocaleString([], { dateStyle: "medium", timeStyle: "long" });
}
