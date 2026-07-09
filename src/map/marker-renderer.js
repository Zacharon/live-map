import { CATEGORIES } from "../config.js";
import { escapeHtml, relativeTime } from "../events/event-normalizer.js";

export function markerIcon(event, { selected = false, inCluster = false } = {}) {
  const markerColor = event.taxonomyColor || CATEGORIES[event.category]?.color || CATEGORIES.other.color;
  const recordClass = event.recordKind && event.recordKind !== "event" ? ` record-marker record-${event.recordKind}` : "";
  const selectedClass = selected ? " event-marker-selected" : "";
  const clusterClass = inCluster ? " event-marker-cluster" : "";
  return L.divIcon({
    className: "",
    html: `<div class="event-marker${recordClass}${selectedClass}${clusterClass}" style="--marker:${markerColor}"></div>`,
    iconSize: [15, 15],
    iconAnchor: [7, 7],
  });
}

function geometryStyle(event, { selected = false, inCluster = false } = {}) {
  const markerColor = event.taxonomyColor || CATEGORIES[event.category]?.color || CATEGORIES.other.color;
  const weight = selected ? 3 : inCluster ? 2.5 : 2;
  const opacity = selected || inCluster ? 1 : 0.8;
  const fillOpacity = selected ? 0.24 : inCluster ? 0.2 : 0.14;
  return {
    color: selected || inCluster ? "#38e0a3" : markerColor,
    fillColor: markerColor,
    fillOpacity,
    opacity,
    weight,
  };
}

export function renderMarkers(markerLayer, events, onSelect, options = {}) {
  const { selectedEventId = null, clusterMemberIds = null } = options;
  const memberSet = clusterMemberIds ? new Set(clusterMemberIds) : null;
  markerLayer.clearLayers();
  events.filter((event) => event.geographic !== false && Number.isFinite(event.lat) && Number.isFinite(event.lon)).forEach((event) => {
    const markerColor = event.taxonomyColor || CATEGORIES[event.category]?.color || CATEGORIES.other.color;
    const selected = event.id === selectedEventId;
    const inCluster = memberSet?.has(event.id) || false;
    if (event.geometry && event.geometry.type && event.geometry.type !== "Point") {
      const geometryLayer = L.geoJSON(event.geometry, {
        style: geometryStyle(event, { selected, inCluster }),
      });
      geometryLayer.bindTooltip(`<strong>${escapeHtml(event.title)}</strong><br>${escapeHtml(event.place)} - ${relativeTime(event.occurredAt)}`, { direction: "top" });
      geometryLayer.on("click", () => onSelect(event));
      markerLayer.addLayer(geometryLayer);
    }
    const marker = L.marker([event.lat, event.lon], { icon: markerIcon(event, { selected, inCluster }) });
    marker.bindTooltip(`<strong>${escapeHtml(event.title)}</strong><br>${escapeHtml(event.place)} - ${relativeTime(event.occurredAt)}`, { direction: "top" });
    marker.on("click", () => onSelect(event));
    markerLayer.addLayer(marker);
  });
}
