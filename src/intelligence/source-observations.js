import { stableStringHash, toIsoString } from "../events/normalized-event.js";

const TRACKING_PARAMS = new Set(["fbclid", "gclid", "mc_cid", "mc_eid", "ref", "source"]);
const MAX_EXCERPT_LENGTH = 360;

export const OBSERVATION_TYPES = ["news", "feed", "social", "video", "forum", "reference"];

export function canonicalizeObservationUrl(value = "") {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_") || TRACKING_PARAMS.has(key.toLowerCase())) url.searchParams.delete(key);
    }
    return url.href.replace(/\/$/, "");
  } catch {
    return "";
  }
}

export function safeExcerpt(value = "", maxLength = MAX_EXCERPT_LENGTH) {
  return String(value).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function normalizeSourceOrganization(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function createSourceObservation(input = {}, now = new Date()) {
  const canonicalUrl = canonicalizeObservationUrl(input.url || input.canonicalUrl || input.sourceUrl);
  const observedAt = toIsoString(input.observedAt || input.publishedAt || input.updatedAt, now.toISOString());
  const sourceOrganizationId = normalizeSourceOrganization(input.sourceOrganizationId || input.organization || input.publisher || input.sourceName || input.provider);
  const provider = String(input.provider || "unknown");
  const externalId = String(input.externalId || input.id || canonicalUrl || input.title || observedAt);
  const id = input.id || `observation:${provider}:${stableStringHash(`${externalId}:${canonicalUrl}`)}`;
  return {
    id,
    provider,
    observationType: OBSERVATION_TYPES.includes(input.observationType) ? input.observationType : "news",
    sourceOrganizationId: sourceOrganizationId || "unknown-source",
    sourceOrganizationName: String(input.sourceOrganizationName || input.publisher || input.sourceName || provider),
    publisher: String(input.publisher || input.sourceName || provider),
    canonicalUrl,
    url: canonicalUrl || null,
    title: safeExcerpt(input.title || "Untitled observation", 500),
    excerpt: safeExcerpt(input.excerpt || input.summary || input.description),
    language: String(input.language || "und").slice(0, 20),
    observedAt,
    ingestedAt: toIsoString(input.ingestedAt, now.toISOString()),
    sourceTier: input.sourceTier || "tier-5-discovery-only",
    verificationState: input.verificationState || "unverified",
    externalId,
    authorHandle: input.authorHandle ? String(input.authorHandle).slice(0, 120) : null,
    channelId: input.channelId ? String(input.channelId).slice(0, 160) : null,
    engagement: Number.isFinite(Number(input.engagement)) ? Math.max(0, Number(input.engagement)) : null,
    syndication: input.syndication || null,
    provenance: input.provenance || "provider-metadata",
    rawRetention: "none",
  };
}

export function validateSourceObservation(observation) {
  const errors = [];
  for (const key of ["id", "provider", "sourceOrganizationId", "title", "observedAt", "ingestedAt", "sourceTier", "verificationState"]) {
    if (!observation?.[key]) errors.push(`missing ${key}`);
  }
  if (observation?.canonicalUrl && !/^https:\/\//.test(observation.canonicalUrl)) errors.push("canonicalUrl must use HTTPS");
  if (observation?.excerpt?.length > MAX_EXCERPT_LENGTH) errors.push("excerpt exceeds retention-safe maximum");
  return { valid: errors.length === 0, errors };
}
