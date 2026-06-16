import { createNormalizedEvent } from "../../events/normalized-event.js";
import { EIA_DATASETS } from "./finance-commodity-config.js";
import { createSeriesObservation, numericChange } from "./finance-records.js";

export const EIA_BASE_URL = "https://api.eia.gov/v2";

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function classifyEiaRecord(dataset, record, previousRecord = null) {
  const value = numeric(record?.value);
  const previousValue = numeric(previousRecord?.value);
  const { change, changePercent } = numericChange(value, previousValue);
  const materialByAbs = Number.isFinite(change) && Number.isFinite(dataset.materialChange) && Math.abs(change) >= dataset.materialChange;
  const materialByPct = Number.isFinite(changePercent) && Number.isFinite(dataset.materialPercentChange) && Math.abs(changePercent) >= dataset.materialPercentChange;
  const revised = record?.updated && previousRecord?.updated && record.updated !== previousRecord.updated;
  const material = materialByAbs || materialByPct;
  return {
    datasetId: dataset.id,
    seriesId: record?.series || dataset.seriesId,
    commodity: dataset.commodity,
    type: material ? dataset.type : revised ? "production-level-revised" : "official-energy-observation",
    period: record?.period || record?.date,
    value,
    previousValue,
    change,
    changePercent,
    units: record?.units || dataset.units,
    publishedAt: record?.updated || record?.period || record?.date,
    revisedAt: revised ? record.updated : null,
    sourceUrl: `https://www.eia.gov/opendata/browser/${dataset.route}`,
    material: Boolean(revised || material),
  };
}

export function normalizeEiaRecord(dataset, record, previousRecord = null, now = new Date()) {
  const signal = classifyEiaRecord(dataset, record, previousRecord);
  const observation = createSeriesObservation({
    domain: "commodity-supply-chain",
    category: "energy",
    type: signal.type,
    seriesId: signal.seriesId,
    occurredAt: signal.period,
    publishedAt: signal.publishedAt,
    updatedAt: signal.revisedAt || signal.publishedAt,
    value: signal.value,
    previousValue: signal.previousValue,
    change: signal.change,
    changePercent: signal.changePercent,
    units: signal.units,
    sourceName: "U.S. Energy Information Administration",
    sourceUrl: signal.sourceUrl,
    geographic: false,
    metadata: signal,
  });
  if (!signal.material) return { event: null, observation, errors: [] };
  const result = createNormalizedEvent({
    id: `eia:${signal.datasetId}:${signal.seriesId}:${signal.period}`,
    provider: "eia",
    providerEventId: `${signal.datasetId}:${signal.period}`,
    domain: "commodity-supply-chain",
    category: "commodity",
    type: signal.type,
    subtype: signal.commodity,
    title: `${signal.commodity}: ${signal.type.replace(/-/g, " ")}`,
    description: `EIA reported ${signal.value ?? "missing"} ${signal.units || ""} for ${signal.seriesId}. This is an official data signal and does not claim market causality.`,
    geographic: false,
    mapDisplayStatus: "not-mapped",
    nonGeographicReason: "EIA series observations are official time-series records; only facility or regional grid records should be mapped.",
    startedAt: signal.period || now,
    updatedAt: signal.revisedAt || signal.publishedAt || now,
    ingestedAt: now,
    severity: signal.type === "production-level-revised" ? 45 : 58,
    confidence: 90,
    status: "monitoring",
    sourceName: "U.S. Energy Information Administration",
    sourceUrl: signal.sourceUrl,
    sourceType: "Official",
    sourcePublishedAt: signal.publishedAt || null,
    tags: ["EIA", signal.commodity, signal.seriesId, signal.type],
    metadata: {
      ...signal,
      recordKind: "event",
      observation,
      verificationStatus: "primary-confirmed",
      coordinateMethod: "not applicable",
      severityReason: "Severity reflects configured commodity-signal rules, not verified market impact.",
      details: {
        Dataset: signal.datasetId,
        Series: signal.seriesId,
        Commodity: signal.commodity,
        Value: signal.value ?? "Missing",
        Previous: signal.previousValue ?? "Missing",
        Change: signal.change ?? "Unknown",
        Units: signal.units || "Unknown",
      },
    },
  });
  return { event: result.valid ? result.event : null, observation, errors: result.errors };
}

export async function fetchEiaEvents(context = {}) {
  const apiKey = globalThis?.process?.env?.EIA_API_KEY;
  if (!apiKey) {
    return {
      events: [],
      rejected: [],
      observations: [],
      status: "configuration-required",
      warnings: ["EIA_API_KEY is required before EIA can be queried."],
      safeError: "EIA is not configured. Add EIA_API_KEY in server environment variables.",
      requestAttempted: false,
    };
  }
  const now = new Date(context.now);
  const events = [];
  const rejected = [];
  const observations = [];
  for (const dataset of (context.eiaDatasets || EIA_DATASETS).slice(0, 10)) {
    const params = new URLSearchParams({ api_key: apiKey, frequency: dataset.frequency, "data[0]": "value", sort: "period", direction: "desc", length: "2" });
    const payload = await context.fetchJson(`${EIA_BASE_URL}/${dataset.route}?${params}`, "EIA API");
    const [latest, previous] = payload.response?.data || [];
    if (!latest) {
      rejected.push({ id: dataset.id, errors: ["missing EIA record"] });
      continue;
    }
    const result = normalizeEiaRecord(dataset, latest, previous, now);
    observations.push(result.observation);
    const state = await context.providerStateStore?.get?.("eia", dataset.id);
    if (state?.lastDatasetUpdate === latest.updated && state?.lastObservationValue === String(latest.value) && !result.event) continue;
    if (result.event) events.push(result.event);
    await context.providerStateStore?.update?.("eia", dataset.id, {
      lastObservationDate: latest.period || latest.date,
      lastObservationValue: String(latest.value),
      lastDatasetUpdate: latest.updated || latest.period || latest.date,
    });
  }
  return { events, rejected, observations, receivedCount: observations.length };
}
