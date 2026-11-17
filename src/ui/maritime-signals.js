import { escapeHtml } from "../events/event-normalizer.js";
import { MARITIME_SIGNAL_IDS, MARITIME_SIGNAL_LABELS } from "../intelligence/maritime-signals.js";

function valueText(value) {
  if (value == null) return "unknown";
  if (Array.isArray(value)) return value.map(valueText).join("; ") || "unknown";
  if (typeof value === "object") return Object.entries(value).map(([key, item]) => `${key.replace(/([a-z])([A-Z])/g, "$1 $2")}: ${valueText(item)}`).join("; ") || "unknown";
  return String(value);
}

function sourceLink(item) {
  try {
    const url = new URL(item.sourceUrl);
    if (["http:", "https:"].includes(url.protocol)) return `<a href="${escapeHtml(url.href)}" target="_blank" rel="noopener noreferrer">Source for ${escapeHtml(item.id)}</a>`;
  } catch { /* Missing provenance stays unknown. */ }
  return "Source URL unknown";
}

export function renderMaritimeSignals(signals = {}, { compact = false } = {}) {
  if (compact) return `<dl class="maritime-summary" data-maritime-summary>${MARITIME_SIGNAL_IDS.map(id => `<div><dt>${MARITIME_SIGNAL_LABELS[id]}</dt><dd>${escapeHtml(signals[id]?.state || "unknown")}</dd></div>`).join("")}</dl>`;
  return `<section class="maritime-signals" aria-label="Independent maritime signals" data-maritime-signals>
    <h3>Maritime evidence</h3>
    <p class="panel-help">Missing AIS does not mean no ships or zero throughput. Flow, observability and security remain independent.</p>
    ${MARITIME_SIGNAL_IDS.map(id => {
      const item = signals[id] || { state: "unknown", evidence: [], unknowns: ["No assessment available."] };
      return `<details class="maritime-signal" data-maritime-signal="${id}" data-state="${escapeHtml(item.state)}">
        <summary><strong>${MARITIME_SIGNAL_LABELS[id]}</strong> · ${escapeHtml(item.state)} · ${(item.evidence || []).length} evidence record(s)</summary>
        <p class="panel-help">${escapeHtml(item.note || "No qualifying evidence.")}</p>
        <p class="panel-help">Assessed ${escapeHtml(item.evaluatedAt || "unknown")} · known by ${escapeHtml(item.knowledgeCutoff || "unknown")}. Confidence and coverage are assessed per record.</p>
        <ul>${(item.unknowns || []).map(note => `<li>${escapeHtml(note)}</li>`).join("")}</ul>
        ${(item.evidence || []).map(evidence => `<article class="maritime-evidence" data-maritime-evidence="${escapeHtml(evidence.id)}">
          <h4>${escapeHtml(evidence.title || evidence.id)}</h4>
          <p><code>${escapeHtml(evidence.id)}</code> · revision ${escapeHtml(String(evidence.revision))}${evidence.synthetic ? " · SYNTHETIC FIXTURE" : ""}</p>
          <dl class="v2-detail-facts">
            ${[
              ["Value / units", `${valueText(evidence.value)} ${evidence.unit || "units unknown"}`],
              ["Basis / origin", `${evidence.basis} / ${evidence.valueOrigin}`],
              ["Provider / organization", `${evidence.sourceId || "unknown"} / ${evidence.organization || "unknown"}`],
              ["Method", evidence.method], ["Observation period", evidence.period],
              ["Observed", evidence.observedAt], ["Published", evidence.reportedAt], ["Retrieved", evidence.retrievedAt],
              ["Freshness", evidence.freshness], ["Coverage", evidence.coverage], ["Scope", evidence.scope],
              ["Confidence", evidence.confidence],
              ...(id === "securityRisk" ? [["Reported risk state", evidence.securityState]] : []),
              ["Limitations", evidence.limitations.length ? evidence.limitations : "unknown"],
            ].map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(valueText(value))}</dd></div>`).join("")}
          </dl>
          <p>${sourceLink(evidence)}</p>
          ${evidence.contradictsId ? `<p>Contradicts ${escapeHtml(evidence.contradictsId)}. Both records remain inspectable.</p>` : ""}
        </article>`).join("") || `<p class="panel-help">No qualifying records. Unknown is not zero.</p>`}
      </details>`;
    }).join("")}
    <p class="panel-help">Separate estimates retain their method, period and coverage. No averaging or combined recovery / safety score.</p>
  </section>`;
}
