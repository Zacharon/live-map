import { CATEGORIES, SEVERITIES } from "../config.js";
import { escapeHtml, exactTime, relativeTime, safeSourceUrl } from "../events/event-normalizer.js";
import { normalizeVerificationStatus } from "../events/event-quality.js";

export function verificationLabel(value) {
  return {
    "primary-confirmed": "Primary confirmed", corroborated: "Corroborated",
    "single-source": "Single source", reported: "Reported", observed: "Observed",
    disputed: "Disputed", corrected: "Corrected", retracted: "Retracted",
    unverified: "Unverified",
  }[normalizeVerificationStatus(value)];
}

export function renderWatchEventCard(event, { cardMode = "compact", selectedEventId = null, changeStatus = null } = {}) {
  const expanded = cardMode === "expanded";
  const category = CATEGORIES[event.category] || CATEGORIES.other;
  const severity = SEVERITIES[event.severity] || SEVERITIES.low;
  const sourceUrl = safeSourceUrl(event.sourceUrl);
  const confidence = Number.isFinite(event.confidence) ? `${Math.round(event.confidence)}%` : "Not scored";
  const status = verificationLabel(event.verificationStatus);
  const location = event.geographic === false ? "No supported map location" : event.place || event.country || "Location unknown";
  const selected = String(event.id) === String(selectedEventId);
  const changed = ["new", "updated"].includes(changeStatus) ? changeStatus : "";
  return `<article class="event-card ${expanded ? "expanded" : "compact"} record-${escapeHtml(event.recordKind || "event")}${selected ? " is-selected" : ""}${changed ? ` is-${changed}` : ""}" data-id="${escapeHtml(event.id)}" ${selected ? 'aria-current="true"' : ""}>
    <div class="event-meta"><span class="category-pill" style="--cat:${event.taxonomyColor || category.color}">${escapeHtml(event.domainLabel || category.label)}</span><span class="severity-tag" style="--sev:${severity.color}">${escapeHtml(severity.label)}</span>${changed ? `<span class="change-badge change-badge-${changed}">${changed === "new" ? "New" : "Updated"}</span>` : ""}</div>
    <h2><button type="button" class="event-title-button" data-event-detail="${escapeHtml(event.id)}">${escapeHtml(event.title)}</button></h2>
    <div class="consumer-card-line"><span>${escapeHtml(location)}</span><span>${escapeHtml(relativeTime(event.updatedAt))}</span></div>
    ${expanded ? `<p class="event-summary">${escapeHtml(event.summary || "No summary supplied.")}</p><dl class="event-facts"><div><dt>Occurred</dt><dd>${escapeHtml(exactTime(event.occurredAt))}</dd></div><div><dt>Published</dt><dd>${escapeHtml(exactTime(event.firstReportedAt))}</dd></div><div><dt>Confidence</dt><dd>${confidence}</dd></div></dl>` : ""}
    <div class="source-row standard-source-row"><span>${escapeHtml(event.sourceName || "Unknown source")}</span><span class="verification-label" data-verification="${escapeHtml(event.verificationStatus || "unverified")}">${status}</span>${sourceUrl ? `<a class="mini-source-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">Source ↗</a>` : ""}<button type="button" class="mini-source-link event-detail-button" data-event-detail="${escapeHtml(event.id)}">Inspect</button></div>
  </article>`;
}

export function workspaceCoverage({ demo, dataMode, sourceStatus = {}, apiStatus, apiFailure }) {
  if (demo || dataMode === "mixed") return { label: "Synthetic demo", detail: "Invented map reports. Historical measurements are labeled separately.", status: "synthetic" };
  if (apiStatus === "loading") return { label: "Loading coverage", detail: "Awaiting the event API. No coverage claim yet.", status: "loading" };
  const providers = Object.values(sourceStatus);
  const healthy = providers.filter((item) => item.ok && !item.stale && !['degraded', 'unavailable', 'stale', 'configuration-required', 'disabled'].includes(item.status)).length;
  const stale = providers.filter((item) => item.stale).length;
  if (apiFailure) return { label: "Data unavailable", detail: "The API failed. Any retained records are cached; coverage is not current.", status: "unavailable" };
  if (dataMode === "public" && !providers.length) return { label: "Historical snapshots", detail: "Saved public extracts; current operating conditions and unreported areas remain unknown.", status: "historical" };
  if (!providers.length) return { label: "Coverage unknown", detail: "No source diagnostics are available. Loaded records do not establish current coverage.", status: "unknown" };
  return { label: `${healthy}/${providers.length} sources healthy`, detail: `${stale} stale sources. Unreported areas are coverage gaps, not evidence of safety.`, status: stale || healthy < providers.length ? "partial" : "available" };
}

export function renderWorkspaceSummary(container, { state, events, band }) {
  if (!container) return;
  const coverage = workspaceCoverage(state);
  const scope = state.mapView.viewportOnly ? "Map area" : "All loaded regions";
  const undated = events.filter((event) => event.occurredAt === null).length;
  container.innerHTML = `<div class="scope-fact"><span>Scope</span><strong>${scope}</strong></div><div class="scope-fact"><span>Reports</span><strong>${events.length}<small> · ${band.toLowerCase()} scale${undated ? ` · ${undated} undated` : ""}</small></strong></div><details class="coverage-summary" data-coverage="${coverage.status}"><summary>${escapeHtml(coverage.label)}</summary><p>${escapeHtml(coverage.detail)}</p><a href="/sources">Inspect source coverage ↗</a></details>`;
}
