import { CATEGORIES, SEVERITIES, CII_WEIGHTS } from "../config.js";
import { escapeHtml, exactTime } from "../events/event-normalizer.js";

export function openEventDialog(event, dialog, content, map) {
  const rows = {
    ...event.details,
    "Exact reported time": exactTime(event.occurredAt),
    "UTC time": new Date(event.occurredAt).toISOString(),
    Latitude: event.lat.toFixed(5),
    Longitude: event.lon.toFixed(5),
    "Coordinate method": event.coordinateMethod,
    "Source type": event.sourceType,
    "Verification status": event.verificationStatus,
    "Source confidence": `${event.confidence}%`,
    "Severity score": Number.isFinite(event.severityScore) ? `${event.severityScore}/100` : "Not reported",
    "Data freshness": event.updatedAt ? exactTime(event.updatedAt) : "Unknown",
    "Provider ID": event.providerId || event.id,
  };
  content.innerHTML = `<div class="dialog-kicker">${CATEGORIES[event.category]?.label || "Event"} - ${SEVERITIES[event.severity]?.label || "Low"}</div><h2 class="dialog-title">${escapeHtml(event.title)}</h2><p class="dialog-summary">${escapeHtml(event.summary)}</p><p class="severity-reason">${escapeHtml(event.severityReason || "Severity is based on the provider category and available measurements.")}</p><div class="dialog-grid"><div><span>Location</span><strong>${escapeHtml(event.place)}</strong></div><div><span>Reported</span><strong>${escapeHtml(exactTime(event.occurredAt))}</strong></div><div><span>Provider</span><strong>${escapeHtml(event.sourceName)}</strong></div></div><p class="dialog-summary">This record is informational only. Timing, location and measurements depend on the original provider and may be corrected later.</p><table class="details-table"><tbody>${Object.entries(rows).map(([key, value]) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`).join("")}</tbody></table><div class="dialog-actions">${event.sourceUrl ? `<a class="source-link" href="${escapeHtml(event.sourceUrl)}" target="_blank" rel="noopener noreferrer">Open original source</a>` : ""}<a class="source-link secondary" href="https://www.openstreetmap.org/?mlat=${event.lat}&mlon=${event.lon}#map=7/${event.lat}/${event.lon}" target="_blank" rel="noopener noreferrer">Open coordinates</a>${event.providerUrl ? `<a class="source-link secondary" href="${escapeHtml(event.providerUrl)}" target="_blank" rel="noopener noreferrer">Provider info</a>` : ""}</div>`;
  dialog.showModal();
  map.flyTo([event.lat, event.lon], Math.max(map.getZoom(), 5));
}

export function openMethodologyDialog(dialog, content) {
  content.innerHTML = `<div class="dialog-kicker">Country Instability Index</div><h2 class="dialog-title">Experimental CII methodology</h2><p class="dialog-summary">CII is a transparent prototype analytic indicator, not an official government, credit, insurance, travel, or financial rating. Scores are reproducible from visible event data and decrease in confidence when data is missing or stale.</p><table class="details-table"><tbody>${Object.entries(CII_WEIGHTS).map(([key, value]) => `<tr><td>${key}</td><td>${Math.round(value * 100)}%</td></tr>`).join("")}</tbody></table><p class="dialog-summary">Levels: 0-19 Stable, 20-39 Guarded, 40-59 Elevated, 60-79 High, 80-100 Critical.</p>`;
  dialog.showModal();
}
