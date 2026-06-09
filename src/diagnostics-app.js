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

function providerCard(provider) {
  const budget = provider.requestBudget ? `${provider.requestBudget.remainingRequests ?? "?"}/${provider.requestBudget.limit ?? "?"} ${provider.requestBudget.status || ""}` : "not tracked";
  return `<article class="provider-row diagnostics-provider provider-${provider.ok ? "operational" : "unavailable"}">
    <div><strong>${escapeHtml(provider.name)}</strong><span>${escapeHtml(provider.implementationStatus)}</span></div>
    <dl>
      <dt>Provider</dt><dd>${escapeHtml(provider.providerId)}</dd>
      <dt>Last attempt</dt><dd>${escapeHtml(fmtTime(provider.lastAttemptedAt))}</dd>
      <dt>Last success</dt><dd>${escapeHtml(fmtTime(provider.lastSuccessfulAt))}</dd>
      <dt>Duration</dt><dd>${escapeHtml(provider.durationMs)}ms</dd>
      <dt>Received</dt><dd>${escapeHtml(provider.receivedCount)}</dd>
      <dt>Accepted</dt><dd>${escapeHtml(provider.acceptedCount)}</dd>
      <dt>Rejected</dt><dd>${escapeHtml(provider.rejectedCount)}</dd>
      <dt>Duplicates</dt><dd>${escapeHtml(provider.duplicateCount)}</dd>
      <dt>Clustered</dt><dd>${escapeHtml(provider.clusteredCount)}</dd>
      <dt>Promoted</dt><dd>${escapeHtml(provider.promotedCount)}</dd>
      <dt>Budget</dt><dd>${escapeHtml(budget)}</dd>
      <dt>Retry</dt><dd>${escapeHtml(provider.retryState)}</dd>
      <dt>Cache</dt><dd>${escapeHtml(provider.cacheMode)}${provider.stale ? " stale" : ""}</dd>
      <dt>Next refresh</dt><dd>${escapeHtml(fmtTime(provider.nextRefreshAt))}</dd>
      <dt>Circuit breaker</dt><dd>${escapeHtml(provider.circuitBreakerState)}</dd>
      <dt>Adapter</dt><dd>${escapeHtml(provider.adapterVersion)}</dd>
    </dl>
    <p>${escapeHtml(provider.sanitizedError || "No sanitized provider error.")}</p>
    ${provider.sourceRegistryUrl ? `<a href="${escapeHtml(provider.sourceRegistryUrl)}" target="_blank" rel="noopener noreferrer">Source registry link</a>` : ""}
  </article>`;
}

async function loadDiagnostics() {
  els.status.innerHTML = "<strong>Loading diagnostics...</strong>";
  els.refresh.disabled = true;
  try {
    const response = await fetch(`/api/provider-health?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    const providers = body.data?.providers || [];
    const available = providers.filter((provider) => provider.ok).length;
    els.status.innerHTML = `<strong>Diagnostics loaded</strong>`;
    els.summary.innerHTML = `<article><strong>${escapeHtml(body.data?.systemStatus || "unknown")}</strong><span>${available} of ${providers.length} providers available</span><span>Generated ${escapeHtml(relativeTime(body.generatedAt))}</span></article>`;
    els.list.innerHTML = providers.map(providerCard).join("") || '<p class="empty">No provider diagnostics returned.</p>';
  } catch (error) {
    els.status.innerHTML = `<strong>Diagnostics unavailable</strong><span>${escapeHtml(error.message)}</span>`;
    els.list.innerHTML = '<p class="empty">Provider diagnostics could not be loaded.</p>';
  } finally {
    els.refresh.disabled = false;
  }
}

els.refresh.addEventListener("click", loadDiagnostics);
loadDiagnostics();
