/**
 * IMF PortWatch discovery + bounded fixture adapter.
 * Daily observations are not a daily refresh. Weekly Tuesday publication.
 * Not activated for production polling.
 */

import { PORTWATCH_META } from "../maritime-overlays.js";

export const PORTWATCH_STATUS = "public-arcgis-rest-discovered-not-activated";

export function portwatchQueryUrl(portid, { start = null, end = null } = {}) {
  const url = new URL(PORTWATCH_META.endpoints.chokepointDaily);
  url.searchParams.set("where", `portid = '${String(portid).replace(/'/g, "")}'`);
  url.searchParams.set("outFields", "*");
  url.searchParams.set("maxRecordCountFactor", "5");
  url.searchParams.set("outSR", "4326");
  url.searchParams.set("f", "json");
  if (start && end) url.searchParams.set("time", `${Date.parse(start)},${Date.parse(end)}`);
  return url.toString();
}

export function normalizePortwatchFeature(feature, { retrievedAt = new Date().toISOString(), vintage = null } = {}) {
  const attrs = feature?.attributes || feature || {};
  return {
    id: `portwatch:${attrs.portid || attrs.PORTID}:${attrs.date || attrs.Date || attrs.OBJECTID}`,
    portid: attrs.portid || attrs.PORTID,
    locationName: attrs.portname || attrs.PORTNAME || attrs.portid,
    date: attrs.date || attrs.Date || attrs.datetime || null,
    value: attrs.n_total || attrs.n_vessel || attrs.cargo_mtd || attrs.value || null,
    unit: attrs.n_total != null ? "estimated-transit-calls" : "provider-field",
    vintage: vintage || attrs.edit_date || attrs.EditDate || null,
    publicationLag: "weekly Tuesday 9 AM ET typical",
    retrievedAt,
    live: false,
    source: "IMF PortWatch",
    sourceUrl: PORTWATCH_META.endpoints.docs,
  };
}

export function portwatchChokepointId(liveMapId) {
  return PORTWATCH_META.ids[liveMapId] || null;
}

export async function fetchPortwatchChokepoint(_portid, { enabled = false } = {}) {
  if (!enabled) {
    return { status: "configuration-required", reason: "PortWatch production polling is not activated. Use a bounded development fixture." };
  }
  return { status: "disabled", reason: "Live fetch is gated; this task does not activate provider polling." };
}
