/**
 * SYNTHETIC integrated chokepoint scenario. Invented records for tests and demo.
 * Not live intelligence and not a claim about any current location.
 */

import { createEvidenceRecord, createRelationship } from "../../intelligence/evidence-records.js";

export const SYNTHETIC_SCENARIO_ID = "synthetic-hormuz-2026-06";
export const SYNTHETIC_CHOKEPOINT_ID = "strait-of-hormuz";
export const SYNTHETIC_NOW = Date.UTC(2026, 5, 26, 12, 0, 0);

const ORG = {
  authority: { sourceId: "us-marad-advisories", sourceOrganizationId: "maritime-authority-fixture", upstreamOrganization: "Synthetic Maritime Authority", sourceTier: "tier-1-primary-official", official: true, verificationStatus: "primary-confirmed" },
  wire: { sourceId: "synthetic-wire", sourceOrganizationId: "wire-service-a", upstreamOrganization: "Synthetic Wire Service", syndication: "wire-a" },
  mirror: { sourceId: "synthetic-wire-mirror", sourceOrganizationId: "wire-service-a", upstreamOrganization: "Synthetic Wire Mirror", syndication: "wire-a" },
  insurer: { sourceId: "synthetic-insurer", sourceOrganizationId: "insurer-fixture", upstreamOrganization: "Synthetic Hull Insurer" },
  freight: { sourceId: "synthetic-freight", sourceOrganizationId: "freight-fixture", upstreamOrganization: "Synthetic Freight Broker" },
  ais: { sourceId: "imf-portwatch", sourceOrganizationId: "portwatch-fixture", upstreamOrganization: "Synthetic AIS Aggregate" },
  energy: { sourceId: "eia-open-data", sourceOrganizationId: "energy-fixture", upstreamOrganization: "Synthetic Energy Desk" },
};

function day(iso, hour = "12:00:00Z") {
  return `${iso}T${hour}`;
}

function throughput(id, date, value, extra = {}) {
  return createEvidenceRecord({
    id,
    recordKind: "observation",
    evidenceKind: "throughput-measurement",
    subjectDomain: "maritime",
    title: `[SYNTHETIC] Daily transit count ${date}`,
    chokepointId: SYNTHETIC_CHOKEPOINT_ID,
    observedAt: day(date),
    retrievedAt: day(date, "15:00:00Z"),
    value,
    unit: "transits/day",
    valueOrigin: extra.valueOrigin || "observed",
    synthetic: true,
    coverage: { sourceId: "imf-portwatch", completeness: 0.9 },
    extra: { day: date, vesselClass: "all-reporting", direction: "both", geographicScope: SYNTHETIC_CHOKEPOINT_ID, baselineVersion: "pre-2026-05", ...extra },
    ...ORG.ais,
    sourceUrl: "https://portwatch.imf.org/pages/data-and-methodology",
  }, new Date(day(date)));
}

function baseline(id, date) {
  return createEvidenceRecord({
    id,
    recordKind: "observation",
    evidenceKind: "baseline-observation",
    subjectDomain: "maritime",
    title: `[SYNTHETIC] Expected baseline ${date}`,
    chokepointId: SYNTHETIC_CHOKEPOINT_ID,
    observedAt: day(date),
    retrievedAt: day("2026-05-31"),
    value: 100,
    unit: "transits/day",
    valueOrigin: "modeled",
    synthetic: true,
    extra: { day: date, role: "baseline", version: "pre-2026-05", vesselClass: "all-reporting", direction: "both", geographicScope: SYNTHETIC_CHOKEPOINT_ID },
    ...ORG.ais,
    sourceUrl: "https://portwatch.imf.org/pages/data-and-methodology",
  }, new Date(day("2026-05-31")));
}

const restriction = createEvidenceRecord({
  id: "syn-restriction-1",
  recordKind: "restriction-geometry",
  evidenceKind: "official-notice",
  subjectDomain: "maritime",
  title: "[SYNTHETIC] Transit restriction notice for the test passage",
  summary: "Competent authority restricts transit for specified vessel classes inside a bounded polygon.",
  chokepointId: SYNTHETIC_CHOKEPOINT_ID,
  observedAt: day("2026-06-07"),
  reportedAt: day("2026-06-07"),
  retrievedAt: day("2026-06-07", "16:00:00Z"),
  effectiveStart: day("2026-06-07"),
  effectiveEnd: day("2026-07-01"),
  geometry: { type: "Polygon", coordinates: [[[56.2, 26.3], [56.9, 26.3], [56.9, 26.7], [56.2, 26.7], [56.2, 26.3]]] },
  geometryPrecision: "approximate",
  valueOrigin: "reported",
  synthetic: true,
  claimScope: { chokepointId: SYNTHETIC_CHOKEPOINT_ID, activity: "transit", vesselClass: "merchant", direction: "both" },
  extra: { restriction: true, activity: "transit", vesselClass: "merchant", direction: "both" },
  lat: 26.45,
  lon: 56.55,
  sourceUrl: "https://www.maritime.dot.gov/msci-advisories",
  ...ORG.authority,
}, new Date(day("2026-06-07")));

const diplomacy = createEvidenceRecord({
  id: "syn-diplomacy-1",
  recordKind: "observation",
  evidenceKind: "diplomatic-statement",
  subjectDomain: "conflict-security",
  title: "[SYNTHETIC] Ceasefire agreement reported",
  summary: "A diplomatic agreement is reported. It does not include operating evidence of restored transit.",
  chokepointId: SYNTHETIC_CHOKEPOINT_ID,
  observedAt: day("2026-06-12"),
  retrievedAt: day("2026-06-12", "18:00:00Z"),
  valueOrigin: "reported",
  synthetic: true,
  sourceUrl: "https://press.un.org/en/security-council",
  ...ORG.wire,
}, new Date(day("2026-06-12")));

const diplomacyMirror = createEvidenceRecord({
  id: "syn-diplomacy-1-mirror",
  recordKind: "observation",
  evidenceKind: "diplomatic-statement",
  subjectDomain: "conflict-security",
  title: "[SYNTHETIC] Ceasefire agreement reported",
  summary: "Syndicated copy of the same diplomatic statement.",
  chokepointId: SYNTHETIC_CHOKEPOINT_ID,
  observedAt: day("2026-06-12"),
  retrievedAt: day("2026-06-12", "19:00:00Z"),
  valueOrigin: "reported",
  synthetic: true,
  canonicalUrl: "https://press.un.org/en/security-council",
  sourceUrl: "https://press.un.org/en/security-council",
  ...ORG.mirror,
}, new Date(day("2026-06-12")));

const freight = createEvidenceRecord({
  id: "syn-freight-1",
  recordKind: "observation",
  evidenceKind: "freight-quote",
  subjectDomain: "commodity-supply-chain",
  title: "[SYNTHETIC] Quoted war-risk freight premium",
  summary: "Sourced quote. Not an automated legal clearance.",
  chokepointId: SYNTHETIC_CHOKEPOINT_ID,
  observedAt: day("2026-06-14"),
  retrievedAt: day("2026-06-14"),
  effectiveStart: day("2026-06-14"),
  effectiveEnd: day("2026-06-28"),
  value: 12.5,
  unit: "USD/t",
  valueOrigin: "reported",
  synthetic: true,
  extra: { currency: "USD", basis: "spot-quote", impaired: true, availability: "limited" },
  sourceUrl: "https://www.eia.gov/opendata/",
  ...ORG.freight,
}, new Date(day("2026-06-14")));

const insurance = createEvidenceRecord({
  id: "syn-insure-1",
  recordKind: "observation",
  evidenceKind: "insurer-quote",
  subjectDomain: "maritime",
  title: "[SYNTHETIC] Hull war-risk coverage limited",
  chokepointId: SYNTHETIC_CHOKEPOINT_ID,
  observedAt: day("2026-06-14"),
  retrievedAt: day("2026-06-14"),
  effectiveStart: day("2026-06-14"),
  effectiveEnd: day("2026-06-27"),
  value: 0.8,
  unit: "percent-of-value",
  valueOrigin: "reported",
  synthetic: true,
  extra: { currency: "USD", basis: "quoted-premium", availability: "limited", impaired: true },
  sourceUrl: "https://www.maritime.dot.gov/msci-advisories",
  ...ORG.insurer,
}, new Date(day("2026-06-14")));

const diversion = createEvidenceRecord({
  id: "syn-divert-1",
  recordKind: "flow-observation",
  evidenceKind: "flow-observation",
  subjectDomain: "maritime",
  title: "[SYNTHETIC] Observed diversion via Cape of Good Hope",
  summary: "Alternative route and period are sourced. Lower local traffic alone is not used as proof.",
  chokepointId: SYNTHETIC_CHOKEPOINT_ID,
  observedAt: day("2026-06-16"),
  retrievedAt: day("2026-06-16"),
  effectiveStart: day("2026-06-16"),
  effectiveEnd: day("2026-07-15"),
  valueOrigin: "observed",
  synthetic: true,
  extra: { alternativeRoute: "cape-of-good-hope", destination: "northwest-europe", vesselClass: "merchant" },
  sourceUrl: "https://portwatch.imf.org/pages/data-and-methodology",
  ...ORG.ais,
}, new Date(day("2026-06-16")));

const commercialEase = createEvidenceRecord({
  id: "syn-freight-2",
  recordKind: "observation",
  evidenceKind: "freight-quote",
  subjectDomain: "commodity-supply-chain",
  title: "[SYNTHETIC] Later freight quote nearer ordinary terms",
  chokepointId: SYNTHETIC_CHOKEPOINT_ID,
  observedAt: day("2026-06-28"),
  retrievedAt: day("2026-06-28"),
  effectiveStart: day("2026-06-28"),
  effectiveEnd: day("2026-07-20"),
  value: 3.1,
  unit: "USD/t",
  valueOrigin: "reported",
  synthetic: true,
  extra: { currency: "USD", basis: "spot-quote", impaired: false, availability: "available" },
  sourceUrl: "https://www.eia.gov/opendata/",
  ...ORG.freight,
}, new Date(day("2026-06-28")));

const operatingBulletin = createEvidenceRecord({
  id: "syn-open-bulletin",
  recordKind: "observation",
  evidenceKind: "official-notice",
  subjectDomain: "maritime",
  title: "[SYNTHETIC] Operating bulletin lists no current restriction",
  chokepointId: SYNTHETIC_CHOKEPOINT_ID,
  observedAt: day("2026-07-04"),
  retrievedAt: day("2026-07-04"),
  effectiveStart: day("2026-07-04"),
  effectiveEnd: day("2026-07-18"),
  valueOrigin: "reported",
  synthetic: true,
  extra: { operatingBulletin: true, noticeCoverage: "current" },
  claimScope: { chokepointId: SYNTHETIC_CHOKEPOINT_ID, activity: "transit" },
  sourceUrl: "https://www.maritime.dot.gov/msci-advisories",
  ...ORG.authority,
}, new Date(day("2026-07-04")));

const deliverable = createEvidenceRecord({
  id: "syn-deliverable-1",
  recordKind: "supply-exposure",
  evidenceKind: "energy-economic-observation",
  subjectDomain: "commodity-supply-chain",
  title: "[SYNTHETIC] Deliverable crude to Northwest Europe, 7-day window",
  chokepointId: SYNTHETIC_CHOKEPOINT_ID,
  observedAt: day("2026-07-04"),
  retrievedAt: day("2026-07-04"),
  value: 1.2,
  unit: "mb/d",
  valueOrigin: "reported",
  synthetic: true,
  extra: { supplyClass: "deliverable", quantityClass: "flow", destination: "northwest-europe", period: "2026-07-04/2026-07-11" },
  sourceUrl: "https://www.eia.gov/opendata/",
  ...ORG.energy,
}, new Date(day("2026-07-04")));

const contradiction = createEvidenceRecord({
  id: "syn-contradict-1",
  recordKind: "observation",
  evidenceKind: "public-report",
  subjectDomain: "maritime",
  title: "[SYNTHETIC] Later report claims the passage remains closed",
  summary: "Contradicts the operating bulletin. Both records remain inspectable.",
  chokepointId: SYNTHETIC_CHOKEPOINT_ID,
  observedAt: day("2026-07-18"),
  retrievedAt: day("2026-07-18"),
  valueOrigin: "reported",
  synthetic: true,
  extra: { contradictsId: "syn-open-bulletin", contradictsRecovery: true },
  sourceUrl: "https://www.crisisgroup.org/crisiswatch",
  ...ORG.wire,
}, new Date(day("2026-07-18")));

const staleNotice = createEvidenceRecord({
  id: "syn-stale-feed",
  recordKind: "observation",
  evidenceKind: "official-notice",
  subjectDomain: "maritime",
  title: "[SYNTHETIC] Authority feed unavailable",
  chokepointId: SYNTHETIC_CHOKEPOINT_ID,
  observedAt: day("2026-07-02"),
  retrievedAt: day("2026-07-02"),
  valueOrigin: "reported",
  synthetic: true,
  extra: { feedUnavailable: true },
  sourceUrl: "https://www.maritime.dot.gov/msci-advisories",
  ...ORG.authority,
}, new Date(day("2026-07-02")));

const route = createRelationship({
  id: "syn-rel-route",
  fromId: SYNTHETIC_CHOKEPOINT_ID,
  toId: "route-nw-europe",
  edgeType: "routes_via",
  assertionClass: "reported",
  parentEvidenceIds: ["syn-divert-1"],
  chokepointId: SYNTHETIC_CHOKEPOINT_ID,
  subjectDomain: "maritime",
  title: "[SYNTHETIC] Passage routes via alternative Cape corridor",
  observedAt: day("2026-06-16"),
  retrievedAt: day("2026-06-16"),
  effectiveStart: day("2026-06-16"),
  extra: { fromId: SYNTHETIC_CHOKEPOINT_ID, toId: "cape-of-good-hope", edgeType: "observed_reroute", assertionClass: "observed", commodity: "crude", direction: "westbound", hypothesized: false },
  synthetic: true,
  valueOrigin: "observed",
  sourceUrl: "https://portwatch.imf.org/pages/data-and-methodology",
}, new Date(day("2026-06-16")));

const exposureHyp = createRelationship({
  id: "syn-rel-exposure-hyp",
  fromId: "refinery-hypothetical",
  toId: "product-destination",
  edgeType: "affects",
  assertionClass: "hypothesized",
  parentEvidenceIds: [],
  chokepointId: SYNTHETIC_CHOKEPOINT_ID,
  subjectDomain: "commodity-supply-chain",
  title: "[SYNTHETIC] Hypothesized product exposure — not verified",
  retrievedAt: day("2026-06-16"),
  extra: { fromId: "refinery-hypothetical", toId: "product-destination", edgeType: "affects", assertionClass: "hypothesized", hypothesized: true, commodity: "gasoline", proximityOnly: false },
  synthetic: true,
  valueOrigin: "inferred",
  sourceUrl: "https://www.eia.gov/opendata/",
}, new Date(day("2026-06-16")));

const badProximity = createRelationship({
  id: "syn-rel-proximity",
  fromId: SYNTHETIC_CHOKEPOINT_ID,
  toId: "nearby-refinery",
  edgeType: "affects",
  assertionClass: "heuristic",
  parentEvidenceIds: [],
  chokepointId: SYNTHETIC_CHOKEPOINT_ID,
  title: "[SYNTHETIC] Proximity-only heuristic, not verified causality",
  retrievedAt: day("2026-06-16"),
  extra: { fromId: SYNTHETIC_CHOKEPOINT_ID, toId: "nearby-refinery", edgeType: "affects", assertionClass: "heuristic", proximityOnly: true, claimedVerified: true },
  synthetic: true,
  valueOrigin: "inferred",
  sourceUrl: "https://www.eia.gov/opendata/",
}, new Date(day("2026-06-16")));

function series() {
  const records = [];
  for (let d = 1; d <= 30; d += 1) {
    const iso = `2026-06-${String(d).padStart(2, "0")}`;
    records.push(baseline(`syn-base-06-${d}`, iso));
    const traffic = d < 7 ? 100 : 60;
    records.push(throughput(`syn-t-06-${d}`, iso, traffic));
  }
  for (let d = 1; d <= 18; d += 1) {
    const iso = `2026-07-${String(d).padStart(2, "0")}`;
    records.push(baseline(`syn-base-07-${d}`, iso));
    const traffic = d < 4 ? 60 : 95;
    records.push(throughput(`syn-t-07-${d}`, iso, traffic));
  }
  return records;
}

export function syntheticChokepointRecords() {
  return [
    ...series(),
    restriction,
    diplomacy,
    diplomacyMirror,
    freight,
    insurance,
    diversion,
    commercialEase,
    operatingBulletin,
    deliverable,
    contradiction,
    staleNotice,
    route,
    exposureHyp,
    badProximity,
  ];
}

export const SCENARIO_STAGES = [
  { id: "restriction", asOf: day("2026-06-07", "20:00:00Z"), expect: { physicalAccess: "restricted", operationalStatus: "restricted" } },
  { id: "diplomacy-with-low-throughput", asOf: day("2026-06-12", "20:00:00Z"), expect: { diplomacy: "improving", throughput: "disrupted", physicalAccess: "restricted" } },
  { id: "costly-access", asOf: day("2026-06-14", "20:00:00Z"), expect: { commercialAccess: "impaired" } },
  { id: "diversion", asOf: day("2026-06-16", "20:00:00Z"), expect: { diversionObserved: true } },
  { id: "persistent-shortfall", asOf: day("2026-06-26", "20:00:00Z"), expect: { regime: "persistent-degraded" } },
  { id: "isolated-improvement", asOf: day("2026-06-28", "20:00:00Z"), expect: { recovery: "isolated-recovery" } },
  { id: "broader-recovery", asOf: day("2026-07-16", "20:00:00Z"), expect: { recovery: "broader-recovery-candidate" } },
  { id: "stale-contradiction", asOf: day("2026-07-18", "20:00:00Z"), expect: { evidenceRank: "contested" } },
];

export function syntheticScenarioEvents(now = SYNTHETIC_NOW) {
  return syntheticChokepointRecords()
    .filter((record) => record.recordKind !== "relationship" && record.evidenceKind !== "throughput-measurement" && record.evidenceKind !== "baseline-observation")
    .map((record, index) => ({
      id: record.id,
      title: record.title,
      summary: record.summary || "Synthetic scenario record.",
      category: "infrastructure",
      severity: index < 3 ? "high" : "medium",
      domain: record.subjectDomain,
      lat: Number.isFinite(record.lat) ? record.lat : null,
      lon: Number.isFinite(record.lon) ? record.lon : null,
      place: Number.isFinite(record.lat) ? "SYNTHETIC test passage" : "Non-geographic synthetic record",
      country: "Synthetic",
      occurredAt: record.observedAt,
      updatedAt: record.retrievedAt,
      sourceName: record.upstreamOrganization,
      source: record.upstreamOrganization,
      sourceType: record.evidenceKind,
      sourceId: record.sourceId,
      sourceUrl: record.sourceUrl,
      sourceOrganizationId: record.sourceOrganizationId,
      syndication: record.syndication,
      verificationStatus: record.verificationStatus || "Reported",
      sourceTier: record.sourceTier,
      official: record.official === true,
      geographic: record.lat != null,
      recordKind: "event",
      synthetic: true,
      chokepointId: SYNTHETIC_CHOKEPOINT_ID,
      claimScope: record.claimScope,
      extra: record.extra,
      evidenceKind: record.evidenceKind,
      valueOrigin: record.valueOrigin,
      coordinateMethod: "Approximate region — synthetic test location",
    }));
}
