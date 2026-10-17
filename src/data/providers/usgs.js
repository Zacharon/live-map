import { createNormalizedEvent } from "../../events/normalized-event.js";
import { finiteNumber, validCoordinates } from "../../events/value-semantics.js";

export const USGS_FEED_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson";

function usgsSourceUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && url.hostname === "earthquake.usgs.gov" && !url.username && !url.password) return url.href;
  } catch { /* Use the fixed source landing page. */ }
  return "https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php";
}

export function usgsSeverityScore(magnitude) {
  const value = Number(magnitude);
  if (!Number.isFinite(value)) return 15;
  return Math.max(0, Math.min(100, Math.round((value / 9.5) * 100)));
}

export function normalizeUsgsFeature(feature, now = new Date()) {
  const errors = [];
  const properties = feature?.properties || {};
  const coordinates = feature?.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2 || !validCoordinates(coordinates[1], coordinates[0])) {
    return { event: null, errors: ["missing coordinates"] };
  }
  const [longitude, latitude] = coordinates.map(finiteNumber);
  const depthKm = finiteNumber(coordinates[2]);
  const magnitude = finiteNumber(properties.mag);
  const reviewed = properties.status === "reviewed";
  const title = properties.title || `Magnitude ${Number.isFinite(magnitude) ? magnitude.toFixed(1) : "unknown"} earthquake`;
  const result = createNormalizedEvent({
    id: `usgs:${feature.id || `${latitude}:${longitude}:${properties.time}`}`,
    provider: "usgs",
    providerEventId: feature.id || null,
    title,
    description: `Magnitude ${Number.isFinite(magnitude) ? magnitude.toFixed(1) : "unknown"} earthquake at approximately ${
      Number.isFinite(depthKm) ? depthKm.toFixed(1) : "unknown"
    } km depth. ${reviewed ? "Reviewed by USGS." : "Preliminary solution; details may change."}`,
    category: "earthquake",
    type: "earthquake",
    subtype: "tectonic-earthquake",
    subcategory: "seismic",
    latitude,
    longitude,
    countryName: (properties.place || "Unknown").split(",").pop().trim(),
    locationName: properties.place || "Unknown location",
    startedAt: properties.time,
    updatedAt: properties.updated,
    ingestedAt: now,
    severity: usgsSeverityScore(magnitude),
    confidence: reviewed ? 96 : 88,
    status: "active",
    sourceName: "USGS Earthquake Hazards Program",
    sourceUrl: usgsSourceUrl(properties.url),
    sourceType: "Official",
    sourcePublishedAt: null,
    geometry: feature.geometry || null,
    tags: ["USGS", "earthquake", properties.status || "unknown"],
    metadata: {
      originalCategory: "earthquake",
      magnitude: Number.isFinite(magnitude) ? magnitude : null,
      depthKm: Number.isFinite(depthKm) ? depthKm : null,
      tsunami: Boolean(properties.tsunami),
      feltReports: properties.felt ?? null,
      verificationStatus: reviewed ? "primary-confirmed" : "single-source",
      coordinateMethod: "official epicenter",
      severityReason: `Magnitude ${Number.isFinite(magnitude) ? magnitude.toFixed(1) : "unknown"} earthquake at ${
        Number.isFinite(depthKm) ? depthKm.toFixed(1) : "unknown"
      } km depth.`,
      details: {
        Magnitude: Number.isFinite(magnitude) ? magnitude.toFixed(1) : "Not reported",
        Depth: Number.isFinite(depthKm) ? `${depthKm.toFixed(1)} km` : "Not reported",
        Status: properties.status || "unknown",
        Tsunami: properties.tsunami ? "Possible/flagged" : "No flag",
        Felt: properties.felt ?? "Not reported",
        Significance: properties.sig ?? "Not reported",
      },
      rawStatus: properties.status || null,
    },
  });
  return { event: result.valid ? result.event : null, errors: [...errors, ...result.errors] };
}

export async function fetchUsgsEvents(context) {
  const data = await context.fetchJson(USGS_FEED_URL, "USGS");
  const now = new Date(context.now);
  const normalized = [];
  const rejected = [];
  for (const feature of data.features || []) {
    const result = normalizeUsgsFeature(feature, now);
    if (result.event) normalized.push(result.event);
    else rejected.push({ id: feature?.id || null, errors: result.errors });
  }
  return { events: normalized, rejected };
}
