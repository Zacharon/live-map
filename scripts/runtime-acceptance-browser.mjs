#!/usr/bin/env node
/**
 * Isolated Edge/CDP runtime acceptance. Loopback only. Does not use the user's
 * everyday profile, cookies, or signed-in sessions. Inspect before running.
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const runId = "2026-09-15T-runtime";
const outDir = path.join(root, "artifacts", "evidence-globe-runtime", runId);
const shotDir = path.join(outDir, "screenshots");
const logDir = path.join(outDir, "logs");
mkdirSync(shotDir, { recursive: true });
mkdirSync(logDir, { recursive: true });

const preview = process.env.LIVE_MAP_PREVIEW_URL || "http://127.0.0.1:8766";
const debugPort = Number(process.env.LIVE_MAP_CDP_PORT || 9222);
const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
if (!existsSync(edge)) {
  writeFileSync(path.join(logDir, "browser-capability.json"), JSON.stringify({ ok: false, reason: "msedge.exe not found" }, null, 2));
  console.error("NOT VERIFIED: Edge executable missing");
  process.exit(2);
}

const profile = path.join(outDir, "edge-profile");
mkdirSync(profile, { recursive: true });

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function waitHttp(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.ok || response.status === 503) return response;
    } catch {
      await sleep(300);
    }
  }
  throw new Error(`timeout waiting for ${url}`);
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.next = 0;
    this.pending = new Map();
    this.events = [];
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message || JSON.stringify(message.error)));
        else resolve(message.result);
      }
      if (message.method) this.events.push({ method: message.method, params: message.params, at: Date.now() });
    });
  }
  send(method, params = {}) {
    const id = ++this.next;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

const child = spawn(edge, [
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${debugPort}`,
  "--remote-debugging-address=127.0.0.1",
  "--remote-allow-origins=*",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-sync",
  "--disable-extensions",
  "--disable-features=Translate,MediaRouter",
  "--window-size=1366,768",
  "about:blank",
], { stdio: "ignore", windowsHide: false });

const evidence = { ok: false, rows: [], console: [], network: [], screenshots: [], errors: [] };

function row(id, expected, actual, pass, note = "") {
  evidence.rows.push({ id, expected, actual, pass, note });
  console.log(`${pass ? "PASS" : "FAIL"} ${id} — ${note || actual}`);
}

try {
  await waitHttp(`http://127.0.0.1:${debugPort}/json/version`);
  let target;
  const created = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(`${preview}/?demo=foundation`)}`);
  const createdText = await created.text();
  try { target = JSON.parse(createdText); } catch {
    const list = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
    target = Array.isArray(list) ? list.find((item) => item.type === "page") || list[0] : list;
  }
  if (!target?.webSocketDebuggerUrl) throw new Error(`no CDP websocket: ${createdText?.slice(0, 200)}`);
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", reject);
  });
  const cdp = new Cdp(ws);
  await cdp.send("Network.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });

  async function navigate(url) {
    await cdp.send("Page.navigate", { url });
    const start = Date.now();
    let last = "";
    while (Date.now() - start < 60000) {
      const ready = await cdp.send("Runtime.evaluate", { expression: "({href:location.href, ready:document.body?.dataset?.liveMapReady||'', err:window.onerrorMessage||'', text:(document.body&&document.body.innerText||'').slice(0,400), scripts:document.scripts.length})", returnByValue: true });
      last = JSON.stringify(ready.result?.value || ready);
      if (ready.result?.value?.ready === "1") return ready.result.value;
      await sleep(300);
    }
    await screenshot("fail-not-ready").catch(() => {});
    throw new Error(`live-map not ready: ${url} last=${last}`);
  }

  async function screenshot(name) {
    const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
    const file = path.join(shotDir, `${name}.png`);
    writeFileSync(file, Buffer.from(shot.data, "base64"));
    evidence.screenshots.push(file);
    return file;
  }

  async function evalValue(expression) {
    const result = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "evaluate failed");
    return result.result?.value;
  }

  const coldStart = Date.now();
  await navigate(`${preview}/?demo=foundation`);
  evidence.coldMs = Date.now() - coldStart;
  const demoState = await evalValue(`({
    ready: document.body.dataset.liveMapReady,
    mapHidden: document.getElementById('map')?.hidden,
    mapSize: document.getElementById('map')?.getBoundingClientRect()?.height,
    cesium: Boolean(window.Cesium),
    banner: document.getElementById('demoBanner')?.textContent,
    errors: window.__liveMapErrors || []
  })`);
  row("A-demo-load", "usable map, no Cesium yet", JSON.stringify(demoState), demoState.mapSize > 100 && !demoState.cesium && demoState.ready === "1", "2D-only session must not initialize Cesium");
  await screenshot("01-demo-2d");

  await navigate(`${preview}/?demo=foundation&view=chokepoints&chokepoint=strait-of-hormuz&layers=graph`);
  const inspector = await evalValue(`({
    scenario: document.getElementById('scenarioStage')?.value,
    asOf: document.body.dataset.liveMapAsOf,
    diplomacy: document.querySelector('[data-dimension="diplomacy"]')?.dataset.state,
    throughput: document.querySelector('[data-dimension="throughput"]')?.dataset.state,
    physical: document.querySelector('[data-dimension="physicalAccess"]')?.dataset.state,
    commercial: document.querySelector('[data-dimension="commercialAccess"]')?.dataset.state,
    policy: document.querySelector('[data-policy]')?.textContent,
    fixture: document.querySelector('[data-fixture-banner]')?.textContent,
    evidence: Array.from(document.querySelectorAll('.evidence-id-list li')).slice(0,5).map(n=>n.textContent),
    densityLabel: document.querySelector('label[for], #overlayControls')?.innerText
  })`);
  const overlayText = await evalValue("document.getElementById('overlayControls')?.innerText || ''");
  row("B-diplomacy-independent", "diplomacy improving, throughput disrupted", JSON.stringify(inspector), inspector.diplomacy === "improving" && inspector.throughput === "disrupted" && inspector.physical === "restricted", "independent dimensions at diplomacy step");
  row("E-density-label", "SYNTHETIC FORMAT FIXTURE in switcher", overlayText.slice(0, 200), overlayText.includes("SYNTHETIC FORMAT FIXTURE — NOT SOURCE MEASUREMENTS"), "density/activity labels");
  row("E-wind-label", "decoder fixture not fetched GFS", overlayText.slice(0, 240), overlayText.includes("NOT A FETCHED NOAA/GFS FIELD"), "wind labels");
  await screenshot("02-inspector-2d-diplomacy");

  await evalValue(`document.getElementById('scenarioStage').value='isolated-improvement'; document.getElementById('scenarioStage').dispatchEvent(new Event('change',{bubbles:true}));`);
  await sleep(500);
  const isolated = await evalValue("document.querySelector('[data-recovery]')?.dataset.recovery || document.querySelector('[data-recovery]')?.textContent");
  row("B-isolated", "isolated-recovery", isolated, String(isolated).includes("isolated-recovery"), "scenario step control");
  await evalValue(`document.getElementById('scenarioStage').value='broader-recovery'; document.getElementById('scenarioStage').dispatchEvent(new Event('change',{bubbles:true}));`);
  await sleep(500);
  const broader = await evalValue("document.querySelector('[data-recovery]')?.textContent");
  row("B-broader", "broader-recovery-candidate", broader, String(broader).includes("broader-recovery"), "broader recovery candidate");
  await evalValue(`document.getElementById('scenarioStage').value='stale-contradiction'; document.getElementById('scenarioStage').dispatchEvent(new Event('change',{bubbles:true}));`);
  await sleep(500);
  const contested = await evalValue("document.querySelector('.chokepoint-detail')?.innerText || ''");
  row("B-contradiction", "contested remains visible", contested.slice(0, 180), /contested|contradict/i.test(contested), "stale/contradiction inspectable");
  await screenshot("03-inspector-contradiction");

  await evalValue(`document.getElementById('scenarioStage').value='diplomacy-with-low-throughput'; document.getElementById('scenarioStage').dispatchEvent(new Event('change',{bubbles:true})); document.getElementById('graphToggle').checked=true; document.getElementById('graphToggle').dispatchEvent(new Event('change',{bubbles:true})); document.getElementById('densityToggle').checked=true; document.getElementById('densityToggle').dispatchEvent(new Event('change',{bubbles:true}));`);
  await sleep(400);
  const before3d = await evalValue("({asOf:document.body.dataset.liveMapAsOf, scenario:document.body.dataset.liveMapScenario, graph:document.getElementById('graphToggle')?.checked, density:document.getElementById('densityToggle')?.checked, diplomacy:document.querySelector('[data-dimension=\"diplomacy\"]')?.dataset.state})");
  await evalValue(`document.getElementById('mapMode').value='3d'; document.getElementById('mapMode').dispatchEvent(new Event('change',{bubbles:true}));`);
  await sleep(2500);
  const globe = await evalValue(`({
    mode: document.body.dataset.liveMapMode,
    cesium: Boolean(window.Cesium),
    canvas: document.querySelector('.cesium-widget canvas, #globeStage canvas') ? true : false,
    fallback: document.querySelector('.globe-fallback') ? true : false,
    asOf: document.body.dataset.liveMapAsOf,
    scenario: document.body.dataset.liveMapScenario,
    graph: document.getElementById('graphToggle')?.checked,
    density: document.getElementById('densityToggle')?.checked,
    diplomacy: document.querySelector('[data-dimension="diplomacy"]')?.dataset.state
  })`);
  row("C-3d-init", "Cesium initialized or explicit fallback", JSON.stringify(globe), globe.cesium || globe.fallback, globe.canvas ? "globe canvas present" : "fallback or no canvas");
  row("C-state-preserved", "asOf/graph/density/diplomacy survive 2D→3D", JSON.stringify({ before3d, globe }), globe.asOf === before3d.asOf && globe.graph === true && globe.diplomacy === before3d.diplomacy, "shared state");
  await screenshot("04-globe-3d");

  await evalValue(`document.getElementById('mapMode').value='2d'; document.getElementById('mapMode').dispatchEvent(new Event('change',{bubbles:true}));`);
  await sleep(800);
  const back2d = await evalValue("({mode:document.body.dataset.liveMapMode, asOf:document.body.dataset.liveMapAsOf, cesiumStill: Boolean(window.Cesium), graph:document.getElementById('graphToggle')?.checked})");
  row("C-back-2d", "return to 2D preserving asOf/graph", JSON.stringify(back2d), back2d.mode === "2d" && back2d.asOf === before3d.asOf && back2d.graph === true, "2D after 3D");

  for (let i = 0; i < 10; i += 1) {
    const mode = i % 2 ? "2d" : "3d";
    await evalValue(`document.getElementById('mapMode').value='${mode}'; document.getElementById('mapMode').dispatchEvent(new Event('change',{bubbles:true}));`);
    await sleep(350);
  }
  const afterSwitches = await evalValue("({canvases: document.querySelectorAll('canvas').length, mode: document.body.dataset.liveMapMode})");
  row("perf-10-switches", "no unbounded canvas growth after 10 switches", JSON.stringify(afterSwitches), afterSwitches.canvases <= 6, "lifecycle");
  await screenshot("05-after-mode-switches");

  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await sleep(400);
  await screenshot("06-narrow-390");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1024, height: 768, deviceScaleFactor: 1, mobile: false });
  await sleep(300);
  await screenshot("07-1024");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await evalValue("document.body.style.zoom='200%'");
  await sleep(300);
  await screenshot("08-browser-zoom-200");
  await evalValue("document.body.style.zoom=''");

  await navigate(`${preview}/?demo=foundation&view=chokepoints&chokepoint=strait-of-hormuz&failWebgl=1`);
  const fallback = await evalValue("({fallback: Boolean(document.querySelector('.globe-fallback, .globe-card')), mapVisible: !document.getElementById('map')?.hidden, asOf: document.body.dataset.liveMapAsOf})");
  await evalValue(`document.getElementById('mapMode').value='3d'; document.getElementById('mapMode').dispatchEvent(new Event('change',{bubbles:true}));`);
  await sleep(800);
  const fallbackAfter = await evalValue("({card: document.querySelector('.globe-card')?.textContent, mapVisible: !document.getElementById('map')?.hidden, diplomacy: document.querySelector('[data-dimension=\"diplomacy\"]')?.dataset.state})");
  row("F-webgl-fallback", "Leaflet remains, explanation shown", JSON.stringify(fallbackAfter), fallbackAfter.mapVisible && /unavailable|WebGL/i.test(fallbackAfter.card || ""), "forced WebGL failure");
  await screenshot("09-webgl-fallback");

  await navigate(`${preview}/`);
  await sleep(1500);
  const nondemo = await evalValue("({status: document.getElementById('systemStatus')?.textContent, health: document.getElementById('sourceHealth')?.textContent, empty: document.querySelector('.empty')?.textContent})");
  row("A-nondemo-unavailable", "honest 503/unavailable, not healthy live data", JSON.stringify(nondemo), /unavailable|503|preview|No live/i.test(`${nondemo.status} ${nondemo.health} ${nondemo.empty}`), "non-demo path");
  await screenshot("10-nondemo-unavailable");

  const requests = cdp.events.filter((item) => item.method === "Network.requestWillBeSent").map((item) => item.params?.request?.url).filter(Boolean);
  evidence.network = [...new Set(requests)];
  const demoNet = evidence.network.filter((url) => url.includes("demo=foundation") || true);
  const forbidden = evidence.network.filter((url) => /cesium\.com\/ion|api\.cesium|tile\.openstreetmap|arcgisonline|earthquake\.usgs|cartocdn|google-analytics|sentry/i.test(url));
  row("A-network-offline-demo", "no ion/OSM/USGS/telemetry from demo", forbidden.slice(0, 8).join(" | ") || "none", forbidden.length === 0, `${evidence.network.length} unique URLs`);

  const exceptions = cdp.events.filter((item) => item.method === "Runtime.exceptionThrown");
  evidence.console = exceptions.map((item) => item.params?.exceptionDetails?.text).filter(Boolean);
  row("A-no-uncaught", "no uncaught exceptions", evidence.console.join(" | ") || "none", evidence.console.length === 0);

  evidence.ok = evidence.rows.every((item) => item.pass);
} catch (error) {
  evidence.errors.push(String(error.stack || error));
  console.error(error);
} finally {
  writeFileSync(path.join(logDir, "acceptance.json"), JSON.stringify(evidence, null, 2));
  writeFileSync(path.join(logDir, "environment.json"), JSON.stringify({
    preview,
    edge,
    debugPort,
    node: process.version,
    platform: process.platform,
    headed: true,
    gpu: "not sampled — Edge CDP session, not a native GPU profiler",
    pid: child.pid,
  }, null, 2));
  try { child.kill(); } catch { /* already exited */ }
}

process.exit(evidence.ok ? 0 : 1);
