import { USGS_SCOPE } from "./usgs-pipeline.js";
import { encodeUsgsCursor } from "./change-cursor.js";

const MAX_EVENTS = 200;
const STALE_AFTER_MS = 15 * 60 * 1000;

export function unavailableStoredUsgs(now = Date.now()) {
  return {
    providerId: "usgs",
    status: "unavailable",
    events: [],
    fetchedAt: new Date(now).toISOString(),
    lastSuccessfulAt: null,
    recordCount: 0,
    rejectedCount: 0,
    cached: false,
    stale: false,
    errorCode: "stored_read_unavailable",
    errorMessage: "Stored USGS observations are unavailable.",
    stateStorageMode: "postgres",
  };
}

export async function readStoredUsgs(db, { hours = 168, now = Date.now() } = {}) {
  const boundedHours = Math.max(24, Math.min(720, Math.trunc(Number(hours) || 168)));
  const cutoff = new Date(now - boundedHours * 3600000).toISOString();
  await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  let records, health, feedState;
  try {
    records = await db.query(
      `SELECT event_json, retrieved_at FROM lm_events_current
       WHERE source_id = 'usgs' AND started_at >= $1
       ORDER BY started_at DESC, event_id LIMIT $2`,
      [cutoff, MAX_EVENTS + 1],
    );
    health = await db.query(
      `SELECT h.status, h.last_successful_check_at, h.last_error_code,
              c.accepted_count, c.rejected_count
       FROM lm_collection_health h LEFT JOIN lm_collection_checkpoints c
         ON c.source_id = h.source_id AND c.scope = h.scope
       WHERE h.source_id = 'usgs' AND h.scope = $1`,
      [USGS_SCOPE],
    );
    feedState = await db.query("SELECT epoch, high_change_id FROM lm_change_feed_state WHERE source_id = 'usgs'");
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
  const state = health.rows[0];
  if (!state) return unavailableStoredUsgs(now);
  const lastSuccessfulAt = state.last_successful_check_at ? new Date(state.last_successful_check_at).toISOString() : null;
  const stale = !lastSuccessfulAt || now - new Date(lastSuccessfulAt).getTime() > STALE_AFTER_MS || state.status !== "healthy";
  const truncated = records.rows.length > MAX_EVENTS;
  const events = records.rows.slice(0, MAX_EVENTS).map((row) => row.event_json);
  return {
    providerId: "usgs",
    status: stale ? events.length ? "degraded" : "unavailable" : "healthy",
    events,
    fetchedAt: new Date(now).toISOString(),
    lastSuccessfulAt,
    recordCount: events.length,
    truncated,
    rejectedCount: Number(state.rejected_count || 0),
    cached: true,
    stale,
    errorCode: state.status === "unavailable" ? state.last_error_code || "collection_failed" : stale ? "collection_stale" : null,
    errorMessage: state.status === "unavailable" ? "USGS collection failed; showing dated stored observations." : stale ? "Stored USGS observations are stale." : null,
    statusMessage: `${stale ? "Stored USGS observations are stale or unavailable." : `Stored USGS observations; last checked ${lastSuccessfulAt}.`}${truncated ? " Showing the newest 200 matching records." : ""}`,
    stateStorageMode: "postgres",
    changeCursor: feedState.rows.length ? encodeUsgsCursor(feedState.rows[0].epoch, Number(feedState.rows[0].high_change_id)) : null,
  };
}
