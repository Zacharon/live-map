const REDACTED_EVENT = JSON.stringify({ retentionStatus: "expired" });

function instant(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("now must be a valid timestamp");
  return date;
}

export async function rotateUsgsCursorEpoch(db) {
  const epoch = crypto.randomUUID().replaceAll("-", "");
  await db.query("UPDATE lm_change_feed_state SET epoch = $1 WHERE source_id = 'usgs'", [epoch]);
  return epoch;
}

async function selectWork(db, cutoff, limit) {
  const revisions = await db.query(
    `SELECT r.revision_id, r.source_record_id, r.revision_id = o.current_revision_id AS is_current
     FROM lm_observation_revisions r
     JOIN lm_observations o ON o.source_id = r.source_id AND o.source_record_id = r.source_record_id
     WHERE r.source_id = 'usgs' AND r.retrieved_at < $1
       AND r.event_json IS NOT NULL AND r.event_json <> $2::jsonb
       AND (r.revision_id <> o.current_revision_id OR o.last_seen_at < $1)
     ORDER BY r.retrieved_at, r.revision_id LIMIT $3`,
    [cutoff, REDACTED_EVENT, limit + 1],
  );
  const pending = await db.query(
    `SELECT outbox_id FROM lm_outbox
     WHERE source_id = 'usgs' AND dispatched_at IS NULL AND created_at < $1
     ORDER BY outbox_id LIMIT $2`, [cutoff, limit + 1],
  );
  const oldestChanges = await db.query(
    `SELECT change_id, committed_at FROM lm_change_log
     WHERE source_id = 'usgs' ORDER BY change_id LIMIT $1`, [limit + 1],
  );
  const prefix = [];
  for (const row of oldestChanges.rows) {
    if (new Date(row.committed_at).getTime() >= new Date(cutoff).getTime()) break;
    prefix.push(Number(row.change_id));
  }
  return {
    revisions: revisions.rows.slice(0, limit),
    pending: pending.rows.slice(0, limit),
    changeIds: prefix.slice(0, limit),
    moreRevisions: revisions.rows.length > limit,
    morePending: pending.rows.length > limit,
    moreChanges: prefix.length > limit,
  };
}

export async function cleanupUsgsRetention(db, { now = new Date(), batchLimit = 100, execute = false } = {}) {
  const clock = instant(now);
  const limit = Number(batchLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new Error("batchLimit must be 1..200");
  await db.query("BEGIN");
  try {
    const policy = await db.query(
      `SELECT normalized_retention_days FROM lm_source_policies WHERE source_id = 'usgs' FOR UPDATE`,
    );
    const days = policy.rows[0]?.normalized_retention_days;
    if (days == null) throw new Error("USGS normalized retention policy is unspecified");
    const cutoff = new Date(clock.getTime() - Number(days) * 86400000).toISOString();
    const state = await db.query("SELECT floor_change_id FROM lm_change_feed_state WHERE source_id = 'usgs' FOR UPDATE");
    if (!state.rows.length) throw new Error("USGS change-feed state is missing");
    const work = await selectWork(db, cutoff, limit);
    const report = {
      mode: execute ? "executed" : "dry-run", cutoff, batchLimit: limit,
      revisions: work.revisions.length, currentEvents: work.revisions.filter((row) => row.is_current).length,
      pendingExpired: work.pending.length, changesRemoved: work.changeIds.length,
      more: work.moreRevisions || work.morePending || work.moreChanges,
      cursorEpochRotated: false,
    };
    if (execute) {
      for (const row of work.pending) {
        await db.query(
          `UPDATE lm_outbox SET dispatched_at = $2, expiration_reason = 'retention-expired'
           WHERE outbox_id = $1 AND dispatched_at IS NULL`, [row.outbox_id, clock.toISOString()],
        );
      }
      for (const row of work.revisions) {
        const expired = await db.query(
          `UPDATE lm_outbox SET dispatched_at = $2, expiration_reason = 'retention-expired'
           WHERE revision_id = $1 AND dispatched_at IS NULL RETURNING outbox_id`,
          [row.revision_id, clock.toISOString()],
        );
        if (expired.rows.length) {
          report.pendingExpired += expired.rows.length;
        }
        if (row.is_current) await db.query("DELETE FROM lm_events_current WHERE source_id = 'usgs' AND source_record_id = $1", [row.source_record_id]);
        await db.query(
          `UPDATE lm_observation_revisions SET event_json = $2::jsonb, position = NULL,
            geographic_precision = 'none' WHERE revision_id = $1`, [row.revision_id, REDACTED_EVENT],
        );
      }
      if (work.changeIds.length) {
        const last = work.changeIds.at(-1);
        await db.query("DELETE FROM lm_change_log WHERE source_id = 'usgs' AND change_id <= $1", [last]);
        await db.query("UPDATE lm_change_feed_state SET floor_change_id = GREATEST(floor_change_id, $1) WHERE source_id = 'usgs'", [last]);
      }
      // Expiring pending work or a current event creates a gap for existing clients.
      if (report.pendingExpired || report.currentEvents) {
        await rotateUsgsCursorEpoch(db);
        report.cursorEpochRotated = true;
      }
      await db.query("COMMIT");
    } else {
      await db.query("ROLLBACK");
    }
    return report;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}
