-- Public-only replication receipts and one monotonic head per instance. The
-- replicated content itself remains in the append-only knowledge_* tables.
CREATE TABLE knowledge_replication_packages (
 checkpoint_id text PRIMARY KEY CHECK (checkpoint_id ~ '^sha256:[0-9a-f]{64}$'),
 network_id text NOT NULL CHECK (network_id ~ '^[a-z0-9][a-z0-9._:-]{2,127}$'),
 space_id text NOT NULL CHECK (space_id ~ '^[a-z0-9][a-z0-9._:-]{2,127}$'),
 sequence bigint NOT NULL CHECK (sequence BETWEEN 0 AND 9007199254740991),
 previous_checkpoint_id text CHECK (previous_checkpoint_id IS NULL OR previous_checkpoint_id ~ '^sha256:[0-9a-f]{64}$'),
 package_sha256 text NOT NULL UNIQUE CHECK (package_sha256 ~ '^sha256:[0-9a-f]{64}$'),
 bundle_sha256 text NOT NULL CHECK (bundle_sha256 ~ '^sha256:[0-9a-f]{64}$'),
 validator_set_digest text NOT NULL CHECK (validator_set_digest ~ '^sha256:[0-9a-f]{64}$'),
 authorization_kind text NOT NULL CHECK (authorization_kind IN ('legacy-bootstrap','governance-decision')),
 governance_decision_digest text CHECK (governance_decision_digest IS NULL OR governance_decision_digest ~ '^sha256:[0-9a-f]{64}$'),
 accepted_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (network_id,space_id,sequence),
 CHECK (
  (sequence=0 AND previous_checkpoint_id IS NULL AND authorization_kind='legacy-bootstrap' AND governance_decision_digest IS NULL)
  OR
  (sequence>0 AND previous_checkpoint_id IS NOT NULL AND authorization_kind='governance-decision' AND governance_decision_digest IS NOT NULL)
 )
);

CREATE TABLE knowledge_replication_heads (
 network_id text NOT NULL CHECK (network_id ~ '^[a-z0-9][a-z0-9._:-]{2,127}$'),
 space_id text NOT NULL CHECK (space_id ~ '^[a-z0-9][a-z0-9._:-]{2,127}$'),
 sequence bigint NOT NULL CHECK (sequence BETWEEN 0 AND 9007199254740991),
 previous_checkpoint_id text CHECK (previous_checkpoint_id IS NULL OR previous_checkpoint_id ~ '^sha256:[0-9a-f]{64}$'),
 checkpoint_id text NOT NULL REFERENCES knowledge_replication_packages(checkpoint_id),
 package_sha256 text NOT NULL REFERENCES knowledge_replication_packages(package_sha256),
 bundle_sha256 text NOT NULL CHECK (bundle_sha256 ~ '^sha256:[0-9a-f]{64}$'),
 validator_set_digest text NOT NULL CHECK (validator_set_digest ~ '^sha256:[0-9a-f]{64}$'),
 governance_decision_digest text CHECK (governance_decision_digest IS NULL OR governance_decision_digest ~ '^sha256:[0-9a-f]{64}$'),
 accepted_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (network_id,space_id),
 UNIQUE (checkpoint_id),
 CHECK (
  (sequence=0 AND previous_checkpoint_id IS NULL AND governance_decision_digest IS NULL)
  OR
  (sequence>0 AND previous_checkpoint_id IS NOT NULL AND governance_decision_digest IS NOT NULL)
 )
);

CREATE FUNCTION enforce_knowledge_replication_head() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.sequence<>0 OR NEW.previous_checkpoint_id IS NOT NULL THEN
   RAISE EXCEPTION 'knowledge replication head must start at genesis';
  END IF;
 ELSE
  IF NEW.network_id<>OLD.network_id OR NEW.space_id<>OLD.space_id
     OR NEW.sequence<>OLD.sequence+1
     OR NEW.previous_checkpoint_id<>OLD.checkpoint_id THEN
   RAISE EXCEPTION 'knowledge replication head must extend exactly one checkpoint';
  END IF;
 END IF;
 IF NOT EXISTS (
  SELECT 1 FROM knowledge_replication_packages p
  WHERE p.network_id=NEW.network_id AND p.space_id=NEW.space_id
    AND p.sequence=NEW.sequence AND p.previous_checkpoint_id IS NOT DISTINCT FROM NEW.previous_checkpoint_id
    AND p.checkpoint_id=NEW.checkpoint_id AND p.package_sha256=NEW.package_sha256
    AND p.bundle_sha256=NEW.bundle_sha256 AND p.validator_set_digest=NEW.validator_set_digest
    AND p.governance_decision_digest IS NOT DISTINCT FROM NEW.governance_decision_digest
 ) THEN
  RAISE EXCEPTION 'knowledge replication head has no matching finalized package';
 END IF;
 RETURN NEW;
END;
$$;

CREATE TRIGGER knowledge_replication_head_guard
BEFORE INSERT OR UPDATE ON knowledge_replication_heads
FOR EACH ROW EXECUTE FUNCTION enforce_knowledge_replication_head();

CREATE TRIGGER knowledge_replication_packages_append_only
BEFORE UPDATE OR DELETE ON knowledge_replication_packages
FOR EACH ROW EXECUTE FUNCTION reject_knowledge_content_mutation();

CREATE TRIGGER knowledge_replication_heads_no_delete
BEFORE DELETE ON knowledge_replication_heads
FOR EACH ROW EXECUTE FUNCTION reject_knowledge_pointer_delete();
