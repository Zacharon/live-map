import { encodeUsgsCursor, parseUsgsCursor } from "../ingestion/change-cursor.js";

const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" };

export class ChangeCursorResyncRequired extends Error {
  constructor(reason) { super("change cursor requires a new snapshot"); this.reason = reason; }
}

export async function readUsgsChanges(db, { cursor = { kind: "initial" }, limit = 50 } = {}) {
  const boundedLimit = Math.max(1, Math.min(200, Math.trunc(Number(limit) || 50)));
  await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  let rows, epoch, high, position;
  try {
    const state = await db.query("SELECT epoch, floor_change_id, high_change_id FROM lm_change_feed_state WHERE source_id = 'usgs'");
    if (!state.rows.length) throw new Error("USGS change-feed state is missing");
    ({ epoch } = state.rows[0]);
    const floor = Number(state.rows[0].floor_change_id);
    high = Number(state.rows[0].high_change_id);
    if (cursor.kind === "incompatible") throw new ChangeCursorResyncRequired("cursor-version-changed");
    if (cursor.kind === "valid" && cursor.epoch !== epoch) throw new ChangeCursorResyncRequired("cursor-epoch-changed");
    position = cursor.kind === "valid" ? cursor.id : floor;
    if (position < floor) throw new ChangeCursorResyncRequired("cursor-expired");
    if (position > high) throw new ChangeCursorResyncRequired("cursor-ahead-of-database");
    rows = await db.query(
    `SELECT c.change_id, c.change_kind, c.material_reason, c.source_updated_at, c.committed_at,
            c.source_record_id, r.event_json AS current_event, p.event_json AS previous_event
     FROM lm_change_log c
     JOIN lm_outbox o ON o.outbox_id = c.outbox_id
     JOIN lm_observation_revisions r ON r.revision_id = c.revision_id
     LEFT JOIN lm_observation_revisions p ON p.revision_id = o.previous_revision_id
     WHERE c.source_id = 'usgs' AND c.change_id > $1 AND c.change_id <= $3
     ORDER BY c.change_id LIMIT $2`,
    [position, boundedLimit + 1, high],
    );
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
  const selected = rows.rows.slice(0, boundedLimit);
  const changes = selected.map((row) => {
    const current = row.current_event?.retentionStatus === "expired" ? null : row.current_event;
    const previous = row.previous_event?.retentionStatus === "expired" ? null : row.previous_event;
    const event = current || previous || {};
    return {
      id: `usgs:${row.source_record_id}:${row.change_id}`,
      eventId: `usgs:${row.source_record_id}`,
      kind: row.change_kind,
      reason: row.material_reason,
      title: event.title || "USGS earthquake update",
      occurredAt: event.startedAt || null,
      sourceUpdatedAt: row.source_updated_at ? new Date(row.source_updated_at).toISOString() : null,
      committedAt: new Date(row.committed_at).toISOString(),
      sourceName: "USGS Earthquake Hazards Program",
      sourceUrl: event.sourceUrl || "https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php",
      evidenceStatus: current || previous ? "retained" : "expired",
    };
  });
  const lastId = selected.length ? Number(selected.at(-1).change_id) : position;
  return { changes, nextCursor: encodeUsgsCursor(epoch, lastId), hasMore: rows.rows.length > boundedLimit };
}

export async function createChangesResponse(request, options = {}) {
  if (request.method === "OPTIONS") return new Response("", { status: 204, headers });
  if (request.method !== "GET") return Response.json({ error: "method-not-allowed" }, { status: 405, headers });
  const url = new URL(request.url);
  const cursor = parseUsgsCursor(url.searchParams.get("cursor"));
  if (cursor.kind === "invalid") return Response.json({ error: "invalid-cursor" }, { status: 400, headers });
  const limit = Number(url.searchParams.get("limit") || 50);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) return Response.json({ error: "invalid-limit" }, { status: 400, headers });
  if (!options.db && options.env?.LIVE_MAP_STORED_USGS !== "true") {
    return Response.json({ status: "unavailable", reason: "stored-ingestion-disabled", changes: [] }, { status: 503, headers });
  }
  let client;
  try {
    let db = options.db;
    if (!db) {
      const connectionString = options.env?.HYPERDRIVE?.connectionString || options.env?.DATABASE_URL;
      if (!connectionString) throw new Error("database unavailable");
      const pg = await import("pg");
      const Client = pg.Client || pg.default.Client;
      client = new Client({ connectionString });
      await client.connect();
      db = client;
    }
    const result = await readUsgsChanges(db, { cursor, limit });
    return Response.json({ ...result, mode: "stored-usgs" }, { headers });
  } catch (error) {
    if (error instanceof ChangeCursorResyncRequired) {
      return Response.json({ error: "resync-required", reason: error.reason, snapshotUrl: "/api/events" }, { status: 409, headers });
    }
    return Response.json({ status: "unavailable", reason: "stored-read-failed", changes: [] }, { status: 503, headers });
  } finally {
    await client?.end().catch(() => {});
  }
}
