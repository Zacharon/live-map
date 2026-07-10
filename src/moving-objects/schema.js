import { clampedInteger } from "../api/request-validation.js";

const MAX_AGE_SECONDS = 10 * 60;

export function normalizeMovingObject(input = {}) {
  const objectType = input.objectType;
  if (!["aircraft", "vessel"].includes(objectType)) return { object: null, errors: ["unsupported object type"] };
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { object: null, errors: ["invalid coordinates"] };
  }
  const observedAt = Number(input.observedAt || input.receivedAt || Date.now());
  const receivedAt = Number(input.receivedAt || Date.now());
  const dataAgeSeconds = Math.max(0, Number(input.dataAgeSeconds ?? Math.round((Date.now() - observedAt) / 1000)));
  return {
    object: {
      id: input.id || `${objectType}:${input.identifiers?.icao24 || input.identifiers?.mmsi || input.providerId || "unknown"}`,
      objectType,
      providerId: input.providerId,
      observedAt,
      receivedAt,
      latitude,
      longitude,
      altitude: input.altitude == null ? null : Number(input.altitude),
      speed: input.speed == null ? null : Number(input.speed),
      heading: input.heading == null ? null : Number(input.heading),
      verticalRate: input.verticalRate == null ? null : Number(input.verticalRate),
      status: input.status || "unknown",
      identifiers: input.identifiers || {},
      displayName: input.displayName || input.identifiers?.callsign || input.identifiers?.mmsi || input.identifiers?.icao24 || "Unknown object",
      classification: input.classification || "unknown",
      sourceName: input.sourceName,
      sourceUrl: input.sourceUrl,
      dataAgeSeconds,
      stale: Boolean(input.stale || dataAgeSeconds > MAX_AGE_SECONDS),
      providerMetadata: input.providerMetadata || {},
    },
    errors: [],
  };
}

export function movingObjectPublicView(object) {
  const { providerMetadata, ...safe } = object;
  return {
    ...safe,
    providerMetadata: providerMetadata?.public ? providerMetadata.public : {},
  };
}

export function validateBbox(value) {
  if (!value) return { valid: false, error: "Zoom in or move the map to choose an area before loading tracking data." };
  const parts = String(value).split(",").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return { valid: false, error: "Bounding box must be south,west,north,east." };
  const [south, west, north, east] = parts;
  if (south < -90 || north > 90 || west < -180 || east > 180 || south >= north) return { valid: false, error: "Bounding box is outside supported latitude/longitude limits." };
  const width = east >= west ? east - west : 180 - west + east + 180;
  const height = north - south;
  const area = width * height;
  if (area > 400) return { valid: false, error: "Area is too large. Zoom in before loading live tracking." };
  return { valid: true, bbox: { south, west, north, east, width, height, area, antimeridian: east < west } };
}

export function clampMovingObjectLimit(value, fallback = 500) {
  return clampedInteger(value === "" || value == null ? fallback : value, { min: 1, max: 1000, fallback });
}
