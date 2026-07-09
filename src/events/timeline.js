export const TIMELINE_BUCKETS = [
  { id: "1h", label: "Last 1 hour", maxAgeMs: 1 * 3600000 },
  { id: "6h", label: "Last 6 hours", maxAgeMs: 6 * 3600000 },
  { id: "24h", label: "Last 24 hours", maxAgeMs: 24 * 3600000 },
  { id: "7d", label: "Last 7 days", maxAgeMs: 7 * 24 * 3600000 },
  { id: "older", label: "Older / unknown time", maxAgeMs: Infinity },
];

export function eventTimestamp(event) {
  const value = Number(event?.occurredAt ?? event?.updatedAt ?? 0);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function timelineBucketForEvent(event, now = Date.now()) {
  const ts = eventTimestamp(event);
  if (ts === null) return "older";
  const age = Math.max(0, now - ts);
  const match = TIMELINE_BUCKETS.find((bucket) => bucket.id !== "older" && age <= bucket.maxAgeMs);
  return match?.id || "older";
}

export function groupEventsByTimeline(events = [], now = Date.now()) {
  const groups = Object.fromEntries(TIMELINE_BUCKETS.map((bucket) => [bucket.id, []]));
  for (const event of events) {
    const bucketId = timelineBucketForEvent(event, now);
    groups[bucketId].push(event);
  }
  return TIMELINE_BUCKETS
    .map((bucket) => ({
      id: bucket.id,
      label: bucket.label,
      events: groups[bucket.id].sort((a, b) => (eventTimestamp(b) || 0) - (eventTimestamp(a) || 0)),
    }))
    .filter((group) => group.events.length > 0);
}