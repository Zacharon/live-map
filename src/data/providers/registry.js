import { PROVIDER_SOURCE_REGISTRY } from "./source-registry.js";

function sourceMetadata(id) {
  return PROVIDER_SOURCE_REGISTRY.find((provider) => provider.id === id) || {};
}

export const EVENT_PROVIDERS = [
  {
    ...sourceMetadata("usgs"),
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
    ...sourceMetadata("eonet"),
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
  {
    ...sourceMetadata("nws-alerts"),
    id: "nws-alerts",
    name: "NOAA/NWS Active Alerts",
    description: "Official active weather alert GeoJSON feed from the National Weather Service.",
    homepageUrl: "https://api.weather.gov/alerts/active",
    attribution: "NOAA National Weather Service",
    enabled: true,
    categories: ["storm"],
    refreshIntervalMs: 120000,
    timeoutMs: 15000,
    integrationType: "official-geojson",
    freshnessMs: 10 * 60 * 1000,
    userAgent:
      globalThis?.process?.env?.NWS_USER_AGENT ||
      "LiveWorldMap/1.0 (contact: configure NWS_USER_AGENT in Netlify environment)",
  },
];

export function providerById(id) {
  return EVENT_PROVIDERS.find((provider) => provider.id === id);
}
