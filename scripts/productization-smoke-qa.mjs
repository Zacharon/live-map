/**
 * Scripted productization QA (no browser). Safe to delete after PR.
 */
import { computeThreatLevel } from "../src/intelligence/threat-level.js";
import { buildEventConnections } from "../src/intelligence/event-connections.js";
import { buildEventClusters } from "../src/events/clustering.js";
import { renderEventDetailDrawer } from "../src/ui/osint-dashboard-v2/event-detail-drawer.js";
import { renderOsintDashboardShell } from "../src/ui/osint-dashboard-v2/shell.js";
import { artifactToMarkdown, artifactToJsonString } from "../src/ui/osint-dashboard-v2/artifact-export.js";
import { buildEventArtifact } from "../src/artifacts/event-artifacts.js";
import { renderChangeAwarenessPanel } from "../src/ui/osint-dashboard-v2/change-awareness-panel.js";
import { renderProviderHealthSummary } from "../src/ui/osint-dashboard-v2/provider-health-summary.js";

const now = Date.now();
const high = {
  id: "qa-high-1",
  title: "M6.8 earthquake near city",
  summary: "Strong quake",
  severity: "critical",
  domain: "natural-disaster",
  category: "earthquake",
  occurredAt: now - 20 * 60 * 1000,
  updatedAt: now - 10 * 60 * 1000,
  lat: 35.6,
  lon: 139.7,
  place: "Tokyo",
  country: "Japan",
  sourceName: "USGS",
  sourceUrl: "https://example.com/q",
  provider: "usgs",
  confidence: 90,
};
const related = {
  id: "qa-rel-1",
  title: "Aftershock M5.1",
  summary: "Aftershock",
  severity: "high",
  domain: "natural-disaster",
  category: "earthquake",
  occurredAt: now - 15 * 60 * 1000,
  lat: 35.61,
  lon: 139.72,
  place: "Tokyo",
  country: "Japan",
  sourceName: "EMSC",
  provider: "emsc",
  confidence: 75,
};
const events = [high, related];
const clusters = buildEventClusters(events);
const threat = computeThreatLevel(high, { cluster: clusters[0], relatedCount: 1, now });
const conn = buildEventConnections(high, { allEvents: events, clusters });
const drawer = renderEventDetailDrawer(high, { changeStatus: "new", allEvents: events, clusters });
const drawer2 = renderEventDetailDrawer(related, { allEvents: events, clusters });
const fake = { innerHTML: "", hidden: false, classList: { toggle() {} } };
renderOsintDashboardShell(fake, {
  events: [],
  filters: { domains: new Set(["x"]) },
  hours: 1,
  lastLoaded: now,
  systemStatus: "ok",
  sourceStatus: {},
  providerResults: [],
  changeSummary: { hasPreviousSnapshot: false },
});
const emptyShell = fake.innerHTML;
const artifact = buildEventArtifact(high, { allEvents: events, clusters, now });
const md = artifactToMarkdown(artifact);
const json = artifactToJsonString(artifact);
const changeHtml = renderChangeAwarenessPanel({
  hasPreviousSnapshot: true,
  lastSeenAt: now - 3600000,
  newEvents: [high],
  updatedEvents: [],
  newClusters: [],
  changedClusters: [],
});
const healthHtml = renderProviderHealthSummary(
  { usgs: { state: "operational" } },
  [{ id: "usgs", state: "operational" }],
);

const checks = [
  ["threat has reasons", threat.reasons?.length > 0],
  ["threat has caveats", threat.caveats?.length > 0],
  ["threat elevated+", ["elevated", "high", "critical"].includes(threat.level)],
  ["drawer threat section", /Threat level v0|v2-threat-badge/.test(drawer)],
  ["drawer connections", /Connected events|v2-connection/.test(drawer)],
  ["drawer connected click attr", drawer.includes('data-v2-timeline-event="qa-rel-1"')],
  ["drawer artifact export", /Copy Markdown|data-v2-artifact-action/.test(drawer)],
  ["connected event drawer", drawer2.includes("Aftershock")],
  ["empty focus useful", /No events|clear filters|filters/i.test(emptyShell)],
  ["operator bar present", /Operator view/.test(emptyShell)],
  ["markdown export", md.includes("## Artifact Summary") && md.length > 200],
  ["json export", JSON.parse(json).schemaVersion === "v1"],
  ["change awareness", /Since last visit|New/.test(changeHtml)],
  ["provider health", /provider|usgs|health|Active/i.test(healthHtml)],
  ["connections non-empty", conn.relatedEvents.length >= 1],
];

let fail = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} - ${name}`);
  if (!ok) fail += 1;
}
console.log(fail ? `SMOKE_FAIL ${fail}` : "SMOKE_PASS all");
process.exit(fail ? 1 : 0);
