import { escapeHtml, relativeTime } from "../events/event-normalizer.js";
import { renderMaritimeSignals } from "./maritime-signals.js";

const STATUS_ORDER = { closed: 0, "severely-disrupted": 1, disrupted: 2, restricted: 3, recovering: 4, watch: 5, unknown: 6, normal: 7 };

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

function dimensionList(assessment) {
  const dims = assessment.dimensions || {};
  const ids = ["diplomacy", "physicalAccess", "throughput", "commercialAccess"];
  return ids.map((id) => {
    const item = dims[id] || { state: "unknown", reasons: ["not assessed"] };
    const r7 = Number.isFinite(item.r7) ? ` · R7 ${item.r7.toFixed(2)}` : "";
    const evidence = (item.evidenceIds || []).length ? ` evidence ${item.evidenceIds.slice(0, 4).join(", ")}` : "";
    return `<div class="dimension-row state-${escapeHtml(item.state)}" data-dimension="${escapeHtml(id)}" data-state="${escapeHtml(item.state)}"><strong>${escapeHtml(id)}</strong><span>${escapeHtml(item.state)}${r7}</span><small>${escapeHtml((item.reasons || []).join("; ") || "unknown")}${escapeHtml(evidence)}</small></div>`;
  }).join("");
}

export function renderChokepointDetail(chokepoint, assessments = [], eventsById = new Map(), graph = null, records = [], workbenchHtml = "") {
  if (!chokepoint) return "";
  const assessment = assessmentFor(chokepoint.id, assessments);
  const developments = (assessment.topEvents || []).map((item) => {
    const event = eventsById.get(item.eventId);
    const url = safeUrl(event?.sourceUrl);
    return `<li><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(String(item.relationship || "related").replace(/-/g, " "))} - ${escapeHtml(item.sourceName || "Source")} - ${item.updatedAt ? escapeHtml(relativeTime(item.updatedAt)) : "time unavailable"}${url ? ` <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Source</a>` : ""}</span></li>`;
  }).join("") || "<li>No currently correlated events under the selected time window.</li>";
  const caveats = (assessment.caveats || []).length ? assessment.caveats.map((item) => `<li>${escapeHtml(item)}</li>`).join("") : "<li>Correlation does not establish an operational disruption or closure by itself.</li>";
  const regime = assessment.regimeDuration || {};
  const recovery = assessment.recoveryBreadth || {};
  const groups = (recovery.groups || []).map((group) => `<li>${escapeHtml(group.id)}: ${escapeHtml(group.state)}${group.passing ? " (qualifying)" : ""} — ${escapeHtml(group.reason || "")}</li>`).join("") || "<li>Recovery groups not evaluated.</li>";
  const commercial = (assessment.commercialFriction || []).map((item) => `<li>${escapeHtml(item.kind)} ${item.value ?? "unknown"} ${escapeHtml(item.unit || "")} ${escapeHtml(item.currency || "")} (${escapeHtml(item.basis || "unspecified basis")})</li>`).join("") || "<li>No sourced freight or insurance evidence.</li>";
  const diversion = assessment.flowDisplacement?.observed?.length
    ? assessment.flowDisplacement.observed.map((item) => `<li>Observed reroute via ${escapeHtml(item.route)} ${escapeHtml(item.period?.start || "")}</li>`).join("")
    : "<li>No observed diversion with an evidenced alternative route and period.</li>";
  const contradictions = (assessment.contradictions || []).map((item) => `<li>${escapeHtml(item.id)} contradicts ${escapeHtml(item.contradictsId)}</li>`).join("") || "<li>No recorded contradictions in this assessment.</li>";
  const related = (graph?.edges || []).map((edge) => `<li><span class="edge-type">${escapeHtml(edge.edgeType)}</span> ${escapeHtml(edge.fromId)} → ${escapeHtml(edge.toId)} <em>${escapeHtml(edge.assertionClass)}${edge.heuristic ? " · heuristic" : ""}</em></li>`).join("") || "<li>No bounded relationships in the current neighborhood.</li>";
  const policy = assessment.policy ? `${escapeHtml(assessment.policy.label)} ${escapeHtml(assessment.policy.version)}` : "unspecified";
  const evidenceRows = records.filter((record) => record.chokepointId === chokepoint.id).slice(0, 24).map((record) => `<li><code>${escapeHtml(record.id)}</code> · ${escapeHtml(record.evidenceKind || record.recordKind)} · ${escapeHtml(record.retrievedAt || record.observedAt || "time unknown")} · ${escapeHtml(record.valueOrigin || "unknown")} ${record.synthetic ? "· SYNTHETIC FIXTURE" : ""}</li>`).join("") || "<li>No evidence records in this assessment window.</li>";
  const missingGroups = (recovery.groups || []).filter((group) => group.state === "unknown").map((group) => group.id);
  return `<aside class="chokepoint-detail" aria-label="${escapeHtml(chokepoint.name)} details">
    <p class="fixture-banner" data-fixture-banner>${String(workbenchHtml).includes('data-genuine="1"') ? "HISTORICAL PUBLIC EXTRACT in Investigate — not a current-events claim." : "SYNTHETIC SCENARIO — software fixture, not a current-events claim."} Policy ${policy}.</p>
    <div class="v2-detail-head"><button type="button" class="v2-detail-close" data-chokepoint-clear aria-label="Close chokepoint details">x</button><div class="v2-detail-badges"><span class="category-pill">${escapeHtml(chokepoint.type.replace(/-/g, " "))}</span><span class="severity-tag chokepoint-status-${escapeHtml(assessment.status)}">${escapeHtml(String(assessment.status).replace(/-/g, " "))}</span><span class="category-pill">evidence ${escapeHtml(assessment.evidenceRank || "insufficient")}</span><span class="v2-confidence">${assessment.confidence}% confidence</span></div><h2 class="v2-detail-title">${escapeHtml(chokepoint.name)}</h2></div>
    <p class="v2-detail-summary">${escapeHtml(assessment.explanation)}</p>
    ${String(workbenchHtml).includes('data-workbench="1"') ? "" : renderMaritimeSignals(assessment.maritimeSignals)}
    ${workbenchHtml || ""}
    <dl class="v2-detail-facts"><div><dt>Last assessed</dt><dd>${assessment.updatedAt ? escapeHtml(relativeTime(assessment.updatedAt)) : "Unavailable"}</dd></div><div><dt>Known-by / as-of</dt><dd data-asof>${assessment.asOf ? escapeHtml(assessment.asOf) : "current evaluation time"}</dd></div><div><dt>Related events</dt><dd>${assessment.activeEventCount || 0}</dd></div><div><dt>Last-known operations</dt><dd>${escapeHtml(assessment.lastKnownOperationalStatus || "none")}</dd></div><div><dt>Threshold policy</dt><dd data-policy>${policy} — not production-approved</dd></div></dl>
    <section><div class="v2-section-title"><span>Independent dimensions</span></div><div class="chokepoint-dimensions dimension-grid">${dimensionList(assessment)}</div><p class="panel-help">Diplomacy, physical access, throughput and commercial access are independent. A ceasefire does not restore traffic.</p></section>
    <section><div class="v2-section-title"><span>Duration regime</span></div><p>${escapeHtml(regime.regime || "unknown")}${Number.isFinite(regime.r7) ? ` · R7 ${regime.r7.toFixed(3)}` : ""} — ${escapeHtml(regime.reason || "")}</p></section>
    <section><div class="v2-section-title"><span>Recovery breadth</span></div><p data-recovery="${escapeHtml(recovery.classification || "not-established")}">${escapeHtml(recovery.classification || "not-established")} · ${recovery.improving ?? 0}/${recovery.denominator ?? 4} qualifying groups · ${recovery.missing ?? 0} missing${missingGroups.length ? ` (kept in denominator: ${escapeHtml(missingGroups.join(", "))})` : ""}</p><ul>${groups}</ul></section>
    <section><div class="v2-section-title"><span>Evidence IDs in this as-of window</span></div><ul class="evidence-id-list">${evidenceRows}</ul></section>
    <section><div class="v2-section-title"><span>Commercial friction</span></div><ul>${commercial}</ul></section>
    <section><div class="v2-section-title"><span>Observed diversion</span></div><ul>${diversion}</ul></section>
    <section><div class="v2-section-title"><span>Current developments</span></div><ul class="chokepoint-development-list">${developments}</ul></section>
    <section><div class="v2-section-title"><span>Related evidence / graph</span></div><ul class="graph-edge-list">${related}</ul><p class="panel-help">List/inspector alternative to the 3D graph. Heuristic edges stay labeled heuristic.</p></section>
    <section><div class="v2-section-title"><span>Contradictions</span></div><ul>${contradictions}</ul></section>
    <section><div class="v2-section-title"><span>Sources and limitations</span></div><ul class="chokepoint-caveats"><li>${escapeHtml(chokepoint.limitations)}</li>${caveats}</ul></section>
    <section><div class="v2-section-title"><span>Related geography</span></div><p class="v2-empty">Adjacent countries: ${escapeHtml(chokepoint.adjacentCountries.concat(chokepoint.primaryCountries).join(", ") || "not specified")}. Related ports: ${escapeHtml((chokepoint.watchedPorts || []).join(", ") || "not specified")}.</p></section>
  </aside>`;
}
