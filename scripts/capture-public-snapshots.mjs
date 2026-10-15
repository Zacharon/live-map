#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const outDir = path.resolve("artifacts/source-snapshots");
mkdirSync(outDir, { recursive: true });
const log = [];
let requests = 0;
let bytes = 0;

async function get(url, name, { max = 8 * 1024 * 1024 } = {}) {
  if (requests >= 40) throw new Error("budget");
  requests += 1;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow", headers: { "User-Agent": "LiveMap-local-research/1.0" } });
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > max) throw new Error("body too large");
    bytes += buf.length;
    const rec = { name, url, status: res.status, ok: res.ok, bytes: buf.length, sha256: createHash("sha256").update(buf).digest("hex"), requests };
    log.push(rec);
    writeFileSync(path.join(outDir, name), buf);
    console.log(JSON.stringify(rec));
    return { rec, buf, text: buf.toString("utf8") };
  } finally { clearTimeout(t); }
}

const kev = await get("https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json", "cisa-kev-full.json");
const nhc = await get("https://www.nhc.noaa.gov/xml/TWOAT.xml", "nhc-twoat.xml").catch((error) => ({ error: String(error) }));
if (nhc.error) console.log(JSON.stringify({ name: "nhc-twoat.xml", error: nhc.error }));
const swpc = await get("https://services.swpc.noaa.gov/products/alerts.json", "swpc-alerts.json").catch((error) => ({ error: String(error) }));
if (swpc.error) console.log(JSON.stringify({ name: "swpc-alerts.json", error: swpc.error }));
writeFileSync(path.join(outDir, "http-log.json"), JSON.stringify({ requests, bytes, log }, null, 2));
