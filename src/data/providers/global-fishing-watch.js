import { normalizeMovingObject } from "../../moving-objects/schema.js";

function env(name) {
  return globalThis.process?.env?.[name] || "";
}

export function gfwConfigured() {
  return String(env("GFW_ENABLED")).toLowerCase() === "true" && env("GFW_API_TOKEN");
}

export function gfwStatus(reason = "Global Fishing Watch API token is not configured.") {
  return {
    providerId: "global-fishing-watch",
    status: "configuration-required",
    ok: false,
    message: reason,
    coverage: "Ocean activity analysis; not a complete real-time AIS feed.",
    delay: "Availability and delay depend on the selected GFW endpoint and authorization.",
    nextRefreshAfterMs: 120000,
  };
}

export function normalizeGfwVessel(record = {}, now = Date.now()) {
  const mmsi = record.mmsi || record.ssvid || record.identifiers?.mmsi;
  if (!mmsi) return { object: null, errors: ["missing MMSI"] };
  return normalizeMovingObject({
    id: `vessel:${mmsi}`,
    objectType: "vessel",
    providerId: "global-fishing-watch",
    observedAt: Date.parse(record.timestamp || record.observedAt || record.start || "") || now,
    receivedAt: now,
    latitude: record.lat ?? record.latitude,
    longitude: record.lon ?? record.longitude,
    speed: record.speed ?? record.speedKnots,
    heading: record.course ?? record.heading,
    status: record.activity || record.status || "observed",
    identifiers: { mmsi, imo: record.imo || null, callsign: record.callsign || null },
    displayName: record.vesselName || record.name || String(mmsi),
    classification: record.vesselType || record.geartype || "unknown",
    sourceName: "Global Fishing Watch",
    sourceUrl: "https://globalfishingwatch.org/our-apis/",
    dataAgeSeconds: record.dataAgeSeconds,
    stale: record.stale,
    providerMetadata: { public: { flag: record.flag || null, destination: record.destination || null, eta: record.eta || null, terrestrialOrSatellite: record.source || null } },
  });
}

export async function fetchGfwVessels() {
  if (!gfwConfigured()) return { objects: [], status: gfwStatus(), warnings: ["Vessel activity is not configured."], truncated: false };
  return {
    objects: [],
    status: { ...gfwStatus("GFW endpoint activation requires a documented endpoint-specific review."), status: "configuration-required" },
    warnings: ["Global Fishing Watch boundary is present, but no endpoint is activated until authorization and attribution requirements are documented."],
    truncated: false,
  };
}
