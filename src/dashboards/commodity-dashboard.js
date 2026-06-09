import { escapeHtml } from "../events/event-normalizer.js";

export function renderCommodityDashboard({ events = [], sourceStatus = {}, providerResults = [] } = {}) {
  const commodityEvents = events.filter((event) => event.domain === "commodity-supply-chain").slice(0, 6);
  const eiaResult = providerResults.find((result) => result.providerId === "eia");
  const eventCards = commodityEvents.length
    ? commodityEvents.map((event) => `<article class="mini-card"><strong>${escapeHtml(event.title)}</strong><span>${escapeHtml(event.typeLabel || event.type || event.category)} · ${escapeHtml(event.sourceName || event.source || "Official source")}</span></article>`).join("")
    : '<article class="mini-card"><strong>No configured commodity events</strong><span>EIA is configuration-required until EIA_API_KEY is set.</span></article>';
  return `<strong>Commodity dashboard</strong><p>Energy, metals, agriculture, shipping routes, production disruptions, and port status are represented in the layer registry. Live commodity prices require server-side provider credentials.</p><p>EIA: ${escapeHtml(sourceStatus.eia?.status || "configuration-required")} · Observations: ${eiaResult?.observations?.length || 0}</p><div class="mini-grid">${eventCards}</div><p>Use event versus observation language carefully: official energy observations can become commodity signals only when documented thresholds are crossed.</p>`;
}
