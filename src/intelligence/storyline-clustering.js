import { stableStringHash } from "../events/normalized-event.js";
import { independentObservationCount } from "./source-independence.js";

const STOP_WORDS = new Set(["the", "a", "an", "and", "or", "of", "to", "in", "for", "on", "with", "from", "at", "by", "after", "over", "new"]);

export function storylineTokens(value = "") {
  return [...new Set(String(value).toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((word) => word.length > 2 && !STOP_WORDS.has(word)))].slice(0, 12);
}

export function storylineKey(observation = {}) {
  const tokens = storylineTokens(observation.title).sort().slice(0, 6);
  const bucket = Math.floor(new Date(observation.observedAt || 0).getTime() / (6 * 3600000));
  return `${tokens.join("-") || "untitled"}:${Number.isFinite(bucket) ? bucket : 0}`;
}

function verificationFor(observations) {
  const independentCount = independentObservationCount(observations);
  const primary = observations.some((item) => /^tier-[12]-/.test(item.sourceTier) && ["primary-confirmed", "official-confirmed"].includes(item.verificationState));
  if (primary) return { state: "primary-confirmed", independentSourceCount: independentCount };
  if (independentCount >= 2) return { state: "corroborated", independentSourceCount: independentCount };
  return { state: "unverified", independentSourceCount: independentCount };
}

export function buildStorylines(observations = [], options = {}) {
  const now = Number(options.now || Date.now());
  const groups = new Map();
  for (const observation of observations) {
    const key = storylineKey(observation);
    groups.set(key, [...(groups.get(key) || []), observation]);
  }
  return [...groups.entries()].map(([key, items]) => {
    const ordered = [...items].sort((a, b) => new Date(b.observedAt) - new Date(a.observedAt));
    const latest = ordered[0];
    const verification = verificationFor(ordered);
    const ageHours = Math.max(1, (now - new Date(latest.observedAt).getTime()) / 3600000);
    const trend = Math.round((ordered.length / ageHours) * 100) / 100;
    return {
      id: `storyline:${stableStringHash(key)}`,
      key,
      title: latest.title,
      latestObservedAt: latest.observedAt,
      observationCount: ordered.length,
      sourceOrganizationCount: new Set(ordered.map((item) => item.sourceOrganizationId)).size,
      verification,
      trend: { observationsPerHour: trend, state: ordered.length >= 4 && ageHours <= 12 ? "trending" : "normal" },
      observationIds: ordered.map((item) => item.id),
      coverageGaps: verification.independentSourceCount < 2 ? ["Needs an independent source organization."] : [],
    };
  }).sort((a, b) => new Date(b.latestObservedAt) - new Date(a.latestObservedAt) || b.observationCount - a.observationCount);
}
