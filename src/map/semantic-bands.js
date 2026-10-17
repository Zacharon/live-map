/**
 * Semantic zoom bands from visible ground scale, not from equating Leaflet
 * zoom integers with Cesium camera heights. Camera height controls presentation
 * only — it does not change evidence quality, freshness, or dataset altitude.
 */

export const SEMANTIC_BANDS = ["local", "regional", "global", "weather-atmosphere", "orbital"];

export const DEFAULT_BAND_CONFIG = {
  localMinZoom: 7,
  regionalMinZoom: 4,
  weatherMaxZoom: 3,
  orbitalMaxZoom: 1.5,
  hysteresis: 0.35,
  fovDegrees: 60,
};

export function metersPerPixelFromLeafletZoom(zoom, latitude = 0) {
  const z = Number(zoom);
  if (!Number.isFinite(z)) return null;
  return 156543.03392 * Math.cos((latitude * Math.PI) / 180) / 2 ** z;
}

export function leafletZoomFromMetersPerPixel(metersPerPixel, latitude = 0) {
  if (!(metersPerPixel > 0)) return null;
  const cos = Math.cos((latitude * Math.PI) / 180);
  if (!(cos > 0)) return 2;
  return Math.log2(156543.03392 * cos / metersPerPixel);
}

export function metersPerPixelFromCamera({ heightMeters, fovDegrees = 60, viewportWidthPx = 1280, latitude = 0 } = {}) {
  if (!(heightMeters > 0) || !(viewportWidthPx > 0)) return null;
  const fov = (fovDegrees * Math.PI) / 180;
  const groundWidth = 2 * heightMeters * Math.tan(fov / 2) / Math.max(0.2, Math.cos((latitude * Math.PI) / 180));
  return groundWidth / viewportWidthPx;
}

export function cameraHeightFromLeafletZoom(zoom, { latitude = 0, fovDegrees = 60, viewportWidthPx = 1280 } = {}) {
  const mpp = metersPerPixelFromLeafletZoom(zoom, latitude);
  if (mpp == null) return null;
  const fov = (fovDegrees * Math.PI) / 180;
  const groundWidth = mpp * viewportWidthPx;
  const cos = Math.max(0.2, Math.cos((latitude * Math.PI) / 180));
  return (groundWidth * cos) / (2 * Math.tan(fov / 2));
}

export function bandFromZoom(zoom, previous = null, config = DEFAULT_BAND_CONFIG) {
  const z = Number(zoom);
  if (!Number.isFinite(z)) return previous || "global";
  const h = config.hysteresis || 0;
  const candidates = [
    { id: "orbital", enter: z <= config.orbitalMaxZoom, exit: z > config.orbitalMaxZoom + h },
    { id: "weather-atmosphere", enter: z <= config.weatherMaxZoom, exit: z > config.weatherMaxZoom + h },
    { id: "global", enter: z < config.regionalMinZoom, exit: z >= config.regionalMinZoom + h },
    { id: "regional", enter: z < config.localMinZoom, exit: z >= config.localMinZoom + h },
    { id: "local", enter: true, exit: false },
  ];
  if (previous) {
    const current = candidates.find((item) => item.id === previous);
    if (current && !current.exit && previous !== "local") return previous;
    if (previous === "local" && z >= config.localMinZoom - h) return "local";
  }
  return candidates.find((item) => item.enter)?.id || "global";
}

export function autoRenderer(zoom, { webgl = true, previous = "leaflet", hysteresis = 0.5 } = {}) {
  if (!webgl) return "leaflet";
  const z = Number(zoom);
  if (previous === "cesium") return z >= 4 + hysteresis ? "leaflet" : "cesium";
  return z <= 4 - hysteresis ? "cesium" : "leaflet";
}

export function bandPresentation(band) {
  return {
    local: { events: "detailed-markers", relationships: "selected-only", infrastructure: "local", weather: "optional-pin" },
    regional: { events: "summaries", relationships: "selected", infrastructure: "relevant", weather: "optional-pin" },
    global: { events: "highest-priority", relationships: "bounded-geographic", infrastructure: "chokepoints", weather: "optional-pin" },
    "weather-atmosphere": { events: "highest-priority", relationships: "bounded-geographic", infrastructure: "chokepoints", weather: "readable-field" },
    orbital: { events: "highest-priority", relationships: "bounded-geographic", infrastructure: "chokepoints", weather: "optional-pin", orbital: "selected-groups" },
  }[band] || { events: "highest-priority" };
}
