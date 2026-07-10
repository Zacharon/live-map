import { escapeHtml } from "../../events/event-normalizer.js";
import { threatLevelDisplay } from "../../intelligence/threat-level.js";

/**
 * Compact threat level badge HTML.
 * @param {object|null} threat
 * @param {{ compact?: boolean }} [opts]
 */
export function renderThreatBadge(threat, { compact = false } = {}) {
  if (!threat || typeof threat !== "object") {
    return `<span class="v2-threat-badge v2-threat-low" title="Threat level unavailable">Threat: —</span>`;
  }
  const level = String(threat.level || "low");
  const display = threatLevelDisplay(level);
  const score = Number.isFinite(threat.score) ? Math.round(threat.score) : "—";
  const title = escapeHtml(
    `${threat.label || "OSINT Forge threat level v0 — heuristic"} · score ${score}. ${
      (threat.reasons || []).slice(0, 3).join("; ") || "No reasons"
    }`,
  );
  const text = compact
    ? escapeHtml(display)
    : `Threat: ${escapeHtml(display)}`;
  return `<span class="v2-threat-badge v2-threat-${escapeHtml(level)}" title="${title}">${text}</span>`;
}

/**
 * Explainable reasons + caveats block for drawer.
 * @param {object|null} threat
 */
export function renderThreatExplain(threat) {
  if (!threat) return "";
  const reasons = (threat.reasons || []).slice(0, 6)
    .map((r) => `<li>${escapeHtml(r)}</li>`)
    .join("");
  const caveats = (threat.caveats || []).slice(0, 3)
    .map((c) => `<li>${escapeHtml(c)}</li>`)
    .join("");
  return `<div class="v2-threat-explain">
    <div class="v2-section-title"><span>Threat level v0</span><small>${escapeHtml(threat.label || "heuristic")}</small></div>
    <p class="v2-threat-score-line"><strong>${escapeHtml(threatLevelDisplay(threat.level))}</strong> · score ${escapeHtml(String(threat.score ?? "—"))}${threat.certainty ? ` · certainty ${escapeHtml(threat.certainty)}` : ""}</p>
    ${reasons ? `<ul class="v2-threat-reasons">${reasons}</ul>` : ""}
    ${caveats ? `<ul class="v2-threat-caveats">${caveats}</ul>` : ""}
  </div>`;
}
