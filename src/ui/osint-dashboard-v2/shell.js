import { renderEventSummaryCards } from "./summary-cards.js";
import { renderProviderHealthSummary } from "./provider-health-summary.js";
import { renderEventFilterSummary } from "./event-filter-summary.js";
import { renderEventDetailDrawer } from "./event-detail-drawer.js";

export function renderOsintDashboardShell(container, context = {}) {
  if (!container) return;
  const {
    events = [],
    sourceStatus = {},
    providerResults = [],
    filters = {},
    hours = 168,
    lastLoaded = null,
    systemStatus = "unknown",
    selectedEvent = null,
    loading = false,
    error = null,
  } = context;

  if (loading) {
    container.innerHTML = `<div class="v2-shell v2-shell-loading" role="status"><p>Loading dashboard…</p></div>`;
    return;
  }

  if (error && !events.length) {
    container.innerHTML = `<div class="v2-shell v2-shell-error" role="alert"><p>${error}</p></div>`;
    return;
  }

  container.innerHTML = `<div class="v2-shell">
    ${renderEventSummaryCards({ events, sourceStatus, lastLoaded, systemStatus })}
    ${renderEventFilterSummary(filters, hours)}
    ${renderProviderHealthSummary(sourceStatus, providerResults)}
  </div>`;
}

export function renderOsintEventDetailDrawer(container, event) {
  if (!container) return;
  container.innerHTML = renderEventDetailDrawer(event);
  container.hidden = !event;
  container.classList.toggle("open", Boolean(event));
}

export { renderEventSummaryCards, computeSourceMetrics } from "./summary-cards.js";
export { renderProviderHealthSummary } from "./provider-health-summary.js";
export { renderEventFilterSummary, buildActiveFilterChips } from "./event-filter-summary.js";
export { renderEventDetailDrawer } from "./event-detail-drawer.js";