/** Independent maritime evidence views over the existing evidence records.
 * No AIS-to-cargo conversion, dark-vessel detection, forecast, or risk score.
 */
import { recordsKnownBy } from "./evidence-records.js";

export const MARITIME_SIGNAL_METHOD = "maritime-signals-v1";
export const MARITIME_SIGNAL_IDS = ["visibleAIS", "inferredDarkTraffic", "cargoThroughput", "securityRisk"];
export const MARITIME_SIGNAL_LABELS = {
  visibleAIS: "Visible AIS observations",
  inferredDarkTraffic: "Inferred / dark traffic",
  cargoThroughput: "Cargo-confirmed throughput",
  securityRisk: "Security risk",
};

const NOTES = {
  visibleAIS: "AIS measures reporting coverage. Missing AIS does not establish no ships or zero cargo flow.",
  inferredDarkTraffic: "An AIS gap alone cannot establish a dark transit, vessel identity, cargo, or illegal behavior.",
  cargoThroughput: "Cargo confirmation and published cargo estimates stay distinct. Counts are not volume or a recovery verdict.",
  securityRisk: "Cargo movement and diplomacy do not establish safe passage. Missing incident reports do not establish low risk.",
};

export function maritimeNumberOrNull(value) {
  if (!["number", "string"].includes(typeof value) || String(value).trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function classify(record) {
  const extra = record.extra || {};
  // Proxy and inference guards take priority over imported labels.
  if (extra.maritimeSignal === "inferredDarkTraffic" || extra.darkTrafficInference === true) return "inferredDarkTraffic";
  if (extra.proxyNotThroughput || String(record.unit || "").startsWith("n_total") || extra.maritimeSignal === "visibleAIS") return "visibleAIS";
  if (record.evidenceKind === "physical-security-report") return "securityRisk";
  if (["cargo-confirmed", "published-cargo-estimate"].includes(extra.measurementBasis)
    && ["throughput-measurement", "maritime-aggregate"].includes(record.evidenceKind)) return "cargoThroughput";
  return null;
}

export function maritimeEvidenceFreshness(record, now, sourceStatus = {}) {
  if (["source-invalidated", "source-aged-out"].includes(record.freshnessPolicy)) return "retired";
  if (record.extra?.forecast === true || record.extra?.conditional === true || record.extra?.scenario === true) return "forecast-context";
  const provider = sourceStatus[record.sourceId];
  if (provider?.stale || ["stale", "degraded", "unavailable", "disabled"].includes(provider?.status) || provider?.ok === false) return "stale-or-unavailable";
  const period = record.extra?.observationPeriod || {};
  // A notice valid until tomorrow can describe a current risk. Its expiry is
  // not a future observation; observation windows and effective starts are.
  const periodDates = [period.start, period.end, record.effectiveStart, record.extra?.day].filter(Boolean).map(Date.parse);
  if (periodDates.some(time => Number.isFinite(time) && time > now)) return "future-period";
  if (record.reportedAt && Date.parse(record.reportedAt) > now) return "future-publication";
  const timestamp = record.observedAt || period.end || record.reportedAt;
  const time = timestamp ? Date.parse(timestamp) : NaN;
  if (Number.isFinite(time) && time > now) return "future-observation";
  if (record.extra?.historicalPublic || record.extra?.frozenSample) return "historical";
  const maxAge = maritimeNumberOrNull(record.extra?.maxAgeMs);
  if (maxAge == null || !Number.isFinite(time)) return "unknown";
  // Retrieval is an acquisition clock, never the content freshness clock.
  return now - time > maxAge ? "stale" : "current";
}

function confidence(record) {
  const input = record.extra?.analyticalConfidence;
  if (!input || !["low", "medium", "high"].includes(input.level) || !input.rationale) {
    return { level: "unknown", rationale: "No scoped analytical confidence assessment." };
  }
  return { level: input.level, rationale: String(input.rationale) };
}

function evidenceView(record, signalId, now, sourceStatus) {
  const origin = record.valueOrigin || "reported";
  const basis = record.extra?.measurementBasis || null;
  const inference = ["inferred", "modeled"].includes(origin);
  const numeric = maritimeNumberOrNull(record.value);
  const freshness = maritimeEvidenceFreshness(record, now, sourceStatus);
  const hasCargoBasis = signalId === "cargoThroughput" && !inference && numeric != null && Boolean(record.unit);
  return {
    id: record.id,
    revision: record.revision || 1,
    title: record.title,
    sourceId: record.sourceId || null,
    sourceUrl: record.sourceUrl || null,
    organization: record.upstreamOrganization || record.sourceOrganizationId || null,
    method: record.extra?.method || null,
    basis: freshness === "forecast-context" || freshness === "future-period" ? "forecast-or-future-context" : signalId === "inferredDarkTraffic" ? "inference" : hasCargoBasis ? basis : signalId === "cargoThroughput" ? "unconfirmed" : "observation-or-report",
    value: numeric,
    unit: record.unit || null,
    valueOrigin: origin,
    synthetic: record.synthetic === true,
    observedAt: record.observedAt || null,
    reportedAt: record.reportedAt || null,
    retrievedAt: record.retrievedAt || null,
    period: record.extra?.observationPeriod || { start: record.effectiveStart || record.observedAt || null, end: record.effectiveEnd || record.observedAt || null },
    coverage: record.coverage || null,
    scope: record.claimScope || null,
    confidence: confidence(record),
    freshness,
    securityState: signalId === "securityRisk" ? record.extra?.securityState || "unknown" : null,
    limitations: record.qualityLimitations || [],
    contradictsId: record.extra?.contradictsId || null,
  };
}

export function assessMaritimeSignals({ records = [], chokepointId, now = Date.now(), asOf = null, sourceStatus = {} } = {}) {
  const clock = Number(now);
  const cutoff = asOf ? Date.parse(asOf) : clock;
  const known = recordsKnownBy(records, cutoff).filter(record => record.chokepointId === chokepointId);
  const result = {};
  for (const id of MARITIME_SIGNAL_IDS) {
    const evidence = known.filter(record => classify(record) === id).map(record => evidenceView(record, id, clock, sourceStatus));
    const usable = evidence.filter(item => !["retired", "stale", "stale-or-unavailable", "future-observation", "future-publication", "forecast-context", "future-period"].includes(item.freshness)
      && (id !== "visibleAIS" || !["inferred", "modeled"].includes(item.valueOrigin)));
    const contradictions = evidence.filter(item => item.contradictsId).map(item => ({ id: item.id, contradictsId: item.contradictsId }));
    const cargo = usable.filter(item => ["cargo-confirmed", "published-cargo-estimate"].includes(item.basis));
    // Explicit contradictions are distinct from estimates with different methods or scopes.
    const state = contradictions.length ? "contested"
      : !usable.length ? "unknown"
      : id === "inferredDarkTraffic" ? "inferred"
      : id === "cargoThroughput" ? cargo.some(item => item.basis === "cargo-confirmed") ? "cargo-confirmed" : cargo.length ? "published-estimate" : "unknown"
      : id === "securityRisk" ? "reports-available" : "observations-available";
    result[id] = {
      id,
      label: MARITIME_SIGNAL_LABELS[id],
      state,
      method: MARITIME_SIGNAL_METHOD,
      evaluatedAt: new Date(clock).toISOString(),
      knowledgeCutoff: new Date(cutoff).toISOString(),
      evidenceIds: evidence.map(item => item.id),
      evidence,
      contradictions,
      // No invented aggregate confidence or coverage percentage.
      confidence: evidence.length ? "see-each-record" : "unknown",
      coverage: evidence.length ? "see-each-record" : "unknown",
      currentEvidenceIds: (id === "cargoThroughput" ? cargo : usable).filter(item => item.freshness === "current").map(item => item.id),
      unknowns: [
        ...(!evidence.length ? ["No qualifying evidence in this scope and knowledge window."] : []),
        ...(!usable.some(item => item.freshness === "current") ? ["Current coverage is not established."] : []),
        ...(evidence.some(item => !item.coverage) ? ["Coverage missing for one or more records."] : []),
        ...(evidence.some(item => !item.method) ? ["Method missing for one or more records."] : []),
        ...(evidence.some(item => ["forecast-context", "future-period"].includes(item.freshness)) ? ["Forecasts and future periods are context, excluded from observed flow."] : []),
        ...(id === "cargoThroughput" && !cargo.some(item => item.basis === "cargo-confirmed") ? ["Cargo-confirmed throughput is unknown."] : []),
        ...(id === "securityRisk" ? ["Passage safety is not established by these reports."] : []),
      ],
      note: NOTES[id],
      synthesis: "No total, average, current operating verdict, or cross-signal inference.",
    };
  }
  return result;
}
