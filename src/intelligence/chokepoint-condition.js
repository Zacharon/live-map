import { CHOKEPOINT_STATUSES, STRATEGIC_CHOKEPOINTS } from "../data/strategic-chokepoints.js";
import { evaluateChokepointOperations } from "./operational-evaluator.js";

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

function attentionScore(chokepoint, events = [], correlations = [], now) {
  const byEvent = new Map(events.map((event) => [String(event.id), event]));
  const related = correlations.filter((item) => item.chokepointId === chokepoint.id).map((item) => ({ ...item, event: byEvent.get(item.eventId) })).filter((item) => item.event);
  const ranked = related.map((item) => {
    const event = item.event;
    const score = (SEVERITY_POINTS[event.severity] || 4) * freshnessMultiplier(event, now) + (RELATIONSHIP_POINTS[item.relationship] || 3) + item.confidence * 0.12;
    return { ...item, contribution: Math.round(score * 10) / 10 };
  }).sort((a, b) => b.contribution - a.contribution || b.confidence - a.confidence || a.eventId.localeCompare(b.eventId));
  const score = Math.min(100, Math.round(ranked.reduce((sum, item) => sum + item.contribution, 0)));
  return { ranked, score };
}

export function assessChokepointCondition(chokepoint, events = [], correlations = [], options = {}) {
  const now = Number(options.now || Date.now());
  const operational = evaluateChokepointOperations({
    chokepoint,
    events,
    correlations,
    records: options.records || [],
    now,
    asOf: options.asOf,
    sourceStatus: options.sourceStatus || {},
    sourceRegistry: options.sourceRegistry,
    policy: options.policy,
    lastKnown: options.lastKnown,
  });
  const attention = attentionScore(chokepoint, events, correlations, now);
  const status = CHOKEPOINT_STATUSES.includes(operational.status) || ["restricted", "recovering"].includes(operational.status)
    ? operational.status
    : "unknown";
  return {
    chokepointId: chokepoint.id,
    status,
    evidenceRank: operational.evidenceRank,
    operationalStatus: operational.operationalStatus,
    score: attention.score,
    confidence: operational.confidence,
    updatedAt: operational.updatedAt,
    asOf: operational.asOf,
    activeEventCount: operational.activeEventCount,
    highPriorityEventCount: operational.highPriorityEventCount,
    officialSourceCount: operational.officialSourceCount,
    independentSourceCount: operational.independentSourceCount,
    reasons: operational.reasons,
    topEvents: operational.topEvents.length ? operational.topEvents : attention.ranked.slice(0, 5).map((item) => ({
      eventId: item.eventId,
      title: item.event.title,
      relationship: item.relationship,
      confidence: item.confidence,
      sourceName: item.event.sourceName || item.event.source,
      updatedAt: item.event.updatedAt || item.event.occurredAt,
    })),
    caveats: operational.caveats,
    explanation: operational.explanation,
    operationalDimensions: operational.operationalDimensions,
    dimensions: operational.dimensions,
    restrictions: operational.restrictions,
    regimeDuration: operational.regimeDuration,
    supply: operational.supply,
    exposure: operational.exposure,
    commercialFriction: operational.commercialFriction,
    flowDisplacement: operational.flowDisplacement,
    recoveryBreadth: operational.recoveryBreadth,
    contradictions: operational.contradictions,
    lastKnownOperationalStatus: operational.lastKnownOperationalStatus,
    transitions: operational.transitions,
    policy: operational.policy,
    assessment: operational.assessment,
    positiveOperationalEvidence: operational.positiveOperationalEvidence,
  };
}

export function assessChokepoints(events = [], correlations = [], options = {}) {
  const chokepoints = options.chokepoints || STRATEGIC_CHOKEPOINTS;
  return chokepoints.map((chokepoint) => assessChokepointCondition(chokepoint, events, correlations, {
    ...options,
    lastKnown: options.lastKnownById?.[chokepoint.id] || options.lastKnown,
  }));
}
