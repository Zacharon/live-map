import { SEVERITIES } from "../config.js";
import { relativeTime } from "./event-normalizer.js";

export const SORT_OPTIONS = [
  ["newest-reported", "Newest reported"],
  ["newest-occurred", "Event occurrence time"],
  ["recently-updated", "Most recently updated"],
  ["highest-severity", "Highest severity"],
  ["highest-confidence", "Highest confidence"],
  ["most-corroborated", "Most corroborated"],
  ["highest-impact", "Highest potential impact"],
  ["source-freshness", "Source freshness"],
  ["country", "Country name"],
  ["distance", "Closest to selected location"],
];

export const GROUP_OPTIONS = [
  ["none", "No grouping"],
  ["domain", "Domain"],
  ["category", "Category"],
  ["type", "Event type"],
  ["country", "Country"],
  ["region", "Region"],
  ["severity", "Severity"],
  ["verification-status", "Verification status"],
  ["provider", "Provider"],
  ["record-kind", "Record kind"],
  ["hour", "Time period: hour"],
  ["day", "Time period: day"],
  ["incident", "Incident cluster"],
];

function stableTie(a, b) {
  return String(a.id).localeCompare(String(b.id));
}

function timestamp(event, key) {
  return Number(event[key] || 0);
}

export function sortEvents(events, sortBy = "highest-severity") {
  return [...events].sort((a, b) => {
    let result = 0;
    if (sortBy === "newest-reported") result = timestamp(b, "firstReportedAt") - timestamp(a, "firstReportedAt");
    else if (sortBy === "newest-occurred") result = timestamp(b, "occurredAt") - timestamp(a, "occurredAt");
    else if (sortBy === "recently-updated") result = timestamp(b, "updatedAt") - timestamp(a, "updatedAt");
    else if (sortBy === "highest-severity") result = Number(b.severityScore || SEVERITIES[b.severity]?.score || 0) - Number(a.severityScore || SEVERITIES[a.severity]?.score || 0);
    else if (sortBy === "highest-confidence") result = Number(b.confidence || 0) - Number(a.confidence || 0);
    else if (sortBy === "most-corroborated") result = Number(b.corroborationScore || 0) - Number(a.corroborationScore || 0);
    else if (sortBy === "highest-impact") result = Number(b.impactScore || 0) - Number(a.impactScore || 0);
    else if (sortBy === "source-freshness") result = Number(b.freshnessScore || 0) - Number(a.freshnessScore || 0);
    else if (sortBy === "country") result = String(a.country || "").localeCompare(String(b.country || ""));
    else if (sortBy === "distance") result = Number(a.distanceKm || 999999) - Number(b.distanceKm || 999999);
    if (result === 0) result = timestamp(b, "occurredAt") - timestamp(a, "occurredAt");
    if (result === 0) result = stableTie(a, b);
    return result;
  });
}

function keyFor(event, groupBy) {
  if (groupBy === "domain") return [event.domain || "other", event.domainLabel || "Other"];
  if (groupBy === "category") return [event.taxonomyCategory || event.domain || event.category || "other", event.categoryLabel || event.domainLabel || event.category || "Other"];
  if (groupBy === "type") return [event.type || event.category || "other", event.typeLabel || event.category || "Other"];
  if (groupBy === "country") return [event.country || "Multiple/unknown", event.country || "Multiple/unknown"];
  if (groupBy === "region") return [event.region || "Unknown region", event.region || "Unknown region"];
  if (groupBy === "severity") return [event.severity, event.severity];
  if (groupBy === "verification-status") return [event.verificationStatus || "single-source", event.verificationStatus || "single-source"];
  if (groupBy === "provider") return [event.provider || event.sourceName || "unknown", event.sourceName || event.provider || "Unknown provider"];
  if (groupBy === "record-kind") return [event.recordKind || "event", (event.recordKind || "event").replace(/-/g, " ")];
  if (groupBy === "incident") return [event.incidentId || "unclustered", event.incidentTitle || "Unclustered events"];
  if (groupBy === "hour") {
    const date = new Date(event.occurredAt);
    date.setMinutes(0, 0, 0);
    return [date.toISOString(), date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })];
  }
  if (groupBy === "day") {
    const date = new Date(event.occurredAt);
    date.setHours(0, 0, 0, 0);
    return [date.toISOString(), date.toLocaleDateString([], { dateStyle: "medium" })];
  }
  return ["all", "All events"];
}

export function groupEvents(events, groupBy = "none", providerWarnings = {}) {
  if (groupBy === "none") return [{ id: "all", label: "All events", events, stats: groupStats(events, providerWarnings) }];
  const groups = new Map();
  for (const event of events) {
    const [id, label] = keyFor(event, groupBy);
    if (!groups.has(id)) groups.set(id, { id, label, events: [] });
    groups.get(id).events.push(event);
  }
  return [...groups.values()].map((group) => ({ ...group, stats: groupStats(group.events, providerWarnings) }));
}

export function groupStats(events, providerWarnings = {}) {
  const newest = Math.max(...events.map((event) => Number(event.updatedAt || event.occurredAt || 0)), 0);
  const providerWarning = events.some((event) => providerWarnings[event.provider]?.ok === false || providerWarnings[event.provider]?.stale);
  return {
    total: events.length,
    highCount: events.filter((event) => ["critical", "high"].includes(event.severity)).length,
    newCount: events.filter((event) => Date.now() - Number(event.firstReportedAt || event.occurredAt) < 3600000).length,
    newestUpdate: newest ? relativeTime(newest) : "unknown",
    providerWarning,
  };
}
