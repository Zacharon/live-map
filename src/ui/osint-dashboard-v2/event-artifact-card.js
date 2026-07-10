/**
 * Event / cluster artifact card HTML for the OSINT detail drawer.
 */

import { escapeHtml, relativeTime } from "../../events/event-normalizer.js";
import { buildEventArtifact, buildClusterArtifact } from "../../artifacts/event-artifacts.js";
import { computeThreatLevel, computeClusterThreatLevel } from "../../intelligence/threat-level.js";
import { renderThreatBadge } from "./threat-badge.js";

function exportButtons() {
  return `<div class="v2-artifact-actions" role="group" aria-label="Export artifact">
    <button type="button" class="v2-detail-link" data-v2-artifact-action="copy-md">Copy Markdown</button>
    <button type="button" class="v2-detail-link secondary" data-v2-artifact-action="download-md">Download Markdown</button>
    <button type="button" class="v2-detail-link" data-v2-artifact-action="copy-json">Copy JSON</button>
    <button type="button" class="v2-detail-link secondary" data-v2-artifact-action="download-json">Download JSON</button>
  </div>`;
}

function relatedList(related = [], emptyLabel = "No related events in the current in-memory view.") {
  if (!related.length) {
    return `<p class="v2-empty">${escapeHtml(emptyLabel)}</p>`;
  }
  const rows = related.slice(0, 8).map((ref) => {
    const meta = [
      ref.sourceName || ref.provider || "Unknown",
      ref.occurredAt ? relativeTime(ref.occurredAt) : "time unknown",
      (ref.matchReasons || []).join(", ") || "related",
    ].join(" · ");
    return `<button type="button" class="v2-artifact-related" data-v2-timeline-event="${escapeHtml(ref.eventId)}">
      <strong>${escapeHtml(ref.title || "Untitled")}</strong>
      <span>${escapeHtml(meta)}</span>
    </button>`;
  }).join("");
  return `<div class="v2-artifact-related-list">${rows}</div>`;
}

function fieldList(fields = []) {
  const rows = fields
    .filter((field) => field.present)
    .slice(0, 16)
    .map((field) => `<div><dt>${escapeHtml(field.label || field.key)}</dt><dd>${escapeHtml(String(field.value))}</dd></div>`)
    .join("");
  if (!rows) return `<p class="v2-empty">No normalized fields available.</p>`;
  return `<dl class="v2-detail-facts v2-artifact-fields">${rows}</dl>`;
}

function caveatPreview(caveats = []) {
  const short = caveats.slice(0, 3).map((c) => `<li>${escapeHtml(c)}</li>`).join("");
  const more = caveats.length > 3
    ? `<p class="v2-empty">+${caveats.length - 3} more caveats included in Markdown/JSON export.</p>`
    : "";
  return `<ul class="v2-artifact-caveats">${short}</ul>${more}`;
}

/**
 * @param {object|null} event
 * @param {{ allEvents?: object[], clusters?: object[], changeStatus?: string|null }} [opts]
 */
export function renderEventArtifactSection(event, opts = {}) {
  if (!event) return "";
  const artifact = buildEventArtifact(event, {
    allEvents: opts.allEvents || [],
    clusters: opts.clusters || [],
    changeStatus: opts.changeStatus || null,
  });
  const confidence = escapeHtml(artifact.confidence?.display || "Not scored in v1");
  const corroboration = escapeHtml(String(artifact.corroborationCount ?? 0));
  const severity = escapeHtml(artifact.severity || "—");
  const source = escapeHtml(artifact.sourceName || artifact.source?.sourceName || "Unknown");
  const threat = computeThreatLevel(event, { relatedCount: artifact.relatedEvents?.length || 0 });

  return `<section class="v2-artifact" aria-label="Event artifact">
    <div class="v2-section-title">
      <span>OSINT artifact</span>
      <small>Exportable snapshot</small>
    </div>
    <div class="v2-artifact-summary">
      <span class="v2-artifact-chip">Severity: ${severity}</span>
      ${renderThreatBadge(threat, { compact: true })}
      <span class="v2-artifact-chip">Confidence: ${confidence}</span>
      <span class="v2-artifact-chip">Corroboration: ${corroboration}</span>
      <span class="v2-artifact-chip">Source: ${source}</span>
    </div>
    <p class="v2-artifact-note">${escapeHtml(artifact.confidence?.note || "")}</p>
    <div class="v2-section-title"><span>Related events</span><small>${artifact.relatedEvents.length}</small></div>
    ${relatedList(artifact.relatedEvents)}
    <div class="v2-section-title"><span>Normalized fields</span></div>
    ${fieldList(artifact.normalizedFields)}
    <div class="v2-section-title"><span>Analyst notes</span></div>
    <p class="v2-empty v2-artifact-notes">${escapeHtml(artifact.analystNotes)}</p>
    <div class="v2-section-title"><span>Caveats</span></div>
    ${caveatPreview(artifact.caveats)}
    ${exportButtons()}
  </section>`;
}

/**
 * @param {object|null} cluster
 * @param {{ allEvents?: object[] }} [opts]
 */
export function renderClusterArtifactSection(cluster, opts = {}) {
  if (!cluster) return "";
  const artifact = buildClusterArtifact(cluster, {
    allEvents: opts.allEvents || [],
  });
  const confidence = escapeHtml(artifact.confidence?.display || "Not scored in v1");
  const corroboration = escapeHtml(String(artifact.corroborationCount ?? 0));
  const severity = escapeHtml(artifact.severity || "—");
  const sources = escapeHtml(artifact.providerSummary || "—");
  const threat = computeClusterThreatLevel(cluster);

  return `<section class="v2-artifact" aria-label="Cluster artifact">
    <div class="v2-section-title">
      <span>OSINT artifact</span>
      <small>Cluster export</small>
    </div>
    <div class="v2-artifact-summary">
      <span class="v2-artifact-chip">Events: ${escapeHtml(String(artifact.eventCount))}</span>
      <span class="v2-artifact-chip">Severity: ${severity}</span>
      ${renderThreatBadge(threat, { compact: true })}
      <span class="v2-artifact-chip">Confidence: ${confidence}</span>
      <span class="v2-artifact-chip">Corroboration: ${corroboration}</span>
    </div>
    <p class="v2-artifact-note">Sources: ${sources}</p>
    <p class="v2-artifact-note">${escapeHtml(artifact.locationSummary || artifact.locationLabel || "")}</p>
    <div class="v2-section-title"><span>Representative events</span><small>${artifact.representativeEvents.length}</small></div>
    ${relatedList(artifact.representativeEvents, "No member events available.")}
    <div class="v2-section-title"><span>Normalized fields</span></div>
    ${fieldList(artifact.normalizedFields)}
    <div class="v2-section-title"><span>Analyst notes</span></div>
    <p class="v2-empty v2-artifact-notes">${escapeHtml(artifact.analystNotes)}</p>
    <div class="v2-section-title"><span>Caveats</span></div>
    ${caveatPreview(artifact.caveats)}
    ${exportButtons()}
  </section>`;
}
