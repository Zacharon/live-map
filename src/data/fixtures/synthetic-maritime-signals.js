/** Invented software fixtures. No current claims, licensed feeds or provider calls. */
import { createEvidenceRecord } from "../../intelligence/evidence-records.js";

export const MARITIME_FIXTURE_NOW = Date.parse("2026-06-26T12:00:00Z");
export const MARITIME_FIXTURE_CHOKEPOINT = "strait-of-hormuz";
export function syntheticMaritimeSignals() {
  const base = {
    recordKind: "observation", subjectDomain: "maritime", evidenceKind: "maritime-aggregate",
    chokepointId: MARITIME_FIXTURE_CHOKEPOINT, synthetic: true,
    observedAt: "2026-06-26T10:00:00Z", reportedAt: "2026-06-26T10:30:00Z", retrievedAt: "2026-06-26T11:00:00Z",
    claimScope: { chokepointId: MARITIME_FIXTURE_CHOKEPOINT, cargo: "synthetic LNG", direction: "outbound" },
    qualityLimitations: ["Invented test values. No real vessel or cargo identified."],
  };
  const record = (id, fields) => createEvidenceRecord({ ...base, id, title: `[SYNTHETIC] ${id}`, ...fields }, new Date(MARITIME_FIXTURE_NOW));
  return [
    record("fixture-ais-empty", {
      sourceId: "synthetic-ais", sourceUrl: "https://example.invalid/synthetic-ais", upstreamOrganization: "Synthetic AIS sample",
      value: 0, unit: "AIS reports in sample", valueOrigin: "observed", coverage: { geography: "test passage", receivers: "partial", completeness: "unknown" },
      extra: { maritimeSignal: "visibleAIS", method: "bounded receiver sample", maxAgeMs: 86400000 },
    }),
    record("fixture-dark-inference", {
      evidenceKind: "flow-observation", sourceId: "synthetic-analysis", sourceUrl: "https://example.invalid/synthetic-analysis", value: 2, unit: "possible transits", valueOrigin: "inferred",
      parentEvidenceIds: ["fixture-ais-empty"], coverage: { geography: "test passage", basis: "synthetic alternative evidence plus AIS gaps" },
      extra: { darkTrafficInference: true, method: "invented inference for regression only", maxAgeMs: 86400000, analyticalConfidence: { level: "low", rationale: "Synthetic alternative evidence is incomplete; gaps alone cannot establish transit." } },
    }),
    record("fixture-cargo-confirmed", {
      sourceId: "synthetic-cargo", sourceUrl: "https://example.invalid/synthetic-cargo", value: 4, unit: "cargoes", valueOrigin: "observed",
      coverage: { geography: "test passage", cargo: "synthetic LNG", completeness: "partial" },
      extra: { measurementBasis: "cargo-confirmed", method: "invented loading and discharge matches", maxAgeMs: 86400000, analyticalConfidence: { level: "medium", rationale: "Fixture cargo matches cover this sample only." } },
    }),
    record("fixture-cargo-estimate", {
      sourceId: "synthetic-estimator", sourceUrl: "https://example.invalid/synthetic-estimator", value: 7, unit: "cargoes", valueOrigin: "reported",
      coverage: { geography: "test passage", cargo: "synthetic LNG", completeness: "unknown" },
      extra: { measurementBasis: "published-cargo-estimate", method: "invented arrival-based estimate", maxAgeMs: 86400000 },
    }),
    record("fixture-security-report", {
      evidenceKind: "physical-security-report", sourceId: "synthetic-security", sourceUrl: "https://example.invalid/synthetic-security", valueOrigin: "reported", value: null,
      coverage: { geography: "test passage", incidentReporting: "partial" },
      extra: { securityState: "elevated-unresolved", method: "invented incident notice", maxAgeMs: 86400000 },
    }),
  ];
}
