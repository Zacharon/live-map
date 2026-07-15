import { STRATEGIC_CHOKEPOINTS } from "../data/strategic-chokepoints.js";

export const CHOKEPOINT_RELATIONSHIPS = ["inside", "nearby", "directly-references", "affects-adjacent-port", "affects-route", "infrastructure-impact", "security-impact", "weather-impact", "disaster-impact", "economic-impact", "humanitarian-impact", "possible-indirect-impact"];

const EARTH_RADIUS_KM = 6371;
const RELATIONSHIP_ORDER = ["directly-references", "inside", "affects-adjacent-port", "affects-route", "infrastructure-impact", "security-impact", "weather-impact", "disaster-impact", "economic-impact", "humanitarian-impact", "nearby", "possible-indirect-impact"];
const DOMAIN_RELATIONSHIP = {
  "conflict-security": "security-impact",
  weather: "weather-impact",
  "natural-disaster": "disaster-impact",
  "commodity-supply-chain": "economic-impact",
  "finance-markets": "economic-impact",
  humanitarian: "humanitarian-impact",
  infrastructure: "infrastructure-impact",
};

function textOf(event) {
  return [event.title, event.summary, event.description, event.place, event.locationName, event.country, event.countryName, ...(event.tags || []), ...Object.values(event.details || {})]
    .filter(Boolean).join(" ").toLowerCase();
}

function termsIn(text, terms = []) {
  return [...new Set(terms.filter((term) => term && new RegExp(`(^|[^a-z0-9])${String(term).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`, "i").test(text)))];
}

function haversineKm(a, b) {
  const toRad = (value) => value * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function pointInRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = ((yi > point.lat) !== (yj > point.lat)) && (point.lon < (xj - xi) * (point.lat - yi) / ((yj - yi) || Number.EPSILON) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function geometryContains(geometry, point) {
  if (!geometry || !point) return false;
  if (geometry.type === "Point") return haversineKm(point, { lon: geometry.coordinates[0], lat: geometry.coordinates[1] }) < 4;
  if (geometry.type === "Polygon") return pointInRing(point, geometry.coordinates[0]);
  return false;
}

function geometryDistanceKm(geometry, point, fallbackCenter) {
  if (!geometry || !point) return null;
  if (geometry.type === "Point") return haversineKm(point, { lon: geometry.coordinates[0], lat: geometry.coordinates[1] });
  const coordinates = geometry.type === "Polygon" ? geometry.coordinates[0] : geometry.coordinates;
  if (geometry.type === "Polygon" && geometryContains(geometry, point)) return 0;
  if (!Array.isArray(coordinates) || !coordinates.length) return fallbackCenter ? haversineKm(point, fallbackCenter) : null;
  return Math.min(...coordinates.map(([lon, lat]) => haversineKm(point, { lon, lat })));
}

function eventPoint(event) {
  const lat = Number(event.lat ?? event.latitude);
  const lon = Number(event.lon ?? event.longitude);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

function relationshipFor(event, reasons, matchedTerms, distanceKm) {
  if (matchedTerms.length) return "directly-references";
  if (reasons.includes("geometry-inside")) return "inside";
  if (reasons.includes("watched-port")) return "affects-adjacent-port";
  if (reasons.includes("watched-route")) return "affects-route";
  const domainRelationship = DOMAIN_RELATIONSHIP[event.domain];
  if (domainRelationship && (reasons.includes("geometry-nearby") || reasons.includes("location-alias"))) return domainRelationship;
  if (reasons.includes("geometry-nearby")) return "nearby";
  return distanceKm === null ? "possible-indirect-impact" : "possible-indirect-impact";
}

function confidenceFor({ reasons, matchedTerms, distanceKm, relationship }) {
  let score = 0;
  if (reasons.includes("geometry-inside")) score += 58;
  if (reasons.includes("geometry-nearby")) score += Math.max(16, 42 - Math.round(distanceKm || 0) / 4);
  if (matchedTerms.length) score += Math.min(38, 22 + matchedTerms.length * 8);
  if (reasons.includes("watched-port") || reasons.includes("watched-route")) score += 20;
  if (reasons.includes("domain-match")) score += 8;
  if (relationship === "possible-indirect-impact") score = Math.min(score || 22, 45);
  return Math.max(0, Math.min(100, score));
}

export function correlateEventToChokepoints(event, chokepoints = STRATEGIC_CHOKEPOINTS, options = {}) {
  if (!event?.id) return [];
  const point = eventPoint(event);
  const text = textOf(event);
  const calculatedAt = new Date(options.now || Date.now()).toISOString();
  return chokepoints.flatMap((chokepoint) => {
    const reasons = [];
    const matchedTerms = termsIn(text, chokepoint.aliases);
    const matchedEntities = termsIn(text, [...(chokepoint.watchedPorts || []), ...(chokepoint.watchedRoutes || []), ...(chokepoint.watchedEntities || [])]);
    if (matchedTerms.length) reasons.push("alias-match");
    if (matchedEntities.some((term) => chokepoint.watchedPorts.includes(term))) reasons.push("watched-port");
    if (matchedEntities.some((term) => chokepoint.watchedRoutes.includes(term))) reasons.push("watched-route");
    if (chokepoint.domains.includes(event.domain) || chokepoint.watchedEventTypes.includes(event.category) || chokepoint.watchedEventTypes.includes(event.type)) reasons.push("domain-match");
    let distanceKm = point ? geometryDistanceKm(chokepoint.geometry, point, chokepoint.center) : null;
    if (point && geometryContains(chokepoint.geometry, point)) reasons.push("geometry-inside");
    const proximityKm = chokepoint.sensitivity === "high" ? 180 : 110;
    if (distanceKm !== null && distanceKm > 0 && distanceKm <= proximityKm) reasons.push("geometry-nearby");
    if (!reasons.length) return [];
    const relationship = relationshipFor(event, reasons, matchedTerms, distanceKm);
    const confidence = confidenceFor({ reasons, matchedTerms, distanceKm, relationship });
    if (confidence < 18 && !matchedTerms.length) return [];
    return [{
      chokepointId: chokepoint.id,
      eventId: String(event.id),
      relationship,
      confidence,
      reasons: reasons.sort(),
      distanceKm: distanceKm === null ? null : Math.round(distanceKm * 10) / 10,
      matchedTerms: matchedTerms.sort(),
      matchedEntities: matchedEntities.sort(),
      matchedGeometry: reasons.includes("geometry-inside") || reasons.includes("geometry-nearby"),
      calculatedAt,
    }];
  }).sort((a, b) => a.chokepointId.localeCompare(b.chokepointId) || RELATIONSHIP_ORDER.indexOf(a.relationship) - RELATIONSHIP_ORDER.indexOf(b.relationship));
}

export function correlateEventsToChokepoints(events = [], chokepoints = STRATEGIC_CHOKEPOINTS, options = {}) {
  const correlations = (events || []).flatMap((event) => correlateEventToChokepoints(event, chokepoints, options));
  return correlations.sort((a, b) => a.chokepointId.localeCompare(b.chokepointId) || a.eventId.localeCompare(b.eventId));
}

export function enrichEventsWithChokepoints(events = [], correlations = [], chokepoints = STRATEGIC_CHOKEPOINTS) {
  const nameById = new Map(chokepoints.map((item) => [item.id, item.shortName]));
  const byEvent = new Map();
  correlations.forEach((correlation) => {
    if (!byEvent.has(correlation.eventId)) byEvent.set(correlation.eventId, []);
    byEvent.get(correlation.eventId).push(correlation);
  });
  return events.map((event) => {
    const matches = (byEvent.get(String(event.id)) || []).slice().sort((a, b) => b.confidence - a.confidence || a.chokepointId.localeCompare(b.chokepointId));
    return {
      ...event,
      affectedChokepoints: matches.map((match) => nameById.get(match.chokepointId)).filter(Boolean),
      chokepointCorrelations: matches,
      impactTypes: [...new Set(matches.map((match) => match.relationship))],
    };
  });
}
