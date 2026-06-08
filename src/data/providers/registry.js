export const EVENT_PROVIDERS = [
  {
    id: "usgs",
    name: "USGS Earthquake Hazards Program",
    description: "Official earthquake GeoJSON feed from the United States Geological Survey.",
    homepageUrl: "https://earthquake.usgs.gov/earthquakes/feed/",
    attribution: "USGS Earthquake Hazards Program",
    enabled: true,
    categories: ["earthquake"],
    refreshIntervalMs: 120000,
    timeoutMs: 12000,
    integrationType: "official-json",
    freshnessMs: 15 * 60 * 1000,
  },
  {
    id: "eonet",
    name: "NASA EONET",
    description: "NASA Earth Observatory Natural Event Tracker open natural-hazard feed.",
    homepageUrl: "https://eonet.gsfc.nasa.gov/docs/v3",
    attribution: "NASA EONET",
    enabled: true,
    categories: ["wildfire", "storm", "volcano", "flood", "other"],
    refreshIntervalMs: 120000,
    timeoutMs: 15000,
    integrationType: "official-json",
    freshnessMs: 30 * 60 * 1000,
  },
];

export function providerById(id) {
  return EVENT_PROVIDERS.find((provider) => provider.id === id);
}
