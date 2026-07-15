import { CHOKEPOINT_STATUSES, STRATEGIC_CHOKEPOINTS } from "../data/strategic-chokepoints.js";

const SEVERITY_POINTS = { low: 4, medium: 10, moderate: 10, high: 20, critical: 30 };
const RELATIONSHIP_POINTS = { inside: 18, "directly-references": 24, "affects-adjacent-port": 17, "affects-route": 17, "infrastructure-impact": 13, "security-impact": 13, "weather-impact": 11, "disaster-impact": 11, "economic-impact": 10, "humanitarian-impact": 8, nearby: 8, "possible-indirect-impact": 3 };

function hoursSince(value, now) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? Math.max(0, now - timestamp) / 3600000 : Infinity;
}

function freshnessMultiplier(event, now) {
  const hours = hoursSince(event.updatedAt || event.occurredAt || event.startedAt, now);
  if (hours <= 24) return 1;
  if (hours <= 72) return 0.72;
  if (hours <= 168) return 0.38;
  return 0.12;
}

function isOfficial(event) {
  return /official|government|authority|primary/i.test(`${event.sourceType || ""} ${event.sourceTier || ""} ${event.verificationStatus || ""}`);
}

function hasExplicitDisruption(event) {
  return /\b(disrupt(?:ed|ion)?|suspend(?:ed|ed)?|closure?|closed|blocked|halt(?:ed|ing)?|restricted|rerout(?:ed|ing)?)\b/i.test(`${event.title || ""} ${event.summary || ""}`);
}

function statusFor(score, qualifying) {
  if (qualifying.closed) return "closed";
  if (qualifying.disrupted && score >= 65) return "severely-disrupted";
  if (qualifying.disrupted) return "disrupted";
  return score >= 18 ? "watch" : "normal";
}

function providerCaveats(sourceStatus = {}) {
  return Object.entries(sourceStatus)
    .filter(([, status]) => status?.stale || !status?.ok || ["degraded", "unavailable"].includes(status?.status))
    .map(([provider]) => `${provider} is degraded or unavailable.`)
    .sort();
}

export function assessChokepointCondition(chokepoint, events = [], correlations = [], options = {}) {
  const now = Number(options.now || Date.now());
  const sourceStatus = options.sourceStatus || {};
  const byEvent = new Map(events.map((event) => [String(event.id), event]));
  const related = correlations.filter((item) => item.chokepointId === chokepoint.id).map((item) => ({ ...item, event: byEvent.get(item.eventId) })).filter((item) => item.event);
  const ranked = related.map((item) => {
    const event = item.event;
    const score = (SEVERITY_POINTS[event.severity] || 4) * freshnessMultiplier(event, now) + (RELATIONSHIP_POINTS[item.relationship] || 3) + item.confidence * 0.12 + (isOfficial(event) ? 8 : 0);
    return { ...item, contribution: Math.round(score * 10) / 10 };
  }).sort((a, b) => b.contribution - a.contribution || b.confidence - a.confidence || a.eventId.localeCompare(b.eventId));
  const score = Math.min(100, Math.round(ranked.reduce((sum, item) => sum + item.contribution, 0)));
  const official = ranked.filter((item) => isOfficial(item.event));
  const disruptionEvidence = official.filter((item) => hasExplicitDisruption(item.event) && ["directly-references", "inside", "affects-route", "affects-adjacent-port"].includes(item.relationship));
  const closedEvidence = disruptionEvidence.filter((item) => /\bclosed|closure\b/i.test(`${item.event.title} ${item.event.summary}`));
  const caveats = providerCaveats(sourceStatus);
  const staleOnly = !ranked.length && caveats.length > 0;
  const status = staleOnly ? "unknown" : statusFor(score, { disrupted: disruptionEvidence.length > 0, closed: closedEvidence.length > 0 });
  const confidence = Math.max(0, Math.min(100, Math.round(ranked.length ? Math.min(90, ranked.reduce((sum, item) => sum + item.confidence, 0) / ranked.length + official.length * 5 - caveats.length * 8) : staleOnly ? 25 : chokepoint.confidence)));
  const topEvents = ranked.slice(0, 5).map((item) => ({ eventId: item.eventId, title: item.event.title, relationship: item.relationship, confidence: item.confidence, sourceName: item.event.sourceName || item.event.source, updatedAt: item.event.updatedAt || item.event.occurredAt }));
  const reasons = ranked.slice(0, 3).map((item) => `${item.relationship.replace(/-/g, " ")} - ${item.event.title}`);
  const explanation = status === "normal"
    ? "Normal - no current qualifying disruption evidence."
    : status === "unknown"
      ? "Unknown - related provider coverage is degraded and no current qualifying event is available."
      : `${status.replace(/-/g, " ")} - ${reasons[0] || "current related evidence"}${disruptionEvidence.length ? "; official disruption language present." : "; no authoritative closure report."}`;
  return { chokepointId: chokepoint.id, status: CHOKEPOINT_STATUSES.includes(status) ? status : "unknown", score, confidence, updatedAt: new Date(now).toISOString(), activeEventCount: ranked.length, highPriorityEventCount: ranked.filter((item) => ["high", "critical"].includes(item.event.severity)).length, officialSourceCount: official.length, independentSourceCount: new Set(ranked.map((item) => item.event.sourceName || item.event.source)).size, reasons, topEvents, caveats, explanation, operationalDimensions: [...new Set(ranked.map((item) => item.relationship.replace(/-impact$/, "")))].sort() };
}

export function assessChokepoints(events = [], correlations = [], options = {}) {
  const chokepoints = options.chokepoints || STRATEGIC_CHOKEPOINTS;
  return chokepoints.map((chokepoint) => assessChokepointCondition(chokepoint, events, correlations, options));
}
