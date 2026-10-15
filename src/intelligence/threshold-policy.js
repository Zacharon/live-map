/**
 * Engineering-default-unvalidated threshold policy.
 * The originating brief supplied no numeric thresholds. These values exist so
 * fixtures and sensitivity tests have a documented, versioned contract.
 * They are not recovered, calibrated, or production-approved policy.
 * Production auto-promotion is disabled.
 */

export const THRESHOLD_POLICY = {
  id: "engineering-default-unvalidated",
  version: "2026-09-15.1",
  label: "engineering-default-unvalidated",
  productionAutoPromotion: false,
  r7WindowDays: 7,
  persistentDegraded: {
    ratio: 0.75,
    consecutiveEligibleEvaluations: 14,
  },
  broadRecovery: {
    ratio: 0.90,
    consecutiveEligibleEvaluations: 7,
    minImprovingGroups: 3,
    groupCount: 4,
    requiredGroups: ["throughput", "physicalAccess"],
  },
  groups: {
    throughput: {
      id: "throughput",
      measurement: "comparable-daily-throughput-ratio-r7",
      referenceWindowDays: 7,
      threshold: 0.90,
      minimumCoverage: 0.85,
      freshnessHours: 48,
      version: "2026-09-15.1",
    },
    physicalAccess: {
      id: "physicalAccess",
      measurement: "no-current-qualifying-restriction-and-no-current-physical-security-incident",
      referenceWindowDays: 7,
      threshold: 1,
      minimumCoverage: 1,
      freshnessHours: 48,
      version: "2026-09-15.1",
    },
    commercialAccess: {
      id: "commercialAccess",
      measurement: "no-current-qualifying-commercial-impairment",
      referenceWindowDays: 7,
      threshold: 1,
      minimumCoverage: 1,
      freshnessHours: 72,
      version: "2026-09-15.1",
    },
    deliverability: {
      id: "deliverability",
      measurement: "deliverable-supply-not-unknown-and-not-below-stated-range",
      referenceWindowDays: 7,
      threshold: 1,
      minimumCoverage: 1,
      freshnessHours: 72,
      version: "2026-09-15.1",
    },
  },
  sensitivity: {
    ratios: [0.6, 0.75, 0.85],
    durations: [7, 14, 21],
  },
  notes: [
    "Comparable T_d and B_d must share unit, vessel class, direction, geographic scope, and compatible source coverage.",
    "A rolling post-disruption baseline must not be used to normalize the disruption away.",
    "Missing or incomparable days invalidate continuity; they are not zero traffic.",
    "Overlapping R7 windows are not independent evidence.",
    "Fourteen consecutive eligible evaluations of a 7-day ratio require at least 20 calendar days of comparable history (day 0 through day 19) plus the baseline vintage covering that span.",
    "Diplomacy is not an operational recovery group.",
    "Unconfigured group predicates evaluate to unknown, not passing.",
    "This policy must not auto-promote into production.",
  ],
};

export function policySummary(policy = THRESHOLD_POLICY) {
  return {
    id: policy.id,
    version: policy.version,
    label: policy.label,
    productionAutoPromotion: false,
    persistentDegraded: policy.persistentDegraded,
    broadRecovery: policy.broadRecovery,
    notes: policy.notes,
  };
}
