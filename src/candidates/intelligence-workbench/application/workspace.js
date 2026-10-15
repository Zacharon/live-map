// @ts-check
import { finite, headingDegrees } from '../core/spatial.js';
import { instant } from '../core/time.js';
export const LAYOUTS = ['atlas', 'ledger', 'systems'];
export function cameraIntent(input = {}) {
  const bounded = (value, min, max, fallback) => { const n = finite(value); return n == null ? fallback : Math.min(max, Math.max(min, n)); };
  const vector = value => Array.isArray(value) && value.length === 3 && value.every(n => typeof n === 'number' && Number.isFinite(n)) ? [...value] : null;
  const position = vector(input.pose?.position), direction = vector(input.pose?.direction), up = vector(input.pose?.up);
  return { lat: bounded(input.lat, -90, 90, 20), lon: bounded(input.lon, -180, 180, 20), zoom: bounded(input.zoom, 2, 19, 3),
    heading: headingDegrees(input.heading) ?? 0, pitch: bounded(input.pitch, -90, -1, -90),
    pose: position && direction && up ? { position, direction, up } : null };
}
export function workspace(input = {}, fixedTime = 1790856000000) {
  const asOf = instant(input.asOf) ?? fixedTime;
  const selected = input.selected;
  const validRef = selected && ['source', 'kind', 'id'].every(k => typeof selected[k] === 'string' && selected[k].length > 0 && selected[k].length < 160);
  return { version: 1, layout: LAYOUTS.includes(input.layout) ? input.layout : 'atlas',
    selected: validRef ? { source: selected.source, kind: selected.kind, id: selected.id } : null,
    asOf, knownAt: instant(input.knownAt) ?? asOf, timeMode: input.timeMode === 'situation' ? 'situation' : 'known',
    layers: { events: input.layers?.events !== false, aircraft: input.layers?.aircraft !== false, vessels: input.layers?.vessels !== false, satellites: input.layers?.satellites !== false },
    camera: cameraIntent(input.camera), globeCamera: input.globeCamera ? cameraIntent(input.globeCamera) : null,
    view: input.view === 'leaflet' ? 'leaflet' : 'globe',
    panel: input.panel === 'evidence' ? 'evidence' : 'records' };
}
export function reduceWorkspace(state, action) {
  const next = structuredClone(state);
  if (action.type === 'select') { next.selected = action.ref; next.panel = action.ref ? 'evidence' : 'records'; }
  else if (action.type === 'layout') next.layout = action.value;
  else if (action.type === 'time') { next.asOf = action.asOf; next.knownAt = action.knownAt; next.timeMode = action.mode; }
  else if (action.type === 'layer' && Object.hasOwn(next.layers, action.id)) next.layers[action.id] = action.enabled === true;
  else if (action.type === 'camera') next.camera = cameraIntent(action.value);
  else if (action.type === 'globe-camera') next.globeCamera = action.value ? cameraIntent(action.value) : null;
  else if (action.type === 'view') next.view = action.value;
  return workspace(next, state.asOf);
}
