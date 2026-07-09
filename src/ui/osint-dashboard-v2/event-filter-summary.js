import { CATEGORIES, SEVERITIES } from "../../config.js";
import { domainOptions } from "../../events/taxonomy.js";
import { escapeHtml } from "../../events/event-normalizer.js";

const TIME_LABELS = { 24: "24h", 72: "3d", 168: "7d", 720: "30d" };

export function buildActiveFilterChips(filters = {}, hours = 168) {
  const chips = [];
  const domains = domainOptions();
  const activeDomains = domains.filter((domain) => filters.domains?.size && filters.domains.has(domain.id));
  const inactiveDomains = domains.filter((domain) => filters.domains?.size && !filters.domains.has(domain.id));
  if (filters.domains?.size && inactiveDomains.length && inactiveDomains.length < domains.length) {
    activeDomains.forEach((domain) => chips.push({ type: "domain", key: domain.id, label: domain.label }));
  }
  const allCategories = Object.keys(CATEGORIES);
  const inactiveCategories = allCategories.filter((key) => filters.categories?.size && !filters.categories.has(key));
  if (filters.categories?.size && inactiveCategories.length && inactiveCategories.length < allCategories.length) {
    allCategories.filter((key) => filters.categories.has(key)).forEach((key) => {
      chips.push({ type: "category", key, label: CATEGORIES[key]?.label || key });
    });
  }
  const allSeverities = Object.keys(SEVERITIES);
  const inactiveSeverities = allSeverities.filter((key) => filters.severities?.size && !filters.severities.has(key));
  if (filters.severities?.size && inactiveSeverities.length && inactiveSeverities.length < allSeverities.length) {
    allSeverities.filter((key) => filters.severities.has(key)).forEach((key) => {
      chips.push({ type: "severity", key, label: SEVERITIES[key]?.label || key });
    });
  }
  if (hours && hours !== 168) chips.push({ type: "time", key: String(hours), label: `Last ${TIME_LABELS[hours] || hours + "h"}` });
  if (filters.query?.trim()) chips.push({ type: "query", key: filters.query.trim(), label: `Search: ${filters.query.trim()}` });
  return chips;
}

export function renderEventFilterSummary(filters = {}, hours = 168) {
  const chips = buildActiveFilterChips(filters, hours);
  if (!chips.length) {
    return `<section class="v2-filter-summary" aria-label="Active filters"><div class="v2-section-title"><span>Filters</span></div><p class="v2-empty">All categories, severities, and domains — last 7 days.</p></section>`;
  }
  return `<section class="v2-filter-summary" aria-label="Active filters"><div class="v2-section-title"><span>Active filters</span><button type="button" class="v2-text-btn" data-v2-clear-filters>Clear all</button></div><div class="v2-filter-chips">${chips.map((chip) => `<button type="button" class="v2-chip" data-v2-filter="${escapeHtml(chip.type)}" data-v2-filter-key="${escapeHtml(chip.key)}">${escapeHtml(chip.label)} <span aria-hidden="true">×</span></button>`).join("")}</div></section>`;
}