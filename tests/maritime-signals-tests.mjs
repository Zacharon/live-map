import assert from "node:assert/strict";
import { syntheticMaritimeSignals, MARITIME_FIXTURE_NOW as now, MARITIME_FIXTURE_CHOKEPOINT as chokepointId } from "../src/data/fixtures/synthetic-maritime-signals.js";
import { assessMaritimeSignals, MARITIME_SIGNAL_IDS } from "../src/intelligence/maritime-signals.js";
import { compareThroughputRecords, evaluateChokepointOperations } from "../src/intelligence/operational-evaluator.js";
import { createEvidenceRecord } from "../src/intelligence/evidence-records.js";
import { createInvestigationCase, draftOperationalAssessment, reviewAssessment, applyEvidenceMutation } from "../src/intelligence/investigation-cycle.js";
import { serializeCase, parseCaseFile } from "../src/intelligence/case-io.js";
import { projectPublicAssessment, renderPublicMarkdown } from "../src/intelligence/public-projection.js";
import { renderInvestigationWorkbench } from "../src/ui/investigation-workbench.js";
import { renderChokepointDetail } from "../src/ui/chokepoints.js";
import { renderChokepointBriefList } from "../src/ui/chokepoint-brief.js";
import { chokepointById } from "../src/data/strategic-chokepoints.js";

const records = syntheticMaritimeSignals();
const assess = (evidence = records, extra = {}) => assessMaritimeSignals({ records: evidence, chokepointId, now, ...extra });
const signals = assess();
assert.deepEqual(Object.keys(signals), MARITIME_SIGNAL_IDS);
assert.equal(signals.visibleAIS.evidence[0].value, 0);
assert.equal(signals.cargoThroughput.state, "cargo-confirmed");
assert.deepEqual(signals.cargoThroughput.evidence.map(item => [item.value, item.basis]), [[4, "cargo-confirmed"], [7, "published-cargo-estimate"]]);
assert.equal(signals.cargoThroughput.total, undefined);
assert.equal(signals.inferredDarkTraffic.state, "inferred");
assert.equal(signals.securityRisk.evidence[0].securityState, "elevated-unresolved");
assert.equal(signals.securityRisk.confidence, "see-each-record");
assert.equal(signals.visibleAIS.evidence[0].confidence.level, "unknown");

// AIS absence/withdrawal affects visibility only; a gap alone creates no dark evidence.
const withoutAIS = assess(records.filter(item => item.id !== "fixture-ais-empty"));
assert.equal(withoutAIS.visibleAIS.state, "unknown");
assert.deepEqual(withoutAIS.cargoThroughput, signals.cargoThroughput);
assert.deepEqual(withoutAIS.securityRisk, signals.securityRisk);
assert.equal(assess(records.filter(item => item.id === "fixture-ais-empty")).inferredDarkTraffic.state, "unknown");
assert.equal(assess([]).cargoThroughput.state, "unknown");
assert.equal(assess(records.filter(item => item.id === "fixture-cargo-estimate")).cargoThroughput.state, "published-estimate");

// Measurement guards reject numeric coercion, estimates, proxies and inference.
const baseline = { value: 10, unit: "cargoes", chokepointId };
const measured = { value: 4, unit: "cargoes", chokepointId, valueOrigin: "observed" };
assert.equal(compareThroughputRecords(measured, baseline).comparable, true);
for (const value of [null, undefined, "", " ", false, [], [4], Infinity]) assert.equal(compareThroughputRecords({ ...measured, value }, baseline).comparable, false);
for (const value of [null, undefined, "", false, [], [10], Infinity]) assert.equal(compareThroughputRecords(measured, { ...baseline, value }).comparable, false);
assert.equal(compareThroughputRecords(measured, { ...baseline, valueOrigin: "modeled" }).comparable, true, "modeled expected baselines are valid references");
assert.equal(compareThroughputRecords(measured, { ...baseline, extra: { proxyNotThroughput: true } }).comparable, false);
for (const extra of [{ proxyNotThroughput: true }, { maritimeSignal: "visibleAIS" }, { darkTrafficInference: true }, { measurementBasis: "published-cargo-estimate" }]) {
  assert.equal(compareThroughputRecords({ ...measured, extra }, baseline).comparable, false);
}
for (const valueOrigin of ["inferred", "modeled"]) assert.equal(compareThroughputRecords({ ...measured, valueOrigin }, baseline).comparable, false);
const spoof = records.map(item => item.id === "fixture-cargo-confirmed" ? { ...item, valueOrigin: "inferred" } : item);
assert.equal(assess(spoof).cargoThroughput.state, "published-estimate");
assert.equal(assess(spoof).cargoThroughput.evidence[0].basis, "unconfirmed");

// Fresh retrieval cannot make stale content current; provider failures are per-signal.
const later = now + 3 * 86400000;
const refreshed = records.map(item => ({ ...item, retrievedAt: new Date(later).toISOString() }));
const stale = assess(refreshed, { now: later });
assert.equal(stale.cargoThroughput.state, "unknown");
assert.equal(stale.cargoThroughput.evidence.length, 2);
assert.ok(stale.cargoThroughput.evidence.every(item => item.freshness === "stale"));
const outage = assess(records, { sourceStatus: { "synthetic-ais": { ok: false, status: "unavailable" } } });
assert.equal(outage.visibleAIS.state, "unknown");
assert.deepEqual(outage.cargoThroughput, signals.cargoThroughput);
const retired = records.map(item => item.id === "fixture-cargo-confirmed" ? { ...item, freshnessPolicy: "source-invalidated" } : item);
assert.equal(assess(retired).cargoThroughput.state, "published-estimate");
assert.equal(assess(retired).cargoThroughput.evidence[0].freshness, "retired");

// Contradictions and different methods are inspectable; counts never get averaged.
const contested = records.map(item => item.id === "fixture-cargo-estimate" ? { ...item, extra: { ...item.extra, contradictsId: "fixture-cargo-confirmed" } } : item);
assert.equal(assess(contested).cargoThroughput.state, "contested");
assert.equal(signals.cargoThroughput.contradictions.length, 0, "different methods alone do not prove contradiction");
assert.deepEqual(assess(contested).cargoThroughput.evidence.map(item => item.value), [4, 7]);
assert.notEqual(signals.cargoThroughput.evidence[0].method, signals.cargoThroughput.evidence[1].method);
for (const item of signals.cargoThroughput.evidence) for (const key of ["sourceUrl", "observedAt", "reportedAt", "retrievedAt", "period", "coverage", "confidence", "scope", "unit"]) assert.ok(item[key], key);

// Acquisition cutoff, future observations, different geography and undated content.
assert.ok(Object.values(assess(records, { asOf: "2026-06-26T10:00:00Z" })).every(item => item.state === "unknown"));
assert.ok(Object.values(assess(records.map(item => ({ ...item, chokepointId: "suez-canal" })))).every(item => item.state === "unknown"));
const future = records.map(item => ({ ...item, observedAt: "2026-06-27T10:00:00Z" }));
assert.equal(assess(future).cargoThroughput.state, "unknown");
for (const extra of [{ forecast: true }, { conditional: true }, { scenario: true }, { observationPeriod: { start: "2026-07-01", end: "2026-07-31" } }, { day: "2026-07-01" }]) {
  const forecast = [{ ...records[2], observedAt: null, extra: { ...records[2].extra, ...extra } }];
  const signal = assess(forecast).cargoThroughput;
  assert.equal(signal.state, "unknown");
  assert.equal(signal.evidence.length, 1);
  assert.equal(signal.evidence[0].basis, "forecast-or-future-context");
  assert.equal(compareThroughputRecords(forecast[0], baseline, { now }).comparable, false);
}
const ongoing = { ...records[4], effectiveStart: "2026-06-25", effectiveEnd: "2026-06-27" };
assert.equal(assess([ongoing]).securityRisk.state, "reports-available", "notice expiry is distinct from future observation");
assert.equal(assess([{ ...records[4], reportedAt: "2027-01-01" }]).securityRisk.state, "unknown");
assert.equal(assess([{ ...records[0], valueOrigin: "inferred" }]).visibleAIS.state, "unknown");
const undated = createEvidenceRecord({ ...records[0], observedAt: null, reportedAt: null, coverage: null });
assert.equal(assess([undated]).visibleAIS.evidence[0].freshness, "unknown");
assert.equal(assess([undated]).visibleAIS.evidence[0].value, 0);

// Existing operational/workbench/export integration, with no implicit normal or safety verdict.
const chokepoint = chokepointById(chokepointId);
const operational = evaluateChokepointOperations({ chokepoint, records, now });
assert.equal(operational.dimensions.throughput.state, "unknown");
assert.equal(operational.dimensions.diplomacy.state, "unknown");
assert.deepEqual(operational.maritimeSignals, signals);
for (const kind of ["future", "stale", "forecast", "proxy-baseline"]) {
  const series = Array.from({ length: 7 }, (_, index) => {
    const date = kind === "proxy-baseline" || kind === "forecast" ? `2026-06-${20 + index}` : `2026-${kind === "stale" ? "06" : "07"}-${String(index + 1).padStart(2, "0")}`;
    return createEvidenceRecord({ ...records[2], id: `${kind}-${index}`, evidenceKind: "throughput-measurement", observedAt: kind === "forecast" ? "2026-06-25T10:00:00Z" : `${date}T10:00:00Z`, retrievedAt: "2026-06-26T11:00:00Z", value: 10, extra: { ...records[2].extra, day: date, maxAgeMs: kind === "proxy-baseline" ? 30 * 86400000 : 86400000, ...(kind === "forecast" ? { forecast: true } : {}) } });
  });
  const expected = createEvidenceRecord({ ...records[2], id: "expected", evidenceKind: "baseline-observation", observedAt: "2026-05-01T10:00:00Z", value: 10, extra: { role: "baseline", ...(kind === "proxy-baseline" ? { proxyNotThroughput: true } : {}) } });
  const evaluated = evaluateChokepointOperations({ chokepoint, records: [...series, expected], now });
  assert.equal(evaluated.dimensions.throughput.state, "unknown", kind);
}
let caseObject = createInvestigationCase({ chokepointId, now: new Date(now) });
caseObject.evidence = contested;
const draft = draftOperationalAssessment(caseObject, { now });
caseObject.assessments = [draft.assessment];
caseObject.lastOperational = draft.operational;
const markup = renderInvestigationWorkbench({ chokepoint, caseObject, open: true, tab: "assessment" });
for (const id of MARITIME_SIGNAL_IDS) assert.match(markup, new RegExp(`data-maritime-signal="${id}"`));
assert.match(markup, /Contradicts fixture-cargo-confirmed/);
assert.match(markup, /SYNTHETIC FIXTURE/);
assert.match(markup, /<summary><strong>Visible AIS observations/);
assert.match(markup, /elevated-unresolved/);
assert.match(renderChokepointDetail(chokepoint, [operational]), /data-maritime-signals/);
assert.match(renderChokepointBriefList([chokepoint], [operational], new Map(), chokepointId), /data-maritime-summary/);
const json = serializeCase(caseObject);
const parsed = parseCaseFile(json);
assert.equal(parsed.ok, true);
assert.equal(parsed.caseObject.assessments.at(-1).extra.result.maritimeSignals.cargoThroughput.state, "contested");
const markdown = renderPublicMarkdown(projectPublicAssessment(draft.assessment, caseObject, { audience: "local-preview" }));
assert.match(markdown, /Independent maritime signals/);
assert.match(markdown, /Cargo-confirmed throughput: contested/);
assert.match(markdown, /Assessed: 2026-06-26T12:00:00.000Z/);
assert.match(markdown, /known by: 2026-06-26T12:00:00.000Z/);
const undatedCargo = { ...records[2], observedAt: null, reportedAt: null, extra: { ...records[2].extra, maxAgeMs: undefined } };
const undatedDraft = draftOperationalAssessment({ ...caseObject, evidence: [undatedCargo] }, { now });
assert.match(renderPublicMarkdown(projectPublicAssessment(undatedDraft.assessment, { evidence: [undatedCargo], lastOperational: undatedDraft.operational })), /Current coverage is not established/);
const cargoCase = { ...caseObject, evidence: records.map(item => ({ ...item, evidenceKind: item.id === "fixture-cargo-confirmed" ? "throughput-measurement" : item.evidenceKind })) };
assert.doesNotMatch(renderInvestigationWorkbench({ chokepoint, caseObject: cargoCase, open: true, tab: "evidence" }), /PortWatch n_total \(AIS-derived/);
const review = reviewAssessment(draft.assessment, { now: new Date(now) });
assert.equal(review.ok, true);
caseObject.assessments = [review.assessment];
const mutation = applyEvidenceMutation(caseObject, { removeId: "fixture-cargo-confirmed", now: new Date(now) });
assert.equal(mutation.invalidated, true);
assert.equal(mutation.operational.maritimeSignals.cargoThroughput.evidence.length, 1);
console.log("maritime-signals-tests: ok (four independent signals; absence, proxy/inference guards, time, coverage, contradictions, workbench/export and review invalidation)");
