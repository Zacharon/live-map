import { CONFIG, CATEGORIES, SEVERITIES } from "./config.js";
import { getDashboard } from "./data/dashboards.js";

function dashboardFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return getDashboard(params.get(CONFIG.dashboardQueryKey) || CONFIG.defaultDashboard).id;
}

export const state = {
  dashboard: dashboardFromUrl(),
  events: [],
  categoriesByDashboard: new Map(),
  severitiesByDashboard: new Map(),
  queryByDashboard: new Map(),
  hours: 168,
  sort: "severity",
  lastLoaded: null,
  sources: [],
  sourceStatus: {},
  providerResults: [],
  systemStatus: "unknown",
  errors: [],
  mapMode: "2d",
  ciiVisible: false,
  selectedEventId: null,
  sessionAlertHistory: [],
};

export function dashboardFilters(dashboardId = state.dashboard) {
  if (!state.categoriesByDashboard.has(dashboardId)) {
    state.categoriesByDashboard.set(dashboardId, new Set(Object.keys(CATEGORIES)));
  }
  if (!state.severitiesByDashboard.has(dashboardId)) {
    state.severitiesByDashboard.set(dashboardId, new Set(Object.keys(SEVERITIES)));
  }
  if (!state.queryByDashboard.has(dashboardId)) {
    state.queryByDashboard.set(dashboardId, "");
  }
  return {
    categories: state.categoriesByDashboard.get(dashboardId),
    severities: state.severitiesByDashboard.get(dashboardId),
    query: state.queryByDashboard.get(dashboardId),
  };
}

export function setDashboard(dashboardId) {
  state.dashboard = getDashboard(dashboardId).id;
  const url = new URL(window.location.href);
  url.searchParams.set(CONFIG.dashboardQueryKey, state.dashboard);
  window.history.replaceState({}, "", url);
}

export function resetDashboardFilters(dashboardId = state.dashboard) {
  state.categoriesByDashboard.set(dashboardId, new Set(Object.keys(CATEGORIES)));
  state.severitiesByDashboard.set(dashboardId, new Set(Object.keys(SEVERITIES)));
  state.queryByDashboard.set(dashboardId, "");
}
