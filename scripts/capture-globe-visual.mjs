// Before/after 3D globe captures against the synthetic foundation preview.
// Usage: node scripts/preview-foundation.mjs 8770 & node scripts/capture-globe-visual.mjs before|after
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { connect, preview } from './design-browser.mjs';

const phase = process.argv[2] || 'after';
const dir = path.resolve('artifacts/globe-visual-2026-10-17');
mkdirSync(dir, { recursive: true });
const b = await connect();
const save = async (name) => { const file = await b.shot(`globe-${phase}-${name}`); copyFileSync(file, path.join(dir, `${phase}-${name}.png`)); };
const state = () => b.evaluate("({renderer:document.body.dataset.liveMapRenderer,reason:document.body.dataset.liveMapGlobeReason,events:document.getElementById('globeStage')?.dataset.globeEventCount})");
const rows = [];
try {
  await b.size(1440, 900);
  await b.go(`${preview}/?demo=foundation&mapMode=3d`);
  await b.pause(2500);
  rows.push({ step: 'global', ...(await state()) }); await save('global');
  await b.click('[data-event-detail]'); await b.pause(2500);
  rows.push({ step: 'selected', ...(await state()) }); await save('selected');
  await b.go(`${preview}/?demo=foundation&mapMode=3d&view=chokepoints&chokepoint=strait-of-hormuz`); await b.pause(2500);
  rows.push({ step: 'hormuz', ...(await state()) }); await save('hormuz');
  await b.size(390, 844); await b.go(`${preview}/?demo=foundation&mapMode=3d`); await b.pause(2500);
  rows.push({ step: 'mobile', ...(await state()) }); await save('mobile');
} finally {
  writeFileSync(path.join(dir, `${phase}-browser.json`), JSON.stringify({ rows, errors: b.errors, network: b.network }, null, 2));
  b.close();
}
console.log(JSON.stringify(rows));
