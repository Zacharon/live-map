import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { safeSourceUrl, sourceLink } from "../src/sources/source-url.js";
import { timestampMs, confidenceValue } from "../src/events/event-values.js";
import { createNormalizedEvent, toLegacyEvent, validateNormalizedEvent } from "../src/events/normalized-event.js";
import { normalizeEvent, relativeTime, exactTime } from "../src/events/event-normalizer.js";
import { normalizeFeedItem, observationFromFeedItem } from "../src/data/providers/rss-feed.js";
import { canonicalizeObservationUrl } from "../src/intelligence/source-observations.js";
import { renderEventDetailDrawer } from "../src/ui/osint-dashboard-v2/event-detail-drawer.js";
import { openEventDialog } from "../src/ui/dialogs.js";
import { renderProviderHealthPanel } from "../src/ui/provider-health-panel.js";
import { renderChokepointDetail } from "../src/ui/chokepoints.js";
import { STRATEGIC_CHOKEPOINTS } from "../src/data/strategic-chokepoints.js";
import { buildEventArtifact, resolveConfidence } from "../src/artifacts/event-artifacts.js";
import { computeThreatLevel } from "../src/intelligence/threat-level.js";
import { groupEvents, groupStats, sortEvents } from "../src/events/feed-organization.js";
import { timelineBucketForEvent } from "../src/events/timeline.js";
import { filteredEvents } from "../src/events/event-filters.js";
import { buildIncidents, shouldCluster } from "../src/events/incident-clustering.js";
import { mergeDuplicateEvents, arePotentialDuplicates } from "../src/events/event-deduplication.js";
import { normalizeUsgsFeature, USGS_FEED_URL } from "../src/data/providers/usgs.js";
import { normalizeCisaKevItem } from "../src/data/providers/cisa-kev.js";
import { normalizeGdeltArticle } from "../src/data/providers/gdelt.js";
import { normalizeEonetEvent } from "../src/data/providers/eonet.js";
import { normalizeNwsAlert } from "../src/data/providers/nws.js";
import { normalizeNvdCve } from "../src/data/providers/nvd.js";
import { normalizeReliefWebRecord } from "../src/data/providers/reliefweb.js";
import { normalizeSecFiling } from "../src/data/providers/sec-edgar.js";
import { normalizeFredObservation } from "../src/data/providers/fred.js";
import { normalizeEiaRecord } from "../src/data/providers/eia.js";
import { normalizeFirmsRow } from "../src/data/providers/firms.js";
import { normalizeGdacsFeature } from "../src/data/providers/gdacs.js";
import { normalizeRipestatObservation } from "../src/data/providers/ripestat.js";
import { createSeriesObservation } from "../src/data/providers/finance-records.js";
import { normalizeStatuspageIncident } from "../src/data/providers/statuspage.js";
import { assertValidUrl, checkUrls } from "../scripts/lib/live-map-checks.mjs";

const now = new Date("2026-10-12T12:00:00Z");
const input = { id: "synthetic", provider: "test", title: "Synthetic record", category: "other", geographic: false, sourceUrl: "https://example.com/event", ingestedAt: now };
const feed = { id: "test", providerId: "security-rss", domain: "technology-cyber", category: "cyber", name: "Synthetic feed" };
const invalidUrls = ["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "mailto:test@example.com", "ftp://example.com", "/relative", "//example.com", "https:example.com", "http:/example.com", "https://user:pass@example.com/", "https://user@example.com/", "https://:pass@example.com/", "not a URL", "", null, {}, "https://"];

for (const url of invalidUrls) {
  test(`Reject source URL ${JSON.stringify(url)}`, () => {
    assert.equal(safeSourceUrl(url), null);
    assert.equal(assertValidUrl(url), false);
    assert.doesNotMatch(sourceLink(url, "Source"), /<a\b|href=/);
    assert.equal(canonicalizeObservationUrl(url), "");
    const result = createNormalizedEvent({ ...input, sourceUrl: url });
    assert.equal(result.event.sourceUrl, null);
    if (url != null && url !== "") assert.equal(result.valid, false);
    assert.equal(validateNormalizedEvent({ ...result.event, sourceUrl: url }).valid, url === null);
    assert.equal(normalizeFeedItem({ title: "Synthetic", link: url }, feed, now).event, null);
    const raw = normalizeEvent({ ...input, sourceUrl: url, providerUrl: url });
    assert.equal(raw.sourceUrl, null);
    const drawer = renderEventDetailDrawer({ ...raw, sourceUrl: url, providerUrl: url });
    assert.doesNotMatch(drawer, /href="(?:javascript:|data:|mailto:|ftp:|https?:\/\/[^"/]*@)/i);
  });
}

for (const url of ["http://example.com/event?a=1&b=2", "https://example.com/event?q='><script>unsafe</script>&a=1", "HTTPS://example.com/path"]) {
  test(`Allow and escape web source ${url}`, () => {
    assert.ok(safeSourceUrl(url));
    assert.equal(normalizeFeedItem({ title: "Synthetic", link: url }, feed, now).errors.length, 0);
    const html = sourceLink(url, '<img src=x onerror="unsafe">', 'x" onclick="unsafe');
    assert.doesNotMatch(html, /<script>|<img|class="x" onclick=/);
    assert.match(html, /rel="noopener noreferrer"/);
    assert.match(html, /&quot;|&amp;/);
  });
}

test("Every ordinary event link boundary refuses imported unsafe links", () => {
  const event = { ...normalizeEvent(input), lat: 1, lon: 2, sourceUrl: "javascript:alert(1)", providerUrl: "https://user:pass@example.com/", title: '<img src=x onerror="attack">' };
  const content = {};
  let opened = false;
  openEventDialog(event, { showModal() { opened = true; } }, content, { getZoom() { return 3; }, flyTo() {} });
  assert.equal(opened, true);
  assert.doesNotMatch(content.innerHTML, /href="javascript:|href="https:\/\/user:pass@|<img/);
  const health = renderProviderHealthPanel({ test: { ok: true, url: "data:text/html,attack" } });
  assert.doesNotMatch(health, /href=/);
  const chokepoint = STRATEGIC_CHOKEPOINTS[0];
  const assessment = { chokepointId: chokepoint.id, status: "unknown", confidence: 0, activeEventCount: 1, updatedAt: null, explanation: "Synthetic", operationalDimensions: [], topEvents: [{ eventId: event.id, relationship: "directly-references" }], caveats: [] };
  const html = renderChokepointDetail(chokepoint, [assessment], new Map([[event.id, event]]));
  assert.doesNotMatch(html, /href="javascript:|href="https:\/\/user:pass@/);
});

for (const value of [undefined, null, "", " ", "bad", NaN, Infinity, false, [], {}]) {
  test(`Unknown confidence remains null: ${String(value)}`, () => {
    const canonical = createNormalizedEvent({ ...input, confidence: value }).event;
    const event = normalizeEvent(toLegacyEvent(canonical));
    assert.equal(confidenceValue(value), null);
    assert.equal(canonical.confidence, null);
    assert.equal(event.confidence, null);
    assert.equal(resolveConfidence(event).mode, "not-scored");
    assert.ok(computeThreatLevel(event).caveats.includes("Confidence not scored on this record."));
    assert.match(renderEventDetailDrawer(event), /Not scored/);
  });
}

test("Real zero confidence survives all normalizers, display, and artifacts", () => {
  const canonical = createNormalizedEvent({ ...input, confidence: 0 }).event;
  const event = normalizeEvent(toLegacyEvent(canonical));
  assert.equal(event.confidence, 0);
  assert.equal(resolveConfidence(event).score, 0);
  assert.match(renderEventDetailDrawer(event), /0% confidence/);
  assert.equal(buildEventArtifact(event).confidence.score, 0);
});

for (const value of [undefined, null, "", "bad", NaN, Infinity, false, [], {}]) {
  test(`Unknown clocks remain null and distinct from ingestion: ${String(value)}`, () => {
    const canonical = createNormalizedEvent({ ...input, startedAt: value, updatedAt: value, sourcePublishedAt: value, lastVerifiedAt: value }).event;
    const event = normalizeEvent(toLegacyEvent(canonical));
    assert.equal(canonical.startedAt, null);
    assert.equal(canonical.updatedAt, null);
    assert.equal(canonical.sourcePublishedAt, null);
    assert.equal(canonical.lastVerifiedAt, null);
    assert.equal(canonical.ingestedAt, now.toISOString());
    assert.equal(event.occurredAt, null);
    assert.equal(event.updatedAt, null);
    assert.equal(event.freshnessScore, null);
    assert.match(renderEventDetailDrawer(event), /Source occurrence time is unknown/);
    assert.doesNotMatch(renderEventDetailDrawer(event), /matches active filters and time window/);
    // Candidate wording (audit-truth-tests): unknown relative/exact clocks stay explicit.
    assert.equal(relativeTime(value), "Time unknown");
    assert.equal(exactTime(value), "Not supplied");
    assert.equal(timelineBucketForEvent(event, now.getTime()), "older");
    assert.equal(groupEvents([event], "day")[0].label, "Time unknown");
    assert.equal(buildIncidents([event])[0].startedAt, null);
    assert.equal(buildIncidents([event])[0].confidence, null);
    assert.equal(shouldCluster(event, { ...event, id: "other" }), false);
    const filters = { categories: new Set(["other"]), severities: new Set(["low"]), query: "" };
    // Undated records stay inspectable under an explicit "Time unknown" label; they are never given ingestion time.
    assert.equal(filteredEvents([event], filters, 168, "newest").length, 1);
  });
}

test("Valid clocks and zero epoch remain valid; missing updates are never invented", () => {
  assert.equal(timestampMs(0), 0);
  assert.equal(exactTime(0), new Date(0).toLocaleString([], { dateStyle: "medium", timeStyle: "long", timeZone: "UTC" }));
  const canonical = createNormalizedEvent({ ...input, startedAt: "2026-10-11T08:00:00Z", confidence: 48 }).event;
  assert.equal(canonical.startedAt, "2026-10-11T08:00:00.000Z");
  assert.equal(canonical.updatedAt, null);
  assert.equal(canonical.sourcePublishedAt, null);
  assert.equal(toLegacyEvent(canonical).lastVerifiedAt, null);
  const knownOccurrence = normalizeEvent(toLegacyEvent(canonical));
  const artifact = buildEventArtifact(knownOccurrence);
  assert.equal(artifact.updatedAt, null);
  assert.equal(artifact.normalizedFields.find((field) => field.key === "updated_at").value, null);
  assert.equal(buildEventArtifact({ ...knownOccurrence, occurredAt: 0, updatedAt: 0 }).updatedAt, 0);
  const rows = [normalizeEvent(input), normalizeEvent({ ...input, id: "zero", confidence: 0 }), normalizeEvent({ ...input, id: "known", confidence: 48, occurredAt: now.getTime() })];
  assert.deepEqual(sortEvents(rows, "highest-confidence").map((e) => e.id), ["known", "zero", "synthetic"]);
  assert.equal(sortEvents(rows, "newest-occurred")[0].id, "known");
});

test("Undated RSS, observations, USGS, CISA and GDELT retain missing source time", () => {
  const item = { title: "Synthetic", link: "https://example.com/undated" };
  const rss = normalizeFeedItem(item, feed, now).event;
  assert.equal(rss.startedAt, null);
  assert.equal(rss.updatedAt, null);
  assert.equal(observationFromFeedItem(item, feed, now).observedAt, null);
  const usgs = normalizeUsgsFeature({ id: "undated", geometry: { coordinates: [2, 1] }, properties: { title: "Synthetic", url: input.sourceUrl } }, now).event;
  const cisa = normalizeCisaKevItem({ cveID: "CVE-2026-0000" }, now).event;
  const gdelt = normalizeGdeltArticle({ title: "Synthetic", url: input.sourceUrl }, {}, now).event;
  for (const event of [usgs, cisa, gdelt]) {
    assert.ok(event);
    assert.equal(event.startedAt, null);
    assert.equal(event.updatedAt, null);
    assert.equal(event.ingestedAt, now.toISOString());
  }
});

test("Deduplication retains unknown values and refuses temporal inference without clocks", () => {
  const canonical = createNormalizedEvent({ ...input, providerEventId: "same" }).event;
  const merged = mergeDuplicateEvents([canonical, { ...canonical, id: "copy" }]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].confidence, null);
  assert.equal(merged[0].startedAt, null);
  assert.equal(merged[0].updatedAt, null);
  assert.equal(arePotentialDuplicates({ ...canonical, provider: "a" }, { ...canonical, provider: "b" }), false);
});

test("All repaired event adapters keep undated records distinct from ingestion", () => {
  const eonet = normalizeEonetEvent({ id: "undated", title: "Synthetic", categories: [{ title: "Wildfires" }], geometry: [{ type: "Point", coordinates: [2, 1] }], sources: [{ url: input.sourceUrl }] }, now);
  const nws = normalizeNwsAlert({ properties: { web: input.sourceUrl } }, now);
  const nvd = normalizeNvdCve({ cve: { id: "CVE-2026-0001", descriptions: [] } }, now);
  const relief = normalizeReliefWebRecord({ id: "synthetic", fields: { title: "Synthetic", url: input.sourceUrl, country: [{ name: "Sudan", iso3: "SDN" }] } }, now);
  const sec = normalizeSecFiling({ form: "8-K", accessionNumber: "0000000001-26-000001" }, { cik: "1", companyName: "Synthetic" }, now);
  const fred = normalizeFredObservation({ id: "TEST", materialChange: 1 }, { value: "10" }, { value: "1" }, {}, now);
  const eia = normalizeEiaRecord({ id: "test", route: "test", seriesId: "TEST", commodity: "test", type: "inventory-release", materialChange: 1 }, { value: "10" }, { value: "1" }, now);
  const firms = normalizeFirmsRow({ latitude: 1, longitude: 2 }, now);
  const gdacs = normalizeGdacsFeature({ id: "synthetic", geometry: { type: "Point", coordinates: [2, 1] }, properties: { name: "Synthetic", eventtype: "EQ", url: { report: input.sourceUrl } } }, now);
  const ripe = normalizeRipestatObservation("AS1", { data: { visibility: 0.1 } }, now);
  for (const [name, result] of Object.entries({ eonet, nws, nvd, relief, sec, fred, eia, firms, gdacs, ripe })) {
    assert.ok(result.event, `${name}: ${result.errors}`);
    assert.equal(result.event.startedAt, null, name);
    assert.equal(result.event.updatedAt, null, name);
    assert.equal(result.event.ingestedAt, now.toISOString(), name);
  }
});

test("Series observations share URL/confidence validation without inventing clocks", () => {
  const unknown = createSeriesObservation({ sourceUrl: "javascript:attack" });
  assert.equal(unknown.sourceUrl, null);
  assert.equal(unknown.confidence, null);
  assert.equal(unknown.occurredAt, null);
  assert.equal(unknown.updatedAt, null);
  assert.equal(createSeriesObservation({ confidence: 0, occurredAt: "2026-10-11" }).confidence, 0);
  assert.equal(createSeriesObservation({ occurredAt: "2026-10-11" }).occurredAt, "2026-10-11");
});

test("Statuspage absence never becomes ingestion recency; valid source clocks are retained", () => {
  const page = { id: "fixture", name: "Synthetic", domain: "technology-cyber", category: "cyber", type: "service-outage", homepageUrl: "https://example.com/" };
  const incident = { id: "undated", name: "Synthetic incident", status: "investigating", impact: "minor" };
  const missing = normalizeStatuspageIncident(incident, page, now).event;
  assert.ok(missing);
  for (const key of ["startedAt", "updatedAt", "sourcePublishedAt"]) assert.equal(missing[key], null, key);
  assert.equal(missing.ingestedAt, now.toISOString());
  assert.equal(missing.freshnessScore, null);
  const event = normalizeEvent(toLegacyEvent(missing));
  const filters = { categories: new Set([event.category]), severities: new Set([event.severity]), query: "" };
  assert.equal(filteredEvents([event], filters, 168, "newest").length, 1);
  const dated = normalizeStatuspageIncident({ ...incident, created_at: "2026-10-11T08:00:00Z", updated_at: "2026-10-11T09:00:00Z" }, page, now).event;
  assert.equal(dated.startedAt, "2026-10-11T08:00:00.000Z");
  assert.equal(dated.sourcePublishedAt, dated.startedAt);
  assert.equal(dated.updatedAt, "2026-10-11T09:00:00.000Z");
  assert.equal(normalizeStatuspageIncident({ ...incident, created_at: dated.startedAt }, page, now).event.updatedAt, null);
});

test("Grouped update summaries only report actual updates, with unknown and epoch retained", () => {
  const event = { ...normalizeEvent(input), occurredAt: Date.now(), updatedAt: null };
  assert.equal(groupStats([event]).newestUpdate, "unknown");
  assert.equal(groupEvents([event], "domain")[0].stats.newestUpdate, "unknown");
  assert.equal(groupStats([]).newestUpdate, "unknown");
  assert.equal(groupStats([{ ...event, updatedAt: 0 }]).newestUpdate, relativeTime(0));
  const actual = Date.now();
  assert.equal(groupStats([event, { ...event, updatedAt: actual }]).newestUpdate, relativeTime(actual));
});

test("Obsolete USGS docs references are removed while the functional feed is unchanged", () => {
  // The browser direct-USGS fallback was removed, so app-controller no longer carries a USGS URL.
  assert.doesNotMatch(fs.readFileSync("src/app-controller.js", "utf8"), /["']https:\/\/earthquake\.usgs\.gov\/earthquakes\/feed\/["']/);
  for (const file of ["src/data/providers/registry.js", "src/data/providers/source-registry.js", "src/data/layers.js", "src/data/providers/usgs.js"]) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /["']https:\/\/earthquake\.usgs\.gov\/earthquakes\/feed\/["']/);
    assert.match(source, /https:\/\/earthquake\.usgs\.gov\/earthquakes\/feed\/v1\.0\/geojson\.php/);
  }
  assert.equal(USGS_FEED_URL, "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson");
});

test("CI enforces focused regressions and CodeQL failure without activating smoke", () => {
  assert.doesNotMatch(fs.readFileSync(".github/workflows/security.yml", "utf8"), /continue-on-error:\s*true/);
  assert.match(fs.readFileSync(".github/workflows/validate.yml", "utf8"), /npm run test:platform && npm run test:audit-repair/);
});

test("Source URL check retries a transient failure once and keeps hard failures", async () => {
  const realFetch = globalThis.fetch;
  const calls = {};
  const plan = {
    "https://slow.example/": [() => { throw new Error("This operation was aborted"); }, () => new Response(null, { status: 200 })],
    "https://busy.example/": [() => new Response(null, { status: 503 }), () => new Response(null, { status: 503 })],
    "https://gone.example/": [() => new Response(null, { status: 404 })]
  };
  globalThis.fetch = async (url) => {
    calls[url] = (calls[url] || 0) + 1;
    return plan[url][calls[url] - 1]();
  };
  const results = [];
  const reporter = { pass: (name, detail) => results.push(["pass", detail]), fail: (name, detail) => results.push(["fail", detail]) };
  try {
    await checkUrls(Object.keys(plan), reporter, "source URLs", { retryDelayMs: 0 });
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.deepEqual(calls, { "https://slow.example/": 2, "https://busy.example/": 2, "https://gone.example/": 1 });
  assert.deepEqual(results, [["fail", "https://busy.example/ -> 503; https://gone.example/ -> 404"]]);
});

test("Source URL check warns instead of failing when an outside site times out twice", async () => {
  const realFetch = globalThis.fetch;
  const calls = {};
  const timeout = () => { throw new DOMException("This operation was aborted", "AbortError"); };
  const plan = {
    "https://slow.example/": [timeout, timeout],
    "https://down.example/": [() => { throw new TypeError("fetch failed"); }, () => { throw new TypeError("fetch failed"); }],
    "https://ok.example/": [() => new Response(null, { status: 200 })]
  };
  globalThis.fetch = async (url) => {
    calls[url] = (calls[url] || 0) + 1;
    return plan[url][calls[url] - 1]();
  };
  const run = async (urls) => {
    const results = [];
    const reporter = {
      pass: (name, detail) => results.push(["pass", name, detail]),
      fail: (name, detail) => results.push(["fail", name, detail]),
      warn: (name, detail) => results.push(["warn", name, detail])
    };
    await checkUrls(urls, reporter, "source URLs", { retryDelayMs: 0 });
    return results;
  };
  try {
    assert.deepEqual(await run(["https://slow.example/", "https://ok.example/"]), [
      ["warn", "source URLs timeouts", "Timed out twice, not counted as a failure: https://slow.example/"]
    ]);
    assert.deepEqual(await run(["https://down.example/"]), [["fail", "source URLs", "https://down.example/ -> fetch failed"]]);
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.deepEqual(calls, { "https://slow.example/": 2, "https://ok.example/": 1, "https://down.example/": 2 });
});
