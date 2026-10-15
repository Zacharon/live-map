// @ts-check
/** Boundary values stay unknown until their units and reference are usable. */
export function finite(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
export function headingDegrees(value) {
  const n = finite(value);
  return n == null ? null : ((n % 360) + 360) % 360;
}
export function insideBbox(position, bbox) {
  if (!bbox) return true;
  const { latitude: lat, longitude: lon } = position;
  return lat >= bbox.south && lat <= bbox.north &&
    (bbox.west <= bbox.east ? lon >= bbox.west && lon <= bbox.east : lon >= bbox.west || lon <= bbox.east);
}
export function positionContract(input = {}) {
  const latitude = finite(input.latitude), longitude = finite(input.longitude);
  const valid = latitude != null && longitude != null && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
  const height = input.height || {};
  const amount = finite(height.value);
  const factor = ({ m: 1, km: 1000, ft: 0.3048 })[height.unit];
  const quantity = ['geometric', 'barometric', 'above-ground', 'calculated'].includes(height.quantity) ? height.quantity : 'unknown';
  const reference = height.reference || 'unknown';
  const usableHeight = amount != null && factor != null && ['geometric', 'calculated'].includes(quantity) && reference === 'WGS84-ellipsoid';
  return {
    valid, latitude, longitude, horizontalReference: input.horizontalReference || 'unknown',
    uncertaintyMeters: finite(input.uncertaintyMeters),
    height: { value: amount, unit: height.unit || 'unknown', quantity, reference,
      uncertaintyMeters: finite(height.uncertaintyMeters) },
    renderHeightMeters: usableHeight ? amount * factor : null,
    heightReason: usableHeight ? 'physical-height' : amount == null ? 'unknown-height' : 'unusable-height-reference-or-unit',
  };
}
/** This accepts an already transformed geodetic output; it does not propagate elements. */
export function calculatedSatellitePosition(input) {
  if (!input?.elementEpoch || !input?.calculatedFor || !input?.calculatedAt ||
      typeof input?.modelVersion !== 'string' || !input.modelVersion.trim() ||
      typeof input?.transformation !== 'string' || !input.transformation.trim() ||
      input.inputFrame !== 'TEME' || input.outputFrame !== 'WGS84-geodetic' || input.angularUnit !== 'rad' || input.heightUnit !== 'km') {
    return { valid: false, reason: 'incomplete-calculation-provenance' };
  }
  if ([input.elementEpoch, input.calculatedFor, input.calculatedAt].some(t => !Number.isFinite(Date.parse(t)))) return { valid: false, reason: 'invalid-calculation-time' };
  const lat = finite(input.latitude), lon = finite(input.longitude), height = finite(input.height);
  if (lat == null || lon == null || height == null || Math.abs(lat) > Math.PI / 2 || Math.abs(lon) > Math.PI) return { valid: false, reason: 'invalid-geodetic-output' };
  return { ...positionContract({ latitude: lat * 180 / Math.PI, longitude: lon * 180 / Math.PI,
    horizontalReference: 'WGS84', height: { value: height, unit: 'km', quantity: 'calculated', reference: 'WGS84-ellipsoid' } }),
    calculation: { elementEpoch: input.elementEpoch, calculatedFor: input.calculatedFor, calculatedAt: input.calculatedAt,
      modelVersion: input.modelVersion, inputFrame: input.inputFrame, outputFrame: input.outputFrame,
      transformation: input.transformation }, valueOrigin: 'calculated' };
}
