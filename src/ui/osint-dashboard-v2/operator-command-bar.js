import { escapeHtml, relativeTime } from "../../events/event-normalizer.js";

function countBySeverity(events, keys) {
  return events.filter((e) => keys.includes(String(e?.severity || "").toLowerCase())).length;
}

function degradedProviderCount(sourceStatus = {}, providerResults = []) {
  const states = new Set();
  for (const value of Object.values(sourceStatus || {})) {
    const s = String(value?.state || value?.status || value || "").toLowerCase();
    if (s && s !== "ok" && s !== "operational" && s !== "healthy") states.add(s);
  }
  for (const row of providerResults || []) {
    const s = String(row?.state || row?.status || "").toLowerCase();
    if (s && !["ok", "operational", "healthy", "success"].includes(s)) states.add(row?.id || s);
  }
  // Prefer counting degraded rows from providerResults when present
  if (Array.isArray(providerResults) && providerResults.length) {
    return providerResults.filter((row) => {
      const s = String(row?.state || row?.status || "").toLowerCase();
      return s && !["ok", "operational", "healthy", "success"].includes(s);
    }).length;
  }
  return states.size;
}

function freshnessCopy(lastLoaded, systemStatus) {
  if (!lastLoaded) {
    if (systemStatus === "loading") return "Waiting for first successful load…";
    return "Last updated: unknown";
  }
  const age = Date.now() - Number(lastLoaded);
  const rel = relativeTime(lastLoaded);
  if (systemStatus === "partial" || systemStatus === "degraded") {
    return `Last updated ${rel} · data may be partial/stale`;
  }
  if (Number.isFinite(age) && age > 15 * 60 * 1000) {
    return `Last updated ${rel} · consider refresh (aging)`;
  }
  return `Last updated ${rel}`;
}

function filterSummaryLine(filters = {}, hours = 168) {
  const parts = [];
  if (filters.domains?.size) parts.push(`${filters.domains.size} domain filter(s)`);
  if (filters.categories?.size) parts.push(`${filters.categories.size} category filter(s)`);
  if (filters.severities?.size) parts.push(`${filters.severities.size} severity filter(s)`);
  if (filters.sources?.size) parts.push(`${filters.sources.size} source filter(s)`);
  if (filters.countries?.size) parts.push(`${filters.countries.size} country filter(s)`);
  if (filters.query) parts.push(`search “${String(filters.query).slice(0, 24)}”`);
  const hourLabel = hours <= 1 ? "1h" : hours <= 6 ? "6h" : hours <= 24 ? "24h" : hours <= 168 ? "7d" : `${hours}h`;
  parts.push(`window ${hourLabel}`);
  return parts.join(" · ") || `All categories · last ${hourLabel}`;
}

/**
 * Compact operator mission / command summary for Dashboard v2.
 */
export function renderOperatorCommandBar({
  events = [],
  filters = {},
  hours = 168,
  lastLoaded = null,
  systemStatus = "unknown",
  sourceStatus = {},
  providerResults = [],
  changeSummary = null,
  loading = false,
  error = null,
} = {}) {
  if (loading) {
    return `<section class="v2-command-bar v2-command-bar-loading" aria-label="Operator summary" role="status">
      <div class="v2-section-title"><span>Operator view</span><small>Loading…</small></div>
      <p class="v2-empty">Loading dashboard data. Map and panels will populate when events arrive.</p>
    </section>`;
  }

  if (error && !events.length) {
    return `<section class="v2-command-bar v2-command-bar-error" aria-label="Operator summary" role="alert">
      <div class="v2-section-title"><span>Operator view</span><small>Error</small></div>
      <p class="v2-empty">${escapeHtml(error)}</p>
      <p class="v2-empty">If a cache is available, try refresh. Provider failures are not the same as “no world events.”</p>
    </section>`;
  }

  const total = events.length;
  const high = countBySeverity(events, ["high", "critical"]);
  const critical = countBySeverity(events, ["critical"]);
  const newCount = changeSummary?.hasPreviousSnapshot ? (changeSummary.newEvents?.length || 0) : null;
  const updatedCount = changeSummary?.hasPreviousSnapshot ? (changeSummary.updatedEvents?.length || 0) : null;
  const degraded = degradedProviderCount(sourceStatus, providerResults);
  const filterLine = filterSummaryLine(filters, hours);
  const fresh = freshnessCopy(lastLoaded, systemStatus);

  let situation;
  if (!total) {
    situation = "No events match the current filters/time window. Clear filters or widen the window to broaden triage.";
  } else if (critical > 0) {
    situation = `${critical} critical-severity event${critical === 1 ? "" : "s"} in view — inspect first.`;
  } else if (high > 0) {
    situation = `${high} high/critical-severity event${high === 1 ? "" : "s"} in view.`;
  } else {
    situation = `${total} event${total === 1 ? "" : "s"} in view — no high/critical severity under current filters.`;
  }

  const changeBits = [];
  if (newCount != null) changeBits.push(`${newCount} new`);
  if (updatedCount != null) changeBits.push(`${updatedCount} updated`);
  const changeLine = changeBits.length
    ? changeBits.join(" · ") + " since last mark-as-seen"
    : "No visit baseline yet — use Mark seen after review";

  return `<section class="v2-command-bar" aria-label="Operator summary">
    <div class="v2-section-title">
      <span>Operator view</span>
      <small>${escapeHtml(fresh)}</small>
    </div>
    <p class="v2-command-situation">${escapeHtml(situation)}</p>
    <div class="v2-command-stats">
      <div class="v2-command-stat"><span class="v2-command-stat-value">${total}</span><span class="v2-command-stat-label">Visible</span></div>
      <div class="v2-command-stat${high ? " v2-command-stat-hot" : ""}"><span class="v2-command-stat-value">${high}</span><span class="v2-command-stat-label">High+</span></div>
      <div class="v2-command-stat"><span class="v2-command-stat-value">${newCount ?? "—"}</span><span class="v2-command-stat-label">New</span></div>
      <div class="v2-command-stat${degraded ? " v2-command-stat-warn" : ""}"><span class="v2-command-stat-value">${degraded}</span><span class="v2-command-stat-label">Degraded</span></div>
    </div>
    <p class="v2-command-meta"><strong>Focus:</strong> ${escapeHtml(filterLine)}</p>
    <p class="v2-command-meta"><strong>Change:</strong> ${escapeHtml(changeLine)}</p>
    <p class="v2-empty v2-command-hint">Triage → inspect drawer → check connections → export artifact → mark seen.</p>
  </section>`;
}
