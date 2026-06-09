import { createNormalizedEvent } from "../../events/normalized-event.js";

export const RELIEFWEB_BASE_URL = "https://api.reliefweb.int/v2";
const COUNTRY_CENTROIDS = {
  AFG: { latitude: 33.9391, longitude: 67.71 },
  SDN: { latitude: 12.8628, longitude: 30.2176 },
  PSE: { latitude: 31.9522, longitude: 35.2332 },
  UKR: { latitude: 48.3794, longitude: 31.1656 },
  ETH: { latitude: 9.145, longitude: 40.4897 },
};

function limitedText(value, maxLength = 420) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function fieldValue(record, key) {
  return record?.fields?.[key] ?? record?.[key] ?? null;
}

function firstName(values) {
  if (!Array.isArray(values)) return values?.name || values || null;
  return values.map((item) => item.name || item.title || item).filter(Boolean).join(", ");
}

function reliefWebType(record) {
  const themes = JSON.stringify(fieldValue(record, "theme") || "").toLowerCase();
  const title = String(fieldValue(record, "title") || "").toLowerCase();
  if (/displacement|refugee|idp/.test(`${themes} ${title}`)) return "displacement";
  if (/food|nutrition|ipc|famine/.test(`${themes} ${title}`)) return "food-insecurity";
  if (/health|cholera|disease|outbreak/.test(`${themes} ${title}`)) return "health-emergency";
  if (/appeal|funding/.test(`${themes} ${title}`)) return "emergency-appeal";
  if (/recovery|return|restored/.test(`${themes} ${title}`)) return "recovery";
  return "humanitarian-update";
}

function pointFor(record) {
  const country = Array.isArray(fieldValue(record, "country")) ? fieldValue(record, "country")[0] : fieldValue(record, "primary_country");
  const iso3 = country?.iso3 || country?.shortname;
  const centroid = COUNTRY_CENTROIDS[iso3];
  if (!centroid) return null;
  return { ...centroid, countryName: country?.name || null, countryCode: country?.iso3 || null, approximate: true };
}

export function normalizeReliefWebRecord(record, now = new Date()) {
  const id = record?.id;
  const fields = record?.fields || {};
  if (!id || !fields.title) return { event: null, errors: ["missing id or title"] };
  const point = pointFor(record);
  const sources = Array.isArray(fields.source) ? fields.source : [];
  const sourceNames = firstName(sources) || "Original ReliefWeb source";
  const rwUrl = fields.url || `https://reliefweb.int/node/${id}`;
  const originalUrl = fields.url_alias || rwUrl;
  const result = createNormalizedEvent({
    id: `reliefweb:${id}`,
    provider: "reliefweb",
    providerEventId: String(id),
    domain: "humanitarian",
    category: "humanitarian",
    type: reliefWebType(record),
    title: fields.title,
    description: limitedText(fields.body || fields.summary || fields.headline?.title || fields.title),
    latitude: point?.latitude,
    longitude: point?.longitude,
    geographic: Boolean(point),
    mapDisplayStatus: point ? "approximate" : "not-mapped",
    nonGeographicReason: point ? null : "ReliefWeb record does not include safe mappable coordinates.",
    countryCode: point?.countryCode || null,
    countryName: point?.countryName || firstName(fields.country) || "Multiple/unknown",
    locationName: point?.countryName || firstName(fields.country) || "Humanitarian update",
    startedAt: fields.date?.created || fields.date?.original || now,
    updatedAt: fields.date?.changed || fields.date?.created || now,
    ingestedAt: now,
    severity: reliefWebType(record) === "recovery" ? 35 : 58,
    confidence: 78,
    status: "monitoring",
    sourceName: `ReliefWeb / ${sourceNames}`,
    sourceUrl: rwUrl,
    sourceType: "Structured established",
    sourcePublishedAt: fields.date?.created || fields.date?.original || null,
    tags: ["ReliefWeb", reliefWebType(record), firstName(fields.theme), firstName(fields.disaster_type)].filter(Boolean),
    metadata: {
      verificationStatus: "reported",
      coordinateMethod: point ? "country-centroid" : "not mapped",
      locationPrecision: point ? "country-centroid" : "none",
      approximate: Boolean(point),
      sensitivityLevel: "medium",
      coordinatePrecision: point ? "country-centroid" : "suppressed",
      redactionReason: point ? "Country centroid used to avoid sensitive humanitarian precision." : "No safe public coordinate was available.",
      reliefWebId: id,
      reportType: fields.type?.name || null,
      format: firstName(fields.format),
      sourceOrganizations: sources.map((item) => item.name).filter(Boolean),
      primaryCountry: point?.countryName || null,
      countries: Array.isArray(fields.country) ? fields.country : [],
      disasterIds: Array.isArray(fields.disaster) ? fields.disaster.map((item) => item.id).filter(Boolean) : [],
      disasterNames: firstName(fields.disaster),
      disasterTypes: firstName(fields.disaster_type),
      themes: firstName(fields.theme),
      language: firstName(fields.language),
      originalUrl,
      reliefWebUrl: rwUrl,
      copyrightPolicy: "metadata-and-limited-excerpt-only",
      details: {
        "ReliefWeb ID": id,
        "Original publishers": sourceNames,
        Countries: firstName(fields.country) || "Multiple/unknown",
        Themes: firstName(fields.theme) || "Unknown",
        "Copyright policy": "No full report body mirrored",
      },
    },
  });
  return { event: result.valid ? result.event : null, errors: result.errors };
}

export function reliefWebQuery(hours, now = Date.now()) {
  const changedAfter = new Date(now - Math.max(24, hours || 72) * 3600000).toISOString();
  return {
    appname: globalThis?.process?.env?.RELIEFWEB_APPNAME,
    limit: 100,
    fields: { include: ["id", "title", "body", "date", "url", "url_alias", "source", "country", "primary_country", "disaster", "disaster_type", "theme", "format", "language", "type"] },
    filter: { field: "date.changed", value: { from: changedAfter } },
    sort: ["date.changed:desc"],
  };
}

export async function fetchReliefWebEvents(context) {
  const appname = globalThis?.process?.env?.RELIEFWEB_APPNAME;
  if (!appname) {
    return {
      events: [],
      rejected: [],
      status: "configuration-required",
      warnings: ["RELIEFWEB_APPNAME is required before ReliefWeb can be queried."],
      safeError: "ReliefWeb is not configured. Add an approved RELIEFWEB_APPNAME in Netlify environment variables.",
      requestAttempted: false,
    };
  }
  const response = await fetch(`${RELIEFWEB_BASE_URL}/reports`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(reliefWebQuery(Math.min(context.hours || 72, 72), context.now)),
  });
  if (response.status === 429) throw new Error("ReliefWeb returned 429");
  if (!response.ok) throw new Error(`ReliefWeb returned ${response.status}`);
  const data = await response.json();
  const now = new Date(context.now);
  const normalized = [];
  const rejected = [];
  for (const record of data.data || []) {
    const result = normalizeReliefWebRecord(record, now);
    if (result.event) normalized.push(result.event);
    else rejected.push({ id: record?.id || null, errors: result.errors });
  }
  return { events: normalized, rejected, receivedCount: data.totalCount || data.count || data.data?.length || 0 };
}
