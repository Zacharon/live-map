import { createEvidenceRecord } from './evidence-records.js';
import { SOURCE_CLOCK_AHEAD_LIMITATION } from '../events/event-quality.js';
import { timestampMs, finiteNumber } from '../events/value-semantics.js';

function limitationList(value) {
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string');
  if (typeof value === 'string' && value.trim()) return [value];
  return [];
}

function usgsQualityLimitations(event) {
  const limitations = [
    'One reporting organization; independent corroboration is not established.',
    'An epicenter is not an impact footprint.',
  ];
  // The projection adds its own caveats. Replacing the event list dropped the
  // clock-ahead sentence the preview had already recorded.
  const carried = [...limitationList(event.qualityLimitations), ...limitationList(event.metadata?.qualityLimitations)];
  if (carried.includes(SOURCE_CLOCK_AHEAD_LIMITATION)) limitations.push(SOURCE_CLOCK_AHEAD_LIMITATION);
  return limitations;
}

// Read-only projection: never creates an assessment, approval or durable case.
export function projectUsgsEvidence(event, { sourceStatus = {}, now = Date.now() } = {}) {
  if (event?.provider !== 'usgs' || !/^usgs:[\w.-]+$/.test(event.id || '')) return null;
  let source;
  try { source = new URL(event.sourceUrl); } catch { return null; }
  if (source.protocol !== 'https:' || source.hostname !== 'earthquake.usgs.gov' || source.username || source.password) return null;
  const iso = value => { const time = timestampMs(value); return time === null ? null : new Date(time).toISOString(); };
  const retrieved = timestampMs(event.metadata?.retrievedAt ?? event.retrievedAt ?? event.ingestedAt);
  const status = sourceStatus.usgs || {};
  const age = retrieved === null ? null : timestampMs(now) - retrieved;
  const freshness = status.stale ? 'stale' : status.status === 'unavailable' ? 'unavailable'
    : age === null || age < 0 || status.status !== 'healthy' ? 'unknown'
    : age > 15 * 60 * 1000 ? 'stale' : 'current';
  const record = createEvidenceRecord({
    id: event.id, recordKind: 'evidence', evidenceKind: 'public-report', subjectDomain: 'humanitarian',
    title: event.title, summary: event.summary || event.description, sourceId: 'usgs',
    sourceUrl: source.href, sourceOrganizationId: 'usgs', upstreamOrganization: event.sourceName,
    observedAt: iso(event.occurredAt ?? event.startedAt), reportedAt: iso(event.sourcePublishedAt),
    retrievedAt: iso(retrieved), lat: event.lat ?? event.latitude, lon: event.lon ?? event.longitude,
    geometry: event.geometry, geometryPrecision: 'approximate',
    value: finiteNumber(event.metadata?.magnitude), unit: 'magnitude', valueOrigin: 'reported',
    rightsAttribution: event.sourceName,
    coverage: { description: event.metadata?.coverage || 'USGS reporting; coverage completeness unknown' },
    freshnessPolicy: 'USGS provider retrieval age <= 15 minutes, healthy source; occurrence is a separate clock.',
    qualityLimitations: usgsQualityLimitations(event),
    extra: { eventId: event.id, sourceRevisionAt: iso(event.updatedAt), freshness,
      providerStatus: status.status || 'unknown', reviewStatus: 'not-reviewed',
      persistence: 'read-only snapshot; not a saved investigation case' },
  }, new Date(0));
  // The generic evidence builder supplies a default clock; missing receipt evidence must remain unknown.
  record.retrievedAt = iso(retrieved);
  return record;
}
