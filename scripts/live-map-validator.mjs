#!/usr/bin/env node
import process from "node:process";
import {
  checkUrls,
  collectSourceUrls,
  createReporter,
  loadLocalEventPayload,
  runSyntaxChecks,
  scanBrowserSecrets,
  validateEventPayload,
} from "./lib/live-map-checks.mjs";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const reporter = createReporter();

try {
  if (!args.has("--security-only")) {
    await runSyntaxChecks(root, reporter);
  }

  await scanBrowserSecrets(root, reporter);

  if (!args.has("--security-only")) {
    const payload = await loadLocalEventPayload(root);
    validateEventPayload(payload, reporter, { label: "local /api/events" });
    await checkUrls(collectSourceUrls(payload), reporter, "local /api/events source URLs");
  }
} catch (error) {
  reporter.fail("validator execution", error.stack || error.message);
}

const ok = reporter.print("Live Map validator report");
process.exit(ok ? 0 : 1);
