-- Node Studio drafts are PRIVATE work in progress, not registered nodes.
-- Only explicit governance decisions and a reviewed publisher can activate one.
CREATE TABLE node_studio_drafts (
 owner_id text NOT NULL CHECK (char_length(owner_id) BETWEEN 1 AND 200),
 draft_id uuid NOT NULL,
 space_id text NOT NULL CHECK (space_id ~ '^[a-z][a-z0-9-]{2,47}$'),
 body_json jsonb NOT NULL CHECK (jsonb_typeof(body_json)='object' AND octet_length(body_json::text)<=65536),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(owner_id,draft_id)
);
CREATE INDEX node_studio_owner_recents_idx ON node_studio_drafts(owner_id,updated_at DESC);
