import { escapeHtml, relativeTime } from "../../events/event-normalizer.js";
import { topChangedEvents, buildChangeStatusMap, eventStableId } from "../../events/change-awareness.js";

function renderChangeRow(event, status) {
  const badge = status === "new"
    ? `<span class="v2-change-badge v2-change-badge-new">New</span>`
    : `<span class="v2-change-badge v2-change-badge-updated">Updated</span>`;
  return `<button type="button" class="v2-change-row" data-v2-timeline-event="${escapeHtml(eventStableId(event))}">
    ${badge}
    <strong>${escapeHtml(event.title || "Untitled event")}</strong>
    <span>${escapeHtml(event.sourceName || "Unknown")} · ${escapeHtml(relativeTime(event.updatedAt || event.occurredAt))}</span>
  </button>`;
}

export function renderChangeAwarenessPanel(changeSummary = null) {
  const summary = changeSummary || {
    hasPreviousSnapshot: false,
    corruptSnapshot: false,
    storageUnavailable: false,
    lastSeenAt: null,
    newEvents: [],
    updatedEvents: [],
    newClusters: [],
    changedClusters: [],
  };

  if (summary.storageUnavailable) {
    return `<section class="v2-change-awareness" aria-label="Change since last visit">
      <div class="v2-section-title"><span>Since last visit</span></div>
      <p class="v2-empty">Browser storage unavailable. Change tracking is disabled on this session.</p>
    </section>`;
  }

  if (summary.corruptSnapshot) {
    return `<section class="v2-change-awareness v2-change-awareness-warn" aria-label="Change since last visit">
      <div class="v2-section-title"><span>Since last visit</span></div>
      <p class="v2-empty">Previous snapshot was unreadable. Mark the current view as seen to start fresh.</p>
      <button type="button" class="v2-mark-seen-btn" data-v2-mark-seen>Mark current view as seen</button>
    </section>`;
  }

  if (!summary.hasPreviousSnapshot) {
    return `<section class="v2-change-awareness" aria-label="Change since last visit">
      <div class="v2-section-title"><span>Since last visit</span></div>
      <p class="v2-empty">No previous snapshot yet. Mark the current view as seen to track what changes next time.</p>
      <button type="button" class="v2-mark-seen-btn" data-v2-mark-seen>Mark current view as seen</button>
    </section>`;
  }

  const lastSeen = summary.lastSeenAt ? relativeTime(summary.lastSeenAt) : "never";
  const newCount = summary.newEvents?.length || 0;
  const updatedCount = summary.updatedEvents?.length || 0;
  const clusterCount = (summary.newClusters?.length || 0) + (summary.changedClusters?.length || 0);
  const statusMap = buildChangeStatusMap(summary);
  const highlights = topChangedEvents(summary, 6);
  const list = highlights.length
    ? `<div class="v2-change-list">${highlights.map((event) => renderChangeRow(event, statusMap.get(eventStableId(event)) || "updated")).join("")}</div>`
    : `<p class="v2-empty">No new or updated events in the current view since ${escapeHtml(lastSeen)}.</p>`;

  const clusterNote = clusterCount
    ? `<p class="v2-change-cluster-note">${summary.newClusters?.length || 0} new / ${summary.changedClusters?.length || 0} changed cluster${clusterCount === 1 ? "" : "s"}</p>`
    : "";

  return `<section class="v2-change-awareness" aria-label="Change since last visit">
    <div class="v2-section-title">
      <span>Since last visit</span>
      <small>Last seen ${escapeHtml(lastSeen)}</small>
    </div>
    <div class="v2-change-stats">
      <div class="v2-change-stat"><span class="v2-change-stat-value">${newCount}</span><span class="v2-change-stat-label">New</span></div>
      <div class="v2-change-stat"><span class="v2-change-stat-value">${updatedCount}</span><span class="v2-change-stat-label">Updated</span></div>
      <div class="v2-change-stat"><span class="v2-change-stat-value">${clusterCount}</span><span class="v2-change-stat-label">Clusters</span></div>
    </div>
    ${clusterNote}
    ${list}
    <button type="button" class="v2-mark-seen-btn" data-v2-mark-seen>Mark current view as seen</button>
  </section>`;
}