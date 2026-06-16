import { COUNTRIES, countryByCode } from "../../src/data/countries.js";
import { jsonResponse } from "./lib/response.mjs";
import { sanitizeCountryCode } from "../../src/api/request-validation.js";

export default async (request) => {
  const url = new URL(request.url);
  const code = sanitizeCountryCode(url.searchParams.get("country"));
  const data = code ? countryByCode(code) : COUNTRIES;
  return jsonResponse(data || null, {
    status: code && !data ? 404 : 200,
    sourceStatus: {
      countrySeed: { status: "operational", count: COUNTRIES.length },
    },
    warnings: code && !data ? [`Unknown country ${code}`] : [],
  });
};
