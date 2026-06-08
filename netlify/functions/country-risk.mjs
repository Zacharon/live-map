import { COUNTRIES } from "../../src/data/countries.js";
import { computeCountryRiskScores } from "../../src/risk/country-risk.js";
import { jsonResponse } from "./lib/response.mjs";

export default async () => {
  const scores = computeCountryRiskScores([], Date.now());
  return jsonResponse(scores, {
    sourceStatus: {
      countrySeed: { status: "operational", count: COUNTRIES.length },
      liveEvents: { status: "not-provided-to-endpoint", count: 0 },
    },
    warnings: ["Endpoint returns baseline CII rows without live event enrichment. Browser CII uses current visible events."],
  });
};
