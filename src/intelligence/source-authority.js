/**
 * Authority comes from vetted registry metadata and explicit claim scope,
 * not from a regex on the word "official".
 */

import { MASTER_SOURCE_REGISTRY, sourceById } from "../sources/master-source-registry.js";
import { uniqueOriginKeys } from "./evidence-records.js";
import { sourceIndependence } from "./source-independence.js";

const CONFIRMED = new Set(["primary-confirmed", "corroborated"]);
const TIER_ONE = "tier-1-primary-official";

export function registrySourceFor(record, registry = MASTER_SOURCE_REGISTRY) {
  if (record?.sourceId) return sourceById(record.sourceId, registry);
  if (record?.canonicalUrl) {
    return registry.find((item) => item.sourceUrl === record.canonicalUrl) || null;
  }
  return null;
}

export function isAuthoritativeSource(record, registry = MASTER_SOURCE_REGISTRY) {
  const source = registrySourceFor(record, registry);
  if (source?.official && source.sourceTier === TIER_ONE) return true;
  if (source?.verificationState === "primary-confirmed" && source.official) return true;
  if (record?.sourceTier === TIER_ONE && record.official === true) return true;
  if (record?.verificationStatus === "primary-confirmed") return true;
  return false;
}

export function authorityForClaim(record, registry = MASTER_SOURCE_REGISTRY) {
  const source = registrySourceFor(record, registry);
  const authoritative = isAuthoritativeSource(record, registry);
  const scope = record?.claimScope || {};
  return {
    authoritative,
    sourceId: source?.id || record?.sourceId || null,
    sourceTier: source?.sourceTier || record?.sourceTier || null,
    official: Boolean(source?.official),
    claimScope: scope,
    reason: authoritative
      ? "registry-official-or-primary-confirmed-tier"
      : "not-an-authoritative-operating-source",
  };
}

export function independentOrigins(records = []) {
  return uniqueOriginKeys(records);
}

export function independencePairs(left, right) {
  return sourceIndependence({
    id: left.id,
    sourceOrganizationId: left.sourceOrganizationId,
    canonicalUrl: left.canonicalUrl,
    url: left.sourceUrl,
    syndication: left.syndication,
  }, {
    id: right.id,
    sourceOrganizationId: right.sourceOrganizationId,
    canonicalUrl: right.canonicalUrl,
    url: right.sourceUrl,
    syndication: right.syndication,
  });
}

export function confirmedWithinScope(record, claimed = {}) {
  const scope = record?.claimScope || {};
  for (const key of ["activity", "vesselClass", "direction", "chokepointId", "geography"]) {
    if (claimed[key] && scope[key] && String(scope[key]).toLowerCase() !== String(claimed[key]).toLowerCase()) {
      return false;
    }
  }
  return true;
}

export function isStale(record, now, maxAgeMs) {
  if (!Number.isFinite(maxAgeMs)) return false;
  const stamp = new Date(record?.observedAt || record?.reportedAt || record?.retrievedAt || 0).getTime();
  return !Number.isFinite(stamp) || now - stamp > maxAgeMs;
}

export { CONFIRMED, TIER_ONE };
