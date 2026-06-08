import { EXCHANGES, marketFixtures } from "../data/exchanges.js";

export function renderFinanceDashboard({ correlations }) {
  const cards = marketFixtures().map((market) => `<article class="mini-card"><strong>${market.symbol}</strong><span>${market.status}</span></article>`).join("");
  return `<strong>Finance dashboard</strong><p>${EXCHANGES.length} global exchange registry entries. Market cards are delayed fixtures until a lawful provider is configured server-side.</p><div class="mini-grid">${cards}</div><p>${correlations.length} potential event-market correlations require analyst review.</p>`;
}
