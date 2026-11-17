#!/usr/bin/env node
/**
 * One-shot bounded capture of a historical IMF PortWatch Hormuz extract.
 * Not a runtime adapter. Not production polling. Do not import this from the app.
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const outDir = path.resolve("artifacts/hormuz-portwatch-2025-01");
mkdirSync(outDir, { recursive: true });

const budget = { maxRequests: 12, maxBytesEach: 2 * 1024 * 1024, maxBytesTotal: 10 * 1024 * 1024, timeoutMs: 20000, retries: 1 };
const state = { requests: 0, bytes: 0, log: [] };

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

async function get(url, name) {
  if (state.requests >= budget.maxRequests) throw new Error("request budget exceeded");
  let lastError = null;
  for (let attempt = 0; attempt <= budget.retries; attempt += 1) {
    if (state.requests >= budget.maxRequests) throw new Error("request budget exceeded");
    state.requests += 1;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), budget.timeoutMs);
    const started = new Date().toISOString();
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        redirect: "follow",
        headers: { "User-Agent": "LiveMap-local-research/1.0 (bounded historical sample; not a production poller)" },
      });
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > budget.maxBytesEach) throw new Error(`per-response 2MiB exceeded: ${name} ${buf.length}`);
      state.bytes += buf.length;
      if (state.bytes > budget.maxBytesTotal) throw new Error("total 10MiB exceeded");
      const rec = {
        name,
        url,
        started,
        ended: new Date().toISOString(),
        status: res.status,
        ok: res.ok,
        bytes: buf.length,
        attempt,
        requests: state.requests,
        sha256: sha256(buf),
        error: null,
      };
      state.log.push(rec);
      writeFileSync(path.join(outDir, name), buf);
      writeFileSync(path.join(outDir, "http-log.json"), JSON.stringify({ budget, state: { requests: state.requests, bytes: state.bytes }, log: state.log }, null, 2));
      console.log(JSON.stringify(rec));
      return { rec, buf, text: buf.toString("utf8"), res };
    } catch (error) {
      lastError = error;
      const rec = {
        name,
        url,
        started,
        ended: new Date().toISOString(),
        status: null,
        ok: false,
        bytes: 0,
        attempt,
        requests: state.requests,
        sha256: null,
        error: String(error),
      };
      state.log.push(rec);
      console.error(JSON.stringify(rec));
      if (attempt >= budget.retries) throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

const LAYER = "https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0";

const phase = process.argv[2] || "meta";

if (phase === "meta") {
  await get(`${LAYER}?f=pjson`, "layer-metadata.json");
  await get("https://portwatch.imf.org/pages/data-and-methodology", "methodology.html");
  await get("https://portwatch.imf.org/pages/faqs", "faqs.html");
  process.exit(0);
}

if (phase === "identity") {
  const where = encodeURIComponent("portname LIKE '%Hormuz%' OR portid = 'chokepoint6'");
  const url = `${LAYER}/query?where=${where}&outFields=portid,portname&returnDistinctValues=true&returnGeometry=false&resultRecordCount=20&f=json`;
  await get(url, "identity-hormuz.json");
  process.exit(0);
}

if (phase === "extract") {
  const portid = process.argv[3] || "chokepoint6";
  const start = process.argv[4] || "2025-01-01";
  const end = process.argv[5] || "2025-01-07";
  const where = encodeURIComponent(`portid = '${portid}' AND date >= DATE '${start}' AND date <= DATE '${end}'`);
  const fields = encodeURIComponent("portid,portname,date,n_total");
  const url = `${LAYER}/query?where=${where}&outFields=${fields}&returnGeometry=false&orderByFields=date&resultRecordCount=7&f=json`;
  await get(url, `extract-${portid}-${start}-${end}.json`);
  process.exit(0);
}

console.error("usage: capture-portwatch-hormuz-sample.mjs meta|identity|extract [portid start end]");
process.exit(2);
