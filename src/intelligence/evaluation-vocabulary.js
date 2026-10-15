/**
 * Source reliability, claim credibility, and analytical confidence stay
 * independent. Admiralty A–F / 1–6 are optional display codes, not probabilities
 * and not a compliance claim.
 */

export const RELIABILITY_CODES = ["A", "B", "C", "D", "E", "F"];
export const CREDIBILITY_CODES = ["1", "2", "3", "4", "5", "6"];

export const RELIABILITY_LABELS = {
  A: "Completely reliable",
  B: "Usually reliable",
  C: "Fairly reliable",
  D: "Not usually reliable",
  E: "Unreliable",
  F: "Cannot judge reliability",
};

export const CREDIBILITY_LABELS = {
  1: "Confirmed by other independent origins",
  2: "Probably true",
  3: "Possibly true",
  4: "Doubtful",
  5: "Improbable",
  6: "Cannot judge credibility",
};

export const UNKNOWN_RELIABILITY = "F";
export const UNKNOWN_CREDIBILITY = "6";

const OFFICIAL_CATEGORIES = new Set(["official", "government", "authority", "wire", "press-release", "anonymous"]);

export function normalizeReliability(code) {
  const value = String(code || UNKNOWN_RELIABILITY).toUpperCase();
  return RELIABILITY_CODES.includes(value) ? value : UNKNOWN_RELIABILITY;
}

export function normalizeCredibility(code) {
  const value = String(code || UNKNOWN_CREDIBILITY);
  return CREDIBILITY_CODES.includes(value) ? value : UNKNOWN_CREDIBILITY;
}

export function reliabilityFromCategory() {
  return {
    code: UNKNOWN_RELIABILITY,
    label: RELIABILITY_LABELS[UNKNOWN_RELIABILITY],
    autoAssigned: false,
    reason: "Reliability is not assigned from publisher category, official branding, or press-release status.",
  };
}

export function defaultSourceEvaluation({ sourceId, domain, period, evaluator, rationale, code } = {}) {
  const assigned = code ? normalizeReliability(code) : UNKNOWN_RELIABILITY;
  return {
    sourceId: sourceId || null,
    domain: domain || null,
    period: period || null,
    code: assigned,
    label: RELIABILITY_LABELS[assigned],
    unknown: assigned === UNKNOWN_RELIABILITY,
    rationale: rationale || "Not evaluated. F means cannot judge, not worst-quality.",
    evaluator: evaluator || null,
    evaluationRevision: 1,
  };
}

export function defaultClaimCredibility({ code, rationale, evaluator } = {}) {
  const assigned = code ? normalizeCredibility(code) : UNKNOWN_CREDIBILITY;
  return {
    code: assigned,
    label: CREDIBILITY_LABELS[assigned],
    unknown: assigned === UNKNOWN_CREDIBILITY,
    rationale: rationale || "Not evaluated. 6 means cannot judge, not zero credibility.",
    evaluator: evaluator || null,
  };
}

export function formatEvaluation(reliability, credibility, { advanced = false } = {}) {
  const rel = defaultSourceEvaluation({ code: reliability?.code, rationale: reliability?.rationale });
  const cred = defaultClaimCredibility({ code: credibility?.code, rationale: credibility?.rationale });
  if (!advanced) {
    return {
      sourceReliability: rel.unknown ? "Reliability not judged" : rel.label,
      informationCredibility: cred.unknown ? "Credibility not judged" : cred.label,
      codes: null,
    };
  }
  return {
    sourceReliability: `${rel.code} — ${rel.label}`,
    informationCredibility: `${cred.code} — ${cred.label}`,
    codes: `${rel.code}${cred.code}`,
    note: "Codes are methodology labels, not probabilities, and they do not authorize publication or action.",
  };
}

export function rejectsAutomaticOfficialGrade(category) {
  return OFFICIAL_CATEGORIES.has(String(category || "").toLowerCase());
}

export { OFFICIAL_CATEGORIES };
