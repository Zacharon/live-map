/**
 * Governed layer/provider access records. Implementation state is not live
 * verification. Missing credentials produce unavailable/configuration-required.
 */

export const LAYER_ACCESS = [
  {
    id: "leaflet-osm-street",
    name: "OpenStreetMap street basemap",
    implementationStatus: "implemented",
    accessState: "external-tiles",
    attribution: "(c) OpenStreetMap contributors",
    coverage: "global street tiles",
    observationCadence: "not an observation dataset",
    publicationCadence: "tile cache",
    freshnessPolicy: "basemap reference only",
    cacheRetention: "browser tile cache",
    boundedRequestPolicy: "user pan/zoom only",
    licensing: "ODbL; comply with OSM tile policy",
    failureBehavior: "show last tiles; do not invent geography",
    offlineDemo: "not used when local earth is selected",
  },
  {
    id: "cesium-natural-earth",
    name: "Cesium Natural Earth II (local)",
    implementationStatus: "implemented",
    accessState: "local-static",
    attribution: "Natural Earth / CesiumJS Apache-2.0 distribution",
    coverage: "low-resolution global imagery",
    observationCadence: "static cartography",
    publicationCadence: "pinned Cesium 1.145 assets",
    freshnessPolicy: "not observational",
    cacheRetention: "static vendor assets",
    boundedRequestPolicy: "no network when served locally",
    licensing: "Natural Earth + Cesium Apache 2.0",
    failureBehavior: "ellipsoid-only globe; Leaflet fallback",
    offlineDemo: "required offline basemap",
  },
  {
    id: "noaa-gfs-wind-10m",
    name: "NOAA GFS 10 m U/V wind",
    implementationStatus: "partial-preprocessor",
    accessState: "recorded-sample-or-configuration-required",
    attribution: "NOAA NCEP GFS via NOMADS",
    coverage: "global model grid; sample is bounded",
    observationCadence: "model cycle, not continuous observations",
    publicationCadence: "four cycles/day typical",
    freshnessPolicy: "show model run, valid time, lead, level",
    cacheRetention: "preprocessed compact field; separate from synthetic cache",
    boundedRequestPolicy: "no full-archive download; no per-page GRIB decode",
    licensing: "US public domain model output; attribution required",
    failureBehavior: "unavailable; keep synthetic demo separate",
    decoder: "compact JSON in-browser; GRIB preprocess is Windows-checked",
  },
  {
    id: "world-bank-shipping-density",
    name: "World Bank Global Shipping Traffic Density",
    implementationStatus: "overlay-format",
    accessState: "historical-sample-not-live",
    attribution: "World Bank / IMF / UNGP, CC BY 4.0",
    coverage: "global historical AIS-position density, Jan 2015–Feb 2021",
    observationCadence: "historical accumulation, not current vessel count",
    publicationCadence: "dataset publication; not a live feed",
    freshnessPolicy: "always show 2015-01 to 2021-02 observation period",
    cacheRetention: "bounded downsampled derivative only",
    boundedRequestPolicy: "do not download full source rasters automatically",
    licensing: "CC BY 4.0",
    failureBehavior: "hide overlay; never label as live density",
    notes: "Oil & Gas category is platforms/rigs/FPSOs, not tanker/LNG cargo.",
  },
  {
    id: "imf-portwatch-activity",
    name: "IMF PortWatch daily port/chokepoint activity",
    implementationStatus: "fixture-adapter",
    accessState: "public-arcgis-rest-discovered-not-activated",
    attribution: "IMF PortWatch",
    coverage: "ports and 28 chokepoints; AIS-derived estimates",
    observationCadence: "daily observations",
    publicationCadence: "weekly, Tuesdays 9 AM ET",
    freshnessPolicy: "preserve vintage/revisions; daily != daily refresh",
    cacheRetention: "bounded chokepoint series; no ocean-pixel paint from totals",
    boundedRequestPolicy: "iterate IDs; maxRecordCountFactor<=5; no global dump",
    licensing: "cite PortWatch; review redistribution before production",
    failureBehavior: "configuration-required / unavailable",
  },
  {
    id: "celestrak-omm",
    name: "CelesTrak OMM satellite elements",
    implementationStatus: "planned-or-proof",
    accessState: "shared-cache-2h",
    attribution: "CelesTrak / space-track GP data",
    coverage: "selected public groups only",
    observationCadence: "element epoch; positions are propagated estimates",
    publicationCadence: "provider-defined; cache >= 2 hours",
    freshnessPolicy: "stale/invalid elements remain visible as stale",
    cacheRetention: "shared element cache; animation is local",
    boundedRequestPolicy: "needed groups only; stop on provider error",
    licensing: "CelesTrak access limits; no entire catalog",
    failureBehavior: "report error; do not retry aggressively",
  },
];

export function layerAccessById(id) {
  return LAYER_ACCESS.find((item) => item.id === id) || null;
}

export function scheduledFetchAllowed(layer, { enabled = false, visible = true, hiddenDocument = false } = {}) {
  if (!enabled || !visible || hiddenDocument) return false;
  if (["unavailable", "configuration-required", "license-required"].includes(layer?.accessState)) return false;
  return true;
}
