import { CATEGORIES } from "../config.js";
import { escapeHtml, relativeTime } from "../events/event-normalizer.js";

export function markerIcon(event) {
  const markerColor = event.taxonomyColor || CATEGORIES[event.category]?.color || CATEGORIES.other.color;
  return L.divIcon({
    className: "",
    html: `<div class="event-marker" style="--marker:${markerColor}"></div>`,
    iconSize: [15, 15],
    iconAnchor: [7, 7],
  });
}

export function renderMarkers(markerLayer, events, onSelect) {
  markerLayer.clearLayers();
  events.filter((event) => event.geographic !== false && Number.isFinite(event.lat) && Number.isFinite(event.lon)).forEach((event) => {
    const markerColor = event.taxonomyColor || CATEGORIES[event.category]?.color || CATEGORIES.other.color;
    if (event.geometry && event.geometry.type && event.geometry.type !== "Point") {
      const geometryLayer = L.geoJSON(event.geometry, {
        style: {
          color: markerColor,
          fillColor: markerColor,
          fillOpacity: 0.14,
          opacity: 0.8,
          weight: 2,
        },
      });
      geometryLayer.bindTooltip(`<strong>${escapeHtml(event.title)}</strong><br>${escapeHtml(event.place)} - ${relativeTime(event.occurredAt)}`, { direction: "top" });
      geometryLayer.on("click", () => onSelect(event));
      markerLayer.addLayer(geometryLayer);
    }
    const marker = L.marker([event.lat, event.lon], { icon: markerIcon(event) });
    marker.bindTooltip(`<strong>${escapeHtml(event.title)}</strong><br>${escapeHtml(event.place)} - ${relativeTime(event.occurredAt)}`, { direction: "top" });
    marker.on("click", () => onSelect(event));
    markerLayer.addLayer(marker);
  });
}
