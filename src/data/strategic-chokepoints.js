const REVIEWED_AT = "2026-07-15";

export const CHOKEPOINT_TYPES = ["strait", "canal", "sea-lane", "maritime-region", "port-approach", "arctic-route", "strategic-region"];
export const CHOKEPOINT_STATUSES = ["normal", "watch", "disrupted", "severely-disrupted", "closed", "unknown"];

const SOURCE_LINKS = [
  { label: "International Hydrographic Organization", url: "https://iho.int/" },
  { label: "International Maritime Organization", url: "https://www.imo.org/" },
];

function box(west, south, east, north) {
  return [[[west, south], [east, south], [east, north], [west, north], [west, south]]];
}

function point(coordinates) {
  return { geometryType: "point", geometry: { type: "Point", coordinates }, center: { lon: coordinates[0], lat: coordinates[1] } };
}

function line(coordinates) {
  const lons = coordinates.map(([lon]) => lon);
  const lats = coordinates.map(([, lat]) => lat);
  return {
    geometryType: "line",
    geometry: { type: "LineString", coordinates },
    center: { lon: (Math.min(...lons) + Math.max(...lons)) / 2, lat: (Math.min(...lats) + Math.max(...lats)) / 2 },
  };
}

function region(bounds) {
  const [west, south, east, north] = bounds;
  return {
    geometryType: "polygon",
    geometry: { type: "Polygon", coordinates: box(west, south, east, north) },
    center: { lon: (west + east) / 2, lat: (south + north) / 2 },
    boundingBox: { west, south, east, north },
  };
}

function entry(id, name, type, geography, options = {}) {
  const aliases = [...new Set([name, ...(options.aliases || [])])];
  return {
    id,
    name,
    shortName: options.shortName || name,
    aliases,
    type,
    status: "normal",
    description: options.description || `Approximate operational reference area for ${name}.`,
    strategicReason: options.strategicReason || "A monitored maritime passage or region with potential cross-domain relevance.",
    primaryCountries: options.primaryCountries || [],
    adjacentCountries: options.adjacentCountries || [],
    regions: options.regions || [],
    ...geography,
    domains: options.domains || ["maritime", "conflict-security", "weather", "natural-disaster", "infrastructure", "commodity-supply-chain"],
    watchedEventTypes: options.watchedEventTypes || ["infrastructure", "storm", "flood", "conflict"],
    watchedKeywords: aliases,
    watchedEntities: options.watchedEntities || [],
    watchedPorts: options.watchedPorts || [],
    watchedRoutes: options.watchedRoutes || [],
    baselineRisk: options.baselineRisk || "moderate",
    sensitivity: options.sensitivity || "high",
    confidence: options.confidence || 65,
    sourceLinks: SOURCE_LINKS,
    methodologyNotes: "Neutral, approximate operational geometry for correlation and navigation. It is not a territorial, legal, or navigation boundary.",
    limitations: "The geometry is intentionally generalized. Correlation is evidence-led and does not itself establish a disruption or closure.",
    enabled: true,
    lastReviewedAt: REVIEWED_AT,
  };
}

export const STRATEGIC_CHOKEPOINTS = [
  entry("bab-el-mandeb", "Bab el-Mandeb Strait", "strait", line([[42.45, 12.95], [43.45, 12.55]]), { aliases: ["Bab al-Mandab", "Mandeb"], primaryCountries: ["Yemen", "Djibouti", "Eritrea"], regions: ["Red Sea", "Gulf of Aden"], watchedPorts: ["Aden", "Djibouti"], watchedRoutes: ["Red Sea transit"] }),
  entry("strait-of-hormuz", "Strait of Hormuz", "strait", line([[56.1, 26.55], [56.65, 26.45]]), { aliases: ["Hormuz"], primaryCountries: ["Iran", "Oman", "United Arab Emirates"], regions: ["Persian Gulf", "Arabian Sea"], watchedPorts: ["Fujairah"], watchedRoutes: ["Persian Gulf transit"] }),
  entry("suez-canal", "Suez Canal", "canal", line([[32.35, 30.2], [32.55, 30.7]]), { aliases: ["Suez"], primaryCountries: ["Egypt"], regions: ["Red Sea", "Eastern Mediterranean"], watchedPorts: ["Port Said", "Suez"], watchedRoutes: ["Suez transit"] }),
  entry("strait-of-malacca", "Strait of Malacca", "strait", line([[100.25, 2.2], [103.2, 1.35]]), { aliases: ["Malacca Strait"], primaryCountries: ["Malaysia", "Indonesia", "Singapore"], regions: ["Southeast Asia"], watchedPorts: ["Port Klang", "Singapore"], watchedRoutes: ["Malacca transit"] }),
  entry("singapore-strait", "Singapore Strait", "strait", line([[103.55, 1.2], [104.25, 1.2]]), { aliases: ["Singapore Strait"], primaryCountries: ["Singapore", "Indonesia", "Malaysia"], regions: ["Southeast Asia"], watchedPorts: ["Singapore"], watchedRoutes: ["Singapore transit"] }),
  entry("south-china-sea", "South China Sea", "maritime-region", region([105, 0, 122, 23]), { aliases: ["South China Sea", "SCS"], regions: ["East Asia", "Southeast Asia"], watchedRoutes: ["South China Sea transit"], sensitivity: "high" }),
  entry("taiwan-strait", "Taiwan Strait", "strait", line([[119.2, 24.4], [120.3, 24.4]]), { aliases: ["Taiwan Strait"], primaryCountries: ["Taiwan", "China"], regions: ["East Asia", "South China Sea"], watchedRoutes: ["Taiwan transit"] }),
  entry("bosporus", "Bosporus", "strait", line([[29.0, 41.05], [29.18, 41.2]]), { aliases: ["Bosphorus", "Istanbul Strait"], primaryCountries: ["Turkey"], regions: ["Black Sea", "Eastern Mediterranean"], watchedPorts: ["Istanbul"] }),
  entry("dardanelles", "Dardanelles", "strait", line([[26.25, 40.15], [26.65, 40.18]]), { aliases: ["Canakkale Strait"], primaryCountries: ["Turkey"], regions: ["Black Sea", "Eastern Mediterranean"] }),
  entry("panama-canal", "Panama Canal", "canal", line([[-79.65, 9.2], [-79.9, 8.95]]), { aliases: ["Panama"], primaryCountries: ["Panama"], regions: ["Caribbean", "Pacific"], watchedPorts: ["Colon", "Balboa"], watchedRoutes: ["Panama transit"] }),
  entry("cape-of-good-hope", "Cape of Good Hope", "sea-lane", line([[18.2, -34.6], [19.2, -35.2]]), { aliases: ["Cape route"], primaryCountries: ["South Africa"], regions: ["Southern Africa"], watchedRoutes: ["Cape route"] }),
  entry("strait-of-gibraltar", "Strait of Gibraltar", "strait", line([[-5.8, 35.95], [-5.25, 35.95]]), { aliases: ["Gibraltar Strait"], primaryCountries: ["Spain", "Morocco", "United Kingdom"], regions: ["Atlantic", "Mediterranean"] }),
  entry("english-channel", "English Channel", "sea-lane", line([[-3.2, 50.4], [1.6, 50.9]]), { aliases: ["Channel"], primaryCountries: ["United Kingdom", "France"], regions: ["North Sea", "Atlantic"] }),
  entry("danish-straits", "Danish Straits", "strait", region([10.2, 54.4, 13.2, 57.9]), { aliases: ["Danish Straits", "Kattegat", "Skagerrak"], primaryCountries: ["Denmark", "Sweden", "Germany"], regions: ["Baltic Sea", "North Sea"] }),
  entry("mozambique-channel", "Mozambique Channel", "sea-lane", region([38, -26, 45, -10]), { aliases: ["Mozambique Channel"], primaryCountries: ["Mozambique", "Madagascar"], regions: ["Indian Ocean"] }),
  entry("lombok-strait", "Lombok Strait", "strait", line([[115.8, -8.0], [115.95, -8.8]]), { aliases: ["Lombok Strait"], primaryCountries: ["Indonesia"], regions: ["Southeast Asia"] }),
  entry("sunda-strait", "Sunda Strait", "strait", line([[105.7, -5.8], [106.1, -6.1]]), { aliases: ["Sunda Strait"], primaryCountries: ["Indonesia"], regions: ["Southeast Asia"] }),
  entry("makassar-strait", "Makassar Strait", "strait", line([[118.2, -2.0], [119.2, -3.2]]), { aliases: ["Makassar Strait"], primaryCountries: ["Indonesia"], regions: ["Southeast Asia"] }),
  entry("turkish-straits", "Turkish Straits", "strategic-region", region([25.9, 39.9, 29.4, 41.5]), { aliases: ["Turkish Straits", "Bosporus and Dardanelles"], primaryCountries: ["Turkey"], regions: ["Black Sea", "Eastern Mediterranean"], watchedRoutes: ["Turkish Straits transit"] }),
  entry("northern-sea-route", "Arctic Northern Sea Route", "arctic-route", line([[35, 69], [70, 74], [125, 74], [165, 68]]), { aliases: ["Northern Sea Route", "NSR"], regions: ["Arctic"], sensitivity: "high" }),
  entry("bering-strait", "Bering Strait", "strait", line([[-169.5, 65.7], [-168.3, 66.1]]), { aliases: ["Bering Strait"], primaryCountries: ["United States", "Russia"], regions: ["Arctic", "North Pacific"] }),
  entry("giuk-gap", "GIUK Gap", "strategic-region", region([-30, 57, -5, 67]), { aliases: ["GIUK", "Greenland Iceland United Kingdom Gap"], regions: ["North Atlantic"] }),
  entry("arctic-circle", "Arctic Circle", "strategic-region", region([-180, 66.5, 180, 84]), { aliases: ["Arctic"], regions: ["Arctic"], sensitivity: "high" }),
  entry("persian-gulf", "Persian Gulf", "maritime-region", region([47, 23.5, 56.7, 30.7]), { aliases: ["Persian Gulf", "Arabian Gulf"], regions: ["Middle East"], watchedRoutes: ["Persian Gulf transit"] }),
  entry("gulf-of-aden", "Gulf of Aden", "maritime-region", region([43, 11, 52.5, 15.5]), { aliases: ["Gulf of Aden"], regions: ["Horn of Africa", "Arabian Sea"] }),
  entry("red-sea", "Red Sea", "maritime-region", region([32, 12, 44, 29]), { aliases: ["Red Sea"], regions: ["Middle East", "Horn of Africa"], watchedRoutes: ["Red Sea transit"] }),
  entry("arabian-sea", "Arabian Sea", "maritime-region", region([55, 5, 74, 25]), { aliases: ["Arabian Sea"], regions: ["Indian Ocean", "Middle East"] }),
  entry("eastern-mediterranean", "Eastern Mediterranean", "maritime-region", region([22, 30, 37, 38]), { aliases: ["Eastern Mediterranean", "East Mediterranean"], regions: ["Mediterranean"] }),
  entry("black-sea", "Black Sea", "maritime-region", region([27, 40, 42, 47]), { aliases: ["Black Sea"], regions: ["Europe", "Turkey"] }),
  entry("baltic-sea", "Baltic Sea", "maritime-region", region([10, 53, 31, 66]), { aliases: ["Baltic Sea"], regions: ["Northern Europe"] }),
  entry("gulf-of-guinea", "Gulf of Guinea", "maritime-region", region([-5, -5, 10, 7]), { aliases: ["Gulf of Guinea"], regions: ["West Africa"] }),
  entry("horn-of-africa", "Horn of Africa", "strategic-region", region([40, 2, 52, 15]), { aliases: ["Horn of Africa"], regions: ["East Africa", "Gulf of Aden"] }),
  entry("east-china-sea", "East China Sea", "maritime-region", region([119, 24, 131, 33]), { aliases: ["East China Sea"], regions: ["East Asia"] }),
  entry("sea-of-japan", "Sea of Japan", "maritime-region", region([127, 35, 142, 52]), { aliases: ["Sea of Japan", "East Sea"], regions: ["East Asia"] }),
  entry("korean-maritime-approaches", "Korean Peninsula maritime approaches", "strategic-region", region([124, 32, 132, 40]), { aliases: ["Korean maritime approaches", "Korean Peninsula"], regions: ["East Asia"] }),
  entry("panama-caribbean-approaches", "Caribbean approaches to the Panama Canal", "port-approach", region([-83, 8, -76, 13]), { aliases: ["Panama Caribbean approaches", "Caribbean Panama"], primaryCountries: ["Panama", "Colombia"], regions: ["Caribbean"], watchedPorts: ["Colon"] }),
];

export const CHOKEPOINT_BY_ID = new Map(STRATEGIC_CHOKEPOINTS.map((item) => [item.id, item]));

export function chokepointById(id) {
  return CHOKEPOINT_BY_ID.get(String(id || "")) || null;
}
