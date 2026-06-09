import { EXCHANGES, marketFixtures } from "../data/exchanges.js";
import { escapeHtml } from "../events/event-normalizer.js";

function eventRows(events) {
  const financeEvents = events.filter((event) => event.domain === "finance-markets").slice(0, 6);
  if (!financeEvents.length) return '<article class="mini-card"><strong>No configured finance events</strong><span>SEC and FRED are configuration-required until server-side credentials are set.</span></article>';
  return financeEvents
    .map((event) => `<article class="mini-card"><strong>${escapeHtml(event.title)}</strong><span>${escapeHtml(event.typeLabel || event.type || event.category)} · ${escapeHtml(event.sourceName || event.source || "Official source")}</span></article>`)
    .join("");
}

export function renderFinanceDashboard({ correlations, events = [], sourceStatus = {} }) {
  const cards = marketFixtures().map((market) => `<article class="mini-card"><strong>${market.symbol}</strong><span>${market.status}</span></article>`).join("");
  const secStatus = sourceStatus["sec-edgar"]?.status || "configuration-required";
  const fredStatus = sourceStatus.fred?.status || "configuration-required";
  return `<strong>Finance dashboard</strong><p>${EXCHANGES.length} global exchange registry entries. Market cards are delayed fixtures until a lawful provider is configured server-side.</p><div class="mini-grid">${cards}</div><p>SEC EDGAR: ${escapeHtml(secStatus)} · FRED: ${escapeHtml(fredStatus)}</p><div class="mini-grid">${eventRows(events)}</div><p>${correlations.length} potential event-market correlations require analyst review. Company, filing-form, event-type, and series filtering use the main feed controls until dedicated tables expand.</p>`;
}
