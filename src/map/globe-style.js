/**
 * Pure styling helpers for the Cesium globe. No Cesium import, so the rules
 * stay testable in Node. All assets are local: no ion token, keys or tiles.
 */

import { SEVERITIES } from "../config.js";

export const NATURAL_EARTH_BORDERS_URL = "./vendor/natural-earth/ne_110m_admin_0_boundary_lines_land.json";
export const BORDER_CREDIT = "Borders: Natural Earth 1:110m (public domain), simplified, not legal boundaries";

/**
 * Local Natural Earth II stops at level 2. A lower screen-space error only
 * splits the ellipsoid into more meshes, which flash the placeholder color
 * without sharper imagery. The underlay is that same pyramid clamped to level 0.
 */
export const GLOBE_TILE_LOADING = {
  maximumScreenSpaceError: 2,
  tileCacheSize: 512,
  loadingDescendantLimit: 8,
  preloadAncestors: true,
  preloadSiblings: true,
  maximumRequestsPerServer: 24,
  underlayMaximumLevel: 0,
};

/** Globe looks. "night" darkens the bundled Natural Earth II raster; "natural" keeps it as shipped. */
export const GLOBE_STYLES = {
  night: {
    // Graded ocean. Terrain with no texture yet draws this instead of black.
    baseColor: "#123044",
    background: "#02050b",
    imagery: { brightness: 0.36, contrast: 1.6, saturation: 0.6, gamma: 0.92, hue: 0 },
    graticule: "rgba(140, 180, 230, 0.14)",
    equator: "rgba(150, 195, 245, 0.32)",
    border: "rgba(196, 214, 236, 0.55)",
  },
  natural: {
    baseColor: "#1a3654",
    background: "#02050b",
    imagery: null,
    graticule: "rgba(255, 255, 255, 0.16)",
    equator: "rgba(255, 255, 255, 0.34)",
    border: "rgba(255, 255, 255, 0.6)",
  },
};

export function globeStyleFor(options = {}) {
  if (options.globeStyle && GLOBE_STYLES[options.globeStyle]) return options.globeStyle;
  return options.basemap === "natural" ? "natural" : "night";
}

export function severityRank(severity) {
  return SEVERITIES[severity]?.score ?? 0;
}

export function severityColor(severity) {
  return SEVERITIES[severity]?.color || SEVERITIES.low.color;
}

/**
 * Marker grammar: the core keeps the category colour used by the 2D map key;
 * the ring and halo carry severity, and size grows with severity.
 */
export function markerSpec(event = {}, selected = false) {
  const rank = severityRank(event.severity);
  const lead = Boolean(event.recordKind && event.recordKind !== "event");
  const core = selected ? 9 : [3, 4, 5, 6, 7][rank] ?? 4;
  return {
    key: [event.taxonomyColor || "", event.severity || "", lead, selected].join("|"),
    core,
    ring: severityColor(event.severity),
    fill: event.taxonomyColor || "#e9bb72",
    halo: selected || rank >= 3,
    haloAlpha: selected ? 0.45 : rank >= 4 ? 0.38 : 0.24,
    alpha: lead ? 0.5 : 1,
    selected,
    size: Math.ceil((core + 6) * 2 + (selected || rank >= 3 ? 10 : 2)),
  };
}

/** Cluster badge: count and the most severe member's colour. */
export function clusterSpec(severities = []) {
  const top = severities.reduce((best, item) => (severityRank(item) > severityRank(best) ? item : best), "low");
  const count = severities.length;
  return { count, label: count > 99 ? "99+" : String(count), ring: severityColor(top), severity: top, size: count >= 50 ? 46 : count >= 10 ? 40 : 34 };
}

function densify(points, stepDeg) {
  const output = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const [lon1, lat1] = points[i];
    const [lon2, lat2] = points[i + 1];
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(lon2 - lon1), Math.abs(lat2 - lat1)) / stepDeg));
    for (let s = 0; s < steps; s += 1) output.push([lon1 + ((lon2 - lon1) * s) / steps, lat1 + ((lat2 - lat1) * s) / steps]);
  }
  output.push(points[points.length - 1]);
  return output;
}

/** Graticule lines as [lon, lat] arrays: meridians and parallels every `step` degrees. */
export function graticuleLines(step = 30) {
  const lines = [];
  for (let lon = -180; lon < 180; lon += step) lines.push({ kind: "meridian", value: lon, points: densify([[lon, -80], [lon, 80]], 4) });
  for (let lat = -60; lat <= 60; lat += step) lines.push({ kind: lat === 0 ? "equator" : "parallel", value: lat, points: densify([[-180, lat], [0, lat], [180, lat]], 3) });
  return lines;
}

/** Accepts GeoJSON (Multi)LineString features, or the compact `{lines:[[lon,lat,...]]}` vendored form. */
export function borderLines(data) {
  if (!data) return [];
  if (Array.isArray(data.lines)) {
    return data.lines
      .filter((flat) => Array.isArray(flat) && flat.length >= 4 && flat.length % 2 === 0 && flat.every(Number.isFinite))
      .map((flat) => {
        const points = [];
        for (let i = 0; i < flat.length; i += 2) points.push([flat[i], flat[i + 1]]);
        return points;
      });
  }
  const lines = [];
  for (const feature of data.features || []) {
    const geometry = feature?.geometry;
    const parts = geometry?.type === "LineString" ? [geometry.coordinates] : geometry?.type === "MultiLineString" ? geometry.coordinates : [];
    for (const part of parts) {
      const points = (part || []).filter((p) => Number.isFinite(p?.[0]) && Number.isFinite(p?.[1]) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90).map((p) => [p[0], p[1]]);
      if (points.length >= 2) lines.push(points);
    }
  }
  return lines;
}

/** Flight time grows with angular distance, bounded so selection never feels sluggish. */
export function flightDuration(from, to) {
  if (!from || !to) return 1.2;
  const toRad = Math.PI / 180;
  const a = Math.sin(((to.lat - from.lat) * toRad) / 2) ** 2
    + Math.cos(from.lat * toRad) * Math.cos(to.lat * toRad) * Math.sin(((to.lon - from.lon) * toRad) / 2) ** 2;
  const degrees = (2 * Math.asin(Math.min(1, Math.sqrt(a)))) / toRad;
  return Math.round(Math.min(2.2, Math.max(0.7, 0.7 + degrees / 90)) * 100) / 100;
}
