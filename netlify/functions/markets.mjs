import { EXCHANGES, marketFixtures } from "../../src/data/exchanges.js";
import { jsonResponse } from "./lib/response.mjs";

export default async () => jsonResponse({
  exchanges: EXCHANGES,
  markets: marketFixtures(),
}, {
  sourceStatus: {
    exchangeRegistry: { status: "operational", count: EXCHANGES.length },
    marketPrices: { status: "disabled", message: "No lawful live finance provider configured." },
  },
  warnings: ["Market cards are fixtures and do not represent live prices."],
});
