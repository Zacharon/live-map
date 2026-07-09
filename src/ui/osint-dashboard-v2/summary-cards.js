import { escapeHtml, relativeTime } from "../../events/event-normalizer.js";
import { providerState } from "../provider-health-panel.js";

export function computeSourceMetrics(sourceStatus = {}) {
  const entries = Object.entries(sourceStatus);
  let active = 0;
  let degraded = 0;
  let offline = 0;
  for (const [, status] of entries) {
    const state = providerState(status);
    if (state === "operational") active += 1;
    else if (state === "stale" || state === "degraded" || state === "rate-limited") degraded += 1;
    else if (state !== "disabled" && state !== "configuration-required") offline += 1;
  }
  return { total: entries.length, active, degraded, offline };
}

export function renderEventSummaryCards({ events = [], sourceStatus = {}, lastLoaded = null, systemStatus = "unknown" } = {}) {
  const metrics = computeSourceMetrics(sourceStatus);
  const highCount = events.filter((event) => ["critical", "high"].includes(event.severity)).length;
  const lastLabel = lastLoaded ? relativeTime(lastLoaded) : "—";
  const statusClass = systemStatus === "partial-data" || systemStatus === "partial" ? "warn" : systemStatus === "no-current-provider-data" ? "error" : "";
  return `<div class="v2-summary-cards" role="region" aria-label="Dashboard summary">
    <article class="v2-card"><span class="v2-card-label">Visible events</span><strong class="v2-card-value">${events.length}</strong><small>${highCount} high/critical</small></article>
    <article class="v2-card"><span class="v2-card-label">Active sources</span><strong class="v2-card-value">${metrics.active}</strong><small>of ${metrics.total} providers</small></article>
    <article class="v2-card ${metrics.degraded || metrics.offline ? "v2-card-warn" : ""}"><span class="v2-card-label">Degraded / offline</span><strong class="v2-card-value">${metrics.degraded + metrics.offline}</strong><small>${metrics.degraded} degraded, ${metrics.offline} offline</small></article>
    <article class="v2-card ${statusClass}"><span class="v2-card-label">Last updated</span><strong class="v2-card-value v2-card-time">${escapeHtml(lastLabel)}</strong><small>${escapeHtml(systemStatus)}</small></article>
  </div>`;
}