import { COUNTRIES } from "../../src/data/countries.js";
import { computeCountryRiskScores } from "../../src/risk/country-risk.js";
import { orchestrateProviders } from "../../src/data/providers/orchestrator.js";
import { parseHoursParam, sanitizeCountryCode } from "../../src/api/request-validation.js";
import { jsonResponse, withPublicApiGuard } from "./lib/response.mjs";

export default async (request) => {
  return withPublicApiGuard(request, async () => {
    const url = new URL(request.url);
    const country = sanitizeCountryCode(url.searchParams.get("country"));
    const warnings = [];
    const now = Date.now();
    const result = await orchestrateProviders({ hours: parseHoursParam(url.searchParams, warnings), now });
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
      warnings: [...warnings, ...(result.errors || [])],
    });
  });
};
