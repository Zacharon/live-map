import { COUNTRIES } from "../../src/data/countries.js";
import { computeCountryRiskScores } from "../../src/risk/country-risk.js";
import { orchestrateProviders } from "../../src/data/providers/orchestrator.js";
import { jsonResponse } from "./lib/response.mjs";

export default async (request) => {
  const url = new URL(request.url);
  const country = url.searchParams.get("country");
  const now = Date.now();
  const result = await orchestrateProviders({ hours: Math.min(720, Math.max(24, Number(url.searchParams.get("hours") || 168))), now });
  let scores = computeCountryRiskScores(result.events || [], now, null, result.sourceStatus);
  if (country) {
    const code = country.toUpperCase();
    scores = scores.filter((score) => score.iso3 === code || score.iso2 === code);
  }
  return jsonResponse({
    scores,
    distributionWarnings: scores.distributionWarnings || [],
    calculatedAt: now,
  }, {
    sourceStatus: {
      countrySeed: { status: "operational", count: COUNTRIES.length },
      liveEvents: { status: result.systemStatus, count: result.events?.length || 0 },
      ...result.sourceStatus,
    },
    warnings: result.errors || [],
  });
};
