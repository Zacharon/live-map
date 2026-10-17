export function materialUsgsChange(previous, current, kind) {
  if (kind === "created") return "new-source-record";
  if (kind === "withdrawn") return "source-withdrawal";
  if (!previous || !current) return "source-correction";
  if (previous.severityLabel !== current.severityLabel) return "severity-band-change";
  const previousVerification = previous.metadata?.verificationStatus || previous.verification?.state;
  const currentVerification = current.metadata?.verificationStatus || current.verification?.state;
  if (previousVerification !== currentVerification && currentVerification === "primary-confirmed") return "verification-upgrade";
  if (previous.metadata?.magnitude !== current.metadata?.magnitude) return "magnitude-correction";
  if (previous.latitude !== current.latitude || previous.longitude !== current.longitude) return "epicenter-correction";
  return null;
}

export async function dispatchUsgsOutbox(db, { limit = 50, now = new Date(), beforeCommit } = {}) {
  const boundedLimit = Math.max(1, Math.min(200, Math.trunc(Number(limit) || 50)));
  const dispatchedAt = new Date(now).toISOString();
  await db.query("BEGIN");
  try {
    // Hold the feed row until COMMIT. A later dispatcher cannot publish a higher
    // cursor before this transaction's lower change IDs become visible.
    const state = await db.query("SELECT high_change_id FROM lm_change_feed_state WHERE source_id = 'usgs' FOR UPDATE");
    if (!state.rows.length) throw new Error("USGS change-feed state is missing");
    const pending = await db.query(
      `SELECT o.outbox_id, o.source_record_id, o.revision_id, o.change_kind,
              r.event_json AS current_event, r.source_updated_at,
              p.event_json AS previous_event
       FROM lm_outbox o
       JOIN lm_observation_revisions r ON r.revision_id = o.revision_id
       LEFT JOIN lm_observation_revisions p ON p.revision_id = o.previous_revision_id
       WHERE o.source_id = 'usgs' AND o.dispatched_at IS NULL
       ORDER BY o.outbox_id LIMIT $1 FOR UPDATE OF o SKIP LOCKED`,
      [boundedLimit],
    );
    let surfaced = 0;
    let highChangeId = Number(state.rows[0].high_change_id);
    for (const row of pending.rows) {
      const reason = materialUsgsChange(row.previous_event, row.current_event, row.change_kind);
      if (reason) {
        const inserted = await db.query(
          `INSERT INTO lm_change_log
            (outbox_id, source_id, source_record_id, revision_id, change_kind, material_reason, source_updated_at)
           VALUES ($1, 'usgs', $2, $3, $4, $5, $6)
           ON CONFLICT (outbox_id) DO NOTHING RETURNING change_id`,
          [row.outbox_id, row.source_record_id, row.revision_id, row.change_kind, reason, row.source_updated_at],
        );
        if (inserted.rows.length) highChangeId = Math.max(highChangeId, Number(inserted.rows[0].change_id));
        surfaced += 1;
      }
      await db.query("UPDATE lm_outbox SET dispatched_at = $2 WHERE outbox_id = $1", [row.outbox_id, dispatchedAt]);
    }
    await db.query("UPDATE lm_change_feed_state SET high_change_id = $1 WHERE source_id = 'usgs'", [highChangeId]);
    if (beforeCommit) await beforeCommit();
    await db.query("COMMIT");
    return { processed: pending.rows.length, surfaced };
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}
