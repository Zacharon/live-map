import assert from "node:assert/strict";

const base = process.env.LIVE_MAP_PREVIEW_URL || "http://127.0.0.1:8767";

async function status(path) {
  const res = await fetch(`${base}${path}`, { redirect: "manual" });
  return { status: res.status, type: res.headers.get("content-type") || "", text: await res.text() };
}

const home = await status("/");
assert.equal(home.status, 200);
const api = await status("/api/events");
assert.equal(api.status, 503);
assert.match(api.text, /offline-preview/);
const env = await status("/.env");
assert.equal(env.status, 404);
const git = await status("/.git/HEAD");
assert.equal(git.status, 404);
const art = await status("/artifacts/hormuz-portwatch-2025-01/drafts/genuine-case.json");
assert.equal(art.status, 404);
const missing = await status("/no-such-public-page");
assert.equal(missing.status, 404);
const robots = await status("/robots.txt");
assert.equal(robots.status, 200);
console.log("preview-deny-tests: ok");
