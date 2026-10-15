import assert from "node:assert/strict";
import { chokepointById } from "../src/data/strategic-chokepoints.js";
import {
  createEvidenceRecord,
  createRelationship,
  recordsKnownBy,
  validateEvidenceRecord,
  validateGeometry,
} from "../src/intelligence/evidence-records.js";
import { independencePairs, isAuthoritativeSource } from "../src/intelligence/source-authority.js";
import { THRESHOLD_POLICY, policySummary } from "../src/intelligence/threshold-policy.js";
import {
  assessChokepointsOperational,
  consecutiveEligibleEvaluations,
  evaluateChokepointOperations,
  evaluateDisplacement,
  evaluateExposure,
  evaluateRecoveryBreadth,
  evaluateRegimeDuration,
  evaluateRestriction,
  evaluateSupply,
  evaluateThroughputRatio,
  invalidateDerivedClaim,
  sensitivityReport,
} from "../src/intelligence/operational-evaluator.js";
import { assessChokepointCondition, assessChokepoints } from "../src/intelligence/chokepoint-condition.js";
import { graphEdgeFromRelationship, graphNodeFromRecord, neighborhood, antimeridianSplit } from "../src/intelligence/knowledge-graph.js";
import { renderChokepointDetail } from "../src/ui/chokepoints.js";
import {
  SCENARIO_STAGES,
  SYNTHETIC_CHOKEPOINT_ID,
  syntheticChokepointRecords,
  syntheticScenarioEvents,
} from "../src/data/fixtures/synthetic-chokepoint-scenario.js";

const hormuz = chokepointById(SYNTHETIC_CHOKEPOINT_ID);
const records = syntheticChokepointRecords();

function at(asOf, extra = {}) {
  return evaluateChokepointOperations({
    chokepoint: hormuz,
    events: syntheticScenarioEvents(),
    correlations: syntheticScenarioEvents().map((event) => ({ chokepointId: SYNTHETIC_CHOKEPOINT_ID, eventId: event.id, relationship: "directly-references", confidence: 80 })),
    records,
    now: Date.parse(asOf),
    asOf,
    ...extra,
  });
}

{
  const record = createEvidenceRecord({ id: "e1", recordKind: "observation", evidenceKind: "public-report", subjectDomain: "weather", title: "Storm report", lat: 0, lon: 0, sourceUrl: "https://example.com/a" });
  assert.equal(record.lat, 0);
  assert.equal(record.lon, 0);
  assert.equal(validateEvidenceRecord(record).valid, true);
  assert.equal(createEvidenceRecord({ id: "missing-geo", title: "no coords" }).lat, null);
  assert.equal(validateGeometry({ type: "Polygon", coordinates: [[[0, 0], [1, 0], [0, 0]]] }).valid, false);
  assert.equal(validateGeometry({ type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] }).valid, true);
}

{
  const left = { id: "a", sourceOrganizationId: "wire-service-a", canonicalUrl: "https://press.un.org/en/security-council", syndication: "wire-a" };
  const right = { id: "b", sourceOrganizationId: "wire-service-a", canonicalUrl: "https://press.un.org/en/security-council", syndication: "wire-a" };
  assert.equal(independencePairs(left, right).independent, false);
  const official = { id: "n", sourceId: "us-marad-advisories", sourceTier: "tier-1-primary-official", official: true, verificationStatus: "primary-confirmed" };
  assert.equal(isAuthoritativeSource(official), true);
  assert.equal(isAuthoritativeSource({ id: "news", title: "Officials say hello", sourceType: "news" }), false);
}

{
  const empty = assessChokepointCondition(hormuz, [], [], { now: Date.UTC(2026, 6, 15) });
  assert.equal(empty.status, "unknown");
  assert.equal(empty.operationalStatus, "unknown");
  assert.ok(/no qualifying operational evidence/i.test(empty.explanation));
  assert.equal(assessChokepoints([], [], { now: Date.UTC(2026, 6, 15) }).find((item) => item.chokepointId === hormuz.id).status, "unknown");
}

{
  const now = Date.UTC(2026, 6, 15, 12, 0, 0);
  const suez = chokepointById("suez-canal");
  const event = {
    id: "suez-closure",
    title: "Suez Canal Authority announces canal closure",
    summary: "Official notice says transit is closed.",
    sourceName: "Suez Canal Authority",
    sourceId: "us-marad-advisories",
    sourceTier: "tier-1-primary-official",
    official: true,
    verificationStatus: "primary-confirmed",
    evidenceKind: "official-notice",
    claimScope: { chokepointId: "suez-canal", activity: "transit" },
    extra: { restriction: true },
    effectiveStart: new Date(now - 3600000).toISOString(),
    severity: "critical",
    domain: "infrastructure",
    category: "infrastructure",
    updatedAt: now,
  };
  const correlations = [{ chokepointId: suez.id, eventId: event.id, relationship: "directly-references", confidence: 90 }];
  const closed = assessChokepointCondition(suez, [event], correlations, { now });
  assert.equal(closed.status, "closed");
  assert.equal(assessChokepointCondition(suez, [], [], { now, sourceStatus: { provider: { ok: false, stale: true } } }).status, "unknown");
}

{
  const restriction = at("2026-06-07T20:00:00Z");
  assert.equal(restriction.dimensions.physicalAccess.state, "restricted");
  assert.equal(restriction.operationalStatus, "restricted");
  assert.ok(restriction.restrictions.every((item) => item.expiryIsNotRecovery));
}

{
  const diplomacy = at("2026-06-12T20:00:00Z");
  assert.equal(diplomacy.dimensions.diplomacy.state, "improving");
  assert.notEqual(diplomacy.dimensions.throughput.state, "normal");
  assert.notEqual(diplomacy.dimensions.physicalAccess.state, "normal");
  assert.equal(diplomacy.independentSourceCount, diplomacy.independentSourceCount);
  const origins = records.filter((item) => item.id === "syn-diplomacy-1" || item.id === "syn-diplomacy-1-mirror");
  assert.equal(independencePairs(origins[0], origins[1]).independent, false);
}

{
  const costly = at("2026-06-14T20:00:00Z");
  assert.equal(costly.dimensions.commercialAccess.state, "impaired");
  assert.ok(costly.commercialFriction.length >= 1);
  assert.ok(costly.commercialFriction.every((item) => item.currency || item.unit));
}

{
  const divert = at("2026-06-16T20:00:00Z");
  assert.ok(divert.flowDisplacement.observed.length >= 1);
  assert.equal(divert.flowDisplacement.lowerLocalTrafficAlone, "not-claimed");
  const rejected = evaluateDisplacement([createEvidenceRecord({
    id: "low-only",
    recordKind: "flow-observation",
    evidenceKind: "flow-observation",
    valueOrigin: "inferred",
    extra: { lowerLocalTrafficImpliesDiversion: true, forcedBalance: true },
  })]);
  assert.equal(rejected.lowerLocalTrafficAlone, "rejected");
  assert.ok(rejected.flags.some((flag) => flag.flag === "forced-balance-rejected"));
}

{
  const persistent = at("2026-06-26T20:00:00Z");
  assert.equal(persistent.regimeDuration.candidate, "persistent-degraded");
  assert.ok(persistent.regimeDuration.r7 < THRESHOLD_POLICY.persistentDegraded.ratio);
}

{
  const isolated = at("2026-06-28T20:00:00Z");
  assert.equal(isolated.recoveryBreadth.classification, "isolated-recovery");
  assert.equal(isolated.recoveryBreadth.denominator, 4);
  assert.ok(isolated.recoveryBreadth.missing >= 0);
  assert.ok(isolated.recoveryBreadth.improving < 3);
}

{
  const broad = at("2026-07-16T20:00:00Z");
  assert.equal(broad.recoveryBreadth.classification, "broader-recovery-candidate");
  assert.equal(broad.recoveryBreadth.denominator, 4);
  assert.ok(broad.dimensions.diplomacy.state === "improving" || broad.dimensions.diplomacy.state === "unknown");
  assert.ok(!broad.recoveryBreadth.groups.some((group) => group.id === "diplomacy"));
}

{
  const contested = at("2026-07-18T20:00:00Z");
  assert.equal(contested.evidenceRank, "contested");
  assert.ok(contested.contradictions.length >= 1);
}

{
  const expired = evaluateRestriction(createEvidenceRecord({
    id: "expired-notice",
    recordKind: "restriction-geometry",
    evidenceKind: "official-notice",
    geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
    effectiveStart: "2026-01-01T00:00:00Z",
    effectiveEnd: "2026-01-02T00:00:00Z",
    extra: { restriction: true, expandsToEntireSea: true },
  }));
  assert.equal(expired.valid, false);
  assert.equal(expired.expiryIsNotRecovery, true);
}

{
  const pairs = [];
  for (let i = 0; i < 21; i += 1) {
    const day = new Date(Date.UTC(2026, 5, 1 + i)).toISOString().slice(0, 10);
    pairs.push({ day, traffic: i < 7 ? 100 : 60, baseline: 100, comparable: true, gap: false });
  }
  const zeroBaseline = evaluateThroughputRatio([{ day: "2026-06-01", traffic: 10, baseline: 0, comparable: true }], THRESHOLD_POLICY);
  assert.equal(zeroBaseline.status, "unknown");
  const gapPairs = pairs.map((item, index) => index === 12 ? { ...item, comparable: false, gap: true, traffic: null } : item);
  const gapped = consecutiveEligibleEvaluations(gapPairs, { ratio: 0.75, consecutive: 14, comparator: "lt", policy: THRESHOLD_POLICY });
  assert.equal(gapped.satisfied, false);
  const report = sensitivityReport(pairs);
  assert.equal(report.rows.length, 9);
  assert.equal(policySummary().productionAutoPromotion, false);
}

{
  const supply = evaluateSupply([
    createEvidenceRecord({ id: "s", recordKind: "supply-exposure", extra: { supplyClass: "inventory", quantityClass: "stock", summedStockAndFlow: true }, value: 10, unit: "t" }),
    createEvidenceRecord({ id: "f", recordKind: "supply-exposure", extra: { supplyClass: "production-rate", quantityClass: "flow" }, value: 2, unit: "t/d" }),
  ]);
  assert.equal(supply.unknown, true);
  assert.ok(supply.errors.includes("cannot-sum-stocks-and-flows"));
}

{
  const exposure = evaluateExposure([
    createRelationship({ id: "p", fromId: "a", toId: "b", extra: { fromId: "a", toId: "b", edgeType: "affects", assertionClass: "heuristic", proximityOnly: true, claimedVerified: true } }),
    createRelationship({ id: "h", fromId: "a", toId: "c", extra: { fromId: "a", toId: "c", edgeType: "depends_on", assertionClass: "hypothesized", hypothesized: true } }),
  ]);
  assert.equal(exposure.find((item) => item.id === "p").rejected, true);
  assert.equal(exposure.find((item) => item.id === "h").hypothesized, true);
}

{
  const stale = evaluateChokepointOperations({
    chokepoint: hormuz,
    records: [],
    now: Date.UTC(2026, 6, 1),
    sourceStatus: { notices: { ok: false, stale: true } },
    lastKnown: { value: "restricted" },
  });
  assert.equal(stale.operationalStatus, "unknown");
  assert.equal(stale.lastKnownOperationalStatus, "restricted");
}

{
  const asOfEarly = recordsKnownBy(records, "2026-06-08T00:00:00Z");
  assert.ok(!asOfEarly.some((item) => item.id === "syn-diplomacy-1"));
  assert.ok(asOfEarly.some((item) => item.id === "syn-restriction-1"));
}

{
  const claim = { extra: { inputIds: ["syn-t-06-10"] } };
  assert.equal(invalidateDerivedClaim(claim, { recordId: "syn-t-06-10", changed: true }).valid, false);
}

{
  const html = renderChokepointDetail(hormuz, [at("2026-06-26T20:00:00Z")], new Map());
  assert.match(html, /Independent dimensions/);
  assert.match(html, /throughput/);
  assert.match(html, /engineering-default-unvalidated/);
}

{
  const nodes = records.filter((item) => item.recordKind !== "relationship").map((item) => graphNodeFromRecord(item));
  const edges = records.filter((item) => item.recordKind === "relationship").map(graphEdgeFromRelationship);
  const selected = neighborhood({ selectedId: "syn-restriction-1", nodes: [...nodes, { id: SYNTHETIC_CHOKEPOINT_ID, lat: 26.3, lon: 56.5, geographic: true, nodeType: "infrastructure" }], edges, hops: 2 });
  assert.ok(selected.nodes.length <= 48);
  const split = antimeridianSplit({ lat: 0, lon: 179 }, { lat: 0, lon: -179 });
  assert.equal(split.length, 2);
}

for (const stage of SCENARIO_STAGES) {
  const result = at(stage.asOf);
  if (stage.expect.physicalAccess) assert.equal(result.dimensions.physicalAccess.state, stage.expect.physicalAccess, stage.id);
  if (stage.expect.operationalStatus) assert.equal(result.operationalStatus, stage.expect.operationalStatus, stage.id);
  if (stage.expect.diplomacy) assert.equal(result.dimensions.diplomacy.state, stage.expect.diplomacy, stage.id);
  if (stage.expect.throughput) assert.equal(result.dimensions.throughput.state, stage.expect.throughput, stage.id);
  if (stage.expect.commercialAccess) assert.equal(result.dimensions.commercialAccess.state, stage.expect.commercialAccess, stage.id);
  if (stage.expect.regime) assert.equal(result.regimeDuration.candidate || result.regimeDuration.regime, stage.expect.regime, stage.id);
  if (stage.expect.recovery) assert.equal(result.recoveryBreadth.classification, stage.expect.recovery, stage.id);
  if (stage.expect.evidenceRank) assert.equal(result.evidenceRank, stage.expect.evidenceRank, stage.id);
  if (stage.expect.diversionObserved) assert.ok(result.flowDisplacement.observed.length, stage.id);
}

assert.equal(THRESHOLD_POLICY.label, "engineering-default-unvalidated");
assert.ok(Array.isArray(assessChokepointsOperational([], [])));

console.log("Operational evidence tests passed.");
