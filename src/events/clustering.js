import { SEVERITIES } from "../config.js";
import { stableStringHash } from "./normalized-event.js";

const CLUSTER_TIME_MS = 24 * 3600000;

export function roundCoordinate(value, precision = 1) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function geoCellForEvent(event) {
  const domain = event.domain || "unknown";
  const category = event.category || event.type || "other";
  if (event.geographic === false) return `nogeo:${domain}:${category}`;
  const lat = roundCoordinate(event.lat);
  const lon = roundCoordinate(event.lon);
  if (lat === null || lon === null) return `nogeo:${domain}:${category}`;
  return `geo:${domain}:${category}:${lat}:${lon}`;
}

export function timeCellForEvent(event) {
  const ts = Number(event?.occurredAt ?? 0);
  if (!Number.isFinite(ts) || ts <= 0) return "unknown";
  return String(Math.floor(ts / CLUSTER_TIME_MS));
}

export function clusterKeyForEvent(event) {
  return `${geoCellForEvent(event)}|${timeCellForEvent(event)}`;
}

function severityScore(event) {
  return SEVERITIES[event.severity]?.score ?? 0;
}

function dominantSeverity(events) {
  let best = "low";
  let bestScore = 0;
  for (const event of events) {
    const score = severityScore(event);
    if (score > bestScore) {
      bestScore = score;
      best = event.severity || "low";
    }
  }
  return best;
}

function attentionLabel(severity, count) {
  if (count >= 5 && ["critical", "high"].includes(severity)) return "High attention";
  if (count >= 3 && ["critical", "high", "medium"].includes(severity)) return "Worth review";
  return "Related group";
}

export function clusterMemberIds(cluster) {
  return (cluster?.events || []).map((event) => event.id);
}

export function clusterGeographicBounds(cluster) {
  const coords = (cluster?.events || [])
    .filter((event) => event.geographic !== false && Number.isFinite(event.lat) && Number.isFinite(event.lon))
    .map((event) => [event.lat, event.lon]);
  if (!coords.length) return null;
  const lats = coords.map(([lat]) => lat);
  const lons = coords.map(([, lon]) => lon);
  return {
    south: Math.min(...lats),
    north: Math.max(...lats),
    west: Math.min(...lons),
    east: Math.max(...lons),
    center: [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lons) + Math.max(...lons)) / 2],
    count: coords.length,
  };
}

export function findClusterById(clusters, clusterId) {
  if (!clusterId) return null;
  return clusters.find((cluster) => cluster.clusterId === clusterId) || null;
}

export function buildEventClusters(events = []) {
  const buckets = new Map();
  for (const event of events) {
    const key = clusterKeyForEvent(event);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(event);
  }
  const clusters = [];
  for (const [key, members] of buckets.entries()) {
    if (members.length < 2) continue;
    const sorted = [...members].sort((a, b) => Number(b.occurredAt || 0) - Number(a.occurredAt || 0));
    const primary = sorted[0];
    const timestamps = sorted.map((event) => Number(event.occurredAt || 0)).filter((value) => value > 0);
    const sources = [...new Set(sorted.map((event) => event.sourceName || event.provider || "Unknown"))];
    const severity = dominantSeverity(sorted);
    const clusterId = `cluster-${stableStringHash(key)}`;
    clusters.push({
      clusterId,
      key,
      eventCount: sorted.length,
      domain: primary.domain || "unknown",
      domainLabel: primary.domainLabel || primary.domain || "Unknown",
      category: primary.category || primary.type || "other",
      typeLabel: primary.typeLabel || primary.category || "Event",
      startedAt: timestamps.length ? Math.min(...timestamps) : null,
      endedAt: timestamps.length ? Math.max(...timestamps) : null,
      locationLabel: primary.geographic === false
        ? "No map location"
        : primary.place || primary.country || `${roundCoordinate(primary.lat)}, ${roundCoordinate(primary.lon)}`,
      sources,
      sourceCount: sources.length,
      severity,
      attentionLabel: attentionLabel(severity, sorted.length),
      events: sorted,
    });
  }
  return clusters.sort((a, b) => b.eventCount - a.eventCount || severityScore({ severity: b.severity }) - severityScore({ severity: a.severity }));
}