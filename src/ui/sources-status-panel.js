import { domainOptions } from "../events/taxonomy.js";
import { providersForDomain, domainSourceStatus } from "../data/providers/source-registry.js";
import { escapeHtml, relativeTime } from "../events/event-normalizer.js";
import { MASTER_SOURCE_REGISTRY, filterSources } from "../sources/master-source-registry.js";

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
  const sourceRecords = filterSources(MASTER_SOURCE_REGISTRY, { domain: domainId });
  const implemented = sourceRecords.filter((source) => source.implemented);
  const credentialed = sourceRecords.filter((source) => source.credentialRequired || source.status === "authentication-required");
  const planned = sourceRecords.filter((source) => source.status === "planned");
  if (filtersActive) return "Filtered out by current settings.";
  if (buckets.degraded.length) return "Provider temporarily unavailable.";
  if (!implemented.length && credentialed.length) return "Provider requires credentials.";
  if (!implemented.length && planned.length) return "Provider is planned.";
  if (!implemented.length) return "No provider implemented.";
  return "No verified events in the current time window.";
}

export function renderSourcesStatusPanel(events, sourceStatus = {}) {
  return `<div class="section-title"><span>Sources by domain</span></div><div class="sources-status-list">${domainOptions().map((domain) => {
    const providers = providersForDomain(domain.id);
    const buckets = providerBuckets(providers, sourceStatus);
    const sourceRecords = filterSources(MASTER_SOURCE_REGISTRY, { domain: domain.id });
    const sourceBuckets = {
      live: sourceRecords.filter((source) => source.status === "live"),
      planned: sourceRecords.filter((source) => source.status === "planned"),
      credentials: sourceRecords.filter((source) => source.credentialRequired || source.status === "authentication-required"),
      licensed: sourceRecords.filter((source) => source.accessMode === "commercial-license" || source.status === "license-required"),
      linkOnly: sourceRecords.filter((source) => source.status === "link-only"),
    };
    const latest = providers
      .map((provider) => sourceStatus[provider.id]?.lastSuccessfulAt || sourceStatus[provider.id]?.mostRecentSourceEventAt)
      .filter(Boolean)
      .sort()
      .at(-1);
    const empty = emptyDomainMessage(domain.id, events, false, sourceStatus);
    const domainStatus = domainSourceStatus(domain.id);
    const coverage = providers.map((provider) => provider.geographicCoverage).filter(Boolean).join(" ") || sourceRecords.map((source) => source.coverage || source.knownLimitations?.[0]).filter(Boolean).slice(0, 2).join(" ");
    return `<details class="source-domain"><summary><span>${escapeHtml(domain.label)}</span><b>${escapeHtml(domainStatus.status)}</b></summary><p>${escapeHtml(empty || domainStatus.message)}</p><dl><dt>Working providers</dt><dd>${escapeHtml(names(buckets.live))}</dd><dt>Planned providers</dt><dd>${escapeHtml(sourceBuckets.planned.length ? sourceBuckets.planned.map((source) => source.name).slice(0, 4).join(", ") : "None")}</dd><dt>Credentials required</dt><dd>${escapeHtml(sourceBuckets.credentials.length ? sourceBuckets.credentials.map((source) => source.name).slice(0, 4).join(", ") : "None")}</dd><dt>Licensed</dt><dd>${escapeHtml(sourceBuckets.licensed.length ? sourceBuckets.licensed.map((source) => source.name).slice(0, 4).join(", ") : "None")}</dd><dt>Link-only</dt><dd>${escapeHtml(sourceBuckets.linkOnly.length ? sourceBuckets.linkOnly.map((source) => source.name).slice(0, 4).join(", ") : "None")}</dd><dt>Last provider success</dt><dd>${latest ? escapeHtml(relativeTime(latest)) : "None yet"}</dd><dt>Coverage limitations</dt><dd>${escapeHtml(coverage || "No coverage statement registered.")}</dd></dl><a class="mini-source-link" href="/sources?domain=${encodeURIComponent(domain.id)}">Open sources</a></details>`;
  }).join("")}</div>`;
}

