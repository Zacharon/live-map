// @ts-check
import { finite } from './spatial.js';
export function instant(value) {
  if (value == null || value === '' || typeof value === 'boolean') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}
export function timeContract(input = {}) {
  return Object.fromEntries(['observedAt', 'publishedAt', 'receivedAt', 'validFrom', 'validTo', 'calculatedFor', 'calculatedAt']
    .map(key => [key, instant(input[key])]));
}
export function timeExclusion(record, query) {
  const time = record.time;
  const asOf = instant(query.asOf), knownAt = instant(query.knownAt);
  if (asOf == null || knownAt == null) return 'invalid-time-query';
  // Receipt is knowledge of a revision, never a substitute for observation.
  if (time.receivedAt == null) return 'unknown-knowledge-time';
  if (time.receivedAt > knownAt || (time.publishedAt != null && time.publishedAt > knownAt)) return 'not-known-at-cutoff';
  if (record.withdrawn) return 'withdrawn-revision';
  if (record.valueOrigin === 'calculated') {
    if (time.calculatedAt == null || time.calculatedAt > knownAt) return 'calculation-not-known-at-cutoff';
    if (time.calculatedFor !== asOf) return 'calculation-for-another-time';
  } else {
    if (time.observedAt == null) return 'unknown-observation-time';
    if (time.observedAt > asOf) return 'observation-after-target';
    const maxAge = finite(record.maxAgeMs);
    if (maxAge != null && asOf - time.observedAt > maxAge) return 'outside-observation-window';
  }
  if (time.validFrom != null && asOf < time.validFrom) return 'before-validity';
  if (time.validTo != null && asOf > time.validTo) return 'after-validity';
  return null;
}
/** Latest immutable revision KNOWN at cutoff; tombstones cannot revive an older record. */
export function revisionsAt(records, query) {
  const knownAt = instant(query.knownAt);
  const groups = new Map();
  for (const record of records) {
    const key = referenceKey(record.ref);
    const known = record.time.receivedAt;
    if (known == null || knownAt == null || known > knownAt || (record.time.publishedAt != null && record.time.publishedAt > knownAt)) continue;
    const previous = groups.get(key);
    if (!previous || record.revision > previous.revision) groups.set(key, record);
  }
  return groups;
}
export function referenceKey(ref) { return `${ref.source}/${ref.kind}/${ref.id}`; }
