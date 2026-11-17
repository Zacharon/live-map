-- Serializes visible change identifiers and tracks the earliest resumable cursor.
CREATE TABLE IF NOT EXISTS lm_change_feed_state (
  source_id text PRIMARY KEY REFERENCES lm_source_policies(source_id),
  epoch text NOT NULL CHECK (epoch ~ '^[0-9a-f]{32}$'),
  floor_change_id bigint NOT NULL DEFAULT 0 CHECK (floor_change_id >= 0),
  high_change_id bigint NOT NULL DEFAULT 0 CHECK (high_change_id >= floor_change_id)
);

INSERT INTO lm_change_feed_state (source_id, epoch, high_change_id)
SELECT 'usgs', md5(random()::text || clock_timestamp()::text),
       COALESCE((SELECT max(change_id) FROM lm_change_log WHERE source_id = 'usgs'), 0)
ON CONFLICT (source_id) DO NOTHING;

ALTER TABLE lm_outbox ADD COLUMN IF NOT EXISTS expiration_reason text;

CREATE INDEX IF NOT EXISTS lm_observation_revisions_retention_idx
  ON lm_observation_revisions (source_id, retrieved_at, revision_id);
CREATE INDEX IF NOT EXISTS lm_observations_last_seen_idx
  ON lm_observations (source_id, last_seen_at);
