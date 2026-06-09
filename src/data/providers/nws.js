import { createNormalizedEvent } from "../../events/normalized-event.js";

export const NWS_ACTIVE_ALERTS_URL = "https://api.weather.gov/alerts/active";

const FALLBACK_US_POINT = { latitude: 39.8283, longitude: -98.5795, method: "United States coverage fallback; alert has no provider geometry" };

const SEVERITY_SCORE = {
  Extreme: 95,
  Severe: 82,
  Moderate: 58,
  Minor: 35,
  Unknown: 25,
};

const CERTAINTY_BONUS = {
  Observed: 8,
  Likely: 5,
  Possible: 0,
  Unlikely: -8,
  Unknown: -4,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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

export function representativeNwsPoint(geometry) {
  const pairs = collectCoordinatePairs(geometry?.coordinates || []);
  if (!pairs.length) return FALLBACK_US_POINT;
  const sum = pairs.reduce(
    (acc, pair) => {
      acc.longitude += pair[0];
      acc.latitude += pair[1];
      return acc;
    },
    { latitude: 0, longitude: 0 }
  );
  return {
    latitude: sum.latitude / pairs.length,
    longitude: sum.longitude / pairs.length,
    method: pairs.length === 1 ? "provider point" : "representative alert geometry centroid",
  };
}

function nwsType(eventName = "") {
  const value = eventName.toLowerCase();
  if (value.includes("tornado")) return "tornado";
  if (value.includes("hurricane")) return "hurricane";
  if (value.includes("tropical")) return "tropical-cyclone";
  if (value.includes("thunderstorm")) return "severe-thunderstorm";
  if (value.includes("winter") || value.includes("snow") || value.includes("ice")) return "winter-storm";
  if (value.includes("heat")) return "heat-wave";
  if (value.includes("cold") || value.includes("freeze")) return "extreme-cold";
  if (value.includes("dust")) return "dust-storm";
  if (value.includes("rain") || value.includes("flood")) return "heavy-rainfall";
  return "weather-warning";
}

function summarizeText(value, maxLength = 420) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}...`;
}

export function nwsSeverityScore(properties = {}) {
  const base = SEVERITY_SCORE[properties.severity] ?? SEVERITY_SCORE.Unknown;
  const urgency = properties.urgency === "Immediate" ? 8 : properties.urgency === "Expected" ? 4 : 0;
  const certainty = CERTAINTY_BONUS[properties.certainty] ?? 0;
  return clamp(base + urgency + certainty, 0, 100);
}

export function normalizeNwsAlert(feature, now = new Date()) {
  const properties = feature?.properties || {};
  const geometry = feature?.geometry || null;
  const point = representativeNwsPoint(geometry);
  const eventName = properties.event || "Weather alert";
  const sourceUrl = properties.web || properties.id || "https://api.weather.gov/alerts/active";
  const severity = nwsSeverityScore(properties);
  const instruction = summarizeText(properties.instruction, 260);
  const description = summarizeText(properties.description, 520);
  const headline = properties.headline || eventName;
  const result = createNormalizedEvent({
    id: `nws-alerts:${properties.id || feature?.id || `${headline}:${properties.sent}`}`,
    provider: "nws-alerts",
    providerEventId: properties.id || feature?.id || null,
    domain: "weather",
    category: "storm",
    type: nwsType(eventName),
    subtype: eventName,
    title: headline,
    description: [description, instruction ? `Recommended action: ${instruction}` : ""].filter(Boolean).join(" "),
    latitude: point.latitude,
    longitude: point.longitude,
    countryCode: "US",
    countryName: "United States",
    region: properties.areaDesc || null,
    locationName: properties.areaDesc || properties.senderName || "United States weather alert area",
    startedAt: properties.onset || properties.effective || properties.sent || now,
    updatedAt: properties.sent || properties.effective || now,
    ingestedAt: now,
    severity,
    confidence: properties.certainty === "Observed" ? 92 : properties.certainty === "Likely" ? 86 : 74,
    status: properties.expires && new Date(properties.expires).getTime() < now.getTime() ? "resolved" : "active",
    sourceName: properties.senderName || "NOAA National Weather Service",
    sourceUrl,
    sourceType: "Official",
    sourcePublishedAt: properties.sent || properties.effective || null,
    lastVerifiedAt: now,
    geometry,
    tags: ["NOAA", "NWS", eventName, properties.severity, properties.urgency, properties.certainty].filter(Boolean),
    metadata: {
      originalCategory: "NWS active alert",
      verificationStatus: "primary-confirmed",
      coordinateMethod: point.method,
      severityReason: `NWS severity ${properties.severity || "Unknown"}, urgency ${properties.urgency || "Unknown"}, certainty ${properties.certainty || "Unknown"}.`,
      details: {
        Event: eventName,
        Severity: properties.severity || "Unknown",
        Urgency: properties.urgency || "Unknown",
        Certainty: properties.certainty || "Unknown",
        Effective: properties.effective || "Not reported",
        Onset: properties.onset || "Not reported",
        Expires: properties.expires || "Not reported",
        Sent: properties.sent || "Not reported",
        "Issuing office": properties.senderName || "NOAA National Weather Service",
        "NWS alert ID": properties.id || feature?.id || "Not reported",
        "Coverage label": "United States NWS active alerts",
      },
    },
  });
  return { event: result.valid ? result.event : null, errors: result.errors };
}

export async function fetchNwsAlerts(context) {
  const data = await context.fetchJson(NWS_ACTIVE_ALERTS_URL, "NOAA/NWS");
  const now = new Date(context.now);
  const normalized = [];
  const rejected = [];
  for (const feature of data.features || []) {
    const result = normalizeNwsAlert(feature, now);
    if (result.event) normalized.push(result.event);
    else rejected.push({ id: feature?.properties?.id || feature?.id || null, errors: result.errors });
  }
  return { events: normalized, rejected };
}

