import { nullableScore } from "./value-semantics.js";

const SCORES = { low: 20, medium: 45, moderate: 45, high: 70, critical: 90 };

function labelScore(value) {
  return Object.hasOwn(SCORES, value) ? SCORES[value] : null;
}

export function severityScore(event = {}) {
  return nullableScore(event.severityScore) ?? nullableScore(event.severity)
    ?? labelScore(event.severityLabel) ?? labelScore(event.severity) ?? labelScore(event.uiSeverity);
}

export function severityBand(score) {
  const value = nullableScore(score);
  return value === null ? "unknown" : value >= 85 ? "critical" : value >= 65 ? "high" : value >= 35 ? "medium" : "low";
}
