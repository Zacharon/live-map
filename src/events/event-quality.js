export const VERIFICATION_STATUSES = [
  "unverified",
  "single-source",
  "reported",
  "observed",
  "corroborated",
  "primary-confirmed",
  "disputed",
  "corrected",
  "retracted",
];

export function normalizeVerificationStatus(value) {
  const normalized = String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  if (normalized.includes("primary") || normalized.includes("provider-reviewed")) return "primary-confirmed";
  if (VERIFICATION_STATUSES.includes(normalized)) return normalized;
  return "single-source";
}

export function computeQualityDimensions(event) {
  const rawUpdatedAt = event.updatedAt || event.occurredAt || Date.now();
  const updatedAt = Number.isFinite(Number(rawUpdatedAt)) ? Number(rawUpdatedAt) : new Date(rawUpdatedAt).getTime();
  const ageHours = Math.max(0, (Date.now() - updatedAt) / 3600000);
  const freshnessScore = Math.max(0, Math.round(100 - ageHours * 4));
  const independentSourceCount = Number(event.independentSourceCount || event.sourceCount || event.metadata?.mergedSources?.length || 1);
  const corroborationScore = Math.min(100, independentSourceCount * 35);
  const severity = Number(event.severityScore ?? (typeof event.severity === "number" ? event.severity : 0));
  const impactScore = Math.min(100, Math.round((severity * 0.65) + (corroborationScore * 0.2) + (freshnessScore * 0.15)));
  return {
    severity,
    confidence: Number(event.confidence || 0),
    impactScore,
    freshnessScore,
    corroborationScore,
    verificationStatus: normalizeVerificationStatus(event.verificationStatus),
    independentSourceCount,
    qualityReasons: {
      severity: "Potential or observed scale of the event.",
      confidence: "Reliability of the event record, not danger.",
      impact: "Potential people, assets, markets or regions affected.",
      freshness: "How recently the source was updated.",
      corroboration: "Independent source support after avoiding obvious duplicates.",
    },
  };
}
