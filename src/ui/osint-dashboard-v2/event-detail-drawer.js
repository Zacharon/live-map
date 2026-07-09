import { CATEGORIES, SEVERITIES } from "../../config.js";
import { escapeHtml, exactTime, relativeTime } from "../../events/event-normalizer.js";

export function renderEventDetailDrawer(event) {
  if (!event) {
    return `<aside class="v2-event-detail v2-event-detail-empty" aria-label="Event details"><p class="v2-empty">Select an event from the feed or map to inspect details.</p></aside>`;
  }
  const categoryLabel = event.domainLabel || CATEGORIES[event.category]?.label || event.category || "Event";
  const severityLabel = SEVERITIES[event.severity]?.label || event.severity || "Low";
  const severityColor = SEVERITIES[event.severity]?.color || SEVERITIES.low.color;
  const categoryColor = event.taxonomyColor || CATEGORIES[event.category]?.color || CATEGORIES.other.color;
  const location = event.geographic === false ? "No map location" : event.place || event.country || "Location pending";
  const confidence = Number.isFinite(event.confidence) ? `${Math.round(event.confidence)}%` : "—";
  const sourceLink = event.sourceUrl
    ? `<a class="v2-detail-link" href="${escapeHtml(event.sourceUrl)}" target="_blank" rel="noopener noreferrer">Open source</a>`
    : "";
  const providerLink = event.providerUrl
    ? `<a class="v2-detail-link secondary" href="${escapeHtml(event.providerUrl)}" target="_blank" rel="noopener noreferrer">Provider info</a>`
    : "";
  const mapLink = Number.isFinite(event.lat) && Number.isFinite(event.lon)
    ? `<a class="v2-detail-link secondary" href="https://www.openstreetmap.org/?mlat=${event.lat}&mlon=${event.lon}#map=7/${event.lat}/${event.lon}" target="_blank" rel="noopener noreferrer">Coordinates</a>`
    : "";
  return `<aside class="v2-event-detail" aria-label="Event details">
    <div class="v2-detail-head">
      <button type="button" class="v2-detail-close" data-v2-close-detail aria-label="Close details">×</button>
      <div class="v2-detail-badges">
        <span class="category-pill" style="--cat:${categoryColor}">${escapeHtml(categoryLabel)}</span>
        <span class="severity-tag" style="--sev:${severityColor}">${escapeHtml(severityLabel)}</span>
        <span class="v2-confidence">${escapeHtml(confidence)} confidence</span>
      </div>
      <h2 class="v2-detail-title">${escapeHtml(event.title)}</h2>
    </div>
    <p class="v2-detail-summary">${escapeHtml(event.summary || "No summary available.")}</p>
    <dl class="v2-detail-facts">
      <div><dt>Location</dt><dd>${escapeHtml(location)}</dd></div>
      <div><dt>Occurred</dt><dd>${escapeHtml(exactTime(event.occurredAt))}</dd></div>
      <div><dt>Updated</dt><dd>${escapeHtml(relativeTime(event.updatedAt || event.occurredAt))}</dd></div>
      <div><dt>Source</dt><dd>${escapeHtml(event.sourceName || "Unknown")}</dd></div>
      <div><dt>Verification</dt><dd>${escapeHtml(event.verificationStatus || "Reported")}</dd></div>
      <div><dt>Type</dt><dd>${escapeHtml(event.typeLabel || event.category || "—")}</dd></div>
    </dl>
    <div class="v2-detail-actions">${sourceLink}${providerLink}${mapLink}</div>
  </aside>`;
}