// Missing evidence stays nullable. Coercion must never turn blanks, booleans or
// containers into coordinates, scores or clocks; numeric zero is legitimate.
export function finiteNumber(value) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function timestampMs(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  const numeric = finiteNumber(value);
  if (numeric !== null) return Number.isFinite(new Date(numeric).getTime()) ? numeric : null;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function nullableScore(value) {
  const score = finiteNumber(value);
  return score === null ? null : Math.max(0, Math.min(100, score));
}

export function validCoordinates(latitude, longitude) {
  const lat = finiteNumber(latitude), lon = finiteNumber(longitude);
  return lat !== null && lon !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}
