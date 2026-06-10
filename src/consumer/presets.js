export const CONSUMER_PRESETS = {
  explore: {
    id: "explore",
    label: "Explore",
    dashboard: "primary",
    domains: ["natural-disaster", "weather", "major-news", "infrastructure", "technology-cyber", "positive-development"],
    layers: ["earthquake", "wildfire", "storm", "volcano", "flood", "infrastructure", "cyber", "other"],
    minimumSeverity: "high",
    verificationStatuses: ["reported", "corroborated", "primary-confirmed"],
    recordKinds: ["event"],
    timeWindow: 24,
    aviationEnabled: false,
    maritimeEnabled: false,
  },
  breaking: { id: "breaking", label: "Breaking Now", dashboard: "primary", domains: [], layers: [], minimumSeverity: "medium", verificationStatuses: ["reported", "corroborated", "primary-confirmed"], recordKinds: ["event"], timeWindow: 24, aviationEnabled: false, maritimeEnabled: false },
  weather: { id: "weather", label: "Severe Weather", dashboard: "primary", domains: ["weather"], layers: ["storm", "flood"], minimumSeverity: "medium", verificationStatuses: ["reported", "corroborated", "primary-confirmed"], recordKinds: ["event"], timeWindow: 72, aviationEnabled: false, maritimeEnabled: false },
  disasters: { id: "disasters", label: "Natural Disasters", dashboard: "primary", domains: ["natural-disaster"], layers: ["earthquake", "wildfire", "volcano", "flood", "storm"], minimumSeverity: "medium", verificationStatuses: ["reported", "corroborated", "primary-confirmed"], recordKinds: ["event"], timeWindow: 168, aviationEnabled: false, maritimeEnabled: false },
  conflicts: { id: "conflicts", label: "Conflicts", dashboard: "primary", domains: ["conflict-security"], layers: ["conflict", "infrastructure"], minimumSeverity: "medium", verificationStatuses: ["reported", "corroborated", "primary-confirmed"], recordKinds: ["event"], timeWindow: 168, aviationEnabled: false, maritimeEnabled: false },
  cyber: { id: "cyber", label: "Cyber & Outages", dashboard: "technology", domains: ["technology-cyber", "infrastructure"], layers: ["cyber", "infrastructure"], minimumSeverity: "medium", verificationStatuses: ["reported", "corroborated", "primary-confirmed"], recordKinds: ["event"], timeWindow: 168, aviationEnabled: false, maritimeEnabled: false },
  markets: { id: "markets", label: "Markets & Energy", dashboard: "finance", domains: ["finance-markets", "commodity-supply-chain", "infrastructure"], layers: ["finance", "infrastructure"], minimumSeverity: "medium", verificationStatuses: ["reported", "corroborated", "primary-confirmed"], recordKinds: ["event", "observation"], timeWindow: 168, aviationEnabled: false, maritimeEnabled: false },
  flights: { id: "flights", label: "Flights", dashboard: "primary", domains: ["aviation", "weather", "infrastructure"], layers: ["infrastructure", "storm"], minimumSeverity: "low", verificationStatuses: ["reported", "corroborated", "primary-confirmed"], recordKinds: ["event", "moving-object"], timeWindow: 24, aviationEnabled: true, maritimeEnabled: false },
  ships: { id: "ships", label: "Ships", dashboard: "commodity", domains: ["maritime", "commodity-supply-chain", "infrastructure"], layers: ["infrastructure", "conflict"], minimumSeverity: "low", verificationStatuses: ["reported", "corroborated", "primary-confirmed"], recordKinds: ["event", "moving-object"], timeWindow: 72, aviationEnabled: false, maritimeEnabled: true },
  positive: { id: "positive", label: "Positive News", dashboard: "happy", domains: ["positive-development"], layers: ["humanitarian", "other"], minimumSeverity: "low", verificationStatuses: ["reported", "corroborated", "primary-confirmed"], recordKinds: ["event", "discovery-lead"], timeWindow: 720, aviationEnabled: false, maritimeEnabled: false },
};

export const PRESET_ORDER = ["breaking", "weather", "disasters", "conflicts", "cyber", "markets", "flights", "ships", "positive"];

export function severitySetFromMinimum(severities, minimumSeverity = "high") {
  const threshold = severities[minimumSeverity]?.score ?? severities.high.score;
  return new Set(Object.entries(severities).filter(([, value]) => value.score >= threshold).map(([key]) => key));
}

export function presetById(id) {
  return CONSUMER_PRESETS[id] || CONSUMER_PRESETS.explore;
}
