import { clusterGeographicBounds } from "../events/clustering.js";

export function renderClusterHighlight(layer, cluster) {
  layer.clearLayers();
  if (!cluster) return false;
  const bounds = clusterGeographicBounds(cluster);
  if (!bounds) return false;

  const latSpan = Math.max(bounds.north - bounds.south, 0.02);
  const lonSpan = Math.max(bounds.east - bounds.west, 0.02);
  const latPad = Math.max(0.08, latSpan * 0.35);
  const lonPad = Math.max(0.08, lonSpan * 0.35);
  const south = bounds.south - latPad;
  const north = bounds.north + latPad;
  const west = bounds.west - lonPad;
  const east = bounds.east + lonPad;

  L.rectangle([[south, west], [north, east]], {
    color: "#38e0a3",
    weight: 2,
    opacity: 0.9,
    fillColor: "#38e0a3",
    fillOpacity: 0.1,
    interactive: false,
    className: "cluster-highlight-ring",
  }).addTo(layer);

  if (bounds.count === 1) {
    L.circle(bounds.center, {
      radius: 28000,
      color: "#38e0a3",
      weight: 2,
      opacity: 0.75,
      fillColor: "#38e0a3",
      fillOpacity: 0.08,
      interactive: false,
      className: "cluster-highlight-ring",
    }).addTo(layer);
  }

  return true;
}

export function fitClusterOnMap(map, cluster, { maxZoom = 8 } = {}) {
  const bounds = clusterGeographicBounds(cluster);
  if (!bounds || !map) return false;
  map.fitBounds([[bounds.south, bounds.west], [bounds.north, bounds.east]], { padding: [48, 48], maxZoom });
  return true;
}