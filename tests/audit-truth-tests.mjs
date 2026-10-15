import assert from "node:assert/strict";
import { createNormalizedEvent, isValidCoordinate, toLegacyEvent } from "../src/events/normalized-event.js";
import { normalizeEvent, exactTime, relativeTime } from "../src/events/event-normalizer.js";
import { computeQualityDimensions, normalizeVerificationStatus } from "../src/events/event-quality.js";
import { groupEvents, sortEvents } from "../src/events/feed-organization.js";
import { resolveConfidence, buildEventArtifact } from "../src/artifacts/event-artifacts.js";
import { renderEventDetailDrawer } from "../src/ui/osint-dashboard-v2/event-detail-drawer.js";
import { sourceIndependence } from "../src/intelligence/source-independence.js";
import { workspaceCoverage } from "../src/ui/watch-workspace.js";
import { normalizeUsgsFeature } from "../src/data/providers/usgs.js";

const base = { id: "unknown-evidence", provider: "test", title: "Undated report", category: "other", sourceUrl: "https://example.com/report", geographic: false, ingestedAt: "2026-09-30T00:00:00Z" };
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`PASS ${name}`); };
test('Coverage never promotes absent or degraded diagnostics', () => {
  assert.equal(workspaceCoverage({ apiStatus: 'ready' }).status, 'unknown');
  assert.equal(workspaceCoverage({ apiStatus: 'ready', sourceStatus: { x: { ok: true, status: 'degraded' } } }).status, 'partial');
  assert.equal(workspaceCoverage({ apiStatus: 'ready', sourceStatus: { x: { ok: true, stale: true } } }).status, 'partial');
  assert.equal(workspaceCoverage({ apiStatus: 'error', apiFailure: { message: 'failed' } }).status, 'unavailable');
});
test('USGS missing depth remains unknown while zero depth survives', () => {
  for (const depth of [null, '', ' ', undefined]) {
    const result = normalizeUsgsFeature({ id: 'missing-depth', geometry: { coordinates: [0, 0, depth] }, properties: { mag: 4, status: 'reviewed' } });
    assert.equal(result.event.metadata.depthKm, null);
    assert.match(result.event.description, /unknown.*km depth/);
  }
  assert.equal(normalizeUsgsFeature({ geometry: { coordinates: [0, 0, 0] }, properties: { mag: 4 } }).event.metadata.depthKm, 0);
});
test("Coordinates reject coercible missing/container values while retaining zero", () => {
  for (const value of [null, undefined, "", " ", false, true, [], [0], {}]) assert.equal(isValidCoordinate(value, value), false, String(value));
  assert.equal(isValidCoordinate(0, 0), true);
  assert.equal(isValidCoordinate("0", "0"), true);
  assert.equal(isValidCoordinate(91, 0), false);
});
test("Unknowns survive canonical to legacy to frontend to inspector and export", () => {
  const { event, valid } = createNormalizedEvent(base);
  assert.equal(valid, true);
  for (const key of ["startedAt", "updatedAt", "sourcePublishedAt", "lastVerifiedAt", "confidence", "freshnessScore", "impactScore", "independentSourceCount"]) assert.equal(event[key], null, key);
  assert.equal(event.sourceType, "Unknown");
  const browser = normalizeEvent(toLegacyEvent(event));
  for (const key of ["occurredAt", "updatedAt", "firstReportedAt", "lastVerifiedAt", "confidence", "freshnessScore", "impactScore"]) assert.equal(browser[key], null, key);
  assert.equal(browser.geographic, false);
  assert.equal(browser.mapDisplayStatus, "not-mapped");
  assert.equal(resolveConfidence(browser).mode, "not-scored");
  const html = renderEventDetailDrawer(browser);
  assert.match(html, /Not supplied/);
  assert.doesNotMatch(html, /1970|NaN|Invalid Date|just now|null%|0% confidence/);
  const artifact = buildEventArtifact(browser);
  assert.equal(artifact.confidence.score, null);
});
test("Clocks are distinct; zero confidence and epoch occurrence survive", () => {
  const { event } = createNormalizedEvent({ ...base, startedAt: 0, sourcePublishedAt: "2026-09-29T00:00:00Z", confidence: 0 });
  assert.equal(event.startedAt, "1970-01-01T00:00:00.000Z");
  assert.equal(event.updatedAt, null);
  assert.equal(event.lastVerifiedAt, null);
  assert.equal(normalizeEvent(toLegacyEvent(event)).confidence, 0);
  const exported = buildEventArtifact(normalizeEvent(toLegacyEvent(event)));
  assert.equal(exported.occurredAt, 0);
  assert.equal(exported.updatedAt, null);
  assert.equal(relativeTime(null), "Time unknown");
  assert.equal(exactTime(null), "Not supplied");
});
test("Verification is an exact allowlist with explicit legacy alias", () => {
  for (const value of ["not-primary-confirmed", "unconfirmed-primary", "not-provider-reviewed", "", null]) assert.equal(normalizeVerificationStatus(value), "unverified");
  assert.equal(normalizeVerificationStatus("Primary confirmed"), "primary-confirmed");
  assert.equal(normalizeVerificationStatus("Provider reviewed"), "primary-confirmed");
  assert.equal(normalizeEvent({ ...base, metadata: { verificationStatus: "retracted" } }).verificationStatus, "retracted");
});
test("Freshness, attention, impact and independent support remain separate", () => {
  const now = Date.parse("2026-09-30T00:00:00Z");
  const a = computeQualityDimensions({ severityScore: 60, sourceCount: 100, metadata: { mergedSources: Array(100).fill({ provider: "mirror" }) } }, now);
  assert.equal(a.freshnessScore, null);
  assert.equal(a.independentSourceCount, null);
  assert.equal(a.corroborationScore, null);
  assert.equal(a.impactScore, null);
  const b = computeQualityDimensions({ severityScore: 60, updatedAt: now, independentSourceCount: 3 }, now);
  assert.ok(b.attentionScore > a.attentionScore);
  assert.equal(b.impactScore, null);
  assert.equal(computeQualityDimensions({ updatedAt: now + 1000 }, now).freshnessScore, null);
  assert.equal(computeQualityDimensions({ impactScore: 0 }, now).impactScore, 0);
  assert.equal(sourceIndependence({ id: "a" }, { id: "b" }).independent, false);
});
test("Undated records group safely and unknown scores sort after numeric zero", () => {
  assert.equal(groupEvents([{ id: "missing", occurredAt: null }], "day")[0].label, "Time unknown");
  assert.equal(groupEvents([{ id: "invalid", occurredAt: NaN }], "hour")[0].label, "Time unknown");
  assert.equal(sortEvents([{ id: "a", confidence: null }, { id: "b", confidence: 0 }], "highest-confidence")[0].id, "b");
});
console.log(`${passed} audit truth journeys passed.`);
