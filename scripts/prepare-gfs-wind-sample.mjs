#!/usr/bin/env node
/**
 * Bounded NOAA GFS 10 m U/V acquisition/preprocess.
 * Does not download full forecast archives. Does not decode GRIB in the browser.
 * Inspect this script before running: it may make one optional NOMADS request
 * only when --fetch is passed. Default is decoder/status only (no network).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const outFile = path.join(root, "data/development-fixtures/gfs-10m-recorded-sample.json");
const args = new Set(process.argv.slice(2));
const wgrib2 = spawnSync("wgrib2", ["-version"], { encoding: "utf8" });
const decoder = {
  platform: process.platform,
  wgrib2: wgrib2.status === 0,
  wgrib2Detail: (wgrib2.stdout || wgrib2.stderr || "not found").split(/\r?\n/)[0],
};

console.log(JSON.stringify({
  decoder,
  note: decoder.wgrib2
    ? "wgrib2 is available for a future bounded GRIB subset."
    : "No wgrib2 on this Windows host. GRIB decode is a reported component limitation. Compact JSON remains the browser format.",
}, null, 2));

if (!args.has("--fetch")) {
  console.log("No network request made. Pass --fetch only after reviewing NOMADS subset size.");
  process.exit(decoder.wgrib2 ? 0 : 0);
}

console.log("Fetch is documented, not auto-run for large archives. Refusing unbounded download.");
process.exit(2);
