-- Local candidate: normalized USGS evidence and a bounded public read model.
-- Apply with a dedicated migration role before enabling any collector or API read path.
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS lm_source_policies (
  source_id text PRIMARY KEY,
  source_name text NOT NULL,
  attribution text NOT NULL,
  source_url text NOT NULL,
  raw_retention text NOT NULL CHECK (raw_retention IN ('none', 'permitted')),
  normalized_retention_days integer CHECK (normalized_retention_days > 0),
  collection_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO lm_source_policies
  (source_id, source_name, attribution, source_url, raw_retention, normalized_retention_days, collection_enabled)
VALUES
  ('usgs', 'USGS Earthquake Hazards Program', 'USGS Earthquake Hazards Program',
   'https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php', 'none', 90, false)
ON CONFLICT (source_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS lm_collection_runs (
  job_id text PRIMARY KEY,
  source_id text NOT NULL REFERENCES lm_source_policies(source_id),
  started_at timestamptz NOT NULL,
  committed_at timestamptz NOT NULL DEFAULT now(),
  accepted_count integer NOT NULL CHECK (accepted_count >= 0),
  rejected_count integer NOT NULL CHECK (rejected_count >= 0),
  new_revision_count integer NOT NULL CHECK (new_revision_count >= 0)
);

CREATE TABLE IF NOT EXISTS lm_observations (
  source_id text NOT NULL REFERENCES lm_source_policies(source_id),
  source_record_id text NOT NULL,
  first_seen_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  current_revision_id bigint,
  current_source_updated_at timestamptz,
  PRIMARY KEY (source_id, source_record_id)
);

CREATE TABLE IF NOT EXISTS lm_observation_revisions (
  revision_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_id text NOT NULL,
  source_record_id text NOT NULL,
  revision_hash text NOT NULL CHECK (length(revision_hash) = 64),
  record_status text NOT NULL CHECK (record_status IN ('current', 'withdrawn')),
  source_published_at timestamptz,
  source_updated_at timestamptz,
  retrieved_at timestamptz NOT NULL,
  processed_at timestamptz NOT NULL,
  geographic_precision text NOT NULL CHECK (geographic_precision IN ('approximate_point', 'none')),
  position geography(Point, 4326),
  event_json jsonb,
  FOREIGN KEY (source_id, source_record_id) REFERENCES lm_observations(source_id, source_record_id),
  UNIQUE (source_id, source_record_id, revision_hash),
  CHECK ((record_status = 'withdrawn' AND event_json IS NULL) OR
         (record_status = 'current' AND event_json IS NOT NULL))
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lm_observations_current_revision_fk') THEN
    ALTER TABLE lm_observations
      ADD CONSTRAINT lm_observations_current_revision_fk
      FOREIGN KEY (current_revision_id) REFERENCES lm_observation_revisions(revision_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS lm_events_current (
  event_id text PRIMARY KEY,
  source_id text NOT NULL REFERENCES lm_source_policies(source_id),
  source_record_id text NOT NULL,
  revision_id bigint NOT NULL REFERENCES lm_observation_revisions(revision_id),
  started_at timestamptz NOT NULL,
  source_updated_at timestamptz,
  retrieved_at timestamptz NOT NULL,
  geographic_precision text NOT NULL,
  position geography(Point, 4326),
  event_json jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS lm_events_current_time_idx ON lm_events_current (started_at DESC);
CREATE INDEX IF NOT EXISTS lm_events_current_position_idx ON lm_events_current USING gist (position);

CREATE TABLE IF NOT EXISTS lm_collection_checkpoints (
  source_id text NOT NULL REFERENCES lm_source_policies(source_id),
  scope text NOT NULL,
  last_successful_check_at timestamptz,
  last_new_observation_at timestamptz,
  last_committed_job_id text,
  accepted_count integer NOT NULL DEFAULT 0,
  rejected_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (source_id, scope)
);

CREATE TABLE IF NOT EXISTS lm_collection_health (
  source_id text NOT NULL REFERENCES lm_source_policies(source_id),
  scope text NOT NULL,
  status text NOT NULL CHECK (status IN ('healthy', 'unavailable')),
  last_attempt_at timestamptz NOT NULL,
  last_successful_check_at timestamptz,
  last_error_code text,
  consecutive_failures integer NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
  PRIMARY KEY (source_id, scope)
);

CREATE TABLE IF NOT EXISTS lm_outbox (
  outbox_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_id text NOT NULL REFERENCES lm_source_policies(source_id),
  source_record_id text NOT NULL,
  revision_id bigint NOT NULL REFERENCES lm_observation_revisions(revision_id),
  previous_revision_id bigint REFERENCES lm_observation_revisions(revision_id),
  change_kind text NOT NULL CHECK (change_kind IN ('created', 'corrected', 'withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now(),
  dispatched_at timestamptz,
  UNIQUE (revision_id, change_kind)
);

CREATE INDEX IF NOT EXISTS lm_outbox_pending_idx ON lm_outbox (outbox_id) WHERE dispatched_at IS NULL;

CREATE TABLE IF NOT EXISTS lm_change_log (
  change_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  outbox_id bigint NOT NULL UNIQUE REFERENCES lm_outbox(outbox_id),
  source_id text NOT NULL REFERENCES lm_source_policies(source_id),
  source_record_id text NOT NULL,
  revision_id bigint NOT NULL REFERENCES lm_observation_revisions(revision_id),
  change_kind text NOT NULL,
  material_reason text NOT NULL,
  source_updated_at timestamptz,
  committed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lm_change_log_source_time_idx ON lm_change_log (source_id, change_id);
