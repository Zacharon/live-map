import { escapeHtml, relativeTime } from "./events/event-normalizer.js";
import { countryByCode } from "./data/countries.js";
import { allowedParam, countryParam, safeSearchParams, textParam } from "./url-params.js";

const SORTS = [
  ["score-desc", "Score high to low"],
  ["confidence-desc", "Confidence"],
  ["trend-desc", "7-day rise"],
  ["region", "Region"],
  ["name", "Country name"],
];

const els = {
  status: document.getElementById("countriesStatus"),
  refresh: document.getElementById("countriesRefresh"),
  search: document.getElementById("countrySearch"),
  sort: document.getElementById("countrySort"),
  region: document.getElementById("countryRegion"),
  level: document.getElementById("countryLevel"),
  confidence: document.getElementById("confidenceFilter"),
  completeness: document.getElementById("completenessFilter"),
  distribution: document.getElementById("countryDistribution"),
  table: document.getElementById("countryTable"),
  detail: document.getElementById("countryDetail"),
};

let scores = [];

function params() {
  return safeSearchParams(window.location.search);
}

function setParam(key, value) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(key, value);
  else url.searchParams.delete(key);
  history.replaceState({}, "", url);
}

function selectedCode() {
  return countryParam(params(), "country", countryByCode);
}

function initializeControls() {
  els.sort.innerHTML = SORTS.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  els.sort.value = allowedParam(params(), "sort", SORTS.map(([value]) => value), "score-desc");
  els.search.value = textParam(params(), "q", "", 120);
  els.confidence.value = allowedParam(params(), "confidence", ["50", "70"], "");
  els.completeness.value = allowedParam(params(), "completeness", ["50", "70"], "");
}

function fillFilters() {
  const regions = [...new Set(scores.map((score) => score.region).filter(Boolean))].sort();
  const levels = [...new Set(scores.map((score) => score.level).filter(Boolean))].sort();
  els.region.innerHTML = '<option value="">All regions</option>' + regions.map((region) => `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`).join("");
  els.level.innerHTML = '<option value="">All levels</option>' + levels.map((level) => `<option value="${escapeHtml(level)}">${escapeHtml(level)}</option>`).join("");
  els.region.value = allowedParam(params(), "region", regions);
  els.level.value = allowedParam(params(), "level", levels);
}

function filteredScores() {
  const query = els.search.value.trim().toLowerCase();
  const minConfidence = Number(els.confidence.value || 0);
  const minCompleteness = Number(els.completeness.value || 0);
  let output = scores.filter((score) => {
    if (els.region.value && score.region !== els.region.value) return false;
    if (els.level.value && score.level !== els.level.value) return false;
    if (score.confidence < minConfidence || score.completeness < minCompleteness) return false;
    if (query && !`${score.countryName} ${score.iso3} ${score.region} ${score.levelLabel} ${score.topFactor}`.toLowerCase().includes(query)) return false;
    return true;
  });
  output = [...output].sort((a, b) => {
    if (els.sort.value === "confidence-desc") return b.confidence - a.confidence || b.score - a.score;
    if (els.sort.value === "trend-desc") return b.sevenDayChange - a.sevenDayChange || b.score - a.score;
    if (els.sort.value === "region") return String(a.region).localeCompare(String(b.region)) || b.score - a.score;
    if (els.sort.value === "name") return a.countryName.localeCompare(b.countryName);
    return b.score - a.score;
  });
  return output;
}

function distributionHtml() {
  const above80 = scores.filter((score) => score.score > 80).length;
  const above90 = scores.filter((score) => score.score > 90).length;
  const avg = scores.length ? Math.round(scores.reduce((sum, score) => sum + score.score, 0) / scores.length) : 0;
  return `<article><strong>${scores.length}</strong><span>countries scored</span></article><article><strong>${above80}</strong><span>above 80</span></article><article><strong>${above90}</strong><span>above 90</span></article><article><strong>${avg}</strong><span>average score</span></article>`;
}

function countryRow(score) {
  return `<button class="country-score-row ${selectedCode() === score.iso3 ? "active" : ""}" type="button" data-country="${escapeHtml(score.iso3)}">
    <span><strong>${escapeHtml(score.countryName)}</strong><small>${escapeHtml(score.region)} / ${escapeHtml(score.iso3)}</small></span>
    <b style="color:${escapeHtml(score.color)}">${escapeHtml(score.score)}</b>
    <span>${escapeHtml(score.levelLabel)}</span>
    <span>${escapeHtml(score.confidence)}%</span>
    <span>${escapeHtml(score.completeness)}%</span>
    <span>${score.sevenDayChange >= 0 ? "+" : ""}${escapeHtml(score.sevenDayChange)}</span>
    <span>${score.thirtyDayChange >= 0 ? "+" : ""}${escapeHtml(score.thirtyDayChange)}</span>
    <span>${escapeHtml(score.topFactor)}</span>
    <small>${score.calculatedAt ? escapeHtml(relativeTime(score.calculatedAt)) : "unknown"}</small>
  </button>`;
}

function detailHtml(score) {
  if (!score) return '<p class="empty">Select a country to inspect score details.</p>';
  const factors = (score.topFactors || score.factors || []).slice(0, 5).map((factor) => `<li><strong>${escapeHtml(factor.id)}</strong><span>${escapeHtml(factor.contribution)} pts</span><small>${escapeHtml(factor.description || "")}</small></li>`).join("");
  return `<article class="country-detail-card">
    <div class="dialog-kicker">${escapeHtml(score.iso3)} / ${escapeHtml(score.region)}</div>
    <h2>${escapeHtml(score.countryName)}</h2>
    <div class="dialog-grid">
      <div><span>Current score</span><strong style="color:${escapeHtml(score.color)}">${escapeHtml(score.score)}</strong></div>
      <div><span>Level</span><strong>${escapeHtml(score.levelLabel)}</strong></div>
      <div><span>Confidence</span><strong>${escapeHtml(score.confidence)}%</strong></div>
      <div><span>Completeness</span><strong>${escapeHtml(score.completeness)}%</strong></div>
      <div><span>7-day change</span><strong>${score.sevenDayChange >= 0 ? "+" : ""}${escapeHtml(score.sevenDayChange)}</strong></div>
      <div><span>30-day change</span><strong>${score.thirtyDayChange >= 0 ? "+" : ""}${escapeHtml(score.thirtyDayChange)}</strong></div>
    </div>
    <h3>Top contributing factors</h3>
    <ul class="factor-list">${factors}</ul>
    <div class="dialog-actions"><a class="source-link" href="/?country=${escapeHtml(score.iso3)}">Open on map</a><a class="source-link secondary" href="/docs/CII_V2_METHODOLOGY.md">Methodology</a></div>
  </article>`;
}

function render() {
  const list = filteredScores();
  els.distribution.innerHTML = distributionHtml();
  els.table.innerHTML = `<div class="country-score-header"><span>Country</span><span>Score</span><span>Level</span><span>Confidence</span><span>Completeness</span><span>7d</span><span>30d</span><span>Top factor</span><span>Calculated</span></div>${list.map(countryRow).join("") || '<p class="empty">No countries match these filters.</p>'}`;
  const selected = scores.find((score) => score.iso3 === selectedCode() || score.iso2 === selectedCode()) || list[0] || null;
  els.detail.innerHTML = detailHtml(selected);
}

async function loadScores() {
  els.status.innerHTML = "<strong>Loading country scores...</strong>";
  els.refresh.disabled = true;
  try {
    const response = await fetch(`/api/country-risk?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    scores = body.data?.scores || body.data || [];
    els.status.innerHTML = `<strong>Country scores loaded</strong><span>${scores.length} countries / ${body.data?.distributionWarnings?.length || 0} distribution warnings</span>`;
    fillFilters();
    render();
  } catch (error) {
    els.status.innerHTML = `<strong>Country scores unavailable</strong><span>${escapeHtml(error.message)}</span>`;
  } finally {
    els.refresh.disabled = false;
  }
}

initializeControls();
for (const control of [els.search, els.sort, els.region, els.level, els.confidence, els.completeness]) {
  control.addEventListener("input", () => {
    const key = control.id.replace(/^country/, "").replace("Filter", "").toLowerCase();
    setParam(key === "search" ? "q" : key, control.value);
    render();
  });
  control.addEventListener("change", () => {
    const key = control.id.replace(/^country/, "").replace("Filter", "").toLowerCase();
    setParam(key === "search" ? "q" : key, control.value);
    render();
  });
}
els.table.addEventListener("click", (event) => {
  const row = event.target.closest("[data-country]");
  if (!row) return;
  setParam("country", row.dataset.country);
  render();
});
els.refresh.addEventListener("click", loadScores);
window.addEventListener("popstate", render);
loadScores();
