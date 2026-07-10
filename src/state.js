import { CONFIG, CATEGORIES, SEVERITIES } from "./config.js";
import { getDashboard } from "./data/dashboards.js";
import { countryByCode } from "./data/countries.js";
import { GROUP_OPTIONS, SORT_OPTIONS } from "./events/feed-organization.js";
import { domainOptions } from "./events/taxonomy.js";
import { safeJsonArray } from "./api/request-validation.js";
import { allowedParam, countryParam, listParam, safeSearchParams, textParam, tokenParam } from "./url-params.js";

const params = safeSearchParams();
const ACTIVE_AREAS = ["explore", "feed", "countries"];
const CARD_MODES = ["compact", "expanded"];
const TRACKING_MODES = ["aircraft", "vessels"];
const SORT_IDS = SORT_OPTIONS.map(([value]) => value);
const GROUP_IDS = GROUP_OPTIONS.map(([value]) => value);
const DOMAIN_IDS = domainOptions().map((domain) => domain.id);
const INTERFACE_MODES = ["standard", "advanced"];

function dashboardFromUrl() {
  return getDashboard(params.get(CONFIG.dashboardQueryKey) || CONFIG.defaultDashboard).id;
}

function urlValue(key, fallback) {
  return textParam(params, key, fallback);
}

function urlList(key) {
  return listParam(params, key, DOMAIN_IDS);
}

const storedInterfaceMode = localStorage.getItem("live-map-interface-mode-v1");
const storedPreset = localStorage.getItem("live-map-preset-v1");

export const state = {
  activeArea: allowedParam(params, "view", ACTIVE_AREAS, "explore"),
  interfaceMode: INTERFACE_MODES.includes(storedInterfaceMode) ? storedInterfaceMode : "standard",
  leftDrawerOpen: localStorage.getItem("live-map-left-drawer-v1") === "open",
  rightDrawerOpen: localStorage.getItem("live-map-right-drawer-v1") !== "closed",
  selectedPreset: storedPreset && /^[a-z0-9][a-z0-9_-]{0,79}$/i.test(storedPreset) ? storedPreset : "explore",
  onboardingComplete: localStorage.getItem("live-map-onboarding-v1") === "done",
  tracking: {
    aircraft: allowedParam(params, "tracking", TRACKING_MODES, "") === "aircraft",
    vessels: allowedParam(params, "tracking", TRACKING_MODES, "") === "vessels",
    airports: false,
    ports: false,
  },
  movingObjects: [],
  movingObjectStatus: {},
  selectedMovingObjectId: tokenParam(params, "aircraft", "", { maxLength: 80 }) || tokenParam(params, "vessel", "", { maxLength: 80 }) || null,
  dashboard: dashboardFromUrl(),
  events: [],
  categoriesByDashboard: new Map(),
  severitiesByDashboard: new Map(),
  queryByDashboard: new Map(),
  hours: 168,
  sort: allowedParam(params, "sort", SORT_IDS, "highest-severity"),
  groupBy: allowedParam(params, "group", GROUP_IDS, "domain"),
  cardMode: allowedParam(params, "cards", CARD_MODES, "compact"),
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
  selectedClusterId: null,
  selectedCountryIso3: countryParam(params, "country", countryByCode) || null,
  sessionAlertHistory: [],
  collapsedGroups: new Set(safeJsonArray(localStorage.getItem("live-map-collapsed-groups-v1"))),
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
