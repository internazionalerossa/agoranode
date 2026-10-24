-- Node creation is a scoped PR3/Agorà PR2 assembly decision, NOT a UI
-- click or an authority assigned to a server operator.
CREATE TABLE agora_node_foundations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 space_id text NOT NULL CHECK(space_id ~ '^[a-z][a-z0-9-]{2,47}$' AND space_id NOT IN ('agora','polisrossa')),
 created_by text NOT NULL,
 digest text NOT NULL CHECK(digest ~ '^sha256:[0-9a-f]{64}$'),
 blueprint_json jsonb NOT NULL CHECK(jsonb_typeof(blueprint_json)='object' AND octet_length(blueprint_json::text)<=64000),
 electorate_size integer NOT NULL CHECK(electorate_size BETWEEN 1 AND 1000),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz
);
CREATE UNIQUE INDEX agora_node_foundation_active_space
 ON agora_node_foundations(space_id) WHERE status IN ('pending','approved');
CREATE INDEX agora_node_foundation_recent ON agora_node_foundations(created_at DESC,id DESC);
CREATE TABLE agora_node_foundation_electors (
 proposal_id uuid NOT NULL REFERENCES agora_node_foundations(id),
 user_id text NOT NULL,
 PRIMARY KEY(proposal_id,user_id)
);
CREATE TABLE agora_node_foundation_votes (
 proposal_id uuid NOT NULL,
 voter_id text NOT NULL,
 choice text NOT NULL CHECK(choice IN ('yes','no')),
 cast_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(proposal_id,voter_id),
 FOREIGN KEY(proposal_id,voter_id) REFERENCES agora_node_foundation_electors(proposal_id,user_id)
);
CREATE FUNCTION freeze_agora_node_blueprint() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.space_id<>OLD.space_id OR NEW.created_by<>OLD.created_by
  OR NEW.digest<>OLD.digest OR NEW.blueprint_json<>OLD.blueprint_json
  OR NEW.electorate_size<>OLD.electorate_size
  OR NEW.created_at<>OLD.created_at THEN
  RAISE EXCEPTION 'frozen node foundation proposal cannot be modified';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER agora_foundation_immutable
 BEFORE UPDATE ON agora_node_foundations
 FOR EACH ROW EXECUTE FUNCTION freeze_agora_node_blueprint();
