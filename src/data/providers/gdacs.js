import { createNormalizedEvent } from "../../events/normalized-event.js";

export const GDACS_EVENT_LIST_URL = "https://data.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH";

const EVENT_TYPE_MAP = {
  EQ: { category: "earthquake", type: "earthquake", domain: "natural-disaster", label: "Earthquake" },
  TC: { category: "storm", type: "tropical-cyclone", domain: "weather", label: "Tropical cyclone" },
  FL: { category: "flood", type: "flood", domain: "natural-disaster", label: "Flood" },
  VO: { category: "volcano", type: "volcano", domain: "natural-disaster", label: "Volcano" },
  DR: { category: "drought", type: "drought", domain: "natural-disaster", label: "Drought" },
  WF: { category: "wildfire", type: "wildfire", domain: "natural-disaster", label: "Wildfire" },
  TS: { category: "tsunami", type: "tsunami", domain: "natural-disaster", label: "Tsunami" },
};

const ALERT_SEVERITY = {
  red: 92,
  orange: 76,
  yellow: 55,
  green: 28,
};

function cleanText(value, maxLength = 520) {
  const text = String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}...`;
}

function parseDate(value, fallback = null) {
  if (!value) return fallback;
  const text = String(value);
  const isoLike = /Z$|[+-]\d\d:\d\d$/.test(text) ? text : `${text}Z`;
  const date = new Date(isoLike);
  return Number.isFinite(date.getTime()) ? date.toISOString() : fallback;
}

function eventTypeInfo(eventType) {
  return EVENT_TYPE_MAP[String(eventType || "").toUpperCase()] || {
    category: "other",
    type: "other",
    domain: "other",
    label: "Disaster alert",
  };
}

function alertLevel(properties = {}) {
  return String(properties.episodealertlevel || properties.alertlevel || "").trim();
}

export function gdacsSeverityScore(properties = {}) {
  const level = alertLevel(properties).toLowerCase();
  const base = ALERT_SEVERITY[level] ?? 35;
  const score = Number(properties.episodealertscore ?? properties.alertscore);
  if (!Number.isFinite(score)) return base;
  if (score >= 3) return Math.max(base, 92);
  if (score >= 2) return Math.max(base, 76);
  if (score >= 1) return Math.max(base, 55);
  return base;
}

function collectCoordinatePairs(value, output = []) {
  if (!Array.isArray(value)) return output;
  if (
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    Math.abs(value[0]) <= 180 &&
    Math.abs(value[1]) <= 90
  ) {
    output.push(value);
    return output;
  }
  value.forEach((item) => collectCoordinatePairs(item, output));
  return output;
}

function pointFromBbox(bbox) {
  if (!Array.isArray(bbox) || bbox.length < 4) return null;
  const [minLon, minLat, maxLon, maxLat] = bbox.map(Number);
  if ([minLon, minLat, maxLon, maxLat].some((value) => !Number.isFinite(value))) return null;
  return {
    longitude: (minLon + maxLon) / 2,
    latitude: (minLat + maxLat) / 2,
    method: "representative bounding-box centroid",
  };
}

export function representativeGdacsPoint(geometry, bbox = null) {
  const pairs = collectCoordinatePairs(geometry?.coordinates || []);
  if (!pairs.length) return pointFromBbox(bbox);
  const sum = pairs.reduce(
    (acc, pair) => {
      acc.longitude += pair[0];
      acc.latitude += pair[1];
      return acc;
    },
    { latitude: 0, longitude: 0 }
  );
  return {
    longitude: sum.longitude / pairs.length,
    latitude: sum.latitude / pairs.length,
    method: pairs.length === 1 ? "provider point" : "representative provider geometry centroid",
  };
}

function countryCode(properties = {}) {
  const countries = Array.isArray(properties.affectedcountries) ? properties.affectedcountries : [];
  return countries[0]?.iso2 || null;
}

function detailsUrl(properties = {}) {
  return properties.url?.report || properties.url?.details || "https://www.gdacs.org/";
}

function gdacsStatus(properties = {}, now = new Date()) {
  if (String(properties.iscurrent).toLowerCase() === "true") return "active";
  const endsAt = parseDate(properties.todate);
  if (endsAt && new Date(endsAt).getTime() >= now.getTime()) return "monitoring";
  return "resolved";
}

function confidenceFor(properties = {}) {
  const level = alertLevel(properties).toLowerCase();
  if (level === "red") return 84;
  if (level === "orange") return 82;
  if (level === "green" || level === "yellow") return 78;
  return 72;
}

export function gdacsUrl(hours, now = Date.now()) {
  const end = new Date(now);
  const start = new Date(end.getTime() - Math.max(24, hours || 168) * 3600000);
  const params = new URLSearchParams({
    fromdate: start.toISOString().slice(0, 10),
    todate: end.toISOString().slice(0, 10),
    eventtypes: "EQ,TC,FL,VO,DR,WF,TS",
  });
  return `${GDACS_EVENT_LIST_URL}?${params}`;
}

export function normalizeGdacsFeature(feature, now = new Date()) {
  const properties = feature?.properties || {};
  const typeInfo = eventTypeInfo(properties.eventtype);
  const point = representativeGdacsPoint(feature?.geometry, feature?.bbox);
  if (!point) return { event: null, errors: ["missing usable geometry"] };
  const providerEventId = [properties.eventtype, properties.eventid, properties.episodeid].filter(Boolean).join(":");
  const startedAt = parseDate(properties.fromdate, now.toISOString());
  const updatedAt = parseDate(properties.datemodified, parseDate(properties.todate, startedAt));
  const sourceName = properties.source ? `GDACS / ${properties.source}` : "Global Disaster Alert and Coordination System, GDACS";
  const severityText = properties.severitydata?.severitytext || null;
  const result = createNormalizedEvent({
    id: `gdacs:${providerEventId || `${properties.name}:${startedAt}`}`,
    provider: "gdacs",
    providerEventId: providerEventId || null,
    domain: typeInfo.domain,
    category: typeInfo.category,
    type: typeInfo.type,
    subtype: properties.eventtype || null,
    title: properties.name || properties.description || `${typeInfo.label} alert`,
    description:
      cleanText(properties.htmldescription || properties.description) ||
      `GDACS ${typeInfo.label.toLowerCase()} alert. Open the source report for the latest official context.`,
    latitude: point.latitude,
    longitude: point.longitude,
    countryCode: countryCode(properties),
    countryName: properties.country || properties.affectedcountries?.map((country) => country.countryname).filter(Boolean).join(", ") || "Multiple/unknown",
    region: properties.country || null,
    locationName: properties.country || properties.eventname || properties.name || "GDACS alert location",
    startedAt,
    updatedAt,
    ingestedAt: now,
    severity: gdacsSeverityScore(properties),
    confidence: confidenceFor(properties),
    status: gdacsStatus(properties, now),
    sourceName,
    sourceUrl: detailsUrl(properties),
    sourceType: "Structured established",
    sourcePublishedAt: startedAt,
    lastVerifiedAt: updatedAt,
    geometry: feature?.geometry
      ? {
          type: feature.geometry.type,
          coordinates: feature.geometry.coordinates,
        }
      : null,
    tags: ["GDACS", properties.eventtype, alertLevel(properties), properties.source, typeInfo.type].filter(Boolean),
    metadata: {
      originalCategory: properties.eventtype || "unknown",
      verificationStatus: "reported",
      coordinateMethod: point.method,
      alertLevel: alertLevel(properties) || "Unknown",
      alertScore: properties.episodealertscore ?? properties.alertscore ?? null,
      severityReason: `GDACS alert level ${alertLevel(properties) || "Unknown"}${severityText ? `; ${severityText}` : ""}.`,
      geometryUrl: properties.url?.geometry || null,
      detailsUrl: properties.url?.details || null,
      reportUrl: properties.url?.report || null,
      sourceProvider: properties.source || null,
      glide: properties.glide || null,
      affectedCountries: Array.isArray(properties.affectedcountries) ? properties.affectedcountries : [],
      affectedPopulation: properties.population ?? properties.affectedpopulation ?? null,
      details: {
        "GDACS type": properties.eventtype || "Unknown",
        "Alert level": alertLevel(properties) || "Unknown",
        "Alert score": String(properties.episodealertscore ?? properties.alertscore ?? "Unknown"),
        "GDACS event ID": String(properties.eventid || "Unknown"),
        "GDACS episode ID": String(properties.episodeid || "Unknown"),
        "Provider source": properties.source || "GDACS",
        "Provider status": gdacsStatus(properties, now),
        "Countries": properties.country || "Multiple/unknown",
        "Geometry class": properties.Class || feature?.geometry?.type || "Unknown",
        "Coordinate method": point.method,
      },
    },
  });
  return { event: result.valid ? result.event : null, errors: result.errors };
}

export async function fetchGdacsEvents(context) {
  const data = await context.fetchJson(gdacsUrl(context.hours, context.now), "GDACS");
  const now = new Date(context.now);
  const normalized = [];
  const rejected = [];
  for (const feature of data.features || []) {
    const result = normalizeGdacsFeature(feature, now);
    if (result.event) normalized.push(result.event);
    else rejected.push({ id: feature?.properties?.eventid || feature?.id || null, errors: result.errors });
  }
  return { events: normalized, rejected };
}
