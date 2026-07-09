import { DOMAIN_LABELS, IMPLEMENTATION_STATUSES, MASTER_SOURCE_REGISTRY, SOURCE_ACCESS_CLASSIFICATIONS, SOURCE_DOMAINS, SOURCE_QUALITY_TIERS, filterSources, sourceById, sourceRegistryStats } from "./sources/master-source-registry.js";
import { escapeHtml, relativeTime } from "./events/event-normalizer.js";
import { allowedParam, safeSearchParams, textParam, tokenParam } from "./url-params.js";

const els = {
  search: document.getElementById("sourceSearch"),
  domain: document.getElementById("domainFilter"),
  access: document.getElementById("accessFilter"),
  statusFilter: document.getElementById("statusFilter"),
  tierFilter: document.getElementById("tierFilter"),
  official: document.getElementById("officialFilter"),
  implemented: document.getElementById("implementedFilter"),
  summary: document.getElementById("sourceSummary"),
  list: document.getElementById("sourceList"),
  detail: document.getElementById("sourceDetail"),
  status: document.getElementById("sourceExplorerStatus"),
  retry: document.getElementById("sourceRetry"),
  backToMap: document.getElementById("backToMap"),
};

const state = {
  sources: MASTER_SOURCE_REGISTRY,
  stats: sourceRegistryStats(MASTER_SOURCE_REGISTRY),
  generatedAt: null,
  requestId: "",
  registryVersion: "local-fallback",
  warnings: [],
  errors: [],
  loading: false,
  apiFailed: false,
  selectedId: "",
  lastSuccessfulLoadAt: null,
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
    status: els.statusFilter.value,
    sourceTier: els.tierFilter.value,
    official: els.official.value,
    implemented: els.implemented.value,
  };
}

function queryFromControls(selectedId = state.selectedId) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(readFilters())) {
    if (!value) continue;
    params.set(key === "accessMode" ? "access" : key, value);
  }
  if (selectedId) params.set("source", selectedId);
  return params;
}

function syncUrl(selectedId = state.selectedId, mode = "replace") {
  const params = queryFromControls(selectedId);
  const nextUrl = `${location.pathname}${params.toString() ? `?${params}` : ""}`;
  if (nextUrl === `${location.pathname}${location.search}`) return;
  history[mode === "push" ? "pushState" : "replaceState"]({ source: selectedId }, "", nextUrl);
}

function readUrl() {
  const params = safeSearchParams(location.search);
  els.search.value = textParam(params, "q", "", 120);
  els.domain.value = allowedParam(params, "domain", SOURCE_DOMAINS, "");
  els.access.value = allowedParam(params, "access", SOURCE_ACCESS_CLASSIFICATIONS, "")
    || allowedParam(params, "accessMode", SOURCE_ACCESS_CLASSIFICATIONS, "");
  els.statusFilter.value = allowedParam(params, "status", IMPLEMENTATION_STATUSES, "");
  els.tierFilter.value = allowedParam(params, "sourceTier", SOURCE_QUALITY_TIERS, "");
  els.official.value = ["true", "false"].includes(params.get("official") || "") ? params.get("official") : "";
  els.implemented.value = ["true", "false"].includes(params.get("implemented") || "") ? params.get("implemented") : "";
  state.selectedId = tokenParam(params, "source", "");
}

function badge(value, className = "") {
  return `<span class="source-badge ${escapeHtml(className)}">${escapeHtml(title(value))}</span>`;
}

function renderStatus() {
  const loaded = state.lastSuccessfulLoadAt ? `Loaded ${relativeTime(state.lastSuccessfulLoadAt)}` : "Using local fallback";
  const generated = state.generatedAt ? `Generated ${new Date(state.generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Generated locally";
  const issue = state.apiFailed ? "Source API unavailable; local registry fallback is active." : state.warnings[0] || "Source registry loaded.";
  els.status.innerHTML = `<strong>${escapeHtml(issue)}</strong><span>${escapeHtml(loaded)} / ${escapeHtml(generated)} / Registry v${escapeHtml(state.registryVersion)} / ${escapeHtml(state.requestId || "no request id")}</span>`;
  els.retry.hidden = !state.apiFailed;
}

function sourceCard(sourceRecord, selectedId) {
  return `<button class="source-card ${sourceRecord.id === selectedId ? "active" : ""}" type="button" role="option" aria-selected="${sourceRecord.id === selectedId ? "true" : "false"}" data-source-id="${escapeHtml(sourceRecord.id)}">
    <span class="source-card-head">
      <span class="source-title">${escapeHtml(sourceRecord.name)}</span>
      ${badge(sourceRecord.status, sourceRecord.status)}
    </span>
    <span class="source-description">${escapeHtml(sourceRecord.description)}</span>
    <span class="source-card-meta">
      ${badge(DOMAIN_LABELS[sourceRecord.domain] || sourceRecord.domain)}
      ${badge(sourceRecord.accessMode)}
      ${badge(sourceRecord.sourceTier.replace("tier-", "tier "))}
    </span>
  </button>`;
}

function renderSummary(filtered) {
  const stats = state.stats || sourceRegistryStats(state.sources);
  els.summary.innerHTML = `
    <article><span>Registered</span><strong>${stats.total}</strong></article>
    <article><span>Showing</span><strong>${filtered.length}</strong></article>
    <article><span>Open or public</span><strong>${stats.openOrPublic}</strong></article>
    <article><span>Live now</span><strong>${stats.live}</strong></article>
    <article><span>Need review</span><strong>${stats.legalReviewRequired}</strong></article>
  `;
}

function row(label, value) {
  if (Array.isArray(value)) value = value.length ? value.join(", ") : "None";
  return `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || "Not set")}</dd>`;
}

function selectedSourceFor(value, sources = state.sources) {
  if (!value) return null;
  return sourceById(value, sources) || sources.find((sourceRecord) => sourceRecord.adapterId === value) || null;
}

function renderDetail(sourceRecord) {
  if (!sourceRecord) {
    els.detail.innerHTML = '<div class="empty" role="status">No source selected. Choose a source to inspect access, licensing, freshness, and implementation status.</div>';
    return;
  }
  els.detail.innerHTML = `
    <div class="source-detail-head" aria-live="polite">
      <span class="eyebrow">${escapeHtml(DOMAIN_LABELS[sourceRecord.domain] || sourceRecord.domain)}</span>
      <h2>${escapeHtml(sourceRecord.name)}</h2>
      <p>${escapeHtml(sourceRecord.description)}</p>
      <div class="source-card-meta">${badge(sourceRecord.status, sourceRecord.status)}${badge(sourceRecord.accessMode)}${badge(sourceRecord.verificationState)}</div>
    </div>
    <dl class="source-detail-grid">
      ${row("Best use", sourceRecord.bestUse)}
      ${row("Implemented", sourceRecord.implemented ? "Yes" : "No")}
      ${row("Why not live", sourceRecord.status === "live" ? "Live adapter is implemented." : sourceRecord.disableReason || sourceRecord.knownLimitations?.[0] || "Adapter, credentials, licensing, or validation are incomplete.")}
      ${row("Category", sourceRecord.category)}
      ${row("Source tier", sourceRecord.sourceTier)}
      ${row("Official", sourceRecord.official ? "Yes" : "No")}
      ${row("API / RSS / bulk", [sourceRecord.apiAvailable ? "API" : "", sourceRecord.rssAvailable ? "RSS" : "", sourceRecord.bulkDataAvailable ? "Bulk" : ""].filter(Boolean))}
      ${row("Credentials", sourceRecord.credentialRequired ? sourceRecord.environmentVariables : "No private credential configured")}
      ${row("Commercial use", sourceRecord.commercialUse)}
      ${row("Redistribution", sourceRecord.redistribution)}
      ${row("Caching", sourceRecord.caching)}
      ${row("Retention", sourceRecord.retention)}
      ${row("Refresh", sourceRecord.refreshGuidance)}
      ${row("Rate limit", sourceRecord.rateLimitGuidance)}
      ${row("Last terms review", sourceRecord.lastTermsReview)}
      ${row("Technical verification", sourceRecord.lastTechnicalVerification)}
      ${row("Limitations", sourceRecord.knownLimitations)}
      ${row("Notes", sourceRecord.notes)}
    </dl>
    <div class="source-actions">
      <a href="${escapeHtml(sourceRecord.sourceUrl)}" target="_blank" rel="noopener noreferrer">Source</a>
      <a href="${escapeHtml(sourceRecord.docsUrl || sourceRecord.sourceUrl)}" target="_blank" rel="noopener noreferrer">Docs</a>
      <a href="${escapeHtml(sourceRecord.termsUrl || sourceRecord.sourceUrl)}" target="_blank" rel="noopener noreferrer">Terms</a>
    </div>
  `;
}

function filteredSources() {
  let filtered = filterSources(state.sources, readFilters());
  const selected = selectedSourceFor(state.selectedId, state.sources);
  if (selected && !filtered.some((sourceRecord) => sourceRecord.id === selected.id)) filtered = [selected, ...filtered];
  return { filtered, selected: selected || filtered[0] || null };
}

function render(options = {}) {
  if (options.readLocation) readUrl();
  const { filtered, selected } = filteredSources();
  state.selectedId = selected?.id || "";
  renderStatus();
  renderSummary(filtered);
  els.list.setAttribute("aria-activedescendant", state.selectedId);
  els.list.innerHTML = state.loading
    ? '<div class="empty" role="status">Loading source registry...</div>'
    : filtered.length
      ? filtered.map((sourceRecord) => sourceCard(sourceRecord, state.selectedId)).join("")
      : '<div class="empty" role="status">No sources match the current filters.</div>';
  renderDetail(selected);
  syncUrl(state.selectedId, options.historyMode || "replace");
  const active = els.list.querySelector(".source-card.active");
  if (active && options.scrollSelected) active.scrollIntoView({ block: "nearest" });
}

async function loadSources() {
  state.loading = true;
  render();
  try {
    const response = await fetch(`/api/sources?${queryFromControls().toString()}`, { cache: "no-store" });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok) throw new Error(`Source API ${response.status}`);
    if (!contentType.includes("json")) throw new Error("Source API returned non-JSON content");
    const body = await response.json();
    const data = body.data || body;
    state.sources = data.sources || body.sources || MASTER_SOURCE_REGISTRY;
    state.stats = data.statistics || body.stats || sourceRegistryStats(state.sources);
    state.generatedAt = body.generatedAt || Date.now();
    state.requestId = body.requestId || "";
    state.registryVersion = data.registryVersion || "1";
    state.warnings = body.warnings || [];
    state.errors = body.errors || [];
    if (body.selectedSource?.id) state.selectedId = body.selectedSource.id;
    state.lastSuccessfulLoadAt = Date.now();
    state.apiFailed = false;
  } catch (error) {
    console.warn("Source API unavailable; using local source registry fallback.", error);
    state.sources = MASTER_SOURCE_REGISTRY;
    state.stats = sourceRegistryStats(MASTER_SOURCE_REGISTRY);
    state.generatedAt = Date.now();
    state.requestId = "local-fallback";
    state.registryVersion = "local-fallback";
    state.warnings = ["Source API fallback active."];
    state.errors = [String(error.message || error)];
    state.apiFailed = true;
  } finally {
    state.loading = false;
    render({ scrollSelected: true });
  }
}

optionList(els.domain, Object.keys(DOMAIN_LABELS), DOMAIN_LABELS);
optionList(els.access, SOURCE_ACCESS_CLASSIFICATIONS);
optionList(els.statusFilter, IMPLEMENTATION_STATUSES);
optionList(els.tierFilter, SOURCE_QUALITY_TIERS);
const currentParams = new URLSearchParams(location.search);
const dashboardParams = new URLSearchParams();
for (const key of ["dashboard", "sort", "group", "cards"]) {
  const value = currentParams.get(key);
  if (value) dashboardParams.set(key, value);
}
els.backToMap.href = `/${dashboardParams.toString() ? `?${dashboardParams}` : ""}`;
readUrl();
loadSources();

document.addEventListener("input", (event) => {
  if (!event.target.closest(".source-controls")) return;
  state.selectedId = "";
  render();
});

document.addEventListener("change", (event) => {
  if (!event.target.closest(".source-controls")) return;
  state.selectedId = "";
  loadSources();
});

document.addEventListener("click", (event) => {
  const card = event.target.closest("[data-source-id]");
  if (card) {
    state.selectedId = card.dataset.sourceId;
    render({ historyMode: "push", scrollSelected: true });
    return;
  }
  if (event.target.closest("#sourceRetry")) loadSources();
});

document.addEventListener("keydown", (event) => {
  const card = event.target.closest("[data-source-id]");
  if (!card || !["Enter", " "].includes(event.key)) return;
  event.preventDefault();
  state.selectedId = card.dataset.sourceId;
  render({ historyMode: "push", scrollSelected: true });
});

window.addEventListener("popstate", () => {
  render({ readLocation: true, scrollSelected: true });
});
