#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const preview = process.env.LIVE_MAP_PREVIEW_URL || "http://127.0.0.1:8768";
const debugPort = Number(process.env.LIVE_MAP_CDP_PORT || 9344);
const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const outDir = path.join(process.cwd(), "artifacts", "usability-globe-runtime");
mkdirSync(path.join(outDir, "screenshots"), { recursive: true });
if (!existsSync(edge)) { console.error("NOT VERIFIED: Edge missing"); process.exit(2); }
const profile = path.join(outDir, `edge-profile-${debugPort}`);
mkdirSync(profile, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const child = spawn(edge, [`--user-data-dir=${profile}`, `--remote-debugging-port=${debugPort}`, "--remote-debugging-address=127.0.0.1", "--remote-allow-origins=*", "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--window-size=1366,768", "about:blank"], { stdio: "ignore", windowsHide: false });
const t0 = Date.now();
let cdpReady = false;
while (Date.now() - t0 < 30000) {
  try {
    const res = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
    if (res.ok) { cdpReady = true; break; }
  } catch { /* wait */ }
  await sleep(400);
}
if (!cdpReady) {
  console.error(`NOT VERIFIED: Edge CDP did not open on 127.0.0.1:${debugPort}`);
  child.kill();
  process.exit(2);
}
const created = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(`${preview}/?demo=foundation&view=chokepoints&chokepoint=strait-of-hormuz`)}`, { method: "PUT" });
let target;
try { target = JSON.parse(await created.text()); } catch {
  const list = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  target = list.find((item) => item.type === "page") || list[0];
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener("open", resolve); ws.addEventListener("error", reject); });
let next = 0; const pending = new Map();
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    message.error ? reject(new Error(message.error.message)) : resolve(message.result);
  }
});
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++next; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
const shots = [];
async function shot(name) {
  const png = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(path.join(outDir, "screenshots", `${name}.png`), Buffer.from(png.data, "base64"));
  shots.push(name);
}
async function evalValue(expr) {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  return r.result?.value;
}
await send("Page.navigate", { url: `${preview}/?demo=foundation&view=chokepoints&chokepoint=strait-of-hormuz` });
const readyStart = Date.now();
while (Date.now() - readyStart < 60000) {
  if (await evalValue("document.body?.dataset?.liveMapReady||''") === "1") break;
  await sleep(250);
}
const coldMs = Date.now() - readyStart;
await sleep(800);
await shot("01-overview");
const overview = await evalValue(`({
  href: location.href,
  cards: document.querySelectorAll('.brief-card').length,
  workbench: Boolean(document.querySelector('[data-workbench]')),
  hormuz: Boolean(document.querySelector('[data-chokepoint-select="strait-of-hormuz"]')),
  error: document.body.dataset.liveMapError||''
})`);
await evalValue(`document.querySelector('[data-chokepoint-select="strait-of-hormuz"]')?.click(); true`);
await sleep(600);
await evalValue(`document.querySelector('[data-open-history="strait-of-hormuz"]')?.click(); true`);
await sleep(800);
await shot("02-hormuz-brief");
const brief = await evalValue(`({
  table: document.querySelector('[data-series-table]')?.innerText?.slice(0,500)||'',
  history: document.querySelector('.brief-history')?.innerText||'',
  workbench: Boolean(document.querySelector('[data-workbench]')),
  suez: Boolean(document.querySelector('[data-chokepoint-select="suez-canal"]'))
})`);
await evalValue(`document.getElementById('baseMap').value='dark'; document.getElementById('baseMap').dispatchEvent(new Event('change',{bubbles:true})); true`);
await sleep(1500);
const dark = await evalValue(`({
  basemap: document.getElementById('baseMap')?.value,
  health: document.getElementById('mapHealth')?.textContent||'',
  offline: document.getElementById('mapHealth')?.dataset?.offlineDark||'',
  credit: document.querySelector('.leaflet-control-attribution')?.textContent||'',
  tileImgs: document.querySelectorAll('.leaflet-tile-pane img').length,
  landPaths: document.querySelectorAll('.leaflet-offline-dark-pane path, .leaflet-overlay-pane path').length
})`);
let cartoOnline = { status: null, type: "", bytes: 0, note: "not fetched" };
try {
  const tile = await fetch("https://a.basemaps.cartocdn.com/dark_all/2/2/2.png");
  const buf = Buffer.from(await tile.arrayBuffer());
  cartoOnline = { status: tile.status, type: tile.headers.get("content-type") || "", bytes: buf.length, note: buf.includes(Buffer.from("API")) || buf.length < 4000 ? "likely-watermark-or-stub" : "image-bytes" };
} catch (error) {
  cartoOnline = { status: 0, type: "", bytes: 0, note: String(error.message || error).slice(0, 160) };
}
await shot("03-dark");
await evalValue(`document.getElementById('mapMode').value='3d'; document.getElementById('mapMode').dispatchEvent(new Event('change',{bubbles:true})); true`);
const globeWait = Date.now();
let globe = null;
while (Date.now() - globeWait < 20000) {
  globe = await evalValue(`({
    mode: document.body.dataset.liveMapMode,
    canvas: Boolean(document.querySelector('#globeStage canvas')),
    cesium: Boolean(window.Cesium && window.Cesium.Viewer),
    fallback: Boolean(document.querySelector('.globe-card')),
    hiddenMap: document.getElementById('map')?.hidden,
    error: document.body.dataset.liveMapError||''
  })`);
  if (globe?.canvas || globe?.fallback) break;
  await sleep(500);
}
await shot("04-globe");
await evalValue(`document.getElementById('mapMode').value='2d'; document.getElementById('mapMode').dispatchEvent(new Event('change',{bubbles:true})); true`);
await sleep(800);
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await sleep(400);
await shot("05-mobile");
const result = { coldMs, overview, brief, dark, cartoOnline, globe, shots };
writeFileSync(path.join(outDir, "result.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
child.kill();
if (!overview?.hormuz || !/75/.test(brief.table || brief.history || "") && !/Historical/.test(brief.history || "")) process.exitCode = 1;
