import { CATEGORIES, SEVERITIES } from "../../config.js";
import { escapeHtml, relativeTime, exactTime } from "../../events/event-normalizer.js";
import { groupEventsByTimeline, eventTimestamp } from "../../events/timeline.js";

const MAX_PER_BUCKET = 5;

function renderTimelineRow(event) {
  const categoryLabel = event.domainLabel || CATEGORIES[event.category]?.label || event.category || "Event";
  const severityLabel = SEVERITIES[event.severity]?.label || event.severity || "Low";
  const severityColor = SEVERITIES[event.severity]?.color || SEVERITIES.low.color;
  const location = event.geographic === false ? "No map location" : event.place || event.country || "—";
  const ts = eventTimestamp(event);
  const timeLabel = ts ? relativeTime(ts) : "Unknown time";
  return `<button type="button" class="v2-timeline-row" data-v2-timeline-event="${escapeHtml(event.id)}">
    <div class="v2-timeline-row-head">
      <span class="severity-tag" style="--sev:${severityColor}">${escapeHtml(severityLabel)}</span>
      <span class="v2-timeline-time">${escapeHtml(timeLabel)}</span>
    </div>
    <strong class="v2-timeline-title">${escapeHtml(event.title)}</strong>
    <div class="v2-timeline-meta">
      <span>${escapeHtml(categoryLabel)}</span>
      <span>${escapeHtml(event.sourceName || "Unknown source")}</span>
      <span>${escapeHtml(location)}</span>
    </div>
    <small class="v2-timeline-exact">${ts ? escapeHtml(exactTime(ts)) : "Timestamp unavailable"}</small>
  </button>`;
}

export function renderTimelinePanel(events = [], now = Date.now()) {
  if (!events.length) {
    return `<section class="v2-timeline" aria-label="Event timeline"><div class="v2-section-title"><span>Timeline</span></div><p class="v2-empty">No events in the current view.</p></section>`;
  }
  const groups = groupEventsByTimeline(events, now);
  if (!groups.length) {
    return `<section class="v2-timeline" aria-label="Event timeline"><div class="v2-section-title"><span>Timeline</span></div><p class="v2-empty">No timeline buckets available.</p></section>`;
  }
  const body = groups.map((group) => {
    const visible = group.events.slice(0, MAX_PER_BUCKET);
    const hidden = group.events.length - visible.length;
    return `<details class="v2-timeline-bucket" open><summary><span>${escapeHtml(group.label)}</span><b>${group.events.length}</b></summary><div class="v2-timeline-list">${visible.map(renderTimelineRow).join("")}${hidden > 0 ? `<p class="v2-empty">${hidden} more in this bucket (use feed filters).</p>` : ""}</div></details>`;
  }).join("");
  return `<section class="v2-timeline" aria-label="Event timeline"><div class="v2-section-title"><span>Timeline</span><small>${events.length} visible</small></div>${body}</section>`;
}