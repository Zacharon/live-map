import { getGlobeHandle } from "./globe-controller.js";
import { stabilizeScreenRotation } from './contact-orientation.js';
import { escapeHtml } from '../events/event-normalizer.js';
import { inViewport } from './attention-policy.js';
import { addOfflineDarkLayer, OFFLINE_BASEMAP_CREDIT } from "./offline-basemap.js";
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
    if (invalidateTimer) return;
    invalidateTimer = window.setTimeout(() => {
      invalidateTimer = null;
      updateSizeHealth();
      if (health.containerWidth > 0 && health.containerHeight > 0) {
        const center = map.getCenter();
        const zoom = map.getZoom();
        map.invalidateSize({ pan: false });
        map.setView(center, zoom, { animate: false });
        const globe = getGlobeHandle();
        globe?.viewer?.resize?.();
        globe?.viewer?.scene?.requestRender?.();
        health.mapInitialized = true;
        health.safeMessage = health.tileStatus === "unavailable" ? health.safeMessage : "Map layout is stable.";
      } else {
        health.safeMessage = "Map container is waiting for a visible layout.";
      }
      notifyHealth();
    }, 120);
  };

  const view = options.view || { lat:22,lon:10,zoom:2,basemap:'dark' };
  const map = L.map("map", { zoomControl: false, minZoom: 2, maxZoom: 19, worldCopyJump: true, preferCanvas: true }).setView([view.lat, view.lon], view.zoom);
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
    dark: L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      attribution: "(c) OpenStreetMap (c) CARTO",
      errorTileUrl: "",
    }),
    street: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "(c) OpenStreetMap contributors" }),
  };
  let activeBase = "satellite";
  let offlineLayer = null;
  let darkFailCount = 0;

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

  const initialBase = options.offlineDemo || view.basemap === "local-earth" ? "local-earth" : view.basemap;

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
  const priorityLayer = L.layerGroup().addTo(map);
  const ciiLayer = L.layerGroup({ pane: "of-country" }).addTo(map);
  const countryLayer = L.layerGroup({ pane: "of-country" }).addTo(map);
  const movingObjectLayer = L.layerGroup({ pane: "of-moving" }).addTo(map);
  const referenceLayer = L.layerGroup({ pane: "of-reference" }).addTo(map);
  const chokepointLayer = L.layerGroup({ pane: "of-chokepoint" }).addTo(map);
  const graphLayer = L.layerGroup({ pane: "of-reference" }).addTo(map);
  const densityLayer = L.layerGroup({ pane: "of-reference" }).addTo(map);

  function restackAttentionLayers() {
    // Events and selection must remain readable over infrastructure/chokepoints
    if (typeof markerLayer.bringToFront === "function") markerLayer.bringToFront();
    if (typeof movingObjectLayer.bringToFront === "function") movingObjectLayer.bringToFront();
    if (typeof clusterHighlightLayer.bringToFront === "function") clusterHighlightLayer.bringToFront();
  }

  function clearOffline() {
    if (offlineLayer) {
      map.removeLayer(offlineLayer);
      offlineLayer = null;
    }
  }

  function showOfflineDark(reason) {
    clearOffline();
    Object.values(basemaps).forEach((layer) => map.hasLayer(layer) && map.removeLayer(layer));
    offlineLayer = addOfflineDarkLayer(map, L);
    health.tileStatus = "offline-fallback";
    health.safeMessage = `${OFFLINE_BASEMAP_CREDIT}. ${reason}`;
    notifyHealth();
    const note = document.getElementById("mapHealth");
    if (note) note.dataset.offlineDark = "1";
  }

  function switchBase(name) {
    Object.values(basemaps).forEach((layer) => map.hasLayer(layer) && map.removeLayer(layer));
    clearOffline();
    activeBase = name;
    resetTileHealth(name);
    darkFailCount = 0;
    if (name === "satellite") {
      basemaps.satellite.addTo(map);
      basemaps.labels.addTo(map);
    } else if (name === "dark" || name === "local-earth" || name === "dark-offline") {
      showOfflineDark(name === "dark"
        ? "CARTO dark raster currently requires an API key; using local simplified geography."
        : "Requested offline geography.");
    } else if (name === "dark-online") {
      basemaps.dark.addTo(map);
      const onError = () => {
        darkFailCount += 1;
        if (darkFailCount >= 3) {
          basemaps.dark.off("tileerror", onError);
          showOfflineDark("Online dark tiles failed (blocked, missing key, or network).");
        }
      };
      basemaps.dark.on("tileerror", onError);
      basemaps.dark.on("tileload", () => {
        health.loadedTiles += 1;
        health.tileStatus = "operational";
        health.safeMessage = "Dark tiles loaded from CARTO. Attribution required. Watermarks mean an API key is required.";
        notifyHealth();
      });
    } else if (basemaps[name]) {
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

  const contactRotations = new Map();
  function renderMovingObjects(objects = [], onSelect = null, selectedId = null) {
    movingObjectLayer.clearLayers();
    const retainedIds=new Set(objects.map(object=>object.id));
    for(const id of contactRotations.keys()) if(!retainedIds.has(id)) contactRotations.delete(id);
    objects.filter(object => inViewport(object.latitude,object.longitude,currentBbox())).slice(0,500).forEach((object) => {
      const color = object.objectType === "aircraft" ? "#7dd3fc" : "#38e0a3";
      const rotation=stabilizeScreenRotation(contactRotations.get(object.id),Number.isFinite(object.heading)?object.heading*Math.PI/180:null);
      if(rotation!==null) contactRotations.set(object.id,rotation);
      const symbol=object.objectType==='aircraft' ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1l2 8 8 5v3l-8-2v5l3 2v1l-5-1-5 1v-1l3-2v-5l-8 2v-3l8-5z"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1l7 11-2 10H7L5 12z"/></svg>';
      const marker = L.marker([object.latitude, object.longitude], {
        pane:'of-moving',title:object.displayName,alt:`${object.objectType}: ${object.displayName}, ${object.stale?'stale':'observed'} position`,
        icon:L.divIcon({className:'moving-symbol',html:`<span class="${object.stale?'stale':''}" style="color:${color};transform:rotate(${(rotation??0)*180/Math.PI}deg)">${symbol}</span>`,iconSize:[20,20],iconAnchor:[10,10]}),
      });
      marker.bindTooltip(`<strong>${escapeHtml(object.displayName)}</strong><br>${escapeHtml(object.objectType)} · ${object.stale ? 'Stale position' : 'Observed position'}<br>${escapeHtml(new Date(object.observedAt).toISOString())}`);
      marker.on("click", () => onSelect?.(object));
      marker.addTo(movingObjectLayer);
      if(object.id===selectedId && object.observedTrack?.length>1) {
        let segment=[];
        for(const point of object.observedTrack) {
          if(segment.length && Math.abs(point.longitude-segment.at(-1)[1])>180) { if(segment.length>1)L.polyline(segment,{pane:'of-moving',color,weight:2,dashArray:'4 4'}).addTo(movingObjectLayer);segment=[]; }
          segment.push([point.latitude,point.longitude]);
        }
        if(segment.length>1)L.polyline(segment,{pane:'of-moving',color,weight:2,dashArray:'4 4'}).addTo(movingObjectLayer);
      }
    });
  }

  function renderReferencePoints({ airports = [], ports = [] } = {}) {
    referenceLayer.clearLayers();
    const zoom = map.getZoom();
    // Grammar: hide infrastructure pins at world scale to reduce clutter
    if (zoom < 4) return;
    const cap = zoom < 6 ? 24 : 50;
    airports.filter(p => inViewport(p.latitude,p.longitude,currentBbox())).slice(0, cap).forEach((airport) => {
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
    ports.filter(p => inViewport(p.latitude,p.longitude,currentBbox())).slice(0, cap).forEach((port) => {
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
    const labelBudget = worldSoft ? 12 : 16;
    let labels = 0;
    chokepoints.filter((item) => item.enabled && item.center).forEach((chokepoint) => {
      const assessment = assessmentById.get(chokepoint.id) || { status: "unknown", activeEventCount: 0 };
      const selected = chokepoint.id === selectedId;
      const color = colors[assessment.status] || colors.unknown;
      const marker = L.circleMarker([chokepoint.center.lat, chokepoint.center.lon], {
        pane: "of-chokepoint",
        radius: selected ? 8 : worldSoft ? 4 : 5,
        color,
        fillColor: color,
        fillOpacity: selected ? 0.9 : 0.55,
        weight: selected ? 2 : 1,
        className: "chokepoint-symbol",
      });
      marker.bindTooltip(`${chokepoint.shortName} · context, not an incident`, { permanent: selected || (labels < labelBudget && zoom >= 3), direction: "right", className: "chokepoint-label", opacity: selected ? 1 : 0.85 });
      if (!selected && zoom >= 3 && labels < labelBudget) labels += 1;
      marker.on("click", () => onSelect?.(chokepoint));
      marker.addTo(chokepointLayer);
      if (selected && chokepoint.geometry && chokepoint.geometryType !== "point") {
        L.geoJSON(chokepoint.geometry, {
          pane: "of-chokepoint",
          interactive: false,
          style: { color, weight: 2, dashArray: "4 6", fillOpacity: 0.04, opacity: 0.7 },
        }).addTo(chokepointLayer);
      }
    });
    // Do not raise chokepoints above events — restack keeps markers on top
    restackAttentionLayers();
  }

  function renderGraph(neighborhoodGraph) {
    graphLayer.clearLayers();
    if (!neighborhoodGraph?.edges?.length) return;
    const byId = new Map((neighborhoodGraph.nodes || []).map((node) => [node.id, node]));
    for (const edge of neighborhoodGraph.edges) {
      const from = byId.get(edge.fromId);
      const to = byId.get(edge.toId);
      if (!from?.geographic || !to?.geographic) continue;
      const dash = edge.heuristic ? "4 6" : null;
      const color = edge.edgeType === "contradicts" ? "#efbb73" : "#9bc5ee";
      const split = Math.abs(from.lon - to.lon) > 180;
      const segments = split
        ? [ [[from.lat, from.lon], [ (from.lat+to.lat)/2, from.lon > 0 ? 180 : -180 ]], [[(from.lat+to.lat)/2, from.lon > 0 ? -180 : 180], [to.lat, to.lon]] ]
        : [ [[from.lat, from.lon], [to.lat, to.lon]] ];
      for (const latlngs of segments) {
        L.polyline(latlngs, { pane: "of-reference", color, weight: 2, dashArray: dash, opacity: 0.75 }).bindTooltip(`${edge.edgeType} · ${edge.assertionClass}${edge.heuristic ? " · heuristic" : ""}`).addTo(graphLayer);
      }
    }
  }

  function renderDensity(cells = [], meta = {}) {
    densityLayer.clearLayers();
    if (!cells.length) return;
    cells.forEach((cell) => {
      L.circleMarker([cell.lat, cell.lon], { pane: "of-reference", radius: 4 + (cell.value || 0) * 6, color: "#7dd3fc", fillOpacity: 0.25, weight: 1 })
        .bindTooltip(`${meta.title || "SYNTHETIC FORMAT FIXTURE — NOT SOURCE MEASUREMENTS"}`)
        .addTo(densityLayer);
    });
  }

  function fitChokepoint(chokepoint) {
    if (!chokepoint?.geometry) return;
    const layer = L.geoJSON(chokepoint.geometry);
    const bounds = layer.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [48, 48], maxZoom: chokepoint.geometryType === "point" ? 7 : 5 });
  }

  const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(invalidateMapSize) : null;
  resizeObserver?.observe(mapElement);
  const globeStage = document.getElementById("globeStage");
  if (globeStage) resizeObserver?.observe(globeStage);
  window.addEventListener("resize", invalidateMapSize, { passive: true });
  window.addEventListener("orientationchange", invalidateMapSize, { passive: true });
  window.requestAnimationFrame(invalidateMapSize);
  switchBase(initialBase);

  function clearClusterHighlight() {
    clusterHighlightLayer.clearLayers();
  }

  return {
    map,
    markerLayer,
    priorityLayer,
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
    renderGraph,
    renderDensity,
    fitChokepoint,
    currentBbox,
    invalidateMapSize,
    health: () => ({ ...health }),
    activeBase: () => activeBase,
  };
}
