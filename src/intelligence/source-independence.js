import { canonicalizeObservationUrl } from "./source-observations.js";

export function sourceIndependence(left = {}, right = {}) {
  if (left.id === right.id) return { independent: false, reason: "same-observation" };
  if (left.sourceOrganizationId && left.sourceOrganizationId === right.sourceOrganizationId) return { independent: false, reason: "same-organization" };
  const leftUrl = canonicalizeObservationUrl(left.canonicalUrl || left.url);
  const rightUrl = canonicalizeObservationUrl(right.canonicalUrl || right.url);
  if (leftUrl && leftUrl === rightUrl) return { independent: false, reason: "same-canonical-url" };
  if (left.syndication && right.syndication && left.syndication === right.syndication) return { independent: false, reason: "same-syndication-chain" };
  return { independent: true, reason: "distinct-source-organization" };
}

export function independentObservationCount(observations = []) {
  const representatives = [];
  for (const observation of observations) {
    if (representatives.every((existing) => sourceIndependence(existing, observation).independent)) representatives.push(observation);
  }
  return representatives.length;
}
