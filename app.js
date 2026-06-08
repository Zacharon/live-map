const CONFIG = { endpoint: "/api/events", refreshSeconds: 120, requestTimeoutMs: 15000 };
const CATEGORIES = {
  conflict: { label: "Conflict", color: "#ff5d6c" },
  earthquake: { label: "Earthquake", color: "#ffd24d" },
  wildfire: { label: "Wildfire", color: "#ff843d" },
  storm: { label: "Storm", color: "#45a3ff" },
  volcano: { label: "Volcano", color: "#d586ff" },
  flood: { label: "Flood", color: "#32c8df" },
  other: { label: "Other hazard", color: "#68d6b7" },
};
const SEVERITIES = {
  critical: { label: "Critical", color: "#ff355d", score: 4 },
  high: { label: "High", color: "#ff8a3d", score: 3 },
  medium: { label: "Medium", color: "#f6c453", score: 2 },
  low: { label: "Low", color: "#45a3ff", score: 1 },
};

const map = L.map("map", { zoomControl: false, minZoom: 2, worldCopyJump: true, preferCanvas: true }).setView([22, 10], 2.35);
L.control.zoom({ position: "bottomright" }).addTo(map);

const basemaps = {
  satellite: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19,
    attribution: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and contributors",
  }),
  labels: L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19,
    attribution: "Labels © Esri",
    pane: "overlayPane",
  }),
  dark: L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19, attribution: "© OpenStreetMap © CARTO" }),
  street: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }),
};

basemaps.satellite.addTo(map);
basemaps.labels.addTo(map);
let activeBase = "satellite";
const markerLayer = typeof L.markerClusterGroup === "function" ? L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 44, spiderfyOnMaxZoom: true, disableClusteringAtZoom: 7 }).addTo(map) : L.layerGroup().addTo(map);

let state = {
  events: [],
  categories: new Set(Object.keys(CATEGORIES)),
  severities: new Set(Object.keys(SEVERITIES)),
  query: "",
  hours: 168,
  sort: "severity",
  lastLoaded: null,
  sources: [],
  sourceStatus: {},
  errors: [],
};

const ids = ["layerFilters", "severityFilters", "eventList", "visibleCount", "highCount", "countryCount", "updatedAt", "search", "clearFilters", "timeWindow", "sortOrder", "fitWorld", "fitEvents", "themeToggle", "eventDialog", "dialogContent", "closeDialog", "mapLegend", "systemStatus", "feedAge", "baseMap", "refreshNow", "sourceHealth"];
const els = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
const esc = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));

function relativeTime(timestamp) {
  const delta = Math.max(0, Date.now() - Number(timestamp));
  const minutes = Math.floor(delta / 60000);
  const hours = Math.floor(minutes / 60);
  if (minutes < 1) return "just now";
  if (hours < 1) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function exactTime(timestamp) {
  return new Date(timestamp).toLocaleString([], { dateStyle: "medium", timeStyle: "long" });
}

function safeCategory(category) {
  return CATEGORIES[category] ? category : "other";
}

function safeSeverity(severity) {
  return SEVERITIES[severity] ? severity : "low";
}

function normalizeEvent(event) {
  const sourceName = event.sourceName || event.source || event.providerName || "Unknown source";
  return {
    ...event,
    category: safeCategory(event.category),
    severity: safeSeverity(event.severity),
    occurredAt: Number(event.occurredAt || Date.now()),
    updatedAt: Number(event.updatedAt || event.occurredAt || Date.now()),
    lat: Number(event.lat ?? event.latitude),
    lon: Number(event.lon ?? event.longitude),
    confidence: Number(event.confidence || 80),
    source: sourceName,
    sourceName,
    sourceType: event.sourceType || "Unknown",
    verificationStatus: event.verificationStatus || "Single source",
    coordinateMethod: event.coordinateMethod || "provider coordinates",
    details: event.details || {},
  };
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
      Significance: properties.sig ?? "—",
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

function sourceStatusText(result) {
  const statuses = result.sourceStatus || {};
  const values = Object.entries(statuses);
  if (!values.length) return result.mode === "fallback" ? "USGS fallback" : "Live feed";
  const live = values.filter(([, status]) => status.ok).map(([key, status]) => `${key.toUpperCase()} ${status.count}`);
  const failed = values.filter(([, status]) => !status.ok).map(([key]) => `${key.toUpperCase()} delayed`);
  return [...live, ...failed].join(" · ");
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

    state.events = (result.events || []).map(normalizeEvent).filter((event) => Number.isFinite(event.lat) && Number.isFinite(event.lon));
    state.lastLoaded = Number(result.generatedAt || Date.now());
    state.sources = result.sources || [];
    state.sourceStatus = result.sourceStatus || {};
    state.errors = result.errors || [];

    const isPartial = result.mode === "partial-netlify-function" || state.errors.length > 0;
    els.systemStatus.classList.toggle("warn", isPartial);
    els.systemStatus.innerHTML = `<i></i> ${isPartial ? "Partial data" : result.mode === "fallback" ? "Live fallback" : "Live multi-source"}`;
    if (els.sourceHealth) {
      els.sourceHealth.textContent = sourceStatusText(result);
      els.sourceHealth.title = state.errors.join("\n");
    }
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

function filteredEvents() {
  const cutoff = Date.now() - state.hours * 3600000;
  const query = state.query.trim().toLowerCase();
  let output = state.events.filter((event) => state.categories.has(event.category) && state.severities.has(event.severity) && event.occurredAt >= cutoff);
  if (query) {
    output = output.filter((event) => `${event.title} ${event.summary} ${event.country} ${event.place} ${event.sourceName} ${event.sourceType} ${event.verificationStatus} ${JSON.stringify(event.details)}`.toLowerCase().includes(query));
  }
  return output.sort((a, b) => state.sort === "newest" ? b.occurredAt - a.occurredAt : SEVERITIES[b.severity].score - SEVERITIES[a.severity].score || b.occurredAt - a.occurredAt);
}

function renderFilters() {
  els.layerFilters.innerHTML = Object.entries(CATEGORIES).map(([key, category]) => `<button class="filter-item ${state.categories.has(key) ? "active" : ""}" style="--category:${category.color}" data-category="${key}"><span><i class="dot"></i>${category.label}</span><b>${state.events.filter((event) => event.category === key).length}</b></button>`).join("");
  els.severityFilters.innerHTML = Object.entries(SEVERITIES).map(([key, severity]) => `<button class="severity-btn ${state.severities.has(key) ? "active" : ""}" style="--sev:${severity.color}" data-severity="${key}">${severity.label}</button>`).join("");
  els.mapLegend.innerHTML = Object.values(CATEGORIES).map((category) => `<div class="legend-row"><i class="dot" style="--category:${category.color}"></i>${category.label}</div>`).join("");
}

function markerIcon(event) {
  return L.divIcon({ className: "", html: `<div class="event-marker" style="--marker:${CATEGORIES[event.category].color}"></div>`, iconSize: [15, 15], iconAnchor: [7, 7] });
}

function renderMap(events) {
  markerLayer.clearLayers();
  events.forEach((event) => {
    const marker = L.marker([event.lat, event.lon], { icon: markerIcon(event) });
    marker.bindTooltip(`<strong>${esc(event.title)}</strong><br>${esc(event.place)} · ${relativeTime(event.occurredAt)}`, { direction: "top" });
    marker.on("click", () => openEvent(event));
    markerLayer.addLayer(marker);
  });
}

function keyFacts(event) {
  return Object.entries(event.details || {}).slice(0, 3).map(([key, value]) => `<span class="fact-chip">${esc(key)}: ${esc(value)}</span>`).join("");
}

function sourceButton(event) {
  if (!event.sourceUrl) return "";
  return `<a class="mini-source-link" href="${esc(event.sourceUrl)}" target="_blank" rel="noopener noreferrer">Source ↗</a>`;
}

function renderList(events) {
  els.eventList.innerHTML = events.length ? events.map((event) => `<article class="event-card" data-id="${esc(event.id)}"><div class="event-meta"><span class="category-pill" style="--cat:${CATEGORIES[event.category].color}">${CATEGORIES[event.category].label}</span><span>${esc(event.country)}</span><span class="severity-tag" style="--sev:${SEVERITIES[event.severity].color}">${SEVERITIES[event.severity].label}</span></div><h2>${esc(event.title)}</h2><p>${esc(event.summary)}</p><div class="event-facts">${keyFacts(event)}</div><div class="source-row"><span>${esc(event.sourceName)}</span><span>${esc(event.verificationStatus)}</span>${sourceButton(event)}</div><div class="event-foot"><span>${relativeTime(event.occurredAt)} · ${esc(event.sourceType)}</span><span class="confidence">${event.confidence}% confidence</span></div></article>`).join("") : '<div class="empty">No events match the selected filters and time range.</div>';
}

function renderStats(events) {
  els.visibleCount.textContent = events.length;
  els.highCount.textContent = events.filter((event) => ["critical", "high"].includes(event.severity)).length;
  els.countryCount.textContent = new Set(events.map((event) => event.country).filter(Boolean)).size;
  els.updatedAt.textContent = state.lastLoaded ? new Date(state.lastLoaded).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—";
  els.feedAge.textContent = state.lastLoaded ? `Feed ${relativeTime(state.lastLoaded)}` : "—";
}

function render() {
  renderFilters();
  const events = filteredEvents();
  renderMap(events);
  renderList(events);
  renderStats(events);
}

function openEvent(event) {
  const rows = {
    ...event.details,
    "Exact reported time": exactTime(event.occurredAt),
    "UTC time": new Date(event.occurredAt).toISOString(),
    Latitude: event.lat.toFixed(5),
    Longitude: event.lon.toFixed(5),
    "Coordinate method": event.coordinateMethod,
    "Source type": event.sourceType,
    "Verification status": event.verificationStatus,
    "Source confidence": `${event.confidence}%`,
    "Provider ID": event.providerId || event.id,
  };

  els.dialogContent.innerHTML = `<div class="dialog-kicker">${CATEGORIES[event.category].label} · ${SEVERITIES[event.severity].label}</div><h2 class="dialog-title">${esc(event.title)}</h2><p class="dialog-summary">${esc(event.summary)}</p><p class="severity-reason">${esc(event.severityReason || "Severity is based on the provider category and available measurements.")}</p><div class="dialog-grid"><div><span>Location</span><strong>${esc(event.place)}</strong></div><div><span>Reported</span><strong>${esc(exactTime(event.occurredAt))}</strong></div><div><span>Provider</span><strong>${esc(event.sourceName)}</strong></div></div><table class="details-table"><tbody>${Object.entries(rows).map(([key, value]) => `<tr><td>${esc(key)}</td><td>${esc(value)}</td></tr>`).join("")}</tbody></table><div class="dialog-actions">${event.sourceUrl ? `<a class="source-link" href="${esc(event.sourceUrl)}" target="_blank" rel="noopener noreferrer">Open original source ↗</a>` : ""}<a class="source-link secondary" href="https://www.openstreetmap.org/?mlat=${event.lat}&mlon=${event.lon}#map=7/${event.lat}/${event.lon}" target="_blank" rel="noopener noreferrer">Open coordinates ↗</a>${event.providerUrl ? `<a class="source-link secondary" href="${esc(event.providerUrl)}" target="_blank" rel="noopener noreferrer">Provider info ↗</a>` : ""}</div>`;
  els.eventDialog.showModal();
  map.flyTo([event.lat, event.lon], Math.max(map.getZoom(), 5));
}

function switchBase(name) {
  Object.values(basemaps).forEach((layer) => map.hasLayer(layer) && map.removeLayer(layer));
  activeBase = name;
  if (name === "satellite") {
    basemaps.satellite.addTo(map);
    basemaps.labels.addTo(map);
  } else {
    basemaps[name].addTo(map);
  }
  markerLayer.bringToFront();
}

document.addEventListener("click", (event) => {
  if (event.target.closest("a")) return;
  const categoryButton = event.target.closest("[data-category]");
  if (categoryButton) {
    const key = categoryButton.dataset.category;
    state.categories.has(key) ? state.categories.delete(key) : state.categories.add(key);
    render();
  }
  const severityButton = event.target.closest("[data-severity]");
  if (severityButton) {
    const key = severityButton.dataset.severity;
    state.severities.has(key) ? state.severities.delete(key) : state.severities.add(key);
    render();
  }
  const card = event.target.closest("[data-id]");
  if (card) {
    const eventRecord = state.events.find((item) => item.id === card.dataset.id);
    if (eventRecord) openEvent(eventRecord);
  }
});

els.search.addEventListener("input", (event) => { state.query = event.target.value; render(); });
els.timeWindow.addEventListener("change", (event) => { state.hours = Number(event.target.value); loadEvents(); });
els.sortOrder.addEventListener("change", (event) => { state.sort = event.target.value; render(); });
els.clearFilters.addEventListener("click", () => { state.categories = new Set(Object.keys(CATEGORIES)); state.severities = new Set(Object.keys(SEVERITIES)); state.query = ""; els.search.value = ""; render(); });
els.fitWorld.addEventListener("click", () => map.setView([22, 10], 2.35));
els.fitEvents.addEventListener("click", () => { const events = filteredEvents(); if (events.length) map.fitBounds(events.map((event) => [event.lat, event.lon]), { padding: [40, 40], maxZoom: 7 }); });
els.baseMap.addEventListener("change", (event) => switchBase(event.target.value));
els.refreshNow.addEventListener("click", () => loadEvents(true));
els.themeToggle.addEventListener("click", () => document.documentElement.classList.toggle("light"));
els.closeDialog.addEventListener("click", () => els.eventDialog.close());
els.eventDialog.addEventListener("click", (event) => { if (event.target === els.eventDialog) els.eventDialog.close(); });

loadEvents();
setInterval(loadEvents, CONFIG.refreshSeconds * 1000);
setInterval(() => renderStats(filteredEvents()), 30000);
