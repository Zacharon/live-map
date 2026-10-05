// @ts-check
import { insideBbox } from '../core/spatial.js';
import { referenceKey, revisionsAt, timeExclusion } from '../core/time.js';
export const LAYERS = Object.freeze([
  { id: 'events', label: 'Events', dependencies: ['synthetic-foundation'], views: ['globe', 'leaflet', 'records'],
    availability: 'synthetic', coverage: 'Twelve invented regional scenarios', minZoom: 2, legend: '● event · outlined when selected', color: '#f1bd76', inspection: 'domain-reference' },
  { id: 'aircraft', label: 'Aircraft', dependencies: ['synthetic-foundation'], views: ['globe', 'leaflet', 'records'],
    availability: 'synthetic', coverage: '20 invented contacts across global air-route regions', minZoom: 2, legend: 'Plane · proxy disclosed when height is unusable', color: '#8ee4ce', inspection: 'domain-reference' },
  { id: 'vessels', label: 'Vessels', dependencies: ['synthetic-foundation'], views: ['globe', 'leaflet', 'records'],
    availability: 'synthetic', coverage: '20 invented contacts across major ocean regions', minZoom: 2, legend: 'Ship · sea-surface display convention', color: '#b3c5ff', inspection: 'domain-reference' },
  { id: 'satellites', label: 'Satellites', dependencies: ['synthetic-foundation'], views: ['globe','leaflet','records'],
    availability: 'synthetic', coverage: '12 invented positions at orbital heights; no propagation', minZoom: 2, legend: 'Satellite · synthetic frozen position', color: '#edc6ff', inspection: 'domain-reference' },
]);
export function projections(records, state, { bbox = null, visibility = () => null, availability = 'synthetic' } = {}) {
  const current = revisionsAt(records, state);
  const representatives = new Map();
  for (const record of records) {
    const key = referenceKey(record.ref), previous = representatives.get(key);
    if (!previous || record.revision < previous.revision) representatives.set(key, record);
  }
  return [...representatives].map(([key, earliest]) => current.get(key) || earliest)
    .map(record => {
      const key = referenceKey(record.ref), layer = LAYERS.find(l => l.id === record.layer);
      const timeReason = timeExclusion(record, state);
      let reason = timeReason;
      if (!reason && availability === 'unavailable') reason = 'provider-unavailable';
      if (!reason && !state.layers[record.layer]) reason = 'layer-disabled';
      if (!reason && (!record.position.valid || record.position.horizontalReference !== 'WGS84')) reason = 'missing-or-unsupported-position';
      if (!reason && state.camera.zoom < layer.minZoom) reason = 'hidden-at-this-scale';
      if (!reason && !insideBbox(record.position, bbox)) reason = 'outside-viewport';
      const physical = record.position.renderHeightMeters;
      const heightMeters = physical ?? 0;
      const anchor = physical != null ? 'physical-height' : record.layer === 'vessels' ? 'sea-surface-display-convention' : 'horizontal-location-display-proxy';
      if (!reason) reason = visibility(record, heightMeters);
      return { key, ref: record.ref, record, layer: record.layer, selected: state.selected && referenceKey(state.selected) === key,
        renderable: !reason, reason: reason || 'projected', heightMeters, anchor,
        physicalHeightMeters: physical, uncertaintyMeters: record.position.uncertaintyMeters };
    });
}
