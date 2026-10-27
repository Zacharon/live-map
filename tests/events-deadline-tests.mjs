import assert from "node:assert/strict";
import { orchestrateProviders } from "../src/data/providers/orchestrator.js";
import { fetchOfficialFeedEvents } from "../src/data/providers/rss-feed.js";
import { fetchReliefWebEvents } from "../src/data/providers/reliefweb.js";
import { createLinkedSignal } from "../src/data/providers/fetch-timeout.js";

function hangUntilAbort(url, init) {
  return new Promise((resolve, reject) => {
    if (!init?.signal) {
      reject(new Error(`missing signal ${url}`));
      return;
    }
    const fail = () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
    if (init.signal.aborted) {
      fail();
      return;
    }
    init.signal.addEventListener("abort", fail, { once: true });
  });
}

const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = hangUntilAbort;
  const started = Date.now();
  const result = await Promise.race([
    orchestrateProviders({
      now: Date.now(),
      hours: 168,
      deadlineMs: 250,
      env: {},
      providerCache: {
        async get(providerId) {
          if (providerId !== "usgs") return null;
          return {
            payload: [{
              id: "usgs:stale",
              provider: "usgs",
              title: "Stale quake",
              startedAt: new Date().toISOString(),
              severity: 50,
            }],
            metadata: { lastSuccessfulFetchAt: "2026-10-01T00:00:00.000Z" },
          };
        },
        async set() {},
      },
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error("orchestration exceeded the test deadline")), 1500)),
  ]);
  const elapsed = Date.now() - started;
  assert.ok(elapsed < 1500, `orchestration took ${elapsed}ms`);
  const usgsResult = result.providerResults.find((item) => item.providerId === "usgs");
  const feedResult = result.providerResults.find((item) => item.providerId === "official-rss");
  assert.equal(result.sourceStatus.usgs.status, "degraded");
  assert.equal(result.sourceStatus.usgs.cached, true);
  assert.equal(result.sourceStatus.usgs.stale, true);
  assert.equal(usgsResult.errorCode, "timeout");
  assert.ok(result.events.some((event) => event.id === "usgs:stale"));
  assert.equal(result.sourceStatus["official-rss"].status, "unavailable");
  assert.equal(feedResult.errorCode, "timeout");
  assert.equal(result.sourceStatus.eonet.ok, false);
  assert.equal(result.systemStatus, "partial-data");
  for (const providerResult of result.providerResults) {
    assert.doesNotMatch(providerResult.errorMessage || "", /missing signal/);
  }
  console.log(`PASS events orchestration deadline returned partial sourceStatus in ${elapsed}ms`);

  let inFlight = 0;
  let maxInFlight = 0;
  globalThis.fetch = async (url, init) => {
    assert.ok(init?.signal, `feed fetch missing signal ${url}`);
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 180));
    inFlight -= 1;
    const id = String(url).includes("feed-b") ? "b" : "a";
    return new Response(
      `<rss><channel><item><title>Feed ${id}</title><link>https://example.gov/${id}</link><guid>${id}</guid><pubDate>Tue, 09 Jun 2026 00:00:00 GMT</pubDate><description>Official update</description></item></channel></rss>`,
      { status: 200, headers: { "content-type": "application/rss+xml" } },
    );
  };
  const feed = (id) => ({
    id,
    providerId: "official-rss",
    name: id,
    url: `https://example.gov/${id}.xml`,
    domain: "technology-cyber",
    category: "cyber",
    type: "cyber-advisory",
    sourceTier: "tier-1-primary-official",
    verificationState: "primary-confirmed",
    publicationPolicy: { maxDescriptionChars: 80, allowFullText: false },
  });
  const feedStarted = Date.now();
  const feeds = await fetchOfficialFeedEvents({
    now: Date.parse("2026-06-09T01:00:00Z"),
    provider: { id: "official-rss", name: "Official RSS", timeoutMs: 5000 },
    deadlineMs: 5000,
    feedRegistry: [feed("feed-a"), feed("feed-b")],
  });
  const feedElapsed = Date.now() - feedStarted;
  assert.equal(maxInFlight, 2);
  assert.ok(feedElapsed < 450, `sequential feeds took ${feedElapsed}ms`);
  assert.equal(feeds.events.length, 2);
  console.log(`PASS official feeds run in parallel in ${feedElapsed}ms`);

  globalThis.fetch = hangUntilAbort;
  const reliefSignal = createLinkedSignal(undefined, 150);
  const reliefStarted = Date.now();
  const reliefError = await Promise.race([
    fetchReliefWebEvents({
      now: Date.now(),
      hours: 72,
      signal: reliefSignal.signal,
      deadlineMs: 150,
      env: { RELIEFWEB_APPNAME: "live-map-test" },
    }).then(() => new Error("ReliefWeb should have timed out"), (error) => error),
    new Promise((resolve) => setTimeout(() => resolve(new Error("ReliefWeb fetch ignored its timeout")), 1000)),
  ]);
  reliefSignal.clear();
  assert.equal(reliefError.name, "AbortError");
  assert.ok(Date.now() - reliefStarted < 1000);
  console.log("PASS ReliefWeb fetch aborts on its timeout");
} finally {
  globalThis.fetch = originalFetch;
}
