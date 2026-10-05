/**
 * Allowlisted local snapshots for the investigation desk. Production polling off.
 */
import { normalizeCisaKevItem } from "../providers/cisa-kev.js";
import { parseFeedItems } from "../providers/rss-feed.js";
import { normalizeSwpcAlert } from "../providers/swpc.js";

export const SNAPSHOT_MANIFEST = {
  live: false,
  providerEnabled: false,
  files: {
    hormuz: "./data/development-fixtures/portwatch-hormuz-2025-01-extract.json",
    cisaKev: "./data/development-fixtures/cisa-kev-frozen.json",
    nhcTwoat: "./data/development-fixtures/nhc-twoat-frozen.xml",
  },
};

export function eventsFromCisaFrozen(doc, now = new Date()) {
  const events = [];
  for (const item of doc.vulnerabilities || []) {
    const result = normalizeCisaKevItem(item, now);
    if (result.event) {
      result.event.synthetic = false;
      result.event.valueOrigin = "reported";
      result.event.metadata = { ...result.event.metadata, frozenSample: true, live: false, dateAddedIsNotIncidentTime: true };
      events.push(result.event);
    }
  }
  return { events, catalogCount: doc.catalogCount || events.length, live: false };
}

export function eventsFromNhcXml(xml, now = new Date()) {
  const items = parseFeedItems(xml);
  const events = items.map((item, index) => ({
    id: `nhc-twoat:${item.guid || index}`,
    provider: "noaa-nhc",
    domain: "weather",
    category: "weather",
    type: "tropical-cyclone-outlook",
    title: item.title || "NHC tropical weather outlook",
    summary: String(item.summary || "").replace(/<[^>]+>/g, " ").slice(0, 500),
    geographic: false,
    mapDisplayStatus: "not-mapped",
    nonGeographicReason: "TWO text is a basin outlook. It is not an observed storm track or damage footprint.",
    occurredAt: item.publishedAt || now.toISOString(),
    issuedAt: item.publishedAt || null,
    validTime: null,
    forecastNotObservation: true,
    sourceName: "NOAA National Hurricane Center",
    sourceUrl: item.link || "https://www.nhc.noaa.gov/aboutrss.shtml",
    sourceType: "Official",
    synthetic: false,
    live: false,
    frozenSample: true,
  }));
  return { events, emptyOutlook: events.length === 0, live: false };
}

export function eventsFromSwpcFrozen(doc, now = new Date()) {
  const list = Array.isArray(doc) ? doc : doc.alerts || [];
  return { events: list.slice(0, 8).map((item, index) => normalizeSwpcAlert(item, index, now).event).filter(Boolean), live: false };
}
