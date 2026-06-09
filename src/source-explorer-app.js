import { DOMAIN_LABELS, IMPLEMENTATION_STATUSES, MASTER_SOURCE_REGISTRY, SOURCE_ACCESS_CLASSIFICATIONS, SOURCE_QUALITY_TIERS, filterSources, sourceById, sourceRegistryStats } from "./sources/master-source-registry.js";
import { escapeHtml } from "./events/event-normalizer.js";

const els = {
  search: document.getElementById("sourceSearch"),
  domain: document.getElementById("domainFilter"),
  access: document.getElementById("accessFilter"),
  status: document.getElementById("statusFilter"),
  tier: document.getElementById("tierFilter"),
  official: document.getElementById("officialFilter"),
  implemented: document.getElementById("implementedFilter"),
  summary: document.getElementById("sourceSummary"),
  list: document.getElementById("sourceList"),
  detail: document.getElementById("sourceDetail"),
};

function title(text) {
  return String(text || "").replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function optionList(select, values, labels = {}) {
  select.innerHTML = `<option value="">Any</option>${values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(labels[value] || title(value))}</option>`).join("")}`;
}

function readFilters() {
  return {
    q: els.search.value.trim(),
    domain: els.domain.value,
    accessMode: els.access.value,
    status: els.status.value,
    sourceTier: els.tier.value,
    official: els.official.value,
    implemented: els.implemented.value,
  };
}

function syncUrl(filters, selectedId) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  if (selectedId) params.set("source", selectedId);
  const query = params.toString();
  history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}`);
}

function readUrl() {
  const params = new URLSearchParams(location.search);
  els.search.value = params.get("q") || "";
  els.domain.value = params.get("domain") || "";
  els.access.value = params.get("accessMode") || "";
  els.status.value = params.get("status") || "";
  els.tier.value = params.get("sourceTier") || "";
  els.official.value = params.get("official") || "";
  els.implemented.value = params.get("implemented") || "";
  return params.get("source") || "";
}

function badge(value, className = "") {
  return `<span class="source-badge ${className}">${escapeHtml(title(value))}</span>`;
}

function sourceCard(sourceRecord, selectedId) {
  return `<article class="source-card ${sourceRecord.id === selectedId ? "active" : ""}" data-source-id="${escapeHtml(sourceRecord.id)}">
    <div class="source-card-head">
      <h2>${escapeHtml(sourceRecord.name)}</h2>
      ${badge(sourceRecord.status, sourceRecord.status)}
    </div>
    <p>${escapeHtml(sourceRecord.description)}</p>
    <div class="source-card-meta">
      ${badge(DOMAIN_LABELS[sourceRecord.domain] || sourceRecord.domain)}
      ${badge(sourceRecord.accessMode)}
      ${badge(sourceRecord.sourceTier.replace("tier-", "tier "))}
    </div>
  </article>`;
}

function renderSummary(filtered) {
  const stats = sourceRegistryStats(MASTER_SOURCE_REGISTRY);
  const openCount = stats.openOrPublic;
  els.summary.innerHTML = `
    <article><span>Registered</span><strong>${stats.total}</strong></article>
    <article><span>Showing</span><strong>${filtered.length}</strong></article>
    <article><span>Open or public</span><strong>${openCount}</strong></article>
    <article><span>Live now</span><strong>${stats.live}</strong></article>
    <article><span>Need review</span><strong>${stats.legalReviewRequired}</strong></article>
  `;
}

function row(label, value) {
  if (Array.isArray(value)) value = value.length ? value.join(", ") : "None";
  return `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || "Not set")}</dd>`;
}

function renderDetail(sourceRecord) {
  if (!sourceRecord) {
    els.detail.innerHTML = '<div class="empty">Select a source to inspect access, licensing, freshness, and implementation status.</div>';
    return;
  }
  els.detail.innerHTML = `
    <div class="source-detail-head">
      <span class="eyebrow">${escapeHtml(DOMAIN_LABELS[sourceRecord.domain] || sourceRecord.domain)}</span>
      <h2>${escapeHtml(sourceRecord.name)}</h2>
      <p>${escapeHtml(sourceRecord.description)}</p>
      <div class="source-card-meta">${badge(sourceRecord.status, sourceRecord.status)}${badge(sourceRecord.accessMode)}${badge(sourceRecord.verificationState)}</div>
    </div>
    <dl class="source-detail-grid">
      ${row("Best use", sourceRecord.bestUse)}
      ${row("Category", sourceRecord.category)}
      ${row("Source tier", sourceRecord.sourceTier)}
      ${row("Official", sourceRecord.official ? "Yes" : "No")}
      ${row("API / RSS / bulk", [sourceRecord.apiAvailable ? "API" : "", sourceRecord.rssAvailable ? "RSS" : "", sourceRecord.bulkDataAvailable ? "Bulk" : ""].filter(Boolean))}
      ${row("Credentials", sourceRecord.environmentVariables)}
      ${row("Commercial use", sourceRecord.commercialUse)}
      ${row("Redistribution", sourceRecord.redistribution)}
      ${row("Caching", sourceRecord.caching)}
      ${row("Retention", sourceRecord.retention)}
      ${row("Refresh", sourceRecord.refreshGuidance)}
      ${row("Rate limit", sourceRecord.rateLimitGuidance)}
      ${row("Last terms review", sourceRecord.lastTermsReview)}
      ${row("Technical verification", sourceRecord.lastTechnicalVerification)}
      ${row("Limitations", sourceRecord.knownLimitations)}
    </dl>
    <div class="source-actions">
      <a href="${escapeHtml(sourceRecord.sourceUrl)}" target="_blank" rel="noopener noreferrer">Source</a>
      <a href="${escapeHtml(sourceRecord.docsUrl || sourceRecord.sourceUrl)}" target="_blank" rel="noopener noreferrer">Docs</a>
      <a href="${escapeHtml(sourceRecord.termsUrl || sourceRecord.sourceUrl)}" target="_blank" rel="noopener noreferrer">Terms</a>
    </div>
  `;
}

function render(selectedId = "") {
  const filters = readFilters();
  const filtered = filterSources(MASTER_SOURCE_REGISTRY, filters);
  const selected = sourceById(selectedId, filtered) || filtered[0] || null;
  renderSummary(filtered);
  els.list.innerHTML = filtered.length ? filtered.map((sourceRecord) => sourceCard(sourceRecord, selected?.id)).join("") : '<div class="empty">No sources match the current filters.</div>';
  renderDetail(selected);
  syncUrl(filters, selected?.id);
}

optionList(els.domain, Object.keys(DOMAIN_LABELS), DOMAIN_LABELS);
optionList(els.access, SOURCE_ACCESS_CLASSIFICATIONS);
optionList(els.status, IMPLEMENTATION_STATUSES);
optionList(els.tier, SOURCE_QUALITY_TIERS);

let initialSelected = readUrl();
render(initialSelected);

document.addEventListener("input", (event) => {
  if (event.target.closest(".source-controls")) render();
});

document.addEventListener("change", (event) => {
  if (event.target.closest(".source-controls")) render();
});

document.addEventListener("click", (event) => {
  const card = event.target.closest("[data-source-id]");
  if (!card) return;
  render(card.dataset.sourceId);
});
