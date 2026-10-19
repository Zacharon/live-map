import { wrapLongitude } from './attention-policy.js';
import { bandFromZoom } from './semantic-bands.js';

const MAP_MODES = ['2d', '3d', 'auto'];
const LAYER_FLAGS = ['graph', 'weather', 'density', 'activity', 'orbital'];

export function validateMapView(input = {}) {
  const number = (value, min, max, fallback) => value !== '' && value != null && Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback;
  const asOf = input.asOf && Number.isFinite(Date.parse(input.asOf)) ? new Date(input.asOf).toISOString() : null;
  const view = {
    version: 1,
    lat: number(input.lat, -85, 85, 22),
    lon: wrapLongitude(number(input.lon, -540, 540, 10)),
    zoom: number(input.zoom, 2, 19, 2),
    basemap: ['street', 'satellite', 'local-earth', 'dark', 'dark-offline', 'dark-online'].includes(input.basemap) ? input.basemap : 'street',
    aircraft: input.aircraft === true,
    vessels: input.vessels === true,
    ports: input.ports === true,
    airports: input.airports === true,
    chokepoints: input.chokepoints === true,
    viewportOnly: input.viewportOnly === true,
    verification: ['all', 'supported'].includes(input.verification) ? input.verification : 'all',
    mapMode: MAP_MODES.includes(input.mapMode) ? input.mapMode : '2d',
    asOf,
    graph: input.graph === true,
    weather: input.weather === true,
    density: input.density === true,
    activity: input.activity === true,
    orbital: input.orbital === true,
    scenarioStage: typeof input.scenarioStage === "string" && /^[a-z0-9-]{1,80}$/.test(input.scenarioStage) ? input.scenarioStage : "",
  };
  view.semanticBand = bandFromZoom(view.zoom);
  return view;
}
export function readMapView(params, pathname = typeof window !== "undefined" ? window.location.pathname : "/") {
  const tracks = (params.get('tracking') || '').split(',');
  const refs = (params.get('context') || '').split(',');
  const layers = (params.get('layers') || '').split(',');
  return validateMapView({
    lat: params.get('lat'),
    lon: params.get('lon'),
    zoom: params.get('zoom') ?? (params.has('mapState') ? 2 : 3),
    basemap: params.get('basemap'),
    aircraft: tracks.includes('aircraft'),
    vessels: tracks.includes('vessels'),
    ports: refs.includes('ports'),
    airports: refs.includes('airports'),
    chokepoints: refs.includes('chokepoints'),
    viewportOnly: params.get('scope') === 'viewport',
    verification: params.get('verification'),
    mapMode: params.get('mapMode') || params.get('map') || (/^\/globe(?:\.html)?\/?$/.test(pathname) ? '3d' : '2d'),
    asOf: params.get('asOf'),
    graph: layers.includes('graph'),
    weather: layers.includes('weather'),
    density: layers.includes('density'),
    activity: layers.includes('activity'),
    orbital: layers.includes('orbital'),
    scenarioStage: params.get('scenario'),
  });
}
export function writeMapView(params, input) {
  const view = validateMapView(input);
  params.set('mapState', '1');
  for (const key of ['lat', 'lon', 'zoom']) params.set(key, String(Math.round(view[key] * 10000) / 10000));
  params.set('basemap', view.basemap);
  params.set('tracking', [view.aircraft && 'aircraft', view.vessels && 'vessels'].filter(Boolean).join(','));
  params.set('context', [view.ports && 'ports', view.airports && 'airports', view.chokepoints && 'chokepoints'].filter(Boolean).join(','));
  params.set('scope', view.viewportOnly ? 'viewport' : 'all');
  params.set('verification', view.verification);
  params.set('mapMode', view.mapMode);
  if (view.asOf) params.set('asOf', view.asOf);
  else params.delete('asOf');
  const layers = LAYER_FLAGS.filter((key) => view[key]);
  if (layers.length) params.set('layers', layers.join(','));
  else params.delete('layers');
  if (view.scenarioStage) params.set('scenario', view.scenarioStage);
  else params.delete('scenario');
}
