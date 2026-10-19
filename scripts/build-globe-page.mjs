#!/usr/bin/env node
// Generates globe.html from index.html. The globe page is the same workspace,
// served under a CSP that allows the eval Cesium needs (see netlify.toml).
// Run `node scripts/build-globe-page.mjs` after editing index.html; `--check`
// fails when globe.html is out of date.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "index.html");
const target = path.join(root, "globe.html");

export function buildGlobePage(html) {
  const swaps = [
    [/<title>[^<]*<\/title>/, "<title>Live Map — 3D globe</title>"],
    [/<link rel="canonical" href="\/" \/>/, '<link rel="canonical" href="/globe.html" />\n  <meta name="live-map-page" content="globe" />'],
    [/<option value="2d" selected>2D map<\/option><option value="3d">3D globe<\/option>/, '<option value="2d">2D map</option><option value="3d" selected>3D globe</option>'],
    [/<!doctype html>/i, "<!doctype html>\n<!-- Generated from index.html by scripts/build-globe-page.mjs. Do not edit by hand. -->"],
  ];
  let out = html;
  for (const [pattern, replacement] of swaps) {
    if (!pattern.test(out)) throw new Error(`index.html is missing ${pattern}`);
    out = out.replace(pattern, replacement);
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const expected = buildGlobePage(readFileSync(source, "utf8"));
  if (process.argv.includes("--check")) {
    let current = "";
    try { current = readFileSync(target, "utf8"); } catch {}
    if (current !== expected) {
      console.error("globe.html is out of date. Run: node scripts/build-globe-page.mjs");
      process.exit(1);
    }
    console.log("globe.html matches index.html");
  } else {
    writeFileSync(target, expected);
    console.log("Wrote globe.html");
  }
}
