import { CATEGORIES, SEVERITIES } from "../config.js";

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

export function safeCategory(category) {
  return CATEGORIES[category] ? category : "other";
}

export function safeSeverity(severity) {
  return SEVERITIES[severity] ? severity : "low";
}

export function normalizeEvent(event) {
  const sourceName = event.sourceName || event.source || event.providerName || "Unknown source";
  return {
    ...event,
    category: safeCategory(event.category),
    severity: safeSeverity(event.severity),
    occurredAt: Number(event.occurredAt || Date.now()),
    updatedAt: Number(event.updatedAt || event.occurredAt || Date.now()),
    lat: Number(event.lat ?? event.latitude),
    lon: Number(event.lon ?? event.longitude),
    confidence: Number(event.confidence || 80),
    source: sourceName,
    sourceName,
    sourceType: event.sourceType || "Unknown",
    verificationStatus: event.verificationStatus || "Single source",
    coordinateMethod: event.coordinateMethod || "provider coordinates",
    details: event.details || {},
  };
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
