import { createNormalizedEvent, stableStringHash } from "../../events/normalized-event.js";
import { classifyRipestatObservation } from "./internet-anomaly-rules.js";

export const RIPESTAT_BASE_URL = "https://stat.ripe.net/data";

function sourceapp() {
  return globalThis?.process?.env?.RIPESTAT_SOURCEAPP || "";
}

function resources() {
  return String(globalThis?.process?.env?.RIPESTAT_RESOURCES || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export function ripestatUrl(endpoint, resource) {
  const params = new URLSearchParams({ resource, sourceapp: sourceapp() || "liveworldmap-preview" });
  return `${RIPESTAT_BASE_URL}/${endpoint}/data.json?${params}`;
}

export function normalizeRipestatObservation(resource, payload = {}, now = new Date()) {
  const data = payload.data || {};
  const visibility = data.visibility ?? data.visibility_score ?? data.announced_space?.visibility;
  const rpkiStatus = data.validity?.state || data.status || null;
  const observation = {
    recordKind: "observation",
    provider: "ripestat",
    resource,
    visibility,
    rpkiStatus,
    observedAt: payload.time || now.toISOString(),
    sourceUrl: `https://stat.ripe.net/${resource}`,
  };
  const classification = classifyRipestatObservation(observation);
  if (!classification.material) return { event: null, observation, errors: [] };
  const result = createNormalizedEvent({
    id: `ripestat:${resource}:${stableStringHash(`${classification.type}:${observation.observedAt}`)}`,
    provider: "ripestat",
    providerEventId: `${resource}:${classification.type}`,
    recordKind: "event",
    domain: "infrastructure",
    category: "infrastructure",
    type: classification.type,
    title: `RIPEstat ${classification.type.replace(/-/g, " ")} for ${resource}`,
    description: classification.reason,
    geographic: false,
    mapDisplayStatus: "not-mapped",
    nonGeographicReason: "Internet routing observations are network-resource records unless independently tied to a verified geography.",
    startedAt: observation.observedAt,
    updatedAt: observation.observedAt,
    ingestedAt: now,
    severity: classification.severity,
    confidence: 70,
    status: "monitoring",
    sourceName: "RIPEstat",
    sourceUrl: observation.sourceUrl,
    sourceType: "Open Internet measurement API",
    sourceTier: "tier-2-structured-established",
    sourcePublishedAt: observation.observedAt,
    verification: {
      state: "observed",
      evidenceLevel: "measurement-observation",
      independentSourceCount: 1,
    },
    tags: ["RIPEstat", resource, classification.type],
    metadata: {
      verificationStatus: "observed",
      coordinateMethod: "not applicable",
      observation,
      details: {
        Resource: resource,
        Visibility: visibility ?? "Unknown",
        "RPKI status": rpkiStatus || "Unknown",
      },
    },
  });
  return { event: result.valid ? result.event : null, observation, errors: result.errors };
}

export async function fetchRipestatEvents(context = {}) {
  if (!sourceapp() || resources().length === 0) {
    return {
      events: [],
      rejected: [],
      observations: [],
      status: "configuration-required",
      warnings: ["RIPESTAT_SOURCEAPP and RIPESTAT_RESOURCES are required before RIPEstat queries run."],
      safeError: "RIPEstat is implemented but needs RIPESTAT_SOURCEAPP and RIPESTAT_RESOURCES.",
      requestAttempted: false,
    };
  }
  const now = new Date(context.now);
  const events = [];
  const observations = [];
  const rejected = [];
  for (const resource of resources()) {
    const payload = await context.fetchJson(ripestatUrl("visibility", resource), "RIPEstat");
    const result = normalizeRipestatObservation(resource, payload, now);
    observations.push(result.observation);
    if (result.event) events.push(result.event);
    else if (result.errors?.length) rejected.push({ id: resource, errors: result.errors });
  }
  return { events, observations, rejected, receivedCount: observations.length };
}

