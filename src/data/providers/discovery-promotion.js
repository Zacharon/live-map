export function evaluateLeadPromotion(cluster, options = {}) {
  const independentSources = cluster?.independentSourceCount || 0;
  const hasPrimary = cluster?.leads?.some((lead) => lead.sourceTier === "tier-1-primary-official" || lead.verification?.state === "primary-confirmed");
  const minimumSources = options.minimumSources || 2;
  const eligible = Boolean(hasPrimary || independentSources >= minimumSources);
  return {
    eligible,
    promoted: false,
    humanReviewRequired: true,
    reason: eligible
      ? "Lead has enough independent support for human review, but is not auto-promoted."
      : "Discovery lead remains unverified until corroborated by a primary source or independent reporting.",
    independentSourceCount: independentSources,
  };
}

