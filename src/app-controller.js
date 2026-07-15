import { CONFIG, CATEGORIES, SEVERITIES } from "./config.js";
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
import { setGlobeMode } from "./map/globe-controller.js";
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
import { renderLatestIntelligence } from "./ui/latest-intelligence.js";

function ids(names) {
  return Object.fromEntries(names.map((id) => [id, document.getElementById(id)]));
}

const EVENT_CACHE_KEY = "live-map-last-successful-events-v2";
const RETRY_BASE_MS = 30000;
const RETRY_CAP_MS = 5 * 60 * 1000;

function quakeSeverity(magnitude) {
  return magnitude >= 7 ? "critical" : magnitude >= 6 ? "high" : magnitude >= 4.5 ? "medium" : "low";
}

function normalizeUSGS(feature) {
  const properties = feature.properties || {};
  const coords = feature.geometry?.coordinates || [0, 0, 0];
  const magnitude = Number(properties.mag || 0);
  const depth = Number(coords[2] || 0);
  return normalizeEvent({
    id: `usgs-${feature.id}`,
    providerId: feature.id,
    category: "earthquake",
    severity: quakeSeverity(magnitude),
    title: properties.title || `Magnitude ${magnitude.toFixed(1)} earthquake`,
    summary: `Magnitude ${magnitude.toFixed(1)} earthquake at approximately ${depth.toFixed(1)} km depth. ${properties.status === "reviewed" ? "Reviewed by USGS." : "Preliminary automated solution; details may change."}`,
    lat: coords[1],
    lon: coords[0],
    country: (properties.place || "Unknown").split(",").pop().trim(),
    place: properties.place || "Unknown location",
    occurredAt: properties.time,
    updatedAt: properties.updated,
    source: "USGS Earthquake Hazards Program",
    sourceUrl: properties.url,
    sourceType: "Official",
    providerUrl: "https://earthquake.usgs.gov/earthquakes/feed/",
    confidence: properties.status === "reviewed" ? 98 : 90,
    verificationStatus: properties.status === "reviewed" ? "Provider reviewed" : "Preliminary",
    coordinateMethod: "official epicenter",
    severityReason: `Magnitude ${magnitude.toFixed(1)} earthquake at ${depth.toFixed(1)} km depth.`,
    details: {
      Magnitude: magnitude.toFixed(1),
      Depth: `${depth.toFixed(1)} km`,
      Status: properties.status || "unknown",
      Tsunami: properties.tsunami ? "Possible/flagged" : "No flag",
      Felt: properties.felt ?? "Not reported",
      Significance: properties.sig ?? "-",
      Coordinates: `${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}`,
    },
  });
}

function classifyFetchError(error) {
  if (!navigator.onLine) return "browser-offline";
  if (error?.name === "AbortError") return "timeout";
  const message = String(error?.message || "");
  if (/JSON|Unexpected token/i.test(message)) return "non-json-response";
  if (/API 5|Function/i.test(message)) return "event-api-unavailable";
  if (/Failed to fetch|NetworkError|ERR_NAME_NOT_RESOLVED|Name not resolved|Load failed/i.test(message)) return "dns-network-failure";
  if (/API [4-5]\d\d|USGS [4-5]\d\d/i.test(message)) return "http-error";
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
      return "Event provider returned an HTTP error.";
    default:
      return "Event data temporarily unavailable.";
  }
}

function readEventCache() {
  try {
    return JSON.parse(localStorage.getItem(EVENT_CACHE_KEY) || "null");
  } catch {
    return null;
  }
}

function writeEventCache(result) {
  try {
    localStorage.setItem(EVENT_CACHE_KEY, JSON.stringify({
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

async function directFallback() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs);
  let data;
  try {
    const response = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson", { cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(`USGS ${response.status}`);
    data = await response.json();
  } finally {
    clearTimeout(timeout);
  }
  return {
    events: data.features.map(normalizeUSGS),
    generatedAt: Date.now(),
    sources: ["USGS direct fallback"],
    sourceStatus: { usgs: { ok: true, count: data.features.length, message: "Direct fallback" } },
    errors: ["Event API was unavailable, so the browser loaded USGS directly."],
    mode: "fallback",
  };
}

function sourceButton(event) {
  if (!event.sourceUrl) return "";
  return `<a class="mini-source-link" href="${escapeHtml(event.sourceUrl)}" target="_blank" rel="noopener noreferrer">Source</a>`;
}

function countryForDisplay(event) {
  return countryForEvent(event);
}

function qualityBadges(event) {
  const kind = (event.recordKind || "event").replace(/-/g, " ");
  const verification = consumerVerificationLabel(event.verificationStatus || event.verification?.state || "reported");
  return `<div class="quality-row"><span class="advanced-only">Content type: ${escapeHtml(kind)}</span><span>Severity: ${escapeHtml(event.severity)}</span><span class="advanced-only">Confidence: ${Math.round(event.confidence || 0)}%</span><span>${escapeHtml(verification)}</span><span>Sources: ${escapeHtml(event.independentSourceCount || 1)}</span><span>Last updated: ${escapeHtml(relativeTime(event.updatedAt || event.occurredAt))}</span></div>`;
}

function consumerVerificationLabel(value = "") {
  const normalized = String(value).toLowerCase();
  if (normalized.includes("corroborated")) return "Confirmed by multiple sources";
  if (normalized.includes("primary")) return "Official source";
  if (normalized.includes("unverified")) return "Unverified report";
  if (normalized.includes("single")) return "Single source";
  return "Reported";
}

function renderEventCard(event) {
  const expanded = state.cardMode === "expanded";
  const country = countryForDisplay(event);
  const countryLabel = country ? `<button type="button" class="country-badge" data-country-select="${country.iso3}">${escapeHtml(country.shortName || country.name)}</button>` : `<span>${escapeHtml(event.country)}</span>`;
  const summary = expanded ? `<p>${escapeHtml(event.summary)}</p>` : "";
  const details = expanded ? `<div class="event-facts"><span class="fact-chip">Occurred: ${escapeHtml(new Date(event.occurredAt).toLocaleString())}</span><span class="fact-chip">Reported: ${escapeHtml(new Date(event.firstReportedAt || event.occurredAt).toLocaleString())}</span><span class="fact-chip">Updated: ${escapeHtml(new Date(event.updatedAt || event.occurredAt).toLocaleString())}</span>${event.geographic === false ? `<span class="fact-chip">Not mapped: ${escapeHtml(event.nonGeographicReason || "no supported geography")}</span>` : ""}${event.incidentSize > 1 ? `<span class="fact-chip">Incident: ${escapeHtml(event.incidentSize)} linked events</span>` : ""}</div>` : "";
  const location = event.geographic === false ? "No map location" : event.place || event.country || "Location pending";
  const chokepointContext = event.affectedChokepoints?.length ? `<p class="event-chokepoint-line">Strategic area: ${escapeHtml(event.affectedChokepoints.slice(0, 2).join(", "))}</p>` : "";
  return `<article class="event-card ${expanded ? "expanded" : "compact"} record-${escapeHtml(event.recordKind || "event")}" data-id="${escapeHtml(event.id)}"><div class="event-meta"><span class="category-pill" style="--cat:${event.taxonomyColor || CATEGORIES[event.category]?.color || CATEGORIES.other.color}">${escapeHtml(event.domainLabel || CATEGORIES[event.category]?.label || "Other")}</span><span>${escapeHtml(event.typeLabel || event.category)}</span>${countryLabel}<span class="record-kind advanced-only">${escapeHtml(event.recordKind || "event")}</span><span class="severity-tag" style="--sev:${SEVERITIES[event.severity]?.color || SEVERITIES.low.color}">${SEVERITIES[event.severity]?.label || event.severity}</span></div><h2>${escapeHtml(event.title)}</h2><div class="consumer-card-line"><span>${escapeHtml(location)}</span><span>${escapeHtml(relativeTime(event.updatedAt || event.occurredAt))}</span></div>${summary}${chokepointContext}${qualityBadges(event)}${details}<div class="source-row ${state.interfaceMode === "standard" ? "standard-source-row" : ""}"><span>${escapeHtml(event.sourceName || "Source")}</span><span>${escapeHtml(consumerVerificationLabel(event.verificationStatus))}</span>${event.incidentSize > 1 ? `<span class="advanced-only">${escapeHtml(event.incidentTitle || "Incident cluster")}</span>` : ""}${sourceButton(event)}<button type="button" class="mini-source-link event-detail-button" data-event-detail="${escapeHtml(event.id)}">View details</button></div><div class="event-foot advanced-only"><span>${relativeTime(event.occurredAt)} occurred - ${escapeHtml(event.sourceType)}</span><span class="confidence">${event.confidence}% confidence</span></div></article>`;
}

function renderList(els, events) {
  if (state.activeArea === "chokepoints") {
    const chokepoints = filterChokepoints(STRATEGIC_CHOKEPOINTS, state.chokepointAssessments, state.chokepointFilters);
    els.eventList.innerHTML = renderChokepointCards(chokepoints, state.chokepointAssessments, state.selectedChokepointId);
    return;
  }
  if (state.activeArea === "latest-intelligence") {
    els.eventList.innerHTML = renderLatestIntelligence(state.storylines, state.observations);
    return;
  }
  if (!events.length) {
    const filters = dashboardFilters();
    const selectedDomain = filters.domains.size === 1 ? [...filters.domains][0] : null;
    const message = selectedDomain ? emptyDomainMessage(selectedDomain, state.events, true, state.sourceStatus) : "No events match the selected filters and time range.";
    els.eventList.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
    return;
  }
  const groups = groupEvents(events, state.groupBy, state.sourceStatus);
  els.eventList.innerHTML = groups.map((group) => {
    const collapsed = state.collapsedGroups.has(group.id);
    const warning = group.stats.providerWarning ? '<span class="group-warning">provider warning</span>' : "";
    return `<section class="event-group"><button class="group-header" type="button" data-group-toggle="${escapeHtml(group.id)}"><span>${collapsed ? "+" : "-"}</span><strong>${escapeHtml(group.label)}</strong><small>${group.stats.total} events / ${group.stats.highCount} high / ${group.stats.newCount} new / updated ${group.stats.newestUpdate}</small>${warning}</button><div class="group-body" ${collapsed ? "hidden" : ""}>${group.events.slice(0, 80).map(renderEventCard).join("")}${group.events.length > 80 ? `<div class="empty">${group.events.length - 80} more events hidden for performance.</div>` : ""}</div></section>`;
  }).join("");
}

function renderFilters(els) {
  const filters = dashboardFilters();
  els.domainFilters.innerHTML = domainOptions().map((domain) => `<button class="filter-item ${filters.domains.has(domain.id) ? "active" : ""}" title="Domains organize events by intelligence category." style="--category:${domain.defaultColor}" data-domain="${domain.id}"><span><i class="dot"></i>${domain.label}</span><b>${state.events.filter((event) => event.domain === domain.id).length}</b></button>`).join("");
  els.layerFilters.innerHTML = Object.entries(CATEGORIES).map(([key, category]) => `<button class="filter-item ${filters.categories.has(key) ? "active" : ""}" title="Layers control which concrete event types appear on the map." style="--category:${category.color}" data-category="${key}"><span><i class="dot"></i>${category.label}</span><b>${state.events.filter((event) => event.category === key).length}</b></button>`).join("");
  els.severityFilters.innerHTML = Object.entries(SEVERITIES).map(([key, severity]) => `<button class="severity-btn ${filters.severities.has(key) ? "active" : ""}" style="--sev:${severity.color}" data-severity="${key}">${severity.label}</button>`).join("");
  const activeDomains = domainOptions().filter((domain) => state.events.some((event) => event.domain === domain.id));
  const recordLegend = state.events.some((event) => (event.recordKind || "event") !== "event")
    ? '<div class="legend-row"><i class="dot record-dot"></i>Discovery/observation records</div>'
    : "";
  els.mapLegend.innerHTML = activeDomains.map((domain) => `<div class="legend-row"><i class="dot" style="--category:${domain.defaultColor}"></i>${domain.label}</div>`).join("") + recordLegend;
}

function renderMapHealth(element, health) {
  if (!element || !health) return;
  const show = ["degraded", "unavailable"].includes(health.tileStatus) || health.containerWidth <= 0 || health.containerHeight <= 0;
  element.hidden = !show;
  if (!show) return;
  element.innerHTML = `<strong>Map ${escapeHtml(health.tileStatus)}</strong><p>${escapeHtml(health.safeMessage)}</p><div><button type="button" data-basemap-switch="dark">Switch to Dark Map</button><button type="button" data-basemap-switch="street">Switch to Street Map</button></div>`;
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
  const statuses = Object.values(state.sourceStatus || {});
  const available = statuses.filter((status) => status.ok).length;
  const stale = statuses.filter((status) => status.stale || status.status === "degraded").length;
  const disabled = statuses.filter((status) => status.status === "disabled" || status.status === "configuration-required").length;
  const unavailable = statuses.filter((status) => !status.ok && !["disabled", "configuration-required"].includes(status.status)).length;
  const label = state.systemStatus === "operational" ? "Operational" : state.systemStatus === "partial-data" ? "Some data delayed" : state.systemStatus === "major-provider-outage" ? "Offline" : "Some data delayed";
  const tools = state.interfaceMode === "advanced" ? '<p><a href="/diagnostics">Technical diagnostics</a></p>' : "";
  return `<strong>Public data status</strong><p>${escapeHtml(label)}. Last refreshed ${state.lastLoaded ? escapeHtml(relativeTime(state.lastLoaded)) : "never"}. ${available} live, ${stale} degraded, ${unavailable} unavailable, ${disabled} disabled or credential-gated.</p><p>Public data only. May be delayed or incomplete. Verify with original sources; not for emergency or professional decisions.</p>${tools}`;
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
  state.dashboard = preset.dashboard;
  state.activeArea = preset.activeArea || "explore";
  state.selectedChokepointId = preset.chokepointId || null;
  if (preset.chokepointFilters) state.chokepointFilters = { ...state.chokepointFilters, ...preset.chokepointFilters };
  state.hours = preset.timeWindow;
  state.tracking.aircraft = Boolean(preset.aviationEnabled);
  state.tracking.vessels = Boolean(preset.maritimeEnabled);
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
  localStorage.setItem("live-map-preset-v1", preset.id);
  syncUrlState();
  if (renderAfter) window.dispatchEvent(new CustomEvent("live-map-render-request"));
}

function standardEventVisible(event) {
  if (state.interfaceMode === "advanced") return true;
  const recordKind = event.recordKind || "event";
  if (recordKind === "discovery-lead" || recordKind === "observation") return false;
  if (!["high", "critical"].includes(event.severity) && !["weather", "natural-disaster", "infrastructure", "technology-cyber", "major-news"].includes(event.domain)) return false;
  if (event.category === "earthquake" && event.severity === "low") return false;
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
  const statuses = state.movingObjectStatus || {};
  const aircraft = statuses.opensky?.ok ? `Aircraft: ${statuses.opensky.count || 0}` : "Flight tracking is not configured";
  const vessels = statuses["global-fishing-watch"]?.ok ? `Vessels: ${statuses["global-fishing-watch"].count || 0}` : "Vessel activity is not configured";
  if (state.tracking.aircraft || state.tracking.vessels) return `${aircraft}. ${vessels}.`;
  return "Zoom in to view aircraft or vessel activity.";
}

function applyShellState(els) {
  document.body.classList.toggle("advanced-mode", state.interfaceMode === "advanced");
  document.body.classList.toggle("standard-mode", state.interfaceMode !== "advanced");
  document.body.classList.toggle("left-drawer-open", state.leftDrawerOpen);
  document.body.classList.toggle("right-drawer-open", state.rightDrawerOpen);
  els.filterDrawer?.classList.toggle("open", state.leftDrawerOpen);
  els.eventDrawer?.classList.toggle("open", state.rightDrawerOpen);
  if (els.advancedMode) els.advancedMode.checked = state.interfaceMode === "advanced";
  if (els.aircraftToggle) els.aircraftToggle.checked = state.tracking.aircraft;
  if (els.vesselToggle) els.vesselToggle.checked = state.tracking.vessels;
  if (els.airportsToggle) els.airportsToggle.checked = state.tracking.airports;
  if (els.portsToggle) els.portsToggle.checked = state.tracking.ports;
  if (els.trackingStatus) els.trackingStatus.textContent = renderTrackingStatus();
  if (els.chokepointControls) els.chokepointControls.hidden = state.activeArea !== "chokepoints";
  if (els.chokepointSearch) els.chokepointSearch.value = state.chokepointFilters.query || "";
  if (els.chokepointRegion) els.chokepointRegion.value = state.chokepointFilters.region || "";
  if (els.chokepointType) els.chokepointType.value = state.chokepointFilters.type || "";
  if (els.chokepointStatus) els.chokepointStatus.value = state.chokepointFilters.status || "";
  if (els.chokepointDomain) els.chokepointDomain.value = state.chokepointFilters.domain || "";
  if (els.chokepointSort) els.chokepointSort.value = state.chokepointFilters.sort || "priority";
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
  const els = ids(["dashboardNav", "domainFilters", "layerFilters", "severityFilters", "eventList", "visibleCount", "highCount", "countryCount", "updatedAt", "search", "globalSearch", "globalSearchResults", "clearDomains", "clearFilters", "timeWindow", "sortOrder", "groupBy", "cardMode", "savedViews", "saveView", "fitWorld", "fitEvents", "themeToggle", "eventDialog", "dialogContent", "closeDialog", "methodologyDialog", "methodologyContent", "closeMethodology", "onboardingDialog", "mapLegend", "systemStatus", "feedAge", "baseMap", "refreshNow", "sourceHealth", "publicDataStatus", "countrySummaryPanel", "sourcesStatusPanel", "dashboardPanel", "dashboardEyebrow", "dashboardTitle", "mapMode", "mapHealth", "feedError", "ciiToggle", "sourcesLink", "filterDrawer", "eventDrawer", "presetList", "advancedMode", "aircraftToggle", "vesselToggle", "airportsToggle", "portsToggle", "trackingStatus", "mapListToggle", "locateMap", "resetWorkspace", "osintDashboardV2", "eventDetailDrawer", "chokepointDetailDrawer", "chokepointControls", "chokepointSearch", "chokepointRegion", "chokepointType", "chokepointStatus", "chokepointDomain", "chokepointSort", "resetChokepointFilters"]);
  const mapController = createMapController({ onHealthChange: (health) => { state.mapHealth = health; renderMapHealth(els.mapHealth, health); } });
  let refreshTimer = null;
  let retryAttempts = 0;

  function currentEvents(sourceEvents = state.intelligenceEvents.length ? state.intelligenceEvents : state.events) {
    const filters = dashboardFilters();
    const dashboard = getDashboard(state.dashboard);
    const source = state.dashboard === "finance" ? [...sourceEvents, ...exchangeMarkers().map(normalizeEvent)] : sourceEvents;
    const byDashboard = source.filter((event) => dashboard.categories.includes(event.category) || state.dashboard === "primary");
    const byCountry = state.selectedCountryIso3 ? byDashboard.filter((event) => countryForEvent(event)?.iso3 === state.selectedCountryIso3) : byDashboard;
    return filteredEvents(byCountry.filter(standardEventVisible), filters, state.hours, state.sort);
  }

  function buildChokepointIntelligence() {
    const correlations = correlateEventsToChokepoints(state.events, STRATEGIC_CHOKEPOINTS, { now: state.lastLoaded || Date.now() });
    const events = enrichEventsWithChokepoints(state.events, correlations, STRATEGIC_CHOKEPOINTS);
    const assessments = assessChokepoints(events, correlations, { now: state.lastLoaded || Date.now(), sourceStatus: state.sourceStatus });
    state.intelligenceEvents = events;
    state.chokepointAssessments = assessments;
    return { correlations, events, assessments };
  }

  function selectCountry(value, zoom = true) {
    const country = countryByCode(value);
    if (!country) return;
    state.selectedCountryIso3 = country.iso3;
    syncUrlState();
    if (zoom) mapController.selectCountry(country);
    render();
  }

  function render() {
    const intelligence = buildChokepointIntelligence();
    const events = currentEvents(intelligence.events);
    updateCountDebug(events);
    const riskScores = computeCountryRiskScores(state.events);
    const correlations = correlateEventsToMarkets(state.events, EXCHANGES);
    const layers = layersForDashboard(state.dashboard);
    renderFilters(els);
    const clusters = buildEventClusters(events);
    const selectedCluster = state.selectedClusterId ? findClusterById(clusters, state.selectedClusterId) : null;
    const highlightMemberIds = selectedCluster ? clusterMemberIds(selectedCluster) : null;
    const selectedChokepoint = chokepointById(state.selectedChokepointId);
    const relatedEventIds = selectedChokepoint ? new Set(intelligence.correlations.filter((item) => item.chokepointId === selectedChokepoint.id).map((item) => item.eventId)) : null;
    const { snapshot: changeSnapshot, corrupt: corruptSnapshot, unavailable: storageUnavailable } = loadSnapshotWithMeta();
    const changeSummary = computeChangeSummary(events, changeSnapshot, clusters);
    changeSummary.corruptSnapshot = corruptSnapshot;
    changeSummary.storageUnavailable = storageUnavailable;
    const changeStatusById = buildChangeStatusMap(changeSummary);
    renderMarkers(mapController.markerLayer, events, (event) => {
      openEventInspector(event);
    }, {
      selectedEventId: state.selectedEventId,
      clusterMemberIds: highlightMemberIds,
      relatedEventIds,
      changeStatusById,
    });
    mapController.clearClusterHighlight();
    if (selectedCluster) renderClusterHighlight(mapController.clusterHighlightLayer, selectedCluster);
    mapController.renderCountryRisk(riskScores, state.ciiVisible);
    mapController.renderCountryBoundaries(COUNTRIES, riskScores, state.selectedCountryIso3, (country) => selectCountry(country.iso3, false));
    mapController.renderChokepoints(STRATEGIC_CHOKEPOINTS, intelligence.assessments, state.selectedChokepointId, (chokepoint) => openChokepointInspector(chokepoint));
    mapController.renderMovingObjects(state.movingObjects, (object) => {
      state.selectedMovingObjectId = object.id;
      syncUrlState();
      openEventDialog({
        id: object.id,
        title: object.displayName,
        summary: `${object.objectType === "aircraft" ? "Aircraft" : "Vessel"} ${object.status || "observed"} from ${object.sourceName || "tracking source"}.`,
        category: "infrastructure",
        severity: "low",
        confidence: object.stale ? 45 : 70,
        verificationStatus: object.stale ? "Some data delayed" : "Reported",
        sourceName: object.sourceName,
        sourceUrl: object.sourceUrl,
        sourceType: "Moving object",
        lat: object.latitude,
        lon: object.longitude,
        place: object.displayName,
        country: "",
        occurredAt: object.observedAt,
        updatedAt: object.receivedAt,
        details: {
          Type: object.objectType,
          Status: object.status,
          Speed: object.speed ?? "-",
          Heading: object.heading ?? "-",
          Altitude: object.altitude ?? "-",
          "Data age": `${object.dataAgeSeconds}s`,
        },
      }, els.eventDialog, els.dialogContent, mapController.map);
    });
    mapController.renderReferencePoints({ airports: state.tracking.airports ? AIRPORTS : [], ports: state.tracking.ports ? PORTS : [] });
    setGlobeMode(state.mapMode, events);
    mapController.invalidateMapSize();
    renderList(els, events);
    renderStats(els, events);
    renderFeedError(els.feedError);
    renderMapHealth(els.mapHealth, state.mapHealth || mapController.health());
    updateSourcesLink(els.sourcesLink);
    applyShellState(els);
    if (els.presetList) els.presetList.innerHTML = renderPresetList();
    els.publicDataStatus.innerHTML = renderPublicDataStatus();
    els.countrySummaryPanel.innerHTML = renderCountrySummary(riskScores, state.events);
    els.sourcesStatusPanel.innerHTML = renderSourcesStatusPanel(state.events, state.sourceStatus);
    applyDashboardTitle(state.dashboard, els.dashboardEyebrow, els.dashboardTitle);
    if (state.activeArea === "latest-intelligence") {
      els.dashboardEyebrow.textContent = "OPEN WEB";
      els.dashboardTitle.textContent = "Latest Intelligence";
    }
    els.dashboardPanel.innerHTML = (state.activeArea === "latest-intelligence" ? renderLatestIntelligence(state.storylines, state.observations) : "") + renderStrategicWatch(intelligence.assessments, STRATEGIC_CHOKEPOINTS) + renderDashboardPanel(state.dashboard, { riskScores, correlations, events, sourceStatus: state.sourceStatus, providerResults: state.providerResults }) + renderLayerSummary(layers) + renderRiskTable(riskScores) + renderAlerts(events) + renderCountDebug();
    const selectedEvent = selectedCluster
      ? null
      : events.find((event) => event.id === state.selectedEventId) || state.events.find((event) => event.id === state.selectedEventId) || null;
    renderOsintDashboardShell(els.osintDashboardV2, {
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
    const selectedChangeStatus = selectedEvent ? changeStatusById.get(selectedEvent.id) || null : null;
    if (selectedChokepoint) {
      els.eventDetailDrawer.hidden = true;
      els.eventDetailDrawer.innerHTML = "";
    } else renderOsintEventDetailDrawer(els.eventDetailDrawer, {
      event: selectedEvent,
      cluster: selectedCluster,
      changeStatus: selectedChangeStatus,
      allEvents: events,
      clusters,
    });
    els.chokepointDetailDrawer.hidden = !selectedChokepoint;
    els.chokepointDetailDrawer.innerHTML = selectedChokepoint ? renderChokepointDetail(selectedChokepoint, intelligence.assessments, new Map(intelligence.events.map((event) => [String(event.id), event]))) : "";
  }

  function clearInspectorSelection({ closeDrawer = false } = {}) {
    state.selectedEventId = null;
    state.selectedClusterId = null;
    state.selectedChokepointId = null;
    if (els.eventDialog.open) els.eventDialog.close();
    if (closeDrawer) {
      state.rightDrawerOpen = false;
      localStorage.setItem("live-map-right-drawer-v1", "closed");
    }
    render();
  }

  function openEventInspector(eventRecord, { openModal = false, flyTo = true } = {}) {
    if (!eventRecord) return;
    state.selectedEventId = eventRecord.id;
    state.selectedClusterId = null;
    state.selectedChokepointId = null;
    state.rightDrawerOpen = true;
    localStorage.setItem("live-map-right-drawer-v1", "open");
    if (els.eventDialog.open) els.eventDialog.close();
    render();
    if (openModal) openEventDialog(eventRecord, els.eventDialog, els.dialogContent, mapController.map);
    else if (flyTo && Number.isFinite(eventRecord.lat) && Number.isFinite(eventRecord.lon)) {
      mapController.map.flyTo([eventRecord.lat, eventRecord.lon], Math.max(mapController.map.getZoom(), 5));
    }
  }

  function openClusterInspector(cluster) {
    if (!cluster) return;
    state.selectedClusterId = cluster.clusterId;
    state.selectedEventId = null;
    state.selectedChokepointId = null;
    state.rightDrawerOpen = true;
    localStorage.setItem("live-map-right-drawer-v1", "open");
    if (els.eventDialog.open) els.eventDialog.close();
    render();
    fitClusterOnMap(mapController.map, cluster);
  }

  function openChokepointInspector(chokepoint) {
    if (!chokepoint) return;
    state.selectedChokepointId = chokepoint.id;
    state.selectedEventId = null;
    state.selectedClusterId = null;
    state.activeArea = "chokepoints";
    state.rightDrawerOpen = true;
    localStorage.setItem("live-map-right-drawer-v1", "open");
    syncUrlState();
    renderNav();
    render();
    mapController.fitChokepoint(chokepoint);
  }

  function renderNav() {
    const items = [
      ["explore", "Overview"],
      ["feed", "Events"],
      ["latest-intelligence", "Latest Intelligence"],
      ["chokepoints", "Chokepoints"],
      ["countries", "Countries"],
      ["sources", "Sources"],
      ["diagnostics", "Diagnostics"],
    ];
    els.dashboardNav.innerHTML = items.map(([id, label]) => {
      if (id === "sources") return `<a class="dashboard-tab" href="/sources" data-sources-link>${label}</a>`;
      if (id === "diagnostics") return `<a class="dashboard-tab" href="/diagnostics">${label}</a>`;
      if (id === "countries") return `<a class="dashboard-tab ${state.activeArea === id ? "active" : ""}" href="/countries">${label}</a>`;
      return `<button class="dashboard-tab ${state.activeArea === id ? "active" : ""}" data-area="${id}" type="button">${label}</button>`;
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
  }

  function scheduleNextLoad(delayMs) {
    if (refreshTimer) window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => loadEvents(false), delayMs);
  }

  function applyResult(result) {
    const normalizedEvents = (result.events || []).map(normalizeEvent).filter((event) => event.geographic === false || (Number.isFinite(event.lat) && Number.isFinite(event.lon)));
    const incidentResult = annotateIncidents(normalizedEvents);
    state.events = incidentResult.events;
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
    els.systemStatus.innerHTML = "<i></i> Updating";
    els.refreshNow.disabled = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs);
    try {
      let result;
      try {
        const response = await fetch(`${CONFIG.endpoint}?hours=${state.hours}&t=${Date.now()}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(`API ${response.status}`);
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("json")) throw new Error("Non-JSON event API response");
        result = await response.json();
      } catch (apiError) {
        console.warn("Event API unavailable; using direct USGS fallback.", apiError);
        try {
          result = await directFallback();
        } catch (fallbackError) {
          fallbackError.apiError = apiError;
          throw fallbackError;
        }
      }
      applyResult(result);
      writeEventCache(result);
      retryAttempts = 0;
      state.apiFailure = null;
      state.retryDelayMs = 0;
      state.nextRetryAt = Date.now() + CONFIG.refreshSeconds * 1000;
      const isPartial = result.systemStatus === "partial-data" || result.mode === "partial-netlify-function" || state.errors.length > 0;
      const noData = result.systemStatus === "no-current-provider-data" || !state.events.length;
      els.systemStatus.classList.toggle("warn", isPartial);
      els.systemStatus.innerHTML = `<i></i> ${noData ? "No provider data" : isPartial ? "Partial data" : result.mode === "fallback" ? "Live fallback" : "Operational"}`;
      renderSourceHealth(els.sourceHealth, result, state.errors);
      render();
      scheduleNextLoad(CONFIG.refreshSeconds * 1000);
    } catch (error) {
      console.error(error);
      const kind = classifyFetchError(error.apiError || error);
      const cached = readEventCache();
      if (cached && !state.events.length) applyResult({ ...cached, mode: "browser-cache", errors: ["Showing last successful browser cache because live requests failed."] });
      retryAttempts += 1;
      const retryDelay = Math.min(RETRY_CAP_MS, RETRY_BASE_MS * 2 ** Math.min(retryAttempts - 1, 4));
      state.retryDelayMs = retryDelay;
      state.nextRetryAt = Date.now() + retryDelay;
      state.apiFailure = { kind, message: safeFailureMessage(kind), detail: error.message || "Request failed" };
      els.systemStatus.classList.add("warn");
      els.systemStatus.innerHTML = "<i></i> Feed unavailable";
      if (els.sourceHealth) els.sourceHealth.textContent = cached ? "Showing last successful cached data" : "No live source connected";
      if (!state.events.length) els.eventList.innerHTML = '<div class="empty">Event data temporarily unavailable. Filters and the map remain usable; use Retry when connectivity returns.</div>';
      render();
      scheduleNextLoad(retryDelay);
    } finally {
      clearTimeout(timeout);
      els.refreshNow.disabled = false;
      if (manual) els.refreshNow.textContent = "Refreshed";
      setTimeout(() => (els.refreshNow.textContent = "Refresh"), 1200);
    }
  }

  async function loadMovingObjects() {
    if (!state.tracking.aircraft && !state.tracking.vessels) {
      state.movingObjects = [];
      state.movingObjectStatus = {};
      render();
      return;
    }
    if (document.hidden) return;
    const type = state.tracking.aircraft && state.tracking.vessels ? "all" : state.tracking.aircraft ? "aircraft" : "vessel";
    try {
      const response = await fetch(`/api/moving-objects?type=${type}&bbox=${encodeURIComponent(bboxParam(mapController))}&limit=500&t=${Date.now()}`, { cache: "no-store" });
      const body = await response.json();
      state.movingObjects = Array.isArray(body.data?.data) ? body.data.data : Array.isArray(body.data) ? body.data : [];
      state.movingObjectStatus = body.data?.providerStatus || body.sourceStatus || {};
    } catch {
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
    movingRefreshTimer = window.setTimeout(async () => {
      await loadMovingObjects();
      scheduleMovingRefresh(document.hidden ? delay * 4 : delay);
    }, delay);
  }

  renderNav();
  renderFeedControls();
  renderChokepointControls();
  if (!state.onboardingComplete && els.onboardingDialog) els.onboardingDialog.showModal();
  const startupParams = new URLSearchParams(window.location.search);
  if (state.selectedPreset === "explore" && !startupParams.has("tracking") && !startupParams.has("view")) applyPreset("explore", false);
  if (els.timeWindow) els.timeWindow.value = String(state.hours);
  els.search.value = dashboardFilters().query;
  if (els.globalSearch) els.globalSearch.value = dashboardFilters().query;
  window.addEventListener("live-map-render-request", () => { renderNav(); renderFeedControls(); renderChokepointControls(); render(); loadMovingObjects(); });
  document.addEventListener("click", (event) => {
    if (event.target.closest("a")) return;
    const area = event.target.closest("[data-area]");
    if (area) {
      state.activeArea = area.dataset.area;
      state.rightDrawerOpen = ["feed", "latest-intelligence"].includes(state.activeArea) ? true : state.rightDrawerOpen;
      localStorage.setItem("live-map-right-drawer-v1", state.rightDrawerOpen ? "open" : "closed");
      syncUrlState();
      renderNav();
      render();
      return;
    }
    const chokepointSelect = event.target.closest("[data-chokepoint-select]");
    if (chokepointSelect) {
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
      applyPreset(preset.dataset.preset);
      els.timeWindow.value = String(state.hours);
      renderFeedControls();
      return;
    }
    const openDrawer = event.target.closest("[data-open-drawer]");
    if (openDrawer) {
      const side = openDrawer.dataset.openDrawer;
      if (side === "left") state.leftDrawerOpen = true;
      if (side === "right") state.rightDrawerOpen = true;
      localStorage.setItem("live-map-left-drawer-v1", state.leftDrawerOpen ? "open" : "closed");
      localStorage.setItem("live-map-right-drawer-v1", state.rightDrawerOpen ? "open" : "closed");
      render();
      mapController.invalidateMapSize();
      return;
    }
    const closeDrawer = event.target.closest("[data-close-drawer]");
    if (closeDrawer) {
      const side = closeDrawer.dataset.closeDrawer;
      if (side === "left") state.leftDrawerOpen = false;
      if (side === "right") state.rightDrawerOpen = false;
      localStorage.setItem("live-map-left-drawer-v1", state.leftDrawerOpen ? "open" : "closed");
      localStorage.setItem("live-map-right-drawer-v1", state.rightDrawerOpen ? "open" : "closed");
      render();
      mapController.invalidateMapSize();
      return;
    }
    const onboardingPreset = event.target.closest("[data-onboarding-preset]");
    if (onboardingPreset) {
      const selected = onboardingPreset.dataset.onboardingPreset === "country" ? "explore" : onboardingPreset.dataset.onboardingPreset;
      if (onboardingPreset.dataset.onboardingPreset === "country") window.location.href = "/countries";
      applyPreset(selected);
      localStorage.setItem("live-map-onboarding-v1", "done");
      state.onboardingComplete = true;
      els.onboardingDialog?.close();
      return;
    }
    if (event.target.closest("[data-onboarding-skip]")) {
      localStorage.setItem("live-map-onboarding-v1", "done");
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
      localStorage.setItem("live-map-collapsed-groups-v1", JSON.stringify([...state.collapsedGroups]));
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
      const visibleEvents = currentEvents();
      const visibleClusters = buildEventClusters(visibleEvents);
      saveSnapshot(buildSnapshotFromEvents(visibleEvents, visibleClusters));
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
        runArtifactExportAction(action, artifact).catch(() => {});
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
      const eventRecord = [...state.events, ...exchangeMarkers()].find((item) => item.id === detailButton.dataset.eventDetail);
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

  document.addEventListener("keydown", (event) => {
    const chokepointCard = event.target.closest?.("[data-chokepoint-select]");
    if (chokepointCard && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openChokepointInspector(chokepointById(chokepointCard.dataset.chokepointSelect));
      return;
    }
    if (event.key === "Escape") {
      state.leftDrawerOpen = false;
      localStorage.setItem("live-map-left-drawer-v1", "closed");
      render();
      mapController.invalidateMapSize();
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
    const results = buildGlobalSearchResults(query, state.events, state.movingObjects);
    const grouped = groupSearchResults(results);
    els.globalSearchResults.hidden = !results.length;
    els.globalSearchResults.innerHTML = Object.entries(grouped).map(([group, items]) => `<section><strong>${escapeHtml(group)}</strong>${items.map((item, index) => `<button type="button" data-search-result="${escapeHtml(group)}:${index}"><span>${escapeHtml(item.label)}</span><small>${escapeHtml(item.description || "")}</small></button>`).join("")}</section>`).join("");
    els.globalSearchResults._results = grouped;
  });
  els.globalSearchResults?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-search-result]");
    if (!button) return;
    const [group, indexText] = button.dataset.searchResult.split(":");
    const item = els.globalSearchResults._results?.[group]?.[Number(indexText)];
    if (!item) return;
    const payload = item.payload;
    if (payload.action === "country") selectCountry(payload.iso3);
    if (["airport", "port"].includes(payload.action)) mapController.map.setView([payload.latitude, payload.longitude], 8);
    if (payload.action === "event" && Number.isFinite(payload.lat) && Number.isFinite(payload.lon)) mapController.map.setView([payload.lat, payload.lon], 7);
    if (payload.action === "moving-object") mapController.map.setView([payload.latitude, payload.longitude], 8);
    els.globalSearchResults.hidden = true;
    syncUrlState();
  });
  els.timeWindow.addEventListener("change", (event) => { state.hours = Number(event.target.value); loadEvents(true); });
  els.sortOrder.addEventListener("change", (event) => { state.sort = event.target.value; syncUrlState(); render(); });
  els.groupBy.addEventListener("change", (event) => { state.groupBy = event.target.value; syncUrlState(); render(); });
  els.cardMode.addEventListener("change", (event) => { state.cardMode = event.target.value; syncUrlState(); render(); });
  els.savedViews.addEventListener("change", (event) => {
    const view = loadSavedViews().find((item) => item.name === event.target.value);
    if (!view) return;
    if (view.dashboard) setDashboard(view.dashboard);
    if (view.sort) state.sort = view.sort;
    if (view.groupBy) state.groupBy = view.groupBy;
    if (view.cardMode) state.cardMode = view.cardMode;
    const filters = dashboardFilters();
    filters.domains.clear();
    (view.domains || []).forEach((domain) => filters.domains.add(domain));
    renderFeedControls();
    syncUrlState();
    render();
  });
  els.saveView.addEventListener("click", () => {
    const name = window.prompt("Save current view as:", `${getDashboard(state.dashboard).label} view`);
    if (!name) return;
    saveView(serializeView(state, dashboardFilters(), name));
    renderFeedControls();
  });
  els.clearDomains.addEventListener("click", () => { dashboardFilters().domains.clear(); syncUrlState(); render(); });
  els.clearFilters.addEventListener("click", () => { resetDashboardFilters(); els.search.value = ""; renderFeedControls(); render(); });
  els.fitWorld.addEventListener("click", () => mapController.fitWorld());
  els.fitEvents.addEventListener("click", () => mapController.fitEvents(currentEvents()));
  els.baseMap.addEventListener("change", (event) => mapController.switchBase(event.target.value));
  els.mapMode.addEventListener("change", (event) => { state.mapMode = event.target.value; render(); mapController.invalidateMapSize(); });
  els.ciiToggle.addEventListener("click", () => { state.ciiVisible = !state.ciiVisible; els.ciiToggle.classList.toggle("active", state.ciiVisible); render(); });
  els.advancedMode?.addEventListener("change", (event) => {
    state.interfaceMode = event.target.checked ? "advanced" : "standard";
    localStorage.setItem("live-map-interface-mode-v1", state.interfaceMode);
    render();
    mapController.invalidateMapSize();
  });
  els.aircraftToggle?.addEventListener("change", (event) => {
    state.tracking.aircraft = event.target.checked;
    syncUrlState();
    loadMovingObjects();
  });
  els.vesselToggle?.addEventListener("change", (event) => {
    state.tracking.vessels = event.target.checked;
    syncUrlState();
    loadMovingObjects();
  });
  els.airportsToggle?.addEventListener("change", (event) => { state.tracking.airports = event.target.checked; render(); });
  els.portsToggle?.addEventListener("change", (event) => { state.tracking.ports = event.target.checked; render(); });
  els.mapListToggle?.addEventListener("click", () => {
    state.rightDrawerOpen = !state.rightDrawerOpen;
    localStorage.setItem("live-map-right-drawer-v1", state.rightDrawerOpen ? "open" : "closed");
    render();
    mapController.invalidateMapSize();
  });
  els.locateMap?.addEventListener("click", () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => mapController.map.setView([position.coords.latitude, position.coords.longitude], 6));
  });
  els.resetWorkspace?.addEventListener("click", () => {
    state.leftDrawerOpen = false;
    state.rightDrawerOpen = true;
    state.selectedCountryIso3 = null;
    state.selectedEventId = null;
    state.selectedClusterId = null;
    state.selectedChokepointId = null;
    state.tracking.aircraft = false;
    state.tracking.vessels = false;
    localStorage.setItem("live-map-left-drawer-v1", "closed");
    localStorage.setItem("live-map-right-drawer-v1", "open");
    applyPreset("explore");
  });
  els.refreshNow.addEventListener("click", () => loadEvents(true));
  els.themeToggle.addEventListener("click", () => document.documentElement.classList.toggle("light"));
  els.closeDialog.addEventListener("click", () => els.eventDialog.close());
  els.closeMethodology.addEventListener("click", () => els.methodologyDialog.close());
  els.eventDialog.addEventListener("click", (event) => { if (event.target === els.eventDialog) els.eventDialog.close(); });
  els.methodologyDialog.addEventListener("click", (event) => { if (event.target === els.methodologyDialog) els.methodologyDialog.close(); });

  loadEvents();
  loadMovingObjects();
  scheduleMovingRefresh();
  document.addEventListener("visibilitychange", () => scheduleMovingRefresh(document.hidden ? 120000 : 30000));
  setInterval(() => renderStats(els, currentEvents()), 30000);
}
