import { timestampMs, confidenceValue } from "./event-values.js";
import { distanceKm } from "./event-deduplication.js";
import { stableStringHash } from "./normalized-event.js";

function compatible(a, b) {
  return (a.type || a.category) === (b.type || b.category) || a.domain === b.domain;
}

function titleWords(event) {
  return new Set(String(event.title || "").toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3));
}

function overlap(a, b) {
  const left = titleWords(a);
  const right = titleWords(b);
  if (!left.size || !right.size) return 0;
  return [...left].filter((word) => right.has(word)).length / Math.max(left.size, right.size);
}

export function shouldCluster(a, b) {
  if (!compatible(a, b)) return false;
  const leftTime = timestampMs(a.occurredAt);
  const rightTime = timestampMs(b.occurredAt);
  if (leftTime === null || rightTime === null || Math.abs(leftTime - rightTime) > 24 * 3600000) return false;
  if (distanceKm(a, b) > 120) return false;
  return overlap(a, b) >= 0.25 || a.providerId === b.providerId;
}

export function buildIncidents(events) {
  const incidents = [];
  for (const event of events) {
    const existing = incidents.find((incident) => incident.events.some((candidate) => shouldCluster(candidate, event)));
    if (existing) {
      existing.events.push(event);
    } else {
      incidents.push({ events: [event] });
    }
  }
  return incidents.map((incident) => {
    const eventsInIncident = incident.events;
    const primary = eventsInIncident[0];
    const incidentId = `incident-${stableStringHash(eventsInIncident.map((event) => `${event.type}:${event.country}:${event.title}`).join("|"))}`;
    const occurrences = eventsInIncident.map((event) => timestampMs(event.occurredAt)).filter((value) => value !== null);
    const updates = eventsInIncident.map((event) => timestampMs(event.updatedAt)).filter((value) => value !== null);
    const confidences = eventsInIncident.map((event) => confidenceValue(event.confidence)).filter((value) => value !== null);
    const lastUpdatedAt = updates.length ? Math.max(...updates) : null;
    return {
      incidentId,
      title: primary.title,
      domain: primary.domain,
      category: primary.taxonomyCategory || primary.category,
      type: primary.type,
      status: primary.status || "unknown",
      startedAt: occurrences.length ? Math.min(...occurrences) : null,
      lastUpdatedAt,
      primaryLocation: { lat: primary.lat, lon: primary.lon, label: primary.place },
      affectedArea: primary.region || primary.country,
      eventIds: eventsInIncident.map((event) => event.id),
      providerIds: [...new Set(eventsInIncident.map((event) => event.provider || event.sourceName))],
      independentSourceCount: Math.max(...eventsInIncident.map((event) => Number(event.independentSourceCount || 1))),
      confidence: confidences.length ? Math.max(...confidences) : null,
      severity: Math.max(...eventsInIncident.map((event) => Number(event.severityScore || 0))),
      timeline: eventsInIncident
        .map((event) => ({ eventId: event.id, title: event.title, occurredAt: event.occurredAt, provider: event.provider || event.sourceName }))
        .sort((a, b) => a.occurredAt - b.occurredAt),
      events: eventsInIncident,
    };
  });
}

export function annotateIncidents(events) {
  const incidents = buildIncidents(events);
  const byEvent = new Map();
  for (const incident of incidents) {
    for (const eventId of incident.eventIds) byEvent.set(eventId, incident);
  }
  return {
    incidents,
    events: events.map((event) => {
      const incident = byEvent.get(event.id);
      return incident ? { ...event, incidentId: incident.incidentId, incidentTitle: incident.title, incidentSize: incident.eventIds.length } : event;
    }),
  };
}
