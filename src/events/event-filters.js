import { SEVERITIES } from "../config.js";
import { sortEvents } from "./feed-organization.js";
import { timestampMs } from "./value-semantics.js";

export function filteredEvents(events, filters, hours, sort, referenceAt = null) {
  const end = Number.isFinite(referenceAt) ? referenceAt : Date.now();
  const cutoff = end - hours * 3600000;
  const query = filters.query.trim().toLowerCase();
  let output = events.filter((event) => {
    const domainMatch = !filters.domains || filters.domains.size === 0 || filters.domains.has(event.domain);
    const recordKindMatch = !filters.recordKinds || filters.recordKinds.size === 0 || filters.recordKinds.has(event.recordKind || "event");
    const occurredAt = timestampMs(event.occurredAt);
    // Undated reports remain inspectable, explicitly labeled unknown; they are
    // never upgraded into a recent event by substituting ingestion time.
    return domainMatch && recordKindMatch && filters.categories.has(event.category) && filters.severities.has(event.severity) && (occurredAt === null || (occurredAt >= cutoff && (referenceAt === null || occurredAt <= end)));
  });
  if (query) {
    output = output.filter((event) => `${event.title} ${event.summary} ${event.country} ${event.place} ${event.sourceName} ${event.sourceType} ${event.verificationStatus} ${event.domainLabel} ${event.typeLabel} ${JSON.stringify(event.details)}`.toLowerCase().includes(query));
  }
  if (sort === "newest" || sort === "severity") {
    return output.sort((a, b) => sort === "newest" ? b.occurredAt - a.occurredAt : SEVERITIES[b.severity].score - SEVERITIES[a.severity].score || b.occurredAt - a.occurredAt);
  }
  return sortEvents(output, sort);
}
