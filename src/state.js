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
  activeArea: urlValue("view", "explore"),
  interfaceMode: localStorage.getItem("live-map-interface-mode-v1") || "standard",
  leftDrawerOpen: localStorage.getItem("live-map-left-drawer-v1") === "open",
  rightDrawerOpen: localStorage.getItem("live-map-right-drawer-v1") !== "closed",
  selectedPreset: localStorage.getItem("live-map-preset-v1") || "explore",
  onboardingComplete: localStorage.getItem("live-map-onboarding-v1") === "done",
  tracking: {
    aircraft: urlValue("tracking", "") === "aircraft",
    vessels: urlValue("tracking", "") === "vessels",
    airports: false,
    ports: false,
  },
  movingObjects: [],
  movingObjectStatus: {},
  selectedMovingObjectId: urlValue("aircraft", "") || urlValue("vessel", "") || null,
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
  selectedCountryIso3: urlValue("country", "").toUpperCase() || null,
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
  if (!state.recordKindsByDashboard) state.recordKindsByDashboard = new Map();
  if (!state.recordKindsByDashboard.has(dashboardId)) {
    state.recordKindsByDashboard.set(dashboardId, new Set());
  }
  return {
    categories: state.categoriesByDashboard.get(dashboardId),
    severities: state.severitiesByDashboard.get(dashboardId),
    domains: state.domainsByDashboard.get(dashboardId),
    recordKinds: state.recordKindsByDashboard.get(dashboardId),
    query: state.queryByDashboard.get(dashboardId),
  };
}

export function syncUrlState() {
  const url = new URL(window.location.href);
  url.searchParams.set("view", state.activeArea);
  url.searchParams.set(CONFIG.dashboardQueryKey, state.dashboard);
  url.searchParams.set("sort", state.sort);
  url.searchParams.set("group", state.groupBy);
  url.searchParams.set("cards", state.cardMode);
  const filters = dashboardFilters();
  if (filters.query) url.searchParams.set("q", filters.query);
  else url.searchParams.delete("q");
  if (filters.domains.size) url.searchParams.set("domains", [...filters.domains].join(","));
  else url.searchParams.delete("domains");
  if (state.selectedCountryIso3) url.searchParams.set("country", state.selectedCountryIso3);
  else url.searchParams.delete("country");
  if (state.tracking.aircraft) url.searchParams.set("tracking", "aircraft");
  else if (state.tracking.vessels) url.searchParams.set("tracking", "vessels");
  else url.searchParams.delete("tracking");
  if (state.selectedMovingObjectId) {
    const key = state.selectedMovingObjectId.startsWith("vessel:") ? "vessel" : "aircraft";
    url.searchParams.set(key, state.selectedMovingObjectId.replace(/^aircraft:|^vessel:/, ""));
  } else {
    url.searchParams.delete("aircraft");
    url.searchParams.delete("vessel");
  }
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
  if (!state.recordKindsByDashboard) state.recordKindsByDashboard = new Map();
  state.recordKindsByDashboard.set(dashboardId, new Set());
  state.queryByDashboard.set(dashboardId, "");
  syncUrlState();
}
