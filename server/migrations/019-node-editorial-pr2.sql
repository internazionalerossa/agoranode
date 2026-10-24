-- Durable PR2 membership and editorial transition state, independent of UI controls.
-- A single PR2 may publish directly. With two or more active PR2s, every change
-- must satisfy a frozen majority of the electorate at proposal creation.
CREATE TABLE node_editorial_spaces (
 space_id text PRIMARY KEY CHECK(space_id ~ '^[a-z][a-z0-9-]{2,47}$'),
 founder_user_id text NOT NULL CHECK(char_length(founder_user_id) BETWEEN 1 AND 200),
 head_digest text CHECK(head_digest IS NULL OR head_digest ~ '^sha256:[0-9a-f]{64}$'),
 head_sequence bigint NOT NULL DEFAULT 0 CHECK(head_sequence >= 0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE node_editorial_pr2 (
 space_id text NOT NULL REFERENCES node_editorial_spaces(space_id),
 user_id text NOT NULL CHECK(char_length(user_id) BETWEEN 1 AND 200),
 joined_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(space_id,user_id)
);
CREATE TABLE node_editorial_proposals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 space_id text NOT NULL REFERENCES node_editorial_spaces(space_id),
 author_id text NOT NULL,
 base_digest text CHECK(base_digest IS NULL OR base_digest ~ '^sha256:[0-9a-f]{64}$'),
 content_digest text NOT NULL CHECK(content_digest ~ '^sha256:[0-9a-f]{64}$'),
 content_json jsonb NOT NULL CHECK(jsonb_typeof(content_json)='object' AND octet_length(content_json::text) <= 65536),
 electorate_size integer NOT NULL CHECK(electorate_size BETWEEN 1 AND 1000),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published','rejected','stale')),
 created_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz
);
CREATE INDEX node_editorial_proposals_open_idx ON node_editorial_proposals(space_id,status,created_at);
CREATE TABLE node_editorial_proposal_electors (
 proposal_id uuid NOT NULL REFERENCES node_editorial_proposals(id),
 user_id text NOT NULL,
 PRIMARY KEY(proposal_id,user_id)
);
CREATE TABLE node_editorial_ballots (
 proposal_id uuid NOT NULL,
 voter_id text NOT NULL,
 choice text NOT NULL CHECK(choice IN ('yes','no')),
 cast_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(proposal_id,voter_id),
 FOREIGN KEY(proposal_id,voter_id) REFERENCES node_editorial_proposal_electors(proposal_id,user_id)
);
CREATE TABLE node_editorial_revisions (
 space_id text NOT NULL REFERENCES node_editorial_spaces(space_id),
 sequence bigint NOT NULL CHECK(sequence > 0),
 digest text NOT NULL CHECK(digest ~ '^sha256:[0-9a-f]{64}$'),
 content_json jsonb NOT NULL,
 proposal_id uuid NOT NULL UNIQUE REFERENCES node_editorial_proposals(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(space_id,sequence),
 UNIQUE(space_id,digest)
);
CREATE FUNCTION reject_node_revision_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'published node revisions are immutable';
END;
$$;
CREATE TRIGGER node_editorial_revisions_immutable BEFORE UPDATE OR DELETE ON node_editorial_revisions
 FOR EACH ROW EXECUTE FUNCTION reject_node_revision_mutation();
