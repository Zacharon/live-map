import { escapeHtml, relativeTime } from "../../events/event-normalizer.js";

/**
 * Connected events panel for the analyst drawer.
 * @param {object|null} connections — from buildEventConnections / buildClusterConnections
 * @param {{ title?: string }} [opts]
 */
export function renderConnectionsPanel(connections, { title = "Connected events" } = {}) {
  if (!connections) {
    return `<section class="v2-connections" aria-label="${escapeHtml(title)}">
      <div class="v2-section-title"><span>${escapeHtml(title)}</span></div>
      <p class="v2-empty">Connection data unavailable.</p>
    </section>`;
  }

  const related = connections.relatedEvents || [];
  const summary = connections.summary || "";
  const pattern = connections.patternHint || "";
  const entities = connections.entities || {};

  const entityChips = [
    ...(entities.countries || []).slice(0, 4).map((v) => ({ label: v, kind: "country" })),
    ...(entities.providers || []).slice(0, 4).map((v) => ({ label: v, kind: "provider" })),
    ...(entities.categories || []).slice(0, 3).map((v) => ({ label: v, kind: "category" })),
  ]
    .map((chip) => `<span class="v2-connection-entity">${escapeHtml(chip.label)}</span>`)
    .join("");

  const rows = related.length
    ? related.map((ref) => {
      const reasons = (ref.relationReasons || []).map((r) => `<span class="v2-reason-chip">${escapeHtml(r)}</span>`).join("");
      const meta = [
        ref.sourceName || ref.provider || "Unknown",
        ref.severity || "",
        ref.occurredAt ? relativeTime(ref.occurredAt) : "",
      ].filter(Boolean).join(" · ");
      return `<button type="button" class="v2-connection-row" data-v2-timeline-event="${escapeHtml(ref.eventId)}">
        <div class="v2-connection-row-head">
          <strong>${escapeHtml(ref.title || "Untitled")}</strong>
          <span class="v2-connection-score">${escapeHtml(String(ref.relationScore ?? ""))}</span>
        </div>
        <span class="v2-connection-meta">${escapeHtml(meta)}</span>
        <div class="v2-reason-chips">${reasons}</div>
      </button>`;
    }).join("")
    : `<p class="v2-empty">No connected events in the current filtered view. This may be a one-off under active filters.</p>`;

  return `<section class="v2-connections" aria-label="${escapeHtml(title)}">
    <div class="v2-section-title">
      <span>${escapeHtml(title)}</span>
      <small>${escapeHtml(pattern || "heuristic")}</small>
    </div>
    <p class="v2-connection-summary">${escapeHtml(summary)}</p>
    ${entityChips ? `<div class="v2-connection-entities">${entityChips}</div>` : ""}
    <div class="v2-connection-list">${rows}</div>
    <p class="v2-empty v2-connection-caveat">Heuristic links from in-memory public event fields only — not a confirmed incident graph.</p>
  </section>`;
}
