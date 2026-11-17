// Missing provider clocks and confidence must not be manufactured from ingestion time or zero.
export function timestampMs(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "" || (typeof value !== "number" && typeof value !== "string" && !(value instanceof Date))) continue;
    const numeric = typeof value === "string" && !value.trim() ? NaN : Number(value);
    const parsed = Number.isFinite(numeric) ? numeric : new Date(value).getTime();
    if (Number.isFinite(parsed) && Number.isFinite(new Date(parsed).getTime())) return parsed;
  }
  return null;
}

export function confidenceValue(value) {
  if (value === null || value === undefined || value === "" || (typeof value !== "number" && typeof value !== "string") || (typeof value === "string" && !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : null;
}

export function confidenceText(value) {
  const confidence = confidenceValue(value);
  return confidence === null ? "Not scored" : `${Math.round(confidence)}%`;
}
