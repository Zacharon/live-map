import { CII_LEVELS, CII_WEIGHTS, SEVERITIES } from "../config.js";
import { COUNTRIES, countryForEvent } from "../data/countries.js";

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function ciiLevel(score) {
  return CII_LEVELS.find((level) => score >= level.min && score <= level.max) || CII_LEVELS[0];
}

function factor(id, rawValue, normalizedValue, weight) {
  const normalized = clamp(normalizedValue);
  return {
    id,
    rawValue,
    normalizedValue: Math.round(normalized),
    weight,
    contribution: Math.round(normalized * weight),
  };
}

export function computeCountryRiskScores(events = [], now = Date.now(), weights = CII_WEIGHTS) {
  const groups = new Map();
  for (const event of events) {
    const country = countryForEvent(event);
    const key = country?.code || (event.country || "UN").slice(0, 2).toUpperCase();
    const name = country?.name || event.country || "Unknown";
    if (!groups.has(key)) groups.set(key, { countryCode: key, countryName: name, events: [], country });
    groups.get(key).events.push(event);
  }

  for (const country of COUNTRIES) {
    if (!groups.has(country.code)) groups.set(country.code, { countryCode: country.code, countryName: country.name, events: [], country });
  }

  return [...groups.values()].map((group) => {
    const eventCount = group.events.length;
    const severityTotal = group.events.reduce((sum, event) => sum + (SEVERITIES[event.severity]?.score || 1), 0);
    const hazardCount = group.events.filter((event) => ["earthquake", "wildfire", "storm", "flood", "volcano"].includes(event.category)).length;
    const newest = group.events.reduce((max, event) => Math.max(max, Number(event.updatedAt || event.occurredAt || 0)), 0);
    const ageHours = newest ? (now - newest) / 3600000 : 999;
    const averageConfidence = eventCount ? group.events.reduce((sum, event) => sum + Number(event.confidence || 50), 0) / eventCount : 35;

    const factors = [
      factor("conflictActivity", group.events.filter((event) => event.category === "conflict").length, Math.min(100, eventCount * 8), weights.conflictActivity),
      factor("eventSeverity", severityTotal, Math.min(100, severityTotal * 7), weights.eventSeverity),
      factor("naturalHazards", hazardCount, Math.min(100, hazardCount * 10), weights.naturalHazards),
      factor("dataFreshness", ageHours, eventCount ? clamp(100 - ageHours * 2) : 10, weights.dataFreshness),
      factor("sourceConfidence", averageConfidence, averageConfidence, weights.sourceConfidence),
    ];
    const score = clamp(factors.reduce((sum, item) => sum + item.contribution, 0));
    const confidence = clamp((eventCount ? 55 : 25) + Math.min(25, eventCount * 3) + averageConfidence * 0.2 - (ageHours > 72 ? 10 : 0));
    const level = ciiLevel(score);
    return {
      countryCode: group.countryCode,
      countryName: group.countryName,
      score: Math.round(score),
      level: level.level,
      levelLabel: level.label,
      color: level.color,
      confidence: Math.round(confidence),
      calculatedAt: now,
      factors,
      sources: [...new Set(group.events.map((event) => event.sourceName || event.source).filter(Boolean))],
      limitations: eventCount ? ["Prototype score; not an official rating.", "Conflict and finance providers are not fully configured."] : ["No recent mapped events in the current window.", "Score confidence reduced due to missing data."],
      coordinates: group.country ? { lat: group.country.lat, lon: group.country.lon } : null,
    };
  }).sort((a, b) => b.score - a.score);
}
