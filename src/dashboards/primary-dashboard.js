import { LAYER_CATALOG } from "../data/layers.js";

export function renderPrimaryDashboard({ riskScores }) {
  return `<strong>Primary dashboard</strong><p>Tracks global events, source health, country risk, and implemented hazard layers.</p><div class="mini-grid"><span>${LAYER_CATALOG.length} layer definitions</span><span>${riskScores.length} CII rows</span></div><button id="openCiiMethod" class="text-button">CII methodology</button>`;
}
