import { finiteNumber, nullableScore, timestampMs } from "./value-semantics.js";

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
  const normalized = String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  // This exact legacy label means provider review, not every string containing
  // "primary". Provider adapters own any other source-specific mappings.
  if (normalized === "provider-reviewed") return "primary-confirmed";
  if (VERIFICATION_STATUSES.includes(normalized)) return normalized;
  return "unverified";
}

// The preview writes this exact sentence when the source clock leads retrieval.
// Export must copy it rather than invent a paraphrase.
export const SOURCE_CLOCK_AHEAD_LIMITATION = "Source feed clock is ahead of local retrieval; freshness is uncertain.";

export function computeQualityDimensions(event, now = Date.now()) {
  const updatedAt = timestampMs(event.updatedAt);
  const freshnessScore = updatedAt === null || updatedAt > now ? null
    : Math.max(0, Math.round(100 - ((now - updatedAt) / 3600000) * 4));
  const count = finiteNumber(event.independentSourceCount ?? event.verification?.independentSourceCount);
  // Article, mirror and merged-record counts do not establish independence.
  const independentSourceCount = Number.isInteger(count) && count >= 1 ? count : null;
  const corroborationScore = independentSourceCount === null ? null
    : independentSourceCount === 1 ? 0 : Math.min(100, independentSourceCount * 35);
  const severity = nullableScore(event.severityScore ?? (typeof event.severity === "number" ? event.severity : null));
  const impactScore = nullableScore(event.impactScore);
  const attentionScore = severity === null ? null : Math.round(severity * 0.65 + (corroborationScore ?? 0) * 0.2 + (freshnessScore ?? 0) * 0.15);
  return {
    severity,
    confidence: nullableScore(event.confidence),
    impactScore,
    attentionScore,
    freshnessScore,
    corroborationScore,
    verificationStatus: normalizeVerificationStatus(event.verification?.state ?? event.metadata?.verificationStatus ?? event.verificationStatus),
    independentSourceCount,
    qualityReasons: {
      severity: "Potential or observed scale of the event.",
      confidence: "Reliability of the event record, not danger.",
      impact: "Explicit supplied impact only; unknown without an impact assessment.",
      attention: "Inspection heuristic using severity and available evidence quality; not measured impact or a verdict.",
      freshness: "Age of the supplied source revision time; unknown if missing or future-dated.",
      corroboration: "Explicit independent-source count; article and merged-record counts are not substitutes.",
    },
  };
}

// Ingest may store a score against the retrieval clock. A later replay has to
// derive freshness again, and attention with it, because attention includes
// that term. Callers copy; this does not rewrite the cached snapshot.
// WHY: docs/USGS_SPINE_CONTRACT.md#response-clock
export function withReadTimeQuality(event, now = Date.now()) {
  if (!event || typeof event !== "object") return event;
  const quality = computeQualityDimensions(event, now);
  if (event.freshnessScore === quality.freshnessScore && event.attentionScore === quality.attentionScore) return event;
  return { ...event, freshnessScore: quality.freshnessScore, attentionScore: quality.attentionScore };
}
