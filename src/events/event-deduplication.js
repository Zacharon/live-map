function normalizeTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/magnitude\s+\d+(\.\d+)?/g, "magnitude")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function distanceKm(a, b) {
  const radius = 6371;
  const toRad = (value) => (value * Math.PI) / 180;
  const lat1 = toRad(a.latitude ?? a.lat);
  const lat2 = toRad(b.latitude ?? b.lat);
  const dLat = toRad((b.latitude ?? b.lat) - (a.latitude ?? a.lat));
  const dLon = toRad((b.longitude ?? b.lon) - (a.longitude ?? a.lon));
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function titleSimilarity(a, b) {
  const left = new Set(normalizeTitle(a).split(" ").filter(Boolean));
  const right = new Set(normalizeTitle(b).split(" ").filter(Boolean));
  if (!left.size || !right.size) return 0;
  const intersection = [...left].filter((word) => right.has(word)).length;
  return intersection / Math.max(left.size, right.size);
}

export function arePotentialDuplicates(a, b) {
  if (a.provider === b.provider && a.providerEventId && a.providerEventId === b.providerEventId) return true;
  if (a.category !== b.category) return false;
  const timeDelta = Math.abs(new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  if (timeDelta > 6 * 3600000) return false;
  if (distanceKm(a, b) > 35) return false;
  return titleSimilarity(a.title, b.title) >= 0.55;
}

export function mergeDuplicateEvents(events) {
  const merged = [];
  for (const event of events) {
    const existing = merged.find((candidate) => arePotentialDuplicates(candidate, event));
    if (!existing) {
      merged.push({
        ...event,
        metadata: {
          ...event.metadata,
          mergedSources: [{ provider: event.provider, providerEventId: event.providerEventId, sourceUrl: event.sourceUrl }],
        },
      });
      continue;
    }
    existing.startedAt = new Date(existing.startedAt) < new Date(event.startedAt) ? existing.startedAt : event.startedAt;
    existing.updatedAt = new Date(existing.updatedAt || existing.startedAt) > new Date(event.updatedAt || event.startedAt) ? existing.updatedAt : event.updatedAt;
    existing.severity = Math.max(existing.severity, event.severity);
    existing.confidence = Math.max(existing.confidence, event.confidence);
    existing.metadata.mergedSources = [
      ...(existing.metadata.mergedSources || []),
      { provider: event.provider, providerEventId: event.providerEventId, sourceUrl: event.sourceUrl },
    ];
  }
  return merged;
}
