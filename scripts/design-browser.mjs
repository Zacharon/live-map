import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Local design QA using the project's installed Edge, with an isolated profile.
// No provider calls are added; the static preview keeps APIs unavailable.
export const out = path.resolve('artifacts/design-build-2026-09-30');
export const preview = 'http://127.0.0.1:8770';
const pause = ms => new Promise(r => setTimeout(r, ms));
export async function connect({port=9355,profileName='edge-profile',extension=null}={}) {
  mkdirSync(out, { recursive: true });
  try { await fetch(`http://127.0.0.1:${port}/json/version`); }
  catch {
    const child = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
      '--headless=new', `--user-data-dir=${path.join(out, profileName)}`,
      `--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1',
      '--remote-allow-origins=*', '--no-first-run', '--no-default-browser-check',
      ...(extension ? [`--disable-extensions-except=${extension}`,`--load-extension=${extension}`] : ['--disable-extensions']), '--window-size=1440,900', 'about:blank',
    ], { stdio: 'ignore', detached: true, windowsHide: true });
    child.unref();
    for (let i = 0; i < 50; i++) {
      try { if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) break; } catch {}
      await pause(200);
    }
  }
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = list.find(t => t.type === 'page' && t.url.startsWith(preview))
    || list.find(t => t.type === 'page' && /^(https?:|about:blank)/.test(t.url));
  if (!target) throw Error('No inspectable page in the isolated QA browser');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve); ws.addEventListener('error', reject); });
  let id = 0; const pending = new Map(); const errors = []; const network = [];
  ws.addEventListener('message', event => {
    const m = JSON.parse(event.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(Error(m.error.message)) : p.resolve(m.result); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails);
    if (m.method === 'Network.loadingFailed') network.push(m.params);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const key = ++id;
    const timer = setTimeout(() => { pending.delete(key); reject(Error(`CDP timeout: ${method}`)); }, 30000);
    pending.set(key, { resolve: v => { clearTimeout(timer); resolve(v); }, reject: e => { clearTimeout(timer); reject(e); } });
    ws.send(JSON.stringify({ id: key, method, params }));
  });
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  const evaluate = async expression => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result?.value;
  };
  const size = async (width, height) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await pause(500); // Media-query listeners and the map resize settle asynchronously.
  };
  const go = async url => {
    const previousOrigin = await evaluate('performance.timeOrigin');
    await send('Page.navigate', { url });
    for (let i=0;i<100;i++) {
      try { if(await evaluate(`performance.timeOrigin!==${previousOrigin} && document.readyState==='complete'`)) break; } catch {}
      await pause(100);
    }
    if (url.startsWith(preview)) {
      for (let i = 0; i < 100; i++) { if (await evaluate("document.body?.dataset.liveMapReady==='1'")) break; await pause(150); }
    } else await pause(1800);
    if (url.startsWith(preview) && await evaluate("document.body?.dataset.liveMapMode==='3d'")) {
      for (let i = 0; i < 120; i++) {
        if (await evaluate("['cesium','leaflet-fallback'].includes(document.body?.dataset.liveMapRenderer)")) break;
        await pause(150);
      }
      await pause(1500);
    }
    await pause(500);
  };
  const shot = async name => {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    const file = path.join(out, `${name}.png`); writeFileSync(file, Buffer.from(r.data, 'base64')); return file;
  };
  const click = async selector => {
    const box = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}); if(!e)throw Error('Missing control');e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();if(!r.width||!r.height||getComputedStyle(e).visibility==='hidden')throw Error('Control is not visible: '+${JSON.stringify(selector)});return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...box, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...box, button: 'left', clickCount: 1 }); await pause(350);
  };
  return { send, evaluate, go, shot, click, size, pause, errors, network, close: () => ws.close() };
}
if (process.argv[1] === import.meta.filename) {
  const b = await connect();
  try {
    if (process.argv[2] === 'eval') console.log(JSON.stringify(await b.evaluate(readFileSync(process.argv[3], 'utf8')), null, 2));
    if (process.argv[2] === 'shot') console.log(await b.shot(process.argv[3]));
    if (process.argv[2] === 'baseline') {
      await b.size(1440, 900); await b.go(`${preview}/?demo=foundation&mapMode=3d`);
      console.log(await b.shot('before-global'));
      await b.click('[data-event-detail]'); console.log(await b.shot('before-selected-region'));
      await b.click('[data-v2-close-detail]');
      await b.go(`${preview}/?demo=foundation&mapMode=3d&view=chokepoints&chokepoint=strait-of-hormuz`);
      await b.click('#watchDock>summary'); console.log(await b.shot('before-historical'));
      await b.size(390, 844); console.log(await b.shot('before-mobile'));
      writeFileSync(path.join(out, 'before-browser.json'), JSON.stringify({errors:b.errors,network:b.network},null,2));
    }
  } finally { b.close(); }
}
