import { createNormalizedEvent } from "../../events/normalized-event.js";
import { FRED_SERIES_ALLOWLIST } from "./finance-commodity-config.js";
import { createSeriesObservation, numericChange } from "./finance-records.js";

export const FRED_BASE_URL = "https://api.stlouisfed.org/fred";

function parseFredNumber(value) {
  if (value === "." || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function classifyFredObservation(seriesConfig, observation, previousObservation = null, metadata = {}) {
  const value = parseFredNumber(observation?.value);
  const previousValue = parseFredNumber(previousObservation?.value);
  const { change, changePercent } = numericChange(value, previousValue);
  const materialByAbs = Number.isFinite(change) && Number.isFinite(seriesConfig.materialChange) && Math.abs(change) >= seriesConfig.materialChange;
  const materialByPct = Number.isFinite(changePercent) && Number.isFinite(seriesConfig.materialPercentChange) && Math.abs(changePercent) >= seriesConfig.materialPercentChange;
  const revised = observation?.realtime_start && observation?.realtime_end && observation.realtime_start !== observation.realtime_end;
  const eventType = revised ? "macro-revision" : materialByAbs || materialByPct ? "macro-threshold-crossing" : "macro-observation";
  return {
    seriesId: seriesConfig.id,
    seriesTitle: metadata.title || seriesConfig.id,
    releaseId: seriesConfig.releaseId,
    releaseName: seriesConfig.releaseName,
    observationDate: observation?.date,
    value,
    previousValue,
    absoluteChange: change,
    percentChange: changePercent,
    units: metadata.units || null,
    frequency: metadata.frequency || null,
    seasonalAdjustment: metadata.seasonal_adjustment || null,
    publishedAt: observation?.realtime_start || observation?.date,
    revisedAt: revised ? observation.realtime_end : null,
    sourceUrl: `https://fred.stlouisfed.org/series/${encodeURIComponent(seriesConfig.id)}`,
    eventType,
    material: Boolean(revised || materialByAbs || materialByPct),
  };
}

export function normalizeFredObservation(seriesConfig, observation, previousObservation = null, metadata = {}, now = new Date()) {
  const classification = classifyFredObservation(seriesConfig, observation, previousObservation, metadata);
  const observationRecord = createSeriesObservation({
    domain: "finance-markets",
    category: "macro-economic-indicator",
    type: classification.eventType,
    seriesId: seriesConfig.id,
    occurredAt: classification.observationDate,
    publishedAt: classification.publishedAt,
    updatedAt: classification.revisedAt || classification.publishedAt,
    value: classification.value,
    previousValue: classification.previousValue,
    change: classification.absoluteChange,
    changePercent: classification.percentChange,
    units: classification.units,
    sourceName: "Federal Reserve Economic Data (FRED)",
    sourceUrl: classification.sourceUrl,
    geographic: false,
    metadata: classification,
  });
  if (!classification.material) return { event: null, observation: observationRecord, errors: [] };
  const result = createNormalizedEvent({
    id: `fred:${seriesConfig.id}:${classification.observationDate}:${classification.eventType}`,
    provider: "fred",
    providerEventId: `${seriesConfig.id}:${classification.observationDate}`,
    domain: "finance-markets",
    category: "finance",
    type: classification.eventType === "macro-revision" ? "economic-revision" : "economic-release",
    subtype: classification.seriesId,
    title: `${classification.seriesTitle}: ${classification.eventType === "macro-revision" ? "revision reported" : "material observation reported"}`,
    description: `FRED published ${classification.seriesId} at ${classification.value ?? "missing"}${classification.units ? ` ${classification.units}` : ""}. Automated threshold interpretation requires analyst review.`,
    geographic: false,
    mapDisplayStatus: "not-mapped",
    nonGeographicReason: "FRED macroeconomic observations are time-series records, not event coordinates.",
    startedAt: classification.observationDate || now,
    updatedAt: classification.revisedAt || classification.publishedAt || classification.observationDate || now,
    ingestedAt: now,
    severity: classification.eventType === "macro-revision" ? 45 : 55,
    confidence: 90,
    status: "monitoring",
    sourceName: "Federal Reserve Economic Data (FRED)",
    sourceUrl: classification.sourceUrl,
    sourceType: "Official",
    sourcePublishedAt: classification.publishedAt || null,
    tags: ["FRED", classification.seriesId, classification.releaseName],
    metadata: {
      ...classification,
      recordKind: "event",
      observation: observationRecord,
      verificationStatus: "primary-confirmed",
      coordinateMethod: "not applicable",
      severityReason: "Severity reflects configured economic-signal rules, not a verified market impact.",
      details: {
        Series: classification.seriesId,
        Release: classification.releaseName,
        Value: classification.value ?? "Missing",
        Previous: classification.previousValue ?? "Missing",
        Change: classification.absoluteChange ?? "Unknown",
        "Change percent": classification.percentChange === null ? "Unknown" : `${classification.percentChange.toFixed(2)}%`,
      },
    },
  });
  return { event: result.valid ? result.event : null, observation: observationRecord, errors: result.errors };
}

export async function fetchFredEvents(context = {}) {
  const apiKey = globalThis?.process?.env?.FRED_API_KEY;
  if (!apiKey) {
    return {
      events: [],
      rejected: [],
      observations: [],
      status: "configuration-required",
      warnings: ["FRED_API_KEY is required before FRED can be queried."],
      safeError: "FRED is not configured. Add FRED_API_KEY in server environment variables.",
      requestAttempted: false,
    };
  }
  const now = new Date(context.now);
  const targets = (context.fredSeries || FRED_SERIES_ALLOWLIST).slice(0, 12);
  const events = [];
  const rejected = [];
  const observations = [];
  for (const seriesConfig of targets) {
    const params = new URLSearchParams({ api_key: apiKey, file_type: "json", series_id: seriesConfig.id });
    const metadata = (await context.fetchJson(`${FRED_BASE_URL}/series?${params}`, "FRED series")).seriess?.[0] || {};
    const observationsParams = new URLSearchParams({ api_key: apiKey, file_type: "json", series_id: seriesConfig.id, sort_order: "desc", limit: "2" });
    const payload = await context.fetchJson(`${FRED_BASE_URL}/series/observations?${observationsParams}`, "FRED observations");
    const [latest, previous] = payload.observations || [];
    if (!latest) {
      rejected.push({ id: seriesConfig.id, errors: ["missing observation"] });
      continue;
    }
    const state = await context.providerStateStore?.get?.("fred", seriesConfig.id);
    const result = normalizeFredObservation(seriesConfig, latest, previous, metadata, now);
    observations.push(result.observation);
    if (state?.lastObservationDate === latest.date && state?.lastObservationValue === latest.value && !result.event) continue;
    if (result.event) events.push(result.event);
    await context.providerStateStore?.update?.("fred", seriesConfig.id, {
      lastObservationDate: latest.date,
      lastObservationValue: latest.value,
      lastRevisionTimestamp: latest.realtime_end || latest.realtime_start || null,
    });
  }
  return { events, rejected, observations, receivedCount: observations.length };
}
