import { sourceLink } from "./sources/source-url.js";
import { escapeHtml, relativeTime } from "./events/event-normalizer.js";

const els = {
  status: document.getElementById("diagnosticsStatus"),
  refresh: document.getElementById("diagnosticsRefresh"),
  summary: document.getElementById("diagnosticsSummary"),
  list: document.getElementById("diagnosticsList"),
};

function fmtTime(value) {
  return value ? `${relativeTime(new Date(value).getTime())} (${new Date(value).toLocaleString()})` : "none";
}

// Every provider lands in one honest group. Only a healthy, current provider reads as working.
const GROUPS = [
  { id: "down", title: "Failing", note: "These sources were tried and did not return usable data." },
  { id: "warn", title: "Delayed or partial", note: "These sources responded, but the data may be old or incomplete." },
  { id: "ok", title: "Reporting", note: "These sources returned usable data on the last attempt." },
  { id: "setup", title: "Waiting for setup", note: "These sources need a key or configuration before they can report." },
  { id: "off", title: "Switched off", note: "These sources are intentionally turned off." },
];

function providerState(provider) {
  const status = provider.implementationStatus;
  if (status === "configuration-required") return "setup";
  if (status === "disabled") return "off";
  if (!provider.ok) return "down";
  return provider.stale || !["healthy", "live", "operational"].includes(status) ? "warn" : "ok";
}

function statusWord(provider) {
  return String(provider.implementationStatus || "unknown").replace(/-/g, " ").replace(/^\w/, (char) => char.toUpperCase()) + (provider.stale ? ", stale" : "");
}

function providerCard(provider) {
  const budget = provider.requestBudget ? `${provider.requestBudget.remainingRequests ?? "?"}/${provider.requestBudget.limit ?? "?"} ${provider.requestBudget.status || ""}` : "not tracked";
  const state = providerState(provider);
  const fact = (label, value) => `<div><dt>${label}</dt><dd>${value}</dd></div>`;
  const lastSuccess = provider.lastSuccessfulAt ? `Last success ${relativeTime(new Date(provider.lastSuccessfulAt).getTime())}, ${provider.acceptedCount ?? 0} records accepted.` : "No successful retrieval recorded.";
  const headline = provider.sanitizedError && provider.sanitizedError !== "Live" ? provider.sanitizedError : lastSuccess;
  return `<article class="provider-row diagnostics-provider provider-${provider.ok ? "operational" : "unavailable"}">
    <div><strong>${escapeHtml(provider.name)}</strong></div>
    <div><span class="chart-state" data-state="${state}">${escapeHtml(statusWord(provider))}</span></div>
    <p>${escapeHtml(headline)}</p>
    <details><summary>Technical details</summary>
    <dl>
      ${fact("Provider", escapeHtml(provider.providerId))}
      ${fact("Last attempt", escapeHtml(fmtTime(provider.lastAttemptedAt)))}
      ${fact("Last success", escapeHtml(fmtTime(provider.lastSuccessfulAt)))}
      ${fact("Duration", `${escapeHtml(provider.durationMs)}ms`)}
      ${fact("Received", escapeHtml(provider.receivedCount))}
      ${fact("Accepted", escapeHtml(provider.acceptedCount))}
      ${fact("Rejected", escapeHtml(provider.rejectedCount))}
      ${fact("Duplicates", escapeHtml(provider.duplicateCount))}
      ${fact("Clustered", escapeHtml(provider.clusteredCount))}
      ${fact("Promoted", escapeHtml(provider.promotedCount))}
      ${fact("Budget", escapeHtml(budget))}
      ${fact("Retry", escapeHtml(provider.retryState))}
      ${fact("Cache", `${escapeHtml(provider.cacheMode)}${provider.stale ? " stale" : ""}`)}
      ${fact("Next refresh", escapeHtml(fmtTime(provider.nextRefreshAt)))}
      ${fact("Circuit breaker", escapeHtml(provider.circuitBreakerState))}
      ${fact("Adapter", escapeHtml(provider.adapterVersion))}
    </dl>
    ${sourceLink(provider.sourceRegistryUrl, "Source registry link")}
    </details>
  </article>`;
}

async function loadDiagnostics() {
  els.status.innerHTML = "<strong>Loading diagnostics…</strong>";
  els.status.dataset.tone = "";
  if (!els.list.children.length) els.list.innerHTML = '<div class="chart-loading" role="status" aria-label="Loading diagnostics"><span></span><span></span><span></span></div>';
  els.refresh.disabled = true;
  try {
    const response = await fetch(`/api/provider-health?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    const providers = body.data?.providers || [];
    const count = (id) => providers.filter((provider) => providerState(provider) === id).length;
    const available = count("ok");
    els.status.innerHTML = `<strong>Checked ${escapeHtml(relativeTime(body.generatedAt))}</strong><span>System status: ${escapeHtml(String(body.data?.systemStatus || "unknown").replace(/-/g, " "))}</span>`;
    els.summary.innerHTML = `<div class="health-summary"><strong>${available} of ${providers.length} sources reporting</strong><span>${count("down")} failing, ${count("warn")} delayed or partial, ${count("setup")} waiting for setup, ${count("off")} switched off</span></div>`;
    els.list.innerHTML = GROUPS.map((group) => {
      const rows = providers.filter((provider) => providerState(provider) === group.id);
      return rows.length ? `<section class="health-group"><h2>${group.title} (${rows.length})</h2><p>${group.note}</p><div class="health-rows">${rows.map(providerCard).join("")}</div></section>` : "";
    }).join("") || '<div class="chart-message"><strong>No sources reported</strong><p>The diagnostics service answered but listed no sources.</p></div>';
  } catch (error) {
    els.status.innerHTML = `<strong>Diagnostics unavailable</strong><span>${escapeHtml(error.message)}</span>`;
    els.status.dataset.tone = "error";
    els.summary.innerHTML = "";
    els.list.innerHTML = `<div class="chart-message" data-tone="error"><strong>Source status could not be loaded</strong><p>The diagnostics service did not respond (${escapeHtml(error.message)}). This says nothing about whether the sources themselves are working.</p><button type="button" data-chart-retry>Try again</button></div>`;
  } finally {
    els.refresh.disabled = false;
  }
}

els.refresh.addEventListener("click", loadDiagnostics);
els.list.addEventListener("click", (event) => {
  if (event.target.closest("[data-chart-retry]")) loadDiagnostics();
});
loadDiagnostics();
