#!/usr/bin/env node
import process from "node:process";
import {
  DEFAULT_PRODUCTION_URLS,
  checkUrls,
  collectSourceUrls,
  createReporter,
  fetchWithTimeout,
  validateEventPayload,
} from "./lib/live-map-checks.mjs";

const reporter = createReporter();
const [pageUrl, apiUrl, functionUrl] = DEFAULT_PRODUCTION_URLS;

async function fetchJson(url) {
  const response = await fetchWithTimeout(url, { headers: { accept: "application/json" } }, 30000);
  const text = await response.text();
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}: ${text.slice(0, 250)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${url} did not return valid JSON`);
  }
}

try {
  const pageResponse = await fetchWithTimeout(pageUrl, { headers: { accept: "text/html" } }, 30000);
  const pageText = await pageResponse.text();
  if (!pageResponse.ok) {
    reporter.fail("production page", `${pageUrl} returned HTTP ${pageResponse.status}`);
  } else if (!pageText.includes('id="map"') || !pageText.includes("app.js")) {
    reporter.fail("production page", "HTML does not contain expected map shell");
  } else {
    reporter.pass("production page", `${pageUrl} returned HTTP ${pageResponse.status}`);
  }

  for (const url of [apiUrl, functionUrl]) {
    const payload = await fetchJson(url);
    validateEventPayload(payload, reporter, { label: url, maxAgeMs: 30 * 60 * 1000 });
    await checkUrls(collectSourceUrls(payload, 12), reporter, `${url} source URLs`);
  }
} catch (error) {
  reporter.fail("production smoke execution", error.stack || error.message);
}

const ok = reporter.print("Live Map production smoke-test report");
process.exit(ok ? 0 : 1);
