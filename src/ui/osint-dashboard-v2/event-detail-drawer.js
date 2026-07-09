import { CATEGORIES, SEVERITIES } from "../../config.js";
import { escapeHtml, exactTime, relativeTime } from "../../events/event-normalizer.js";
import { renderEventArtifactSection, renderClusterArtifactSection } from "./event-artifact-card.js";
import { computeThreatLevel, computeClusterThreatLevel } from "../../intelligence/threat-level.js";
import { buildEventConnections, buildClusterConnections } from "../../intelligence/event-connections.js";
import { renderThreatBadge, renderThreatExplain } from "./threat-badge.js";
import { renderConnectionsPanel } from "./connections-panel.js";
import { findClusterById, clusterKeyForEvent } from "../../events/clustering.js";

function whyShownCopy(event, changeStatus, connections) {
  const bits = [];
  if (changeStatus === "new") bits.push("Flagged new since your last mark-as-seen snapshot.");
  if (changeStatus === "updated") bits.push("Flagged updated since your last mark-as-seen snapshot.");
  if (event?.severity === "critical" || event?.severity === "high") {
    bits.push(`Severity band is ${event.severity}.`);
  }
  if (connections?.patternHint === "cluster-pattern") {
    bits.push("Appears in a multi-event cluster/pattern under current filters.");
  } else if (connections?.relatedEvents?.length) {
    bits.push(`${connections.relatedEvents.length} related event(s) share place, time, provider, or category.`);
  } else {
    bits.push("Included because it matches active filters and time window.");
  }
  if (event?.geographic === false) bits.push("Non-geographic record — listed without a map pin.");
  else if (!(Number.isFinite(event?.lat) && Number.isFinite(event?.lon))) bits.push("Coordinates missing or incomplete.");
  return bits.join(" ");
}

function resolveClusterForEvent(event, clusters) {
  if (!event) return null;
  if (event.clusterId) {
    const byId = findClusterById(clusters, event.clusterId);
    if (byId) return byId;
  }
  const key = clusterKeyForEvent(event);
  return clusters.find((c) => c.key === key) || null;
}

export function renderClusterDetailDrawer(cluster, { allEvents = [] } = {}) {
  if (!cluster) {
    return `<aside class="v2-event-detail v2-event-detail-empty" aria-label="Cluster details"><p class="v2-empty">Select a cluster to inspect related events. Clusters group nearby same-domain events within ~24h.</p></aside>`;
  }
  const threat = computeClusterThreatLevel(cluster);
  const connections = buildClusterConnections(cluster, { allEvents });
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
        ${renderThreatBadge(threat)}
      </div>
      <h2 class="v2-detail-title">Related cluster</h2>
    </div>
    <p class="v2-detail-summary">${escapeHtml(cluster.attentionLabel)} — ${escapeHtml(cluster.locationLabel)} across ${cluster.sourceCount} source${cluster.sourceCount === 1 ? "" : "s"}.</p>
    ${renderThreatExplain(threat)}
    ${mapNote}
    <div class="v2-detail-actions"><button type="button" class="v2-detail-link secondary" data-v2-clear-selection>Clear selection</button></div>
    <dl class="v2-detail-facts">
      <div><dt>Domain</dt><dd>${escapeHtml(cluster.domainLabel)}</dd></div>
      <div><dt>Type</dt><dd>${escapeHtml(cluster.typeLabel)}</dd></div>
      <div><dt>Sources</dt><dd>${escapeHtml((cluster.sources || []).join(", ") || "—")}</dd></div>
      <div><dt>Time range</dt><dd>${cluster.startedAt ? escapeHtml(relativeTime(cluster.endedAt)) + " to " + escapeHtml(relativeTime(cluster.startedAt)) : "Unknown"}</dd></div>
      <div><dt>Providers</dt><dd>${escapeHtml((cluster.sources || []).join(", ") || "—")}</dd></div>
      <div><dt>Pattern</dt><dd>${escapeHtml(connections.patternHint || "cluster")}</dd></div>
    </dl>
    <div class="v2-cluster-members"><div class="v2-section-title"><span>Member events</span></div>${members}${hidden}</div>
    ${renderConnectionsPanel(connections, { title: "Connected / member events" })}
    ${renderClusterArtifactSection(cluster, { allEvents })}
  </aside>`;
}

export function renderEventDetailDrawer(event, { changeStatus = null, allEvents = [], clusters = [] } = {}) {
  if (!event) {
    return `<aside class="v2-event-detail v2-event-detail-empty" aria-label="Event details"><p class="v2-empty">Select an event from the feed, timeline, map, or connected list to open the analyst card.</p></aside>`;
  }
  const subjectCluster = resolveClusterForEvent(event, clusters);
  const connections = buildEventConnections(event, { allEvents, clusters });
  const threat = computeThreatLevel(event, {
    cluster: subjectCluster,
    relatedCount: connections.relatedEvents.length,
  });

  const changeBadge = changeStatus === "new"
    ? `<span class="v2-change-badge v2-change-badge-new">New since last visit</span>`
    : changeStatus === "updated"
      ? `<span class="v2-change-badge v2-change-badge-updated">Updated since last visit</span>`
      : "";
  const categoryLabel = event.domainLabel || CATEGORIES[event.category]?.label || event.category || "Event";
  const severityLabel = SEVERITIES[event.severity]?.label || event.severity || "Low";
  const severityColor = SEVERITIES[event.severity]?.color || SEVERITIES.low.color;
  const categoryColor = event.taxonomyColor || CATEGORIES[event.category]?.color || CATEGORIES.other.color;
  const location = event.geographic === false ? "No map location" : event.place || event.country || "Location pending";
  const confidence = Number.isFinite(event.confidence) ? `${Math.round(event.confidence)}%` : "Not scored";
  const sourceBadge = event.sourceName || event.provider || "Unknown source";
  const sourceLink = event.sourceUrl
    ? `<a class="v2-detail-link" href="${escapeHtml(event.sourceUrl)}" target="_blank" rel="noopener noreferrer">Open source</a>`
    : `<span class="v2-detail-link secondary v2-detail-link-disabled" title="No source URL on this record">No source URL</span>`;
  const providerLink = event.providerUrl
    ? `<a class="v2-detail-link secondary" href="${escapeHtml(event.providerUrl)}" target="_blank" rel="noopener noreferrer">Provider info</a>`
    : "";
  const mapLink = Number.isFinite(event.lat) && Number.isFinite(event.lon)
    ? `<a class="v2-detail-link secondary" href="https://www.openstreetmap.org/?mlat=${event.lat}&mlon=${event.lon}#map=7/${event.lat}/${event.lon}" target="_blank" rel="noopener noreferrer">Coordinates</a>`
    : `<span class="v2-detail-link secondary v2-detail-link-disabled" title="Coordinates unavailable">No coordinates</span>`;
  const why = whyShownCopy(event, changeStatus, connections);

  return `<aside class="v2-event-detail" aria-label="Event details">
    <div class="v2-detail-head">
      <button type="button" class="v2-detail-close" data-v2-close-detail aria-label="Close details">×</button>
      <div class="v2-detail-badges">
        <span class="category-pill" style="--cat:${categoryColor}">${escapeHtml(categoryLabel)}</span>
        <span class="severity-tag" style="--sev:${severityColor}">${escapeHtml(severityLabel)}</span>
        <span class="v2-confidence">${escapeHtml(confidence)} confidence</span>
        <span class="v2-source-badge">${escapeHtml(sourceBadge)}</span>
        ${renderThreatBadge(threat)}
        ${changeBadge}
      </div>
      <h2 class="v2-detail-title">${escapeHtml(event.title)}</h2>
    </div>
    <p class="v2-detail-summary">${escapeHtml(event.summary || "No summary available.")}</p>
    ${renderThreatExplain(threat)}
    <div class="v2-why-shown">
      <div class="v2-section-title"><span>Why am I seeing this?</span></div>
      <p class="v2-empty">${escapeHtml(why)}</p>
    </div>
    <dl class="v2-detail-facts">
      <div><dt>Location</dt><dd>${escapeHtml(location)}</dd></div>
      <div><dt>Occurred</dt><dd>${escapeHtml(exactTime(event.occurredAt))}</dd></div>
      <div><dt>Updated</dt><dd>${escapeHtml(relativeTime(event.updatedAt || event.occurredAt))}</dd></div>
      <div><dt>Source</dt><dd>${escapeHtml(event.sourceName || "Unknown")}</dd></div>
      <div><dt>Verification</dt><dd>${escapeHtml(event.verificationStatus || "Reported")}</dd></div>
      <div><dt>Type</dt><dd>${escapeHtml(event.typeLabel || event.category || "—")}</dd></div>
      <div><dt>Domain</dt><dd>${escapeHtml(event.domainLabel || event.domain || "—")}</dd></div>
      <div><dt>Provider</dt><dd>${escapeHtml(event.provider || event.providerName || "—")}</dd></div>
    </dl>
    <div class="v2-detail-actions">${sourceLink}${providerLink}${mapLink}<button type="button" class="v2-detail-link secondary" data-v2-clear-selection>Clear selection</button></div>
    ${renderConnectionsPanel(connections)}
    ${renderEventArtifactSection(event, { allEvents, clusters, changeStatus })}
  </aside>`;
}
