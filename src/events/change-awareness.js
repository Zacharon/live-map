import { roundCoordinate } from "./clustering.js";
import { stableStringHash } from "./normalized-event.js";

export const CHANGE_AWARENESS_STORAGE_KEY = "live-map:change-awareness:v1";
export const CHANGE_AWARENESS_SCHEMA_VERSION = 1;

export function getStorage(storageOverride = undefined) {
  if (storageOverride !== undefined) return storageOverride;
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    // Private mode or blocked storage.
  }
  return null;
}

export function eventSignature(event) {
  if (!event || typeof event !== "object") {
    return {
      id: "",
      title: "",
      occurredAt: 0,
      updatedAt: 0,
      severity: "low",
      domain: "",
      category: "other",
      source: "",
      lat: null,
      lon: null,
      place: "",
      country: "",
    };
  }
  const occurredAt = Number(event.occurredAt ?? 0);
  const updatedAt = Number(event.updatedAt ?? event.occurredAt ?? 0);
  return {
    id: event.id ? String(event.id) : event.providerId ? String(event.providerId) : "",
    title: String(event.title || ""),
    occurredAt: Number.isFinite(occurredAt) ? occurredAt : 0,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
    severity: String(event.severity || "low"),
    domain: String(event.domain || ""),
    category: String(event.category || event.type || "other"),
    source: String(event.sourceName || event.provider || event.source || ""),
    lat: roundCoordinate(event.lat),
    lon: roundCoordinate(event.lon),
    place: String(event.place || ""),
    country: String(event.country || ""),
  };
}

export function eventStableId(event) {
  if (!event || typeof event !== "object") return "unknown-event";
  if (event.id) return String(event.id);
  if (event.providerId) return String(event.providerId);
  return `derived-${stableStringHash(JSON.stringify(eventSignature(event)))}`;
}

export function hashEventSignature(event) {
  return stableStringHash(JSON.stringify(eventSignature(event)));
}

export function clusterSnapshotSignature(cluster) {
  if (!cluster) return "unknown-cluster";
  const memberIds = (cluster.events || []).map((event) => eventStableId(event)).sort();
  return stableStringHash(`${cluster.clusterId}|${cluster.eventCount}|${cluster.severity}|${memberIds.join(",")}`);
}

export function buildSnapshotFromEvents(events = [], clusters = [], now = Date.now()) {
  const eventEntries = {};
  for (const event of events) {
    const id = eventStableId(event);
    const sig = eventSignature(event);
    eventEntries[id] = {
      signature: hashEventSignature(event),
      occurredAt: sig.occurredAt,
      updatedAt: sig.updatedAt,
      severity: sig.severity,
      category: sig.category,
      source: sig.source,
    };
  }
  const clusterEntries = {};
  for (const cluster of clusters) {
    clusterEntries[cluster.clusterId] = {
      signature: clusterSnapshotSignature(cluster),
      eventCount: cluster.eventCount,
      severity: cluster.severity,
    };
  }
  return {
    schemaVersion: CHANGE_AWARENESS_SCHEMA_VERSION,
    savedAt: now,
    eventCount: Object.keys(eventEntries).length,
    events: eventEntries,
    clusters: clusterEntries,
  };
}

export function parseSnapshot(raw) {
  if (!raw) return null;
  try {
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!data || typeof data !== "object") return null;
    if (data.schemaVersion !== CHANGE_AWARENESS_SCHEMA_VERSION) return null;
    if (!data.events || typeof data.events !== "object") return null;
    if (!Number.isFinite(Number(data.savedAt))) return null;
    return {
      schemaVersion: CHANGE_AWARENESS_SCHEMA_VERSION,
      savedAt: Number(data.savedAt),
      eventCount: Number(data.eventCount) || Object.keys(data.events).length,
      events: data.events,
      clusters: data.clusters && typeof data.clusters === "object" ? data.clusters : {},
    };
  } catch {
    return null;
  }
}

export function loadSnapshotWithMeta(storage = getStorage()) {
  if (!storage) return { snapshot: null, corrupt: false, unavailable: true };
  try {
    const raw = storage.getItem(CHANGE_AWARENESS_STORAGE_KEY);
    if (!raw) return { snapshot: null, corrupt: false, unavailable: false };
    const snapshot = parseSnapshot(raw);
    if (!snapshot) return { snapshot: null, corrupt: true, unavailable: false };
    return { snapshot, corrupt: false, unavailable: false };
  } catch {
    return { snapshot: null, corrupt: false, unavailable: true };
  }
}

export function loadSnapshot(storage = getStorage()) {
  return loadSnapshotWithMeta(storage).snapshot;
}

export function saveSnapshot(snapshot, storage = getStorage()) {
  if (!storage || !snapshot) return false;
  try {
    storage.setItem(CHANGE_AWARENESS_STORAGE_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

export function computeChangeSummary(events = [], previousSnapshot = null, clusters = []) {
  const summary = {
    hasPreviousSnapshot: Boolean(previousSnapshot),
    corruptSnapshot: false,
    storageUnavailable: false,
    lastSeenAt: previousSnapshot?.savedAt ?? null,
    newEvents: [],
    updatedEvents: [],
    unchangedEvents: [],
    removedEventIds: [],
    newClusters: [],
    changedClusters: [],
  };

  if (!previousSnapshot) return summary;

  const previousEvents = previousSnapshot.events || {};
  const previousClusters = previousSnapshot.clusters || {};
  const currentIds = new Set();

  for (const event of events) {
    const id = eventStableId(event);
    currentIds.add(id);
    const previous = previousEvents[id];
    const currentHash = hashEventSignature(event);
    if (!previous) {
      summary.newEvents.push(event);
    } else if (previous.signature !== currentHash) {
      summary.updatedEvents.push(event);
    } else {
      summary.unchangedEvents.push(event);
    }
  }

  for (const previousId of Object.keys(previousEvents)) {
    if (!currentIds.has(previousId)) summary.removedEventIds.push(previousId);
  }

  const seenClusterIds = new Set();
  for (const cluster of clusters) {
    seenClusterIds.add(cluster.clusterId);
    const previous = previousClusters[cluster.clusterId];
    const currentSignature = clusterSnapshotSignature(cluster);
    if (!previous) {
      summary.newClusters.push(cluster);
    } else if (previous.signature !== currentSignature) {
      summary.changedClusters.push(cluster);
    }
  }

  return summary;
}

export function buildChangeStatusMap(summary) {
  const map = new Map();
  if (!summary) return map;
  for (const event of summary.newEvents || []) map.set(eventStableId(event), "new");
  for (const event of summary.updatedEvents || []) map.set(eventStableId(event), "updated");
  return map;
}

export function topChangedEvents(summary, limit = 6) {
  if (!summary) return [];
  const combined = [...(summary.newEvents || []), ...(summary.updatedEvents || [])];
  const seen = new Set();
  const unique = [];
  for (const event of combined) {
    const id = eventStableId(event);
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(event);
  }
  return unique.slice(0, limit);
}