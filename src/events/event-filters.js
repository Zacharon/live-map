import { SEVERITIES } from "../config.js";
import { sortEvents } from "./feed-organization.js";

export function filteredEvents(events, filters, hours, sort) {
  const cutoff = Date.now() - hours * 3600000;
  const query = filters.query.trim().toLowerCase();
  let output = events.filter((event) => {
    const domainMatch = !filters.domains || filters.domains.size === 0 || filters.domains.has(event.domain);
    return domainMatch && filters.categories.has(event.category) && filters.severities.has(event.severity) && event.occurredAt >= cutoff;
  });
  if (query) {
    output = output.filter((event) => `${event.title} ${event.summary} ${event.country} ${event.place} ${event.sourceName} ${event.sourceType} ${event.verificationStatus} ${event.domainLabel} ${event.typeLabel} ${JSON.stringify(event.details)}`.toLowerCase().includes(query));
  }
  if (sort === "newest" || sort === "severity") {
    return output.sort((a, b) => sort === "newest" ? b.occurredAt - a.occurredAt : SEVERITIES[b.severity].score - SEVERITIES[a.severity].score || b.occurredAt - a.occurredAt);
  }
  return sortEvents(output, sort);
}
