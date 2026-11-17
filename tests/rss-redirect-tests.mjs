import assert from "node:assert/strict";
import { fetchOfficialFeedEvents } from "../src/data/providers/rss-feed.js";
import { assertSafeFetchUrl } from "../src/data/providers/ssrf-protection.js";

const origin = "https://feed.example.test";
const feed = {
  id: "redirect-fixture", providerId: "official-rss", name: "Synthetic feed",
  url: `${origin}/feed.xml`, domain: "technology-cyber", category: "cyber",
  type: "cyber-advisory", sourceTier: "tier-1-primary-official",
  verificationState: "reported", publicationPolicy: { maxDescriptionChars: 80, allowFullText: false },
};
// Since #95, fetchOfficialFeedEvents reports per-feed failures as one aggregate
// "Official feeds unavailable." error. Call counts, pulls and cancellation below
// show which guard refused the response.
const FEEDS_UNAVAILABLE = /Official feeds unavailable/;
const xml = '<rss><channel><item><title>Synthetic alert</title><link>https://source.example.test/alert</link></item></channel></rss>';

async function withFetch(responses, check) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), redirect: options.redirect });
    const response = responses.shift();
    assert.ok(response, "Unexpected request; fixture never uses the network");
    return response;
  };
  try {
    await check(calls);
  } finally {
    globalThis.fetch = original;
  }
}

const load = () => fetchOfficialFeedEvents({
  now: Date.UTC(2026, 10, 12), env: {}, feedRegistry: [feed],
  provider: { id: "official-rss", timeoutMs: 100 },
});

export async function runRssRedirectRegressionTests() {
  for (const location of [
    "https://[::ffff:127.0.0.1]/private", "https://[::ffff:169.254.169.254]/private",
    "https://attacker.example.test/private", "//attacker.example.test/private",
    "https://sub.feed.example.test/private", "http://feed.example.test/private",
    "https://feed.example.test:444/private", "https://user:pass@feed.example.test/private",
    "http://127.0.0.1/private", "file:///private", "", "http://[",
  ]) {
    await withFetch([new Response(null, { status: 302, headers: { location } }), new Response(xml)], async (calls) => {
      await assert.rejects(load, undefined, `Must reject redirect ${JSON.stringify(location)}`);
      assert.equal(calls.length, 1, `Must refuse ${JSON.stringify(location)} before another fetch`);
      assert.equal(calls[0].redirect, "manual");
    });
  }

  for (const url of [
    "https://[::ffff:127.0.0.1]/feed", "https://[::ffff:169.254.169.254]/feed",
    "https://[::ffff:7f00:1]/feed", "https://[::]/feed", "https://user:pass@feed.example.test/feed",
  ]) assert.throws(() => assertSafeFetchUrl(url), /Blocked/, url);

  await withFetch([
    new Response(null, { status: 301, headers: { location: "/moved.xml" } }),
    new Response(null, { status: 307, headers: { location: "https://attacker.example.test/private" } }),
    new Response(xml),
  ], async (calls) => {
    await assert.rejects(load);
    assert.deepEqual(calls.map(call => call.url), [feed.url, `${origin}/moved.xml`]);
  });

  for (const status of [301, 302, 303, 307, 308]) {
    await withFetch([
      new Response(null, { status, headers: { location: "/moved.xml" } }), new Response(xml),
    ], async (calls) => {
      const result = await load();
      assert.equal(result.events.length, 1);
      assert.equal(result.events[0].title, "Synthetic alert");
      assert.equal(result.events[0].sourcePublishedAt, null, "Unknown source clock remains unknown");
      assert.deepEqual(calls.map(call => call.url), [feed.url, `${origin}/moved.xml`]);
    });
  }

  await withFetch([
    new Response(null, { status: 302, headers: { location: `${origin}:443/moved.xml` } }), new Response(xml),
  ], async (calls) => {
    assert.equal((await load()).events.length, 1);
    assert.equal(calls[1].url, `${origin}/moved.xml`, "Equivalent default port stays same-origin");
  });

  await withFetch(Array.from({ length: 3 }, () => new Response(null, {
    status: 302, headers: { location: "/loop.xml" },
  })), async (calls) => {
    await assert.rejects(load, FEEDS_UNAVAILABLE);
    assert.equal(calls.length, 3, "Existing request budget still bounds redirect loops");
  });

  await withFetch([new Response(xml)], async (calls) => {
    const result = await load();
    assert.equal(result.events.length, 1);
    assert.equal(calls.length, 1);
  });
}

export async function runRssBodyRegressionTests() {
  const limit = 1024 * 1024; // Existing RSS maxBytes default, now enforced as UTF-8 bytes.
  const encoder = new TextEncoder();
  function streamed(chunks, headers = {}) {
    const state = { pulls: 0, cancelled: false };
    const body = new ReadableStream({
      pull(controller) {
        const chunk = chunks[state.pulls++];
        if (chunk) controller.enqueue(chunk);
        else controller.close();
      },
      cancel() { state.cancelled = true; },
    }, { highWaterMark: 0 });
    return { response: new Response(body, { headers }), state };
  }

  for (const headers of [{}, { "content-length": "1" }, { "content-length": "invalid" }]) {
    const { response, state } = streamed([
      new Uint8Array(limit).fill(32), Uint8Array.of(32), encoder.encode(xml),
    ], headers);
    await withFetch([response], async () => {
      await assert.rejects(load, FEEDS_UNAVAILABLE);
      assert.equal(state.cancelled, true, "Oversized stream must be cancelled");
      assert.equal(state.pulls, 2, "Do not pull or buffer the remaining body");
      assert.equal(response.body.locked, false, "Release the reader after refusal");
    });
  }

  const oversizedHeader = streamed([encoder.encode(xml)], { "content-length": String(limit + 1) });
  await withFetch([oversizedHeader.response], async () => {
    await assert.rejects(load, FEEDS_UNAVAILABLE);
    assert.equal(oversizedHeader.state.pulls, 0, "Reject declared oversize before reading");
    assert.equal(oversizedHeader.state.cancelled, true);
  });

  const unicodeXml = xml.replace("Synthetic alert", "Synthetic é🙂 alert");
  const exact = encoder.encode(unicodeXml + " ".repeat(limit - encoder.encode(unicodeXml).byteLength));
  const split = encoder.encode(unicodeXml.slice(0, unicodeXml.indexOf("é"))).byteLength + 1;
  const valid = streamed([exact.slice(0, split), exact.slice(split)]);
  await withFetch([valid.response], async () => {
    const result = await load();
    assert.equal(result.events[0].title, "Synthetic é🙂 alert", "Decode UTF-8 across chunk boundaries");
    assert.equal(result.events[0].sourcePublishedAt, null);
    assert.equal(valid.state.cancelled, false);
    assert.equal(valid.response.body.locked, false);
  });

  // Fewer JS characters than the cap can still exceed its UTF-8 byte budget.
  const multi = streamed([encoder.encode("é".repeat(limit / 2)), encoder.encode("é"), encoder.encode(xml)]);
  await withFetch([multi.response], async () => {
    await assert.rejects(load, FEEDS_UNAVAILABLE);
    assert.equal(multi.state.pulls, 2);
    assert.equal(multi.state.cancelled, true);
  });

  const empty = streamed([]);
  await withFetch([empty.response], async () => assert.equal((await load()).events.length, 0));
}
