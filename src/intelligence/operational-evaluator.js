/**
 * Deterministic chokepoint operational evaluator covering L01–L11.
 * Evidence status, operating condition, trend, duration regime, severity,
 * confidence, and coverage stay separate. No unexplained composite risk score
 * substitutes for those fields.
 */

import { CHOKEPOINT_STATUSES, STRATEGIC_CHOKEPOINTS } from "../data/strategic-chokepoints.js";
import { MASTER_SOURCE_REGISTRY } from "../sources/master-source-registry.js";
import {
  DIMENSION_IDS,
  EVIDENCE_RANKS,
  OPERATIONAL_STATES,
  createAssessmentRecord,
  recordsKnownBy,
  uniqueOriginKeys,
  validateGeometry,
} from "./evidence-records.js";
import { confirmedWithinScope, isAuthoritativeSource } from "./source-authority.js";
import { THRESHOLD_POLICY, policySummary } from "./threshold-policy.js";
import { assessMaritimeSignals, maritimeEvidenceFreshness, maritimeNumberOrNull } from "./maritime-signals.js";

const DAY_MS = 86400000;
const CLOSURE_RE = /\b(closed|closure|shut)\b/i;
const DISRUPT_RE = /\b(disrupt(?:ed|ion)?|suspend(?:ed)?|blocked|halt(?:ed|ing)?|restricted|restriction|rerout(?:ed|ing)?|closed|closure)\b/i;
const DIPLOMACY_RE = /\b(ceasefire|agreement|accord|talks|diplomatic|negotiat)/i;
const LEGACY_STATUSES = [...CHOKEPOINT_STATUSES, "restricted", "recovering"];

function utcDay(value) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return null;
  return new Date(Date.UTC(
    new Date(time).getUTCFullYear(),
    new Date(time).getUTCMonth(),
    new Date(time).getUTCDate(),
  )).toISOString().slice(0, 10);
}

function inInterval(record, now) {
  const start = record.effectiveStart ? new Date(record.effectiveStart).getTime() : -Infinity;
  const end = record.effectiveEnd ? new Date(record.effectiveEnd).getTime() : Infinity;
  return now >= start && now <= end;
}

function textOf(record) {
  return `${record.title || ""} ${record.summary || ""}`;
}

function providerCaveats(sourceStatus = {}) {
  return Object.entries(sourceStatus)
    .filter(([, status]) => status?.stale || !status?.ok || ["degraded", "unavailable"].includes(status?.status))
    .map(([provider]) => `${provider} is degraded, stale, or unavailable.`)
    .sort();
}

function sourceRetired(record) {
  return record?.freshnessPolicy === "source-invalidated" || record?.freshnessPolicy === "source-aged-out";
}

export function compareThroughputRecords(observation, baseline, options = {}) {
  return comparableThroughput(observation, baseline, options);
}

function comparableThroughput(observation, baseline, { now = Date.now(), sourceStatus = {} } = {}) {
  if (!observation || !baseline) return { comparable: false, reason: "missing-observation-or-baseline" };
  if (sourceRetired(observation) || sourceRetired(baseline)) return { comparable: false, reason: "source-retired" };
  for (const record of [observation, baseline]) {
    if (record.extra?.proxyNotThroughput || String(record.unit || "").startsWith("n_total") || ["visibleAIS", "inferredDarkTraffic"].includes(record.extra?.maritimeSignal) || record.extra?.darkTrafficInference) return { comparable: false, reason: "vessel-activity-proxy-is-not-measured-throughput" };
    const freshness = maritimeEvidenceFreshness(record, now, sourceStatus);
    if (["retired", "stale", "stale-or-unavailable", "future-observation", "future-publication", "forecast-context", "future-period"].includes(freshness)) return { comparable: false, reason: `${freshness}-is-not-current-measured-throughput` };
  }
  if (observation.extra?.historicalPublic === true || observation.extra?.proxyNotThroughput === true || String(observation.unit || "").startsWith("n_total") || observation.extra?.maritimeSignal === "visibleAIS") {
    return { comparable: false, reason: "vessel-activity-proxy-is-not-measured-throughput" };
  }
  if (["inferred", "modeled"].includes(observation.valueOrigin) || observation.extra?.darkTrafficInference === true || observation.extra?.maritimeSignal === "inferredDarkTraffic" || observation.extra?.measurementBasis === "published-cargo-estimate") {
    return { comparable: false, reason: "inference-or-published-estimate-is-not-measured-throughput" };
  }
  if (observation.value == null || observation.value === "" || typeof observation.value === "boolean") return { comparable: false, reason: "missing-or-invalid-observation-value" };
  if (maritimeNumberOrNull(observation.value) == null || !(maritimeNumberOrNull(baseline.value) > 0)) return { comparable: false, reason: "invalid-numeric-value-or-baseline" };
  if (!observation.unit || !baseline.unit) return { comparable: false, reason: "missing-units" };
  if (observation.unit !== baseline.unit) return { comparable: false, reason: "incompatible-units" };
  if ((observation.extra?.vesselClass || null) !== (baseline.extra?.vesselClass || null)) return { comparable: false, reason: "incompatible-vessel-class" };
  if ((observation.extra?.direction || null) !== (baseline.extra?.direction || null)) return { comparable: false, reason: "incompatible-direction" };
  if ((observation.extra?.geographicScope || observation.chokepointId) !== (baseline.extra?.geographicScope || baseline.chokepointId)) {
    return { comparable: false, reason: "incompatible-geographic-scope" };
  }
  if (observation.coverage?.sourceId && baseline.coverage?.sourceId && observation.coverage.sourceId !== baseline.coverage.sourceId) {
    return { comparable: false, reason: "incompatible-source-coverage" };
  }
  if (!(Number(observation.value) >= 0) || !(Number(baseline.value) > 0)) return { comparable: false, reason: "non-positive-baseline-or-invalid-value" };
  return { comparable: true, reason: "comparable" };
}

export function recordsFromEvents(events = [], correlations = [], chokepointId) {
  const relatedIds = new Set(correlations.filter((item) => item.chokepointId === chokepointId).map((item) => String(item.eventId)));
  return events.filter((event) => relatedIds.has(String(event.id)) || event.chokepointId === chokepointId).map((event) => ({
    id: String(event.id),
    recordKind: "observation",
    evidenceKind: event.evidenceKind || (event.verificationStatus === "primary-confirmed" || /notice|advisory/i.test(event.sourceType || "") ? "official-notice" : "public-report"),
    subjectDomain: event.domain || "maritime",
    title: event.title,
    summary: event.summary,
    sourceId: event.sourceId || null,
    sourceUrl: event.sourceUrl || null,
    canonicalUrl: event.canonicalUrl || event.sourceUrl || null,
    upstreamOrganization: event.sourceName || event.source || null,
    sourceOrganizationId: event.sourceOrganizationId || null,
    syndication: event.syndication || null,
    observedAt: event.occurredAt ? new Date(event.occurredAt).toISOString() : null,
    reportedAt: event.updatedAt ? new Date(event.updatedAt).toISOString() : null,
    retrievedAt: new Date(event.updatedAt || event.occurredAt || 0).toISOString(),
    effectiveStart: event.effectiveStart || null,
    effectiveEnd: event.effectiveEnd || null,
    lat: event.lat ?? event.latitude ?? null,
    lon: event.lon ?? event.longitude ?? null,
    valueOrigin: event.valueOrigin || "reported",
    sourceTier: event.sourceTier,
    verificationStatus: event.verificationStatus,
    official: event.official,
    chokepointId,
    claimScope: event.claimScope || { chokepointId },
    extra: event.extra || {},
    synthetic: event.synthetic === true,
  }));
}

function dimensionUnknown(id, reason) {
  return { id, state: "unknown", evidenceIds: [], reasons: [reason], lastKnown: null };
}

export function evaluateThroughputRatio(dailyPairs, policy = THRESHOLD_POLICY) {
  const eligible = dailyPairs.filter((day) => day.comparable && Number(day.baseline) > 0 && day.traffic != null);
  if (eligible.length < policy.r7WindowDays) {
    return { r7: null, status: "unknown", reason: "insufficient-comparable-days", eligibleDays: eligible.length, usedDays: [] };
  }
  const window = eligible.slice(-policy.r7WindowDays);
  const sumT = window.reduce((sum, day) => sum + Number(day.traffic), 0);
  const sumB = window.reduce((sum, day) => sum + Number(day.baseline), 0);
  if (!(sumB > 0)) return { r7: null, status: "unknown", reason: "zero-or-absent-baseline", eligibleDays: eligible.length, usedDays: window.map((day) => day.day) };
  const r7 = sumT / sumB;
  return { r7, status: "computed", reason: "comparable-r7", eligibleDays: eligible.length, usedDays: window.map((day) => day.day), sumT, sumB };
}

export function consecutiveEligibleEvaluations(dailyPairs, { ratio, consecutive, comparator, policy = THRESHOLD_POLICY } = {}) {
  const byDay = new Map();
  for (const pair of dailyPairs) {
    if (!pair.day) continue;
    byDay.set(pair.day, pair);
  }
  const days = [...byDay.keys()].sort();
  let run = 0;
  let last = null;
  const hits = [];
  for (const day of days) {
    const end = Date.parse(`${day}T00:00:00Z`);
    const windowPairs = [];
    for (let i = 0; i < policy.r7WindowDays; i += 1) {
      const key = new Date(end - (policy.r7WindowDays - 1 - i) * DAY_MS).toISOString().slice(0, 10);
      const pair = byDay.get(key);
      if (!pair || !pair.comparable || pair.gap) {
        windowPairs.length = 0;
        break;
      }
      windowPairs.push(pair);
    }
    if (windowPairs.length !== policy.r7WindowDays) {
      run = 0;
      last = day;
      continue;
    }
    const evaluated = evaluateThroughputRatio(windowPairs, policy);
    if (evaluated.r7 == null) {
      run = 0;
      last = day;
      continue;
    }
    const match = comparator === "gte" ? evaluated.r7 >= ratio : evaluated.r7 < ratio;
    const expectedNext = last ? new Date(Date.parse(`${last}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10) : null;
    if (match && (!expectedNext || day === expectedNext || run === 0)) run += 1;
    else run = match ? 1 : 0;
    if (match) hits.push({ day, r7: evaluated.r7 });
    last = day;
  }
  return { consecutive: run, satisfied: run >= consecutive, hits };
}

export function evaluateRegimeDuration(dailyPairs, policy = THRESHOLD_POLICY) {
  if (!dailyPairs.length) {
    return { regime: "unknown", r7: null, reason: "insufficient-throughput-history", candidate: null };
  }
  const current = evaluateThroughputRatio(dailyPairs, policy);
  const persistent = consecutiveEligibleEvaluations(dailyPairs, {
    ratio: policy.persistentDegraded.ratio,
    consecutive: policy.persistentDegraded.consecutiveEligibleEvaluations,
    comparator: "lt",
    policy,
  });
  if (current.r7 == null) return { regime: "unknown", r7: null, reason: current.reason, candidate: null, current };
  if (persistent.satisfied) {
    return {
      regime: "persistent-degraded-candidate",
      r7: current.r7,
      reason: `R7 ${current.r7.toFixed(3)} below ${policy.persistentDegraded.ratio} for ${policy.persistentDegraded.consecutiveEligibleEvaluations} consecutive eligible evaluations`,
      candidate: "persistent-degraded",
      current,
      persistent,
      policy: policySummary(policy),
    };
  }
  if (current.r7 < policy.persistentDegraded.ratio) {
    return { regime: "transient-or-unqualified-shortfall", r7: current.r7, reason: "ratio-below-threshold-without-required-duration", candidate: null, current, persistent };
  }
  return { regime: "not-degraded-by-this-policy", r7: current.r7, reason: "ratio-at-or-above-persistent-threshold", candidate: null, current, persistent };
}

export function sensitivityReport(dailyPairs, policy = THRESHOLD_POLICY) {
  const rows = [];
  for (const ratio of policy.sensitivity.ratios) {
    for (const duration of policy.sensitivity.durations) {
      const result = consecutiveEligibleEvaluations(dailyPairs, { ratio, consecutive: duration, comparator: "lt", policy });
      rows.push({ ratio, duration, satisfied: result.satisfied, consecutive: result.consecutive });
    }
  }
  return { policy: policySummary(policy), rows, note: "Fixture sensitivity is not predictive accuracy. Historical calibration must use separate cases without look-ahead." };
}

function buildDailyPairs(records, chokepointId, options = {}) {
  const observations = records.filter((record) => record.chokepointId === chokepointId && record.evidenceKind === "throughput-measurement" && record.extra?.role !== "baseline");
  const baselines = records.filter((record) => record.chokepointId === chokepointId && (record.evidenceKind === "baseline-observation" || record.extra?.role === "baseline"));
  const baselineByDay = new Map(baselines.map((record) => [record.extra?.day || utcDay(record.observedAt), record]));
  const days = new Map();
  for (const observation of observations) {
    const day = observation.extra?.day || utcDay(observation.observedAt);
    if (!day) continue;
    const baseline = baselineByDay.get(day) || baselines.find((item) => item.extra?.version && item.extra.version === observation.extra?.baselineVersion) || baselines[0];
    const comparability = comparableThroughput(observation, baseline, options);
    days.set(day, {
      day,
      traffic: comparability.comparable ? Number(observation.value) : null,
      baseline: comparability.comparable ? Number(baseline.value) : null,
      comparable: comparability.comparable,
      reason: comparability.reason,
      gap: observation.extra?.gap === true || !comparability.comparable,
      observationId: observation.id,
      baselineId: baseline?.id || null,
      baselineVersion: baseline?.extra?.version || observation.extra?.baselineVersion || null,
    });
  }
  return [...days.values()].sort((a, b) => a.day.localeCompare(b.day));
}

function restrictionRecords(records, now) {
  return records.filter((record) => {
    if (record.extra?.operatingBulletin) return false;
    if (record.recordKind !== "restriction-geometry" && record.evidenceKind !== "official-notice") return false;
    if (record.extra?.restriction || record.recordKind === "restriction-geometry") return inInterval(record, now);
    return DISRUPT_RE.test(textOf(record)) && inInterval(record, now);
  });
}

export function evaluateRestriction(record) {
  const approximate = record.geometryPrecision === "approximate";
  const geometry = record.geometry ? validateGeometry(record.geometry, { approximate }) : { valid: approximate, errors: approximate ? [] : ["missing geometry"] };
  const overclaim = record.extra?.expandsToEntireSea === true || record.extra?.expandsToEntireCountry === true;
  return {
    id: record.id,
    valid: geometry.valid && !overclaim,
    errors: overclaim ? ["restriction expanded beyond sourced geometry"] : geometry.errors,
    issuingSourceId: record.sourceId,
    activity: record.claimScope?.activity || record.extra?.activity || null,
    vesselClass: record.claimScope?.vesselClass || record.extra?.vesselClass || null,
    direction: record.claimScope?.direction || record.extra?.direction || null,
    effectiveStart: record.effectiveStart,
    effectiveEnd: record.effectiveEnd,
    expired: record.effectiveEnd ? Date.parse(record.effectiveEnd) < Date.now() : false,
    expiryIsNotRecovery: true,
  };
}

function evaluateDimensions(records, { now, registry, dailyPairs, policy }) {
  const dimensions = {};
  const diplomacyEvidence = records.filter((record) => record.evidenceKind === "diplomatic-statement" || DIPLOMACY_RE.test(textOf(record)));
  const physical = records.filter((record) => record.evidenceKind === "physical-security-report" && inInterval(record, now));
  const activeRestrictions = restrictionRecords(records, now);
  const commercial = records.filter((record) => ["insurer-quote", "freight-quote", "commercial-terms"].includes(record.evidenceKind) && inInterval(record, now));
  const throughput = evaluateThroughputRatio(dailyPairs, policy);

  dimensions.diplomacy = diplomacyEvidence.length
    ? { id: "diplomacy", state: "improving", evidenceIds: diplomacyEvidence.map((item) => item.id), reasons: diplomacyEvidence.slice(0, 3).map((item) => item.title), lastKnown: "improving" }
    : dimensionUnknown("diplomacy", "no diplomatic evidence");

  const operatingBulletins = records.filter((record) => record.evidenceKind === "official-notice" && record.extra?.operatingBulletin === true && inInterval(record, now));
  if (activeRestrictions.length) {
    dimensions.physicalAccess = {
      id: "physicalAccess",
      state: activeRestrictions.some((item) => CLOSURE_RE.test(textOf(item))) ? "disrupted" : "restricted",
      evidenceIds: activeRestrictions.map((item) => item.id),
      reasons: ["active restriction or physical-security evidence"],
      lastKnown: "restricted",
    };
  } else if (physical.length) {
    dimensions.physicalAccess = { id: "physicalAccess", state: "impaired", evidenceIds: physical.map((item) => item.id), reasons: ["physical-security reports without current restriction geometry"], lastKnown: "impaired" };
  } else if (operatingBulletins.length) {
    dimensions.physicalAccess = {
      id: "physicalAccess",
      state: "normal",
      evidenceIds: operatingBulletins.map((item) => item.id),
      reasons: ["current operating bulletin with no qualifying restriction in force"],
      lastKnown: "normal",
    };
  } else {
    dimensions.physicalAccess = dimensionUnknown("physicalAccess", "no qualifying physical-access evidence");
  }

  if (throughput.r7 == null) {
    dimensions.throughput = dimensionUnknown("throughput", throughput.reason || "no comparable throughput");
  } else if (throughput.r7 < policy.persistentDegraded.ratio) {
    dimensions.throughput = { id: "throughput", state: "disrupted", evidenceIds: dailyPairs.map((day) => day.observationId).filter(Boolean), reasons: [`R7=${throughput.r7.toFixed(3)}`], lastKnown: "disrupted", r7: throughput.r7 };
  } else {
    dimensions.throughput = { id: "throughput", state: "normal", evidenceIds: dailyPairs.map((day) => day.observationId).filter(Boolean), reasons: [`R7=${throughput.r7.toFixed(3)}`], lastKnown: "normal", r7: throughput.r7 };
  }

  if (!commercial.length) {
    dimensions.commercialAccess = dimensionUnknown("commercialAccess", "no insurer/freight/commercial-term evidence");
  } else {
    const impaired = commercial.some((item) => item.extra?.impaired !== false && (Number(item.value) > 0 || item.extra?.availability === "limited" || item.extra?.impaired === true));
    dimensions.commercialAccess = {
      id: "commercialAccess",
      state: impaired ? "impaired" : "normal",
      evidenceIds: commercial.map((item) => item.id),
      reasons: commercial.map((item) => item.title),
      lastKnown: impaired ? "impaired" : "normal",
    };
  }

  for (const id of DIMENSION_IDS) {
    if (!dimensions[id]) dimensions[id] = dimensionUnknown(id, "unconfigured");
  }
  return dimensions;
}

export function evaluateSupply(records = []) {
  const stocks = records.filter((record) => record.recordKind === "supply-exposure" && record.extra?.quantityClass === "stock");
  const flows = records.filter((record) => record.recordKind === "supply-exposure" && record.extra?.quantityClass === "flow");
  const announced = records.find((record) => record.extra?.supplyClass === "announced");
  const inventory = records.find((record) => record.extra?.supplyClass === "inventory");
  const production = records.find((record) => record.extra?.supplyClass === "production-rate");
  const routeCapacity = records.find((record) => record.extra?.supplyClass === "route-capacity");
  const deliverable = records.find((record) => record.extra?.supplyClass === "deliverable");
  const errors = [];
  if (stocks.length && flows.length && records.some((record) => record.extra?.summedStockAndFlow)) {
    errors.push("cannot-sum-stocks-and-flows");
  }
  const units = new Set(records.filter((record) => record.recordKind === "supply-exposure" && record.unit).map((record) => `${record.unit}|${record.extra?.timeWindow || ""}`));
  if (records.some((record) => record.extra?.mixedUnitsSummed) || (units.size > 1 && records.some((record) => record.extra?.summed))) {
    errors.push("incompatible-units-or-windows");
  }
  if (records.some((record) => record.extra?.doubleCountedCargo)) errors.push("double-counted-cargo");
  const result = {
    announced: announced ? { value: announced.value, unit: announced.unit, evidenceIds: [announced.id] } : { value: null, unit: null, evidenceIds: [] },
    inventory: inventory ? { value: inventory.value, unit: inventory.unit, evidenceIds: [inventory.id] } : { value: null, unit: null, evidenceIds: [] },
    productionRate: production ? { value: production.value, unit: production.unit, evidenceIds: [production.id] } : { value: null, unit: null, evidenceIds: [] },
    routeCapacity: routeCapacity ? { value: routeCapacity.value, unit: routeCapacity.unit, evidenceIds: [routeCapacity.id] } : { value: null, unit: null, evidenceIds: [] },
    deliverable: deliverable && !errors.length
      ? { value: deliverable.value, unit: deliverable.unit, destination: deliverable.extra?.destination || null, period: deliverable.extra?.period || null, evidenceIds: [deliverable.id], origin: deliverable.valueOrigin }
      : { value: null, unit: null, destination: deliverable?.extra?.destination || null, period: deliverable?.extra?.period || null, evidenceIds: deliverable ? [deliverable.id] : [], origin: "unknown", range: deliverable?.extra?.range || null },
    errors,
    unknown: Boolean(errors.length || !deliverable),
  };
  return result;
}

export function evaluateExposure(relationships = [], records = []) {
  const chain = relationships.filter((item) => ["depends_on", "routes_via", "affects"].includes(item.extra?.edgeType || item.edgeType));
  return chain.map((item) => {
    const assertion = item.extra?.assertionClass || item.assertionClass || "heuristic";
    const hypothesized = assertion === "hypothesized" || item.extra?.hypothesized === true;
    const proximityOnly = item.extra?.proximityOnly === true || item.extra?.timingOnly === true;
    const valid = !proximityOnly && Array.isArray(item.parentEvidenceIds) && item.parentEvidenceIds.length > 0 && assertion !== "heuristic";
    return {
      id: item.id,
      fromId: item.extra?.fromId,
      toId: item.extra?.toId,
      edgeType: item.extra?.edgeType,
      commodity: item.extra?.commodity || null,
      direction: item.extra?.direction || null,
      period: { start: item.effectiveStart, end: item.effectiveEnd },
      lag: item.extra?.lag || null,
      assumptions: item.extra?.assumptions || [],
      evidenceIds: item.parentEvidenceIds || [],
      assertionClass: assertion,
      hypothesized,
      rejected: proximityOnly || (!valid && hypothesized === false && assertion === "heuristic" && item.extra?.claimedVerified === true),
      note: proximityOnly ? "proximity or simultaneous timing is not verified causality" : hypothesized ? "reported dependency vs hypothesized consequence are distinct" : null,
    };
  });
}

export function evaluateDisplacement(records = []) {
  const observed = records.filter((record) => record.evidenceKind === "flow-observation" && record.valueOrigin === "observed");
  const modeled = records.filter((record) => record.evidenceKind === "flow-observation" && record.valueOrigin === "modeled");
  const hypothesized = records.filter((record) => record.evidenceKind === "flow-observation" && (record.valueOrigin === "inferred" || record.extra?.assertionClass === "hypothesized"));
  const flags = [];
  for (const record of [...observed, ...modeled, ...hypothesized]) {
    if (record.extra?.incompatibleVesselClass) flags.push({ id: record.id, flag: "incompatible-vessel-class" });
    if (record.extra?.receiverCoverageChanged) flags.push({ id: record.id, flag: "changing-receiver-coverage" });
    if (!record.extra?.destination) flags.push({ id: record.id, flag: "missing-destination" });
    if (record.extra?.sourceRevision) flags.push({ id: record.id, flag: "source-revision" });
    if (record.extra?.forcedBalance) flags.push({ id: record.id, flag: "forced-balance-rejected" });
  }
  const accepted = observed.filter((record) => record.extra?.alternativeRoute && record.effectiveStart);
  return {
    observed: accepted.map((record) => ({ id: record.id, route: record.extra.alternativeRoute, period: { start: record.effectiveStart, end: record.effectiveEnd } })),
    modeled: modeled.map((record) => record.id),
    hypothesized: hypothesized.map((record) => record.id),
    lowerLocalTrafficAlone: records.some((record) => record.extra?.lowerLocalTrafficImpliesDiversion) ? "rejected" : "not-claimed",
    flags,
  };
}

function groupPredicate(groupId, { dimensions, regime, supply, records, now, policy }) {
  const spec = policy.groups[groupId];
  if (!spec) return { id: groupId, state: "unknown", passing: false, reason: "unconfigured-predicate" };
  if (groupId === "throughput") {
    const r7 = dimensions.throughput.r7;
    if (r7 == null) return { id: groupId, state: "unknown", passing: false, reason: "missing-throughput", spec };
    const passing = r7 >= spec.threshold && dimensions.throughput.state === "normal";
    return { id: groupId, state: passing ? "improving" : "not-improving", passing, reason: `R7 ${r7}`, spec };
  }
  if (groupId === "physicalAccess") {
    const passing = dimensions.physicalAccess.state === "normal";
    if (dimensions.physicalAccess.state === "unknown") return { id: groupId, state: "unknown", passing: false, reason: "missing-physical-access", spec };
    return { id: groupId, state: passing ? "improving" : dimensions.physicalAccess.state, passing, reason: dimensions.physicalAccess.reasons[0], spec };
  }
  if (groupId === "commercialAccess") {
    if (dimensions.commercialAccess.state === "unknown") return { id: groupId, state: "unknown", passing: false, reason: "missing-commercial-access", spec };
    const passing = dimensions.commercialAccess.state === "normal";
    return { id: groupId, state: passing ? "improving" : "not-improving", passing, reason: dimensions.commercialAccess.reasons[0], spec };
  }
  if (groupId === "deliverability") {
    if (supply.unknown || supply.deliverable.value == null) return { id: groupId, state: "unknown", passing: false, reason: "deliverable-supply-unknown", spec };
    return { id: groupId, state: "improving", passing: true, reason: "deliverable-supply-present", spec };
  }
  return { id: groupId, state: "unknown", passing: false, reason: "unconfigured-predicate", spec };
}

export function evaluateRecoveryBreadth({ dimensions, regime, supply, records, now, dailyPairs, policy = THRESHOLD_POLICY }) {
  const groupIds = ["throughput", "physicalAccess", "commercialAccess", "deliverability"];
  const groups = groupIds.map((id) => groupPredicate(id, { dimensions, regime, supply, records, now, policy }));
  const missing = groups.filter((group) => group.state === "unknown").length;
  const improving = groups.filter((group) => group.passing).length;
  const contradictory = records.filter((record) => record.extra?.contradictsRecovery === true).map((record) => record.id);
  const veto = records.filter((record) => record.extra?.recoveryVeto === true && inInterval(record, now));
  const ratio = consecutiveEligibleEvaluations(dailyPairs, {
    ratio: policy.broadRecovery.ratio,
    consecutive: policy.broadRecovery.consecutiveEligibleEvaluations,
    comparator: "gte",
    policy,
  });
  const requiredOk = policy.broadRecovery.requiredGroups.every((id) => groups.find((group) => group.id === id)?.passing);
  const broad = ratio.satisfied && improving >= policy.broadRecovery.minImprovingGroups && requiredOk && !veto.length;
  return {
    groups,
    improving,
    denominator: policy.broadRecovery.groupCount,
    missing,
    contradictory,
    vetoIds: veto.map((item) => item.id),
    ratio,
    classification: broad ? "broader-recovery-candidate" : improving === 1 ? "isolated-recovery" : improving > 1 ? "partial-recovery" : "not-established",
    note: "Missing groups remain in the denominator and cannot improve the percentage. This candidate does not automatically resolve outstanding dimensions or incidents. Diplomacy is not an operational group.",
  };
}

function evidenceRankFor(records, registry) {
  if (!records.length) return { value: "insufficient", evidenceIds: [], reasons: ["no qualifying evidence"] };
  const contradictions = [];
  for (let i = 0; i < records.length; i += 1) {
    for (let j = i + 1; j < records.length; j += 1) {
      if (records[i].extra?.contradictsId === records[j].id || records[j].extra?.contradictsId === records[i].id) {
        contradictions.push([records[i].id, records[j].id]);
      }
    }
  }
  if (contradictions.length) return { value: "contested", evidenceIds: records.map((item) => item.id), reasons: ["contradictory evidence remains inspectable"], contradictions };
  const origins = uniqueOriginKeys(records);
  const authoritative = records.filter((record) => !record.extra?.proxyNotThroughput && !record.extra?.historicalPublic && isAuthoritativeSource(record, registry) && confirmedWithinScope(record, record.claimScope || {}));
  if (authoritative.length) return { value: "confirmed", evidenceIds: authoritative.map((item) => item.id), reasons: ["competent-authority or primary-confirmed within claim scope"] };
  if (origins.length >= 2) return { value: "corroborated", evidenceIds: origins, reasons: ["independent origins"] };
  return { value: "reported", evidenceIds: records.map((item) => item.id), reasons: ["single evidential origin"] };
}

function operationalFromDimensions(dimensions, restrictions, rank, { now, sourceStatus }) {
  const caveats = providerCaveats(sourceStatus);
  const closedNotice = restrictions.find((item) => CLOSURE_RE.test(`${item.activity || ""}`) || item.extraClosed);
  if (closedNotice) {
    return { value: "closed", reasons: ["authority notice confirms a specified closure within its scope; it does not prove zero actual traffic"] };
  }
  if (restrictions.length) return { value: "restricted", reasons: ["active restriction geometry or notice"] };
  if (dimensions.throughput.state === "disrupted" || dimensions.physicalAccess.state === "disrupted") {
    return { value: "disrupted", reasons: ["throughput or physical-access dimension is disrupted"] };
  }
  if (dimensions.throughput.state === "normal" && dimensions.physicalAccess.state === "normal") {
    return { value: "normal", reasons: ["positive current operational evidence for claimed scope"] };
  }
  if (dimensions.throughput.state === "improving" || dimensions.physicalAccess.state === "improving") {
    return { value: "recovering", reasons: ["improving operational dimension without verified normalization"] };
  }
  if (!caveats.length && rank.value === "insufficient") {
    return { value: "unknown", reasons: ["no qualifying operational evidence; unknown is valid"] };
  }
  if (caveats.length && rank.value === "insufficient") {
    return { value: "unknown", reasons: ["stale or unavailable feeds cannot resolve the condition", ...caveats] };
  }
  return { value: "unknown", reasons: ["insufficient operational evidence for a positive state"] };
}

export function evaluateChokepointOperations({
  chokepoint,
  events = [],
  correlations = [],
  records = [],
  now = Date.now(),
  asOf = null,
  sourceStatus = {},
  sourceRegistry = MASTER_SOURCE_REGISTRY,
  policy = THRESHOLD_POLICY,
  lastKnown = null,
} = {}) {
  const evaluationTime = Number(now);
  const knownBy = asOf || evaluationTime;
  const derived = recordsFromEvents(events, correlations, chokepoint.id);
  const byId = new Map();
  for (const record of derived) byId.set(record.id, record);
  for (const record of records.filter((item) => !item.chokepointId || item.chokepointId === chokepoint.id)) byId.set(record.id, record);
  const combined = recordsKnownBy([...byId.values()], knownBy);
  const active = combined.filter((record) => !sourceRetired(record));
  const maritimeSignals = assessMaritimeSignals({ records: combined, chokepointId: chokepoint.id, now: evaluationTime, asOf, sourceStatus });
  const dailyPairs = buildDailyPairs(active, chokepoint.id, { now: evaluationTime, sourceStatus });
  const restrictions = restrictionRecords(active, evaluationTime).map((record) => ({ ...evaluateRestriction(record), extraClosed: CLOSURE_RE.test(textOf(record)), activity: textOf(record) }));
  const dimensions = evaluateDimensions(active, { now: evaluationTime, registry: sourceRegistry, dailyPairs, policy });
  const supply = evaluateSupply(active);
  const relationships = active.filter((record) => record.recordKind === "relationship");
  const exposure = evaluateExposure(relationships, active);
  const displacement = evaluateDisplacement(active);
  const regime = evaluateRegimeDuration(dailyPairs, policy);
  const commercial = active.filter((record) => ["insurer-quote", "freight-quote", "commercial-terms"].includes(record.evidenceKind) && inInterval(record, evaluationTime)).map((record) => ({
    id: record.id,
    kind: record.evidenceKind,
    value: record.value,
    unit: record.unit,
    currency: record.extra?.currency || null,
    basis: record.extra?.basis || null,
    validity: { start: record.effectiveStart, end: record.effectiveEnd },
    scope: record.claimScope,
    availability: record.extra?.availability || null,
  }));
  const rank = evidenceRankFor(active, sourceRegistry);
  const operational = operationalFromDimensions(dimensions, restrictions, rank, { now: evaluationTime, sourceStatus });
  if (operational.value === "unknown" && lastKnown?.value && lastKnown.value !== "unknown") {
    operational.lastKnown = lastKnown.value;
    operational.reasons = [...operational.reasons, `last-known operational state preserved: ${lastKnown.value}`];
  }
  const recovery = evaluateRecoveryBreadth({ dimensions, regime, supply, records: active, now: evaluationTime, dailyPairs, policy });
  const contradictions = active.filter((record) => record.extra?.contradictsId).map((record) => ({ id: record.id, contradictsId: record.extra.contradictsId }));
  const retiredCount = combined.length - active.length;
  const caveats = [
    ...providerCaveats(sourceStatus),
    "Diplomatic improvement does not restore throughput or physical access.",
    "Notice expiry is not proof of restored operations.",
    "Oil price or range changes are contextual, not proof of reopening.",
    ...(retiredCount ? ["Invalidated or aged-out sources remain historical evidence and do not support the operating conclusion."] : []),
  ];
  const throughputEvidence = active.filter((record) => record.evidenceKind === "throughput-measurement");
  const positiveOperational = throughputEvidence.length > 0 || restrictions.length > 0 || active.some((record) => record.evidenceKind === "official-notice" && isAuthoritativeSource(record, sourceRegistry));
  if (!positiveOperational && operational.value === "normal") {
    operational.value = "unknown";
    operational.reasons = ["no qualifying operational evidence; normal requires positive current evidence"];
  }
  const attention = rank.value === "insufficient" && operational.value === "unknown" && !combined.length
    ? "unknown"
    : operational.value;
  const legacyStatus = OPERATIONAL_STATES.includes(operational.value) ? operational.value : "unknown";
  const related = correlations.filter((item) => item.chokepointId === chokepoint.id);
  const topEvents = related.slice(0, 5).map((item) => {
    const event = events.find((entry) => String(entry.id) === String(item.eventId)) || combined.find((entry) => entry.id === item.eventId) || {};
    return { eventId: item.eventId, title: event.title || item.eventId, relationship: item.relationship, confidence: item.confidence, sourceName: event.sourceName || event.upstreamOrganization, updatedAt: event.updatedAt || event.retrievedAt };
  });
  const assessment = createAssessmentRecord({
    id: `assessment:${chokepoint.id}:${new Date(evaluationTime).toISOString()}`,
    chokepointId: chokepoint.id,
    subjectDomain: "maritime",
    title: `${chokepoint.name} operational assessment`,
    policyId: policy.id,
    policyVersion: policy.version,
    baselineVersion: dailyPairs.find((day) => day.baselineVersion)?.baselineVersion || null,
    dataVintage: dailyPairs.at(-1)?.day || null,
    evaluationTime: new Date(evaluationTime).toISOString(),
    result: { operational: operational.value, evidenceRank: rank.value, regime: regime.regime, recovery: recovery.classification, maritimeSignals },
    reasons: operational.reasons,
    inputIds: combined.map((record) => record.id),
    valueOrigin: combined.some((record) => record.synthetic) ? "synthetic" : "inferred",
    synthetic: combined.some((record) => record.synthetic),
  }, new Date(evaluationTime));

  return {
    chokepointId: chokepoint.id,
    policy: policySummary(policy),
    evaluatedAt: new Date(evaluationTime).toISOString(),
    asOf: asOf ? new Date(asOf).toISOString() : null,
    status: legacyStatus,
    evidenceRank: rank.value,
    operationalStatus: operational.value,
    score: null,
    confidence: rank.value === "confirmed" ? 80 : rank.value === "corroborated" ? 65 : rank.value === "reported" ? 40 : 20,
    updatedAt: new Date(evaluationTime).toISOString(),
    activeEventCount: related.length,
    highPriorityEventCount: events.filter((event) => ["high", "critical"].includes(event.severity)).length,
    officialSourceCount: combined.filter((record) => isAuthoritativeSource(record, sourceRegistry)).length,
    independentSourceCount: uniqueOriginKeys(combined).length,
    reasons: operational.reasons,
    topEvents,
    caveats,
    explanation: `${legacyStatus} - ${operational.reasons[0] || "see reasons"}. Evidence rank: ${rank.value}. Diplomacy: ${dimensions.diplomacy.state}; physical access: ${dimensions.physicalAccess.state}; throughput: ${dimensions.throughput.state}; commercial access: ${dimensions.commercialAccess.state}. AIS visibility, cargo evidence and security risk require their separate maritime evidence views.`,
    operationalDimensions: DIMENSION_IDS.filter((id) => dimensions[id].state !== "unknown"),
    dimensions,
    maritimeSignals,
    restrictions: restrictions.map((item) => ({ id: item.id, valid: item.valid, expired: item.expired, expiryIsNotRecovery: true })),
    regimeDuration: regime,
    supply,
    exposure,
    commercialFriction: commercial,
    flowDisplacement: displacement,
    recoveryBreadth: recovery,
    contradictions,
    lastKnownOperationalStatus: operational.lastKnown || lastKnown?.value || null,
    transitions: lastKnown?.value && lastKnown.value !== operational.value
      ? [{ from: lastKnown.value, to: operational.value, at: new Date(evaluationTime).toISOString(), reasons: operational.reasons }]
      : [],
    assessment,
    positiveOperationalEvidence: positiveOperational,
    attentionStatus: attention,
    EVIDENCE_RANKS,
    LEGACY_STATUSES,
  };
}

export function assessChokepointsOperational(events = [], correlations = [], options = {}) {
  const chokepoints = options.chokepoints || STRATEGIC_CHOKEPOINTS;
  return chokepoints.map((chokepoint) => evaluateChokepointOperations({
    chokepoint,
    events,
    correlations,
    records: options.records || [],
    now: options.now,
    asOf: options.asOf,
    sourceStatus: options.sourceStatus,
    sourceRegistry: options.sourceRegistry,
    policy: options.policy,
    lastKnown: options.lastKnownById?.[chokepoint.id] || null,
  }));
}

export function invalidateDerivedClaim(claim, sourceRevision) {
  if (!claim) return { valid: false, reason: "missing-claim" };
  const inputs = claim.extra?.inputIds || [];
  if (sourceRevision?.recordId && inputs.includes(sourceRevision.recordId) && sourceRevision.changed) {
    return { valid: false, reason: "source-revision-changed", action: "recompute" };
  }
  return { valid: true, reason: "inputs-unchanged" };
}

export { LEGACY_STATUSES };
