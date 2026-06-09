import { escapeHtml, relativeTime } from "../events/event-normalizer.js";

export function providerState(status = {}) {
  if (status.disabled) return "disabled";
  if (status.message && /rate/i.test(status.message)) return "rate-limited";
  if (status.message && /auth|credential/i.test(status.message)) return "authentication-required";
  if (!status.ok) return "unavailable";
  if (status.stale) return "stale";
  if (status.status === "degraded") return "degraded";
  return "operational";
}

export function renderProviderHealthPanel(sourceStatus = {}, providerResults = []) {
  const resultByProvider = Object.fromEntries(providerResults.map((result) => [result.providerId, result]));
  const rows = Object.entries(sourceStatus).map(([providerId, status]) => {
    const result = resultByProvider[providerId] || {};
    const state = providerState(status);
    const lastAttempt = status.lastAttemptedAt ? relativeTime(new Date(status.lastAttemptedAt).getTime()) : "not attempted";
    const lastSuccess = status.lastSuccessfulAt ? relativeTime(new Date(status.lastSuccessfulAt).getTime()) : "none";
    const mostRecent = status.mostRecentSourceEventAt ? relativeTime(new Date(status.mostRecentSourceEventAt).getTime()) : "none";
    const cacheAge = status.lastSuccessfulAt ? relativeTime(new Date(status.lastSuccessfulAt).getTime()) : "none";
    return `<article class="provider-row provider-${state}"><div><strong>${escapeHtml(providerId.toUpperCase())}</strong><span>${escapeHtml(state)}</span></div><dl><dt>Last attempt</dt><dd>${escapeHtml(lastAttempt)}</dd><dt>Last success</dt><dd>${escapeHtml(lastSuccess)}</dd><dt>Latest source event</dt><dd>${escapeHtml(mostRecent)}</dd><dt>Duration</dt><dd>${escapeHtml(status.durationMs ?? result.durationMs ?? "-")}ms</dd><dt>Received</dt><dd>${escapeHtml(result.recordCount ?? status.count ?? 0)}</dd><dt>Accepted</dt><dd>${escapeHtml(status.acceptedCount ?? status.count ?? 0)}</dd><dt>Rejected</dt><dd>${escapeHtml(status.rejectedCount ?? result.rejectedCount ?? 0)}</dd><dt>Duplicates</dt><dd>${escapeHtml(result.duplicateCount ?? status.duplicateCount ?? 0)}</dd><dt>Retry count</dt><dd>${escapeHtml(result.retryCount ?? 0)}</dd><dt>Cache</dt><dd>${status.stale ? `stale ${escapeHtml(cacheAge)}` : "fresh"}</dd></dl><p>${escapeHtml(status.message || "No provider message.")}</p>${status.url ? `<a href="${escapeHtml(status.url)}" target="_blank" rel="noopener noreferrer">Provider documentation</a>` : ""}<button type="button" data-provider-retry="${escapeHtml(providerId)}">Retry</button></article>`;
  });
  return `<div class="provider-health-panel"><div class="section-title"><span>Provider health details</span></div>${rows.join("") || '<p class="empty">No provider diagnostics yet.</p>'}</div>`;
}
