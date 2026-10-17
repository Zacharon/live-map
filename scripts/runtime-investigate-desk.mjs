#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const preview = process.env.LIVE_MAP_PREVIEW_URL || "http://127.0.0.1:8767";
const debugPort = Number(process.env.LIVE_MAP_CDP_PORT || 9333);
const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const outDir = path.join(process.cwd(), "artifacts", "investigate-desk-runtime");
mkdirSync(path.join(outDir, "screenshots"), { recursive: true });
if (!existsSync(edge)) { console.error("NOT VERIFIED: Edge missing"); process.exit(2); }
const profile = path.join(outDir, "edge-profile");
mkdirSync(profile, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const child = spawn(edge, [`--user-data-dir=${profile}`, `--remote-debugging-port=${debugPort}`, "--remote-debugging-address=127.0.0.1", "--remote-allow-origins=*", "--no-first-run", "--window-size=1366,768", "about:blank"], { stdio: "ignore", windowsHide: true });
const started = Date.now();
while (Date.now() - started < 15000) {
  try { await fetch(`http://127.0.0.1:${debugPort}/json/version`); break; } catch { await sleep(300); }
}
const created = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(`${preview}/?demo=foundation&view=chokepoints&chokepoint=strait-of-hormuz`)}`, { method: "PUT" });
let target;
try { target = JSON.parse(await created.text()); } catch {
  const list = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  target = Array.isArray(list) ? list.find((item) => item.type === "page") || list[0] : list;
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener("open", resolve); ws.addEventListener("error", reject); });
let next = 0; const pending = new Map();
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) { const { resolve, reject } = pending.get(message.id); pending.delete(message.id); message.error ? reject(new Error(message.error.message)) : resolve(message.result); }
});
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++next; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
await send("Page.enable"); await send("Runtime.enable");
const url = `${preview}/?demo=foundation&view=chokepoints&chokepoint=strait-of-hormuz`;
await send("Page.navigate", { url });
const waitReady = async () => {
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    const ready = await send("Runtime.evaluate", { expression: "document.body?.dataset?.liveMapReady||''", returnByValue: true });
    if (ready.result?.value === "1") return Date.now() - t0;
    await sleep(300);
  }
  throw new Error("not ready");
};
const coldMs = await waitReady();
const t1 = Date.now();
while (Date.now() - t1 < 15000) {
  const btn = await send("Runtime.evaluate", { expression: "Boolean(document.querySelector('[data-investigate-open],[data-chokepoint-select]'))", returnByValue: true });
  if (btn.result?.value) break;
  await sleep(300);
}
await send("Runtime.evaluate", { expression: `(function(){
  const card = document.querySelector('[data-chokepoint-select="strait-of-hormuz"]');
  if (card) card.click();
  const inv = document.querySelector('[data-investigate-open]');
  if (inv) inv.click();
  else document.querySelector('[data-investigate-nav]')?.click();
  return true;
})()`, returnByValue: true });
await sleep(3500);
const desk = await send("Runtime.evaluate", { expression: `({
  href: location.href,
  ready: document.body.dataset.liveMapReady,
  chokepoint: document.body.dataset.liveMapChokepoint,
  workbenchFlag: document.body.dataset.liveMapWorkbench,
  workbench: Boolean(document.querySelector('[data-workbench]')),
  investigateBtn: Boolean(document.querySelector('[data-investigate-open]')),
  cards: document.querySelectorAll('[data-chokepoint-select]').length,
  genuine: document.querySelector('[data-genuine]')?.dataset.genuine,
  table: document.querySelector('[data-series-table]')?.innerText?.slice(0,400) || '',
  banner: document.querySelector('[data-fixture-banner]')?.textContent || '',
  reviewPending: Boolean(document.querySelector('[data-human-review-pending]')),
  tabs: [...document.querySelectorAll('[data-investigate-tab]')].map(n=>n.textContent),
  error: document.body.dataset.liveMapError || ''
})`, returnByValue: true });
const shot = await send("Page.captureScreenshot", { format: "png" });
writeFileSync(path.join(outDir, "screenshots", "investigate-desk.png"), Buffer.from(shot.data, "base64"));
writeFileSync(path.join(outDir, "result.json"), JSON.stringify({ coldMs, desk: desk.result?.value }, null, 2));
console.log(JSON.stringify({ coldMs, desk: desk.result?.value }, null, 2));
child.kill();
const value = desk.result?.value || {};
if (!value.workbench || !/75/.test(value.table || "")) process.exit(1);
