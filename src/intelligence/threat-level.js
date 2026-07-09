/**
 * OSINT Forge Threat Level v0 — explainable local heuristic.
 * Uses only existing normalized event fields. No network. No AI.
 * Not an official intelligence assessment.
 */

export const THREAT_LEVEL_LABEL = "OSINT Forge threat level v0 — heuristic";

export const THREAT_LEVELS = Object.freeze([
  "low",
  "guarded",
  "elevated",
  "high",
  "critical",
]);

export const BASE_THREAT_CAVEATS = Object.freeze([
  "Threat level is a local heuristic based on normalized public event metadata. It is not an official assessment.",
  "Not for emergency dispatch, legal advice, or operational command decisions.",
  "Confidence scoring methodology is deferred to source-confidence-v1; do not treat this as verified intelligence.",
]);

const SEVERITY_BASE = {
  critical: 78,
  high: 62,
  medium: 42,
  low: 22,
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function asTs(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function severityKey(event) {
  const s = String(event?.severity || "").toLowerCase();
  if (SEVERITY_BASE[s] != null) return s;
  const score = Number(event?.severityScore);
  if (Number.isFinite(score)) {
    if (score >= 80) return "critical";
    if (score >= 60) return "high";
    if (score >= 40) return "medium";
    return "low";
  }
  return null;
}

function levelFromScore(score) {
  if (score >= 80) return "critical";
  if (score >= 65) return "high";
  if (score >= 48) return "elevated";
  if (score >= 32) return "guarded";
  return "low";
}

function hasGeo(event) {
  if (event?.geographic === false) return false;
  const lat = Number(event?.lat ?? event?.latitude);
  const lon = Number(event?.lon ?? event?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lon);
}

function isDiscoveryLead(event) {
  const kind = String(event?.recordKind || "").toLowerCase();
  const verification = String(event?.verificationStatus || event?.verification || "").toLowerCase();
  if (kind.includes("discovery") || kind.includes("lead")) return true;
  if (verification.includes("unverified") || verification.includes("discovery")) return true;
  return false;
}

/**
 * @param {object|null} event
 * @param {{ cluster?: object|null, relatedCount?: number, now?: number }} [opts]
 */
export function computeThreatLevel(event, opts = {}) {
  const now = Number.isFinite(opts.now) ? opts.now : Date.now();
  const reasons = [];
  const caveats = [...BASE_THREAT_CAVEATS];
  let score = 18;
  let certainty = "moderate";

  if (!event || typeof event !== "object") {
    return {
      level: "low",
      score: 10,
      reasons: ["No event payload available"],
      caveats: [...caveats, "Missing event fields reduced certainty."],
      label: THREAT_LEVEL_LABEL,
      certainty: "low",
    };
  }

  const sev = severityKey(event);
  if (sev) {
    score = SEVERITY_BASE[sev];
    reasons.push(`Provider/UI severity band: ${sev}`);
  } else {
    score = 20;
    reasons.push("Severity missing — using low baseline");
    caveats.push("Severity field missing; threat level is under-informed.");
    certainty = "low";
  }

  const occurred = asTs(event.occurredAt);
  const updated = asTs(event.updatedAt) ?? occurred;
  const ageMs = updated != null ? Math.max(0, now - updated) : null;
  if (ageMs == null) {
    reasons.push("Timestamp missing — no recency boost");
    caveats.push("Event time missing; recency could not be evaluated.");
    certainty = "low";
  } else if (ageMs <= 60 * 60 * 1000) {
    score += 14;
    reasons.push("Updated/occurred within the last hour");
  } else if (ageMs <= 6 * 60 * 60 * 1000) {
    score += 10;
    reasons.push("Updated/occurred within the last 6 hours");
  } else if (ageMs <= 24 * 60 * 60 * 1000) {
    score += 6;
    reasons.push("Updated/occurred within the last 24 hours");
  } else if (ageMs <= 7 * 24 * 60 * 60 * 1000) {
    score += 2;
    reasons.push("Within the last 7 days");
  } else {
    score -= 6;
    reasons.push("Older than 7 days — lower urgency");
  }

  const domain = String(event.domain || "").toLowerCase();
  const category = String(event.category || event.type || "").toLowerCase();
  if (
    domain.includes("conflict")
    || domain.includes("security")
    || category.includes("conflict")
    || category.includes("attack")
    || category.includes("terror")
  ) {
    score += 8;
    reasons.push("Security/conflict-related domain or category");
  } else if (
    domain.includes("natural")
    || category.includes("earthquake")
    || category.includes("storm")
    || category.includes("flood")
    || category.includes("fire")
  ) {
    score += 5;
    reasons.push("Hazard/disaster domain or category");
  } else if (domain.includes("cyber") || category.includes("cyber") || category.includes("cve")) {
    score += 4;
    reasons.push("Cyber/technology domain");
  }

  const relatedCount = Number(opts.relatedCount);
  const clusterSize = Number(opts.cluster?.eventCount) || (Array.isArray(opts.cluster?.events) ? opts.cluster.events.length : 0);
  if (Number.isFinite(relatedCount) && relatedCount >= 3) {
    score += 8;
    reasons.push(`${relatedCount} related events in current view`);
  } else if (Number.isFinite(relatedCount) && relatedCount >= 1) {
    score += 4;
    reasons.push(`${relatedCount} related event(s) in current view`);
  }
  if (clusterSize >= 5) {
    score += 8;
    reasons.push(`Part of a ${clusterSize}-event cluster`);
  } else if (clusterSize >= 2) {
    score += 5;
    reasons.push(`Part of a ${clusterSize}-event cluster`);
  }

  const confidence = Number(event.confidence);
  if (Number.isFinite(confidence)) {
    if (confidence >= 80) {
      score += 3;
      reasons.push(`Higher record confidence (${Math.round(confidence)}%)`);
    } else if (confidence < 45) {
      score -= 4;
      reasons.push(`Lower record confidence (${Math.round(confidence)}%)`);
      caveats.push("Low confidence reduces certainty in this threat level.");
    }
  } else {
    caveats.push("Confidence not scored on this record.");
  }

  if (hasGeo(event)) {
    if (event.place || event.country || event.countryName) {
      score += 2;
      reasons.push("Map coordinates with place/country context");
    } else {
      reasons.push("Coordinates present; place label limited");
      caveats.push("Location may be approximate or provider-estimated.");
    }
  } else if (event.geographic === false) {
    reasons.push("Non-geographic record — no map pin");
    caveats.push("Non-geographic events should not be force-mapped.");
  } else {
    score -= 2;
    reasons.push("Coordinates missing");
    caveats.push("Missing coordinates reduce geographic certainty.");
    certainty = certainty === "moderate" ? "low" : certainty;
  }

  if (isDiscoveryLead(event)) {
    score -= 8;
    reasons.push("Discovery/unverified lead — downranked");
    caveats.push("Discovery leads are weaker than primary/official alerts.");
  }

  score = Math.round(clamp(score, 0, 100));
  const level = levelFromScore(score);

  // Deduplicate caveats while preserving order
  const seen = new Set();
  const uniqueCaveats = [];
  for (const c of caveats) {
    if (seen.has(c)) continue;
    seen.add(c);
    uniqueCaveats.push(c);
  }

  return {
    level,
    score,
    reasons: reasons.length ? reasons : ["Insufficient fields for detailed reasoning"],
    caveats: uniqueCaveats.length ? uniqueCaveats : [...BASE_THREAT_CAVEATS],
    label: THREAT_LEVEL_LABEL,
    certainty,
  };
}

/**
 * @param {object|null} cluster
 * @param {{ now?: number }} [opts]
 */
export function computeClusterThreatLevel(cluster, opts = {}) {
  const members = Array.isArray(cluster?.events) ? cluster.events : [];
  if (!members.length) {
    return computeThreatLevel(null, opts);
  }

  let best = null;
  for (const event of members) {
    const result = computeThreatLevel(event, {
      now: opts.now,
      cluster,
      relatedCount: Math.max(0, members.length - 1),
    });
    if (!best || result.score > best.score) best = result;
  }

  const reasons = [
    `Cluster of ${members.length} events`,
    ...(best?.reasons || []).slice(0, 4),
  ];
  if (cluster?.attentionLabel) reasons.unshift(`Cluster attention: ${cluster.attentionLabel}`);

  const score = Math.round(clamp((best?.score || 20) + Math.min(10, members.length), 0, 100));
  return {
    level: levelFromScore(score),
    score,
    reasons,
    caveats: [
      ...(best?.caveats || BASE_THREAT_CAVEATS),
      "Cluster threat level is a member-based heuristic aggregate, not a confirmed single incident.",
    ].filter((c, i, arr) => arr.indexOf(c) === i),
    label: THREAT_LEVEL_LABEL,
    certainty: best?.certainty || "low",
  };
}

export function threatLevelDisplay(level) {
  const map = {
    low: "Low",
    guarded: "Guarded",
    elevated: "Elevated",
    high: "High",
    critical: "Critical",
  };
  return map[level] || "Low";
}
