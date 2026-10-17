import {renderWatchOperator,filterWatchEvents} from './ui/watch-operator.js';
import { renderWatchEventCard, renderWorkspaceSummary, workspaceWindowEnd, renderLensGuide } from './ui/watch-workspace.js';
import { normalizeVerificationStatus } from './events/event-quality.js';
import { workspaceStorage } from './ui/workspace-storage.js';
import { nearbyContacts, renderContactRoster, renderContactDetail } from './map/contact-roster.js';
import { CONFIG, CATEGORIES, SEVERITIES } from "./config.js";
import { selectMapEvents, selectMovingObjects, inViewport, wrapLongitude } from './map/attention-policy.js';
import { validateMapView } from './map/view-state.js';
import { validateBbox } from './moving-objects/schema.js';
import { DASHBOARDS, getDashboard } from "./data/dashboards.js";
import { LAYER_CATALOG, layersForDashboard } from "./data/layers.js";
import { EXCHANGES } from "./data/exchanges.js";
import { COUNTRIES, countryByCode, countryForEvent, countryFlag } from "./data/countries.js";
import { AIRPORTS } from "./data/airports.js";
import { PORTS } from "./data/ports.js";
import { STRATEGIC_CHOKEPOINTS, CHOKEPOINT_TYPES, CHOKEPOINT_STATUSES, chokepointById } from "./data/strategic-chokepoints.js";
import { state, dashboardFilters, resetDashboardFilters, setDashboard, syncUrlState } from "./state.js";
import { normalizeEvent, escapeHtml, relativeTime } from "./events/event-normalizer.js";
import { filteredEvents } from "./events/event-filters.js";
import { domainOptions } from "./events/taxonomy.js";
import { GROUP_OPTIONS, SORT_OPTIONS, groupEvents } from "./events/feed-organization.js";
import { annotateIncidents } from "./events/incident-clustering.js";
import { correlateEventsToMarkets } from "./events/event-correlation.js";
import { correlateEventsToChokepoints, enrichEventsWithChokepoints } from "./intelligence/chokepoint-correlation.js";
import { assessChokepoints } from "./intelligence/chokepoint-condition.js";
import { computeCountryRiskScores } from "./risk/country-risk.js";
import { exchangeMarkers } from "./finance/finance-adapter.js";
import { loadAlertRules, saveAlertRules, createLocalRule, validateAlertRule, previewAlerts } from "./alerts/alert-rules.js";
import { createMapController } from "./map/map-controller.js";
import { renderMarkers } from "./map/marker-renderer.js";
import { renderClusterHighlight, fitClusterOnMap } from "./map/cluster-highlight.js";
import { setGlobeMode, getGlobeHandle } from "./map/globe-controller.js";
import { bandFromZoom } from "./map/semantic-bands.js";
import { graphNodeFromRecord, graphEdgeFromRelationship, neighborhood } from "./intelligence/knowledge-graph.js";
import { syntheticChokepointRecords, syntheticScenarioEvents, SYNTHETIC_CHOKEPOINT_ID, SCENARIO_STAGES } from "./data/fixtures/synthetic-chokepoint-scenario.js";
import { SHIPPING_DENSITY_META } from "./data/maritime-overlays.js";
import { activityUiLabel, densityUiLabel, ORBITAL_MODULE_ONLY, recordedWindUiLabel, SYNTHETIC_WIND } from "./map/overlay-labels.js";
import { renderWatchDock } from "./ui/watch-dock.js";
import { renderSourceHealth } from "./ui/source-health.js";
import { renderSourcesStatusPanel, emptyDomainMessage } from "./ui/sources-status-panel.js";
import { loadSavedViews, saveView, serializeView } from "./ui/saved-views.js";
import { openEventDialog, openMethodologyDialog } from "./ui/dialogs.js";
import { renderDashboardPanel, applyDashboardTitle } from "./dashboards/dashboard-renderer.js";
import { CONSUMER_PRESETS, PRESET_ORDER, presetById, severitySetFromMinimum } from "./consumer/presets.js";
import { buildGlobalSearchResults, groupSearchResults } from "./search/global-search.js";
import { renderOsintDashboardShell, renderOsintEventDetailDrawer } from "./ui/osint-dashboard-v2/shell.js";
import { buildEventClusters, clusterMemberIds, findClusterById } from "./events/clustering.js";
import {
  loadSnapshotWithMeta,
  buildSnapshotFromEvents,
  computeChangeSummary,
  buildChangeStatusMap,
  saveSnapshot,
} from "./events/change-awareness.js";
import { buildEventArtifact, buildClusterArtifact } from "./artifacts/event-artifacts.js";
import { runArtifactExportAction } from "./ui/osint-dashboard-v2/artifact-export.js";
import { filterChokepoints, renderChokepointCards, renderChokepointDetail, renderStrategicWatch } from "./ui/chokepoints.js";
import { indexItemsByChokepoint, renderChokepointBriefList } from "./ui/chokepoint-brief.js";
import { renderLatestIntelligence } from "./ui/latest-intelligence.js";
import { renderInvestigationWorkbench, workbenchFilename } from "./ui/investigation-workbench.js";
import { applyEvidenceMutation, createInvestigationCase, reviewAssessment, SYNTHETIC_NOW } from "./intelligence/investigation-cycle.js";
import { parseCaseFile, serializeCase } from "./intelligence/case-io.js";
import {isAviationCase, AVIATION_CASE_ID} from './intelligence/aviation-incident.js';
import { projectPublicAssessment, renderPublicMarkdown } from "./intelligence/public-projection.js";

function ids(names) {
  return Object.fromEntries(names.map((id) => [id, document.getElementById(id)]));
}

const EVENT_CACHE_KEY = "live-map-last-successful-events-v2";
let densityGridCache = null;
const RETRY_BASE_MS = 30000;
const RETRY_CAP_MS = 5 * 60 * 1000;

function classifyFetchError(error) {
  if (!navigator.onLine) return "browser-offline";
  if (error?.name === "AbortError") return "timeout";
  const message = String(error?.message || "");
  if (/JSON|Unexpected token/i.test(message)) return "non-json-response";
  if (/API 5|Function/i.test(message)) return "event-api-unavailable";
  if (/Failed to fetch|NetworkError|ERR_NAME_NOT_RESOLVED|Name not resolved|Load failed/i.test(message)) return "dns-network-failure";
  if (/API [4-5]\d\d/i.test(message)) return "http-error";
  return "request-failure";
}

function safeFailureMessage(kind) {
  switch (kind) {
    case "browser-offline":
      return "Browser appears offline. Event data temporarily unavailable.";
    case "timeout":
      return "Event data request timed out. Existing map and filters are still usable.";
    case "non-json-response":
      return "Event API returned a non-JSON response.";
    case "event-api-unavailable":
      return "Event API unavailable. Event data temporarily unavailable.";
    case "dns-network-failure":
      return "DNS or network request failed. Event data temporarily unavailable.";
    case "http-error":
      return "Event API returned an HTTP error.";
    default:
      return "Event data temporarily unavailable.";
  }
}

function readEventCache() {
  try {
    return JSON.parse(workspaceStorage.getItem(EVENT_CACHE_KEY) || "null");
  } catch {
    return null;
  }
}

function writeEventCache(result) {
  try {
    workspaceStorage.setItem(EVENT_CACHE_KEY, JSON.stringify({
      localPreview: result.localPreview || null,
      events: result.events || [],
      generatedAt: result.generatedAt || Date.now(),
      sources: result.sources || [],
      sourceStatus: result.sourceStatus || {},
      providerResults: result.providerResults || [],
      systemStatus: result.systemStatus || "cached",
      domainSourceStatus: result.domainSourceStatus || {},
      cachedAt: Date.now(),
    }));
  } catch {
    // Local storage is best-effort; the app must still work without it.
  }
}

/** Change statuses belong to the workspace; the card renderer receives values. */
let activeChangeStatusById = new Map();
function renderEventCard(event) {
  return renderWatchEventCard(event, { cardMode: state.cardMode, selectedEventId: state.selectedEventId, changeStatus: activeChangeStatusById.get(event.id) });
}
function updateFeedMarkup(container, markup) {
  if (container.dataset.renderedMarkup === markup) return;
  const focused = container.contains(document.activeElement) ? document.activeElement : null;
  const focusAttribute = ['data-watch-source','data-watch-changes','data-v2-mark-seen','data-event-detail','data-evidence-back','data-evidence-select','data-investigate-tab','data-investigate-close'].find(name => focused?.hasAttribute(name));
  const focusValue = focusAttribute ? focused.getAttribute(focusAttribute) : null;
  container.innerHTML = markup;
  container.dataset.renderedMarkup = markup;
  if (focusAttribute) container.querySelector(`button[${focusAttribute}="${CSS.escape(focusValue)}"]`)?.focus({ preventScroll: true });
}
function renderList(els, events) {
  if (state.activeArea === "chokepoints") {
    const chokepoints = filterChokepoints(STRATEGIC_CHOKEPOINTS, state.chokepointAssessments, state.chokepointFilters);
    const hours = Number(state.hours || 168);
    const end = Date.now();
    const start = end - hours * 3600 * 1000;
    const index = indexItemsByChokepoint(chokepoints, events, state.chokepointCorrelations || [], state.observationRecords || [], { start, end });
    updateFeedMarkup(els.eventList, renderChokepointBriefList(chokepoints, state.chokepointAssessments, index, state.selectedChokepointId, { expandedId: state.expandedChokepointId }));
    return;
  }
  if (state.activeArea === "latest-intelligence") {
    updateFeedMarkup(els.eventList, renderLatestIntelligence(state.storylines, state.observations));
    return;
  }
  if (!events.length) {
    const filters = dashboardFilters();
    const selectedDomain = filters.domains.size === 1 ? [...filters.domains][0] : null;
    const message = selectedDomain ? emptyDomainMessage(selectedDomain, state.events, true, state.sourceStatus) : "No events match the selected filters and time range.";
    updateFeedMarkup(els.eventList, `<div class="empty">${escapeHtml(message)}</div>`);
    return;
  }
  const pageCount = Math.ceil(events.length / 60);
  state.listPage = Math.min(state.listPage, pageCount - 1);
  const groups = groupEvents(events.slice(state.listPage*60,(state.listPage+1)*60), state.groupBy, state.sourceStatus);
  const markup = groups.map((group) => {
    const collapsed = state.collapsedGroups.has(group.id);
    const warning = group.stats.providerWarning ? '<span class="group-warning">provider warning</span>' : "";
    return `<section class="event-group"><button class="group-header" type="button" data-group-toggle="${escapeHtml(group.id)}"><span>${collapsed ? "+" : "-"}</span><strong>${escapeHtml(group.label)}</strong><small>${group.stats.total} events / ${group.stats.highCount} high / ${group.stats.newCount} new / updated ${group.stats.newestUpdate}</small>${warning}</button><div class="group-body" ${collapsed ? "hidden" : ""}>${group.events.slice(0, 80).map(renderEventCard).join("")}${group.events.length > 80 ? `<div class="empty">${group.events.length - 80} more events hidden for performance.</div>` : ""}</div></section>`;
  }).join("");
  updateFeedMarkup(els.eventList, markup + `<div class="list-pagination"><button data-list-page="prev" ${state.listPage===0?'disabled':''}>Previous</button><span>${state.listPage+1} / ${pageCount} · ${events.length} records</span><button data-list-page="next" ${state.listPage===pageCount-1?'disabled':''}>Next</button></div>`);
}

function renderFilters(els) {
  const filters = dashboardFilters();
  els.domainFilters.innerHTML = domainOptions().map((domain) => `<button class="filter-item ${filters.domains.has(domain.id) ? "active" : ""}" title="Domains organize events by intelligence category." style="--category:${domain.defaultColor}" data-domain="${domain.id}"><span><i class="dot"></i>${domain.label}</span><b>${state.events.filter((event) => event.domain === domain.id).length}</b></button>`).join("");
  els.layerFilters.innerHTML = Object.entries(CATEGORIES).map(([key, category]) => `<button class="filter-item ${filters.categories.has(key) ? "active" : ""}" title="Layers control which concrete event types appear on the map." style="--category:${category.color}" data-category="${key}"><span><i class="dot"></i>${category.label}</span><b>${state.events.filter((event) => event.category === key).length}</b></button>`).join("");
  els.severityFilters.innerHTML = Object.entries(SEVERITIES).map(([key, severity]) => `<button class="severity-btn ${filters.severities.has(key) ? "active" : ""}" style="--sev:${severity.color}" data-severity="${key}">${severity.label}</button>`).join("");
  const activeDomains = domainOptions().filter((domain) => state.events.some((event) => event.domain === domain.id));
  const layerQuery = document.getElementById('layerSearch')?.value.toLowerCase() || '';
  els.layerFilters.querySelectorAll('button').forEach(button=>{button.hidden=!button.textContent.toLowerCase().includes(layerQuery); button.setAttribute('aria-pressed',String(button.classList.contains('active')));const records=state.events.filter(e=>e.category===button.dataset.category);button.title=records.length ? `${records.length} reports. Sources: ${[...new Set(records.map(e=>e.sourceName))].join(', ')}. Latest event ${relativeTime(Math.max(...records.map(e=>e.occurredAt)))}` : 'No available reports. Check Sources for coverage and provider access.';});
  const recordLegend = state.events.some((event) => (event.recordKind || "event") !== "event")
    ? '<div class="legend-row"><i class="dot record-dot"></i>Lead / observation</div>'
    : "";
  const chokepointLegend =
    state.activeArea === "chokepoints" || document.body.classList.contains("view-chokepoints")
      ? '<div class="legend-row legend-row-chokepoint"><i class="dot chokepoint-legend-dot"></i>Chokepoint condition</div><div class="legend-row legend-hint">Infrastructure context · not control</div>'
      : "";
  const domainRows = activeDomains
    .slice(0, 6)
    .map((domain) => `<div class="legend-row"><i class="dot" style="--category:${domain.defaultColor}"></i>${domain.label}</div>`)
    .join("");
  const more = activeDomains.length > 6 ? `<div class="legend-row legend-hint">+${activeDomains.length - 6} domains in filters</div>` : "";
  els.mapLegend.innerHTML = `${domainRows}${more}${recordLegend}${chokepointLegend}`;
}

function renderMapHealth(element, health) {
  if (!element || !health) return;
  if (document.getElementById("map")?.hidden) {
    element.hidden = true;
    return;
  }
  const show = ["degraded", "unavailable"].includes(health.tileStatus) || health.containerWidth <= 0 || health.containerHeight <= 0;
  element.hidden = !show;
  if (!show) return;
  element.innerHTML = `<strong>Map ${escapeHtml(health.tileStatus)}</strong><p>${escapeHtml(health.safeMessage)}</p><div><button type="button" data-basemap-switch="dark">Use offline dark</button><button type="button" data-basemap-switch="dark-online">Retry online dark tiles</button><button type="button" data-basemap-switch="street">Switch to Street Map</button></div>`;
}

function renderFeedError(element) {
  if (!element) return;
  if (!state.apiFailure) {
    element.hidden = true;
    element.innerHTML = "";
    return;
  }
  const cached = state.lastLoaded ? `Last successful refresh ${new Date(state.lastLoaded).toLocaleString()}.` : "No cached refresh is available yet.";
  const retry = state.nextRetryAt ? `Next automatic retry ${relativeTime(state.nextRetryAt)}.` : "Automatic retry is paused.";
  element.hidden = false;
  element.innerHTML = `<strong>Event data temporarily unavailable</strong><p>${escapeHtml(state.apiFailure.message)} ${escapeHtml(cached)} ${escapeHtml(retry)}</p><button type="button" data-provider-retry>Retry now</button>`;
}

function updateCountDebug(events) {
  state.visibleMapEvents = events.length;
  state.countDebug = {
    rawProviderEvents: state.providerResults.reduce((sum, result) => sum + (result.recordCount || 0), 0),
    acceptedProviderEvents: state.providerResults.reduce((sum, result) => sum + (result.events?.length || result.acceptedCount || 0), 0),
    canonicalEvents: state.events.length,
    deduplicatedEvents: state.events.length,
    timeWindowEvents: state.events.length,
    filteredEvents: events.length,
    visibleMapEvents: events.length,
  };
}

function renderCountDebug() {
  if (new URLSearchParams(window.location.search).get("diagnostics") !== "counts") return "";
  return `<section class="method-note count-debug"><strong>Count debug</strong><pre>${escapeHtml(JSON.stringify(state.countDebug, null, 2))}</pre></section>`;
}

function updateSourcesLink(element) {
  const params = new URLSearchParams();
  params.set("dashboard", state.dashboard);
  params.set("sort", state.sort);
  params.set("group", state.groupBy);
  params.set("cards", state.cardMode);
  const href = `/sources?${params.toString()}`;
  if (element) element.href = href;
  document.querySelectorAll("[data-sources-link]").forEach((link) => {
    link.href = href;
  });
}

function renderStats(els, events) {
  els.visibleCount.textContent = events.length;
  els.highCount.textContent = events.filter((event) => ["critical", "high"].includes(event.severity)).length;
  els.countryCount.textContent = new Set(events.map((event) => event.country).filter(Boolean)).size;
  els.updatedAt.textContent = state.lastLoaded ? new Date(state.lastLoaded).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "-";
  els.feedAge.textContent = state.lastLoaded ? `Feed ${relativeTime(state.lastLoaded)}` : "-";
}

function renderLayerSummary(layers) {
  const implemented = layers.filter((layer) => layer.implemented).length;
  const credentialed = layers.filter((layer) => layer.credentialRequired).length;
  return `<div class="layer-summary"><span>${layers.length} dashboard layers</span><span>${implemented} implemented</span><span>${credentialed} need credentials</span></div>`;
}

function updateCountriesLink(element) {
  if (!element) return;
  const params = new URLSearchParams();
  if (state.selectedCountryIso3) params.set("country", state.selectedCountryIso3);
  element.href = `/countries${params.toString() ? `?${params}` : ""}`;
}

function renderPublicDataStatus() {
  if(state.demo) return '<strong>Synthetic demo</strong><p>Invented scenarios for interface testing. No live event or tracking providers are queried. 2D uses no remote basemap; 3D uses vendored Natural Earth II.</p>';
  const statuses = Object.values(state.sourceStatus || {});
  const available = statuses.filter((status) => status.ok).length;
  const stale = statuses.filter((status) => status.stale || status.status === "degraded").length;
  const disabled = statuses.filter((status) => status.status === "disabled" || status.status === "configuration-required").length;
  const unavailable = statuses.filter((status) => !status.ok && !["disabled", "configuration-required"].includes(status.status)).length;
  const label = state.systemStatus === "operational" ? "Operational" : state.systemStatus === "partial-data" ? "Some data delayed" : state.systemStatus === "major-provider-outage" ? "Offline" : "Some data delayed";
  const tools = state.interfaceMode === "advanced" ? '<p><a href="/diagnostics">Technical diagnostics</a></p>' : "";
  return `<strong>Public data status</strong><p>${escapeHtml(label)}. Last refreshed ${state.lastLoaded ? escapeHtml(relativeTime(state.lastLoaded)) : "never"}. ${available} retrieved, ${stale} degraded, ${unavailable} unavailable, ${disabled} disabled or credential-gated.</p><p>Public data only. May be delayed or incomplete. Verify with original sources; not for emergency or professional decisions.</p>${tools}`;
}

function renderRiskTable(scores) {
  return `<div class="risk-table">${scores.slice(0, 8).map((score) => `<button class="risk-row" type="button" data-country-select="${escapeHtml(score.iso3)}" title="${escapeHtml(score.limitations.join(" "))}"><span>${escapeHtml(score.countryName)}</span><strong style="color:${score.color}">${score.score}</strong><small>${score.levelLabel} / ${score.confidence}%</small></button>`).join("")}</div>`;
}

function renderCountrySummary(scores, events) {
  const country = state.selectedCountryIso3 ? countryByCode(state.selectedCountryIso3) : null;
  if (!country) return "";
  const score = scores.find((item) => item.iso3 === country.iso3);
  const countryEvents = events.filter((event) => countryForEvent(event)?.iso3 === country.iso3);
  const newest = countryEvents.reduce((max, event) => Math.max(max, Number(event.updatedAt || event.occurredAt || 0)), 0);
  const domains = countryEvents.reduce((acc, event) => {
    const key = event.domainLabel || event.domain || "Other";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const domainText = Object.entries(domains).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([key, count]) => `${key}: ${count}`).join(", ") || "No current events";
  const factors = (score?.topFactors || []).map((factor) => `<li>${escapeHtml(factor.id)}: ${escapeHtml(factor.contribution)} pts</li>`).join("");
  return `<article class="country-summary-card">
    <div class="section-title"><span>${escapeHtml(countryFlag(country))} ${escapeHtml(country.name)}</span><button type="button" data-country-clear>Clear</button></div>
    <div class="mini-grid"><span>Country Risk Score ${escapeHtml(score?.score ?? "-")}</span><span>${escapeHtml(score?.levelLabel || "Unknown")}</span><span>${escapeHtml(score?.confidence ?? 0)}% confidence</span><span>${escapeHtml(score?.completeness ?? 0)}% complete</span></div>
    <p>${escapeHtml(country.region)} / ${escapeHtml(country.subregion)}. Active events: ${countryEvents.length}. Domains: ${escapeHtml(domainText)}. Freshness: ${newest ? escapeHtml(relativeTime(newest)) : "no recent event"}.</p>
    <ul class="factor-list">${factors}</ul>
    <div class="dialog-actions"><button type="button" data-country-events="${escapeHtml(country.iso3)}">View Country Events</button><a class="source-link secondary" href="/countries?country=${escapeHtml(country.iso3)}">Open Country Scores</a></div>
  </article>`;
}

function applyPreset(presetId, renderAfter = true) {
  const preset = presetById(presetId);
  state.selectedPreset = preset.id;
  state.spaceLens = false;
  state.dashboard = preset.dashboard;
  state.activeArea = preset.activeArea || "explore";
  state.selectedChokepointId = preset.chokepointId || null;
  if (preset.chokepointFilters) state.chokepointFilters = { ...state.chokepointFilters, ...preset.chokepointFilters };
  state.hours = preset.timeWindow;
  state.tracking.aircraft = Boolean(preset.aviationEnabled);
  state.tracking.vessels = Boolean(preset.maritimeEnabled);
  state.tracking.ports = preset.id === 'ships';
  state.tracking.airports = preset.id === 'flights';
  state.mapView.chokepoints = preset.id === 'ships' || preset.activeArea === 'chokepoints';
  state.listPage = 0;
  state.selectedEventId = null;
  state.selectedClusterId = null;
  const filters = dashboardFilters(state.dashboard);
  filters.domains = state.domainsByDashboard.get(state.dashboard);
  filters.domains.clear();
  preset.domains.forEach((domain) => filters.domains.add(domain));
  filters.categories.clear();
  const categories = preset.layers.length ? preset.layers : Object.keys(CATEGORIES);
  categories.forEach((category) => filters.categories.add(category));
  state.severitiesByDashboard.set(state.dashboard, severitySetFromMinimum(SEVERITIES, preset.minimumSeverity));
  if (!state.recordKindsByDashboard) state.recordKindsByDashboard = new Map();
  state.recordKindsByDashboard.set(state.dashboard, new Set(preset.recordKinds));
  workspaceStorage.setItem("live-map-preset-v1", preset.id);
  syncUrlState();
  if (renderAfter) window.dispatchEvent(new CustomEvent("live-map-render-request"));
}

function standardEventVisible(event) {
  if (state.interfaceMode === "advanced") return true;
  const recordKind = event.recordKind || "event";
  if (recordKind === "discovery-lead" || recordKind === "observation") return false;
  const verification = String(event.verificationStatus || event.verification?.state || "").toLowerCase();
  if (verification.includes("unverified") || verification.includes("retracted")) return false;
  return true;
}

function renderPresetList() {
  return PRESET_ORDER.map((id) => {
    const preset = CONSUMER_PRESETS[id];
    return `<button type="button" class="preset-chip ${state.selectedPreset === id ? "active" : ""}" data-preset="${escapeHtml(id)}">${escapeHtml(preset.label)}</button>`;
  }).join("");
}

function renderTrackingStatus() {
  if(state.demo) return 'Synthetic aircraft and vessel observations. Local scale only; dim positions are stale. No provider requests.';
  const statuses = state.movingObjectStatus || {};
  const describe=(key,label,type)=>{const s=statuses[key];if(!s)return `${label}: configuration not confirmed`;if(s.ok)return `${label}: ${state.movingObjects.filter(o=>o.objectType===type).length} observations in view`;return `${label}: ${String(s.status || 'unavailable').replaceAll('-',' ')}`;};
  const aircraft = describe('opensky','Aircraft','aircraft');
  const vessels = describe('global-fishing-watch','Vessels','vessel');
  if (state.tracking.aircraft || state.tracking.vessels) return `${aircraft}. ${vessels}.`;
  return "Zoom in to view aircraft or vessel activity.";
}

/**
 * View context for left-drawer sections.
 * Only sections relevant to the active main tab remain visible.
 */
function viewContextForArea(area) {
  if (area === "chokepoints") {
    return {
      showOsintSummary: true,
      showPresets: true,
      showChokepoints: true,
      showTracking: false,
      showDomains: false,
      showLayers: false,
      showSeverity: false,
      showStats: true,
      showSourceNotes: false,
      showCountrySummary: false,
      showDashboardExtras: true,
    };
  }
  if (area === "latest-intelligence") {
    return {
      showOsintSummary: true,
      showPresets: false,
      showChokepoints: false,
      showTracking: false,
      showDomains: true,
      showLayers: false,
      showSeverity: false,
      showStats: true,
      showSourceNotes: true,
      showCountrySummary: false,
      showDashboardExtras: true,
    };
  }
  // explore + feed (default operator workspace)
  return {
    showOsintSummary: true,
    showPresets: true,
    showChokepoints: false,
    showTracking: true,
    showDomains: true,
    showLayers: true,
    showSeverity: true,
    showStats: true,
    showSourceNotes: true,
    showCountrySummary: true,
    showDashboardExtras: true,
  };
}

function setSectionVisible(element, visible) {
  if (!element) return;
  element.hidden = !visible;
  element.classList.toggle("view-section-hidden", !visible);
}

function applyShellState(els) {
  const area = state.activeArea || "explore";
  const ctx = viewContextForArea(area);
  document.body.dataset.activeArea = area;
  document.body.classList.toggle("advanced-mode", state.interfaceMode === "advanced");
  document.body.classList.toggle("standard-mode", state.interfaceMode !== "advanced");
  document.body.classList.toggle("left-drawer-open", state.leftDrawerOpen);
  document.body.classList.toggle("right-drawer-open", state.rightDrawerOpen);
  document.body.classList.toggle("view-chokepoints", area === "chokepoints");
  document.body.classList.toggle("view-latest-intelligence", area === "latest-intelligence");
  document.body.classList.toggle("view-feed", area === "feed" || area === "explore");
  els.filterDrawer?.classList.toggle("open", state.leftDrawerOpen);
  els.eventDrawer?.classList.toggle("open", state.rightDrawerOpen);
  document.body.dataset.mobileView = state.mobilePane || 'map';
  const narrow = window.matchMedia('(max-width:900px)').matches;
  if (els.eventDrawer) els.eventDrawer.inert = !state.rightDrawerOpen || (narrow && (state.mobilePane === 'map' || state.leftDrawerOpen));
  if (els.filterDrawer) els.filterDrawer.inert = !state.leftDrawerOpen;
  const mapStage = document.querySelector('.map-stage');
  if (mapStage) mapStage.inert = narrow && (state.mobilePane === 'feed' || state.leftDrawerOpen);
  document.querySelectorAll('[data-mobile-pane]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.mobilePane === state.mobilePane)));
  document.querySelector('[data-space-lens]')?.setAttribute('aria-pressed',String(Boolean(state.spaceLens)));
  document.querySelectorAll('[data-preset]').forEach(button => button.setAttribute('aria-pressed',String(!state.spaceLens && button.dataset.preset===state.selectedPreset)));
  renderLensGuide(document.getElementById('lensGuide'), state);
  if (els.advancedMode) els.advancedMode.checked = state.interfaceMode === "advanced";
  if (els.aircraftToggle) els.aircraftToggle.checked = state.tracking.aircraft;
  if (els.vesselToggle) els.vesselToggle.checked = state.tracking.vessels;
  if (els.airportsToggle) els.airportsToggle.checked = state.tracking.airports;
  if (els.portsToggle) els.portsToggle.checked = state.tracking.ports;
  if (els.trackingStatus) els.trackingStatus.textContent = renderTrackingStatus();

  // Left-drawer context switch (critical: chokepoints must not stick open)
  setSectionVisible(els.osintDashboardV2, ctx.showOsintSummary);
  setSectionVisible(els.presetList?.closest("section"), ctx.showPresets);
  setSectionVisible(els.chokepointControls, ctx.showChokepoints);
  setSectionVisible(els.aircraftToggle?.closest(".tracking-panel") || els.aircraftToggle?.closest("section"), ctx.showTracking);
  setSectionVisible(els.domainFilters?.closest("section"), ctx.showDomains);
  setSectionVisible(els.layerFilters?.closest("section"), ctx.showLayers);
  setSectionVisible(els.severityFilters?.closest("section"), ctx.showSeverity);
  setSectionVisible(els.visibleCount?.closest(".stats-grid") || els.visibleCount?.closest("section"), ctx.showStats);
  setSectionVisible(els.sourcesStatusPanel, ctx.showSourceNotes);
  setSectionVisible(els.sourceHealth?.closest("section"), ctx.showSourceNotes);
  setSectionVisible(els.publicDataStatus, ctx.showSourceNotes);
  document.querySelectorAll("[data-view-section='method-note']").forEach((node) => setSectionVisible(node, ctx.showSourceNotes));
  setSectionVisible(els.countrySummaryPanel, ctx.showCountrySummary && Boolean(state.selectedCountryIso3));
  setSectionVisible(els.dashboardPanel, ctx.showDashboardExtras);

  if (els.chokepointSearch) els.chokepointSearch.value = state.chokepointFilters.query || "";
  if (els.chokepointRegion) els.chokepointRegion.value = state.chokepointFilters.region || "";
  if (els.chokepointType) els.chokepointType.value = state.chokepointFilters.type || "";
  if (els.chokepointStatus) els.chokepointStatus.value = state.chokepointFilters.status || "";
  if (els.chokepointDomain) els.chokepointDomain.value = state.chokepointFilters.domain || "";
  if (els.chokepointSort) els.chokepointSort.value = state.chokepointFilters.sort || "priority";

  const leftTitle = document.getElementById("leftPanelTitle");
  if (leftTitle) {
    leftTitle.textContent = area === "chokepoints"
      ? "Chokepoint tools"
      : area === "latest-intelligence"
        ? "Open-web tools"
        : area === "feed"
          ? "Feed filters"
          : "Workspace filters";
  }
}

function bboxParam(mapController) {
  const bbox = mapController.currentBbox();
  return [bbox.south, bbox.west, bbox.north, bbox.east].map((value) => value.toFixed(4)).join(",");
}

function renderAlerts(events) {
  const rules = loadAlertRules();
  if (!rules.length) {
    const starter = createLocalRule({ name: "High earthquake preview", category: "earthquake", severity: "high" });
    const validation = validateAlertRule(starter);
    if (validation.valid) saveAlertRules([starter]);
  }
  const activeRules = loadAlertRules();
  const previews = previewAlerts(activeRules, events);
  state.sessionAlertHistory = previews;
  return `<div class="alert-preview"><strong>Local alert preview</strong><p>${activeRules.length} browser-stored rule(s), ${previews.length} current preview trigger(s). No external notifications are sent.</p></div>`;
}

export function bootLiveMap() {
  document.body.dataset.liveMapBoot = "started";
  const els = ids(["dashboardNav", "domainFilters", "layerFilters", "severityFilters", "eventList", "visibleCount", "highCount", "countryCount", "updatedAt", "search", "globalSearch", "globalSearchResults", "clearDomains", "clearFilters", "timeWindow", "sortOrder", "groupBy", "cardMode", "savedViews", "saveView", "fitWorld", "fitEvents", "themeToggle", "eventDialog", "dialogContent", "closeDialog", "methodologyDialog", "methodologyContent", "closeMethodology", "onboardingDialog", "mapLegend", "systemStatus", "feedAge", "baseMap", "refreshNow", "sourceHealth", "publicDataStatus", "countrySummaryPanel", "sourcesStatusPanel", "dashboardPanel", "dashboardEyebrow", "dashboardTitle", "mapMode", "mapHealth", "feedError", "ciiToggle", "sourcesLink", "filterDrawer", "eventDrawer", "presetList", "advancedMode", "aircraftToggle", "vesselToggle", "airportsToggle", "portsToggle", "trackingStatus", "mapListToggle", "locateMap", "resetWorkspace", "osintDashboardV2", "eventDetailDrawer", "chokepointDetailDrawer", "dataMode", "chokepointControls", "chokepointSearch", "chokepointRegion", "chokepointType", "chokepointStatus", "chokepointDomain", "chokepointSort", "resetChokepointFilters"]);
  const startupQuery = new URLSearchParams(window.location.search);
  const investigation = {
    open: startupQuery.get("workbench") === "1" || startupQuery.get("investigate") === "1",
    tab: "evidence",
    caseObject: null,
    mode: startupQuery.get('case') === AVIATION_CASE_ID ? 'aviation' : startupQuery.get("case") === "synthetic-hormuz-2026-06" ? "synthetic" : "genuine",
    selectionNotice: null,
  };
  const mapController = createMapController({ view: { ...state.mapView, basemap: state.mapView.basemap || "street" }, onHealthChange: (health) => { state.mapHealth = health; renderMapHealth(els.mapHealth, health); } });
  els.baseMap.value = state.mapView.basemap;
  let refreshTimer = null;
  let eventRequestGeneration=0,eventRequestController=null;
  let changeTimer = null;
  let changeCursor = null;
  let retryAttempts = 0;
  let derivedEvents = null, derivedIntelligence = null, derivedRisk = null, derivedAsOf = null;

  function activeViewport() {
    const globe = state.mapMode !== "2d" && getGlobeHandle()?.ok ? getGlobeHandle() : null;
    return globe
      ? { bbox: globe.currentBbox?.(), zoom: globe.currentTarget?.().zoom ?? mapController.map.getZoom() }
      : { bbox: mapController.currentBbox(), zoom: mapController.map.getZoom() };
  }

  function currentEvents(sourceEvents = state.intelligenceEvents.length ? state.intelligenceEvents : state.events) {
    const filters = dashboardFilters();
    const dashboard = getDashboard(state.dashboard);
    const source = state.dashboard === "finance" ? [...sourceEvents, ...exchangeMarkers().map(normalizeEvent)] : sourceEvents;
    const byDashboard = source.filter((event) => dashboard.categories.includes(event.category) || state.dashboard === "primary");
    const byCountry = state.selectedCountryIso3 ? byDashboard.filter((event) => countryForEvent(event)?.iso3 === state.selectedCountryIso3) : byDashboard;
    const viewport = activeViewport();
    const statuses=buildChangeStatusMap(computeChangeSummary(state.events,loadSnapshotWithMeta().snapshot));
    return filterWatchEvents(filteredEvents(byCountry.filter(standardEventVisible), filters, state.hours, state.sort, workspaceWindowEnd(state)).filter(event =>
      (!state.mapView.viewportOnly || inViewport(event.lat,event.lon,viewport.bbox)) &&
      (state.mapView.verification !== 'supported' || ['corroborated', 'primary-confirmed'].includes(normalizeVerificationStatus(event.verification?.state ?? event.verificationStatus)))),state,statuses);
  }

  function buildChokepointIntelligence() {
    if(derivedEvents===state.events && derivedAsOf===state.mapView.asOf && derivedIntelligence)return derivedIntelligence;
    const correlations = correlateEventsToChokepoints(state.events, STRATEGIC_CHOKEPOINTS, { now: state.lastLoaded || Date.now() });
    const events = enrichEventsWithChokepoints(state.events, correlations, STRATEGIC_CHOKEPOINTS);
    const records = [...(state.observationRecords || []), ...(state.demo ? syntheticChokepointRecords() : [])];
    const replayAt = state.mapView.asOf ? Date.parse(state.mapView.asOf) : NaN;
    const evaluationNow = Number.isFinite(replayAt) ? replayAt : (state.lastLoaded || Date.now());
    const assessments = assessChokepoints(events, correlations, { now: evaluationNow, sourceStatus: state.sourceStatus, records, asOf: state.mapView.asOf });
    state.intelligenceEvents = events;
    state.chokepointAssessments = assessments;
    state.chokepointCorrelations = correlations;
    derivedEvents=state.events;
    derivedAsOf=state.mapView.asOf;
    derivedRisk=null;
    derivedIntelligence={ correlations, events, assessments, records };
    return derivedIntelligence;
  }

  function selectCountry(value, zoom = true) {
    const country = countryByCode(value);
    if (!country) return;
    state.selectedCountryIso3 = country.iso3;
    syncUrlState();
    if (zoom) mapController.selectCountry(country);
    render();
  }

  let contactReturnView = null;
  function inspectContact(object) {
    if (!contactReturnView) contactReturnView = { center:mapController.map.getCenter(), zoom:mapController.map.getZoom() };
    state.selectedMovingObjectId = object.id;
    state.rightDrawerOpen = true;
    document.getElementById('contactsPanel').open = true;
    mapController.map.setView([object.latitude,object.longitude], mapController.map.getZoom());
    render();
    document.getElementById('contactsPanel').scrollTop = 0;
  }
  document.getElementById('contactsPanel').addEventListener('click', event => {
    const row = event.target.closest('[data-contact-id]');
    if(row) { const object=state.movingObjects.find(item=>item.id===row.dataset.contactId); if(object) inspectContact(object); }
    if(event.target.closest('[data-contact-close]')) { state.selectedMovingObjectId=null; render(); }
    if(event.target.closest('[data-contact-return]') && contactReturnView) {
      const previous=contactReturnView;contactReturnView=null;state.selectedMovingObjectId=null;
      mapController.map.setView(previous.center,previous.zoom);render();
    }
  });

  async function hydrateSnapshotRecords() {
    try {
      const response = await fetch("./data/development-fixtures/portwatch-hormuz-2025-01-extract.json", { cache: "no-store" });
      if (!response.ok) return;
      const json = await response.json();
      const { createGenuineHormuzCase } = await import("./intelligence/portwatch-frozen-sample.js");
      const genuine = createGenuineHormuzCase({ json });
      state.observationRecords = genuine.evidence || [];
      state.genuineHormuzCase = genuine;
    } catch (error) {
      console.warn("Snapshot records unavailable", error);
    }
  }

  async function loadPublicSnapshots() {
    const [kevRes, nhcRes] = await Promise.all([
      fetch("./data/development-fixtures/cisa-kev-frozen.json", { cache: "no-store" }),
      fetch("./data/development-fixtures/nhc-twoat-frozen.xml", { cache: "no-store" }),
    ]);
    const { eventsFromCisaFrozen, eventsFromNhcXml } = await import("./data/snapshots/public-source-snapshots.js");
    const extra = [];
    if (kevRes.ok) extra.push(...eventsFromCisaFrozen(await kevRes.json()).events);
    if (nhcRes.ok) extra.push(...eventsFromNhcXml(await nhcRes.text()).events);
    if (extra.length) {
      state.events = [...state.events, ...extra];
      render();
    }
  }

  async function hydrateGenuineHormuz() {
    const response = await fetch("./data/development-fixtures/portwatch-hormuz-2025-01-extract.json", { cache: "no-store" });
    if (!response.ok) throw new Error("genuine extract unavailable");
    const json = await response.json();
    const { createGenuineHormuzCase } = await import("./intelligence/portwatch-frozen-sample.js");
    return createGenuineHormuzCase({ json });
  }

  let caseLoadGeneration = 0;
  async function ensureInvestigation(chokepointId) {
    const generation = ++caseLoadGeneration;
    if (investigation.mode === 'imported' && investigation.caseObject) return investigation.caseObject;
    if (investigation.mode === 'aviation') {
      if (isAviationCase(investigation.caseObject)) return investigation.caseObject;
      try {
        const response = await fetch('./data/development-fixtures/aviation-riyadh-2026-10.json', {cache:'no-store'});
        if (!response.ok) throw Error('Frozen aviation case unavailable');
        const parsed = parseCaseFile(await response.text());
        if (!parsed.ok) throw Error(parsed.errors.join('; '));
        // An older load cannot replace a later case switch/import.
        if (generation !== caseLoadGeneration || investigation.mode !== 'aviation') return investigation.caseObject;
        investigation.caseObject = parsed.caseObject;
      } catch (error) {
        if (generation === caseLoadGeneration && els.feedError) {els.feedError.hidden=false;els.feedError.textContent=`Aviation case unavailable: ${error.message}`;}
      }
      return investigation.caseObject;
    }
    const wantGenuine = investigation.mode === "genuine" && chokepointId === "strait-of-hormuz";
    if (wantGenuine) {
      if (!investigation.caseObject?.genuine || investigation.caseObject.requirement?.chokepointId !== chokepointId) {
        try {
          const loaded = await hydrateGenuineHormuz();
          if (generation !== caseLoadGeneration) return investigation.caseObject;
          investigation.caseObject = loaded;
        } catch (error) {
          if (generation !== caseLoadGeneration) return investigation.caseObject;
          console.warn("Genuine Hormuz case unavailable; synthetic fixture remains.", error);
          investigation.mode = "synthetic";
          investigation.caseObject = createInvestigationCase({ chokepointId, now: new Date(SYNTHETIC_NOW) });
        }
      }
      return investigation.caseObject;
    }
    if (!investigation.caseObject || investigation.caseObject.genuine || investigation.caseObject.requirement?.chokepointId !== chokepointId) {
      investigation.caseObject = createInvestigationCase({ chokepointId, now: new Date(SYNTHETIC_NOW) });
    }
    return investigation.caseObject;
  }

  function workbenchMarkup(chokepoint) {
    if (!chokepoint) return "";
    if (investigation.mode === 'aviation' && !isAviationCase(investigation.caseObject)) return '<p role="status">Frozen aviation case loading or unavailable. No assessment is substituted. Choose another case or retry after checking the error.</p>';
    return renderInvestigationWorkbench({
      chokepoint,
      caseObject: investigation.caseObject,
      tab: investigation.tab,
      advanced: state.interfaceMode === "advanced",
      open: investigation.open,
      selectedEvidenceId: state.selectedEvidenceId,
      selectionNotice: investigation.selectionNotice,
    });
  }

  function downloadText(filename, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function render() {
    const renderStarted=performance.now();
    try {
    const intelligence = buildChokepointIntelligence();
    const events = currentEvents(intelligence.events);
    updateCountDebug(events);
    const riskScores = derivedRisk || (derivedRisk=computeCountryRiskScores(state.events));
    const correlations = state.interfaceMode==='advanced' && ['finance','commodity'].includes(state.dashboard) ? correlateEventsToMarkets(state.events, EXCHANGES) : [];
    const layers = layersForDashboard(state.dashboard);
    renderFilters(els);
    const clusters = buildEventClusters(events);
    const selectedCluster = state.selectedClusterId ? findClusterById(clusters, state.selectedClusterId) : null;
    const highlightMemberIds = selectedCluster ? clusterMemberIds(selectedCluster) : null;
    const selectedChokepoint = chokepointById(state.selectedChokepointId);
    const relatedEventIds = selectedChokepoint ? new Set(intelligence.correlations.filter((item) => item.chokepointId === selectedChokepoint.id).map((item) => item.eventId)) : null;
    const { snapshot: changeSnapshot, corrupt: corruptSnapshot, unavailable: storageUnavailable } = loadSnapshotWithMeta();
    const changeSummary = computeChangeSummary(state.events, changeSnapshot, buildEventClusters(state.events));
    changeSummary.corruptSnapshot = corruptSnapshot;
    changeSummary.storageUnavailable = storageUnavailable;
    const changeStatusById = buildChangeStatusMap(changeSummary);
    activeChangeStatusById = changeStatusById;
    const operator=document.getElementById('watchOperator');
    document.getElementById('contactsPanel').hidden=!(state.tracking.aircraft||state.tracking.vessels);
    operator.hidden=investigation.open||['chokepoints','latest-intelligence'].includes(state.activeArea);
    updateFeedMarkup(operator,renderWatchOperator(state,changeSummary));
    const viewport = activeViewport();
    const presentation = selectMapEvents(events,{zoom:viewport.zoom,bbox:viewport.bbox,selectedId:state.selectedEventId});
    state.visibleMapEvents = presentation.displayed.length;
    document.getElementById('mapScale').textContent = presentation.band;
    document.getElementById('mapCount').textContent = `${presentation.displayed.length} map records · ${presentation.eligible} geographically eligible`;
    renderWorkspaceSummary(document.getElementById('workspaceSummary'), { state, events, band: presentation.band });
    document.getElementById('attentionNote').textContent = `${presentation.hiddenByScale} hidden until closer zoom; ${presentation.hiddenByBudget} hidden by the ${presentation.budget}-marker limit. ${events.length} records available in the list. ${presentation.explanation}`;
    const markerStats = renderMarkers(mapController.markerLayer, presentation.displayed, (event) => {
      openEventInspector(event);
    }, {
      selectedEventId: state.selectedEventId,
      clusterMemberIds: highlightMemberIds,
      relatedEventIds,
      changeStatusById,
      priorityLayer: mapController.priorityLayer,
    });
    document.body.dataset.liveMapMarkerCreates = String(markerStats.created);
    document.body.dataset.liveMapMarkerRetained = String(markerStats.retained);
    mapController.clearClusterHighlight();
    if (selectedCluster) renderClusterHighlight(mapController.clusterHighlightLayer, selectedCluster);
    mapController.renderCountryRisk(riskScores, state.ciiVisible);
    mapController.renderCountryBoundaries(state.selectedCountryIso3 ? COUNTRIES.filter(c=>c.iso3===state.selectedCountryIso3) : [], riskScores, state.selectedCountryIso3, (country) => selectCountry(country.iso3, false));
    mapController.renderChokepoints(state.mapView.chokepoints || state.activeArea==='chokepoints' ? STRATEGIC_CHOKEPOINTS : [], intelligence.assessments, state.selectedChokepointId, (chokepoint) => openChokepointInspector(chokepoint));
    mapController.renderMovingObjects(state.movingObjects, inspectContact, state.selectedMovingObjectId);
    const center = mapController.map.getCenter();
    document.getElementById('contactRoster').innerHTML = renderContactRoster(nearbyContacts(state.movingObjects, {lat:center.lat,lon:center.lng}, mapController.currentBbox()), state.selectedMovingObjectId, Boolean(contactReturnView));
    const selectedContact = state.movingObjects.find(object => object.id===state.selectedMovingObjectId);
    const contactDetail = document.getElementById('contactDetail');
    contactDetail.hidden = !selectedContact;
    contactDetail.innerHTML = renderContactDetail(selectedContact);
    mapController.renderReferencePoints({ airports: state.tracking.airports ? AIRPORTS : [], ports: state.tracking.ports ? PORTS : [] });
    const sharedView = { ...state.mapView, lat: center.lat, lon: center.lng, zoom: mapController.map.getZoom() };
    const graphRecords = (intelligence.records || []).filter((record) => record.recordKind !== "relationship");
    const graphNodes = [
      ...graphRecords.map((record) => graphNodeFromRecord(record)),
      ...STRATEGIC_CHOKEPOINTS.map((item) => ({ id: item.id, nodeType: "infrastructure", title: item.name, lat: item.center?.lat, lon: item.center?.lon, geographic: true })),
    ];
    const graphEdges = (intelligence.records || []).filter((record) => record.recordKind === "relationship").map(graphEdgeFromRelationship);
    const graphView = state.mapView.graph || state.selectedChokepointId
      ? neighborhood({ selectedId: state.selectedChokepointId || SYNTHETIC_CHOKEPOINT_ID, nodes: graphNodes, edges: graphEdges, bbox: mapController.currentBbox() })
      : { nodes: [], edges: [] };
    mapController.renderGraph(state.mapView.graph ? graphView : { nodes: [], edges: [] });
    if (state.mapView.density) {
      const applyDensity = (grid) => { if (grid && state.mapView.density) mapController.renderDensity(grid.cells || [], { ...SHIPPING_DENSITY_META, title: densityUiLabel() }); };
      if (densityGridCache) applyDensity(densityGridCache);
      else fetch("./data/development-fixtures/shipping-density-sample.json").then((response) => response.ok ? response.json() : null).then((grid) => { densityGridCache = grid; applyDensity(grid); }).catch(() => {});
    } else mapController.renderDensity([]);
    const overlay = document.getElementById("overlayStatus");
    if (overlay) {
      const notes = [];
      if (state.mapView.density) notes.push(densityUiLabel());
      if (state.mapView.activity) notes.push(activityUiLabel());
      if (state.mapView.orbital) notes.push(ORBITAL_MODULE_ONLY);
      if (state.mapView.weather) notes.push(recordedWindUiLabel());
      overlay.textContent = notes.join(" · ") || "Pins stay independent of Auto. Spatial clusters are not corroborated incidents.";
    }
    state._graphView = graphView;
    setGlobeMode(state.mapMode, events, sharedView, {
      onContextLoss() { state.mapMode = "2d"; state.mapView.mapMode = "2d"; syncUrlState(); render(); },
      onViewChange(view) {
        if (state.mapMode === "2d" || !Number.isFinite(view.lat) || !Number.isFinite(view.lon) || !Number.isFinite(view.zoom)) return;
        // Leaflet remains the shared viewport for feed attention and the 2D return path.
        mapController.map.setView([view.lat, view.lon], view.zoom, { animate: false });
      },
      onViewportChange() { if (state.mapMode !== "2d") render(); },
      onSelectId(id) {
        if (id.startsWith("event:")) {
          const event = events.find((item) => String(item.id) === id.slice(6));
          if (event) openEventInspector(event);
          return;
        }
        const found = chokepointById(id.replace(/^chokepoint:|^edge:|^node:/, ""));
        if (found) openChokepointInspector(found);
      },
      visibleEvents: presentation.displayed,
      selectedEventId: state.selectedEventId,
      selectedEvent: events.find((item) => item.id === state.selectedEventId) || null,
      graph: state.mapView.graph ? graphView : { nodes: [], edges: [] },
      chokepoints: (state.mapView.chokepoints || state.activeArea === "chokepoints") ? STRATEGIC_CHOKEPOINTS : [],
      assessments: intelligence.assessments,
      selectedChokepointId: state.selectedChokepointId,
      basemap: state.mapView.basemap,
    });
    mapController.invalidateMapSize();
    renderList(els, events);
    if (state.selectedEventId && state._scrolledEventId !== state.selectedEventId) {
      state._scrolledEventId = state.selectedEventId;
      document.querySelector(".event-card.is-selected")?.scrollIntoView({ block: "nearest" });
    }
    renderStats(els, events);
    renderFeedError(els.feedError);
    if (state.mapMode !== "2d" && els.mapHealth) els.mapHealth.hidden = true;
    else renderMapHealth(els.mapHealth, state.mapHealth || mapController.health());
    updateSourcesLink(els.sourcesLink);
    applyShellState(els);
    document.getElementById('viewportOnly').checked = state.mapView.viewportOnly;
    document.getElementById('chokepointsToggle').checked = state.mapView.chokepoints;
    document.getElementById('verificationFilter').value = state.mapView.verification;
    els.mapMode.value = state.mapMode;
    for (const [id, key] of [['graphToggle','graph'],['densityToggle','density'],['activityToggle','activity'],['orbitalToggle','orbital'],['recordedWindToggle','weather']]) {
      const el = document.getElementById(id);
      if (el) el.checked = Boolean(state.mapView[key]);
    }
    document.querySelectorAll('[data-preset]').forEach(el => { el.classList.toggle('active',el.dataset.preset===state.selectedPreset); el.setAttribute('aria-pressed',String(el.dataset.preset===state.selectedPreset)); });
    document.querySelectorAll('[data-open-drawer]').forEach(el=>el.setAttribute('aria-expanded',String(el.dataset.openDrawer==='left'?state.leftDrawerOpen:state.rightDrawerOpen)));
    if (mapController.map.getZoom()<7 && (state.tracking.aircraft || state.tracking.vessels)) els.trackingStatus.textContent = 'Zoom to local scale to request positions. No global fleet is loaded.';
    if (els.presetList) els.presetList.innerHTML = renderPresetList();
    els.publicDataStatus.innerHTML = renderPublicDataStatus();
    els.countrySummaryPanel.innerHTML = state.selectedCountryIso3 ? renderCountrySummary(riskScores, state.events) : '';
    els.sourcesStatusPanel.innerHTML = state.interfaceMode==='advanced' ? renderSourcesStatusPanel(state.events, state.sourceStatus) : '';
    applyDashboardTitle(state.dashboard, els.dashboardEyebrow, els.dashboardTitle);
    if (state.activeArea === "latest-intelligence") {
      els.dashboardEyebrow.textContent = "OPEN WEB";
      els.dashboardTitle.textContent = "Latest Intelligence";
    } else if (state.activeArea === "chokepoints") {
      els.dashboardEyebrow.textContent = "STRATEGIC";
      els.dashboardTitle.textContent = "Chokepoints";
    } else if (state.activeArea === "feed") {
      els.dashboardEyebrow.textContent = "EVENTS";
      els.dashboardTitle.textContent = state.localPreview ? "Current public reports" : "Event feed";
    }

    // Context-specific left extras — do not leave chokepoint watch stuck on other tabs
    if (state.activeArea === "chokepoints") {
      els.dashboardPanel.innerHTML = renderStrategicWatch(intelligence.assessments, STRATEGIC_CHOKEPOINTS) + renderCountDebug();
    } else if (state.activeArea === "latest-intelligence") {
      els.dashboardPanel.innerHTML = renderLatestIntelligence(state.storylines, state.observations) + renderCountDebug();
    } else if (state.activeArea === "feed") {
      els.dashboardPanel.innerHTML = renderAlerts(events) + renderCountDebug();
    } else if(state.interfaceMode==='advanced') {
      els.dashboardPanel.innerHTML = renderDashboardPanel(state.dashboard, { riskScores, correlations, events, sourceStatus: state.sourceStatus, providerResults: state.providerResults }) + renderLayerSummary(layers) + renderRiskTable(riskScores) + renderAlerts(events) + renderCountDebug();
    } else {
      els.dashboardPanel.innerHTML='';
    }

    const selectedEvent = selectedCluster
      ? null
      : events.find((event) => event.id === state.selectedEventId) || null;
    if(state.selectedEventId && !selectedEvent && state.lastLoaded != null) { state.selectedEventId=null; syncUrlState(); document.getElementById('attentionNote').textContent+=' Previous selection is excluded by the current filters.'; }
    if(state.interfaceMode==='advanced') renderOsintDashboardShell(els.osintDashboardV2, {
      events,
      sourceStatus: state.sourceStatus,
      providerResults: state.providerResults,
      filters: dashboardFilters(),
      hours: state.hours,
      lastLoaded: state.lastLoaded,
      systemStatus: state.systemStatus,
      selectedClusterId: state.selectedClusterId,
      selectedCluster,
      changeSummary,
      changeStatusById,
      loading: state.apiStatus === "loading",
      error: state.apiFailure?.message || null,
    });
    else els.osintDashboardV2.innerHTML='';
    const selectedChangeStatus = selectedEvent ? changeStatusById.get(selectedEvent.id) || null : null;
    const chokepointActive = state.activeArea === "chokepoints" && selectedChokepoint;
    if (chokepointActive) {
      els.eventDetailDrawer.hidden = true;
      els.eventDetailDrawer.innerHTML = "";
    } else {
      renderOsintEventDetailDrawer(els.eventDetailDrawer, {
        event: selectedEvent,
        cluster: selectedCluster,
        changeStatus: selectedChangeStatus,
        allEvents: events,
        clusters,
      });
    }
    const showWorkbench = chokepointActive && investigation.open;
    if (showWorkbench && isAviationCase(investigation.caseObject)) {els.dashboardTitle.textContent='Aviation case review';els.dashboardEyebrow.textContent='DATED LOCAL REPORTING';}
    els.chokepointDetailDrawer.hidden = !showWorkbench;
    updateFeedMarkup(els.chokepointDetailDrawer, showWorkbench
      ? isAviationCase(investigation.caseObject) ? workbenchMarkup(selectedChokepoint) : renderChokepointDetail(selectedChokepoint, intelligence.assessments, new Map(intelligence.events.map((event) => [String(event.id), event])), state._graphView, intelligence.records || [], workbenchMarkup(selectedChokepoint))
      : "");
    if(state.stressDemo) { const output=document.getElementById('demoPerf');output.hidden=false;output.textContent=`SYNTHETIC STRESS · ${state.events.length} events / ${state.movingInputCount || 0} input objects · last synchronous UI update ${(performance.now()-renderStarted).toFixed(1)} ms · target <250 ms`; }
    const watchChip = document.getElementById("watchModeChip");
    if (watchChip) {
      watchChip.hidden = state.selectedChokepointId !== 'strait-of-hormuz';
      const synthetic = Boolean(state.demo && state.mapView.scenarioStage);
      watchChip.dataset.watchMode = synthetic ? "synthetic-plus-historical" : "historical";
      watchChip.textContent = synthetic
        ? "Synthetic map scenario · historical chart stays separate"
        : "Historical public extract · operating status unknown";
      watchChip.title = watchChip.textContent;
    }
    const dockHost = document.getElementById("watchDockHost");
    if (dockHost) {
      dockHost.hidden = state.selectedChokepointId !== 'strait-of-hormuz';
      const markup = renderWatchDock(state.genuineHormuzCase, { scenarioStage: state.demo ? (state.mapView.scenarioStage || "") : "" });
      const wasOpen = dockHost.querySelector("#watchDock")?.open;
      if (dockHost.dataset.markup !== markup) {
        dockHost.dataset.markup = markup;
        dockHost.innerHTML = markup;
        if (wasOpen !== true) {
          const details = dockHost.querySelector("#watchDock");
          if (details) details.open = false;
        }
      }
    }
    document.body.dataset.liveMapReady = "1";
    document.body.dataset.liveMapMode = state.mapMode;
    document.body.dataset.liveMapAsOf = state.mapView.asOf || "";
    document.body.dataset.liveMapScenario = state.mapView.scenarioStage || "";
    document.body.dataset.liveMapWorkbench = investigation.open ? "1" : "0";
    document.body.dataset.liveMapChokepoint = state.selectedChokepointId || "";
    document.body.dataset.liveMapDataMode = state.demo ? "mixed" : (state.dataMode || "public");
    if (els.dataMode) els.dataMode.value = state.demo ? "mixed" : (state.dataMode || "public");
    if (els.refreshNow) els.refreshNow.textContent = state.demo ? "Reload demo" : "Refresh reports";
    if (els.baseMap && state.mapView.basemap) els.baseMap.value = state.mapView.basemap;
    } catch (error) {
      console.error(error);
      document.body.dataset.liveMapReady = "1";
      document.body.dataset.liveMapError = String(error?.message || error).slice(0, 240);
      if (els.feedError) {
        els.feedError.hidden = false;
        els.feedError.textContent = "Workspace render recovered from an error. Chrome remains available; see console.";
      }
    }
  }

  /**
   * Switch main workspace tab and clear stuck inspector context.
   * Leaving chokepoints always clears chokepoint selection so filters/detail do not linger.
   */
  function setActiveArea(nextArea, { forceRightOpen = false } = {}) {
    const area = String(nextArea || "explore");
    if (state.selectedEventId && area !== state.activeArea) clearInspectorSelection();
    const previous = state.activeArea;
    state.activeArea = area;

    if (area !== "chokepoints") {
      investigation.open = false; state.selectedEvidenceId = null;
      syncInvestigationUrl();
      state.selectedChokepointId = null;
    }
    if (area === "chokepoints") {
      state.selectedEventId = null;
      state.selectedClusterId = null;
    }
    if (area === "latest-intelligence") {
      state.selectedClusterId = null;
    }

    if (forceRightOpen || ["feed", "latest-intelligence", "chokepoints"].includes(area)) {
      state.rightDrawerOpen = true;
      workspaceStorage.setItem("live-map-right-drawer-v1", "open");
    }

    // Leaving a specialized view: ensure left panel context is re-evaluated
    if (previous !== area && els.filterDrawer) {
      // Keep drawer open state; content visibility handled in applyShellState
    }

    syncUrlState();
    renderNav();
  }

  function syncInvestigationUrl() {
    syncUrlState();
    const url = new URL(location.href);
    if (investigation.open) {
      url.searchParams.set('workbench', '1');
      url.searchParams.set('case', investigation.mode === 'aviation' ? AVIATION_CASE_ID : investigation.mode === 'imported' ? 'imported-local' : investigation.caseObject?.genuine ? 'portwatch-hormuz-2025-01' : investigation.mode === 'synthetic' ? 'synthetic-hormuz-2026-06' : 'imported-local');
    } else {url.searchParams.delete('workbench');url.searchParams.delete('case');}
    if (investigation.open && state.selectedEvidenceId) url.searchParams.set('evidence', state.selectedEvidenceId); else url.searchParams.delete('evidence');
    history.replaceState(null, '', url);
  }

  async function openInvestigation(id = state.selectedChokepointId || 'strait-of-hormuz') {
    const requestedEvidenceId = state.selectedEvidenceId;
    openChokepointInspector(chokepointById(id));
    state.selectedEvidenceId = requestedEvidenceId;
    investigation.open = true; investigation.tab = 'evidence';
    state.mobilePane = 'feed'; state.leftDrawerOpen = false;
    await ensureInvestigation(id);
    investigation.selectionNotice = startupQuery.get('case') === 'imported-local' ? 'Imported cases are session-only. Reimport the JSON case to inspect its evidence after reload.' : null;
    if (state.selectedEvidenceId && !investigation.caseObject?.evidence.some(record => record.id === state.selectedEvidenceId)) {
      investigation.selectionNotice = 'Requested evidence is unavailable in this case. Choose a current ledger record or reimport its JSON case.';
      state.selectedEvidenceId = null;
    }
    syncInvestigationUrl(); render(); renderNav();
    els.chokepointDetailDrawer.querySelector(state.selectedEvidenceId ? '[data-evidence-back]' : '[data-evidence-select]')?.focus();
  }

  let inspectorReturnView = null;
  let inspectorReturnId = null;
  let inspectorReturnScroll = 0;
  let inspectorReturnPane = 'feed';
  function clearInspectorSelection({ closeDrawer = false } = {}) {
    const hadInspector = Boolean(state.selectedEventId || inspectorReturnView);
    state.selectedEventId = null;
    state.selectedClusterId = null;
    state.selectedChokepointId = null;
    if (hadInspector) state.mobilePane = inspectorReturnPane;
    if (els.eventDialog.open) els.eventDialog.close();
    if (closeDrawer) {
      state.rightDrawerOpen = false;
      workspaceStorage.setItem("live-map-right-drawer-v1", "closed");
    }
    if (inspectorReturnView) {
      // Return geographic context without undoing a lens, layer or time edit.
      const { lat, lon, zoom } = inspectorReturnView;
      Object.assign(state.mapView, { lat, lon, zoom });
      mapController.map.setView([inspectorReturnView.lat, inspectorReturnView.lon], inspectorReturnView.zoom, { animate: false });
      getGlobeHandle()?.applyView?.(inspectorReturnView);
      inspectorReturnView = null;
    }
    syncUrlState();
    render();
    els.eventList.scrollTop = inspectorReturnScroll;
    if (inspectorReturnId && !closeDrawer) els.eventList.querySelector(`[data-event-detail="${CSS.escape(inspectorReturnId)}"]`)?.focus({ preventScroll: true });
    inspectorReturnId = null;
  }

  function openEventInspector(eventRecord, { openModal = false, flyTo = true } = {}) {
    if (!eventRecord) return;
    if (!state.selectedEventId) {
      inspectorReturnView = { ...state.mapView };
      inspectorReturnScroll = els.eventList.scrollTop;
      inspectorReturnId = eventRecord.id;
      inspectorReturnPane = state.mobilePane === 'map' ? 'map' : 'feed';
    }
    state.selectedEventId = eventRecord.id;
    state.selectedEvidenceId = null;
    investigation.open = false;
    syncInvestigationUrl();
    state.selectedClusterId = null;
    state.selectedChokepointId = null;
    state.rightDrawerOpen = true;
    state.leftDrawerOpen = false;
    state.mobilePane = 'detail';
    workspaceStorage.setItem("live-map-right-drawer-v1", "open");
    if (els.eventDialog.open) els.eventDialog.close();
    const canFly = flyTo && Number.isFinite(eventRecord.lat) && Number.isFinite(eventRecord.lon);
    if (canFly && state.mapMode !== "2d") {
      const zoom = Math.max(mapController.map.getZoom(), 5);
      mapController.map.setView([eventRecord.lat, eventRecord.lon], zoom, { animate: false });
      state.mapView.lat = eventRecord.lat;
      state.mapView.lon = eventRecord.lon;
      state.mapView.zoom = zoom;
    }
    syncUrlState();
    render();
    if (openModal) openEventDialog(eventRecord, els.eventDialog, els.dialogContent, mapController.map);
    else if (canFly && state.mapMode === "2d") {
      mapController.map.flyTo([eventRecord.lat, eventRecord.lon], Math.max(mapController.map.getZoom(), 5));
    } else if (canFly) {
      getGlobeHandle()?.applyView?.(state.mapView);
    }
    if (!openModal) els.eventDetailDrawer.querySelector('.inspector-back')?.focus({ preventScroll: true });
  }

  function openClusterInspector(cluster) {
    if (!cluster) return;
    state.selectedClusterId = cluster.clusterId;
    state.selectedEventId = null;
    state.selectedChokepointId = null;
    state.rightDrawerOpen = true;
    workspaceStorage.setItem("live-map-right-drawer-v1", "open");
    if (els.eventDialog.open) els.eventDialog.close();
    render();
    fitClusterOnMap(mapController.map, cluster);
  }

  function openChokepointInspector(chokepoint) {
    if (!chokepoint) return;
    if (state.selectedChokepointId !== chokepoint.id) state.selectedEvidenceId = null;
    state.selectedChokepointId = chokepoint.id;
    state.selectedEventId = null;
    state.selectedClusterId = null;
    setActiveArea("chokepoints", { forceRightOpen: true });
    if (state.mapMode !== "2d" && Number.isFinite(chokepoint.center?.lat) && Number.isFinite(chokepoint.center?.lon)) {
      const zoom = Math.max(state.mapView.zoom || 2, 5);
      mapController.map.setView([chokepoint.center.lat, chokepoint.center.lon], zoom, { animate: false });
      state.mapView.lat = chokepoint.center.lat;
      state.mapView.lon = chokepoint.center.lon;
      state.mapView.zoom = zoom;
    }
    render();
    if (state.mapMode === "2d") mapController.fitChokepoint(chokepoint);
    else getGlobeHandle()?.applyView?.(state.mapView);
  }

  function renderNav() {
    const items = [["explore", "Watch"], ["chokepoints", "Passages"], ["latest-intelligence", "Open reports"], ["investigate", "Evidence ledger"]];
    els.dashboardNav.innerHTML = items.map(([id, label]) => {
      if (id === "sources") return `<a class="dashboard-tab" href="/sources" data-sources-link>${label}</a>`;
      if (id === "diagnostics") return `<a class="dashboard-tab" href="/diagnostics">${label}</a>`;
      if (id === "countries") return `<a class="dashboard-tab ${state.activeArea === id ? "active" : ""}" href="/countries">${label}</a>`;
      if (id === "investigate") return `<button class="dashboard-tab ${investigation.open ? "active" : ""}" data-investigate-nav type="button">${label}</button>`;
      const active = state.activeArea === id || (id === 'explore' && state.activeArea === 'feed');
      return `<button class="dashboard-tab ${active ? "active" : ""}" aria-pressed="${active}" data-area="${id}" type="button">${label}</button>`;
    }).join("");
  }

  function renderFeedControls() {
    els.sortOrder.innerHTML = SORT_OPTIONS.map(([value, label]) => `<option value="${value}" ${state.sort === value ? "selected" : ""}>${label}</option>`).join("");
    els.groupBy.innerHTML = GROUP_OPTIONS.map(([value, label]) => `<option value="${value}" ${state.groupBy === value ? "selected" : ""}>${label}</option>`).join("");
    els.cardMode.value = state.cardMode;
    els.savedViews.innerHTML = '<option value="">Saved views</option>' + loadSavedViews().map((view) => `<option value="${escapeHtml(view.name)}">${escapeHtml(view.name)}</option>`).join("");
  }

  function renderChokepointControls() {
    const optionList = (label, values, selected) => `<option value="">${label}</option>${values.map((value) => `<option value="${escapeHtml(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(value.replace(/-/g, " "))}</option>`).join("")}`;
    const regions = [...new Set(STRATEGIC_CHOKEPOINTS.flatMap((item) => item.regions))].sort();
    const domains = [...new Set(STRATEGIC_CHOKEPOINTS.flatMap((item) => item.domains))].sort();
    els.chokepointRegion.innerHTML = optionList("All regions", regions, state.chokepointFilters.region);
    els.chokepointType.innerHTML = optionList("All types", CHOKEPOINT_TYPES, state.chokepointFilters.type);
    els.chokepointStatus.innerHTML = optionList("All conditions", CHOKEPOINT_STATUSES, state.chokepointFilters.status);
    els.chokepointDomain.innerHTML = optionList("All event domains", domains, state.chokepointFilters.domain);
    els.chokepointSort.innerHTML = [["priority", "Priority"], ["status", "Condition"], ["recency", "Recent"], ["name", "Name"]].map(([value, label]) => `<option value="${value}" ${state.chokepointFilters.sort === value ? "selected" : ""}>${label}</option>`).join("");
    const stageSelect = document.getElementById("scenarioStage");
    const stageLabel = document.getElementById("scenarioStageLabel");
    const stageHelp = document.getElementById("scenarioStageHelp");
    const showStage = Boolean(state.demo);
    if (stageSelect) {
      stageSelect.hidden = !showStage;
      if (stageLabel) stageLabel.hidden = !showStage;
      if (stageHelp) stageHelp.hidden = !showStage;
      stageSelect.innerHTML = SCENARIO_STAGES.map((stage) => `<option value="${escapeHtml(stage.id)}" ${state.mapView.scenarioStage === stage.id ? "selected" : ""}>${escapeHtml(stage.id.replace(/-/g, " "))}</option>`).join("");
    }
  }

  function applyScenarioStage(id, { renderAfter = true } = {}) {
    const stage = SCENARIO_STAGES.find((item) => item.id === id) || SCENARIO_STAGES.find((item) => item.id === "diplomacy-with-low-throughput") || SCENARIO_STAGES[0];
    state.mapView.scenarioStage = stage.id;
    state.mapView.asOf = stage.asOf;
    derivedEvents = null;
    derivedIntelligence = null;
    syncUrlState();
    if (renderAfter) render();
  }

  function scheduleNextLoad(delayMs) {
    if (refreshTimer) window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => loadEvents(false), delayMs);
  }

  function scheduleChangePoll(cursor, delayMs = 30000) {
    if (changeTimer) window.clearTimeout(changeTimer);
    changeCursor = cursor || null;
    if (changeCursor) changeTimer = window.setTimeout(pollChanges, delayMs);
  }

  async function pollChanges() {
    if (!changeCursor) return;
    if (document.hidden) { scheduleChangePoll(changeCursor, 60000); return; }
    const requestedCursor = changeCursor;
    try {
      const response = await fetch(`/api/changes?cursor=${encodeURIComponent(requestedCursor)}&limit=50`, { cache: "no-store" });
      if (response.status === 409) { await loadEvents(false); return; }
      if (!response.ok) throw new Error(`Changes API ${response.status}`);
      const body = await response.json();
      if (changeCursor !== requestedCursor) return;
      if (body.changes?.length) { await loadEvents(false); return; }
      scheduleChangePoll(body.nextCursor, 30000);
    } catch {
      if (changeCursor === requestedCursor) scheduleChangePoll(changeCursor, 30000);
    }
  }

  function applyResult(result) {
    const normalizedEvents = (result.events || []).map(normalizeEvent).filter((event) => event.geographic === false || (Number.isFinite(event.lat) && Number.isFinite(event.lon)));
    const incidentResult = annotateIncidents(normalizedEvents);
    state.events = incidentResult.events;
    state.localPreview=result.localPreview||null;
    state.intelligenceEvents = [];
    state.incidents = incidentResult.incidents;
    state.lastLoaded = Number(result.generatedAt || Date.now());
    state.sources = result.sources || [];
    state.sourceStatus = result.sourceStatus || {};
    state.domainSourceStatus = result.domainSourceStatus || {};
    state.providerResults = result.providerResults || [];
    state.observations = result.observations || [];
    state.storylines = result.storylines || [];
    state.observationSummary = result.observationSummary || {};
    state.systemStatus = result.systemStatus || result.mode || "unknown";
    state.errors = result.errors || [];
  }

  async function loadEvents(manual = false) {
    if (state.demo) {
      const { foundationEvents } = await import('./data/foundation-demo.js');
      const demoNow=Date.now();
      const fixtures=[...foundationEvents(demoNow,state.stressDemo?10000:120).map((e,i)=>({...e,occurredAt:demoNow-(i%120+1)*600000,updatedAt:demoNow-(i%120)*300000})), ...syntheticScenarioEvents(demoNow)];
      applyResult({events:fixtures,generatedAt:demoNow,sources:['Synthetic test fixture'],systemStatus:'demo',sourceStatus:{demo:{ok:true,status:'demo',count:fixtures.length}}});
      await hydrateSnapshotRecords();
      els.systemStatus.textContent = 'Synthetic demo';
      els.sourceHealth.textContent = 'Synthetic test scenarios. No live provider requests.';
      render();
      loadPublicSnapshots().catch(() => {});
      return;
    }
    const generation=++eventRequestGeneration;
    eventRequestController?.abort();
    state.apiStatus='loading';
    render();
    els.systemStatus.innerHTML = "<i></i> Updating";
    els.refreshNow.disabled = true;
    const controller = eventRequestController = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs);
    try {
      const response = await fetch(`${CONFIG.endpoint}?hours=${state.hours}&t=${Date.now()}`, { cache: "no-store", signal: controller.signal });
      if (!response.ok) {
        let body = null;
        try { body = await response.json(); } catch { body = null; }
        const error = new Error(`API ${response.status}`);
        error.offlinePreview = body?.error === "offline-preview";
        throw error;
      }
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("json")) throw new Error("Non-JSON event API response");
      const result = await response.json();
      if(generation!==eventRequestGeneration)return;
      state.apiStatus='ready';
      applyResult(result);
      writeEventCache(result);
      scheduleChangePoll(result.changeCursor);
      retryAttempts = 0;
      state.apiFailure = null;
      state.retryDelayMs = 0;
      state.nextRetryAt = Date.now() + CONFIG.refreshSeconds * 1000;
      const isPartial = result.systemStatus === "partial-data" || result.mode === "partial-netlify-function" || state.errors.length > 0;
      const noData = result.systemStatus === "no-current-provider-data" || !state.events.length;
      els.systemStatus.classList.toggle("warn", isPartial);
      els.systemStatus.innerHTML = `<i></i> ${result.localPreview ? (result.localPreview.cacheOnly ? 'Saved public reads' : 'Local public data') : noData ? "No provider data" : isPartial ? "Partial data" : "Operational"}`;
      renderSourceHealth(els.sourceHealth, result, state.errors);
      render();
      scheduleNextLoad(CONFIG.refreshSeconds * 1000);
    } catch (error) {
      if(generation!==eventRequestGeneration)return;
      state.apiStatus='error';
      if (changeTimer) window.clearTimeout(changeTimer);
      console.error(error);
      const kind = error.offlinePreview ? "offline-preview" : classifyFetchError(error);
      const cached = readEventCache();
      if (cached && !state.events.length && kind !== "offline-preview") applyResult({ ...cached, mode: "browser-cache", errors: ["Showing last successful browser cache because live requests failed."] });
      retryAttempts += 1;
      const retryDelay = Math.min(RETRY_CAP_MS, RETRY_BASE_MS * 2 ** Math.min(retryAttempts - 1, 4));
      state.retryDelayMs = kind === "offline-preview" ? 0 : retryDelay;
      state.nextRetryAt = kind === "offline-preview" ? null : Date.now() + retryDelay;
      state.apiFailure = { kind, message: kind === "offline-preview" ? "Local preview has no provider APIs. Use ?demo=foundation for synthetic fixtures." : safeFailureMessage(kind), detail: error.message || "Request failed" };
      els.systemStatus.classList.add("warn");
      els.systemStatus.innerHTML = "<i></i> Feed unavailable";
      if (els.sourceHealth) els.sourceHealth.textContent = kind === "offline-preview" ? "Preview APIs return 503 by design. This is not live data and is not retried as a production outage." : cached ? "Showing last successful cached data" : "No live source connected";
      if (kind === "offline-preview") {
        await hydrateSnapshotRecords();
        await loadPublicSnapshots();
        els.systemStatus.innerHTML = "<i></i> Public snapshots";
        if (els.sourceHealth) els.sourceHealth.textContent = "Loaded local public snapshots. Preview /api remains JSON 503 by design — this is not live coverage.";
        if (els.publicDataStatus) els.publicDataStatus.innerHTML = "<strong>Public snapshots</strong><p>Genuine saved records only. Capture time and observation period are on each card. Not a live feed.</p>";
        state.dataMode = "public";
      } else if (!state.events.length) {
        els.eventList.innerHTML = '<div class="empty">Event data temporarily unavailable. Filters and the map remain usable; use Retry when connectivity returns.</div>';
      }
      render();
      if (kind !== "offline-preview") scheduleNextLoad(retryDelay);
    } finally {
      clearTimeout(timeout);
      if(generation!==eventRequestGeneration)return;
      if(generation===eventRequestGeneration)els.refreshNow.disabled = false;
      if (manual) els.refreshNow.textContent = "Refreshed";
      setTimeout(() => (els.refreshNow.textContent = "Refresh"), 1200);
    }
  }

  let movingAbort = null, movingRequest = 0;
  async function loadMovingObjects() {
    const requestId = ++movingRequest;
    movingAbort?.abort();
    if (!state.tracking.aircraft && !state.tracking.vessels) {
      state.movingObjects = [];
      state.movingObjectStatus = {};
      render();
      return;
    }
    const bbox = mapController.currentBbox();
    const bounded = { ...bbox, west:wrapLongitude(bbox.west),east:wrapLongitude(bbox.east) };
    if (document.hidden || mapController.map.getZoom()<7 || !validateBbox([bounded.south,bounded.west,bounded.north,bounded.east].join(',')).valid) { state.movingObjects=[]; render(); return; }
    if (state.demo) {
      const { foundationObjects } = await import('./data/foundation-demo.js');
      if(requestId!==movingRequest) return;
      const demoObjects=foundationObjects(Date.now(),state.stressDemo?2000:40).map(o=>({...o,observedTrack:[3,2,1,0].map(n=>({latitude:o.latitude-n*.01,longitude:o.longitude-n*.02,observedAt:o.observedAt-n*60000}))}));
      state.movingInputCount=demoObjects.length; state.movingObjects = selectMovingObjects(demoObjects,{bbox,...state.tracking});
      state.movingObjectStatus = { demo: { status:'synthetic-demo' } }; render(); return;
    }
    movingAbort = new AbortController();
    const type = state.tracking.aircraft && state.tracking.vessels ? "all" : state.tracking.aircraft ? "aircraft" : "vessel";
    try {
      const response = await fetch(`/api/moving-objects?type=${type}&bbox=${encodeURIComponent([bounded.south,bounded.west,bounded.north,bounded.east].join(','))}&limit=500`, { signal:movingAbort.signal });
      if (!response.ok) throw new Error('Tracking unavailable');
      const body = await response.json();
      if(requestId!==movingRequest) return;
      const incoming=Array.isArray(body.data?.data) ? body.data.data : Array.isArray(body.data) ? body.data : [];
      const incomingIds=new Set(incoming.map(o=>o.id));
      state.movingObjects = selectMovingObjects([...state.movingObjects.filter(o=>incomingIds.has(o.id)),...incoming],{bbox,...state.tracking});
      state.movingObjectStatus = body.data?.providerStatus || body.sourceStatus || {};
    } catch {
      if(requestId!==movingRequest) return;
      state.movingObjects = [];
      state.movingObjectStatus = {
        opensky: { ok: false, status: "provider-unavailable", message: "Aircraft data is temporarily delayed." },
        "global-fishing-watch": { ok: false, status: "provider-unavailable", message: "Vessel activity is temporarily delayed." },
      };
    }
    render();
  }

  let movingRefreshTimer = null;
  function scheduleMovingRefresh(delay = 30000) {
    if (movingRefreshTimer) window.clearTimeout(movingRefreshTimer);
    if(document.hidden || (!state.tracking.aircraft && !state.tracking.vessels) || mapController.map.getZoom()<7) return;
    movingRefreshTimer = window.setTimeout(async () => {
      await loadMovingObjects();
      scheduleMovingRefresh(document.hidden ? delay * 4 : delay);
    }, delay);
  }

  renderNav();
  renderFeedControls();
  renderChokepointControls();
  const startupParams = new URLSearchParams(window.location.search);
  state.mobilePane = state.selectedEventId ? 'detail' : investigation.open || state.activeArea==='feed' ? 'feed' : 'map';
  if (state.selectedPreset === "explore" && !startupParams.has("tracking") && !startupParams.has("view") && !startupParams.has('mapState') && !state.selectedEventId && !investigation.open) applyPreset("explore", false);
  if (els.timeWindow) els.timeWindow.value = String(state.hours);
  els.search.value = dashboardFilters().query;
  if (els.globalSearch) els.globalSearch.value = dashboardFilters().query;
  window.addEventListener("live-map-render-request", () => { renderNav(); renderFeedControls(); renderChokepointControls(); render(); loadMovingObjects(); });
  document.addEventListener("click", (event) => {
    if (event.target.closest("a")) return;
    const watchSource=event.target.closest('[data-watch-source]'),watchChanges=event.target.closest('[data-watch-changes]');
    if(watchSource||watchChanges){if(watchSource)state.watchSource=watchSource.dataset.watchSource;else state.watchChangeFilter=watchChanges.dataset.watchChanges;state.listPage=0;syncUrlState();render();return;}
    if(event.target.closest('[data-watch-reset]')){clearInspectorSelection();state.mobilePane='feed';state.rightDrawerOpen=true;state.watchSource='';state.watchChangeFilter='all';state.selectedCountryIso3=null;state.mapView.viewportOnly=false;state.mapView.asOf=null;resetDashboardFilters();els.search.value='';els.globalSearch.value='';els.globalSearchResults.hidden=true;state.listPage=0;syncUrlState();render();els.search.focus();return;}
    const mobileButton = event.target.closest('[data-mobile-pane]');
    if (mobileButton) {
      if (state.selectedEventId) clearInspectorSelection();
      state.mobilePane = mobileButton.dataset.mobilePane;
      state.rightDrawerOpen = true;
      render();
      mapController.invalidateMapSize();
      if (state.mobilePane === 'feed') els.search.focus({preventScroll:true});
      return;
    }
    if (event.target.closest('[data-space-lens]')) {
      state.spaceLens = !state.spaceLens;
      event.target.closest('[data-space-lens]').setAttribute('aria-pressed',String(state.spaceLens));
      render();
      document.getElementById('lensGuide').open = state.spaceLens;
      return;
    }
    if (event.target.closest('[data-open-contacts]')) {
      state.mobilePane = 'feed'; state.rightDrawerOpen = true; render();
      const panel = document.getElementById('contactsPanel'); panel.open = true; panel.querySelector('summary').focus();
      return;
    }
    if (event.target.closest('[data-wind-proof-toggle]')) {
      // The existing wind proof draws on Leaflet; expose its actual renderer.
      if (state.mapMode !== '2d') {
        els.mapMode.value = '2d';
        els.mapMode.dispatchEvent(new Event('change', { bubbles:true }));
      }
      const toggle = document.getElementById('windToggle');
      toggle.checked = !toggle.checked;
      toggle.dispatchEvent(new Event('change',{bubbles:true}));
      return;
    }
    const page = event.target.closest('[data-list-page]');
    if(page) { state.listPage = Math.max(0,state.listPage + (page.dataset.listPage==='next'?1:-1)); render(); els.eventList.scrollTop=0; return; }
    const investigateNav = event.target.closest("[data-investigate-nav]");
    if (investigateNav) {
      openInvestigation();
      return;
    }
    const investigateOpen = event.target.closest("[data-investigate-open]");
    if (investigateOpen) {
      openInvestigation(investigateOpen.dataset.investigateOpen);
      return;
    }
    const evidenceSelect = event.target.closest('[data-evidence-select]');
    if (evidenceSelect) {
      const id = evidenceSelect.dataset.evidenceSelect;
      if (!investigation.caseObject?.evidence.some(record => record.id === id)) return;
      state.selectedEvidenceId = id; syncInvestigationUrl(); render();
      els.chokepointDetailDrawer.querySelector('[data-evidence-back]')?.focus();
      return;
    }
    if (event.target.closest('[data-evidence-back]')) {
      const id = state.selectedEvidenceId;
      state.selectedEvidenceId = null; syncInvestigationUrl(); render();
      els.chokepointDetailDrawer.querySelector('[data-evidence-select="'+CSS.escape(id)+'"]')?.focus();
      return;
    }
    const caseSwitch = event.target.closest("[data-investigate-case]");
    if (caseSwitch && event.type === "click") return;
    if (event.target.closest("[data-investigate-review]") && investigation.caseObject?.genuine) {
      return;
    }
    if (event.target.closest("[data-investigate-close]")) {
      investigation.open = false; state.selectedEvidenceId = null;
      syncInvestigationUrl(); render(); renderNav();
      document.querySelector('[data-investigate-nav]')?.focus({preventScroll:true});
      return;
    }
    const investigateTab = event.target.closest("[data-investigate-tab]");
    if (investigateTab) {
      investigation.tab = investigateTab.dataset.investigateTab;
      render();
      return;
    }
    if (event.target.closest("[data-investigate-review]") && investigation.caseObject && !investigation.caseObject.genuine) {
      const current = investigation.caseObject.assessments.at(-1);
      const reviewed = reviewAssessment(current, { reviewer: "human-operator", audience: "local-analyst", now: new Date() });
      if (reviewed.ok) {
        investigation.caseObject.assessments[investigation.caseObject.assessments.length - 1] = reviewed.assessment;
        investigation.tab = "assessment";
      }
      render();
      return;
    }
    const removeEvidence = event.target.closest("[data-investigate-remove]");
    if (removeEvidence && investigation.caseObject) {
      const mutated = applyEvidenceMutation(investigation.caseObject, { removeId: removeEvidence.dataset.investigateRemove, now: new Date(SYNTHETIC_NOW) });
      investigation.caseObject = mutated.caseObject;
      investigation.tab = "changes";
      render();
      return;
    }
    const refreshOnly = event.target.closest("[data-investigate-refresh]");
    if (refreshOnly && investigation.caseObject) {
      const mutated = applyEvidenceMutation(investigation.caseObject, { retrievedAtOnly: { id: refreshOnly.dataset.investigateRefresh, retrievedAt: new Date().toISOString() }, now: new Date() });
      investigation.caseObject = mutated.caseObject;
      investigation.tab = "changes";
      render();
      return;
    }
    const exportBtn = event.target.closest("[data-investigate-export]");
    if (exportBtn && investigation.caseObject) {
      const assessment = investigation.caseObject.assessments.at(-1);
      if (exportBtn.dataset.investigateExport === "markdown") {
        const projection = projectPublicAssessment(assessment, investigation.caseObject, { audience: "local-preview" });
        downloadText(workbenchFilename("markdown"), renderPublicMarkdown(projection), "text/markdown");
      } else {
        downloadText(workbenchFilename("json", investigation.caseObject), serializeCase(investigation.caseObject), "application/json");
      }
      return;
    }
    const area = event.target.closest("[data-area]");
    if (area) {
      investigation.open = false; state.selectedEvidenceId = null;
      syncInvestigationUrl();
      setActiveArea(area.dataset.area);
      render();
      mapController.invalidateMapSize();
      return;
    }
    const expand = event.target.closest("[data-chokepoint-expand], [data-open-history]");
    if (expand) {
      const id = expand.dataset.chokepointExpand || expand.dataset.openHistory;
      state.expandedChokepointId = id;
      state.selectedChokepointId = id;
      openChokepointInspector(chokepointById(id));
      return;
    }
    const chokepointSelect = event.target.closest("[data-chokepoint-select]");
    if (chokepointSelect && !event.target.closest("[data-event-detail]")) {
      openChokepointInspector(chokepointById(chokepointSelect.dataset.chokepointSelect));
      return;
    }
    if (event.target.closest("[data-chokepoint-clear]")) {
      state.selectedChokepointId = null;
      syncUrlState();
      render();
      return;
    }
    const preset = event.target.closest("[data-preset]");
    if (preset) {
      if (state.selectedEventId) clearInspectorSelection();
      applyPreset(preset.dataset.preset);
      document.getElementById('contactsPanel').open = ['ships','flights'].includes(preset.dataset.preset);
      document.getElementById('lensGuide').open = preset.dataset.preset === 'weather';
      els.timeWindow.value = String(state.hours);
      renderFeedControls();
      return;
    }
    const openDrawer = event.target.closest("[data-open-drawer]");
    if (openDrawer) {
      const side = openDrawer.dataset.openDrawer;
      if (side === "left") state.leftDrawerOpen = true;
      if (side === "right") state.rightDrawerOpen = true;
      if (side === "right") state.mobilePane = 'feed';
      workspaceStorage.setItem("live-map-left-drawer-v1", state.leftDrawerOpen ? "open" : "closed");
      workspaceStorage.setItem("live-map-right-drawer-v1", state.rightDrawerOpen ? "open" : "closed");
      render();
      mapController.invalidateMapSize();
      if (side === 'left') els.filterDrawer.querySelector('[data-close-drawer]')?.focus();
      return;
    }
    const closeDrawer = event.target.closest("[data-close-drawer]");
    if (closeDrawer) {
      const side = closeDrawer.dataset.closeDrawer;
      if (side === "left") state.leftDrawerOpen = false;
      if (side === "right") state.rightDrawerOpen = false;
      if (side === "right") state.mobilePane = 'map';
      workspaceStorage.setItem("live-map-left-drawer-v1", state.leftDrawerOpen ? "open" : "closed");
      workspaceStorage.setItem("live-map-right-drawer-v1", state.rightDrawerOpen ? "open" : "closed");
      render();
      mapController.invalidateMapSize();
      return;
    }
    const onboardingPreset = event.target.closest("[data-onboarding-preset]");
    if (onboardingPreset) {
      const selected = onboardingPreset.dataset.onboardingPreset === "country" ? "explore" : onboardingPreset.dataset.onboardingPreset;
      if (onboardingPreset.dataset.onboardingPreset === "country") window.location.href = "/countries";
      applyPreset(selected);
      workspaceStorage.setItem("live-map-onboarding-v1", "done");
      state.onboardingComplete = true;
      els.onboardingDialog?.close();
      return;
    }
    if (event.target.closest("[data-onboarding-skip]")) {
      workspaceStorage.setItem("live-map-onboarding-v1", "done");
      state.onboardingComplete = true;
      els.onboardingDialog?.close();
      return;
    }
    const countrySelect = event.target.closest("[data-country-select]");
    if (countrySelect) {
      selectCountry(countrySelect.dataset.countrySelect);
      return;
    }
    if (event.target.closest("[data-country-clear]")) {
      state.selectedCountryIso3 = null;
      syncUrlState();
      render();
      return;
    }
    const countryEvents = event.target.closest("[data-country-events]");
    if (countryEvents) {
      const country = countryByCode(countryEvents.dataset.countryEvents);
      if (country) {
        state.selectedCountryIso3 = country.iso3;
        syncUrlState();
        render();
      }
      return;
    }
    const dash = event.target.closest("[data-dashboard]");
    if (dash) {
      setDashboard(dash.dataset.dashboard);
      els.search.value = dashboardFilters().query;
      renderNav();
      render();
      return;
    }
    const categoryButton = event.target.closest("[data-category]");
    if (categoryButton) {
      const filters = dashboardFilters();
      const key = categoryButton.dataset.category;
      filters.categories.has(key) ? filters.categories.delete(key) : filters.categories.add(key);
      render();
      return;
    }
    const domainButton = event.target.closest("[data-domain]");
    if (domainButton) {
      const filters = dashboardFilters();
      const key = domainButton.dataset.domain;
      filters.domains.has(key) ? filters.domains.delete(key) : filters.domains.add(key);
      syncUrlState();
      render();
      return;
    }
    const groupToggle = event.target.closest("[data-group-toggle]");
    if (groupToggle) {
      const key = groupToggle.dataset.groupToggle;
      state.collapsedGroups.has(key) ? state.collapsedGroups.delete(key) : state.collapsedGroups.add(key);
      workspaceStorage.setItem("live-map-collapsed-groups-v1", JSON.stringify([...state.collapsedGroups]));
      render();
      return;
    }
    const severityButton = event.target.closest("[data-severity]");
    if (severityButton) {
      const filters = dashboardFilters();
      const key = severityButton.dataset.severity;
      filters.severities.has(key) ? filters.severities.delete(key) : filters.severities.add(key);
      render();
      return;
    }
    if (event.target.closest("[data-v2-mark-seen]")) {
      const saved=saveSnapshot(buildSnapshotFromEvents(state.events,buildEventClusters(state.events)));
      document.getElementById('workspaceMessage').textContent=saved?'All loaded reports marked read. Later source revisions will be compared with this baseline.':'Browser storage is unavailable. The read baseline was not saved.';
      if(saved)state.watchChangeFilter='all';
      syncUrlState();
      render();
      return;
    }
    const artifactActionButton = event.target.closest("[data-v2-artifact-action]");
    if (artifactActionButton) {
      const action = artifactActionButton.dataset.v2ArtifactAction;
      const visibleEvents = currentEvents();
      const visibleClusters = buildEventClusters(visibleEvents);
      let artifact = null;
      if (state.selectedClusterId) {
        const cluster = findClusterById(visibleClusters, state.selectedClusterId);
        if (cluster) artifact = buildClusterArtifact(cluster, { allEvents: visibleEvents });
      } else if (state.selectedEventId) {
        const selected = visibleEvents.find((item) => item.id === state.selectedEventId)
          || state.events.find((item) => item.id === state.selectedEventId)
          || null;
        if (selected) {
          const changeStatus = null;
          artifact = buildEventArtifact(selected, {
            allEvents: visibleEvents,
            clusters: visibleClusters,
            changeStatus,
          });
        }
      }
      if (artifact) {
        const group = artifactActionButton.closest('[aria-label="Export artifact"]');
        let output = group?.querySelector('[data-export-status]');
        if (group && !output) {
          output = document.createElement('output');
          output.dataset.exportStatus = '';
          output.setAttribute('role', 'status');
          group.appendChild(output);
        }
        runArtifactExportAction(action, artifact).then((ok) => {
          if (output) output.textContent = ok
            ? action.startsWith('copy') ? 'Copied to clipboard.' : 'Download requested. Check your browser downloads.'
            : 'Export could not complete. Try the other copy or download option.';
        }).catch(() => { if (output) output.textContent = 'Export could not complete. Try the other copy or download option.'; });
      }
      return;
    }
    const timelineButton = event.target.closest("[data-v2-timeline-event]");
    if (timelineButton) {
      const eventRecord = [...state.events, ...exchangeMarkers()].find((item) => item.id === timelineButton.dataset.v2TimelineEvent);
      if (eventRecord) openEventInspector(eventRecord, { openModal: false });
      return;
    }
    const clusterButton = event.target.closest("[data-v2-cluster]");
    if (clusterButton) {
      const clusters = buildEventClusters(currentEvents());
      const cluster = clusters.find((item) => item.clusterId === clusterButton.dataset.v2Cluster);
      if (cluster) openClusterInspector(cluster);
      return;
    }
    const detailButton = event.target.closest("[data-event-detail]");
    if (detailButton) {
      // Chokepoint briefs can contain derived scenario events absent from the raw provider array.
      const eventRecord = [...buildChokepointIntelligence().events, ...state.events, ...exchangeMarkers()]
        .find((item) => item.id === detailButton.dataset.eventDetail);
      if (eventRecord) openEventInspector(eventRecord);
      return;
    }
    if (event.target.closest("[data-v2-close-detail]")) {
      clearInspectorSelection();
      return;
    }
    if (event.target.closest("[data-v2-clear-selection]")) {
      clearInspectorSelection();
      return;
    }
    if (event.target.closest("[data-v2-clear-filters]")) {
      resetDashboardFilters();
      els.search.value = "";
      els.timeWindow.value = "168";
      state.hours = 168;
      syncUrlState();
      render();
      return;
    }
    const filterChip = event.target.closest("[data-v2-filter]");
    if (filterChip) {
      const filters = dashboardFilters();
      const type = filterChip.dataset.v2Filter;
      const key = filterChip.dataset.v2FilterKey;
      if (type === "domain") filters.domains.delete(key);
      if (type === "category") filters.categories.delete(key);
      if (type === "severity") filters.severities.delete(key);
      if (type === "query") {
        filters.query = "";
        els.search.value = "";
        syncUrlState();
      }
      if (type === "time") {
        state.hours = 168;
        els.timeWindow.value = "168";
        loadEvents(true);
        return;
      }
      syncUrlState();
      render();
      return;
    }
    const card = event.target.closest("[data-id]");
    if (card && !event.target.closest("a,button,[data-v2-timeline-event],[data-v2-cluster]")) {
      const eventRecord = [...state.events, ...exchangeMarkers()].find((item) => item.id === card.dataset.id);
      if (eventRecord) openEventInspector(eventRecord);
      return;
    }
    if (event.target.id === "openCiiMethod") openMethodologyDialog(els.methodologyDialog, els.methodologyContent);
    if (event.target.closest("[data-provider-retry]")) loadEvents(true);
    const basemapSwitch = event.target.closest("[data-basemap-switch]");
    if (basemapSwitch) {
      els.baseMap.value = basemapSwitch.dataset.basemapSwitch;
      mapController.switchBase(basemapSwitch.dataset.basemapSwitch);
    }
  });

  let lastDrawerTrigger = null;
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === "k") {
      event.preventDefault();
      els.globalSearch?.focus();
      return;
    }
    const chokepointCard = event.target.closest?.("[data-chokepoint-select]");
    if (chokepointCard && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openChokepointInspector(chokepointById(chokepointCard.dataset.chokepointSelect));
      return;
    }
    if (event.key === "Escape") {
      if (investigation.open) {
        if (state.selectedEvidenceId) {
          if (investigation.tab === 'evidence') document.querySelector('[data-evidence-back]')?.click();
          else {state.selectedEvidenceId = null; investigation.tab = 'evidence'; syncInvestigationUrl(); render();}
          return;
        }
        investigation.open = false;
        syncInvestigationUrl(); render(); renderNav();
        return;
      }
      if (state.selectedEventId && !state.leftDrawerOpen) { clearInspectorSelection(); return; }
      state.leftDrawerOpen = false;
      workspaceStorage.setItem("live-map-left-drawer-v1", "closed");
      render();
      mapController.invalidateMapSize();
      (lastDrawerTrigger || document.getElementById("layersDrawerToggle"))?.focus();
    }
  });

  els.search.addEventListener("input", (event) => {
    state.queryByDashboard.set(state.dashboard, event.target.value);
    syncUrlState();
    render();
  });
  const updateChokepointFilter = (key, value) => {
    state.chokepointFilters[key] = value;
    state.selectedChokepointId = null;
    syncUrlState();
    render();
  };
  els.chokepointSearch?.addEventListener("input", (event) => updateChokepointFilter("query", event.target.value));
  els.chokepointRegion?.addEventListener("change", (event) => updateChokepointFilter("region", event.target.value));
  els.chokepointType?.addEventListener("change", (event) => updateChokepointFilter("type", event.target.value));
  els.chokepointStatus?.addEventListener("change", (event) => updateChokepointFilter("status", event.target.value));
  els.chokepointDomain?.addEventListener("change", (event) => updateChokepointFilter("domain", event.target.value));
  els.chokepointSort?.addEventListener("change", (event) => updateChokepointFilter("sort", event.target.value));
  els.resetChokepointFilters?.addEventListener("click", () => {
    state.chokepointFilters = { query: "", region: "", type: "", status: "", domain: "", sort: "priority" };
    state.selectedChokepointId = null;
    syncUrlState();
    renderChokepointControls();
    render();
  });
  els.globalSearch?.addEventListener("input", (event) => {
    const query = event.target.value;
    const results = buildGlobalSearchResults(query, currentEvents(), state.movingObjects);
    const grouped = groupSearchResults(results);
    els.globalSearchResults.hidden = !query.trim();
    els.globalSearchResults.innerHTML = Object.entries(grouped).map(([group, items]) => `<section><strong>${escapeHtml(group)}</strong>${items.map((item, index) => `<button type="button" data-search-result="${escapeHtml(group)}:${index}"><span>${escapeHtml(item.label)}</span><small>${escapeHtml(item.description || "")}</small></button>`).join("")}</section>`).join("");
    if(query.trim()&&!results.length)els.globalSearchResults.innerHTML='<p class="search-no-results" role="status">No matches in this view. Try another place or clear report filters.</p><button type="button" data-watch-reset>Clear report filters</button>';
    els.globalSearchResults._results = grouped;
  });
  els.globalSearch?.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();els.globalSearchResults.querySelector('button')?.focus();}if(event.key==='Escape'){els.globalSearchResults.hidden=true;event.stopPropagation();}});
  els.globalSearchResults?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-search-result]");
    if (!button) return;
    const [group, indexText] = button.dataset.searchResult.split(":");
    const item = els.globalSearchResults._results?.[group]?.[Number(indexText)];
    if (!item) return;
    const payload = item.payload;
    if (payload.action === "country") selectCountry(payload.iso3);
    if (["airport", "port"].includes(payload.action)) mapController.map.setView([payload.latitude, payload.longitude], 8);
    if(payload.action==='event'){const found=currentEvents().find(e=>e.id===payload.id);if(found)openEventInspector(found);}
    if (payload.action === "moving-object") mapController.map.setView([payload.latitude, payload.longitude], 8);
    if (payload.action === "chokepoint") openChokepointInspector(chokepointById(payload.id));
    if (payload.action === "case") {
      investigation.mode = payload.id === "synthetic-hormuz-2026-06" ? "synthetic" : "genuine";
      investigation.caseObject = null;
      investigation.open = true;
      openChokepointInspector(chokepointById(payload.chokepointId));
      ensureInvestigation(payload.chokepointId).then(() => render());
    }
    if (payload.action === "source" && payload.url) window.open(payload.url, "_blank", "noopener,noreferrer");
    els.globalSearchResults.hidden = true;
    syncUrlState();
  });
  els.timeWindow.addEventListener("change", (event) => { state.hours = Number(event.target.value); syncUrlState(); loadEvents(true); });
  document.getElementById('applyTime')?.addEventListener('click', () => {
    const input = document.getElementById('asOfInput');
    const end = input.value ? Date.parse(`${input.value}Z`) : NaN;
    if (!Number.isFinite(end)) { input.setCustomValidity('Choose a valid UTC date and time.'); input.reportValidity(); return; }
    input.setCustomValidity('');
    clearInspectorSelection();
    state.mapView.asOf = new Date(end).toISOString(); state.listPage = 0;
    syncUrlState(); render();
    document.getElementById('timeBrowser').open = false;
    document.querySelector('#timeBrowser>summary').focus();
  });
  document.getElementById('asOfInput')?.addEventListener('input', event => event.target.setCustomValidity(''));
  document.getElementById('availableTime')?.addEventListener('click', () => {
    clearInspectorSelection();
    state.mapView.asOf = null; state.listPage = 0;
    syncUrlState(); render();
    document.getElementById('asOfInput').value = '';
    document.getElementById('timeBrowser').open = false;
    document.querySelector('#timeBrowser>summary').focus();
  });
  els.sortOrder.addEventListener("change", (event) => { state.sort = event.target.value; syncUrlState(); render(); });
  els.groupBy.addEventListener("change", (event) => { state.groupBy = event.target.value; syncUrlState(); render(); });
  els.cardMode.addEventListener("change", (event) => { state.cardMode = event.target.value; syncUrlState(); render(); });
  els.savedViews.addEventListener("change", (event) => {
    const view = loadSavedViews().find((item) => item.name === event.target.value);
    if (!view) return;
    clearInspectorSelection();
    if (view.dashboard) setDashboard(view.dashboard);
    if (view.sort) state.sort = view.sort;
    if (view.groupBy) state.groupBy = view.groupBy;
    if (view.cardMode) state.cardMode = view.cardMode;
    const filters = dashboardFilters();
    filters.domains.clear();
    (view.domains || []).forEach((domain) => filters.domains.add(domain));
    if(view.categories) { filters.categories.clear(); view.categories.filter(k=>CATEGORIES[k]).forEach(k=>filters.categories.add(k)); }
    if(view.severities) { filters.severities.clear(); view.severities.filter(k=>SEVERITIES[k]).forEach(k=>filters.severities.add(k)); }
    if(view.recordKinds) { filters.recordKinds.clear();view.recordKinds.filter(k=>['event','observation','discovery-lead','moving-object'].includes(k)).forEach(k=>filters.recordKinds.add(k)); }
    if([24,72,168,720].includes(view.hours)) state.hours=view.hours;
    state.queryByDashboard.set(state.dashboard,String(view.query || '').slice(0,200));
    if(view.version===1 && view.mapView) { state.mapView=validateMapView(view.mapView); state.mapMode=state.mapView.mapMode; Object.keys(state.tracking).forEach(k=>state.tracking[k]=state.mapView[k]); mapController.map.setView([state.mapView.lat,state.mapView.lon],state.mapView.zoom); mapController.switchBase(state.mapView.basemap); }
    els.search.value=dashboardFilters().query; els.timeWindow.value=String(state.hours); els.baseMap.value=state.mapView.basemap;
    renderFeedControls();
    syncUrlState();
    render();
    if (state.mapMode !== '2d') getGlobeHandle()?.applyView?.(state.mapView);
  });
  els.saveView.addEventListener("click", () => {
    const name = window.prompt("Save current view as:", `${getDashboard(state.dashboard).label} view`);
    if (!name) return;
    const saved = saveView(serializeView(state, dashboardFilters(), name));
    document.getElementById('workspaceMessage').textContent = saved ? 'View saved.' : 'Storage is blocked. Copy the browser URL to keep this view.';
    renderFeedControls();
  });
  els.clearDomains.addEventListener("click", () => { dashboardFilters().domains.clear(); syncUrlState(); render(); });
  els.clearFilters.addEventListener("click", () => { resetDashboardFilters(); els.search.value = ""; renderFeedControls(); render(); });
  els.fitWorld.addEventListener("click", () => {
    if (state.mapMode !== '2d' && getGlobeHandle()?.ok) getGlobeHandle().viewGlobal();
    else mapController.fitWorld();
  });
  els.fitEvents.addEventListener("click", () => mapController.fitEvents(currentEvents()));
  els.baseMap.addEventListener("change", (event) => { state.mapView.basemap=event.target.value; mapController.switchBase(event.target.value); syncUrlState(); });
  els.dataMode?.addEventListener("change", (event) => {
    const next = event.target.value;
    const url = new URL(window.location.href);
    if (next === "public") {
      url.searchParams.delete("demo");
      url.searchParams.set("data", "public");
    } else {
      url.searchParams.set("demo", "foundation");
      url.searchParams.set("data", "mixed");
    }
    window.location.assign(url.href);
  });
  els.mapMode.addEventListener("change", (event) => {
    const view = { ...state.mapView };
    state.mapMode = event.target.value;
    state.mapView.mapMode = event.target.value;
    syncUrlState();
    render();
    if (state.mapMode === '2d') window.requestAnimationFrame(() => {
      mapController.map.invalidateSize({ pan: false });
      mapController.map.setView([view.lat, view.lon], view.zoom, { animate: false });
      render();
    });
    mapController.invalidateMapSize();
  });
  els.ciiToggle.addEventListener("click", () => { state.ciiVisible = !state.ciiVisible; els.ciiToggle.classList.toggle("active", state.ciiVisible); render(); });
  els.advancedMode?.addEventListener("change", (event) => {
    state.interfaceMode = event.target.checked ? "advanced" : "standard";
    workspaceStorage.setItem("live-map-interface-mode-v1", state.interfaceMode);
    render();
    mapController.invalidateMapSize();
  });
  els.aircraftToggle?.addEventListener("change", (event) => {
    state.tracking.aircraft = event.target.checked;
    syncUrlState();
    loadMovingObjects();
    scheduleMovingRefresh();
  });
  els.vesselToggle?.addEventListener("change", (event) => {
    state.tracking.vessels = event.target.checked;
    syncUrlState();
    loadMovingObjects();
    scheduleMovingRefresh();
  });
  els.airportsToggle?.addEventListener("change", (event) => { state.tracking.airports = event.target.checked; syncUrlState();render(); });
  els.portsToggle?.addEventListener("change", (event) => { state.tracking.ports = event.target.checked; syncUrlState();render(); });
  els.mapListToggle?.addEventListener("click", () => {
    state.mobilePane = state.mobilePane === 'map' ? 'feed' : 'map';
    state.rightDrawerOpen = !state.rightDrawerOpen;
    if (window.matchMedia('(max-width:900px)').matches) state.rightDrawerOpen = true;
    workspaceStorage.setItem("live-map-right-drawer-v1", state.rightDrawerOpen ? "open" : "closed");
    render();
    mapController.invalidateMapSize();
  });
  els.locateMap?.addEventListener("click", () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => mapController.map.setView([position.coords.latitude, position.coords.longitude], 6));
  });
  els.resetWorkspace?.addEventListener("click", () => {
    clearInspectorSelection();
    state.mobilePane = 'map';
    state.leftDrawerOpen = false;
    state.rightDrawerOpen = true;
    state.selectedCountryIso3 = null;
    state.selectedEventId = null;
    state.selectedClusterId = null;
    state.selectedChokepointId = null;
    state.spaceLens = false;
    state.mapView.asOf = null;
    state.mapView.viewportOnly = false;
    state.mapView.verification = 'all';
    for (const key of ['graph','weather','density','activity','orbital']) state.mapView[key] = false;
    for (const id of ['windToggle','recordedWindToggle']) {
      const toggle = document.getElementById(id);
      if (toggle?.checked) { toggle.checked = false; toggle.dispatchEvent(new Event('change', { bubbles:true })); }
    }
    for (const key of state.queryByDashboard.keys()) state.queryByDashboard.set(key, '');
    state.queryByDashboard.set('primary', '');
    els.search.value = ''; if (els.globalSearch) els.globalSearch.value = '';
    state.tracking.aircraft = false;
    state.tracking.vessels = false;
    workspaceStorage.setItem("live-map-left-drawer-v1", "closed");
    workspaceStorage.setItem("live-map-right-drawer-v1", "open");
    applyPreset("explore");
  });
  els.refreshNow.addEventListener("click", () => loadEvents(true));
  els.themeToggle.addEventListener("click", () => document.documentElement.classList.toggle("light"));
  els.closeDialog.addEventListener("click", () => els.eventDialog.close());
  els.closeMethodology.addEventListener("click", () => els.methodologyDialog.close());
  els.eventDialog.addEventListener("click", (event) => { if (event.target === els.eventDialog) els.eventDialog.close(); });
  els.methodologyDialog.addEventListener("click", (event) => { if (event.target === els.methodologyDialog) els.methodologyDialog.close(); });

  if (state.demo) {
    const stageId = state.mapView.scenarioStage || (state.selectedChokepointId === SYNTHETIC_CHOKEPOINT_ID ? "diplomacy-with-low-throughput" : "restriction");
    if (state.selectedChokepointId || startupParams.has('scenario')) applyScenarioStage(stageId, { renderAfter: false });
    if (state.selectedChokepointId === SYNTHETIC_CHOKEPOINT_ID) state.mapView.chokepoints = true;
    state.mapView.basemap = "local-earth";
    state.dataMode = "mixed";
    mapController.switchBase("local-earth");
  } else if (state.mapView.basemap === "dark" || state.mapView.basemap === "local-earth") {
    mapController.switchBase(state.mapView.basemap);
  }
  loadEvents().then(() => {
    if (state.selectedChokepointId) {
      const selected = chokepointById(state.selectedChokepointId);
      if (selected) openChokepointInspector(selected);
    }
  });
  loadMovingObjects();
  scheduleMovingRefresh();
  document.addEventListener("visibilitychange", () => {
    if(document.hidden) { movingRequest++; movingAbort?.abort(); }
    else if (changeCursor) scheduleChangePoll(changeCursor, 1000);
    scheduleMovingRefresh();
  });
  let viewportTimer;
  mapController.map.on('moveend',()=>{
    const center=mapController.map.getCenter(); Object.assign(state.mapView,{lat:center.lat,lon:center.lng,zoom:mapController.map.getZoom()}); syncUrlState();
    movingRequest++; movingAbort?.abort(); clearTimeout(viewportTimer);
    viewportTimer=setTimeout(()=>{render();loadMovingObjects();scheduleMovingRefresh();},200);
  });
  for(const [id,key] of [['viewportOnly','viewportOnly'],['chokepointsToggle','chokepoints'],['graphToggle','graph'],['densityToggle','density'],['activityToggle','activity'],['orbitalToggle','orbital'],['recordedWindToggle','weather']]) document.getElementById(id)?.addEventListener('change',e=>{state.mapView[key]=e.target.checked;state.listPage=0;syncUrlState();render();});
  document.getElementById('verificationFilter').addEventListener('change',e=>{state.mapView.verification=e.target.value;state.listPage=0;syncUrlState();render();});
  document.getElementById('layerSearch').addEventListener('input',e=>{const q=e.target.value.toLowerCase();els.layerFilters.querySelectorAll('button').forEach(b=>b.hidden=!b.textContent.toLowerCase().includes(q));});
  document.getElementById('demoBanner').hidden=!state.demo;
  document.getElementById('windControls').hidden=!state.demo;
  if(state.demo) {
    let wind;
    let recordedWind;
    const updateWind=async()=>{
      const toggle=document.getElementById('windToggle');
      const recorded=document.getElementById('recordedWindToggle');
      if(!wind && toggle.checked) { const module=await import('./map/wind-proof.js'); wind=module.createWindProof(mapController.map); }
      wind?.set(toggle.checked,Number(document.getElementById('windOpacity').value));
      if (recorded?.checked && !recordedWind) {
        const [fieldModule, json] = await Promise.all([import('./map/wind-field.js'), fetch('./data/development-fixtures/gfs-10m-recorded-sample.json').then((r)=>r.json())]);
        recordedWind = fieldModule.createWindFieldRenderer(mapController.map, json, { synthetic: false });
      }
      recordedWind?.set(Boolean(recorded?.checked), Number(document.getElementById('windOpacity').value));
      document.getElementById('demoBanner').textContent=toggle.checked?SYNTHETIC_WIND: recorded?.checked ? recordedWindUiLabel():'SYNTHETIC DEMO — invented test scenarios, not live intelligence';
    };
    document.getElementById('windToggle').addEventListener('change',updateWind);
    document.getElementById('recordedWindToggle')?.addEventListener('change',updateWind);
    document.getElementById('windOpacity').addEventListener('input',updateWind);
  }
  document.getElementById("scenarioStage")?.addEventListener("change", (event) => applyScenarioStage(event.target.value));
  document.addEventListener("change", (event) => {
    const caseSwitch = event.target.closest?.("[data-investigate-case]");
    if (caseSwitch) {
      investigation.mode = caseSwitch.value === AVIATION_CASE_ID ? 'aviation' : caseSwitch.value === "synthetic-hormuz-2026-06" ? "synthetic" : "genuine";
      investigation.caseObject = null;
      investigation.open = true; state.selectedEvidenceId = null; investigation.selectionNotice = null;
      ensureInvestigation(state.selectedChokepointId || "strait-of-hormuz").then(() => {syncInvestigationUrl(); render();});
      return;
    }
    const input = event.target.closest?.("[data-investigate-import]");
    if (!input?.files?.[0]) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCaseFile(String(reader.result || ""));
      if (!parsed.ok) {
        if (els.feedError) {
          els.feedError.hidden = false;
          els.feedError.textContent = `Import rejected: ${parsed.errors.join("; ")}`;
        }
        return;
      }
      state.selectedEvidenceId = null;
      caseLoadGeneration += 1;
      investigation.mode = 'imported';
      investigation.caseObject = parsed.caseObject;
      investigation.open = true;
      investigation.tab = "changes";
      syncInvestigationUrl(); render();
    };
    reader.readAsText(file);
  });
  document.addEventListener("click", (event) => {
    const opener = event.target.closest?.("[data-open-drawer]");
    if (opener) lastDrawerTrigger = opener;
  });
  window.matchMedia('(max-width:900px)').addEventListener('change', () => { applyShellState(els); mapController.invalidateMapSize(); });
  if (investigation.open) openInvestigation();
  setInterval(() => renderStats(els, currentEvents()), 30000);
}
