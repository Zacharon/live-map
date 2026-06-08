import { SEVERITIES } from "../config.js";

export function filteredEvents(events, filters, hours, sort) {
  const cutoff = Date.now() - hours * 3600000;
  const query = filters.query.trim().toLowerCase();
  let output = events.filter((event) => filters.categories.has(event.category) && filters.severities.has(event.severity) && event.occurredAt >= cutoff);
  if (query) {
    output = output.filter((event) => `${event.title} ${event.summary} ${event.country} ${event.place} ${event.sourceName} ${event.sourceType} ${event.verificationStatus} ${JSON.stringify(event.details)}`.toLowerCase().includes(query));
  }
  return output.sort((a, b) => sort === "newest" ? b.occurredAt - a.occurredAt : SEVERITIES[b.severity].score - SEVERITIES[a.severity].score || b.occurredAt - a.occurredAt);
}
