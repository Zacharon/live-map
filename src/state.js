import { workspaceStorage } from './ui/workspace-storage.js';
import { CONFIG, CATEGORIES, SEVERITIES } from "./config.js";
import { readMapView, writeMapView } from './map/view-state.js';
import { getDashboard } from "./data/dashboards.js";
import { countryByCode } from "./data/countries.js";
import { GROUP_OPTIONS, SORT_OPTIONS } from "./events/feed-organization.js";
import { domainOptions } from "./events/taxonomy.js";
import { safeJsonArray } from "./api/request-validation.js";
import { allowedParam, countryParam, listParam, safeSearchParams, textParam, tokenParam } from "./url-params.js";
import { CHOKEPOINT_STATUSES, CHOKEPOINT_TYPES, chokepointById } from "./data/strategic-chokepoints.js";

const params = safeSearchParams();
const ACTIVE_AREAS = ["explore", "feed", "latest-intelligence", "chokepoints", "countries"];
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

const storedInterfaceMode = workspaceStorage.getItem("live-map-interface-mode-v1");
const storedPreset = workspaceStorage.getItem("live-map-preset-v1");

export const state = {
  mapView: readMapView(params),
  demo: params.get('demo') === 'foundation',
  dataMode: params.get('demo') === 'foundation' ? 'mixed' : allowedParam(params, 'data', ['public', 'demo', 'mixed'], 'public'),
  stressDemo: params.get('demo')==='foundation' && params.get('stress')==='1',
  listPage: 0,
  localPreview: null,
  watchSource: tokenParam(params,'source','',{maxLength:80}) || '',
  watchChangeFilter: allowedParam(params,'changes',['all','new','updated'],'all'),
  activeArea: allowedParam(params, "view", ACTIVE_AREAS, "explore"),
  interfaceMode: INTERFACE_MODES.includes(storedInterfaceMode) ? storedInterfaceMode : "standard",
  leftDrawerOpen: workspaceStorage.getItem("live-map-left-drawer-v1") === "open",
  rightDrawerOpen: allowedParam(params, "view", ACTIVE_AREAS, "explore") === "latest-intelligence" || workspaceStorage.getItem("live-map-right-drawer-v1") !== "closed",
  selectedPreset: storedPreset && /^[a-z0-9][a-z0-9_-]{0,79}$/i.test(storedPreset) ? storedPreset : "explore",
  onboardingComplete: workspaceStorage.getItem("live-map-onboarding-v1") === "done",
  tracking: {
    aircraft: readMapView(params).aircraft,
    vessels: readMapView(params).vessels,
    airports: readMapView(params).airports,
    ports: readMapView(params).ports,
  },
  movingObjects: [],
  movingObjectStatus: {},
  selectedMovingObjectId: tokenParam(params, "aircraft", "", { maxLength: 80 }) || tokenParam(params, "vessel", "", { maxLength: 80 }) || null,
  dashboard: dashboardFromUrl(),
  events: [],
  categoriesByDashboard: new Map(),
  severitiesByDashboard: new Map(),
  queryByDashboard: new Map(),
  hours: [24,72,168,720].includes(Number(params.get('hours'))) ? Number(params.get('hours')) : 168,
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
  mapMode: readMapView(params).mapMode,
  ciiVisible: false,
  selectedEvidenceId: tokenParam(params, "evidence", "", {maxLength:180, pattern:/^[a-z0-9][a-z0-9_.:-]*$/i}) || null,
  selectedEventId: tokenParam(params, "event", "") || null,
  selectedClusterId: null,
  selectedChokepointId: tokenParam(params, "chokepoint", "", { maxLength: 80 }) && chokepointById(params.get("chokepoint")) ? params.get("chokepoint") : null,
  chokepointFilters: {
    query: textParam(params, "chokepointQuery", "", 80),
    region: textParam(params, "chokepointRegion", "", 60),
    type: allowedParam(params, "chokepointType", CHOKEPOINT_TYPES, ""),
    status: allowedParam(params, "chokepointStatus", CHOKEPOINT_STATUSES, ""),
    domain: textParam(params, "chokepointDomain", "", 60),
    sort: allowedParam(params, "chokepointSort", ["priority", "status", "recency", "name"], "priority"),
  },
  chokepointAssessments: [],
  intelligenceEvents: [],
  selectedCountryIso3: countryParam(params, "country", countryByCode) || null,
  sessionAlertHistory: [],
  collapsedGroups: new Set(safeJsonArray(workspaceStorage.getItem("live-map-collapsed-groups-v1"))),
  incidents: [],
  observations: [],
  storylines: [],
  observationSummary: {},
};

export function dashboardFilters(dashboardId = state.dashboard) {
  if (!state.categoriesByDashboard.has(dashboardId)) {
    state.categoriesByDashboard.set(dashboardId, dashboardId === state.dashboard && params.has('categories') ? listParam(params,'categories',Object.keys(CATEGORIES)) : new Set(Object.keys(CATEGORIES)));
  }
  if (!state.severitiesByDashboard.has(dashboardId)) {
    state.severitiesByDashboard.set(dashboardId, dashboardId === state.dashboard && params.has('severities') ? listParam(params,'severities',Object.keys(SEVERITIES)) : new Set(Object.keys(SEVERITIES)));
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
    state.recordKindsByDashboard.set(dashboardId, dashboardId===state.dashboard ? listParam(params,'records',['event','observation','discovery-lead','moving-object']) : new Set());
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
  if (state.selectedChokepointId) url.searchParams.set("chokepoint", state.selectedChokepointId);
  else url.searchParams.delete("chokepoint");
  if (state.selectedEventId) url.searchParams.set("event", state.selectedEventId);
  else url.searchParams.delete("event");
  const chokepointFilters = state.chokepointFilters || {};
  [["chokepointQuery", chokepointFilters.query], ["chokepointRegion", chokepointFilters.region], ["chokepointType", chokepointFilters.type], ["chokepointStatus", chokepointFilters.status], ["chokepointDomain", chokepointFilters.domain], ["chokepointSort", chokepointFilters.sort === "priority" ? "" : chokepointFilters.sort]].forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  });
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
  writeMapView(url.searchParams, { ...state.mapView, ...state.tracking });
  if (state.demo) url.searchParams.set('demo', 'foundation');
  if (state.dataMode === 'public' && !state.demo) url.searchParams.set('data', 'public');
  else if (state.dataMode === 'mixed' || state.demo) url.searchParams.set('data', 'mixed');
  else url.searchParams.delete('data');
  if(state.watchSource)url.searchParams.set('source',state.watchSource);else url.searchParams.delete('source');
  if(state.watchChangeFilter!=='all')url.searchParams.set('changes',state.watchChangeFilter);else url.searchParams.delete('changes');
  url.searchParams.set('hours',String(state.hours));
  url.searchParams.set('categories',[...filters.categories].join(','));
  url.searchParams.set('severities',[...filters.severities].join(','));
  url.searchParams.set('records',[...filters.recordKinds].join(','));
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
