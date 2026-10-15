#!/usr/bin/env node
/**
 * LOCAL ADAPTATION of website-vibe-audit. Original 20-item reference was not
 * found on this Windows Workspace. Checks named in the Live Map OS expansion
 * brief plus existing App_Pre-Launch_Gate public-web evidence.
 * Not a production PASS. Not Alex's exact 20/20.
 */
import { createHash } from "node:crypto";

const base = process.env.LIVE_MAP_PREVIEW_URL || "http://127.0.0.1:8767";
const version = "local-adaptation-2026-09-16";
const rows = [];

async function check(id, title, fn) {
  const started = new Date().toISOString();
  try {
    const result = await fn();
    rows.push({ id, title, version, status: result.pass ? "PASS" : "FAIL", expected: result.expected, actual: result.actual, url: result.url || base, started });
  } catch (error) {
    rows.push({ id, title, version, status: "FAIL", expected: "no throw", actual: String(error), url: base, started });
  }
}

async function get(path) {
  const url = path.startsWith("http") ? path : `${base}${path}`;
  const res = await fetch(url, { redirect: "manual" });
  const text = await res.text();
  return { url, res, text, status: res.status };
}

await check("WV-01", "Home title and description", async () => {
  const page = await get("/");
  return { pass: page.status === 200 && /Live Map/i.test(page.text) && /source-transparent/i.test(page.text), expected: "200 with title+description", actual: String(page.status), url: page.url };
});
await check("WV-02", "lang attribute", async () => {
  const page = await get("/");
  return { pass: /<html lang="en">/.test(page.text), expected: "html lang=en", actual: "present or missing", url: page.url };
});
await check("WV-03", "favicon", async () => {
  const page = await get("/favicon.svg");
  return { pass: page.status === 200 && page.text.includes("<svg"), expected: "200 svg", actual: String(page.status), url: page.url };
});
await check("WV-04", "robots.txt is crawl hint not auth", async () => {
  const page = await get("/robots.txt");
  return { pass: page.status === 200 && /Sitemap/i.test(page.text) && /not an access-control/i.test(page.text), expected: "robots with disclaimer", actual: String(page.status), url: page.url };
});
await check("WV-05", "sitemap lists public routes only", async () => {
  const page = await get("/sitemap.xml");
  return { pass: page.status === 200 && page.text.includes("/sources") && !page.text.includes("artifacts"), expected: "public routes", actual: String(page.status), url: page.url };
});
await check("WV-06", "llms.txt project convention", async () => {
  const page = await get("/llms.txt");
  return { pass: page.status === 200 && /not a Google AI-search prerequisite/i.test(page.text) && !/Obsidian_Vault|artifacts/i.test(page.text), expected: "public-only llms.txt", actual: String(page.status), url: page.url };
});
await check("WV-07", "404 HTTP for unknown HTML", async () => {
  const page = await get("/this-route-does-not-exist-xyz");
  return { pass: page.status === 404, expected: "404", actual: String(page.status), url: page.url };
});
await check("WV-08", "API unknown stays JSON 503/404 not HTML", async () => {
  const page = await get("/api/events");
  const json = page.text.startsWith("{");
  return { pass: page.status === 503 && json, expected: "JSON 503", actual: `${page.status} ${page.text.slice(0, 80)}`, url: page.url };
});
await check("WV-09", "artifacts denied", async () => {
  const page = await get("/artifacts/hormuz-portwatch-2025-01/drafts/genuine-case.json");
  return { pass: page.status === 404, expected: "404", actual: String(page.status), url: page.url };
});
await check("WV-10", "env sentinel denied", async () => {
  const page = await get("/.env");
  return { pass: page.status === 404, expected: "404", actual: String(page.status), url: page.url };
});
await check("WV-11", "canonical and og tags", async () => {
  const page = await get("/");
  return { pass: /rel="canonical"/.test(page.text) && /og:title/.test(page.text), expected: "canonical+og", actual: "present or missing", url: page.url };
});
await check("WV-12", "sources page", async () => {
  const page = await get("/sources");
  return { pass: page.status === 200 && /Source Explorer/i.test(page.text), expected: "200 sources", actual: String(page.status), url: page.url };
});

const passed = rows.filter((row) => row.status === "PASS").length;
const failed = rows.filter((row) => row.status === "FAIL").length;
const report = {
  version,
  originalChecklist: "unavailable-on-windows-workspace",
  mode: "LOCAL",
  base,
  passed,
  failed,
  applicable: rows.length,
  score: `${passed}/${rows.length} applicable (local adaptation, not original 20/20)`,
  rows,
  hash: createHash("sha256").update(JSON.stringify(rows)).digest("hex"),
};
console.log(JSON.stringify(report, null, 2));
if (failed) process.exitCode = 1;
