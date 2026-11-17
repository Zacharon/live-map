import { CATEGORIES } from "../config.js";
import { escapeHtml, relativeTime } from "../events/event-normalizer.js";

export function markerIcon(event, { selected = false, inCluster = false, changeStatus = null, dimmed = false } = {}) {
  const markerColor = event.taxonomyColor || CATEGORIES[event.category]?.color || CATEGORIES.other.color;
  const recordClass = (event.recordKind && event.recordKind !== "event" ? ` record-marker record-${event.recordKind}` : "") + (/approximate|region|city|unknown/i.test(event.coordinateMethod || event.locationPrecision || 'unknown') ? ' approximate-marker' : '');
  const selectedClass = selected ? " event-marker-selected" : "";
  const clusterClass = inCluster ? " event-marker-cluster" : "";
  const changeClass = changeStatus === "new" ? " event-marker-new" : changeStatus === "updated" ? " event-marker-updated" : "";
  const dimmedClass = dimmed ? " event-marker-dimmed" : "";
  return L.divIcon({
    className: "",
    html: `<div class="event-marker${recordClass}${selectedClass}${clusterClass}${changeClass}${dimmedClass}" style="--marker:${markerColor}"></div>`,
    iconSize: [15, 15],
    iconAnchor: [7, 7],
  });
}

function geometryStyle(event, { selected = false, inCluster = false, dimmed = false } = {}) {
  const markerColor = event.taxonomyColor || CATEGORIES[event.category]?.color || CATEGORIES.other.color;
  const weight = selected ? 3 : inCluster ? 2.5 : 2;
  const opacity = selected || inCluster ? 1 : 0.8;
  // Soft fills — stroke carries shape; avoid opaque "claim" polygons
  const fillOpacity = selected ? 0.2 : inCluster ? 0.16 : 0.11;
  const lead = event.recordKind && event.recordKind !== "event";
  return {
    pane: "of-events",
    color: selected || inCluster ? "#38e0a3" : markerColor,
    fillColor: markerColor,
    fillOpacity: dimmed ? 0.02 : fillOpacity,
    opacity: dimmed ? 0.16 : opacity,
    weight,
    dashArray: lead ? "4 3" : null,
  };
}

const renderedLayers = new WeakMap();

export function renderMarkers(markerLayer, events, onSelect, options = {}) {
  const { selectedEventId = null, clusterMemberIds = null, changeStatusById = null, relatedEventIds = null } = options;
  const memberSet = clusterMemberIds ? new Set(clusterMemberIds) : null;
  const changeLookup = changeStatusById instanceof Map ? changeStatusById : new Map();
  let records = renderedLayers.get(markerLayer);
  if (!records) { records = new Map(); renderedLayers.set(markerLayer, records); }
  const retained = new Set();
  const stats = { created: 0, updated: 0, removed: 0, retained: 0 };
  events.filter((event) => event.geographic !== false && Number.isFinite(event.lat) && Number.isFinite(event.lon)).forEach((event) => {
    retained.add(event.id);
    const selected = event.id === selectedEventId;
    const inCluster = memberSet?.has(event.id) || false;
    const changeStatus = changeLookup.get(event.id) || null;
    const dimmed = relatedEventIds instanceof Set && !relatedEventIds.has(event.id);
    const style = { selected, inCluster, changeStatus, dimmed };
    const signature = JSON.stringify([event.lat, event.lon, event.title, event.place, event.occurredAt, event.coordinateMethod, event.taxonomyColor, event.category, event.recordKind, event.severity, event.geometry, style]);
    let record = records.get(event.id);
    if (record && record.signature === signature) {
      record.event = event; record.onSelect = onSelect;
      stats.retained++;
      return;
    }
    if (!record) {
      record = { event, onSelect, marker: null, geometry: null };
      records.set(event.id, record);
      stats.created++;
    } else { stats.updated++; }
    record.event = event; record.onSelect = onSelect;
    const targetLayer = options.priorityLayer && (['high','critical'].includes(event.severity) || selected) ? options.priorityLayer : markerLayer;
    if (record.geometry) { record.layer.removeLayer(record.geometry); record.geometry = null; }
    if (event.geometry && event.geometry.type && event.geometry.type !== "Point") {
      record.geometry = L.geoJSON(event.geometry, {
        pane: "of-events",
        style: geometryStyle(event, { selected, inCluster, dimmed }),
      });
      record.geometry.bindTooltip(`<strong>${escapeHtml(event.title)}</strong><br>${escapeHtml(event.place)} - ${relativeTime(event.occurredAt)}`, { direction: "top" });
      record.geometry.on("click", () => record.onSelect(record.event));
      targetLayer.addLayer(record.geometry);
    }
    if (record.marker && record.layer !== targetLayer) record.layer.removeLayer(record.marker);
    const markerOptions = {
      title: event.title,
      alt: `${event.title} · ${event.coordinateMethod || 'precision not supplied'}`,
      pane: "of-events",
      icon: markerIcon(event, { selected, inCluster, changeStatus, dimmed }),
      opacity: dimmed ? 0.28 : 1,
      zIndexOffset: selected ? 800 : changeStatus ? 400 : 0,
    };
    if (!record.marker) {
      record.marker = L.marker([event.lat, event.lon], markerOptions);
      record.marker.on("click", () => record.onSelect(record.event));
      targetLayer.addLayer(record.marker);
    } else {
      record.marker.setLatLng([event.lat, event.lon]);
      record.marker.setIcon(markerOptions.icon);
      record.marker.setOpacity(markerOptions.opacity);
      record.marker.setZIndexOffset(markerOptions.zIndexOffset);
      record.marker.options.title = event.title;
      record.marker.options.alt = markerOptions.alt;
      const icon = record.marker.getElement?.();
      if (icon) { icon.title = event.title; icon.setAttribute('aria-label', markerOptions.alt); }
      if (record.layer !== targetLayer) targetLayer.addLayer(record.marker);
    }
    const marker = record.marker;
    marker.bindTooltip(`<strong>${escapeHtml(event.title)}</strong><br>${escapeHtml(event.place)} - ${relativeTime(event.occurredAt)}<br>${escapeHtml(event.coordinateMethod || 'Geographic precision not supplied')}`, { direction: "top" });
    record.layer = targetLayer;
    record.signature = signature;
  });
  for (const [id, record] of records) {
    if (retained.has(id)) continue;
    record.layer.removeLayer(record.marker);
    if (record.geometry) record.layer.removeLayer(record.geometry);
    records.delete(id); stats.removed++;
  }
  return stats;
}
