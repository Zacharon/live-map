import { CONFIG, CATEGORIES, SEVERITIES } from "./config.js";
import { getDashboard } from "./data/dashboards.js";

function dashboardFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return getDashboard(params.get(CONFIG.dashboardQueryKey) || CONFIG.defaultDashboard).id;
}

function urlValue(key, fallback) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key) || fallback;
}

function urlList(key) {
  const value = urlValue(key, "");
  return new Set(value.split(",").map((item) => item.trim()).filter(Boolean));
}

export const state = {
  dashboard: dashboardFromUrl(),
  events: [],
  categoriesByDashboard: new Map(),
  severitiesByDashboard: new Map(),
  queryByDashboard: new Map(),
  hours: 168,
  sort: urlValue("sort", "highest-severity"),
  groupBy: urlValue("group", "domain"),
  cardMode: urlValue("cards", "compact"),
  lastLoaded: null,
  sources: [],
  sourceStatus: {},
  domainSourceStatus: {},
  providerResults: [],
  systemStatus: "unknown",
  errors: [],
  apiStatus: "idle",
  apiFailure: null,
  retryDelayMs: 0,
  nextRetryAt: null,
  countDebug: {},
  visibleMapEvents: 0,
  mapHealth: null,
  mapMode: "2d",
  ciiVisible: false,
  selectedEventId: null,
  sessionAlertHistory: [],
  collapsedGroups: new Set(JSON.parse(localStorage.getItem("live-map-collapsed-groups-v1") || "[]")),
  incidents: [],
};

export function dashboardFilters(dashboardId = state.dashboard) {
  if (!state.categoriesByDashboard.has(dashboardId)) {
    state.categoriesByDashboard.set(dashboardId, new Set(Object.keys(CATEGORIES)));
  }
  if (!state.severitiesByDashboard.has(dashboardId)) {
    state.severitiesByDashboard.set(dashboardId, new Set(Object.keys(SEVERITIES)));
  }
  if (!state.queryByDashboard.has(dashboardId)) {
    state.queryByDashboard.set(dashboardId, dashboardId === state.dashboard ? urlValue("q", "") : "");
  }
  if (!state.domainsByDashboard) state.domainsByDashboard = new Map();
  if (!state.domainsByDashboard.has(dashboardId)) {
    state.domainsByDashboard.set(dashboardId, dashboardId === state.dashboard ? urlList("domains") : new Set());
  }
  return {
    categories: state.categoriesByDashboard.get(dashboardId),
    severities: state.severitiesByDashboard.get(dashboardId),
    domains: state.domainsByDashboard.get(dashboardId),
    query: state.queryByDashboard.get(dashboardId),
  };
}

export function syncUrlState() {
  const url = new URL(window.location.href);
  url.searchParams.set(CONFIG.dashboardQueryKey, state.dashboard);
  url.searchParams.set("sort", state.sort);
  url.searchParams.set("group", state.groupBy);
  url.searchParams.set("cards", state.cardMode);
  const filters = dashboardFilters();
  if (filters.query) url.searchParams.set("q", filters.query);
  else url.searchParams.delete("q");
  if (filters.domains.size) url.searchParams.set("domains", [...filters.domains].join(","));
  else url.searchParams.delete("domains");
  window.history.replaceState({}, "", url);
}

export function setDashboard(dashboardId) {
  state.dashboard = getDashboard(dashboardId).id;
  syncUrlState();
}

export function resetDashboardFilters(dashboardId = state.dashboard) {
  state.categoriesByDashboard.set(dashboardId, new Set(Object.keys(CATEGORIES)));
  state.severitiesByDashboard.set(dashboardId, new Set(Object.keys(SEVERITIES)));
  if (!state.domainsByDashboard) state.domainsByDashboard = new Map();
  state.domainsByDashboard.set(dashboardId, new Set());
  state.queryByDashboard.set(dashboardId, "");
  syncUrlState();
}
