/** Honest UI labels for newly added overlays. Not live-provider status. */

export const SYNTHETIC_FORMAT_FIXTURE = "SYNTHETIC FORMAT FIXTURE — NOT SOURCE MEASUREMENTS";
export const WIND_DECODER_FIXTURE = "SYNTHETIC DECODER FIXTURE — NOT A FETCHED NOAA/GFS FIELD";
export const SYNTHETIC_WIND = "SYNTHETIC wind field — not live wind";
export const ORBITAL_MODULE_ONLY = "Orbital module proof — not on-globe satellites";

export function densityUiLabel() {
  return `${SYNTHETIC_FORMAT_FIXTURE}. A World Bank product covering 2015-01–2021-02 exists, but this overlay is not that extract.`;
}

export function activityUiLabel() {
  return `${SYNTHETIC_FORMAT_FIXTURE}. IMF PortWatch publishes dated activity weekly; this overlay is not a PortWatch pull.`;
}

export function recordedWindUiLabel() {
  return WIND_DECODER_FIXTURE;
}

export function syntheticWindUiLabel() {
  return SYNTHETIC_WIND;
}
