import { countryByCode } from "./data/countries.js";
import { escapeHtml, relativeTime } from "./events/event-normalizer.js";
import { allowedParam, countryParam, safeSearchParams, textParam } from "./url-params.js";
import { createDetailSheet, foldFiltersOnPhones } from "./ui/detail-sheet.js";

const SORTS = [
  ["score-desc", "Score high to low"],
  ["confidence-desc", "Confidence"],
  ["trend-desc", "7-day rise"],
  ["region", "Region"],
  ["name", "Country name"],
];
const SORT_IDS = SORTS.map(([value]) => value);

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

let openLinkedDetail = Boolean(new URLSearchParams(location.search).get("country"));
// Back to the chosen row; if the filters hide it, to the first row, so keyboard focus never drops to the page.
const sheet = createDetailSheet({ panel: els.detail, restoreFocus: () => (els.table.querySelector(".country-score-row.active") || els.table.querySelector(".country-score-row"))?.focus() });

// Factor ids arrive as camelCase, for example structuralBaseline.
function factorLabel(id) {
  const words = String(id || "Not stated").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function params() {
  return safeSearchParams();
}

function setParam(key, value) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(key, value);
  else url.searchParams.delete(key);
  history.replaceState({}, "", url);
}

function selectedCode() {
  return countryParam(params(), "country", countryByCode) || "";
}

function initializeControls() {
  els.sort.innerHTML = SORTS.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  const searchParams = params();
  els.sort.value = allowedParam(searchParams, "sort", SORT_IDS, "score-desc");
  els.region.innerHTML = '<option value="">All regions</option>';
  els.level.innerHTML = '<option value="">All levels</option>';
  els.search.value = textParam(searchParams, "q", "", 120);
  els.confidence.value = textParam(searchParams, "confidence", "", 40);
  els.completeness.value = textParam(searchParams, "completeness", "", 40);
}

function fillFilters() {
  const regions = [...new Set(scores.map((score) => score.region).filter(Boolean))].sort();
  const levels = [...new Set(scores.map((score) => score.level).filter(Boolean))].sort();
  els.region.innerHTML = '<option value="">All regions</option>' + regions.map((region) => `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`).join("");
  els.level.innerHTML = '<option value="">All levels</option>' + levels.map((level) => `<option value="${escapeHtml(level)}">${escapeHtml(level)}</option>`).join("");
  els.region.value = params().get("region") || "";
  els.level.value = params().get("level") || "";
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
  return `<article><strong>${scores.length}</strong><span>countries scored</span></article><article><strong>${avg}</strong><span>average score</span></article><article><strong>${above80}</strong><span>above 80</span></article><article><strong>${above90}</strong><span>above 90</span></article>`;
}

function countryRow(score) {
  return `<button class="country-score-row ${selectedCode() === score.iso3 ? "active" : ""}" type="button" data-country="${escapeHtml(score.iso3)}">
    <span class="c-name"><strong>${escapeHtml(score.countryName)}</strong><small>${escapeHtml(score.region)}, ${escapeHtml(score.iso3)}</small></span>
    <b class="c-score">${escapeHtml(score.score)}</b>
    <span class="c-level">${escapeHtml(score.levelLabel)}</span>
    <span class="c-conf">${escapeHtml(score.confidence)}%</span>
    <span class="c-comp">${escapeHtml(score.completeness)}%</span>
    <span class="c-7d">${score.sevenDayChange >= 0 ? "+" : ""}${escapeHtml(score.sevenDayChange)}</span>
    <span class="c-30d">${score.thirtyDayChange >= 0 ? "+" : ""}${escapeHtml(score.thirtyDayChange)}</span>
    <span class="c-factor">${escapeHtml(factorLabel(score.topFactor))}</span>
  </button>`;
}

function calculatedLabel(value) {
  const relative = value ? relativeTime(value) : "Time unknown";
  return relative === "Time unknown" ? "at an unknown time" : escapeHtml(relative.charAt(0).toLowerCase() + relative.slice(1));
}

function detailHtml(score) {
  if (!score) return '<button class="sheet-back" type="button" data-sheet-back>← Back to countries</button><p class="empty">Select a country to see how its score is built.</p>';
  const factors = (score.topFactors || score.factors || []).slice(0, 5).map((factor) => `<li><strong>${escapeHtml(factorLabel(factor.id))}</strong><span>${escapeHtml(factor.contribution)} pts</span><small>${escapeHtml(factor.description || "")}</small></li>`).join("");
  return `<button class="sheet-back" type="button" data-sheet-back>← Back to countries</button><article class="country-detail-card">
    <div class="dialog-kicker">${escapeHtml(score.region)}, ${escapeHtml(score.iso3)} · calculated ${calculatedLabel(score.calculatedAt)}</div>
    <h2>${escapeHtml(score.countryName)}</h2>
    <div class="dialog-grid">
      <div><span>Current score</span><strong>${escapeHtml(score.score)}</strong></div>
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
  els.table.innerHTML = `<div class="country-score-header"><span class="c-name">Country</span><span>Score</span><span>Level</span><span class="c-conf">Confidence</span><span class="c-comp">Complete</span><span class="c-7d">7-day</span><span class="c-30d">30-day</span><span class="c-factor">Top factor</span></div>${list.map(countryRow).join("") || '<div class="chart-message"><strong>No countries match these filters</strong><p>Try a broader search or set the filters back to Any.</p></div>'}`;
  const selected = scores.find((score) => score.iso3 === selectedCode() || score.iso2 === selectedCode()) || list[0] || null;
  els.detail.innerHTML = detailHtml(selected);
}

async function loadScores() {
  els.status.innerHTML = "<strong>Loading country scores…</strong>";
  els.status.dataset.tone = "";
  els.refresh.disabled = true;
  if (!scores.length) els.table.innerHTML = '<div class="chart-loading" role="status" aria-label="Loading country scores"><span></span><span></span><span></span><span></span></div>';
  try {
    const response = await fetch(`/api/country-risk?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    scores = body.data?.scores || body.data || [];
    const warnings = body.data?.distributionWarnings?.length || 0;
    els.status.innerHTML = `<strong>Scores loaded</strong><span>${warnings ? `${warnings} distribution warning${warnings === 1 ? "" : "s"}` : "No distribution warnings"}</span>`;
    fillFilters();
    render();
    // A link that names a country (for example from the map) shows that country's detail on phones too.
    // Only when the link names a country that has a score; never the fallback first row.
    if (openLinkedDetail) { openLinkedDetail = false; const code = selectedCode(); if (code && scores.some((score) => score.iso3 === code || score.iso2 === code)) sheet.open(); }
  } catch (error) {
    els.status.innerHTML = `<strong>Country scores unavailable</strong><span>${escapeHtml(error.message)}</span>`;
    els.status.dataset.tone = "error";
    if (!scores.length) {
      els.distribution.innerHTML = "";
      els.detail.innerHTML = "";
      els.table.innerHTML = `<div class="chart-message" data-tone="error"><strong>Country scores could not be loaded</strong><p>The score service did not respond (${escapeHtml(error.message)}). Nothing is shown rather than an old or partial ranking.</p><button type="button" data-chart-retry>Try again</button></div>`;
    }
  } finally {
    els.refresh.disabled = false;
  }
}

initializeControls();
foldFiltersOnPhones(document.getElementById("countryFilters"));
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
  sheet.open();
});
els.table.addEventListener("click", (event) => {
  if (event.target.closest("[data-chart-retry]")) loadScores();
});
els.refresh.addEventListener("click", loadScores);
window.addEventListener("popstate", render);
loadScores();
