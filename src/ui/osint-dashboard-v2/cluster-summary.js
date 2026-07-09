import { SEVERITIES } from "../../config.js";
import { escapeHtml, relativeTime } from "../../events/event-normalizer.js";
import { buildEventClusters } from "../../events/clustering.js";

const MAX_CLUSTERS = 8;

function renderClusterCard(cluster) {
  const severityColor = SEVERITIES[cluster.severity]?.color || SEVERITIES.low.color;
  const severityLabel = SEVERITIES[cluster.severity]?.label || cluster.severity;
  const range = cluster.startedAt && cluster.endedAt
    ? `${relativeTime(cluster.endedAt)} – ${relativeTime(cluster.startedAt)}`
    : "Time range unknown";
  return `<button type="button" class="v2-cluster-card" data-v2-cluster="${escapeHtml(cluster.clusterId)}">
    <div class="v2-cluster-head">
      <strong>${cluster.eventCount} events</strong>
      <span class="severity-tag" style="--sev:${severityColor}">${escapeHtml(severityLabel)}</span>
    </div>
    <div class="v2-cluster-label">${escapeHtml(cluster.domainLabel)} · ${escapeHtml(cluster.typeLabel)}</div>
    <div class="v2-cluster-meta">
      <span>${escapeHtml(cluster.locationLabel)}</span>
      <span>${cluster.sourceCount} source${cluster.sourceCount === 1 ? "" : "s"}</span>
    </div>
    <div class="v2-cluster-attention">${escapeHtml(cluster.attentionLabel)}</div>
    <small>${escapeHtml(range)}</small>
  </button>`;
}

export function renderClusterSummary(events = []) {
  const clusters = buildEventClusters(events).slice(0, MAX_CLUSTERS);
  if (!events.length) {
    return `<section class="v2-clusters" aria-label="Event clusters"><div class="v2-section-title"><span>Related clusters</span></div><p class="v2-empty">No events to cluster.</p></section>`;
  }
  if (!clusters.length) {
    return `<section class="v2-clusters" aria-label="Event clusters"><div class="v2-section-title"><span>Related clusters</span></div><p class="v2-empty">No multi-event clusters in the current view. Try widening filters or time window.</p></section>`;
  }
  return `<section class="v2-clusters" aria-label="Event clusters"><div class="v2-section-title"><span>Related clusters</span><small>${clusters.length} groups</small></div><div class="v2-cluster-list">${clusters.map(renderClusterCard).join("")}</div></section>`;
}

export { buildEventClusters } from "../../events/clustering.js";