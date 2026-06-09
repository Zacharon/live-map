export const TAXONOMY = [
  { id: "all", label: "All events", description: "Every visible event.", parentId: null, icon: "all", defaultColor: "#d7e8f0", dashboard: "primary", mapLayer: "all", aliases: [] },
  { id: "conflict-security", label: "Conflicts & Security", description: "Conflict, unrest, sanctions and security developments.", parentId: "all", icon: "shield", defaultColor: "#ff5d6c", dashboard: "primary", mapLayer: "conflict", aliases: ["conflict"] },
  { id: "natural-disaster", label: "Natural Disasters", description: "Earthquakes, wildfires, floods, volcanoes and other natural hazards.", parentId: "all", icon: "warning", defaultColor: "#ff8a3d", dashboard: "primary", mapLayer: "hazards", aliases: ["earthquake", "wildfire", "volcano", "flood"] },
  { id: "weather", label: "Weather", description: "Storms, cyclones, warnings and severe weather.", parentId: "all", icon: "cloud", defaultColor: "#45a3ff", dashboard: "primary", mapLayer: "weather", aliases: ["storm"] },
  { id: "major-news", label: "Major News", description: "Government, diplomatic, health and breaking public-interest developments.", parentId: "all", icon: "news", defaultColor: "#c0d2ff", dashboard: "primary", mapLayer: "news", aliases: [] },
  { id: "finance-markets", label: "Finance & Markets", description: "Markets, banks, exchanges and financial events.", parentId: "all", icon: "chart", defaultColor: "#59d28f", dashboard: "finance", mapLayer: "finance", aliases: ["finance"] },
  { id: "technology-cyber", label: "Technology & Cyber", description: "Cybersecurity, cloud, service and Internet disruptions.", parentId: "all", icon: "cpu", defaultColor: "#72b7ff", dashboard: "technology", mapLayer: "cyber", aliases: ["cyber"] },
  { id: "commodity-supply-chain", label: "Commodities & Supply Chain", description: "Energy, materials, agriculture, logistics and supply-chain events.", parentId: "all", icon: "box", defaultColor: "#f6c453", dashboard: "commodity", mapLayer: "commodity", aliases: [] },
  { id: "infrastructure", label: "Infrastructure", description: "Power, transport, telecom, water and other infrastructure incidents.", parentId: "all", icon: "grid", defaultColor: "#9fb5ff", dashboard: "primary", mapLayer: "infrastructure", aliases: ["infrastructure"] },
  { id: "aviation", label: "Aviation", description: "Aviation operational and safety events.", parentId: "all", icon: "plane", defaultColor: "#7ee6d2", dashboard: "primary", mapLayer: "aviation", aliases: [] },
  { id: "maritime", label: "Maritime", description: "Maritime, port and vessel-related events.", parentId: "all", icon: "anchor", defaultColor: "#6ec6ff", dashboard: "primary", mapLayer: "maritime", aliases: [] },
  { id: "humanitarian", label: "Humanitarian", description: "Humanitarian emergencies, aid and displacement.", parentId: "all", icon: "aid", defaultColor: "#ff9fc1", dashboard: "happy", mapLayer: "humanitarian", aliases: ["humanitarian"] },
  { id: "positive-development", label: "Positive Developments", description: "Recovery, science, conservation and improving public outcomes.", parentId: "all", icon: "spark", defaultColor: "#38e0a3", dashboard: "happy", mapLayer: "positive", aliases: ["positive", "other"] },
  { id: "health", label: "Health", description: "Public-health emergencies, outbreak reports, and health-system signals.", parentId: "all", icon: "health", defaultColor: "#fca5a5", dashboard: "primary", mapLayer: "health", aliases: ["public-health", "outbreak"] },
  { id: "geospatial-reference", label: "Geospatial/reference", description: "Reference layers, basemaps, boundaries, and static context sources.", parentId: "all", icon: "map", defaultColor: "#c4b5fd", dashboard: "primary", mapLayer: "reference", aliases: ["geospatial", "reference"] },
  { id: "other", label: "Other", description: "Events that do not map cleanly to a known taxonomy entry.", parentId: "all", icon: "dot", defaultColor: "#68d6b7", dashboard: "primary", mapLayer: "other", aliases: [] },
];

const TYPE_ROWS = [
  ["armed-conflict", "Armed conflict", "conflict-security", ["conflict"]],
  ["airstrike", "Airstrike", "conflict-security"],
  ["missile-drone-attack", "Missile or drone attack", "conflict-security"],
  ["ground-engagement", "Ground engagement", "conflict-security"],
  ["civil-unrest", "Civil unrest", "conflict-security"],
  ["protest", "Protest", "conflict-security"],
  ["terrorism", "Terrorism", "conflict-security"],
  ["border-incident", "Border incident", "conflict-security"],
  ["military-movement", "Military movement", "conflict-security"],
  ["ceasefire", "Ceasefire", "conflict-security"],
  ["sanctions", "Sanctions", "conflict-security"],
  ["displacement", "Displacement", "humanitarian"],
  ["food-insecurity", "Food insecurity", "humanitarian"],
  ["humanitarian-access", "Humanitarian access", "humanitarian"],
  ["refugee-crisis", "Refugee crisis", "humanitarian"],
  ["health-emergency", "Health emergency", "humanitarian"],
  ["emergency-appeal", "Emergency appeal", "humanitarian"],
  ["aid-delivery", "Aid delivery", "humanitarian"],
  ["shelter-crisis", "Shelter crisis", "humanitarian"],
  ["water-sanitation", "Water and sanitation", "humanitarian"],
  ["protection", "Protection", "humanitarian"],
  ["recovery", "Recovery", "humanitarian"],
  ["humanitarian-update", "Humanitarian update", "humanitarian"],
  ["earthquake", "Earthquake", "natural-disaster", ["seismic"]],
  ["tsunami", "Tsunami", "natural-disaster"],
  ["volcano", "Volcano", "natural-disaster"],
  ["wildfire", "Wildfire", "natural-disaster", ["wildfires"]],
  ["flood", "Flood", "natural-disaster"],
  ["landslide", "Landslide", "natural-disaster"],
  ["avalanche", "Avalanche", "natural-disaster"],
  ["drought", "Drought", "natural-disaster"],
  ["tropical-cyclone", "Tropical cyclone", "weather"],
  ["hurricane", "Hurricane", "weather"],
  ["tornado", "Tornado", "weather"],
  ["severe-thunderstorm", "Severe thunderstorm", "weather"],
  ["winter-storm", "Winter storm", "weather"],
  ["heat-wave", "Heat wave", "weather"],
  ["extreme-cold", "Extreme cold", "weather"],
  ["dust-storm", "Dust storm", "weather"],
  ["heavy-rainfall", "Heavy rainfall", "weather"],
  ["weather-warning", "Weather warning", "weather", ["storm"]],
  ["government-decision", "Government decision", "major-news"],
  ["election", "Election", "major-news"],
  ["leadership-change", "Leadership change", "major-news"],
  ["diplomatic-development", "Diplomatic development", "major-news"],
  ["public-health-emergency", "Public-health emergency", "major-news"],
  ["outbreak", "Outbreak", "health"],
  ["health-alert", "Health alert", "health"],
  ["major-accident", "Major accident", "major-news"],
  ["legal-ruling", "Legal ruling", "major-news"],
  ["international-agreement", "International agreement", "major-news"],
  ["breaking-event", "Breaking event", "major-news"],
  ["central-bank-decision", "Central-bank decision", "finance-markets"],
  ["economic-release", "Economic release", "finance-markets"],
  ["economic-revision", "Economic revision", "finance-markets"],
  ["macro-threshold-crossing", "Macroeconomic threshold crossing", "finance-markets"],
  ["macro-observation", "Macroeconomic observation", "finance-markets"],
  ["cybersecurity-disclosure", "Cybersecurity disclosure", "finance-markets"],
  ["acquisition-disposition", "Acquisition or disposition", "finance-markets"],
  ["financial-obligation-trigger", "Financial obligation trigger", "finance-markets"],
  ["material-impairment", "Material impairment", "finance-markets"],
  ["non-reliance-restatement", "Non-reliance or restatement", "finance-markets"],
  ["executive-change", "Executive change", "finance-markets"],
  ["regulation-fd-disclosure", "Regulation FD disclosure", "finance-markets"],
  ["other-material-event", "Other material event", "finance-markets"],
  ["foreign-issuer-report", "Foreign issuer report", "finance-markets"],
  ["annual-report", "Annual report", "finance-markets"],
  ["quarterly-report", "Quarterly report", "finance-markets"],
  ["large-ownership-change", "Large ownership change", "finance-markets"],
  ["trading-halt", "Trading halt", "finance-markets"],
  ["market-shock", "Market shock", "finance-markets"],
  ["earnings", "Earnings", "finance-markets"],
  ["bankruptcy", "Bankruptcy", "finance-markets"],
  ["merger-acquisition", "Merger or acquisition", "finance-markets"],
  ["regulatory-action", "Regulatory action", "finance-markets"],
  ["currency-movement", "Currency movement", "finance-markets"],
  ["credit-downgrade", "Credit downgrade", "finance-markets"],
  ["exchange-disruption", "Exchange disruption", "finance-markets"],
  ["data-breach", "Data breach", "technology-cyber"],
  ["ransomware", "Ransomware", "technology-cyber"],
  ["exploited-vulnerability", "Exploited vulnerability", "technology-cyber", ["actively-exploited-vulnerability"]],
  ["service-outage", "Service outage", "technology-cyber"],
  ["cloud-outage", "Cloud outage", "technology-cyber"],
  ["internet-disruption", "Internet disruption", "technology-cyber"],
  ["bgp-incident", "BGP incident", "technology-cyber"],
  ["technology-release", "Technology release", "technology-cyber"],
  ["technology-regulation", "Technology regulation", "technology-cyber"],
  ["production-outage", "Production outage", "commodity-supply-chain"],
  ["refinery-outage", "Refinery outage", "commodity-supply-chain"],
  ["pipeline-disruption", "Pipeline disruption", "commodity-supply-chain"],
  ["mine-closure", "Mine closure", "commodity-supply-chain"],
  ["port-closure", "Port closure", "commodity-supply-chain"],
  ["export-restriction", "Export restriction", "commodity-supply-chain"],
  ["crop-damage", "Crop damage", "commodity-supply-chain"],
  ["inventory-release", "Inventory release", "commodity-supply-chain"],
  ["refinery-utilization-shock", "Refinery utilization shock", "commodity-supply-chain"],
  ["electricity-generation-signal", "Electricity generation signal", "commodity-supply-chain"],
  ["production-level-revised", "Production level revised", "commodity-supply-chain"],
  ["official-energy-observation", "Official energy observation", "commodity-supply-chain"],
  ["shipping-disruption", "Shipping disruption", "commodity-supply-chain"],
  ["labor-strike", "Labor strike", "commodity-supply-chain"],
  ["power-outage", "Power outage", "infrastructure"],
  ["grid-failure", "Grid failure", "infrastructure"],
  ["submarine-cable-incident", "Submarine cable incident", "infrastructure"],
  ["telecommunications-outage", "Telecommunications outage", "infrastructure"],
  ["pipeline-incident", "Pipeline incident", "infrastructure"],
  ["port-disruption", "Port disruption", "infrastructure"],
  ["airport-disruption", "Airport disruption", "infrastructure"],
  ["rail-disruption", "Rail disruption", "infrastructure"],
  ["water-system-incident", "Dam or water-system incident", "infrastructure"],
  ["basemap-reference", "Basemap or reference layer", "geospatial-reference"],
];

export const TAXONOMY_TYPES = TYPE_ROWS.map(([id, label, parentId, aliases = []]) => ({
  id,
  label,
  description: `${label} event type.`,
  parentId,
  icon: "type",
  defaultColor: TAXONOMY.find((entry) => entry.id === parentId)?.defaultColor || "#68d6b7",
  dashboard: TAXONOMY.find((entry) => entry.id === parentId)?.dashboard || "primary",
  mapLayer: TAXONOMY.find((entry) => entry.id === parentId)?.mapLayer || "other",
  aliases,
}));

export const TAXONOMY_REGISTRY = [...TAXONOMY, ...TAXONOMY_TYPES];

export function taxonomyEntry(id) {
  return TAXONOMY.find((entry) => entry.id === id) || TAXONOMY_TYPES.find((entry) => entry.id === id) || null;
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function classifyEvent(input = {}) {
  const candidates = [
    input.type,
    input.subtype,
    input.category,
    input.subcategory,
    ...(Array.isArray(input.tags) ? input.tags : []),
  ].map(normalize);
  const type =
    TAXONOMY_TYPES.find((entry) => candidates.includes(entry.id) || entry.aliases.some((alias) => candidates.includes(normalize(alias)))) ||
    null;
  const domain =
    taxonomyEntry(input.domain) ||
    (type ? taxonomyEntry(type.parentId) : null) ||
    TAXONOMY.find((entry) => candidates.includes(entry.id) || entry.aliases.some((alias) => candidates.includes(normalize(alias)))) ||
    taxonomyEntry("other");
  return {
    domain: domain.id,
    domainLabel: domain.label,
    category: input.taxonomyCategory || domain.id,
    categoryLabel: domain.label,
    type: type?.id || normalize(input.category) || "other",
    typeLabel: type?.label || input.category || "Other",
    subtype: input.subtype || null,
    color: domain.defaultColor,
  };
}

export function domainOptions() {
  return TAXONOMY.filter((entry) => entry.parentId === "all");
}
