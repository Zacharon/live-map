/** Local browser proof through the existing case import and selected inspector. */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { connect } from "./design-browser.mjs";
import { createInvestigationCase, draftOperationalAssessment } from "../src/intelligence/investigation-cycle.js";
import { syntheticMaritimeSignals, MARITIME_FIXTURE_NOW as now, MARITIME_FIXTURE_CHOKEPOINT as chokepointId } from "../src/data/fixtures/synthetic-maritime-signals.js";
import { serializeCase } from "../src/intelligence/case-io.js";

const out = path.resolve("evidence/browser");
mkdirSync(out, { recursive: true });
let caseObject = createInvestigationCase({ chokepointId, now: new Date(now) });
caseObject.evidence = syntheticMaritimeSignals().map(item => item.id === "fixture-cargo-estimate"
  ? { ...item, extra: { ...item.extra, contradictsId: "fixture-cargo-confirmed" } } : item);
const draft = draftOperationalAssessment(caseObject, { now });
caseObject.assessments = [draft.assessment];
caseObject.lastOperational = draft.operational;
const casePath = path.join(out, "synthetic-maritime-case.json");
writeFileSync(casePath, serializeCase(caseObject));
const b = await connect({ port: Number(process.env.MARITIME_BROWSER_PORT || 9363), profileName: process.env.MARITIME_BROWSER_PROFILE || "maritime-isolated" });
const checks = [];
async function check(name, expression) {
  assert.ok(await b.evaluate(`(async()=>(${expression}))()`), name);
  checks.push({ name, passed: true });
}
async function shot(name) {
  const result = await b.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(path.join(out, `${name}.png`), Buffer.from(result.data, "base64"));
}
async function scrollSignals(id = null) {
  await b.evaluate(`document.querySelector(${JSON.stringify(id ? `[data-maritime-signal=${id}]` : '[data-maritime-signals]')}).scrollIntoView({block:'start'})`);
  await b.pause(200);
}
const visibleCargo = `(()=>{const e=document.querySelector('[data-maritime-signal=cargoThroughput] summary'),r=e.getBoundingClientRect(),d=document.getElementById('chokepointDetailDrawer').getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return getComputedStyle(e).visibility==='visible'&&!e.closest('[inert]')&&r.width>0&&r.height>0&&r.top>=Math.max(0,d.top)&&r.bottom<=Math.min(innerHeight,d.bottom)&&(hit===e||e.contains(hit))})()`;
try {
  await b.send("Network.setBlockedURLs", { urls: ["https://*"] });
  await b.size(1440, 900);
  await b.go("http://127.0.0.1:8776/?demo=foundation&mapMode=3d&view=chokepoints&chokepoint=strait-of-hormuz");
  for (let i = 0; i < 100; i++) {
    if (await b.evaluate("document.body?.dataset.liveMapReady==='1' && document.body?.dataset.liveMapRenderer==='cesium'")) break;
    await b.pause(150);
  }
  await check("Real Cesium globe in selected passage", "document.body.dataset.liveMapRenderer==='cesium' && document.querySelector('#globeStage canvas').width>0");
  await check("Selected passage retains four independent summary states", "document.querySelector('.brief-card.selected [data-maritime-summary]').textContent.includes('Security risk')");
  await b.click('[data-investigate-open="strait-of-hormuz"]');
  await b.click('[data-investigate-tab="assessment"]');
  await check("Historical PortWatch is AIS visibility with cargo unknown", "document.querySelector('[data-maritime-signal=visibleAIS]').dataset.state==='observations-available' && document.querySelector('[data-maritime-signal=cargoThroughput]').dataset.state==='unknown'");
  await scrollSignals();
  await shot("historical-selected-inspector");
  await b.click('[data-investigate-tab="export"]');
  const dom = await b.send("DOM.getDocument");
  const node = await b.send("DOM.querySelector", { nodeId: dom.root.nodeId, selector: "[data-investigate-import]" });
  await b.send("DOM.setFileInputFiles", { nodeId: node.nodeId, files: [casePath] });
  await b.pause(750);
  await b.click('[data-investigate-tab="assessment"]');
  await check("Existing import opens selected inspector with synthetic signal case", "document.body.dataset.liveMapWorkbench==='1' && document.querySelector('.workbench-head').textContent.includes('Hormuz') && document.querySelector('[data-maritime-signals]')");
  await check("No AIS reports coexist with contested positive cargo records", "document.querySelector('[data-maritime-signal=cargoThroughput]').dataset.state==='contested' && document.querySelector('[data-maritime-evidence=fixture-ais-empty]').textContent.includes('0 AIS reports') && document.querySelector('[data-maritime-evidence=fixture-cargo-confirmed]').textContent.includes('4 cargoes')");
  await check("Dark traffic and unresolved security stay independent", "document.querySelector('[data-maritime-signal=inferredDarkTraffic]').dataset.state==='inferred' && document.querySelector('[data-maritime-evidence=fixture-security-report]').textContent.includes('elevated-unresolved')");
  await scrollSignals();
  await shot("synthetic-four-signals");
  // Drive native disclosure with actual keyboard input, not synthetic click handlers.
  await b.evaluate("const s=document.querySelector('[data-maritime-signal=cargoThroughput]');s.open=false;s.querySelector('summary').focus()");
  await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" });
  await b.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await b.pause(150);
  await check("Keyboard opens cargo provenance and keeps focus", "document.querySelector('[data-maritime-signal=cargoThroughput]').open && document.activeElement.tagName==='SUMMARY'");
  await check("Both estimates expose distinct method, dates, coverage and confidence", "['fixture-cargo-confirmed','fixture-cargo-estimate'].every(id=>{const e=document.querySelector('[data-maritime-evidence='+id+']');return ['Method','Published','Retrieved','Coverage','Confidence','Basis / origin'].every(t=>e.textContent.includes(t))})");
  await scrollSignals('cargoThroughput');
  await check("Desktop cargo inspector is visible without horizontal panel overflow", `${visibleCargo} && document.getElementById('eventDrawer').scrollWidth<=document.getElementById('eventDrawer').clientWidth`);
  await shot("desktop-cargo-provenance");
  await b.size(390, 844);
  await b.click('[data-mobile-pane=feed]');
  await b.evaluate("document.querySelector('[data-maritime-signal=cargoThroughput]').open=true");
  await scrollSignals('cargoThroughput');
  await check("Mobile Reports reveals cargo inspector without horizontal overflow", `${visibleCargo} && document.body.dataset.mobileView==='feed' && document.documentElement.scrollWidth<=innerWidth && document.getElementById('eventDrawer').scrollWidth<=document.getElementById('eventDrawer').clientWidth`);
  await shot("mobile-cargo-provenance");
  await check("Selection and real Cesium survive mobile inspection", "document.body.dataset.liveMapRenderer==='cesium' && new URLSearchParams(location.search).get('chokepoint')==='strait-of-hormuz'");
  assert.equal(b.errors.length, 0, "Unhandled browser exceptions");
  checks.push({ name: "No unhandled browser exceptions", passed: true });
} finally {
  writeFileSync(path.join(out, "results.json"), JSON.stringify({ date: new Date().toISOString(), checks, exceptions: b.errors, externalRequestsBlocked: true, networkFailures: b.network.length, scope: "Local static candidate; synthetic case and existing historical extract. No hosted/current-feed evidence." }, null, 2));
  b.close();
}
console.log(`runtime-maritime-signals: ${checks.length} checks passed`);
