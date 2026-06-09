export function createSeriesObservation(input = {}) {
  return {
    recordKind: "observation",
    domain: input.domain,
    category: input.category,
    type: input.type,
    entityIds: input.entityIds || [],
    instrumentIds: input.instrumentIds || [],
    seriesId: input.seriesId,
    occurredAt: input.occurredAt,
    publishedAt: input.publishedAt,
    updatedAt: input.updatedAt || input.publishedAt || input.occurredAt,
    value: input.value,
    previousValue: input.previousValue ?? null,
    change: input.change ?? null,
    changePercent: input.changePercent ?? null,
    units: input.units || null,
    sourceName: input.sourceName,
    sourceUrl: input.sourceUrl,
    verificationStatus: input.verificationStatus || "primary-confirmed",
    confidence: input.confidence ?? 90,
    geographic: input.geographic === true,
    geometry: input.geometry || null,
    metadata: input.metadata || {},
  };
}

export function numericChange(value, previousValue) {
  const current = Number(value);
  const previous = Number(previousValue);
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return { change: null, changePercent: null };
  const change = current - previous;
  const changePercent = previous === 0 ? null : (change / Math.abs(previous)) * 100;
  return { change, changePercent };
}
