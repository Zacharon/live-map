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
  events.forEach((event) => {
    const marker = L.marker([event.lat, event.lon], { icon: markerIcon(event) });
    marker.bindTooltip(`<strong>${escapeHtml(event.title)}</strong><br>${escapeHtml(event.place)} - ${relativeTime(event.occurredAt)}`, { direction: "top" });
    marker.on("click", () => onSelect(event));
    markerLayer.addLayer(marker);
  });
}
