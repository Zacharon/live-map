/**
 * Distinct maritime products: reference geometry, historical density, dated activity.
 * Historical density is not live traffic. Port totals are not ocean pixels.
 */

import { SYNTHETIC_FORMAT_FIXTURE, densityUiLabel, activityUiLabel } from "../map/overlay-labels.js";

export const SHIPPING_DENSITY_META = {
  id: "world-bank-shipping-density-fixture",
  title: SYNTHETIC_FORMAT_FIXTURE,
  observationPeriod: { start: "2015-01-01", end: "2021-02-28" },
  license: "CC BY 4.0 (reference product, not this fixture)",
  attribution: densityUiLabel(),
  live: false,
  fixture: true,
  unit: "illustrative overlay cells — not source measurements",
};

export const PORTWATCH_META = {
  id: "imf-portwatch-activity",
  title: activityUiLabel(),
  publicationCadence: "weekly Tuesday 9 AM ET",
  observationCadence: "daily observations",
  live: false,
  endpoints: {
    docs: "https://portwatch.imf.org/pages/data-and-methodology",
    faq: "https://portwatch.imf.org/pages/faqs",
    chokepointDaily: "https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query",
    portDaily: "https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Trade_Data/FeatureServer/0/query",
  },
  ids: {
    "suez-canal": "chokepoint1",
    "panama-canal": "chokepoint2",
    bosporus: "chokepoint3",
    "bab-el-mandeb": "chokepoint4",
    "strait-of-malacca": "chokepoint5",
    "strait-of-hormuz": "chokepoint6",
    "cape-of-good-hope": "chokepoint7",
    "strait-of-gibraltar": "chokepoint8",
  },
};

export const REFERENCE_CORRIDORS = [
  {
    id: "hormuz-reference",
    name: "Strait of Hormuz reference corridor",
    chokepointId: "strait-of-hormuz",
    geometry: { type: "LineString", coordinates: [[56.1, 26.55], [56.65, 26.45]] },
    source: "Live Map strategic chokepoint registry — generalized, not navigation",
    limits: "Approximate operational geometry. Not a legal or navigation channel.",
  },
  {
    id: "cape-reference",
    name: "Cape of Good Hope reference corridor",
    chokepointId: "cape-of-good-hope",
    geometry: { type: "LineString", coordinates: [[18.2, -34.6], [19.2, -35.2]] },
    source: "Live Map strategic chokepoint registry — generalized, not navigation",
    limits: "Approximate operational geometry. Not a legal or navigation channel.",
  },
];

export function densityLabel(meta = SHIPPING_DENSITY_META) {
  return densityUiLabel();
}

export function activityLabel(series) {
  if (!series) return activityUiLabel();
  return `${activityUiLabel()} · ${series.locationName || series.portid || "sample"} · fixture vintage ${series.vintage || "none"}`;
}

export function paintOceanFromPortTotals() {
  return { allowed: false, reason: "port/chokepoint totals must not be painted across ocean pixels as measured density" };
}

export function validateDensityGrid(grid) {
  const errors = [];
  if (grid?.live === true) errors.push("historical density cannot be live");
  if (grid?.category === "oil-and-gas" && grid?.interpretedAs === "tanker-lng") errors.push("oil-and-gas is platforms/rigs/FPSOs, not tanker/LNG cargo");
  if (!grid?.observationPeriod?.start || !grid?.observationPeriod?.end) errors.push("observation period required");
  return { valid: errors.length === 0, errors };
}
