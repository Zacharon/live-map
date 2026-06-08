import { EXCHANGES, marketFixtures } from "../data/exchanges.js";

export const financeAdapter = {
  id: "development-fixture-finance",
  name: "Development finance fixture",
  enabled: true,
  credentialRequired: false,
  fetchData: async () => marketFixtures(),
  normalize: (market) => market,
  healthCheck: () => ({ status: "delayed", message: "No live finance provider configured." }),
  getAttribution: () => "Development fixtures and exchange registry.",
  getRefreshInterval: () => "manual",
  getLegalNotes: () => "Do not display live prices until a lawful provider is configured server-side.",
};

export function exchangeMarkers() {
  return EXCHANGES.map((exchange) => ({
    id: `exchange-${exchange.id}`,
    category: "finance",
    severity: "low",
    title: exchange.name,
    summary: `${exchange.country} exchange registry entry. Trading status is ${exchange.tradingStatus}; no live price claim is made.`,
    lat: exchange.coordinates.lat,
    lon: exchange.coordinates.lon,
    country: exchange.country,
    place: exchange.name,
    occurredAt: Date.now(),
    updatedAt: Date.now(),
    sourceName: "Exchange registry fixture",
    sourceUrl: exchange.website,
    sourceType: "Development fixture",
    confidence: 70,
    verificationStatus: "Registry scaffold",
    coordinateMethod: "exchange city coordinates",
    providerUrl: "docs/DATA_SOURCES.md",
    details: {
      MIC: exchange.mic,
      "Primary index": exchange.primaryIndex,
      "Time zone": exchange.timeZone,
      "Trading status": exchange.tradingStatus,
    },
  }));
}
