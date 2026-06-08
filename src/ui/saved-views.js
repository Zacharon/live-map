const STORAGE_KEY = "live-map-saved-views-v1";

export const DEFAULT_VIEWS = [
  { name: "Global overview", dashboard: "primary", groupBy: "domain", sort: "recently-updated", domains: [] },
  { name: "Natural disasters", dashboard: "primary", groupBy: "type", sort: "newest-occurred", domains: ["natural-disaster"] },
  { name: "Severe weather", dashboard: "primary", groupBy: "type", sort: "source-freshness", domains: ["weather"] },
  { name: "Conflicts and unrest", dashboard: "primary", groupBy: "country", sort: "recently-updated", domains: ["conflict-security"] },
  { name: "Finance and markets", dashboard: "finance", groupBy: "provider", sort: "recently-updated", domains: ["finance-markets"] },
  { name: "Cyber and outages", dashboard: "technology", groupBy: "type", sort: "highest-confidence", domains: ["technology-cyber"] },
  { name: "Infrastructure disruptions", dashboard: "primary", groupBy: "type", sort: "highest-impact", domains: ["infrastructure"] },
  { name: "Humanitarian and positive developments", dashboard: "happy", groupBy: "domain", sort: "recently-updated", domains: ["humanitarian", "positive-development"] },
];

export function loadSavedViews() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return [...DEFAULT_VIEWS, ...parsed.filter((view) => view && view.name)];
  } catch {
    return DEFAULT_VIEWS;
  }
}

export function serializeView(state, filters, name = "Custom view") {
  return {
    name,
    dashboard: state.dashboard,
    sort: state.sort,
    groupBy: state.groupBy,
    cardMode: state.cardMode,
    hours: state.hours,
    domains: [...(filters.domains || [])],
    categories: [...(filters.categories || [])],
    severities: [...(filters.severities || [])],
    query: filters.query || "",
  };
}

export function saveView(view) {
  const custom = loadSavedViews().filter((item) => !DEFAULT_VIEWS.some((defaultView) => defaultView.name === item.name));
  const next = [...custom.filter((item) => item.name !== view.name), view].slice(-12);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return loadSavedViews();
}
