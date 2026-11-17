import { escapeHtml, relativeTime } from "../events/event-normalizer.js";
import { renderMaritimeSignals } from "./maritime-signals.js";

const DIRECT = new Set(["directly-references", "inside", "affects-adjacent-port", "affects-route"]);

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function inWindow(stamp, start, end) {
  const t = new Date(stamp || 0).getTime();
  if (!Number.isFinite(t)) return false;
  if (Number.isFinite(start) && t < start) return false;
  if (Number.isFinite(end) && t > end) return false;
  return true;
}

export function indexItemsByChokepoint(chokepoints, events = [], correlations = [], records = [], { start = null, end = null } = {}) {
  const byId = new Map(chokepoints.map((item) => [item.id, { events: [], observations: [], notices: [], related: [], seen: new Set() }]));
  const eventById = new Map(events.map((event) => [String(event.id), event]));
  for (const link of correlations) {
    const bucket = byId.get(link.chokepointId);
    const event = eventById.get(String(link.eventId));
    if (!bucket || !event || event.synthetic === true) continue;
    if (!inWindow(event.occurredAt || event.updatedAt || event.startedAt, start, end) && !event.frozenSample) continue;
    if (bucket.seen.has(event.id)) continue;
    bucket.seen.add(event.id);
    const rel = link.relationship || "nearby";
    const row = { ...event, linkReason: rel };
    if (DIRECT.has(rel)) bucket.events.push(row);
    else bucket.related.push(row);
  }
  for (const record of records) {
    const bucket = byId.get(record.chokepointId);
    if (!bucket || record.synthetic === true) continue;
    if (record.evidenceKind === "official-notice" || record.recordKind === "restriction-geometry") bucket.notices.push(record);
    else bucket.observations.push(record);
  }
  return byId;
}

function coverageLine(assessment, items) {
  const status = assessment?.status;
  if (status && status !== "unknown" && status !== "normal") return `${String(status).replace(/-/g, " ")} · evidence-led, not a safety rating`;
  if (items.observations.length || items.events.length || items.notices.length) return "Loaded records available — not a current operating verdict";
  return "No matching records in loaded sources";
}

function seriesFrom(observations) {
  const samples = observations.filter((item) => item.evidenceKind === "throughput-measurement" && item.extra?.historicalPublic === true && item.extra?.proxyNotThroughput === true && String(item.unit || "").startsWith("n_total") && item.value != null && Number.isFinite(Number(item.value)))
    .sort((a, b) => String(a.observedAt).localeCompare(String(b.observedAt)));
  if (samples.length < 2) return null;
  return {
    start: samples[0].observedAt?.slice(0, 10),
    end: samples.at(-1).observedAt?.slice(0, 10),
    count: samples.length,
    samples,
    unit: samples[0].unit,
    source: samples[0].upstreamOrganization || samples[0].sourceId,
  };
}

export function renderChokepointBriefList(chokepoints, assessments, index, selectedId, { expandedId = null } = {}) {
  if (!chokepoints.length) return `<p class="empty">No chokepoints in the registry for these filters.</p>`;
  return chokepoints.map((chokepoint) => {
    const assessment = assessments.find((item) => item.chokepointId === chokepoint.id) || {};
    const items = index.get(chokepoint.id) || { events: [], observations: [], notices: [], related: [] };
    const series = seriesFrom(items.observations);
    const selected = selectedId === chokepoint.id;
    const expanded = expandedId === chokepoint.id;
    const previews = items.events.slice(0, 2);
    return `<article class="brief-card ${selected ? "selected" : ""}" data-chokepoint-select="${escapeHtml(chokepoint.id)}">
      <header>
        <p class="brief-kicker">${escapeHtml((chokepoint.type || "").replace(/-/g, " "))} · ${escapeHtml((chokepoint.regions || []).slice(0, 2).join(" / ") || "maritime")}</p>
        <h2>${escapeHtml(chokepoint.name)}</h2>
        <p class="brief-status">${escapeHtml(coverageLine(assessment, items))}</p>
        ${renderMaritimeSignals(assessment.maritimeSignals, { compact: true })}
      </header>
      <p class="brief-counts">${items.events.length} event${items.events.length === 1 ? "" : "s"} · ${items.observations.length} observation${items.observations.length === 1 ? "" : "s"} · ${items.notices.length} notice${items.notices.length === 1 ? "" : "s"}</p>
      ${series ? `<p class="brief-history">Historical observations available: ${escapeHtml(series.start)}–${escapeHtml(series.end)} · ${escapeHtml(series.source || "source")}<button type="button" data-open-history="${escapeHtml(chokepoint.id)}">View observations</button></p>` : ""}
      ${previews.map((event) => `<button type="button" class="child-card" data-event-detail="${escapeHtml(event.id)}"><span>${escapeHtml(event.title)}</span><small>${escapeHtml(event.linkReason.replace(/-/g, " "))} · ${event.occurredAt ? escapeHtml(relativeTime(event.occurredAt)) : "date unknown"}</small></button>`).join("")}
      ${items.events.length > 2 ? `<button type="button" class="text-link" data-chokepoint-expand="${escapeHtml(chokepoint.id)}">View all ${items.events.length} events</button>` : ""}
      ${!items.events.length && !series ? `<p class="panel-help">No matching records in loaded sources for the selected interval.</p>` : ""}
      ${expanded ? renderExpandedGroups(chokepoint, items, series) : ""}
      ${selected ? `<button type="button" class="workbench-open" data-investigate-open="${escapeHtml(chokepoint.id)}">Investigate</button>` : ""}
    </article>`;
  }).join("");
}

function renderExpandedGroups(chokepoint, items, series) {
  const eventCards = items.events.map((event) => {
    const url = safeUrl(event.sourceUrl);
    return `<li class="child-card"><strong>${escapeHtml(event.title)}</strong><span>${escapeHtml(event.type || event.category || "event")} · ${escapeHtml(event.linkReason.replace(/-/g, " "))}</span><span>${event.occurredAt ? escapeHtml(String(event.occurredAt).slice(0, 16)) : "time unknown"} · ${escapeHtml(event.sourceName || "source")}${url ? ` · <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Source</a>` : ""}</span></li>`;
  }).join("") || "<li>No distinct events in loaded sources.</li>";
  const noticeCards = items.notices.map((notice) => `<li class="child-card"><strong>${escapeHtml(notice.title)}</strong><span>Official notice · ${escapeHtml((notice.observedAt || "").slice(0, 10))}</span></li>`).join("") || "";
  const related = items.related.slice(0, 4).map((event) => `<li class="child-card related"><strong>${escapeHtml(event.title)}</strong><span>Possible / indirect · ${escapeHtml(event.linkReason.replace(/-/g, " "))}</span></li>`).join("");
  const table = series ? `<table class="series-table" data-series-table><caption>Transit-call estimates (${escapeHtml(series.unit || "n_total")})</caption><thead><tr><th>Date</th><th>Value</th></tr></thead><tbody>${series.samples.map((item) => `<tr><td>${escapeHtml(item.observedAt.slice(0, 10))}</td><td>${escapeHtml(String(item.value))}</td></tr>`).join("")}</tbody></table>` : "";
  return `<div class="brief-expanded">
    ${series ? `<section><h3>Observations</h3><p>One historical series · ${series.count} samples · not ${series.count} incidents.</p>${table}</section>` : ""}
    <section><h3>Events</h3><ul>${eventCards}</ul></section>
    ${noticeCards ? `<section><h3>Official notices</h3><ul>${noticeCards}</ul></section>` : ""}
    ${related ? `<section><h3>Related context</h3><ul>${related}</ul></section>` : ""}
  </div>`;
}

export { DIRECT };
