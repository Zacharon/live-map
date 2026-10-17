import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
if (!existsSync(edge)) throw new Error("Isolated Edge browser is unavailable");
const origin = process.env.LIVE_MAP_STORED_PREVIEW_URL || "http://127.0.0.1:8877";
if (new URL(origin).hostname !== "127.0.0.1") throw new Error("Browser acceptance requires loopback preview");
const runDir = path.resolve("artifacts", "usgs-stored-browser-local", String(Date.now()));
await mkdir(runDir, { recursive: true });
const port = 9231;
const child = spawn(edge, [`--user-data-dir=${path.join(runDir, "edge-profile")}`,
  `--remote-debugging-port=${port}`, "--remote-debugging-address=127.0.0.1", "--remote-allow-origins=*",
  "--headless=new", "--no-first-run", "--no-default-browser-check", "--disable-sync", "--disable-extensions",
  "--window-size=1366,768", "about:blank"], { stdio: "ignore", windowsHide: true });
const network = [];
const exceptions = [];
const rows = [];
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
class Cdp {
  constructor(ws) {
    this.ws = ws; this.next = 0; this.pending = new Map();
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const pending = this.pending.get(message.id); this.pending.delete(message.id);
        message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result);
      }
      if (message.method === "Network.requestWillBeSent") network.push({ url: message.params.request.url, method: message.params.request.method });
      if (message.method === "Runtime.exceptionThrown") exceptions.push(message.params.exceptionDetails.text);
    });
  }
  send(method, params = {}) {
    const id = ++this.next;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject }); this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async value(expression) {
    const result = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  }
}
async function waitFor(read, predicate, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = await read();
    if (predicate(value)) return value;
    await pause(250);
  }
  throw new Error("browser acceptance condition timed out");
}
let cdp;
try {
  const targets = await waitFor(async () => {
    try { return await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { return []; }
  }, (value) => value.some((target) => target.type === "page"));
  const target = targets.find((item) => item.type === "page");
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener("open", resolve, { once: true }); ws.addEventListener("error", reject, { once: true }); });
  cdp = new Cdp(ws);
  await cdp.send("Page.enable"); await cdp.send("Network.enable"); await cdp.send("Runtime.enable");
  await cdp.send("Page.navigate", { url: origin });
  const state = () => cdp.value(`({boot:document.body?.dataset.liveMapBoot,
    feed:document.querySelector('#eventList')?.textContent||'',
    markerCount:document.querySelectorAll('.event-marker').length,
    source:document.querySelector('#sourceHealth')?.textContent||'',
    status:document.querySelector('#systemStatus')?.textContent||'',
    inspector:document.querySelector('#eventDetailDrawer')?.textContent||''})`);
  const initial = await waitFor(state, (value) => value.feed.includes("SYNTHETIC stored earthquake M 7"), 30000);
  assert.equal(initial.boot, "complete");
  assert.ok(initial.markerCount > 0, "stored observation should have a geographic marker");
  rows.push({ check: "stored-feed-and-map", pass: true, markerCount: initial.markerCount, status: initial.status });
  await cdp.value("document.querySelector('[data-event-detail]')?.click()");
  const inspected = await waitFor(state, (value) => value.inspector.includes("SYNTHETIC stored earthquake M 7"));
  rows.push({ check: "source-inspector", pass: true, source: inspected.source });
  await writeFile(path.join(runDir, "initial.png"), Buffer.from((await cdp.send("Page.captureScreenshot", { format: "png" })).data, "base64"));

  assert.equal((await fetch(`${origin}/__test__/correct`, { method: "POST" })).status, 200);
  const corrected = await waitFor(state, (value) => value.feed.includes("SYNTHETIC stored earthquake M 8"), 45000);
  rows.push({ check: "incremental-change-refresh", pass: true, status: corrected.status });
  assert.ok(network.some((entry) => entry.url.includes("/api/changes?cursor=")), "browser must poll from snapshot cursor");
  await writeFile(path.join(runDir, "corrected.png"), Buffer.from((await cdp.send("Page.captureScreenshot", { format: "png" })).data, "base64"));

  await cdp.send("Page.reload", { ignoreCache: true });
  await waitFor(state, (value) => value.feed.includes("SYNTHETIC stored earthquake M 8"));
  rows.push({ check: "reload-preserves-correction", pass: true });
  assert.equal((await fetch(`${origin}/__test__/api-outage?on=1`, { method: "POST" })).status, 200);
  await cdp.value("document.querySelector('#refreshNow')?.click()");
  const outage = await waitFor(state, (value) => value.status.includes("Feed unavailable"));
  assert.ok(outage.feed.includes("SYNTHETIC stored earthquake M 8"));
  rows.push({ check: "api-outage-honest-last-known", pass: true, status: outage.status });
  await cdp.send("Page.reload", { ignoreCache: true });
  const cached = await waitFor(state, (value) => value.status.includes("Feed unavailable") && value.feed.includes("SYNTHETIC stored earthquake M 8"));
  rows.push({ check: "reload-uses-dated-browser-cache", pass: true, status: cached.status });
  assert.equal(network.filter((entry) => entry.url.includes("earthquake.usgs.gov")).length, 0);
  rows.push({ check: "no-browser-usgs-request", pass: true });
  const result = { status: "PASS", synthetic: true, rows, exceptions, network,
    screenshots: ["initial.png", "corrected.png"] };
  await writeFile(path.join(runDir, "result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ status: result.status, runDir, checks: rows.map((row) => row.check), exceptions: exceptions.length }));
} catch (error) {
  await writeFile(path.join(runDir, "result.json"), JSON.stringify({ status: "FAIL", rows, exceptions, network, error: error.message }, null, 2));
  throw error;
} finally {
  cdp?.ws.close();
  child.kill();
}
