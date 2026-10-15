/**
 * Lazy CesiumJS adapter. No ion account, no default demo token, no paid terrain.
 * Local Natural Earth II when vendored; otherwise ellipsoid + Leaflet fallback.
 */

export const CESIUM_VERSION = "1.145.0";
export const CESIUM_BASE = "./vendor/cesium/";
export const CESIUM_LICENSE = "Apache-2.0";

export function globeEventEligible(event) {
  return event?.geographic !== false && Number.isFinite(event?.lat) && Number.isFinite(event?.lon)
    && Math.abs(event.lat) <= 90 && Math.abs(event.lon) <= 180;
}

export function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") || canvas.getContext("webgl");
    // Rendering and camera updates call this probe repeatedly. Release its
    // temporary context so Chromium does not evict the actual globe context.
    const available = Boolean(context);
    context?.getExtension?.("WEBGL_lose_context")?.loseContext();
    return available;
  } catch {
    return false;
  }
}

function ensureWidgetsCss(baseHref) {
  if (document.querySelector("link[data-cesium-widgets]")) return;
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = new URL("Widgets/widgets.css", baseHref).href;
  css.dataset.cesiumWidgets = CESIUM_VERSION;
  document.head.append(css);
}

function namespaceFromModule(mod) {
  if (!mod) return null;
  if (mod.Viewer) return mod;
  if (mod.default?.Viewer) return mod.default;
  return null;
}

function cesiumBaseHref() {
  try {
    return new URL(CESIUM_BASE, globalThis.location?.href || "http://127.0.0.1/").href;
  } catch {
    return CESIUM_BASE;
  }
}

export async function loadCesiumScript() {
  if (globalThis.Cesium?.Viewer) return globalThis.Cesium;
  const baseHref = cesiumBaseHref();
  globalThis.CESIUM_BASE_URL = baseHref;
  ensureWidgetsCss(baseHref);
  try {
    const mod = await import(new URL("index.js", baseHref).href);
    const Cesium = namespaceFromModule(mod);
    if (Cesium?.Viewer) {
      globalThis.Cesium = Cesium;
      return Cesium;
    }
  } catch (error) {
    console.warn("Cesium ESM import failed; trying IIFE build.", error);
  }
  let scriptFailure = "";
  const noteFailure = (event) => {
    scriptFailure = event?.message || event?.error?.message || scriptFailure;
  };
  globalThis.addEventListener?.("error", noteFailure);
  try {
    await new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-cesium]");
      if (existing) {
        if (globalThis.Cesium?.Viewer) {
          resolve();
          return;
        }
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("Cesium failed to load")));
        return;
      }
      const script = document.createElement("script");
      script.src = new URL("Cesium.js", baseHref).href;
      script.dataset.cesium = CESIUM_VERSION;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(scriptFailure || "Cesium assets are not available locally"));
      document.head.append(script);
    });
  } finally {
    globalThis.removeEventListener?.("error", noteFailure);
  }
  if (!globalThis.Cesium?.Viewer) {
    throw new Error(scriptFailure || "Cesium Viewer missing after load");
  }
  return globalThis.Cesium;
}

export async function createCesiumGlobe(container, sharedView, options = {}) {
  if (!webglAvailable()) {
    return { ok: false, reason: "webgl-unavailable", fallback: "leaflet" };
  }
  let Cesium;
  try {
    Cesium = await loadCesiumScript();
  } catch (error) {
    return { ok: false, reason: error.message, fallback: "leaflet" };
  }
  if (Cesium.Ion) Cesium.Ion.defaultAccessToken = "";
  if (options.failAssets) return { ok: false, reason: "cesium-assets-missing", fallback: "leaflet" };
  const imagery = [];
  const imageryUrl = new URL("Assets/Textures/NaturalEarthII", cesiumBaseHref()).href;
  try {
    imagery.push(await Cesium.TileMapServiceImageryProvider.fromUrl(imageryUrl, {
      credit: new Cesium.Credit("Natural Earth / CesiumJS Apache-2.0 — low-resolution local basemap, not live imagery"),
    }));
  } catch {
    imagery.push(null);
  }
  let viewer;
  try {
  viewer = new Cesium.Viewer(container, {
    animation: false,
    timeline: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    baseLayerPicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    shouldAnimate: false,
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    baseLayer: imagery[0] ? new Cesium.ImageryLayer(imagery[0]) : false,
    requestRenderMode: true,
    maximumRenderTimeChange: Infinity,
    skyBox: false,
    contextOptions: { webgl: { preserveDrawingBuffer: true } },
  });
  } catch (error) {
    return { ok: false, reason: error.message || "Cesium Viewer failed to start", fallback: "leaflet" };
  }
  viewer.scene.globe.enableLighting = false;
  viewer.scene.fog.enabled = false;
  viewer.scene.globe.depthTestAgainstTerrain = false;
  viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString(options.darkAtlas ? "#0b1220" : "#1a3654");
  if (options.darkAtlas && imagery[0] && viewer.imageryLayers.length) {
    viewer.imageryLayers.get(0).saturation = 0.25;
    viewer.imageryLayers.get(0).brightness = 0.55;
    viewer.imageryLayers.get(0).contrast = 1.15;
  }
  viewer.scene.globe.translucency.enabled = false;
  const graphEntities = [];
  const chokepointEntities = [];
  const chokepointLabels = [];
  const eventEntities = [];
  const eventRecords = new Map();
  let eventCreateCount = 0;
  let selectedEventLocation = null;
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction((click) => {
    const picked = viewer.scene.pick(click.position);
    const id = picked?.id?.id || picked?.id;
    container.dataset.globeLastPick = id ? String(id) : "";
    if (id) options.onSelectId?.(String(id));
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  let alive = true;
  const lost = () => {
    if (!alive) return;
    options.onContextLoss?.({ induced: true, source: "webglcontextlost" });
  };
  viewer.canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    lost();
  });

  let lastTarget = { lat: sharedView.lat, lon: sharedView.lon, zoom: sharedView.zoom };

  function applyView(view) {
    const lat = Number(view.lat);
    const lon = Number(view.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    lastTarget = { lat, lon, zoom: view.zoom };
    const height = options.cameraHeightFromZoom?.(view.zoom, lat, viewer.canvas.clientWidth || container.clientWidth) || 8_000_000;
    container.dataset.globeCameraHeight = String(Math.round(height));
    container.dataset.globeAppliedWidth = String(viewer.canvas.clientWidth || container.clientWidth);
    const destination = Cesium.Cartesian3.fromDegrees(lon, lat, height);
    viewer.camera.setView({
      destination,
      orientation: {
        heading: Cesium.Math.toRadians(Number(view.heading) || 0),
        pitch: Cesium.Math.toRadians(Number.isFinite(Number(view.pitch)) ? Number(view.pitch) : -90),
        roll: 0,
      },
    });
    viewer.scene.requestRender();
  }

  function currentTarget() {
    const width = viewer.canvas?.clientWidth || 0;
    const height = viewer.canvas?.clientHeight || 0;
    if (width > 0 && height > 0) {
      const ray = viewer.camera.getPickRay(new Cesium.Cartesian2(width / 2, height / 2));
      const hit = ray && viewer.scene.globe.pick(ray, viewer.scene);
      if (hit) {
        const carto = Cesium.Cartographic.fromCartesian(hit);
        lastTarget = {
          lat: Cesium.Math.toDegrees(carto.latitude),
          lon: Cesium.Math.toDegrees(carto.longitude),
          zoom: options.cameraZoomFromHeight?.(viewer.camera.positionCartographic.height, Cesium.Math.toDegrees(carto.latitude), width) ?? lastTarget.zoom,
        };
      }
    }
    return { ...lastTarget };
  }

  function currentBbox() {
    const rectangle = viewer.camera.computeViewRectangle(viewer.scene.globe.ellipsoid);
    if (!rectangle) return null;
    return {
      south: Cesium.Math.toDegrees(rectangle.south),
      north: Cesium.Math.toDegrees(rectangle.north),
      west: Cesium.Math.toDegrees(rectangle.west),
      east: Cesium.Math.toDegrees(rectangle.east),
    };
  }

  function resetNorth() {
    const target = currentTarget();
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(target.lon, target.lat, viewer.camera.positionCartographic.height),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
    });
    viewer.scene.requestRender();
  }

  function viewGlobal() {
    applyView({ lat: 20, lon: 0, zoom: 3 });
  }

  function clearList(list) {
    for (const entity of list) viewer.entities.remove(entity);
    list.length = 0;
  }

  function setEvents(events = [], selectedId = null, selectedEvent = null) {
    const incoming = new Set();
    selectedEventLocation = globeEventEligible(selectedEvent) ? { lat: selectedEvent.lat, lon: selectedEvent.lon } : null;
    for (const event of events) {
      if (!globeEventEligible(event)) continue;
      incoming.add(event.id);
      const selected = String(event.id) === String(selectedId);
      if (selected) selectedEventLocation = { lat: event.lat, lon: event.lon };
      const lead = event.recordKind && event.recordKind !== "event";
      const color = Cesium.Color.fromCssColorString(event.taxonomyColor || "#e9bb72") || Cesium.Color.fromCssColorString("#e9bb72");
      const signature = JSON.stringify([event.lat, event.lon, event.title, event.taxonomyColor, event.severity, lead, selected]);
      const existing = eventRecords.get(event.id);
      if (existing?.signature === signature) continue;
      const spec = {
        id: `event:${event.id}`,
        name: event.title,
        position: Cesium.Cartesian3.fromDegrees(event.lon, event.lat),
        point: {
          pixelSize: selected ? 16 : ["critical", "high"].includes(event.severity) ? 11 : 8,
          color: lead ? color.withAlpha(0.45) : color,
          outlineColor: selected ? Cesium.Color.CYAN : Cesium.Color.WHITE,
          outlineWidth: selected ? 4 : lead ? 1 : 2,
          disableDepthTestDistance: 0,
        },
      };
      if (existing) {
        existing.entity.name = spec.name;
        existing.entity.position = spec.position;
        existing.entity.point = spec.point;
        existing.signature = signature;
      } else {
        const entity = viewer.entities.add(spec);
        eventRecords.set(event.id, { entity, signature });
        eventCreateCount++;
      }
    }
    for (const [id, record] of eventRecords) {
      if (!incoming.has(id)) { viewer.entities.remove(record.entity); eventRecords.delete(id); }
    }
    eventEntities.length = 0;
    eventEntities.push(...[...eventRecords.values()].map((record) => record.entity));
    container.dataset.globeEventCount = String(eventEntities.length);
    container.dataset.globeEventCreates = String(eventCreateCount);
    container.dataset.globeSelectedEvent = selectedId == null ? "" : String(selectedId);
    viewer.scene.requestRender();
  }

  function focusSelection() {
    if (!selectedEventLocation) return false;
    applyView({ ...currentTarget(), ...selectedEventLocation, zoom: Math.max(currentTarget().zoom || 2, 5) });
    return true;
  }

  function setChokepoints(chokepoints = [], assessments = [], selectedId = null) {
    clearList(chokepointEntities);
    chokepointLabels.length = 0;
    for (const item of chokepoints) {
      const center = item.center;
      if (!Number.isFinite(center?.lat) || !Number.isFinite(center?.lon)) continue;
      const selected = item.id === selectedId;
      const position = Cesium.Cartesian3.fromDegrees(center.lon, center.lat);
      const labelText = `${item.shortName || item.name}`;
      const entity = viewer.entities.add({
        id: `chokepoint:${item.id}`,
        name: item.name,
        position,
        point: {
          pixelSize: selected ? 12 : 7,
          color: Cesium.Color.fromCssColorString(selected ? "#9bc5ee" : "#94a3b8"),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 1,
          disableDepthTestDistance: 0,
        },
        label: {
          text: labelText,
          font: "11px sans-serif",
          fillColor: Cesium.Color.WHITE,
          showBackground: true,
          show: false,
          pixelOffset: new Cesium.Cartesian2(0, -16),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
      chokepointEntities.push(entity);
      chokepointLabels.push({ entity, position, selected, labelText });
    }
    updateChokepointLabels();
    viewer.scene.requestRender();
  }

  function updateChokepointLabels() {
    const width = viewer.canvas.clientWidth;
    const height = viewer.canvas.clientHeight;
    if (!width || !height) return;
    const zoom = lastTarget.zoom || 2;
    const budget = zoom < 4 ? 0 : zoom < 7 ? 8 : 12;
    const canvasBounds = viewer.canvas.getBoundingClientRect();
    const occupied = [".map-context", ".map-toolbar", ".globe-chrome", ".drawer-right.open"]
      .map((selector) => container.closest(".map-workspace")?.querySelector(selector))
      .filter((element) => element && element.getClientRects().length)
      .map((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          left: bounds.left - canvasBounds.left - 8,
          right: bounds.right - canvasBounds.left + 8,
          top: bounds.top - canvasBounds.top - 8,
          bottom: bounds.bottom - canvasBounds.top + 8,
        };
      });
    let shown = 0;
    let changed = false;
    for (const item of [...chokepointLabels].sort((a, b) => Number(b.selected) - Number(a.selected))) {
      let show = false;
      if (shown < budget || item.selected) {
        const outward = Cesium.Cartesian3.normalize(item.position, new Cesium.Cartesian3());
        const toCamera = Cesium.Cartesian3.subtract(viewer.camera.positionWC, item.position, new Cesium.Cartesian3());
        if (Cesium.Cartesian3.dot(outward, toCamera) > 0) {
          const screen = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, item.position);
          if (screen && screen.x >= 0 && screen.x <= width && screen.y >= 0 && screen.y <= height) {
            const labelWidth = Math.min(180, item.labelText.length * 7 + 12);
            const box = { left: screen.x - labelWidth / 2 - 8, right: screen.x + labelWidth / 2 + 8, top: screen.y - 40, bottom: screen.y - 8 };
            if (!occupied.some((other) => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top)) {
              show = true;
              occupied.push(box);
              shown += 1;
            }
          }
        }
      }
      if (item.entity.label.show?.getValue() !== show) {
        item.entity.label.show = show;
        changed = true;
      }
    }
    if (changed) viewer.scene.requestRender();
  }

  function setGraph(graph = {}) {
    clearList(graphEntities);
    const byId = new Map((graph.nodes || []).map((node) => [node.id, node]));
    for (const node of graph.nodes || []) {
      if (!node.geographic || !Number.isFinite(node.lat) || !Number.isFinite(node.lon)) continue;
      graphEntities.push(viewer.entities.add({
        id: `node:${node.id}`,
        name: node.title,
        position: Cesium.Cartesian3.fromDegrees(node.lon, node.lat),
        point: { pixelSize: 8, color: Cesium.Color.fromCssColorString("#9bc5ee"), disableDepthTestDistance: 0 },
      }));
    }
    for (const edge of graph.edges || []) {
      const from = byId.get(edge.fromId);
      const to = byId.get(edge.toId);
      if (!from?.geographic || !to?.geographic) continue;
      graphEntities.push(viewer.entities.add({
        id: `edge:${edge.id}`,
        name: `${edge.edgeType} · ${edge.assertionClass}`,
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray([from.lon, from.lat, to.lon, to.lat]),
          width: 2,
          material: Cesium.Color.fromCssColorString(edge.heuristic ? "#efbb73" : "#9bc5ee"),
          arcType: Cesium.ArcType.GEODESIC,
          depthFailMaterial: Cesium.Color.TRANSPARENT,
        },
      }));
    }
    viewer.scene.requestRender();
  }

  applyView(sharedView);
  let stableCanvasWidth = viewer.canvas.clientWidth || container.clientWidth;
  let lastContainerWidth = container.clientWidth;
  let resizing = false;
  let resizeFrameId = null;
  let pendingWidthChange = false;
  let preservedResizeView = null;

  const onCameraMoveEnd = () => {
    if (resizing || viewer.canvas.clientWidth !== stableCanvasWidth) return;
    const view = currentTarget();
    updateChokepointLabels();
    options.onViewChange?.(view);
  };
  viewer.camera.moveEnd.addEventListener(onCameraMoveEnd);
  viewer.scene.postRender.addEventListener(updateChokepointLabels);
  const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
    if (!alive) return;
    const width = container.clientWidth;
    const widthChanged = Boolean(width && width !== lastContainerWidth);
    lastContainerWidth = width;
    if (widthChanged) {
      pendingWidthChange = true;
      preservedResizeView = { ...lastTarget };
    }
    resizing = true;
    viewer.resize();
    if (resizeFrameId != null) cancelAnimationFrame(resizeFrameId);
    resizeFrameId = requestAnimationFrame(() => {
      resizeFrameId = null;
      if (!alive) return;
      viewer.resize();
      if (pendingWidthChange) applyView(preservedResizeView);
      stableCanvasWidth = viewer.canvas.clientWidth;
      resizing = false;
      viewer.scene.requestRender();
      if (pendingWidthChange) options.onViewChange?.(currentTarget());
      pendingWidthChange = false;
      preservedResizeView = null;
      options.onViewportChange?.();
    });
  });
  resizeObserver?.observe(container);

  viewer.resize();
  viewer.scene.requestRender();

  return {
    ok: true,
    viewer,
    Cesium,
    applyView,
    currentTarget,
    currentBbox,
    resetNorth,
    viewGlobal,
    setGraph,
    setEvents,
    focusSelection,
    setChokepoints,
    canvasCount() { return viewer.scene.canvas ? 1 : 0; },
    destroy() {
      alive = false;
      resizeObserver?.disconnect();
      if (resizeFrameId != null) cancelAnimationFrame(resizeFrameId);
      viewer.camera.moveEnd.removeEventListener(onCameraMoveEnd);
      viewer.scene.postRender.removeEventListener(updateChokepointLabels);
      handler.destroy();
      clearList(graphEntities);
      clearList(chokepointEntities);
      clearList(eventEntities);
      eventRecords.clear();
      delete container.dataset.globeEventCount;
      delete container.dataset.globeSelectedEvent;
      delete container.dataset.globeLastPick;
      delete container.dataset.globeCameraHeight;
      delete container.dataset.globeAppliedWidth;
      viewer.destroy();
    },
  };
}
