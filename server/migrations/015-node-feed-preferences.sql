-- Private per-account source preferences, never exported in public knowledge bundles.
CREATE TABLE node_feed_preferences (
 owner_id text NOT NULL CHECK (char_length(owner_id) BETWEEN 1 AND 200),
 space_id text NOT NULL CHECK (space_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 sources_json jsonb NOT NULL DEFAULT '[]'::jsonb
   CHECK (jsonb_typeof(sources_json)='array' AND octet_length(sources_json::text) <= 8192),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(owner_id, space_id)
);
CREATE INDEX node_feed_preferences_owner_idx ON node_feed_preferences(owner_id);
