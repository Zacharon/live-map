import { escapeHtml, relativeTime } from "../events/event-normalizer.js";

export function renderLatestIntelligence(storylines = [], observations = []) {
  if (!storylines.length) return `<section class="latest-intelligence"><h2>Latest Intelligence</h2><p class="empty">No open-news or social observations are enabled. Provider controls remain server-side and configuration-gated.</p></section>`;
  const observationById = new Map(observations.map((item) => [item.id, item]));
  const cards = storylines.slice(0, 30).map((storyline) => {
    const sources = storyline.observationIds.slice(0, 3).map((id) => observationById.get(id)?.sourceOrganizationName).filter(Boolean);
    const verification = storyline.verification.state.replace(/-/g, " ");
    return `<article class="latest-storyline">
      <div class="latest-storyline-meta"><span class="category-pill">${escapeHtml(storyline.trend.state)}</span><span>${escapeHtml(verification)}</span><span>${storyline.verification.independentSourceCount} independent source${storyline.verification.independentSourceCount === 1 ? "" : "s"}</span></div>
      <h2>${escapeHtml(storyline.title)}</h2>
      <p>${storyline.observationCount} observation${storyline.observationCount === 1 ? "" : "s"} from ${escapeHtml(sources.join(", ") || "unknown sources")}.</p>
      <div class="quality-row"><span>Latest: ${escapeHtml(relativeTime(new Date(storyline.latestObservedAt).getTime()))}</span><span>Trend: ${escapeHtml(String(storyline.trend.observationsPerHour))}/hour</span></div>
      ${storyline.coverageGaps.length ? `<p class="latest-gap">Coverage gap: ${escapeHtml(storyline.coverageGaps.join(" "))}</p>` : ""}
    </article>`;
  }).join("");
  return `<section class="latest-intelligence"><div class="section-title"><span>Latest Intelligence</span></div><p class="panel-help">Open-web signals are metadata-only observations. Trend activity is not verification.</p><div class="latest-storyline-list">${cards}</div></section>`;
}
