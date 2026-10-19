import { autoRenderer, bandFromZoom, cameraHeightFromLeafletZoom, leafletZoomFromMetersPerPixel, metersPerPixelFromCamera } from "./semantic-bands.js";
import { webglAvailable } from "./cesium-adapter.js";

let globeHandle = null;
let lastRenderer = "leaflet";
let contextLost = false;
let createCount = 0;
let requestSerial = 0;
let inflight = null;
let activeOptions = null;

function publishRenderer(serial, renderer, reason = "", asked = "") {
  if (serial !== requestSerial) return { renderer, reason, stale: true };
  if (typeof document !== "undefined" && document.body) {
    document.body.dataset.liveMapRenderer = renderer;
    document.body.dataset.liveMapGlobeReason = reason || "";
    document.body.dataset.liveMapGlobeSerial = String(serial);
    document.body.dataset.liveMapGlobeAsked = asked;
  }
  return { renderer, reason };
}

function failFlags() {
  const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
  return {
    failWebgl: params.get("failWebgl") === "1",
    failCesium: params.get("failCesium") === "1",
    simulateContextLoss: params.get("simulateContextLoss") === "1",
  };
}

export function currentRenderer() {
  return lastRenderer;
}

export function getGlobeHandle() {
  return globeHandle;
}

export function globeCreateCount() {
  return createCount;
}

// The 3D globe has its own page (globe.html) whose CSP allows the eval that
// Cesium's bundled Knockout needs; every other page keeps the strict policy.
export const GLOBE_PAGE_PATH = "/globe.html";

export function isGlobePage(doc = typeof document !== "undefined" ? document : null) {
  return doc?.querySelector?.('meta[name="live-map-page"]')?.getAttribute("content") === "globe";
}

export function globePageHref(loc = typeof window !== "undefined" ? window.location : null, mode = "3d") {
  let params;
  try { params = new URLSearchParams(loc?.search || ""); } catch { params = new URLSearchParams(); }
  params.set("mapMode", mode === "auto" ? "auto" : "3d");
  return `${GLOBE_PAGE_PATH}?${params.toString()}${loc?.hash || ""}`;
}

// Explicit 3D runs on the globe page. Homepage Auto stays in 2D under its
// strict CSP; the globe page retains adaptive Auto rendering.
export function needsGlobePage(mode, doc = typeof document !== "undefined" ? document : null) {
  return mode === "3d" && !isGlobePage(doc);
}

function showFallback(globe, mapEl, message, events, { offerGlobePage = false } = {}) {
  mapEl.hidden = false;
  globe.hidden = false;
  globe.classList.add("globe-fallback");
  globe.replaceChildren();
  const card = document.createElement("div");
  card.className = "globe-card";
  card.setAttribute("role", "status");
  const title = document.createElement("strong");
  title.textContent = "3D globe unavailable";
  const reason = document.createElement("p");
  reason.textContent = String(message || "Globe could not start.");
  const keep = document.createElement("p");
  keep.textContent = `${events.length} filtered events, filters and time are preserved on the 2D map.`;
  card.append(title, reason, keep);
  if (offerGlobePage) {
    const link = document.createElement("a");
    link.className = "text-button globe-page-link";
    link.href = globePageHref();
    link.textContent = "Open the 3D globe page";
    card.append(link);
  }
  globe.append(card);
}

function attachGlobeChrome(globe, handle) {
  let bar = globe.querySelector(".globe-chrome");
  if (!bar) {
    bar = document.createElement("div");
    bar.className = "globe-chrome";
    bar.innerHTML = '<button type="button" data-globe-north>North up</button><button type="button" data-globe-global>Global view</button><button type="button" data-globe-focus>Focus selection</button>';
    globe.append(bar);
    bar.addEventListener("click", (event) => {
      if (event.target.closest("[data-globe-north]")) handle.resetNorth?.();
      if (event.target.closest("[data-globe-global]")) handle.viewGlobal?.();
      if (event.target.closest("[data-globe-focus]")) handle.focusSelection?.();
    });
  }
}

let startFailure = null;

function showStartFailure(serial, globe, mapEl, events, mode, band, webgl) {
  lastRenderer = "leaflet";
  const evalBlocked = /unsafe-eval|EvalError|WebAssembly/i.test(startFailure);
  const onGlobePage = isGlobePage();
  const reason = !evalBlocked
    ? startFailure
    : onGlobePage
      ? "Cesium needs eval, and this page's security policy still blocks it. The 2D map keeps your selection, filters, and time."
      : "Cesium needs eval, which this page's strict security policy blocks by design. The 3D globe runs on its own page. The 2D map keeps your selection, filters, and time.";
  showFallback(globe, mapEl, reason, events, { offerGlobePage: evalBlocked && !onGlobePage });
  return { ...publishRenderer(serial, "leaflet-fallback", reason, mode), band, webgl, reason };
}

export async function setGlobeMode(mode, events, sharedView = {}, options = {}) {
  const serial = ++requestSerial;
  activeOptions = options;
  const mapEl = document.getElementById("map");
  const globe = document.getElementById("globeStage");
  if (!mapEl || !globe) return publishRenderer(serial, "leaflet");
  const flags = failFlags();
  const webgl = webglAvailable() && !contextLost && !flags.failWebgl;
  const zoom = sharedView.zoom ?? 2;
  let renderer = "leaflet";
  if (mode === "3d") renderer = webgl ? "cesium" : "leaflet-fallback";
  else if (mode === "auto") renderer = autoRenderer(zoom, { webgl, previous: lastRenderer === "cesium" ? "cesium" : "leaflet" });
  else renderer = "leaflet";

  const band = bandFromZoom(zoom, sharedView.semanticBand);
  const useGlobe = renderer === "cesium" && !flags.failCesium;

  if (renderer === "leaflet") {
    globe.classList.remove("globe-fallback");
    mapEl.hidden = false;
    globe.hidden = true;
    globe.innerHTML = "";
    lastRenderer = "leaflet";
    const published = publishRenderer(serial, "leaflet", "", mode);
    const handle = globeHandle;
    const pending = inflight;
    globeHandle = null;
    inflight = null;
    try { handle?.destroy?.(); } catch { /* Viewer teardown can emit context loss. */ }
    pending?.then((created) => { try { created?.destroy?.(); } catch { /* already torn down */ } });
    return { ...published, band, webgl, cesiumLoaded: Boolean(globalThis.Cesium) };
  }

  if (useGlobe && startFailure) return showStartFailure(serial, globe, mapEl, events, mode, band, webgl);

  if (!useGlobe) {
    lastRenderer = "leaflet";
    if (globeHandle?.destroy) {
      globeHandle.destroy();
      globeHandle = null;
    }
    const reason = flags.failCesium
      ? "Cesium assets were requested to fail for this test (?failCesium=1)."
      : flags.failWebgl
        ? "WebGL initialization was forced unavailable (?failWebgl=1)."
        : contextLost
          ? "The WebGL context was lost after initialization."
          : "WebGL is missing or Cesium assets are not local.";
    showFallback(globe, mapEl, reason, events);
    return { ...publishRenderer(serial, "leaflet-fallback", reason, mode), band, webgl, reason };
  }

  globe.classList.remove("globe-fallback");
  mapEl.hidden = true;
  globe.hidden = false;
  lastRenderer = "cesium";

  if (!globeHandle?.ok) {
    if (!inflight) {
      const captured = sharedView;
      const capturedOptions = options;
      const capturedFlags = flags;
      inflight = (async () => {
        const { createCesiumGlobe } = await import("./cesium-adapter.js");
        globe.innerHTML = "";
        createCount += 1;
        return createCesiumGlobe(globe, captured, {
          cameraHeightFromZoom: (z, lat, width) => cameraHeightFromLeafletZoom(z, { latitude: lat, viewportWidthPx: width || globe.clientWidth || 1280 }),
          cameraZoomFromHeight: (height, lat, width) => {
            const mpp = metersPerPixelFromCamera({ heightMeters: height, latitude: lat, viewportWidthPx: width });
            return Math.max(2, Math.min(19, leafletZoomFromMetersPerPixel(mpp, lat) ?? zoom));
          },
          failAssets: capturedFlags.failCesium,
          darkAtlas: capturedOptions.basemap === "dark" || capturedOptions.darkAtlas,
          // The viewer survives feed rerenders; callbacks must see current filters and selection.
          onSelectId: (id) => activeOptions?.onSelectId?.(id),
          onViewChange: (view) => activeOptions?.onViewChange?.(view),
          onViewportChange: () => activeOptions?.onViewportChange?.(),
          onContextLoss(detail) {
            contextLost = true;
            activeOptions?.onContextLoss?.(detail || { induced: true, source: "webglcontextlost" });
          },
        });
      })();
    }
    const created = await inflight;
    if (serial !== requestSerial) return { renderer: "cesium", stale: true, band, webgl };
    globeHandle = created;
    inflight = null;
    if (!globeHandle?.ok) {
      // A failed start stays failed for this page load: retrying re-imports a
      // script that already threw and would leave the map hidden behind a blank globe.
      startFailure = globeHandle.reason || "Globe could not start.";
      globeHandle = null;
      return showStartFailure(serial, globe, mapEl, events, mode, band, webgl);
    }
    attachGlobeChrome(globe, globeHandle);
    globeHandle.viewer?.resize?.();
    globeHandle.viewer?.scene?.requestRender?.();
    if (flags.simulateContextLoss) {
      const ext = globeHandle.viewer?.scene?.canvas?.getContext("webgl2") || globeHandle.viewer?.scene?.canvas?.getContext("webgl");
      ext?.getExtension?.("WEBGL_lose_context")?.loseContext();
    }
  } else {
    // Feed, time, and layer rerenders must not reset a camera the operator moved.
    if (options.forceView) globeHandle.applyView(sharedView);
  }
  globeHandle.setEvents?.(options.visibleEvents, options.selectedEventId, options.selectedEvent);
  globeHandle.setGraph?.(options.graph);
  globeHandle.setChokepoints?.(options.chokepoints, options.assessments, options.selectedChokepointId);
  return { ...publishRenderer(serial, "cesium"), band, webgl, eventCount: events.length, createCount };
}

export function destroyGlobe() {
  globeHandle?.destroy?.();
  globeHandle = null;
  activeOptions = null;
}

export { webglAvailable };
