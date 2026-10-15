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
  if (Math.abs(Number(a.occurredAt || 0) - Number(b.occurredAt || 0)) > 24 * 3600000) return false;
  if (distanceKm(a, b) > 120) return false;
  return overlap(a, b) >= 0.25 || a.providerId === b.providerId;
}

export function buildIncidents(events) {
  const incidents = [];
  for (const event of events) {
    // A 120 km match cannot span more than 1.1 degrees of latitude. This cheap
    // rejection preserves the pair predicate and transitive incident behavior.
    const existing = incidents.find((incident) => (!Number.isFinite(event.lat) || !Number.isFinite(incident.minLat) || (event.lat>=incident.minLat-1.1 && event.lat<=incident.maxLat+1.1)) && incident.events.some((candidate) => shouldCluster(candidate, event)));
    if (existing) {
      existing.events.push(event);
      if(Number.isFinite(event.lat)){existing.minLat=Math.min(existing.minLat,event.lat);existing.maxLat=Math.max(existing.maxLat,event.lat);}
    } else {
      incidents.push({ events: [event],minLat:Number.isFinite(event.lat)?event.lat:NaN,maxLat:Number.isFinite(event.lat)?event.lat:NaN });
    }
  }
  return incidents.map((incident) => {
    const eventsInIncident = incident.events;
    const primary = eventsInIncident[0];
    const incidentId = `incident-${stableStringHash(eventsInIncident.map((event) => `${event.type}:${event.country}:${event.title}`).join("|"))}`;
    const lastUpdatedAt = Math.max(...eventsInIncident.map((event) => Number(event.updatedAt || event.occurredAt || 0)));
    return {
      incidentId,
      title: primary.title,
      domain: primary.domain,
      category: primary.taxonomyCategory || primary.category,
      type: primary.type,
      status: primary.status || "unknown",
      startedAt: Math.min(...eventsInIncident.map((event) => Number(event.occurredAt || 0))),
      lastUpdatedAt,
      primaryLocation: { lat: primary.lat, lon: primary.lon, label: primary.place },
      affectedArea: primary.region || primary.country,
      eventIds: eventsInIncident.map((event) => event.id),
      providerIds: [...new Set(eventsInIncident.map((event) => event.provider || event.sourceName))],
      independentSourceCount: Math.max(...eventsInIncident.map((event) => Number(event.independentSourceCount || 1))),
      confidence: Math.max(...eventsInIncident.map((event) => Number(event.confidence || 0))),
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
