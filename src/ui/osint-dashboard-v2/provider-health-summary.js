import { escapeHtml, relativeTime } from "../../events/event-normalizer.js";
import { providerState } from "../provider-health-panel.js";

const STATE_LABELS = {
  operational: "Live",
  stale: "Stale",
  degraded: "Degraded",
  unavailable: "Offline",
  "rate-limited": "Rate limited",
  "configuration-required": "Config required",
  disabled: "Disabled",
  "authentication-required": "Auth required",
};

export function renderProviderHealthSummary(sourceStatus = {}, providerResults = []) {
  const entries = Object.entries(sourceStatus);
  if (!entries.length) {
    return `<section class="v2-provider-health" aria-label="Provider health"><div class="v2-section-title"><span>Provider health</span></div><p class="v2-empty">No provider diagnostics yet. Waiting for first feed refresh.</p></section>`;
  }
  const resultByProvider = Object.fromEntries(providerResults.map((result) => [result.providerId, result]));
  const rows = entries
    .map(([providerId, status]) => {
      const state = providerState(status);
      const result = resultByProvider[providerId] || {};
      const count = status.acceptedCount ?? status.count ?? result.recordCount ?? 0;
      const lastSuccess = status.lastSuccessfulAt ? relativeTime(new Date(status.lastSuccessfulAt).getTime()) : "none";
      const warn = state === "stale" || state === "unavailable" || state === "degraded";
      return `<li class="v2-provider-row v2-provider-${state} ${warn ? "v2-provider-warn" : ""}"><div class="v2-provider-head"><strong>${escapeHtml(providerId)}</strong><span class="v2-provider-badge">${escapeHtml(STATE_LABELS[state] || state)}</span></div><div class="v2-provider-meta"><span>${count} events</span><span>Updated ${escapeHtml(lastSuccess)}</span></div>${status.message ? `<p class="v2-provider-msg">${escapeHtml(status.message)}</p>` : ""}</li>`;
    })
    .sort((a, b) => {
      const aWarn = a.includes("v2-provider-warn") ? 0 : 1;
      const bWarn = b.includes("v2-provider-warn") ? 0 : 1;
      return aWarn - bWarn;
    });
  const warnCount = entries.filter(([, status]) => ["stale", "unavailable", "degraded", "rate-limited"].includes(providerState(status))).length;
  const warnBanner = warnCount
    ? `<p class="v2-provider-alert" role="status">${warnCount} provider${warnCount === 1 ? "" : "s"} need attention — data may be incomplete.</p>`
    : "";
  return `<section class="v2-provider-health" aria-label="Provider health"><div class="v2-section-title"><span>Provider health</span><small>${entries.length} sources</small></div>${warnBanner}<ul class="v2-provider-list">${rows.join("")}</ul></section>`;
}