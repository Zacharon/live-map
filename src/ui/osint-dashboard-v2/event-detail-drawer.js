import { CATEGORIES, SEVERITIES } from "../../config.js";
import { escapeHtml, exactTime, relativeTime } from "../../events/event-normalizer.js";

export function renderClusterDetailDrawer(cluster) {
  if (!cluster) {
    return `<aside class="v2-event-detail v2-event-detail-empty" aria-label="Cluster details"><p class="v2-empty">Select a cluster to inspect related events.</p></aside>`;
  }
  const severityColor = SEVERITIES[cluster.severity]?.color || SEVERITIES.low.color;
  const severityLabel = SEVERITIES[cluster.severity]?.label || cluster.severity;
  const members = (cluster.events || []).slice(0, 12).map((event) => {
    return `<button type="button" class="v2-cluster-member" data-v2-timeline-event="${escapeHtml(event.id)}">
      <strong>${escapeHtml(event.title)}</strong>
      <span>${escapeHtml(event.sourceName || "Unknown")} · ${escapeHtml(relativeTime(event.occurredAt))}</span>
    </button>`;
  }).join("");
  const hidden = (cluster.events || []).length > 12 ? `<p class="v2-empty">${cluster.events.length - 12} more member events in feed.</p>` : "";
  const mapNote = cluster.events?.some((event) => event.geographic !== false && Number.isFinite(event.lat) && Number.isFinite(event.lon))
    ? `<p class="v2-map-note">Map highlights member events in this cluster.</p>`
    : `<p class="v2-map-note">No map coordinates in this cluster — inspect member events below.</p>`;
  return `<aside class="v2-event-detail v2-cluster-detail" aria-label="Cluster details">
    <div class="v2-detail-head">
      <button type="button" class="v2-detail-close" data-v2-close-detail aria-label="Close details">×</button>
      <div class="v2-detail-badges">
        <span class="category-pill">${escapeHtml(cluster.domainLabel)}</span>
        <span class="severity-tag" style="--sev:${severityColor}">${escapeHtml(severityLabel)}</span>
        <span class="v2-confidence">${cluster.eventCount} events</span>
      </div>
      <h2 class="v2-detail-title">Related cluster</h2>
    </div>
    <p class="v2-detail-summary">${escapeHtml(cluster.attentionLabel)} — ${escapeHtml(cluster.locationLabel)} across ${cluster.sourceCount} source${cluster.sourceCount === 1 ? "" : "s"}.</p>
    ${mapNote}
    <div class="v2-detail-actions"><button type="button" class="v2-detail-link secondary" data-v2-clear-selection>Clear selection</button></div>
    <dl class="v2-detail-facts">
      <div><dt>Domain</dt><dd>${escapeHtml(cluster.domainLabel)}</dd></div>
      <div><dt>Type</dt><dd>${escapeHtml(cluster.typeLabel)}</dd></div>
      <div><dt>Sources</dt><dd>${escapeHtml(cluster.sources.join(", "))}</dd></div>
      <div><dt>Time range</dt><dd>${cluster.startedAt ? escapeHtml(relativeTime(cluster.endedAt)) + " to " + escapeHtml(relativeTime(cluster.startedAt)) : "Unknown"}</dd></div>
    </dl>
    <div class="v2-cluster-members"><div class="v2-section-title"><span>Member events</span></div>${members}${hidden}</div>
  </aside>`;
}

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
    <div class="v2-detail-actions">${sourceLink}${providerLink}${mapLink}<button type="button" class="v2-detail-link secondary" data-v2-clear-selection>Clear selection</button></div>
  </aside>`;
}