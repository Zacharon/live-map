// Cross-repository, deterministic SQLite -> real loopback HTTP -> Live Map test.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { postgis } from '@electric-sql/pglite-postgis';
import { createForgeStagingResponse, fetchForgeSnapshot, adaptForgeEarthquake } from '../scripts/staging/forge-usgs-adapter.mjs';
import { createEventsResponse } from '../src/api/events-response.js';
import { createChangesResponse } from '../src/api/changes-response.js';
import { EVENT_PROVIDERS } from '../src/data/providers/registry.js';
import { normalizeUsgsFeature } from '../src/data/providers/usgs.js';
import { normalizeEonetEvent } from '../src/data/providers/eonet.js';
import { arePotentialDuplicates } from '../src/events/event-deduplication.js';
import { filteredEvents } from '../src/events/event-filters.js';
import { normalizeEvent } from '../src/events/event-normalizer.js';
import { commitUsgsFeed } from '../src/ingestion/usgs-pipeline.js';
import { dispatchUsgsOutbox } from '../src/ingestion/usgs-outbox.js';

const root = path.resolve(process.argv[2] || process.env.FORGE_CHECKOUT || '../osint-forge');
const pin = JSON.parse(await readFile(new URL('../scripts/staging/forge-pin.json', import.meta.url)));
assert.equal(execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), pin.commit, 'Use the reviewed Forge pin');
assert.equal(execFileSync('git', ['-C', root, 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim(), '', 'Forge tracked sources must match the pin');
const contract = JSON.parse(await readFile(path.join(root, 'tests/fixtures/contracts/live_map_events.json')));
const feed = JSON.parse(await readFile(path.join(root, 'tests/fixtures/usgs/summary_feed.json')));
const now = Date.parse(contract.now);
const python = spawn(process.env.PYTHON || 'python3', ['-u', 'scripts/staging/serve-forge-fixture.py', root], { stdio: ['ignore', 'pipe', 'pipe'] });
let stderr = '';
python.stderr.on('data', data => { stderr += data; });
const ready = await Promise.race([
  once(python.stdout, 'data').then(([data]) => JSON.parse(String(data).trim())),
  once(python, 'exit').then(() => { throw new Error(`Forge fixture exited: ${stderr}`); }),
  new Promise((_, reject) => { const timer = setTimeout(() => { python.kill(); reject(new Error('Forge fixture startup timed out')); }, 15000); timer.unref(); }),
]);
const origin = `http://127.0.0.1:${ready.port}`;
const forgeEndpoint = `${origin}/api/events`;
const sourceFeature = feed.features[0];
const native = normalizeUsgsFeature(sourceFeature, new Date(now)).event;
const eonet = normalizeEonetEvent({ id: 'staging-volcano', title: 'SYNTHETIC separate volcano', closed: null,
  categories: [{ id: 'volcanoes', title: 'Volcanoes' }], sources: [{ id: 'fixture', url: 'https://example.org/volcano' }],
  geometry: [{ date: new Date(now - 60000).toISOString(), type: 'Point', coordinates: [20, 40] }] }, new Date(now)).event;
assert.ok(eonet);
function overrides(usgs = [native]) {
  return EVENT_PROVIDERS.map(provider => ({ providerId: provider.id,
    status: ['usgs', 'eonet'].includes(provider.id) ? 'healthy' : 'unavailable',
    events: provider.id === 'usgs' ? usgs : provider.id === 'eonet' ? [eonet] : [],
    fetchedAt: new Date(now).toISOString(), lastSuccessfulAt: new Date(now).toISOString(),
    recordCount: provider.id === 'usgs' ? usgs.length : provider.id === 'eonet' ? 1 : 0,
    rejectedCount: 0, cached: false, stale: false }));
}
async function staging(query = '', options = {}) {
  return createForgeStagingResponse(new Request(`http://127.0.0.1/api/events${query}`), {
    forgeEndpoint, now, timeoutMs: 10000, providerResultsOverride: overrides(), ...options });
}
function checkTypes(record, spec) {
  for (const [key, types] of Object.entries(spec)) {
    assert.ok(key in record, `missing ${key}`);
    const value = record[key];
    const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
    assert.ok(types.includes(type), `${key}: ${type} not in ${types}`);
  }
}
async function mockForge(handler, run) {
  const server = http.createServer(handler);
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  try { return await run(`http://127.0.0.1:${server.address().port}/api/events`); }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

try {
  await test('shared conformance fixture survives the real Forge HTTP boundary', async () => {
    const response = await fetch(`${origin}/contract/api/events`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body, contract.expected);
    checkTypes(body, contract.schema.envelope);
    for (const event of body.canonicalEvents) checkTypes(event, contract.schema.canonicalEvent);
    for (const event of body.events) checkTypes(event, contract.schema.legacyEvent);
  });

  await test('source fixture -> durable SQLite reopen -> HTTP -> adapter preserves source facts', async () => {
    const raw = await (await fetch(forgeEndpoint)).json();
    const adapted = await fetchForgeSnapshot(forgeEndpoint, { now });
    assert.equal(adapted.rejectedCount, 0);
    assert.equal(adapted.events.length, 4);
    for (const event of adapted.events) {
      const feature = feed.features.find(item => item.id === event.providerEventId);
      const original = raw.canonicalEvents.find(item => item.id === event.metadata.forge.objectId);
      assert.equal(event.id, `usgs:${feature.id}`);
      assert.equal(event.metadata.forge.providerEventId, `usgs-${feature.id}`);
      assert.equal(event.metadata.forge.contentHash, original.metadata.forge.contentHash);
      assert.equal(event.latitude, feature.geometry.coordinates[1]);
      assert.equal(event.longitude, feature.geometry.coordinates[0]);
      assert.equal(event.startedAt, new Date(feature.properties.time).toISOString());
      assert.equal(event.updatedAt, new Date(feature.properties.updated).toISOString());
      assert.equal(event.sourcePublishedAt, null);
      assert.equal(event.ingestedAt, original.ingestedAt);
      assert.equal(event.metadata.magnitude, feature.properties.mag);
      assert.equal(event.metadata.depthKm, feature.geometry.coordinates[2]);
      assert.equal(event.verificationStatus, feature.properties.status === 'reviewed' ? 'primary-confirmed' : 'single-source');
      assert.equal(event.confidence, feature.properties.status === 'reviewed' ? 96 : 88);
      assert.equal(event.independentSourceCount, 1);
      assert.equal(event.sourceUrl, original.sourceUrl);
      assert.equal(event.sourceName, 'USGS Earthquake Hazards Program');
      assert.equal(event.sourceTier, 'official');
      const object = (await (await fetch(`${origin}/objects/${encodeURIComponent(original.id)}`)).json()).object;
      const provenance = object.provenance[0];
      assert.equal(provenance.source, 'usgs');
      assert.equal(provenance.locator, `usgs:${feature.id}`);
      assert.equal(provenance.observedAt, '2026-10-19T00:00:00Z');
      assert.equal(provenance.contentHash, ready.sourceHashes[feature.id]);
      assert.ok(!('metadata' in provenance));
    }
    assert.equal(adapted.events.find(event => event.providerEventId === 'nc7000fx06').latitude, 0);
    assert.equal(adapted.events.find(event => event.providerEventId === 'ak0fx02').metadata.depthKm, 0);
    const sample = raw.canonicalEvents[0];
    assert.throws(() => adaptForgeEarthquake({ ...sample, metadata: { ...sample.metadata, usgsId: 'wrong' } }));
    assert.throws(() => adaptForgeEarthquake({ ...sample, latitude: null }));
    assert.throws(() => adaptForgeEarthquake({ ...sample, sourceUrl: 'https://example.org/forged' }));
  });

  await test('additive staging HTTP response retains native providers and exact source identity', async () => {
    const baseline = await (await createEventsResponse(new Request('http://127.0.0.1/api/events'), { now, env: {}, providerResultsOverride: overrides() })).json();
    // Reuse the ordinary Node loopback response forwarding pattern used by stored preview tests.
    await mockForge(async (req, res) => {
      const response = await staging();
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(await response.text());
    }, async endpoint => {
      const response = await fetch(endpoint);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('access-control-allow-origin'), '*');
      const body = await response.json();
      checkTypes(body, contract.schema.envelope);
      for (const event of body.canonicalEvents) checkTypes(event, contract.schema.canonicalEvent);
      for (const event of body.events) checkTypes(event, contract.schema.legacyEvent);
      assert.equal(body.canonicalEvents.length, 5); // four USGS identities plus EONET
      assert.equal(body.canonicalEvents.filter(event => event.id === native.id).length, 1);
      assert.deepEqual(body.canonicalEvents.find(event => event.id === native.id), baseline.canonicalEvents.find(event => event.id === native.id));
      assert.deepEqual(body.canonicalEvents.find(event => event.id === eonet.id), baseline.canonicalEvents.find(event => event.id === eonet.id));
      for (const [id, health] of Object.entries(baseline.sourceStatus)) if (id !== 'usgs') assert.deepEqual(body.sourceStatus[id], health);
      assert.equal(body.stagingIntegration.duplicateCount, 1);
      assert.equal(body.stagingIntegration.addedCount, 3);
      assert.ok(body.stagingIntegration.identities.some(identity => identity.eventId === native.id && identity.forgeObjectId === `event:usgs-${sourceFeature.id}`));
      for (const canonical of body.canonicalEvents) {
        const legacy = body.events.find(event => event.id === canonical.id);
        assert.equal(legacy.occurredAt, Date.parse(canonical.startedAt));
        assert.equal(legacy.updatedAt, Date.parse(canonical.updatedAt));
        assert.deepEqual(legacy.metadata, canonical.metadata);
      }
      assert.equal(body.changeCursor, null);
      assert.equal(body.sourceStatus['forge-staging'].collectionHealth, 'unknown');
    });
    // Same source id deduplicates even after large title/geometry/revision changes.
    const displaced = { ...native, title: 'Different revision title', latitude: -80, longitude: -160, updatedAt: new Date(now).toISOString() };
    const forged = (await fetchForgeSnapshot(forgeEndpoint, { now })).events.find(event => event.id === native.id);
    assert.ok(arePotentialDuplicates(displaced, forged));
    const conflict = await (await staging('', { providerResultsOverride: overrides([displaced]) })).json();
    assert.equal(conflict.stagingIntegration.conflictCount, 1);
    assert.equal(conflict.canonicalEvents.find(event => event.id === displaced.id).latitude, -80);
    const nearButDifferent = { ...native, id: 'usgs:different-source-id', providerEventId: 'different-source-id' };
    const nearby = await (await staging('', { providerResultsOverride: overrides([nearButDifferent]) })).json();
    assert.ok(nearby.canonicalEvents.some(event => event.id === native.id));
    assert.ok(nearby.canonicalEvents.some(event => event.id === nearButDifferent.id));
    assert.equal(nearby.stagingIntegration.duplicateCount, 0);
  });

  await test('existing API filters and browser filters work on adapted canonical and legacy events', async () => {
    for (const [query, expected] of [['?domain=natural-disaster', 4], ['?recordKind=observation', 0],
      ['?verification=primary-confirmed', 2], ['?verification=single-source', 2], ['?country=IRN', 1], ['?domain=technology-cyber', 0], ['?hours=24', 4]]) {
      const body = await (await staging(query)).json();
      assert.equal(body.canonicalEvents.filter(event => event.provider === 'usgs').length, expected, query);
      assert.deepEqual(body.events.map(event => event.id), body.canonicalEvents.map(event => event.id));
    }
    const body = await (await staging()).json();
    const browserEvents = body.events.map(normalizeEvent);
    const filters = { query: '', categories: new Set(['earthquake']), severities: new Set(['low', 'medium', 'high', 'critical']), domains: new Set(['natural-disaster']) };
    assert.equal(filteredEvents(browserEvents, filters, 168, 'newest', now).length, 4);
    assert.equal(filteredEvents(browserEvents, { ...filters, query: 'USGS' }, 168, 'newest', now).length, 4);
    const old = structuredClone(native); old.id = 'usgs:old'; old.providerEventId = 'old'; old.startedAt = new Date(now - 800 * 3600000).toISOString();
    const aged = await (await staging('', { providerResultsOverride: overrides([old]) })).json();
    assert.ok(!aged.events.some(event => event.id === old.id));
  });

  await test('outages, invalid and oversized responses fail softly without provider loss or diagnostic leakage', async () => {
    const baseline = await (await createEventsResponse(new Request('http://127.0.0.1/api/events'), { now, env: {}, providerResultsOverride: overrides() })).json();
    for (const handler of [
      (req, res) => { res.writeHead(503); res.end('private diagnostic must not escape'); },
      (req, res) => { res.end('{broken-json'); },
      (req, res) => { res.writeHead(302, { location: forgeEndpoint }); res.end(); },
      (req, res) => { res.writeHead(200, { 'content-length': 5 * 1024 * 1024 }); res.end(); },
      (req, res) => { res.end('x'.repeat(4 * 1024 * 1024 + 1)); },
      () => {},
    ]) {
      await mockForge(handler, async endpoint => {
        const body = await (await staging('', { forgeEndpoint: endpoint, timeoutMs: 75 })).json();
        assert.deepEqual(body.canonicalEvents, baseline.canonicalEvents);
        assert.equal(body.sourceStatus['forge-staging'].status, 'unavailable');
        assert.ok(!JSON.stringify(body).includes('private diagnostic'));
      });
    }
    await assert.rejects(fetchForgeSnapshot('https://example.org/api/events', { now }), /loopback/);
    await assert.rejects(staging('', { providerResultsOverride: overrides().slice(1) }), /complete-fixture/);
    const unavailable = await (await staging('', { forgeEndpoint: 'http://127.0.0.1:1/api/events' })).json();
    assert.deepEqual(unavailable.canonicalEvents, baseline.canonicalEvents);
    const raw = await (await fetch(forgeEndpoint)).json();
    for (const replacement of [
      { ...raw, generatedAt: now - 3600000 },
      { ...raw, sourceStatus: { 'osint-forge': { ok: true, stale: true } } },
    ]) await mockForge((req, res) => res.end(JSON.stringify(replacement)), async endpoint => {
      assert.equal((await (await staging('', { forgeEndpoint: endpoint })).json()).sourceStatus['forge-staging'].status, 'unavailable');
    });
    const mixed = structuredClone(raw); mixed.canonicalEvents[0].latitude = null;
    await mockForge((req, res) => res.end(JSON.stringify(mixed)), async endpoint => {
      const body = await (await staging('', { forgeEndpoint: endpoint })).json();
      assert.equal(body.sourceStatus['forge-staging'].rejectedCount, 1);
    });
  });

  await test('stored cursor stays native and Forge remains shadow-only through correction and resync', async () => {
    const db = await PGlite.create({ extensions: { postgis } });
    try {
      for (const name of ['001_usgs_evidence.sql', '002_usgs_recovery.sql']) await db.exec(await readFile(new URL(`../db/migrations/${name}`, import.meta.url), 'utf8'));
      await db.query("UPDATE lm_source_policies SET collection_enabled = true WHERE source_id = 'usgs'");
      const sourceFeed = { type: 'FeatureCollection', features: [sourceFeature] };
      await commitUsgsFeed(db, { jobId: 'staging:initial', feed: sourceFeed, retrievedAt: new Date(now).toISOString() });
      await dispatchUsgsOutbox(db, { now: new Date(now).toISOString() });
      const nativeOptions = { usgsDb: db, now, env: {}, providerResultsOverride: overrides().filter(result => result.providerId !== 'usgs') };
      const baseline = await (await createEventsResponse(new Request('http://127.0.0.1/api/events'), nativeOptions)).json();
      const body = await (await staging('', { usgsDb: db })).json();
      assert.deepEqual(body.canonicalEvents, baseline.canonicalEvents);
      assert.equal(body.changeCursor, baseline.changeCursor);
      assert.ok(body.changeCursor);
      const outage = await (await staging('', { usgsDb: db, forgeEndpoint: 'http://127.0.0.1:1/api/events' })).json();
      assert.deepEqual(outage.canonicalEvents, baseline.canonicalEvents);
      assert.equal(outage.changeCursor, baseline.changeCursor);
      assert.equal(outage.sourceStatus['forge-staging'].status, 'unavailable');
      assert.equal(body.stagingIntegration.mode, 'stored-shadow-only');
      assert.equal(body.stagingIntegration.addedCount, 0);
      assert.equal(body.stagingIntegration.shadowOnlyCount, 4);
      const initialChanges = await (await createChangesResponse(new Request(`http://127.0.0.1/api/changes?cursor=${body.changeCursor}`), { db })).json();
      assert.deepEqual(initialChanges.changes, []);
      const corrected = structuredClone(sourceFeature); corrected.properties.mag = 7; corrected.properties.updated = now + 60000;
      await commitUsgsFeed(db, { jobId: 'staging:correction', feed: { type: 'FeatureCollection', features: [corrected] }, retrievedAt: new Date(now + 60000).toISOString() });
      await dispatchUsgsOutbox(db, { now: new Date(now + 60000).toISOString() });
      const changes = await (await createChangesResponse(new Request(`http://127.0.0.1/api/changes?cursor=${body.changeCursor}`), { db })).json();
      assert.equal(changes.changes.length, 1);
      assert.equal(changes.changes[0].eventId, native.id);
      const refreshed = await (await staging('', { usgsDb: db, now: now + 60000 })).json();
      assert.equal(refreshed.canonicalEvents.find(event => event.id === native.id).metadata.magnitude, 7);
      await db.query("UPDATE lm_change_feed_state SET epoch = '0123456789abcdef0123456789abcdef' WHERE source_id = 'usgs'");
      assert.equal((await createChangesResponse(new Request(`http://127.0.0.1/api/changes?cursor=${body.changeCursor}`), { db })).status, 409);
    } finally { await db.close(); }
  });
} finally {
  python.kill('SIGTERM');
  await once(python, 'exit');
}
