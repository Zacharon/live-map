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

  // Visual grammar panes (bottom → top). See docs/wayfinder-61-map-visual-grammar.md
  const paneDefs = [
    ["of-country", 350],
    ["of-reference", 370],
    ["of-chokepoint", 400],
    ["of-events", 450],
    ["of-moving", 470],
    ["of-highlight", 490],
  ];
  paneDefs.forEach(([name, zIndex]) => {
    map.createPane(name);
    map.getPane(name).style.zIndex = String(zIndex);
    // Keep SVG/canvas panes clickable where expected
    map.getPane(name).style.pointerEvents = "auto";
  });

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

  // Events stay above chokepoints/reference (grammar stack §1)
  const markerLayer = typeof L.markerClusterGroup === "function"
    ? L.markerClusterGroup({
        showCoverageOnHover: false,
        // Wider radius reduces spaghetti at world scale; spiderfy when zoomed in
        maxClusterRadius: 52,
        spiderfyOnMaxZoom: true,
        disableClusteringAtZoom: 8,
        polygonOptions: { weight: 1, color: "#2fe0c8", opacity: 0.35, fillOpacity: 0.04 },
      }).addTo(map)
    : L.layerGroup({ pane: "of-events" }).addTo(map);
  const clusterHighlightLayer = L.layerGroup({ pane: "of-highlight" }).addTo(map);
  const ciiLayer = L.layerGroup({ pane: "of-country" }).addTo(map);
  const countryLayer = L.layerGroup({ pane: "of-country" }).addTo(map);
  const movingObjectLayer = L.layerGroup({ pane: "of-moving" }).addTo(map);
  const referenceLayer = L.layerGroup({ pane: "of-reference" }).addTo(map);
  const chokepointLayer = L.layerGroup({ pane: "of-chokepoint" }).addTo(map);

  function restackAttentionLayers() {
    // Events and selection must remain readable over infrastructure/chokepoints
    if (typeof markerLayer.bringToFront === "function") markerLayer.bringToFront();
    if (typeof movingObjectLayer.bringToFront === "function") movingObjectLayer.bringToFront();
    if (typeof clusterHighlightLayer.bringToFront === "function") clusterHighlightLayer.bringToFront();
  }

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
    restackAttentionLayers();
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
        pane: "of-country",
        radius: 8 + score.score / 12,
        color: score.color,
        fillColor: score.color,
        fillOpacity: 0.18,
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
        pane: "of-country",
        color: selected ? "#38e0a3" : score?.color || "#8fb3c7",
        weight: selected ? 3 : 1,
        opacity: selected ? 0.9 : 0.28,
        fillColor: score?.color || "#8fb3c7",
        fillOpacity: selected ? 0.1 : 0.02,
        interactive: true,
      });
      rectangle.bindTooltip(`<strong>${country.name}</strong><br>CII ${score?.score ?? "-"} - ${score?.levelLabel || "unknown"}`);
      rectangle.on("click", () => onSelect?.(country));
      rectangle.addTo(countryLayer);
    });
    restackAttentionLayers();
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
        pane: "of-moving",
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
    // Grammar: hide infrastructure pins at world scale to reduce clutter
    if (zoom < 4) return;
    const cap = zoom < 6 ? 24 : 50;
    airports.slice(0, cap).forEach((airport) => {
      L.circleMarker([airport.latitude, airport.longitude], {
        pane: "of-reference",
        radius: 3.5,
        color: "#93c5fd",
        fillOpacity: 0.28,
        weight: 1,
        opacity: 0.75,
      })
        .bindTooltip(`<strong>${airport.iata || airport.icao}</strong><br>${airport.name}`)
        .addTo(referenceLayer);
    });
    ports.slice(0, cap).forEach((port) => {
      L.circleMarker([port.latitude, port.longitude], {
        pane: "of-reference",
        radius: 3.5,
        color: "#2dd4bf",
        fillOpacity: 0.28,
        weight: 1,
        opacity: 0.75,
      })
        .bindTooltip(`<strong>${port.unlocode}</strong><br>${port.name}`)
        .addTo(referenceLayer);
    });
    restackAttentionLayers();
  }

  function renderChokepoints(chokepoints = [], assessments = [], selectedId = null, onSelect = null) {
    chokepointLayer.clearLayers();
    const assessmentById = new Map(assessments.map((assessment) => [assessment.chokepointId, assessment]));
    // Condition palette (orthogonal to event category colors) — not territorial control
    const colors = { normal: "#7d9aa8", watch: "#f6c453", disrupted: "#fb923c", "severely-disrupted": "#f97316", closed: "#fb7185", unknown: "#94a3b8" };
    const zoom = map.getZoom();
    const worldSoft = zoom <= 3;
    chokepoints.filter((item) => item.enabled && item.geometry).forEach((chokepoint) => {
      const assessment = assessmentById.get(chokepoint.id) || { status: "unknown", activeEventCount: 0 };
      const selected = chokepoint.id === selectedId;
      const color = colors[assessment.status] || colors.unknown;
      const isLine = chokepoint.geometryType === "line";
      const layer = L.geoJSON(chokepoint.geometry, {
        pane: "of-chokepoint",
        pointToLayer: (_, latlng) =>
          L.circleMarker(latlng, {
            pane: "of-chokepoint",
            radius: selected ? 9 : worldSoft ? 5 : 6,
            color,
            fillColor: color,
            fillOpacity: selected ? 0.78 : worldSoft ? 0.32 : 0.42,
            weight: selected ? 3 : 1.5,
            opacity: selected ? 1 : 0.85,
          }),
        style: {
          color,
          fillColor: color,
          // Soft fills so event markers remain the primary attention layer
          fillOpacity: selected ? 0.14 : worldSoft ? 0.03 : 0.055,
          opacity: selected ? 1 : worldSoft ? 0.45 : 0.68,
          weight: selected ? 4 : worldSoft ? 1.25 : 2,
          dashArray: isLine || assessment.status === "unknown" ? "5 4" : null,
        },
      });
      layer.bindTooltip(
        `<strong>${chokepoint.shortName}</strong><br>Condition: ${assessment.status.replace(/-/g, " ")} · ${assessment.activeEventCount} related<br><em>Infrastructure context — not territorial control</em>`,
        { sticky: true }
      );
      layer.on("click", () => onSelect?.(chokepoint));
      layer.addTo(chokepointLayer);
    });
    // Do not raise chokepoints above events — restack keeps markers on top
    restackAttentionLayers();
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
