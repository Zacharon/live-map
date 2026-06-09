import { createNormalizedEvent, stableStringHash } from "../../events/normalized-event.js";
import { STATUSPAGE_REGISTRY } from "./statuspage-registry.js";

function impactSeverity(impact = "") {
  const value = String(impact).toLowerCase();
  if (value.includes("critical")) return 88;
  if (value.includes("major")) return 74;
  if (value.includes("minor")) return 48;
  return 35;
}

function latestUpdate(incident = {}) {
  const updates = Array.isArray(incident.incident_updates) ? incident.incident_updates : [];
  return updates[0]?.body || incident.name || "";
}

export function normalizeStatuspageIncident(incident = {}, page = {}, now = new Date()) {
  const status = String(incident.status || "investigating").toLowerCase();
  const impact = String(incident.impact || "none").toLowerCase();
  if (!incident.id || status === "resolved" || impact === "none" || status === "scheduled") return { event: null, errors: [] };
  const updatedAt = incident.updated_at || incident.created_at || now;
  const result = createNormalizedEvent({
    id: `statuspage:${page.id}:${incident.id}`,
    provider: "statuspage",
    providerEventId: `${page.id}:${incident.id}`,
    recordKind: "event",
    domain: page.domain,
    category: page.category,
    type: page.type,
    title: `${page.name}: ${incident.name}`,
    description: String(latestUpdate(incident)).replace(/\s+/g, " ").trim().slice(0, 420),
    geographic: false,
    mapDisplayStatus: "not-mapped",
    nonGeographicReason: "Statuspage incidents describe service availability, not verified physical locations.",
    startedAt: incident.created_at || now,
    updatedAt,
    ingestedAt: now,
    severity: impactSeverity(impact),
    confidence: 88,
    status: status === "postmortem" ? "resolved" : "active",
    sourceName: page.name,
    sourceUrl: incident.shortlink || incident.url || page.homepageUrl,
    sourceType: "Official status page",
    sourceTier: "tier-1-primary-official",
    publisher: page.name,
    sourcePublishedAt: incident.created_at || updatedAt,
    verification: {
      state: "primary-confirmed",
      evidenceLevel: "official-statuspage-incident",
      independentSourceCount: 1,
    },
    tags: ["statuspage", page.id, impact, status],
    metadata: {
      verificationStatus: "primary-confirmed",
      coordinateMethod: "not applicable",
      statuspageId: page.id,
      impact,
      incidentStatus: status,
      details: {
        Provider: page.name,
        Impact: impact,
        Status: status,
      },
    },
  });
  return { event: result.valid ? result.event : null, errors: result.errors };
}

function normalizeSlackCurrent(payload = {}, page = {}, now = new Date()) {
  const active = Array.isArray(payload.active_incidents) ? payload.active_incidents : [];
  return active.map((incident) =>
    normalizeStatuspageIncident({
      id: incident.id || stableStringHash(incident.title || incident.date_created),
      name: incident.title || "Slack service incident",
      status: incident.status || "investigating",
      impact: incident.type || "minor",
      created_at: incident.date_created,
      updated_at: incident.date_updated || incident.date_created,
      shortlink: page.homepageUrl,
      incident_updates: [{ body: incident.notes || incident.title || "" }],
    }, page, now)
  );
}

export async function fetchStatuspageEvents(context = {}) {
  const now = new Date(context.now);
  const events = [];
  const rejected = [];
  let receivedCount = 0;
  for (const page of (context.statuspageRegistry || STATUSPAGE_REGISTRY).slice(0, 5)) {
    const payload = await context.fetchJson(page.apiUrl, page.name);
    const results = page.adapter === "slack-current"
      ? normalizeSlackCurrent(payload, page, now)
      : (payload.incidents || []).map((incident) => normalizeStatuspageIncident(incident, page, now));
    receivedCount += results.length;
    for (const result of results) {
      if (result.event) events.push(result.event);
      else if (result.errors?.length) rejected.push({ errors: result.errors });
    }
  }
  return { events, rejected, receivedCount, warnings: [] };
}

