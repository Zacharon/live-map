import { CII_LEVELS, SEVERITIES } from "../config.js";
import { COUNTRIES, countryForEvent } from "../data/countries.js";

const VERIFICATION_WEIGHTS = {
  "primary-confirmed": 1,
  corroborated: 0.85,
  reported: 0.65,
  "single-source": 0.45,
  observed: 0.55,
  unverified: 0.15,
  disputed: 0.1,
  corrected: 0.05,
  retracted: 0,
};

const SOURCE_TIER_WEIGHTS = {
  "tier-1-primary-official": 1,
  "tier-2-structured-established": 0.85,
  "tier-3-reputable-reporting": 0.65,
  "tier-4-community-osint": 0.4,
  "tier-5-discovery-only": 0.15,
};

const HALF_LIFE_DAYS = {
  conflict: 14,
  cyber: 5,
  earthquake: 10,
  flood: 10,
  storm: 2,
  wildfire: 7,
  volcano: 10,
  infrastructure: 3,
  commodity: 5,
  finance: 5,
  humanitarian: 14,
  other: 4,
};

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}
function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function ciiLevel(score) {
  return CII_LEVELS.find((level) => score >= level.min && score <= level.max) || CII_LEVELS[0];
}

export function saturatingScore(value, reference) {
  return clamp01(Math.log1p(Math.max(0, value)) / Math.log1p(Math.max(1, reference)));
}

function verificationWeight(event) {
  const status = event.verification?.state || event.verificationStatus || event.metadata?.verificationStatus || "single-source";
  return VERIFICATION_WEIGHTS[status] ?? 0.45;
}

function sourceTierWeight(event) {
  return SOURCE_TIER_WEIGHTS[event.sourceTier || event.metadata?.sourceTier] ?? 0.65;
}

function timeWeight(event, now) {
  const timestamp = Number(event.occurredAt || event.startedAt || event.updatedAt || now);
  const ageDays = Math.max(0, (now - timestamp) / 86400000);
  const halfLife = HALF_LIFE_DAYS[event.category] || HALF_LIFE_DAYS[event.type] || HALF_LIFE_DAYS[event.domain] || HALF_LIFE_DAYS.other;
  return Math.pow(0.5, ageDays / halfLife);
}

function eventSeverityWeight(event) {
  const severity = Number(event.severityScore ?? SEVERITIES[event.severity]?.score ?? event.severity ?? 20);
  return clamp(severity, 0, 100) / 100;
}

function incidentKey(event) {
  return event.incidentId || event.clusterId || `${event.provider || "provider"}:${event.providerId || event.providerEventId || event.id}`;
}

function weightedIncidentEvents(events, now) {
  const incidents = new Map();
  for (const event of events) {
    const key = incidentKey(event);
    const existing = incidents.get(key);
    if (!existing || Number(event.severityScore || 0) > Number(existing.severityScore || 0)) incidents.set(key, event);
  }
  return [...incidents.values()].map((event) => {
    const recordPenalty = event.recordKind === "discovery-lead" ? 0.15 : event.recordKind === "observation" ? 0.45 : 1;
    const weight = timeWeight(event, now) * verificationWeight(event) * sourceTierWeight(event) * eventSeverityWeight(event) * recordPenalty;
    return { event, weight };
  });
}

function factor(id, rawValue, normalizedValue, maxContribution, contribution, description) {
  return {
    id,
    rawValue: Number(rawValue.toFixed ? rawValue.toFixed(3) : rawValue),
    normalizedValue: Math.round(clamp01(normalizedValue) * 100),
    weight: maxContribution,
    contribution: Math.round(clamp(contribution, 0, maxContribution)),
    description,
  };
}

function structuralBaseline(country) {
  const populationExposure = saturatingScore(country.population || 0, 250000000);
  const areaExposure = saturatingScore(country.areaKm2 || 0, 3000000);
  const regionBaseline = {
    Africa: 0.32,
    Asia: 0.28,
    "Europe/Asia": 0.26,
    "South America": 0.22,
    "North America": 0.16,
    Europe: 0.14,
    Oceania: 0.12,
  }[country.region] ?? 0.18;
  const normalized = clamp01(regionBaseline * 0.55 + populationExposure * 0.25 + areaExposure * 0.2);
  return {
    contribution: normalized * 35,
    factors: [factor("structuralBaseline", normalized, normalized, 35, normalized * 35, "Slow-moving exposure baseline from public country metadata.")],
  };
}

function recentPressure(weighted, country) {
  const byDomain = new Map();
  for (const item of weighted) {
    const key = item.event.domain || item.event.category || "other";
    byDomain.set(key, (byDomain.get(key) || 0) + item.weight);
  }
  const conflict = byDomain.get("conflict-security") || 0;
  const disasters = (byDomain.get("natural-disaster") || 0) + (byDomain.get("weather") || 0);
  const humanitarian = byDomain.get("humanitarian") || 0;
  const cyberInfra = (byDomain.get("technology-cyber") || 0) + (byDomain.get("infrastructure") || 0);
  const exposureDenominator = Math.max(1, saturatingScore(country.population || 0, 100000000) * 0.6 + saturatingScore(country.areaKm2 || 0, 1000000) * 0.4);
  const normalizedConflict = saturatingScore(conflict / exposureDenominator, 8);
  const normalizedDisaster = saturatingScore(disasters / exposureDenominator, 10);
  const normalizedHumanitarian = saturatingScore(humanitarian / exposureDenominator, 6);
  const normalizedInfra = saturatingScore(cyberInfra / exposureDenominator, 6);
  const factors = [
    factor("recentConflict", conflict, normalizedConflict, 18, normalizedConflict * 18, "Deduplicated, decayed, verified conflict/security event pressure."),
    factor("recentHazards", disasters, normalizedDisaster, 11, normalizedDisaster * 11, "Recent natural disaster and weather pressure."),
    factor("recentHumanitarian", humanitarian, normalizedHumanitarian, 8, normalizedHumanitarian * 8, "Recent humanitarian pressure."),
    factor("recentCyberInfrastructure", cyberInfra, normalizedInfra, 8, normalizedInfra * 8, "Recent cyber and infrastructure pressure."),
  ];
  return { contribution: factors.reduce((sum, item) => sum + item.contribution, 0), factors, byDomain };
}

function economicInfrastructureStress(weighted) {
  const stress = weighted
    .filter(({ event }) => ["finance-markets", "commodity-supply-chain", "infrastructure"].includes(event.domain))
    .reduce((sum, item) => sum + item.weight, 0);
  const normalized = saturatingScore(stress, 6);
  return {
    contribution: normalized * 15,
    factors: [factor("economicInfrastructureStress", stress, normalized, 15, normalized * 15, "Official finance, commodity, and infrastructure stress signals.")],
  };
}

function crossDomainEscalation(byDomain) {
  const activeDomains = [...byDomain.entries()].filter(([, value]) => value >= 0.35).map(([domain]) => domain);
  const highSignal = ["conflict-security", "humanitarian", "infrastructure", "weather", "natural-disaster"].filter((domain) => activeDomains.includes(domain));
  const normalized = highSignal.length >= 3 ? 1 : highSignal.length === 2 ? 0.45 : 0;
  return {
    contribution: normalized * 5,
    factors: [factor("crossDomainEscalation", highSignal.length, normalized, 5, normalized * 5, "Independent domains worsening together.")],
  };
}

function confidenceFor(group, weighted, sourceStatus = {}) {
  const providerStatuses = Object.values(sourceStatus || {});
  const workingProviders = providerStatuses.filter((status) => status.ok).length;
  const totalProviders = providerStatuses.length || 1;
  const providerCoverage = providerStatuses.length ? workingProviders / totalProviders : 0.45;
  const tierQuality = weighted.length ? weighted.reduce((sum, item) => sum + sourceTierWeight(item.event), 0) / weighted.length : 0.35;
  const freshness = weighted.length ? weighted.reduce((sum, item) => sum + timeWeight(item.event, Date.now()), 0) / weighted.length : 0.25;
  const evidence = saturatingScore(weighted.length, 10);
  const completeness = clamp(Math.round((providerCoverage * 0.42 + tierQuality * 0.26 + freshness * 0.18 + evidence * 0.14) * 100));
  const confidence = clamp(Math.round(completeness * 0.75 + (weighted.length ? 18 : 5)));
  return { confidence, completeness, providerCoverage: Math.round(providerCoverage * 100) };
}

function trendFor(score, weighted) {
  const recent = weighted.filter((item) => timeWeight(item.event, Date.now()) > 0.72).reduce((sum, item) => sum + item.weight, 0);
  const sevenDayChange = Math.round(clamp(recent * 2.4, -20, 20));
  const thirtyDayChange = Math.round(clamp(score * 0.08 - 3, -15, 15));
  return { sevenDayChange, thirtyDayChange, trend: sevenDayChange > 2 ? "rising" : sevenDayChange < -2 ? "falling" : "steady" };
}

export function scoreDistributionWarnings(scores = []) {
  const total = scores.length || 1;
  const above90 = scores.filter((score) => score.score > 90).length;
  const above80 = scores.filter((score) => score.score > 80).length;
  const exactSaturation = scores.filter((score) => score.score >= 99).length;
  const byRegion = scores.reduce((acc, score) => {
    if (!acc[score.region]) acc[score.region] = [];
    acc[score.region].push(score.score);
    return acc;
  }, {});
  const warnings = [];
  if (above90 / total > 0.05) warnings.push("More than 5% of countries score above 90.");
  if (above80 / total > 0.15) warnings.push("More than 15% of countries score above 80.");
  if (exactSaturation) warnings.push("One or more countries are suspiciously concentrated at 99 or 100.");
  if (Object.values(byRegion).some((values) => new Set(values).size <= 1 && values.length > 3)) warnings.push("One or more regions have suspiciously low score variance.");
  if (scores.some((score) => score.score > 75 && score.confidence < 35)) warnings.push("High score with low evidence/confidence detected.");
  return warnings;
}

export function computeCountryRiskScores(events = [], now = Date.now(), _weights = null, sourceStatus = {}) {
  const groups = new Map();
  for (const country of COUNTRIES) {
    groups.set(country.iso3, { countryCode: country.iso2, iso2: country.iso2, iso3: country.iso3, countryName: country.name, events: [], country });
  }
  for (const event of events) {
    const country = countryForEvent(event);
    if (!country) continue;
    groups.get(country.iso3)?.events.push(event);
  }

  const scores = [...groups.values()].map((group) => {
    const weighted = weightedIncidentEvents(group.events, now);
    const structural = structuralBaseline(group.country);
    const recent = recentPressure(weighted, group.country);
    const economic = economicInfrastructureStress(weighted);
    const escalation = crossDomainEscalation(recent.byDomain);
    const rawScore = clamp(structural.contribution + recent.contribution + economic.contribution + escalation.contribution);
    const previousScore = clamp(rawScore * 0.92);
    const smoothedScore = clamp(rawScore * 0.7 + previousScore * 0.3);
    const score = Math.round(smoothedScore);
    const level = ciiLevel(score);
    const confidence = confidenceFor(group, weighted, sourceStatus);
    const trend = trendFor(score, weighted);
    const newest = group.events.reduce((max, event) => Math.max(max, Number(event.updatedAt || event.occurredAt || 0)), 0);
    const eventCountsByDomain = group.events.reduce((acc, event) => {
      const key = event.domain || "other";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const factors = [...structural.factors, ...recent.factors, ...economic.factors, ...escalation.factors];
    const topFactors = [...factors].sort((a, b) => b.contribution - a.contribution).slice(0, 4);
    return {
      countryCode: group.countryCode,
      iso2: group.iso2,
      iso3: group.iso3,
      countryName: group.countryName,
      region: group.country.region,
      subregion: group.country.subregion,
      score,
      rawScore: Math.round(rawScore),
      smoothedScore: score,
      previousScore: Math.round(previousScore),
      sevenDayAverage: Math.round(score - trend.sevenDayChange / 2),
      thirtyDayAverage: Math.round(score - trend.thirtyDayChange / 2),
      sevenDayChange: trend.sevenDayChange,
      thirtyDayChange: trend.thirtyDayChange,
      trend: trend.trend,
      level: level.level,
      levelLabel: level.label,
      color: level.color,
      confidence: confidence.confidence,
      completeness: confidence.completeness,
      providerCoverage: confidence.providerCoverage,
      calculatedAt: now,
      activeEvents: group.events.length,
      activeIncidents: new Set(group.events.map(incidentKey)).size,
      eventCountsByDomain,
      topFactors,
      topFactor: topFactors[0]?.id || "structuralBaseline",
      factors,
      sources: [...new Set(group.events.map((event) => event.sourceName || event.source).filter(Boolean))],
      limitations: group.events.length ? ["CII v2 is experimental and not an official rating.", "Score and confidence are calculated separately."] : ["No recent mapped events in the selected window.", "Confidence reduced because live event evidence is limited."],
      coordinates: group.country.centroid,
      bounds: group.country.bounds,
      mostRecentEventAt: newest || null,
    };
  }).sort((a, b) => b.score - a.score);
  const warnings = scoreDistributionWarnings(scores);
  Object.defineProperty(scores, "distributionWarnings", { value: warnings, enumerable: false });
  return scores;
}
