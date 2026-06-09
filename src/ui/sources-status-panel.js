import { domainOptions } from "../events/taxonomy.js";
import { providersForDomain, domainSourceStatus } from "../data/providers/source-registry.js";
import { escapeHtml, relativeTime } from "../events/event-normalizer.js";

function providerBuckets(providers, sourceStatus = {}) {
  return {
    live: providers.filter((provider) => provider.implemented && sourceStatus[provider.id]?.ok),
    planned: providers.filter((provider) => !provider.implemented && !provider.credentialRequired),
    credentials: providers.filter((provider) => !provider.implemented && provider.credentialRequired),
    degraded: providers.filter((provider) => provider.implemented && sourceStatus[provider.id] && !sourceStatus[provider.id].ok),
  };
}

function names(items) {
  return items.length ? items.map((item) => item.name).join(", ") : "None";
}

export function emptyDomainMessage(domainId, events, filtersActive, sourceStatus = {}) {
  if (events.some((event) => event.domain === domainId)) return "";
  const providers = providersForDomain(domainId);
  const buckets = providerBuckets(providers, sourceStatus);
  if (filtersActive) return "No matching events in the current filters.";
  if (buckets.degraded.length) return "Provider temporarily unavailable.";
  if (buckets.credentials.length && !buckets.live.length) return "Provider not configured.";
  if (buckets.planned.length && !buckets.live.length) return "Planned source.";
  return "No verified events in the current time window.";
}

export function renderSourcesStatusPanel(events, sourceStatus = {}) {
  return `<div class="section-title"><span>Sources by domain</span></div><div class="sources-status-list">${domainOptions().map((domain) => {
    const providers = providersForDomain(domain.id);
    const buckets = providerBuckets(providers, sourceStatus);
    const latest = providers
      .map((provider) => sourceStatus[provider.id]?.lastSuccessfulAt || sourceStatus[provider.id]?.mostRecentSourceEventAt)
      .filter(Boolean)
      .sort()
      .at(-1);
    const empty = emptyDomainMessage(domain.id, events, false, sourceStatus);
    const domainStatus = domainSourceStatus(domain.id);
    return `<details class="source-domain"><summary><span>${escapeHtml(domain.label)}</span><b>${escapeHtml(domainStatus.status)}</b></summary><p>${escapeHtml(empty || domainStatus.message)}</p><dl><dt>Live</dt><dd>${escapeHtml(names(buckets.live))}</dd><dt>Planned</dt><dd>${escapeHtml(names(buckets.planned))}</dd><dt>Needs credentials</dt><dd>${escapeHtml(names(buckets.credentials))}</dd><dt>Degraded</dt><dd>${escapeHtml(names(buckets.degraded))}</dd><dt>Latest success</dt><dd>${latest ? escapeHtml(relativeTime(latest)) : "None yet"}</dd><dt>Coverage</dt><dd>${escapeHtml(providers.map((provider) => provider.geographicCoverage).filter(Boolean).join(" "))}</dd></dl></details>`;
  }).join("")}</div>`;
}

