// National Map permits viewing. Alaska SPOT imagery is viewing-only; do not archive tiles.
// Existing Esri account eligibility is unverified.
const root='https://basemap.nationalmap.gov/arcgis/rest/services/';
const credit='Map services and data available from U.S. Geological Survey, National Geospatial Program.';
export const BASEMAPS={
  satellite:{id:'satellite',name:'USGS imagery',service:root+'USGSImageryOnly/MapServer',maximumLevel:16,credit,
    coverage:'Fine imagery in US coverage; coarse reference elsewhere. CONUS NAIP 2017–2021; other vintages vary. Alaska SPOT is viewing-only. Not event-time imagery.'},
  street:{id:'street',name:'USGS topographic',service:root+'USGSTopo/MapServer',maximumLevel:16,credit,
    coverage:'US roads, names and contours to service level 16; outside US coverage detail is limited. Reference map, not event-time imagery.'},
};
export function basemapConfig(id){return BASEMAPS[id]||null;}
export function tileUrl(config){return config.service+'/tile/{z}/{y}/{x}';}
