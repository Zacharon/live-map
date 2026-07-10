/**
 * Lightweight visual identity smoke QA — checks rendered class hooks exist.
 * No browser/screenshot required.
 */
import { renderOsintDashboardShell, renderOsintEventDetailDrawer } from "../src/ui/osint-dashboard-v2/shell.js";
import { renderThreatBadge } from "../src/ui/osint-dashboard-v2/threat-badge.js";
import { computeThreatLevel } from "../src/intelligence/threat-level.js";

function host() {
  return {
    innerHTML: "",
    hidden: false,
    classList: { toggle() {} },
  };
}

const now = Date.now();
const event = {
  id: "vis-1",
  title: "Visual QA critical event",
  summary: "Smoke fixture",
  severity: "critical",
  domain: "conflict-security",
  category: "conflict",
  occurredAt: now - 60000,
  updatedAt: now,
  lat: 1,
  lon: 2,
  place: "Test",
  country: "XX",
  sourceName: "Fixture",
  confidence: 80,
};

const shell = host();
renderOsintDashboardShell(shell, {
  events: [event],
  filters: {},
  hours: 24,
  lastLoaded: now,
  systemStatus: "operational",
  sourceStatus: { fixture: { state: "operational" } },
  providerResults: [{ id: "fixture", state: "operational" }],
  changeSummary: {
    hasPreviousSnapshot: true,
    lastSeenAt: now - 3600000,
    newEvents: [event],
    updatedEvents: [],
    newClusters: [],
    changedClusters: [],
  },
});

const drawer = host();
renderOsintEventDetailDrawer(drawer, {
  event,
  allEvents: [event],
  clusters: [],
  changeStatus: "new",
});

const threatHtml = renderThreatBadge(computeThreatLevel(event, { now }));

const checks = [
  ["command bar class", /v2-command-bar/.test(shell.innerHTML)],
  ["legend class", /v2-legend/.test(shell.innerHTML)],
  ["summary cards", /v2-summary-cards/.test(shell.innerHTML)],
  ["change awareness", /v2-change-awareness|Since last visit/.test(shell.innerHTML)],
  ["timeline", /v2-timeline/.test(shell.innerHTML)],
  ["threat badge class", /v2-threat-/.test(threatHtml)],
  ["drawer threat section", /v2-threat-explain|Threat level/.test(drawer.innerHTML)],
  ["drawer connections", /v2-connections|Connected events/.test(drawer.innerHTML)],
  ["drawer artifact", /v2-artifact|OSINT artifact|Copy Markdown/.test(drawer.innerHTML)],
  ["export actions", /data-v2-artifact-action/.test(drawer.innerHTML)],
  ["why-shown block", /v2-why-shown|Why am I seeing this/.test(drawer.innerHTML)],
];

let fail = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} - ${name}`);
  if (!ok) fail += 1;
}
console.log(fail ? `VISUAL_SMOKE_FAIL ${fail}` : "VISUAL_SMOKE_PASS all");
process.exit(fail ? 1 : 0);
