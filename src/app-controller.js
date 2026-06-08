import { CONFIG, CATEGORIES, SEVERITIES } from "./config.js";
import { DASHBOARDS, getDashboard } from "./data/dashboards.js";
import { LAYER_CATALOG, layersForDashboard } from "./data/layers.js";
import { EXCHANGES } from "./data/exchanges.js";
import { state, dashboardFilters, resetDashboardFilters, setDashboard, syncUrlState } from "./state.js";
import { normalizeEvent, escapeHtml, relativeTime } from "./events/event-normalizer.js";
import { filteredEvents } from "./events/event-filters.js";
import { domainOptions } from "./events/taxonomy.js";
import { GROUP_OPTIONS, SORT_OPTIONS, groupEvents } from "./events/feed-organization.js";
import { annotateIncidents } from "./events/incident-clustering.js";
import { correlateEventsToMarkets } from "./events/event-correlation.js";
import { computeCountryRiskScores } from "./risk/country-risk.js";
import { exchangeMarkers } from "./finance/finance-adapter.js";
import { loadAlertRules, saveAlertRules, createLocalRule, validateAlertRule, previewAlerts } from "./alerts/alert-rules.js";
import { createMapController } from "./map/map-controller.js";
import { renderMarkers } from "./map/marker-renderer.js";
import { setGlobeMode } from "./map/globe-controller.js";
import { renderSourceHealth } from "./ui/source-health.js";
import { renderProviderHealthPanel } from "./ui/provider-health-panel.js";
import { loadSavedViews, saveView, serializeView } from "./ui/saved-views.js";
import { openEventDialog, openMethodologyDialog } from "./ui/dialogs.js";
import { renderDashboardPanel, applyDashboardTitle } from "./dashboards/dashboard-renderer.js";

function ids(names) {
  return Object.fromEntries(names.map((id) => [id, document.getElementById(id)]));
}

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

async function directFallback() {
  const response = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson", { cache: "no-store" });
  if (!response.ok) throw new Error(`USGS ${response.status}`);
  const data = await response.json();
  return {
    events: data.features.map(normalizeUSGS),
    generatedAt: Date.now(),
    sources: ["USGS direct fallback"],
    sourceStatus: { usgs: { ok: true, count: data.features.length, message: "Direct fallback" } },
    errors: ["Netlify Function was unavailable, so the browser loaded USGS directly."],
    mode: "fallback",
  };
}

function sourceButton(event) {
  if (!event.sourceUrl) return "";
  return `<a class="mini-source-link" href="${escapeHtml(event.sourceUrl)}" target="_blank" rel="noopener noreferrer">Source</a>`;
}

function qualityBadges(event) {
  return `<div class="quality-row"><span>Severity: ${escapeHtml(event.severity)}</span><span>Confidence: ${Math.round(event.confidence || 0)}%</span><span>Verification: ${escapeHtml(event.verificationStatus)}</span><span>Sources: ${escapeHtml(event.independentSourceCount || 1)} independent</span><span>Freshness: ${escapeHtml(relativeTime(event.updatedAt || event.occurredAt))}</span></div>`;
}

function renderEventCard(event) {
  const expanded = state.cardMode === "expanded";
  const summary = expanded ? `<p>${escapeHtml(event.summary)}</p>` : "";
  const details = expanded ? `<div class="event-facts"><span class="fact-chip">Occurred: ${escapeHtml(new Date(event.occurredAt).toLocaleString())}</span><span class="fact-chip">Reported: ${escapeHtml(new Date(event.firstReportedAt || event.occurredAt).toLocaleString())}</span><span class="fact-chip">Updated: ${escapeHtml(new Date(event.updatedAt || event.occurredAt).toLocaleString())}</span>${event.incidentSize > 1 ? `<span class="fact-chip">Incident: ${escapeHtml(event.incidentSize)} linked events</span>` : ""}</div>` : "";
  return `<article class="event-card ${expanded ? "expanded" : "compact"}" data-id="${escapeHtml(event.id)}"><div class="event-meta"><span class="category-pill" style="--cat:${event.taxonomyColor || CATEGORIES[event.category]?.color || CATEGORIES.other.color}">${escapeHtml(event.domainLabel || CATEGORIES[event.category]?.label || "Other")}</span><span>${escapeHtml(event.typeLabel || event.category)}</span><span>${escapeHtml(event.country)}</span><span class="severity-tag" style="--sev:${SEVERITIES[event.severity].color}">${SEVERITIES[event.severity].label}</span></div><h2>${escapeHtml(event.title)}</h2>${summary}${qualityBadges(event)}${details}<div class="source-row"><span>${escapeHtml(event.sourceName)}</span><span>${escapeHtml(event.verificationStatus)}</span>${event.incidentSize > 1 ? `<span>${escapeHtml(event.incidentTitle || "Incident cluster")}</span>` : ""}${sourceButton(event)}</div><div class="event-foot"><span>${relativeTime(event.occurredAt)} occurred - ${escapeHtml(event.sourceType)}</span><span class="confidence">${event.confidence}% confidence</span></div></article>`;
}

function renderList(els, events) {
  if (!events.length) {
    els.eventList.innerHTML = '<div class="empty">No events match the selected filters and time range.</div>';
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
  els.domainFilters.innerHTML = domainOptions().map((domain) => `<button class="filter-item ${filters.domains.has(domain.id) ? "active" : ""}" style="--category:${domain.defaultColor}" data-domain="${domain.id}"><span><i class="dot"></i>${domain.label}</span><b>${state.events.filter((event) => event.domain === domain.id).length}</b></button>`).join("");
  els.layerFilters.innerHTML = Object.entries(CATEGORIES).map(([key, category]) => `<button class="filter-item ${filters.categories.has(key) ? "active" : ""}" style="--category:${category.color}" data-category="${key}"><span><i class="dot"></i>${category.label}</span><b>${state.events.filter((event) => event.category === key).length}</b></button>`).join("");
  els.severityFilters.innerHTML = Object.entries(SEVERITIES).map(([key, severity]) => `<button class="severity-btn ${filters.severities.has(key) ? "active" : ""}" style="--sev:${severity.color}" data-severity="${key}">${severity.label}</button>`).join("");
  const activeDomains = domainOptions().filter((domain) => state.events.some((event) => event.domain === domain.id));
  els.mapLegend.innerHTML = activeDomains.map((domain) => `<div class="legend-row"><i class="dot" style="--category:${domain.defaultColor}"></i>${domain.label}</div>`).join("");
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

function renderRiskTable(scores) {
  return `<div class="risk-table">${scores.slice(0, 8).map((score) => `<button class="risk-row" type="button" title="${escapeHtml(score.limitations.join(" "))}"><span>${escapeHtml(score.countryName)}</span><strong style="color:${score.color}">${score.score}</strong><small>${score.levelLabel} / ${score.confidence}%</small></button>`).join("")}</div>`;
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
  const els = ids(["dashboardNav", "domainFilters", "layerFilters", "severityFilters", "eventList", "visibleCount", "highCount", "countryCount", "updatedAt", "search", "clearDomains", "clearFilters", "timeWindow", "sortOrder", "groupBy", "cardMode", "savedViews", "saveView", "fitWorld", "fitEvents", "themeToggle", "eventDialog", "dialogContent", "closeDialog", "methodologyDialog", "methodologyContent", "closeMethodology", "mapLegend", "systemStatus", "feedAge", "baseMap", "refreshNow", "sourceHealth", "providerHealthPanel", "dashboardPanel", "dashboardEyebrow", "dashboardTitle", "mapMode", "ciiToggle"]);
  const mapController = createMapController();

  function currentEvents() {
    const filters = dashboardFilters();
    const dashboard = getDashboard(state.dashboard);
    const source = state.dashboard === "finance" ? [...state.events, ...exchangeMarkers().map(normalizeEvent)] : state.events;
    const byDashboard = source.filter((event) => dashboard.categories.includes(event.category) || state.dashboard === "primary");
    return filteredEvents(byDashboard, filters, state.hours, state.sort);
  }

  function render() {
    const events = currentEvents();
    const riskScores = computeCountryRiskScores(state.events);
    const correlations = correlateEventsToMarkets(state.events, EXCHANGES);
    const layers = layersForDashboard(state.dashboard);
    renderFilters(els);
    renderMarkers(mapController.markerLayer, events, (event) => openEventDialog(event, els.eventDialog, els.dialogContent, mapController.map));
    mapController.renderCountryRisk(riskScores, state.ciiVisible);
    setGlobeMode(state.mapMode, events);
    renderList(els, events);
    renderStats(els, events);
    els.providerHealthPanel.innerHTML = renderProviderHealthPanel(state.sourceStatus, state.providerResults);
    applyDashboardTitle(state.dashboard, els.dashboardEyebrow, els.dashboardTitle);
    els.dashboardPanel.innerHTML = renderDashboardPanel(state.dashboard, { riskScores, correlations }) + renderLayerSummary(layers) + renderRiskTable(riskScores) + renderAlerts(events);
  }

  function renderNav() {
    els.dashboardNav.innerHTML = DASHBOARDS.map((dashboard) => `<button class="dashboard-tab ${dashboard.id === state.dashboard ? "active" : ""}" data-dashboard="${dashboard.id}" type="button">${dashboard.label}</button>`).join("");
  }

  function renderFeedControls() {
    els.sortOrder.innerHTML = SORT_OPTIONS.map(([value, label]) => `<option value="${value}" ${state.sort === value ? "selected" : ""}>${label}</option>`).join("");
    els.groupBy.innerHTML = GROUP_OPTIONS.map(([value, label]) => `<option value="${value}" ${state.groupBy === value ? "selected" : ""}>${label}</option>`).join("");
    els.cardMode.value = state.cardMode;
    els.savedViews.innerHTML = '<option value="">Saved views</option>' + loadSavedViews().map((view) => `<option value="${escapeHtml(view.name)}">${escapeHtml(view.name)}</option>`).join("");
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
        result = await response.json();
      } catch (apiError) {
        console.warn("Netlify function unavailable; using direct USGS fallback.", apiError);
        result = await directFallback();
      }
      const normalizedEvents = (result.events || []).map(normalizeEvent).filter((event) => Number.isFinite(event.lat) && Number.isFinite(event.lon));
      const incidentResult = annotateIncidents(normalizedEvents);
      state.events = incidentResult.events;
      state.incidents = incidentResult.incidents;
      state.lastLoaded = Number(result.generatedAt || Date.now());
      state.sources = result.sources || [];
      state.sourceStatus = result.sourceStatus || {};
      state.providerResults = result.providerResults || [];
      state.systemStatus = result.systemStatus || result.mode || "unknown";
      state.errors = result.errors || [];
      const isPartial = result.systemStatus === "partial-data" || result.mode === "partial-netlify-function" || state.errors.length > 0;
      const noData = result.systemStatus === "no-current-provider-data" || !state.events.length;
      els.systemStatus.classList.toggle("warn", isPartial);
      els.systemStatus.innerHTML = `<i></i> ${noData ? "No provider data" : isPartial ? "Partial data" : result.mode === "fallback" ? "Live fallback" : "Operational"}`;
      renderSourceHealth(els.sourceHealth, result, state.errors);
      render();
    } catch (error) {
      console.error(error);
      els.systemStatus.textContent = "Feed unavailable";
      if (els.sourceHealth) els.sourceHealth.textContent = "No live source connected";
      if (!state.events.length) els.eventList.innerHTML = '<div class="empty">Could not load a live feed. Check Netlify Functions logs and deployment settings.</div>';
    } finally {
      clearTimeout(timeout);
      els.refreshNow.disabled = false;
      if (manual) els.refreshNow.textContent = "Refreshed";
      setTimeout(() => (els.refreshNow.textContent = "Refresh"), 1200);
    }
  }

  renderNav();
  renderFeedControls();
  els.search.value = dashboardFilters().query;
  document.addEventListener("click", (event) => {
    if (event.target.closest("a")) return;
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
    const card = event.target.closest("[data-id]");
    if (card) {
      const eventRecord = [...state.events, ...exchangeMarkers()].find((item) => item.id === card.dataset.id);
      if (eventRecord) openEventDialog(eventRecord, els.eventDialog, els.dialogContent, mapController.map);
      return;
    }
    if (event.target.id === "openCiiMethod") openMethodologyDialog(els.methodologyDialog, els.methodologyContent);
    if (event.target.closest("[data-provider-retry]")) loadEvents(true);
  });

  els.search.addEventListener("input", (event) => {
    state.queryByDashboard.set(state.dashboard, event.target.value);
    syncUrlState();
    render();
  });
  els.timeWindow.addEventListener("change", (event) => { state.hours = Number(event.target.value); loadEvents(); });
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
  els.mapMode.addEventListener("change", (event) => { state.mapMode = event.target.value; render(); });
  els.ciiToggle.addEventListener("click", () => { state.ciiVisible = !state.ciiVisible; els.ciiToggle.classList.toggle("active", state.ciiVisible); render(); });
  els.refreshNow.addEventListener("click", () => loadEvents(true));
  els.themeToggle.addEventListener("click", () => document.documentElement.classList.toggle("light"));
  els.closeDialog.addEventListener("click", () => els.eventDialog.close());
  els.closeMethodology.addEventListener("click", () => els.methodologyDialog.close());
  els.eventDialog.addEventListener("click", (event) => { if (event.target === els.eventDialog) els.eventDialog.close(); });
  els.methodologyDialog.addEventListener("click", (event) => { if (event.target === els.methodologyDialog) els.methodologyDialog.close(); });

  loadEvents();
  setInterval(loadEvents, CONFIG.refreshSeconds * 1000);
  setInterval(() => renderStats(els, currentEvents()), 30000);
}
