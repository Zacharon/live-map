import { escapeHtml, relativeTime } from "../events/event-normalizer.js";

const STATUS_ORDER = { closed: 0, "severely-disrupted": 1, disrupted: 2, watch: 3, unknown: 4, normal: 5 };

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function assessmentFor(id, assessments) {
  return assessments.find((item) => item.chokepointId === id) || { status: "unknown", confidence: 0, activeEventCount: 0, updatedAt: null, explanation: "No assessment available.", operationalDimensions: [], topEvents: [], caveats: [] };
}

export function filterChokepoints(chokepoints = [], assessments = [], filters = {}) {
  const query = String(filters.query || "").trim().toLowerCase();
  const output = chokepoints.filter((chokepoint) => {
    const assessment = assessmentFor(chokepoint.id, assessments);
    const search = [chokepoint.name, chokepoint.shortName, ...(chokepoint.aliases || []), ...(chokepoint.regions || [])].join(" ").toLowerCase();
    return (!query || search.includes(query))
      && (!filters.region || chokepoint.regions.includes(filters.region))
      && (!filters.type || chokepoint.type === filters.type)
      && (!filters.status || assessment.status === filters.status)
      && (!filters.domain || chokepoint.domains.includes(filters.domain));
  });
  const sort = filters.sort || "priority";
  return output.sort((a, b) => {
    const aa = assessmentFor(a.id, assessments);
    const bb = assessmentFor(b.id, assessments);
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "recency") return new Date(bb.updatedAt || 0) - new Date(aa.updatedAt || 0) || a.name.localeCompare(b.name);
    if (sort === "status") return (STATUS_ORDER[aa.status] ?? 99) - (STATUS_ORDER[bb.status] ?? 99) || a.name.localeCompare(b.name);
    return (STATUS_ORDER[aa.status] ?? 99) - (STATUS_ORDER[bb.status] ?? 99) || bb.activeEventCount - aa.activeEventCount || a.name.localeCompare(b.name);
  });
}

export function renderStrategicWatch(assessments = [], chokepoints = []) {
  const nameById = new Map(chokepoints.map((item) => [item.id, item.shortName]));
  const watch = assessments.filter((item) => item.status !== "normal").sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)).slice(0, 6);
  if (!watch.length) return `<section class="strategic-watch"><div class="section-title"><span>Strategic watch</span></div><p class="panel-help">No qualifying watch conditions in the current data. Normal areas remain available in Chokepoints.</p></section>`;
  return `<section class="strategic-watch"><div class="section-title"><span>Strategic watch</span></div>${watch.map((item) => `<button type="button" class="strategic-watch-row status-${escapeHtml(item.status)}" data-chokepoint-select="${escapeHtml(item.chokepointId)}"><strong>${escapeHtml(nameById.get(item.chokepointId) || item.chokepointId)}</strong><span>${escapeHtml(item.status.replace(/-/g, " "))} - ${item.activeEventCount} related</span></button>`).join("")}</section>`;
}

export function renderChokepointCards(chokepoints = [], assessments = [], selectedId = null) {
  if (!chokepoints.length) return `<div class="empty">No chokepoints match these filters. Reset filters to restore the strategic registry.</div>`;
  return chokepoints.map((chokepoint) => {
    const assessment = assessmentFor(chokepoint.id, assessments);
    return `<article class="chokepoint-card ${selectedId === chokepoint.id ? "selected" : ""}" data-chokepoint-select="${escapeHtml(chokepoint.id)}" tabindex="0" role="button" aria-label="Inspect ${escapeHtml(chokepoint.name)}">
      <div class="event-meta"><span class="category-pill">${escapeHtml(chokepoint.type.replace(/-/g, " "))}</span><span class="severity-tag chokepoint-status-${escapeHtml(assessment.status)}">${escapeHtml(assessment.status.replace(/-/g, " "))}</span></div>
      <h2>${escapeHtml(chokepoint.name)}</h2>
      <p>${escapeHtml((chokepoint.regions || []).join(" / "))}</p>
      <div class="chokepoint-facts"><span>${assessment.activeEventCount} active related</span><span>${assessment.confidence}% confidence</span><span>${assessment.updatedAt ? relativeTime(assessment.updatedAt) : "not assessed"}</span></div>
      <p class="chokepoint-explanation">${escapeHtml(assessment.explanation)}</p>
    </article>`;
  }).join("");
}

export function renderChokepointDetail(chokepoint, assessments = [], eventsById = new Map()) {
  if (!chokepoint) return "";
  const assessment = assessmentFor(chokepoint.id, assessments);
  const developments = assessment.topEvents.map((item) => {
    const event = eventsById.get(item.eventId);
    const url = safeUrl(event?.sourceUrl);
    return `<li><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.relationship.replace(/-/g, " "))} - ${escapeHtml(item.sourceName || "Source")} - ${item.updatedAt ? escapeHtml(relativeTime(item.updatedAt)) : "time unavailable"}${url ? ` <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Source</a>` : ""}</span></li>`;
  }).join("") || "<li>No currently correlated events under the selected time window.</li>";
  const dimensions = assessment.operationalDimensions.length ? assessment.operationalDimensions.map((dimension) => `<span>${escapeHtml(dimension)}</span>`).join("") : "<span>unknown</span>";
  const caveats = assessment.caveats.length ? assessment.caveats.map((item) => `<li>${escapeHtml(item)}</li>`).join("") : "<li>Correlation does not establish an operational disruption or closure by itself.</li>";
  return `<aside class="chokepoint-detail" aria-label="${escapeHtml(chokepoint.name)} details">
    <div class="v2-detail-head"><button type="button" class="v2-detail-close" data-chokepoint-clear aria-label="Close chokepoint details">x</button><div class="v2-detail-badges"><span class="category-pill">${escapeHtml(chokepoint.type.replace(/-/g, " "))}</span><span class="severity-tag chokepoint-status-${escapeHtml(assessment.status)}">${escapeHtml(assessment.status.replace(/-/g, " "))}</span><span class="v2-confidence">${assessment.confidence}% confidence</span></div><h2 class="v2-detail-title">${escapeHtml(chokepoint.name)}</h2></div>
    <p class="v2-detail-summary">${escapeHtml(assessment.explanation)}</p>
    <dl class="v2-detail-facts"><div><dt>Last assessed</dt><dd>${assessment.updatedAt ? escapeHtml(relativeTime(assessment.updatedAt)) : "Unavailable"}</dd></div><div><dt>Related events</dt><dd>${assessment.activeEventCount}</dd></div><div><dt>Strategic significance</dt><dd>${escapeHtml(chokepoint.strategicReason)}</dd></div><div><dt>Regions</dt><dd>${escapeHtml(chokepoint.regions.join(", ") || "Not specified")}</dd></div></dl>
    <section><div class="v2-section-title"><span>Current developments</span></div><ul class="chokepoint-development-list">${developments}</ul></section>
    <section><div class="v2-section-title"><span>Operational dimensions</span></div><div class="chokepoint-dimensions">${dimensions}</div></section>
    <section><div class="v2-section-title"><span>Sources and limitations</span></div><ul class="chokepoint-caveats"><li>${escapeHtml(chokepoint.limitations)}</li>${caveats}</ul></section>
    <section><div class="v2-section-title"><span>Related geography</span></div><p class="v2-empty">Adjacent countries: ${escapeHtml(chokepoint.adjacentCountries.concat(chokepoint.primaryCountries).join(", ") || "not specified")}. Related ports: ${escapeHtml(chokepoint.watchedPorts.join(", ") || "not specified")}.</p></section>
  </aside>`;
}
