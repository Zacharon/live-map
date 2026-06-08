import { createNormalizedEvent } from "../../events/normalized-event.js";

export function eonetUrl(days) {
  return `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=${days}&limit=250`;
}

function eonetCategory(categories = []) {
  const title = (categories[0]?.title || "").toLowerCase();
  if (title.includes("wildfire")) return "wildfire";
  if (title.includes("storm") || title.includes("severe")) return "storm";
  if (title.includes("volcano")) return "volcano";
  if (title.includes("flood")) return "flood";
  return "other";
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

export function representativePoint(geometry) {
  const pairs = collectCoordinatePairs(geometry?.coordinates || []);
  if (!pairs.length) return null;
  const sum = pairs.reduce(
    (acc, pair) => {
      acc.longitude += pair[0];
      acc.latitude += pair[1];
      return acc;
    },
    { longitude: 0, latitude: 0 }
  );
  return {
    longitude: sum.longitude / pairs.length,
    latitude: sum.latitude / pairs.length,
    method: pairs.length === 1 ? "provider point" : "representative geometry centroid",
  };
}

function eonetSeverity(category) {
  if (category === "wildfire" || category === "storm") return 70;
  if (category === "volcano" || category === "flood") return 55;
  return 40;
}

function eonetType(category) {
  if (category === "storm") return "weather-warning";
  return category;
}

export function normalizeEonetEvent(rawEvent, now = new Date()) {
  const geometry = [...(rawEvent?.geometry || [])].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const point = representativePoint(geometry);
  if (!point) return { event: null, errors: ["missing usable geometry"] };
  const category = eonetCategory(rawEvent.categories);
  const source = rawEvent.sources?.[0];
  const result = createNormalizedEvent({
    id: `eonet:${rawEvent.id}`,
    provider: "eonet",
    providerEventId: rawEvent.id || null,
    title: rawEvent.title || "Natural hazard event",
    description:
      rawEvent.description ||
      `Open ${category} event tracked by NASA EONET. Open the source for the latest provider details and boundaries.`,
    category,
    type: eonetType(category),
    subtype: rawEvent.categories?.[0]?.title || null,
    subcategory: rawEvent.categories?.map((item) => item.title).join(", ") || category,
    latitude: point.latitude,
    longitude: point.longitude,
    countryName: "Multiple/unknown",
    locationName: rawEvent.title || "Event location",
    startedAt: geometry?.date || now,
    updatedAt: geometry?.date || now,
    ingestedAt: now,
    severity: eonetSeverity(category),
    confidence: 82,
    status: rawEvent.closed ? "resolved" : "monitoring",
    sourceName: "NASA EONET",
    sourceUrl: source?.url || rawEvent.link || "https://eonet.gsfc.nasa.gov/docs/v3",
    sourceType: "Official",
    sourcePublishedAt: geometry?.date || null,
    geometry: geometry
      ? {
          type: geometry.type,
          coordinates: geometry.coordinates,
        }
      : null,
    tags: ["NASA EONET", category, rawEvent.closed ? "closed" : "open"],
    metadata: {
      originalCategory: rawEvent.categories?.map((item) => item.title).join(", ") || category,
      geometryType: geometry?.type || "Unknown",
      verificationStatus: "primary-confirmed",
      coordinateMethod: point.method,
      severityReason: `NASA EONET lists this as an ${rawEvent.closed ? "historical/closed" : "open"} ${category} event.`,
      details: {
        Category: rawEvent.categories?.map((item) => item.title).join(", ") || category,
        Status: rawEvent.closed ? "Closed" : "Open",
        Geometry: geometry?.type || "Unknown",
        "Coordinate method": point.method,
        "NASA event ID": rawEvent.id,
        "Source title": source?.id || "NASA EONET",
      },
    },
  });
  return { event: result.valid ? result.event : null, errors: result.errors };
}

export async function fetchEonetEvents(context) {
  const days = Math.ceil(context.hours / 24);
  const urls = [eonetUrl(days), "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=250"];
  let data;
  let lastError;
  for (const url of urls) {
    try {
      data = await context.fetchJson(url, "NASA EONET");
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!data) throw lastError;
  const now = new Date(context.now);
  const normalized = [];
  const rejected = [];
  for (const event of data.events || []) {
    const result = normalizeEonetEvent(event, now);
    if (result.event) normalized.push(result.event);
    else rejected.push({ id: event?.id || null, errors: result.errors });
  }
  return { events: normalized, rejected };
}
