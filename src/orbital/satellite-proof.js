/**
 * Selected public satellite groups. Propagated estimates, not live observations.
 * Requires a pinned satellite.js implementation when the orbital proof is enabled.
 */

export const SATELLITE_CACHE_MS = 2 * 60 * 60 * 1000;
export const SATELLITE_GROUPS = ["stations"];
export const CELESTRAK_OMM = "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json";

const cache = { fetchedAt: 0, elements: null, error: null };

export function catalogId(record) {
  const value = record?.NORAD_CAT_ID ?? record?.norad_cat_id ?? record?.satnum;
  return String(value ?? "");
}

export function elementIsStale(record, now = Date.now(), maxAgeHours = 48) {
  const epoch = Date.parse(record?.EPOCH || record?.epoch);
  if (!Number.isFinite(epoch)) return true;
  return now - epoch > maxAgeHours * 3600000;
}

export function parseOmmRecords(payload) {
  const rows = Array.isArray(payload) ? payload : payload?.records || [];
  return rows.map((row) => ({
    id: catalogId(row),
    name: row.OBJECT_NAME || row.object_name || row.satname || "unknown",
    epoch: row.EPOCH || row.epoch,
    source: "CelesTrak OMM JSON",
    stale: elementIsStale(row),
    invalid: !catalogId(row) || !row.EPOCH && !row.epoch,
    raw: row,
  })).filter((row) => row.id);
}

export function shouldFetchElements(now = Date.now(), last = cache.fetchedAt) {
  return !last || now - last >= SATELLITE_CACHE_MS;
}

export function recordProviderError(error) {
  cache.error = String(error?.message || error);
  cache.elements = null;
  return { ok: false, error: cache.error, retry: false };
}

export function rememberElements(records, now = Date.now()) {
  cache.fetchedAt = now;
  cache.elements = records;
  cache.error = null;
  return { ok: true, records, fetchedAt: now };
}

export function propagateEstimate(satrec, date, satelliteApi) {
  if (!satrec || !satelliteApi) return { ok: false, reason: "satellite-js-unavailable" };
  const gmst = satelliteApi.gstime(date);
  const eci = satelliteApi.propagate(satrec, date);
  if (!eci?.position) return { ok: false, reason: "propagation-failed", epoch: satrec.epochyr };
  const geo = satelliteApi.eciToGeodetic(eci.position, gmst);
  const altitudeKm = geo.height;
  return {
    ok: true,
    latitude: satelliteApi.degreesLat(geo.latitude),
    longitude: satelliteApi.degreesLong(geo.longitude),
    altitudeKm,
    altitudeMeters: altitudeKm * 1000,
    calculatedAt: date.toISOString(),
    frame: "TEME->geodetic via satellite.js",
    estimate: true,
    liveObservation: false,
  };
}

export function exaggerationDisclosure(displayAltitudeKm, actualAltitudeKm) {
  if (!Number.isFinite(displayAltitudeKm) || !Number.isFinite(actualAltitudeKm) || displayAltitudeKm === actualAltitudeKm) {
    return { exaggerated: false, actualAltitudeKm };
  }
  return { exaggerated: true, displayAltitudeKm, actualAltitudeKm, disclosure: "Display altitude is exaggerated for visibility; actual calculated altitude is retained." };
}
