/**
 * Event Connections v0 — in-memory relationship discovery.
 * Reuses artifact related-event scoring for a single source of truth.
 */

import { findRelatedEvents, RELATED_EVENTS_MAX } from "../artifacts/event-artifacts.js";
import { findClusterById, clusterKeyForEvent } from "../events/clustering.js";

export const CONNECTIONS_MAX = 10;

function eventIdOf(event) {
  if (!event || typeof event !== "object") return "";
  if (event.id) return String(event.id);
  if (event.providerId) return String(event.providerId);
  return "";
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean).map((v) => String(v).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function titleTokens(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4);
}

/**
 * Optional deterministic keyword boost for already-related candidates.
 */
function keywordOverlapScore(a, b) {
  const ta = new Set(titleTokens(a?.title));
  const tb = titleTokens(b?.title);
  if (!ta.size || !tb.length) return 0;
  let hits = 0;
  for (const t of tb) {
    if (ta.has(t)) hits += 1;
  }
  return hits >= 2 ? 8 : hits === 1 ? 3 : 0;
}

function resolveSubjectCluster(event, clusters = []) {
  if (!event) return null;
  if (event.clusterId) {
    const byId = findClusterById(clusters, event.clusterId);
    if (byId) return byId;
  }
  const key = clusterKeyForEvent(event);
  return clusters.find((c) => c.key === key) || null;
}

/**
 * @param {object|null} event
 * @param {{ allEvents?: object[], clusters?: object[], max?: number }} [opts]
 */
export function buildEventConnections(event, opts = {}) {
  const allEvents = Array.isArray(opts.allEvents) ? opts.allEvents : [];
  const clusters = Array.isArray(opts.clusters) ? opts.clusters : [];
  const max = Number.isFinite(opts.max) ? opts.max : CONNECTIONS_MAX;

  const empty = {
    relatedEvents: [],
    entities: {
      countries: [],
      places: [],
      providers: [],
      domains: [],
      categories: [],
    },
    summary: "No connected events in the current in-memory view.",
    subjectClusterId: null,
    patternHint: "one-off",
  };

  if (!event || typeof event !== "object") return empty;

  const relatedRaw = findRelatedEvents(event, allEvents, clusters, Math.max(max, RELATED_EVENTS_MAX));
  const byId = new Map(allEvents.map((e) => [eventIdOf(e), e]));

  const relatedEvents = relatedRaw.map((ref) => {
    const full = byId.get(ref.eventId);
    const boost = keywordOverlapScore(event, full || ref);
    const relationScore = (ref.matchScore || 0) + boost;
    const relationReasons = [...(ref.matchReasons || [])];
    if (boost >= 8) relationReasons.push("title-keywords");
    else if (boost >= 3 && !relationReasons.includes("title-keywords")) relationReasons.push("title-keywords");
    return {
      eventId: ref.eventId,
      title: ref.title || full?.title || "Untitled event",
      relationScore,
      relationReasons: [...new Set(relationReasons)].sort(),
      occurredAt: ref.occurredAt ?? full?.occurredAt ?? null,
      provider: ref.provider || full?.provider || null,
      sourceName: ref.sourceName || full?.sourceName || null,
      severity: full?.severity || null,
      country: ref.country || full?.country || null,
      place: ref.place || full?.place || null,
      domain: ref.domain || full?.domain || null,
      category: ref.category || full?.category || null,
    };
  });

  relatedEvents.sort((a, b) => {
    if (b.relationScore !== a.relationScore) return b.relationScore - a.relationScore;
    const at = Number(a.occurredAt) || 0;
    const bt = Number(b.occurredAt) || 0;
    if (bt !== at) return bt - at;
    return String(a.eventId).localeCompare(String(b.eventId));
  });

  const capped = relatedEvents.slice(0, max);
  const subjectCluster = resolveSubjectCluster(event, clusters);

  const entityPool = [event, ...capped.map((r) => byId.get(r.eventId)).filter(Boolean)];
  const entities = {
    countries: uniqueSorted(entityPool.map((e) => e.country || e.countryName)),
    places: uniqueSorted(entityPool.map((e) => e.place || e.locationName || e.location)),
    providers: uniqueSorted(entityPool.map((e) => e.provider || e.providerName || e.sourceName)),
    domains: uniqueSorted(entityPool.map((e) => e.domainLabel || e.domain)),
    categories: uniqueSorted(entityPool.map((e) => e.category || e.type)),
  };

  let summary;
  let patternHint = "one-off";
  if (!capped.length) {
    summary = "No connected events in the current filtered view — may be a one-off under these filters.";
    patternHint = "one-off";
  } else if (subjectCluster && subjectCluster.eventCount >= 2) {
    patternHint = "cluster-pattern";
    summary = `${capped.length} related event${capped.length === 1 ? "" : "s"} linked via cluster/region/category heuristics (${subjectCluster.eventCount} in cluster).`;
  } else {
    patternHint = "related";
    const top = capped[0]?.relationReasons?.slice(0, 2).join(", ") || "shared attributes";
    summary = `${capped.length} related event${capped.length === 1 ? "" : "s"} (${top}). Heuristic links only — not a confirmed single incident.`;
  }

  return {
    relatedEvents: capped,
    entities,
    summary,
    subjectClusterId: subjectCluster?.clusterId || null,
    patternHint,
  };
}

/**
 * @param {object|null} cluster
 * @param {{ allEvents?: object[], max?: number }} [opts]
 */
export function buildClusterConnections(cluster, opts = {}) {
  const members = Array.isArray(cluster?.events) ? cluster.events : [];
  const max = Number.isFinite(opts.max) ? opts.max : CONNECTIONS_MAX;
  if (!members.length) {
    return {
      relatedEvents: [],
      entities: { countries: [], places: [], providers: [], domains: [], categories: [] },
      summary: "Cluster has no member events in the current view.",
      subjectClusterId: cluster?.clusterId || null,
      patternHint: "empty",
    };
  }

  const representative = members[0];
  const connections = buildEventConnections(representative, {
    allEvents: opts.allEvents || members,
    clusters: cluster ? [cluster] : [],
    max,
  });

  // Prefer member list as primary related set for clusters
  const memberRefs = members
    .filter((e) => eventIdOf(e) !== eventIdOf(representative))
    .map((e) => ({
      eventId: eventIdOf(e),
      title: e.title || "Untitled event",
      relationScore: 100,
      relationReasons: ["cluster-member"],
      occurredAt: e.occurredAt ?? null,
      provider: e.provider || null,
      sourceName: e.sourceName || null,
      severity: e.severity || null,
      country: e.country || null,
      place: e.place || null,
      domain: e.domain || null,
      category: e.category || null,
    }))
    .sort((a, b) => {
      const at = Number(a.occurredAt) || 0;
      const bt = Number(b.occurredAt) || 0;
      if (bt !== at) return bt - at;
      return String(a.eventId).localeCompare(String(b.eventId));
    })
    .slice(0, max);

  return {
    ...connections,
    relatedEvents: memberRefs.length ? memberRefs : connections.relatedEvents,
    summary: `Cluster with ${members.length} member events across ${cluster.sourceCount || connections.entities.providers.length} source(s).`,
    subjectClusterId: cluster.clusterId || null,
    patternHint: "cluster-pattern",
  };
}
