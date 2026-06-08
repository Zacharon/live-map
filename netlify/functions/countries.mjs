import { COUNTRIES } from "../../src/data/countries.js";
import { jsonResponse } from "./lib/response.mjs";

export default async () => jsonResponse(COUNTRIES, {
  sourceStatus: {
    countrySeed: { status: "operational", count: COUNTRIES.length },
  },
});
