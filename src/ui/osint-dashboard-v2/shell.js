import { renderEventSummaryCards } from "./summary-cards.js";
import { renderProviderHealthSummary } from "./provider-health-summary.js";
import { renderEventFilterSummary } from "./event-filter-summary.js";
import { renderEventDetailDrawer, renderClusterDetailDrawer } from "./event-detail-drawer.js";
import { renderTimelinePanel } from "./timeline-panel.js";
import { renderClusterSummary } from "./cluster-summary.js";
import { renderChangeAwarenessPanel } from "./change-awareness-panel.js";
import { renderOperatorCommandBar } from "./operator-command-bar.js";
import { renderLegendPanel } from "./legend-panel.js";

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
    selectedClusterId = null,
    selectedCluster = null,
    changeSummary = null,
    changeStatusById = null,
    loading = false,
    error = null,
  } = context;

  if (loading) {
    container.innerHTML = `<div class="v2-shell v2-shell-loading" role="status">
      ${renderOperatorCommandBar({ events: [], filters, hours, lastLoaded, systemStatus, sourceStatus, providerResults, changeSummary, loading: true })}
      <p class="v2-empty">Loading dashboard… provider responses still arriving.</p>
    </div>`;
    return;
  }

  if (error && !events.length) {
    container.innerHTML = `<div class="v2-shell v2-shell-error" role="alert">
      ${renderOperatorCommandBar({ events: [], filters, hours, lastLoaded, systemStatus, sourceStatus, providerResults, changeSummary, error })}
      <p>${error}</p>
      <p class="v2-empty">Clear filters if applied, then refresh. Cached events may still appear in the feed when available.</p>
    </div>`;
    return;
  }

  const selectionBanner = selectedCluster
    ? `<div class="v2-selection-banner" role="status"><span>Cluster selected on map — ${selectedCluster.eventCount} related events</span><button type="button" class="v2-text-btn" data-v2-clear-selection>Clear</button></div>`
    : selectedClusterId
      ? `<div class="v2-selection-banner v2-selection-banner-stale" role="status"><span>Previous cluster no longer in view — clear selection or adjust filters</span><button type="button" class="v2-text-btn" data-v2-clear-selection>Clear</button></div>`
      : "";

  const emptyFocus = !events.length
    ? `<div class="v2-empty-focus" role="status"><p class="v2-empty"><strong>No events in this focus.</strong> Filters or the time window may be hiding everything. Clear filters, widen the hours window, or check provider health below.</p></div>`
    : "";

  container.innerHTML = `<div class="v2-shell">
    ${selectionBanner}
    ${renderOperatorCommandBar({ events, filters, hours, lastLoaded, systemStatus, sourceStatus, providerResults, changeSummary, loading, error })}
    ${renderEventSummaryCards({ events, sourceStatus, lastLoaded, systemStatus })}
    ${renderLegendPanel()}
    ${emptyFocus}
    ${renderChangeAwarenessPanel(changeSummary)}
    ${renderTimelinePanel(events, lastLoaded || Date.now(), changeStatusById)}
    ${renderClusterSummary(events, selectedClusterId)}
    ${renderEventFilterSummary(filters, hours)}
    ${renderProviderHealthSummary(sourceStatus, providerResults)}
  </div>`;
}

export function renderOsintEventDetailDrawer(container, {
  event = null,
  cluster = null,
  changeStatus = null,
  allEvents = [],
  clusters = [],
} = {}) {
  if (!container) return;
  const active = Boolean(event || cluster);
  container.innerHTML = cluster
    ? renderClusterDetailDrawer(cluster, { allEvents })
    : renderEventDetailDrawer(event, { changeStatus, allEvents, clusters });
  container.hidden = !active;
  container.classList.toggle("open", active);
}

export { renderEventSummaryCards, computeSourceMetrics } from "./summary-cards.js";
export { renderProviderHealthSummary } from "./provider-health-summary.js";
export { renderEventFilterSummary, buildActiveFilterChips } from "./event-filter-summary.js";
export { renderEventDetailDrawer, renderClusterDetailDrawer } from "./event-detail-drawer.js";
export { renderTimelinePanel } from "./timeline-panel.js";
export { renderClusterSummary } from "./cluster-summary.js";
