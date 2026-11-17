// Test-only integration. No production route or provider registry imports this module.
import { createEventsResponse } from '../../src/api/events-response.js';
import { createNormalizedEvent } from '../../src/events/normalized-event.js';
import { EVENT_PROVIDERS } from '../../src/data/providers/registry.js';

const MAX_BYTES = 4 * 1024 * 1024;
const ID = /^[A-Za-z0-9._-]{1,160}$/;
const measurements = ['magnitude', 'depthKm', 'tsunami', 'feltReports', 'significance', 'rawStatus'];

export function adaptForgeEarthquake(input) {
  const sourceId = input?.id?.startsWith('event:usgs-') ? input.id.slice(11) : '';
  if (!ID.test(sourceId) || input.provider !== 'usgs' || input.category !== 'earthquake'
    || input.recordKind !== 'event' || input.providerEventId !== `usgs-${sourceId}`
    || (input.metadata?.usgsId != null && input.metadata.usgsId !== sourceId)
    || !['primary-confirmed', 'single-source'].includes(input.verificationStatus)
    || input.geographic !== true || typeof input.latitude !== 'number' || typeof input.longitude !== 'number') {
    throw new Error('unsupported-forge-earthquake');
  }
  const sourceUrl = new URL(input.sourceUrl);
  if (sourceUrl.origin !== 'https://earthquake.usgs.gov' || sourceUrl.username || sourceUrl.password) throw new Error('invalid-source');
  for (const clock of ['startedAt', 'updatedAt', 'ingestedAt']) {
    if (typeof input[clock] !== 'string' || !Number.isFinite(Date.parse(input[clock]))) throw new Error('invalid-clock');
  }
  for (const key of ['magnitude', 'depthKm']) {
    if (!(key in (input.metadata || {})) || (input.metadata[key] !== null && !Number.isFinite(input.metadata[key]))) throw new Error('invalid-measurement');
  }
  if (input.metadata?.forge?.objectId !== input.id || !/^[a-f0-9]{64}$/.test(input.metadata.forge.contentHash)) throw new Error('missing-provenance');
  const metadata = Object.fromEntries(measurements.filter(key => key in input.metadata).map(key => [key, input.metadata[key]]));
  Object.assign(metadata, {
    usgsId: sourceId,
    verificationStatus: input.verificationStatus,
    forge: { objectId: input.id, contentHash: input.metadata.forge.contentHash, providerEventId: input.providerEventId },
    coordinateMethod: 'official epicenter',
    details: { Magnitude: input.metadata.magnitude ?? 'Not reported', Depth: input.metadata.depthKm === null ? 'Not reported' : `${input.metadata.depthKm} km` },
  });
  const normalized = createNormalizedEvent({ ...input, id: `usgs:${sourceId}`, providerEventId: sourceId,
    verification: null, independentSourceCount: 1, metadata });
  if (!normalized.valid) throw new Error('invalid-normalized-event');
  return normalized.event;
}

export async function fetchForgeSnapshot(endpoint, { now, hours = 168, timeoutMs = 2000 } = {}) {
  // Numeric loopback only; no DNS, remote hosting, redirects or credential forwarding.
  const url = new URL(endpoint);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.pathname !== '/api/events'
    || url.username || url.password || url.search || url.hash) throw new Error('loopback-forge-only');
  url.searchParams.set('hours', String(hours));
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(timeoutMs), headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error('forge-unavailable');
  if (Number(response.headers.get('content-length')) > MAX_BYTES) { await response.body?.cancel(); throw new Error('forge-too-large'); }
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw new Error('forge-too-large');
      chunks.push(value);
    }
  } catch (error) { await reader.cancel(); throw error; }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const body = JSON.parse(new TextDecoder().decode(bytes));
  const health = body.sourceStatus?.['osint-forge'];
  if (body.mode !== 'forge-ontology' || health?.ok !== true || health.stale !== false
    || !Number.isFinite(body.generatedAt) || Math.abs(now - body.generatedAt) > 5 * 60000
    || !Array.isArray(body.canonicalEvents) || body.canonicalEvents.length > 1000) throw new Error('invalid-forge-envelope');
  const events = [];
  let rejectedCount = 0;
  for (const event of body.canonicalEvents) {
    try { events.push(adaptForgeEarthquake(event)); } catch { rejectedCount += 1; }
  }
  return { events, rejectedCount, truncated: health.truncated === true, generatedAt: body.generatedAt };
}

export async function createForgeStagingResponse(request, { forgeEndpoint, providerResultsOverride, usgsDb, now = Date.now(), timeoutMs } = {}) {
  // Require all providers to be supplied explicitly. A missing override must never
  // turn this local harness into an external provider poller.
  const ids = providerResultsOverride?.map(result => result.providerId) || [];
  if (ids.length !== EVENT_PROVIDERS.length || new Set(ids).size !== ids.length
    || EVENT_PROVIDERS.some(provider => !ids.includes(provider.id))) throw new Error('complete-fixture-providers-required');
  if (request.method !== 'GET') return createEventsResponse(request, { providerResultsOverride, usgsDb, now, env: {} });
  const parsedHours = Number(new URL(request.url).searchParams.get('hours') || 168);
  const hours = Number.isFinite(parsedHours) ? Math.max(24, Math.min(720, Math.trunc(parsedHours))) : 168;
  let forge;
  try { forge = await fetchForgeSnapshot(forgeEndpoint, { now, hours, timeoutMs }); }
  catch { forge = { events: [], rejectedCount: 0, unavailable: true }; }
  const response = await createEventsResponse(request, {
    providerResultsOverride: usgsDb ? providerResultsOverride.filter(result => result.providerId !== 'usgs') : providerResultsOverride,
    usgsDb, now, env: {},
  });
  if (!response.ok) return response;
  const body = await response.json();
  const nativeEvents = usgsDb ? body.canonicalEvents.filter(event => event.provider === 'usgs')
    : providerResultsOverride.find(result => result.providerId === 'usgs').events;
  const known = new Map(nativeEvents.map(event => [event.id, event]));
  let duplicates = 0;
  let conflicts = 0;
  let added = 0;
  for (const event of forge.events) {
    const existing = known.get(event.id);
    if (existing) {
      duplicates += 1;
      if (['latitude', 'longitude', 'startedAt', 'updatedAt', 'verificationStatus'].some(key => existing[key] !== event[key])
        || ['magnitude', 'depthKm'].some(key => existing.metadata?.[key] !== event.metadata[key])) conflicts += 1;
      // Native takes precedence as a whole record, even if the active filter
      // excludes it. Never mix revisions or count USGS twice as corroboration.
      continue;
    }
    known.set(event.id, event);
    if (usgsDb) continue; // Forge additions are not covered by the native cursor.
    // Pass each unique candidate through the *existing* API filter/legacy path.
    // Keeping it isolated avoids proximity/title heuristics collapsing distinct
    // known USGS identities. This is intentionally local test code, not a poller.
    const isolated = providerResultsOverride.map(result => ({ ...result, events: result.providerId === 'usgs' ? [event] : [] }));
    const filtered = await createEventsResponse(request, { providerResultsOverride: isolated, now, env: {} });
    if (!filtered.ok) throw new Error('staging-filter-failed');
    const projected = await filtered.json();
    body.canonicalEvents.push(...projected.canonicalEvents);
    body.events.push(...projected.events);
    added += projected.canonicalEvents.length;
  }
  if (added && ['no-current-provider-data', 'major-provider-outage'].includes(body.systemStatus)) body.systemStatus = 'partial-data';
  body.sourceStatus['forge-staging'] = {
    ok: !forge.unavailable, status: forge.unavailable ? 'unavailable' : 'projection-readable',
    count: forge.events.length, rejectedCount: forge.rejectedCount, truncated: forge.truncated || false,
    generatedAt: forge.generatedAt || null, collectionHealth: 'unknown',
    message: forge.unavailable ? 'Local Forge projection unavailable; native providers retained.'
      : 'Local Forge projection readable. USGS collector health and freshness are not established.',
  };
  body.stagingIntegration = { mode: usgsDb ? 'stored-shadow-only' : 'additive-snapshot',
    duplicateCount: duplicates, conflictCount: conflicts, addedCount: added,
    shadowOnlyCount: usgsDb ? forge.events.length : 0,
    changeCursorScope: usgsDb ? 'native-stored-usgs-only' : null,
    forgeRefresh: 'full-snapshot-only', hostedConnectivity: 'not-tested',
    identities: forge.events.map(event => ({ eventId: event.id, forgeObjectId: event.metadata.forge.objectId,
      forgeContentHash: event.metadata.forge.contentHash })) };
  const headers = new Headers(response.headers);
  headers.set('cache-control', 'no-store');
  return Response.json(body, { headers });
}
