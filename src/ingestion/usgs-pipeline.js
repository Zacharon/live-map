import { normalizeUsgsFeature } from "../data/providers/usgs.js";

export const USGS_SCOPE = "global-summary";
const MAX_FEATURES = 1000;
const WITHDRAWAL_STATUSES = new Set(["deleted", "withdrawn"]);

function iso(value, name) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error(`${name} must be a valid timestamp`);
  return date.toISOString();
}

function stableRecordId(feature) {
  const id = feature?.id;
  return typeof id === "string" && id.length > 0 && id.length <= 160 ? id : null;
}

function validSourceTime(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(new Date(value).getTime());
}

function revisionContent(feature, event, withdrawn) {
  const properties = feature.properties || {};
  return {
    sourceRecordId: feature.id,
    withdrawn,
    status: String(properties.status || "unknown"),
    sourceTime: properties.time ?? null,
    sourceUpdated: properties.updated ?? null,
    magnitude: properties.mag ?? null,
    place: properties.place ?? null,
    title: properties.title ?? null,
    sourceUrl: properties.url ?? null,
    coordinates: withdrawn ? null : feature.geometry.coordinates,
    eventId: event?.id || null,
  };
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function prepareUsgsFeed(feed, retrievedAt) {
  const retrievedIso = iso(retrievedAt, "retrievedAt");
  if (!feed || feed.type !== "FeatureCollection" || !Array.isArray(feed.features) || feed.features.length > MAX_FEATURES) {
    throw new Error(`USGS feed must be a FeatureCollection with at most ${MAX_FEATURES} features`);
  }
  const accepted = [];
  const rejected = [];
  for (const feature of feed.features) {
    const id = stableRecordId(feature);
    if (!id) {
      rejected.push({ reason: "missing-stable-id" });
      continue;
    }
    const properties = feature.properties || {};
    const withdrawn = WITHDRAWAL_STATUSES.has(String(properties.status || "").toLowerCase());
    const sourceUpdatedAt = properties.updated ?? properties.time;
    if (!validSourceTime(sourceUpdatedAt) || (!withdrawn && !validSourceTime(properties.time))) {
      rejected.push({ id, reason: "invalid-source-time" });
      continue;
    }
    let event = null;
    if (!withdrawn) {
      const result = normalizeUsgsFeature(feature, new Date(retrievedIso));
      if (!result.event) {
        rejected.push({ id, reason: "invalid-event" });
        continue;
      }
      event = result.event;
    }
    accepted.push({
      id,
      event,
      withdrawn,
      sourceUpdatedAt: iso(sourceUpdatedAt, "sourceUpdatedAt"),
      sourcePublishedAt: null,
      hash: await sha256(revisionContent(feature, event, withdrawn)),
    });
  }
  if (feed.features.length && accepted.length === 0) throw new Error("USGS feed contained no acceptable records");
  return { accepted, rejected, retrievedAt: retrievedIso };
}

async function begin(db) { await db.query("BEGIN"); }
async function commit(db) { await db.query("COMMIT"); }
async function rollback(db) { await db.query("ROLLBACK"); }

export async function commitUsgsFeed(db, { jobId, feed, retrievedAt, processedAt = new Date(), beforeCommit } ) {
  if (!/^[a-zA-Z0-9:_-]{1,160}$/.test(String(jobId || ""))) throw new Error("jobId must be a bounded stable key");
  const prepared = await prepareUsgsFeed(feed, retrievedAt);
  const processedIso = iso(processedAt, "processedAt");
  await begin(db);
  try {
    const policy = await db.query("SELECT collection_enabled FROM lm_source_policies WHERE source_id = $1 FOR UPDATE", ["usgs"]);
    if (policy.rows[0]?.collection_enabled !== true) throw new Error("USGS collection policy is disabled");
    const run = await db.query(
      `INSERT INTO lm_collection_runs (job_id, source_id, started_at, accepted_count, rejected_count, new_revision_count)
       VALUES ($1, 'usgs', $2, 0, 0, 0) ON CONFLICT DO NOTHING RETURNING job_id`,
      [jobId, processedIso],
    );
    if (!run.rows.length) {
      await rollback(db);
      return { status: "duplicate-job", acceptedCount: 0, rejectedCount: 0, newRevisionCount: 0 };
    }
    let newRevisionCount = 0;
    let promotedCount = 0;
    for (const record of prepared.accepted) {
      const observation = await db.query(
        `INSERT INTO lm_observations (source_id, source_record_id, first_seen_at, last_seen_at)
         VALUES ('usgs', $1, $2, $2)
         ON CONFLICT (source_id, source_record_id) DO UPDATE
           SET last_seen_at = GREATEST(lm_observations.last_seen_at, EXCLUDED.last_seen_at)
         RETURNING current_revision_id, current_source_updated_at`,
        [record.id, prepared.retrievedAt],
      );
      const previousRevisionId = observation.rows[0].current_revision_id;
      const previousUpdated = observation.rows[0].current_source_updated_at;
      const event = record.event;
      const revision = await db.query(
        `INSERT INTO lm_observation_revisions
          (source_id, source_record_id, revision_hash, record_status, source_published_at, source_updated_at,
           retrieved_at, processed_at, geographic_precision, position, event_json)
         VALUES ('usgs', $1, $2, $3, $4, $5, $6, $7, $8,
                 CASE WHEN $9::double precision IS NULL THEN NULL
                      ELSE ST_SetSRID(ST_MakePoint($9, $10), 4326)::geography END,
                 $11::jsonb)
         ON CONFLICT (source_id, source_record_id, revision_hash) DO NOTHING
         RETURNING revision_id`,
        [record.id, record.hash, record.withdrawn ? "withdrawn" : "current", record.sourcePublishedAt,
          record.sourceUpdatedAt, prepared.retrievedAt, processedIso,
          record.withdrawn ? "none" : "approximate_point", event?.longitude ?? null, event?.latitude ?? null,
          event ? JSON.stringify(event) : null],
      );
      if (!revision.rows.length) continue;
      newRevisionCount += 1;
      if (previousUpdated && new Date(record.sourceUpdatedAt) < new Date(previousUpdated)) continue;
      const revisionId = revision.rows[0].revision_id;
      await db.query(
        `UPDATE lm_observations SET current_revision_id = $2, current_source_updated_at = $3
         WHERE source_id = 'usgs' AND source_record_id = $1`,
        [record.id, revisionId, record.sourceUpdatedAt],
      );
      if (record.withdrawn) {
        await db.query("DELETE FROM lm_events_current WHERE event_id = $1", [`usgs:${record.id}`]);
      } else {
        await db.query(
          `INSERT INTO lm_events_current
            (event_id, source_id, source_record_id, revision_id, started_at, source_updated_at,
             retrieved_at, geographic_precision, position, event_json)
           VALUES ($1, 'usgs', $2, $3, $4, $5, $6, 'approximate_point',
                   ST_SetSRID(ST_MakePoint($7, $8), 4326)::geography, $9::jsonb)
           ON CONFLICT (event_id) DO UPDATE SET
             revision_id = EXCLUDED.revision_id, started_at = EXCLUDED.started_at,
             source_updated_at = EXCLUDED.source_updated_at, retrieved_at = EXCLUDED.retrieved_at,
             geographic_precision = EXCLUDED.geographic_precision, position = EXCLUDED.position,
             event_json = EXCLUDED.event_json`,
          [event.id, record.id, revisionId, event.startedAt, record.sourceUpdatedAt,
            prepared.retrievedAt, event.longitude, event.latitude, JSON.stringify(event)],
        );
      }
      if (!record.withdrawn || previousRevisionId != null) {
        await db.query(
          `INSERT INTO lm_outbox (source_id, source_record_id, revision_id, previous_revision_id, change_kind)
           VALUES ('usgs', $1, $2, $3, $4)`,
          [record.id, revisionId, previousRevisionId, record.withdrawn ? "withdrawn" : previousRevisionId == null ? "created" : "corrected"],
        );
      }
      promotedCount += 1;
    }
    await db.query(
      `INSERT INTO lm_collection_checkpoints
        (source_id, scope, last_successful_check_at, last_new_observation_at, last_committed_job_id, accepted_count, rejected_count)
       VALUES ('usgs', $1, $2, $3, $4, $5, $6)
       ON CONFLICT (source_id, scope) DO UPDATE SET
         last_successful_check_at = EXCLUDED.last_successful_check_at,
         last_new_observation_at = COALESCE(EXCLUDED.last_new_observation_at, lm_collection_checkpoints.last_new_observation_at),
         last_committed_job_id = EXCLUDED.last_committed_job_id,
         accepted_count = EXCLUDED.accepted_count, rejected_count = EXCLUDED.rejected_count`,
      [USGS_SCOPE, prepared.retrievedAt, promotedCount ? processedIso : null, jobId,
        prepared.accepted.length, prepared.rejected.length],
    );
    await db.query(
      `INSERT INTO lm_collection_health (source_id, scope, status, last_attempt_at, last_successful_check_at, last_error_code, consecutive_failures)
       VALUES ('usgs', $1, 'healthy', $2, $3, NULL, 0)
       ON CONFLICT (source_id, scope) DO UPDATE SET status = 'healthy', last_attempt_at = EXCLUDED.last_attempt_at,
         last_successful_check_at = EXCLUDED.last_successful_check_at, last_error_code = NULL, consecutive_failures = 0`,
      [USGS_SCOPE, processedIso, prepared.retrievedAt],
    );
    await db.query(
      "UPDATE lm_collection_runs SET accepted_count = $2, rejected_count = $3, new_revision_count = $4 WHERE job_id = $1",
      [jobId, prepared.accepted.length, prepared.rejected.length, newRevisionCount],
    );
    if (beforeCommit) await beforeCommit();
    await commit(db);
    return { status: "committed", acceptedCount: prepared.accepted.length, rejectedCount: prepared.rejected.length,
      newRevisionCount, promotedCount };
  } catch (error) {
    await rollback(db);
    throw error;
  }
}

export async function markUsgsCollectionFailure(db, { attemptedAt = new Date(), errorCode = "fetch-failed" } = {}) {
  const allowed = new Set(["fetch-failed", "invalid-feed", "database-failed"]);
  if (!allowed.has(errorCode)) throw new Error("unsupported collection failure code");
  await db.query(
    `INSERT INTO lm_collection_health (source_id, scope, status, last_attempt_at, last_error_code, consecutive_failures)
     VALUES ('usgs', $1, 'unavailable', $2, $3, 1)
     ON CONFLICT (source_id, scope) DO UPDATE SET status = 'unavailable',
       last_attempt_at = EXCLUDED.last_attempt_at, last_error_code = EXCLUDED.last_error_code,
       consecutive_failures = lm_collection_health.consecutive_failures + 1`,
    [USGS_SCOPE, iso(attemptedAt, "attemptedAt"), errorCode],
  );
}
