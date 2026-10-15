import { escapeHtml, relativeTime } from "../events/event-normalizer.js";
import { formatEvaluation } from "../intelligence/evaluation-vocabulary.js";
import { independenceSummary } from "../intelligence/investigation-cycle.js";
import { supportingResourcesForWatch } from "../intelligence/resource-catalog.js";
import { projectPublicAssessment, renderPublicMarkdown } from "../intelligence/public-projection.js";
import { renderMaritimeSignals } from "./maritime-signals.js";
import {isAviationCase, AVIATION_CASE_ID} from '../intelligence/aviation-incident.js';
import {renderAviationWorkbench} from './aviation-incident.js';

import { renderEvidenceDetail } from './evidence-detail.js';

const TABS = [
  ["question", "Question"],
  ["evidence", "Evidence"],
  ["assessment", "Assessment"],
  ["changes", "Changes"],
  ["export", "Export"],
];

function dimRow(id, item = {}) {
  return `<div class="dimension-row state-${escapeHtml(item.state || "unknown")}" data-dimension="${escapeHtml(id)}" data-state="${escapeHtml(item.state || "unknown")}">
    <strong>${escapeHtml(id)}</strong>
    <span>${escapeHtml(item.state || "unknown")}</span>
    <small>${escapeHtml((item.reasons || []).join("; ") || "unknown")}</small>
  </div>`;
}

function originGroups(records) {
  const groups = independenceSummary(records);
  return `<p class="panel-help">${groups.acquisitionCount} acquisition(s) · ${groups.independentOriginCount} evidential origin(s). ${escapeHtml(groups.note)}</p>
    <p class="panel-help">Independence: ${escapeHtml(groups.unknownIndependence)}</p>`;
}

function seriesChart(records = []) {
  const rows = records.filter((item) => item.evidenceKind === "throughput-measurement" && item.extra?.historicalPublic === true && item.extra?.proxyNotThroughput === true && String(item.unit || "").startsWith("n_total") && item.value != null && Number.isFinite(Number(item.value)))
    .sort((a, b) => String(a.observedAt).localeCompare(String(b.observedAt)));
  if (!rows.length) return `<p class="panel-help">No dated throughput series in this case.</p>`;
  const values = rows.map((item) => Number(item.value));
  const max = Math.max(...values, 1);
  const width = 280;
  const height = 88;
  const step = rows.length > 1 ? (width - 16) / (rows.length - 1) : 0;
  const points = rows.map((item, index) => {
    const x = 8 + index * step;
    const y = height - 12 - (Number(item.value) / max) * (height - 24);
    return `${x},${y}`;
  }).join(" ");
  const table = `<table class="series-table" data-series-table><caption>PortWatch n_total (AIS-derived estimated transit calls)</caption><thead><tr><th scope="col">Date</th><th scope="col">n_total</th><th scope="col">Unit</th></tr></thead><tbody>${rows.map((item) => `<tr><td>${escapeHtml((item.observedAt || "").slice(0, 10))}</td><td>${escapeHtml(String(item.value))}</td><td>${escapeHtml(item.unit || "n_total")}</td></tr>`).join("")}</tbody></table>`;
  return `<figure class="series-figure"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Dated n_total series">${rows.map((item, index) => {
    const x = 8 + index * step;
    const y = height - 12 - (Number(item.value) / max) * (height - 24);
    return `<circle cx="${x}" cy="${y}" r="3" fill="currentColor"></circle>`;
  }).join("")}<polyline fill="none" stroke="currentColor" stroke-width="1.5" points="${points}"></polyline></svg>${table}<figcaption>Historical extract. Not today's operating condition. Missing baseline — no R7.</figcaption></figure>`;
}

function provenanceBlock(caseObject, evidence = []) {
  const sample = evidence.find((item) => item.extra?.historicalPublic || item.extra?.frozenSample);
  if (!sample) return "";
  const dates = evidence
    .filter((item) => item.extra?.historicalPublic || item.extra?.frozenSample)
    .map((item) => String(item.observedAt || "").slice(0, 10))
    .filter(Boolean)
    .sort();
  const period = dates.length ? `${dates[0]} through ${dates.at(-1)}` : "unknown";
  const source = sample.sourceUrl || sample.extra?.landingUrl || "";
  return `<section data-provenance>
    <h3>Provenance</h3>
    <dl class="v2-detail-facts">
      <div><dt>Acquisition</dt><dd data-acquisition="historical_public">historical_public</dd></div>
      <div><dt>Source</dt><dd>${source ? `<a href="${escapeHtml(source)}" data-source-url target="_blank" rel="noopener noreferrer">${escapeHtml(source)}</a>` : "unknown"}</dd></div>
      <div><dt>Observation period</dt><dd data-observation-period>${escapeHtml(period)}</dd></div>
      <div><dt>Publication date</dt><dd data-publication-date>${escapeHtml(sample.extra?.publicationTimestamp || "unknown")} — ${escapeHtml(sample.extra?.publicationTimestampReason || "not identified by the source")}</dd></div>
      <div><dt>Retrieved</dt><dd data-retrieved-at>${escapeHtml(sample.retrievedAt || "unknown")}</dd></div>
      <div><dt>Original unit</dt><dd data-original-unit>${escapeHtml(sample.unit || "unknown")}</dd></div>
      <div><dt>Geographic coverage</dt><dd>${escapeHtml(sample.extra?.geographicCoverage || "unknown")}</dd></div>
      <div><dt>Limitations</dt><dd>${escapeHtml(sample.extra?.measurementMeaning || "unknown")}</dd></div>
      <div><dt>Reuse</dt><dd>${escapeHtml(sample.extra?.reuseTerms || sample.rightsAttribution || "unknown")}</dd></div>
    </dl>
  </section>`;
}

function dimensionOrMissing(id, item = {}) {
  const missing = !item || item.state === "unknown" || !(item.evidenceIds || []).length;
  if (missing && id !== "throughput") {
    return `<div class="dimension-row state-unknown" data-dimension="${escapeHtml(id)}" data-state="unknown"><strong>${escapeHtml(id)}</strong><span>unknown</span><small>No evidence in this case</small></div>`;
  }
  if (id === "throughput" && (!item || item.state === "unknown")) {
    return `<div class="dimension-row state-unknown" data-dimension="throughput" data-state="unknown"><strong>throughput</strong><span>unknown</span><small>Missing baseline — dated counts alone do not establish a regime</small></div>`;
  }
  return dimRow(id, item);
}

export function renderInvestigationWorkbench({
  chokepoint,
  caseObject,
  tab = "question",
  advanced = false,
  open = false,
  selectedEvidenceId = null,
  selectionNotice = null,
} = {}) {
  if (open && isAviationCase(caseObject)) return renderAviationWorkbench({caseObject, tab, selectedEvidenceId, selectionNotice});
  if (!chokepoint) return "";
  if (!open) {
    return `<p class="workbench-launch"><button type="button" class="workbench-open" data-investigate-open="${escapeHtml(chokepoint.id)}">Investigate</button>
      <span class="panel-help">Opens the evidence-to-assessment workbench for this chokepoint. Does not publish.</span></p>`;
  }
  const assessment = (caseObject?.assessments || []).at(-1);
  const operational = caseObject?.lastOperational || {};
  const dims = operational.dimensions || {};
  const evidence = caseObject?.evidence || [];
  const parked = caseObject?.parked || [];
  const claims = caseObject?.claims || [];
  const invalidation = assessment?.extra?.invalidation || (caseObject?.assessments || []).find((item) => item.extra?.reviewState === "superseded")?.extra?.invalidation;
  const projection = assessment ? projectPublicAssessment(assessment, caseObject, { audience: "local-preview" }) : null;
  const resources = supportingResourcesForWatch({ questionKind: "chokepoint-operating" });
  const requirement = caseObject?.requirement;
  const tabNav = TABS.map(([id, label]) => `<button type="button" class="workbench-tab ${tab === id ? "active" : ""}" data-investigate-tab="${id}">${label}</button>`).join("");
  let body = "";
  if (tab === "question") {
    body = `<section>
      <h3>Standing watch</h3>
      <p>${escapeHtml(requirement?.extra?.question || requirement?.summary || "")}</p>
      <dl class="v2-detail-facts">
        <div><dt>Audience</dt><dd>${escapeHtml(requirement?.extra?.audience || "local-analyst")}</dd></div>
        <div><dt>Definition of done</dt><dd>${escapeHtml(requirement?.extra?.definitionOfDone || "")}</dd></div>
        <div><dt>Status</dt><dd>${escapeHtml(requirement?.extra?.status || "active")}</dd></div>
      </dl>
      <h3>Find supporting sources</h3>
      <p class="panel-help">Catalog entries are discovery leads. Upstream “live” is not a Live Map provider. Open resource / read method only.</p>
      <ul class="catalog-list">${resources.map((item) => `<li>
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.resourceKind)} · local ${escapeHtml(item.implementationStatus)} · upstream ${escapeHtml(item.upstreamStatus || "n/a")}</span>
        <span>automation ${item.automationEnabled ? "enabled" : "off"}</span>
        ${item.sourceUrl ? `<a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener noreferrer" data-external-resource>Open resource</a>` : ""}
      </li>`).join("")}</ul>
    </section>`;
  } else if (tab === "evidence") {
    const selectedClaim = claims[0];
    const evalText = selectedClaim ? formatEvaluation(
      caseObject.sourceEvaluations?.[0],
      selectedClaim.extra?.credibility,
      { advanced },
    ) : null;
    body = `<section>
      ${provenanceBlock(caseObject, evidence)}
      ${originGroups(evidence)}
      ${evalText ? `<p>Source reliability: ${escapeHtml(evalText.sourceReliability)}. Claim credibility: ${escapeHtml(evalText.informationCredibility)}.${evalText.codes ? ` Codes ${escapeHtml(evalText.codes)} (not a probability).` : ""}</p>` : ""}
      ${seriesChart(evidence)}
      ${selectionNotice ? `<p class="panel-help" role="status" data-evidence-notice>${escapeHtml(selectionNotice)}</p>` : ""}
      <h3>In-scope evidence</h3>
      <p class="panel-help">Choose a record below to inspect it directly.</p>
      ${renderEvidenceDetail(evidence.find(record => record.id === selectedEvidenceId))}
      <ul class="evidence-id-list">${evidence.map((record) => `<li>
        <button type="button" data-evidence-select="${escapeHtml(record.id)}" aria-pressed="${record.id === selectedEvidenceId}"><code>${escapeHtml(record.id)}</code></button> · ${escapeHtml(record.evidenceKind)} · ${escapeHtml(record.valueOrigin)} · rev ${record.revision || 1}
        ${record.synthetic ? "· SYNTHETIC FIXTURE" : record.extra?.frozenSample ? "· HISTORICAL PUBLIC EXTRACT" : ""}
        ${record.extra?.contradictsId ? `· contradicts ${escapeHtml(record.extra.contradictsId)}` : ""}
      </li>`).join("") || "<li>None attached.</li>"}</ul>
      <h3>Claims</h3>
      <ul>${claims.map((claim) => `<li><strong>${escapeHtml(claim.title)}</strong><br /><span>${escapeHtml(claim.extra?.credibility?.rationale || "")}</span>
        <br /><span>Support ${claim.extra?.independence?.independentOriginCount || 0} origin(s); ${claim.extra?.independence?.acquisitionCount || 0} acquisition(s).</span></li>`).join("") || "<li>No claims yet.</li>"}</ul>
      <h3>Parked (out of scope)</h3>
      <ul>${parked.map((item) => `<li>${escapeHtml(item.record?.id || "record")} — ${escapeHtml(item.reason)}</li>`).join("") || "<li>None parked.</li>"}</ul>
      <p class="panel-help">A reviewed official notice can be shown as issued without a second source. That is not measured closure and not independent corroboration of traffic.</p>
    </section>`;
  } else if (tab === "assessment") {
    body = `<section>
      <p class="fixture-banner" data-fixture-banner>${caseObject?.genuine ? "HISTORICAL PUBLIC EXTRACT — not a current-events claim. Human review pending." : "SYNTHETIC SCENARIO — software fixture, not a current-events claim."} Thresholds engineering-default-unvalidated.</p>
      <p>${escapeHtml(assessment?.summary || operational.explanation || "No draft yet.")}</p>
      ${renderMaritimeSignals(operational.maritimeSignals || assessment?.extra?.result?.maritimeSignals)}
      <div class="chokepoint-dimensions dimension-grid">
        ${dimensionOrMissing("diplomacy", dims.diplomacy)}
        ${dimensionOrMissing("physicalAccess", dims.physicalAccess)}
        ${dimensionOrMissing("throughput", dims.throughput)}
        ${dimensionOrMissing("commercialAccess", dims.commercialAccess)}
      </div>
      <p class="panel-help">These are independent operating dimensions, not a 0–10 risk score.</p>
      <dl class="v2-detail-facts">
        <div><dt>Review state</dt><dd data-review-state>${escapeHtml(assessment?.extra?.reviewState || "draft")}</dd></div>
        <div><dt>Applicability</dt><dd>${escapeHtml(assessment?.extra?.currentApplicability || "current")}</dd></div>
        <div><dt>Input digest</dt><dd><code>${escapeHtml(assessment?.extra?.inputDigest || "")}</code></dd></div>
        <div><dt>As-of / knowledge cutoff</dt><dd data-asof>${escapeHtml(assessment?.extra?.knowledgeCutoff || "")}</dd></div>
      </dl>
      <h3>Contradictions</h3>
      <ul>${(assessment?.extra?.contradictions || []).map((item) => `<li>${escapeHtml(item.id)} contradicts ${escapeHtml(item.contradictsId)}</li>`).join("") || "<li>None recorded — absence is not proof of agreement.</li>"}</ul>
      ${caseObject?.genuine ? `<p class="panel-help" data-human-review-pending>Human review pending. This desk will not auto-approve a genuine case.</p>` : `<button type="button" data-investigate-review>Review this exact local draft</button>
      <p class="panel-help">Review binds this content, input revisions, policy version, and audience. Imported approved=true cannot do this. Synthetic/test only.</p>`}
    </section>`;
  } else if (tab === "changes") {
    body = `<section>
      ${invalidation ? `<p class="invalidation-banner" data-invalidation="${escapeHtml(invalidation.reason)}">Previous approval is not current. Reason: ${escapeHtml(invalidation.reason)}. Changed input: ${escapeHtml(invalidation.changedInput || "see history")}.</p>` : `<p class="panel-help">No invalidation in this session. Mutate evidence to test re-evaluation.</p>`}
      <p class="panel-help" data-source-retirement>Invalidating or aging out a source removes operating conclusions that depended on it. Diplomacy can improve while throughput stays disrupted or unknown. The historical extract stays historical_public.</p>
      ${caseObject?.genuine ? `<p class="panel-help">Genuine package is immutable in this desk. Isolated test-only clones exercise withdrawal.</p>` : `<button type="button" data-investigate-remove="syn-t-06-12">Remove 2026-06-12 throughput observation</button>
      <button type="button" data-investigate-refresh="syn-restriction-1">Refresh retrievedAt only</button>`}
      <h3>History</h3>
      <ul>${(caseObject?.history || []).map((item) => `<li>${escapeHtml(item.type)} · ${escapeHtml(item.at || "")} · ${escapeHtml(item.id || item.note || "")}</li>`).join("") || "<li>No history.</li>"}</ul>
      <p class="panel-help">A retrieval timestamp refresh must not revive stale factual content. Historical products stay historical.</p>
    </section>`;
  } else {
    const markdown = projection ? renderPublicMarkdown(projection) : "";
    body = `<section>
      <p class="panel-help">Local download only. No email, webhook, or production write.</p>
      <pre class="export-preview">${escapeHtml(markdown.slice(0, 4000))}</pre>
      <button type="button" data-investigate-export="markdown">Download Markdown product</button>
      <button type="button" data-investigate-export="json">Download versioned JSON case</button>
      <label class="import-label">Import public-safe JSON<input type="file" accept="application/json,.json" data-investigate-import /></label>
      ${caseObject?.unsaved ? `<p class="panel-help">Unsaved local changes.</p>` : ""}
    </section>`;
  }
  const relations = (caseObject?.relationships || []).map((edge) => `<li data-edge-id="${escapeHtml(edge.id)}"><span class="edge-type">${escapeHtml(edge.extra?.edgeType || "related")}</span> ${escapeHtml(edge.extra?.fromId || "")} → ${escapeHtml(edge.extra?.toId || "")} · ${escapeHtml(edge.extra?.assertionClass || "")}</li>`).join("") || "<li>No typed relationships in this case.</li>";
  const caseMode = `<label class="case-mode">Case <select data-investigate-case aria-label="Investigation case">${caseObject?.genuine ? `<option value="portwatch-hormuz-2025-01" selected>Historical PortWatch 2025-01</option><option value="synthetic-hormuz-2026-06">Synthetic fixture</option>` : `<option value="synthetic-hormuz-2026-06" selected>Synthetic fixture</option><option value="portwatch-hormuz-2025-01">Historical PortWatch 2025-01</option>`}<option value="${AVIATION_CASE_ID}">Riyadh October 10–11 reporting</option></select></label>`;
  return `<div class="investigation-workbench" data-workbench="1" data-workbench-tab="${escapeHtml(tab)}" data-genuine="${caseObject?.genuine ? "1" : "0"}">
    <div class="workbench-head">
      <strong>Investigate</strong>
      <span>${escapeHtml(chokepoint.name)}</span>
      ${caseMode}
      <button type="button" data-investigate-close>Close workbench</button>
    </div>
    <nav class="workbench-tabs" aria-label="Investigation sections">${tabNav}</nav>
    ${body}
    ${tab === "evidence" ? `<section><h3>Relationships</h3><ul class="graph-edge-list" data-relationship-list>${relations}</ul><p class="panel-help">Keyboard-readable list. collected_with is collection, not corroboration.</p></section>` : ""}
  </div>`;
}

export function workbenchFilename(kind, caseObject = null) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  if (isAviationCase(caseObject)) return `${AVIATION_CASE_ID}-${stamp}.json`;
  return kind === "markdown" ? `hormuz-assessment-${stamp}.md` : `hormuz-case-${stamp}.json`;
}

export { relativeTime };
