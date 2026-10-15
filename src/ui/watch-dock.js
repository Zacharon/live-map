import { escapeHtml } from "../events/event-normalizer.js";

function seriesRows(caseObject) {
  return (caseObject?.evidence || [])
    .filter((item) => item.extra?.historicalPublic === true && Number.isFinite(Number(item.value)))
    .slice()
    .sort((a, b) => String(a.observedAt).localeCompare(String(b.observedAt)));
}

export function renderWatchDock(caseObject, { scenarioStage = "" } = {}) {
  const rows = seriesRows(caseObject);
  const sample = rows[0];
  if (!sample) {
    return `<details id="watchDock" class="watch-dock" data-watch-dock="empty"><summary>Measurement dock</summary><p>No historical measurement is loaded.</p></details>`;
  }
  const values = rows.map((item) => Number(item.value));
  const max = Math.max(...values, 1);
  const width = 280;
  const height = 72;
  const step = rows.length > 1 ? (width - 16) / (rows.length - 1) : 0;
  const points = rows.map((item, index) => {
    const x = 8 + index * step;
    const y = height - 10 - (Number(item.value) / max) * (height - 22);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const dates = rows.map((item) => String(item.observedAt || "").slice(0, 10));
  const scenario = scenarioStage
    ? `<p class="watch-dock-note" data-scenario-separation>Map scenario <strong>${escapeHtml(scenarioStage)}</strong> is a synthetic fixture. This chart is the separate historical extract.</p>`
    : "";
  return `<details id="watchDock" class="watch-dock" data-watch-dock="historical" open>
    <summary>Measurement dock · historical transit calls</summary>
    ${scenario}
    <p class="watch-dock-kicker" data-acquisition="historical_public">historical_public · not a current operating condition</p>
    <p class="watch-dock-facts">
      <span data-observation-period>${escapeHtml(dates[0])} through ${escapeHtml(dates.at(-1))}</span>
      · retrieved <span data-retrieved-at>${escapeHtml(sample.retrievedAt || "unknown")}</span>
      · publication date <span data-publication-date>unknown</span>
      · unit <span data-original-unit>${escapeHtml(sample.unit || "n_total")}</span>
    </p>
    <figure class="watch-series">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Historical n_total series">
        <polyline fill="none" stroke="currentColor" stroke-width="1.5" points="${points}"></polyline>
      </svg>
      <figcaption>IMF PortWatch n_total, AIS-derived estimated transit calls. No baseline. Throughput status remains unknown. This is not cargo volume.</figcaption>
    </figure>
    <p class="watch-dock-note" data-throughput-state="unknown">Operating throughput: unknown.</p>
  </details>`;
}
