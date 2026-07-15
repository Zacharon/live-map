export function createMapController(options = {}) {
  const mapElement = document.getElementById("map");
  const health = {
    mapInitialized: false,
    containerWidth: 0,
    containerHeight: 0,
    selectedBasemap: "satellite",
    tileStatus: "loading",
    requestedTiles: 0,
    loadedTiles: 0,
    failedTiles: 0,
    lastSuccessfulTileAt: null,
    lastTileErrorAt: null,
    lastResizeAt: null,
    safeMessage: "Map is initializing.",
  };
  const notifyHealth = () => options.onHealthChange?.({ ...health });
  const updateSizeHealth = () => {
    const rect = mapElement.getBoundingClientRect();
    health.containerWidth = Math.round(rect.width);
    health.containerHeight = Math.round(rect.height);
    health.lastResizeAt = new Date().toISOString();
  };
  let invalidateTimer = null;
  const invalidateMapSize = () => {
    if (invalidateTimer) window.clearTimeout(invalidateTimer);
    invalidateTimer = window.setTimeout(() => {
      updateSizeHealth();
      if (health.containerWidth > 0 && health.containerHeight > 0) {
        map.invalidateSize({ pan: false });
        health.mapInitialized = true;
        health.safeMessage = health.tileStatus === "unavailable" ? health.safeMessage : "Map layout is stable.";
      } else {
        health.safeMessage = "Map container is waiting for a visible layout.";
      }
      notifyHealth();
    }, 120);
  };

  const map = L.map("map", { zoomControl: false, minZoom: 2, worldCopyJump: true, preferCanvas: true }).setView([22, 10], 2.35);
  L.control.zoom({ position: "bottomright" }).addTo(map);

  const basemaps = {
    satellite: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      attribution: "Tiles (c) Esri - Source: Esri, Maxar, Earthstar Geographics, and contributors",
    }),
    labels: L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      attribution: "Labels (c) Esri",
      pane: "overlayPane",
    }),
    dark: L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19, attribution: "(c) OpenStreetMap (c) CARTO" }),
    street: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "(c) OpenStreetMap contributors" }),
  };
  let activeBase = "satellite";

  function resetTileHealth(name) {
    health.selectedBasemap = name;
    health.tileStatus = "loading";
    health.requestedTiles = 0;
    health.loadedTiles = 0;
    health.failedTiles = 0;
    health.lastSuccessfulTileAt = null;
    health.lastTileErrorAt = null;
    health.safeMessage = "Loading map tiles.";
    notifyHealth();
  }

  function updateTileStatus() {
    if (health.loadedTiles > 0) {
      health.tileStatus = health.failedTiles > Math.max(5, health.loadedTiles) ? "degraded" : "operational";
      health.safeMessage = health.tileStatus === "degraded" ? "Some map tiles failed, but the basemap is usable." : "Map tiles are loading normally.";
    } else if (health.failedTiles >= 3) {
      health.tileStatus = "unavailable";
      health.safeMessage = "This basemap is not loading. Markers and event data are still available.";
    } else {
      health.tileStatus = "loading";
      health.safeMessage = "Loading map tiles.";
    }
    notifyHealth();
  }

  Object.entries(basemaps).forEach(([name, layer]) => {
    layer.on("loading", () => {
      if (name !== activeBase && !(activeBase === "satellite" && name === "labels")) return;
      health.tileStatus = "loading";
      notifyHealth();
    });
    layer.on("tileloadstart", () => {
      if (name !== activeBase && !(activeBase === "satellite" && name === "labels")) return;
      health.requestedTiles += 1;
      updateTileStatus();
    });
    layer.on("tileload", () => {
      if (name !== activeBase && !(activeBase === "satellite" && name === "labels")) return;
      health.loadedTiles += 1;
      health.lastSuccessfulTileAt = new Date().toISOString();
      updateTileStatus();
    });
    layer.on("tileerror", () => {
      if (name !== activeBase && !(activeBase === "satellite" && name === "labels")) return;
      health.failedTiles += 1;
      health.lastTileErrorAt = new Date().toISOString();
      updateTileStatus();
    });
    layer.on("load", updateTileStatus);
  });

  basemaps.satellite.addTo(map);
  basemaps.labels.addTo(map);

  const markerLayer = typeof L.markerClusterGroup === "function"
    ? L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 44, spiderfyOnMaxZoom: true, disableClusteringAtZoom: 7 }).addTo(map)
    : L.layerGroup().addTo(map);
  const clusterHighlightLayer = L.layerGroup().addTo(map);
  const ciiLayer = L.layerGroup().addTo(map);
  const countryLayer = L.layerGroup().addTo(map);
  const movingObjectLayer = L.layerGroup().addTo(map);
  const referenceLayer = L.layerGroup().addTo(map);
  const chokepointLayer = L.layerGroup().addTo(map);

  function switchBase(name) {
    Object.values(basemaps).forEach((layer) => map.hasLayer(layer) && map.removeLayer(layer));
    activeBase = name;
    resetTileHealth(name);
    if (name === "satellite") {
      basemaps.satellite.addTo(map);
      basemaps.labels.addTo(map);
    } else {
      basemaps[name].addTo(map);
    }
    markerLayer.bringToFront();
    invalidateMapSize();
  }

  function currentBbox() {
    const bounds = map.getBounds();
    return {
      south: bounds.getSouth(),
      west: bounds.getWest(),
      north: bounds.getNorth(),
      east: bounds.getEast(),
    };
  }

  function fitEvents(events) {
    const geographicEvents = events.filter((event) => event.geographic !== false && Number.isFinite(event.lat) && Number.isFinite(event.lon));
    if (geographicEvents.length) map.fitBounds(geographicEvents.map((event) => [event.lat, event.lon]), { padding: [40, 40], maxZoom: 7 });
  }

  function renderCountryRisk(scores, visible) {
    ciiLayer.clearLayers();
    if (!visible) return;
    scores.filter((score) => score.coordinates).slice(0, 30).forEach((score) => {
      const circle = L.circleMarker([score.coordinates.lat, score.coordinates.lon], {
        radius: 8 + score.score / 12,
        color: score.color,
        fillColor: score.color,
        fillOpacity: 0.22,
        weight: 2,
      });
      circle.bindTooltip(`<strong>${score.countryName}</strong><br>CII ${score.score} - ${score.levelLabel}<br>${score.confidence}% confidence`);
      ciiLayer.addLayer(circle);
    });
  }

  function renderCountryBoundaries(countries = [], scores = [], selectedIso3 = null, onSelect = null) {
    countryLayer.clearLayers();
    const scoreByIso3 = Object.fromEntries(scores.map((score) => [score.iso3, score]));
    countries.forEach((country) => {
      if (!country.bounds) return;
      const score = scoreByIso3[country.iso3];
      const selected = selectedIso3 === country.iso3;
      const bounds = [[country.bounds.south, country.bounds.west], [country.bounds.north, country.bounds.east]];
      const rectangle = L.rectangle(bounds, {
        color: selected ? "#38e0a3" : score?.color || "#8fb3c7",
        weight: selected ? 3 : 1,
        opacity: selected ? 0.9 : 0.32,
        fillColor: score?.color || "#8fb3c7",
        fillOpacity: selected ? 0.12 : 0.025,
        interactive: true,
      });
      rectangle.bindTooltip(`<strong>${country.name}</strong><br>CII ${score?.score ?? "-"} - ${score?.levelLabel || "unknown"}`);
      rectangle.on("click", () => onSelect?.(country));
      rectangle.addTo(countryLayer);
    });
    markerLayer.bringToFront();
  }

  function selectCountry(country) {
    if (!country?.bounds) return;
    map.fitBounds([[country.bounds.south, country.bounds.west], [country.bounds.north, country.bounds.east]], { padding: [42, 42], maxZoom: 6 });
  }

  function renderMovingObjects(objects = [], onSelect = null) {
    movingObjectLayer.clearLayers();
    objects.forEach((object) => {
      const color = object.objectType === "aircraft" ? "#7dd3fc" : "#38e0a3";
      const marker = L.circleMarker([object.latitude, object.longitude], {
        radius: object.objectType === "aircraft" ? 5 : 6,
        color,
        fillColor: color,
        fillOpacity: object.stale ? 0.25 : 0.75,
        opacity: object.stale ? 0.45 : 0.9,
        weight: 2,
      });
      marker.bindTooltip(`<strong>${object.displayName}</strong><br>${object.objectType}<br>${object.status || "unknown"}`);
      marker.on("click", () => onSelect?.(object));
      marker.addTo(movingObjectLayer);
    });
  }

  function renderReferencePoints({ airports = [], ports = [] } = {}) {
    referenceLayer.clearLayers();
    const zoom = map.getZoom();
    if (zoom < 4) return;
    airports.slice(0, 50).forEach((airport) => {
      L.circleMarker([airport.latitude, airport.longitude], { radius: 4, color: "#93c5fd", fillOpacity: 0.35, weight: 1 }).bindTooltip(`<strong>${airport.iata || airport.icao}</strong><br>${airport.name}`).addTo(referenceLayer);
    });
    ports.slice(0, 50).forEach((port) => {
      L.circleMarker([port.latitude, port.longitude], { radius: 4, color: "#2dd4bf", fillOpacity: 0.35, weight: 1 }).bindTooltip(`<strong>${port.unlocode}</strong><br>${port.name}`).addTo(referenceLayer);
    });
  }

  function renderChokepoints(chokepoints = [], assessments = [], selectedId = null, onSelect = null) {
    chokepointLayer.clearLayers();
    const assessmentById = new Map(assessments.map((assessment) => [assessment.chokepointId, assessment]));
    const colors = { normal: "#7d9aa8", watch: "#f6c453", disrupted: "#fb923c", "severely-disrupted": "#f97316", closed: "#fb7185", unknown: "#94a3b8" };
    chokepoints.filter((item) => item.enabled && item.geometry).forEach((chokepoint) => {
      const assessment = assessmentById.get(chokepoint.id) || { status: "unknown", activeEventCount: 0 };
      const selected = chokepoint.id === selectedId;
      const color = colors[assessment.status] || colors.unknown;
      const layer = L.geoJSON(chokepoint.geometry, {
        pointToLayer: (_, latlng) => L.circleMarker(latlng, { radius: selected ? 9 : 6, color, fillColor: color, fillOpacity: selected ? 0.78 : 0.45, weight: selected ? 3 : 1.5 }),
        style: { color, fillColor: color, fillOpacity: selected ? 0.16 : 0.06, opacity: selected ? 1 : 0.72, weight: selected ? 4 : 2, dashArray: chokepoint.geometryType === "line" ? "5 4" : null },
      });
      layer.bindTooltip(`<strong>${chokepoint.shortName}</strong><br>${assessment.status.replace(/-/g, " ")} - ${assessment.activeEventCount} related event(s)`, { sticky: true });
      layer.on("click", () => onSelect?.(chokepoint));
      layer.addTo(chokepointLayer);
    });
    chokepointLayer.bringToFront();
  }

  function fitChokepoint(chokepoint) {
    if (!chokepoint?.geometry) return;
    const layer = L.geoJSON(chokepoint.geometry);
    const bounds = layer.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [48, 48], maxZoom: chokepoint.geometryType === "point" ? 7 : 5 });
  }

  const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(invalidateMapSize) : null;
  resizeObserver?.observe(mapElement);
  window.addEventListener("resize", invalidateMapSize, { passive: true });
  window.addEventListener("orientationchange", invalidateMapSize, { passive: true });
  window.requestAnimationFrame(invalidateMapSize);
  resetTileHealth("satellite");

  function clearClusterHighlight() {
    clusterHighlightLayer.clearLayers();
  }

  return {
    map,
    markerLayer,
    clusterHighlightLayer,
    clearClusterHighlight,
    switchBase,
    fitWorld: () => map.setView([22, 10], 2.35),
    fitEvents,
    renderCountryRisk,
    renderCountryBoundaries,
    selectCountry,
    renderMovingObjects,
    renderReferencePoints,
    renderChokepoints,
    fitChokepoint,
    currentBbox,
    invalidateMapSize,
    health: () => ({ ...health }),
    activeBase: () => activeBase,
  };
}
