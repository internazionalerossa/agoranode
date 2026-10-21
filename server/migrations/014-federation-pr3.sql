-- AgoràNode federation registry and PR3 elections. Every governance artifact is
-- append-only: current mandate state is derived from the latest chained record.
CREATE TABLE federation_nodes (
 node_id text PRIMARY KEY CHECK (node_id ~ '^[a-z0-9][a-z0-9._:-]{2,127}$'),
 display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 120),
 admitted_by_decision_digest text NOT NULL CHECK (admitted_by_decision_digest ~ '^sha256:[0-9a-f]{64}$'),
 admitted_at bigint NOT NULL CHECK (admitted_at BETWEEN 0 AND 9007199254740991)
);

CREATE TABLE federation_node_keys (
 node_id text NOT NULL REFERENCES federation_nodes(node_id),
 key_id text NOT NULL CHECK (key_id ~ '^sha256:[0-9a-f]{64}$'),
 public_key_spki_base64 text NOT NULL CHECK (char_length(public_key_spki_base64) BETWEEN 40 AND 500),
 valid_from bigint NOT NULL CHECK (valid_from BETWEEN 0 AND 9007199254740991),
 valid_until bigint CHECK (valid_until IS NULL OR valid_until>valid_from),
 admitted_by_decision_digest text NOT NULL CHECK (admitted_by_decision_digest ~ '^sha256:[0-9a-f]{64}$'),
 PRIMARY KEY (node_id,key_id)
);

CREATE TABLE federation_pr2_electors (
 owner_key text PRIMARY KEY,
 actor_id text NOT NULL UNIQUE CHECK (actor_id ~ '^[a-z0-9][a-z0-9._:-]{2,127}$'),
 source_node_id text NOT NULL REFERENCES federation_nodes(node_id),
 source_membership_id text NOT NULL CHECK (source_membership_id ~ '^sha256:[0-9a-f]{64}$'),
 voter_key_id text NOT NULL UNIQUE CHECK (voter_key_id ~ '^sha256:[0-9a-f]{64}$'),
 voter_public_key_spki_base64 text NOT NULL CHECK (char_length(voter_public_key_spki_base64) BETWEEN 40 AND 500),
 public_alias text NOT NULL CHECK (char_length(public_alias) BETWEEN 2 AND 80),
 created_at bigint NOT NULL CHECK (created_at BETWEEN 0 AND 9007199254740991),
 UNIQUE (source_node_id,source_membership_id)
);

CREATE TABLE federation_pr2_attestations (
 attestation_sha256 text PRIMARY KEY CHECK (attestation_sha256 ~ '^sha256:[0-9a-f]{64}$'),
 owner_key text NOT NULL REFERENCES federation_pr2_electors(owner_key),
 source_node_id text NOT NULL,
 source_membership_id text NOT NULL,
 issuer_key_id text NOT NULL,
 proof_json text NOT NULL,
 attestation_json text NOT NULL,
 valid_from bigint NOT NULL,
 valid_until bigint NOT NULL CHECK (valid_until>valid_from),
 accepted_at bigint NOT NULL,
 FOREIGN KEY (source_node_id,issuer_key_id) REFERENCES federation_node_keys(node_id,key_id),
 UNIQUE (attestation_sha256,owner_key)
);

CREATE TABLE federation_pr3_decisions (
 decision_id text PRIMARY KEY CHECK (decision_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
 sequence bigint NOT NULL UNIQUE CHECK (sequence BETWEEN 1 AND 9007199254740991),
 kind text NOT NULL CHECK (kind IN ('pr3-election','pr3-recall')),
 candidate_owner_key text NOT NULL REFERENCES federation_pr2_electors(owner_key),
 candidate_actor_id text NOT NULL,
 source_node_id text NOT NULL,
 source_membership_id text NOT NULL,
 source_attestation_sha256 text NOT NULL REFERENCES federation_pr2_attestations(attestation_sha256),
 target_mandate_id text CHECK (target_mandate_id IS NULL OR target_mandate_id ~ '^sha256:[0-9a-f]{64}$'),
 requester_actor_id text NOT NULL,
 title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 140),
 statement text NOT NULL CHECK (char_length(statement) BETWEEN 20 AND 30000),
 term_days bigint NOT NULL CHECK (term_days BETWEEN 0 AND 365),
 created_at bigint NOT NULL,
 opens_at bigint NOT NULL,
 closes_at bigint NOT NULL,
 proposal_sha256 text NOT NULL CHECK (proposal_sha256 ~ '^sha256:[0-9a-f]{64}$'),
 envelope_sha256 text NOT NULL UNIQUE CHECK (envelope_sha256 ~ '^sha256:[0-9a-f]{64}$'),
 envelope_json text NOT NULL,
 CHECK (created_at<opens_at AND opens_at<closes_at),
 CHECK ((kind='pr3-election' AND target_mandate_id IS NULL AND term_days BETWEEN 1 AND 365)
     OR (kind='pr3-recall' AND target_mandate_id IS NOT NULL AND term_days=0))
);

CREATE INDEX federation_pr3_decision_time_idx ON federation_pr3_decisions(closes_at,decision_id);

CREATE TABLE federation_pr3_electorate (
 decision_id text NOT NULL REFERENCES federation_pr3_decisions(decision_id),
 owner_key text NOT NULL REFERENCES federation_pr2_electors(owner_key),
 actor_id text NOT NULL,
 voter_key_id text NOT NULL,
 voter_public_key_spki_base64 text NOT NULL,
 source_attestation_sha256 text NOT NULL REFERENCES federation_pr2_attestations(attestation_sha256),
 PRIMARY KEY (decision_id,owner_key),
 UNIQUE (decision_id,actor_id),
 UNIQUE (decision_id,voter_key_id)
);

CREATE TABLE federation_pr3_ballots (
 decision_id text NOT NULL REFERENCES federation_pr3_decisions(decision_id),
 owner_key text NOT NULL,
 ballot_sha256 text NOT NULL CHECK (ballot_sha256 ~ '^sha256:[0-9a-f]{64}$'),
 ballot_json text NOT NULL,
 cast_at bigint NOT NULL,
 PRIMARY KEY (decision_id,owner_key),
 UNIQUE (decision_id,ballot_sha256),
 FOREIGN KEY (decision_id,owner_key) REFERENCES federation_pr3_electorate(decision_id,owner_key)
);

CREATE TABLE federation_pr3_certificates (
 decision_id text PRIMARY KEY REFERENCES federation_pr3_decisions(decision_id),
 decision_digest text NOT NULL UNIQUE CHECK (decision_digest ~ '^sha256:[0-9a-f]{64}$'),
 outcome text NOT NULL CHECK (outcome IN ('approved','rejected','no-quorum','tied')),
 certificate_json text NOT NULL,
 finalized_at bigint NOT NULL
);

CREATE TABLE federation_pr3_mandate_records (
 record_digest text NOT NULL UNIQUE CHECK (record_digest ~ '^sha256:[0-9a-f]{64}$'),
 mandate_id text NOT NULL CHECK (mandate_id ~ '^sha256:[0-9a-f]{64}$'),
 sequence bigint NOT NULL CHECK (sequence BETWEEN 0 AND 1000),
 actor_id text NOT NULL,
 owner_key text NOT NULL REFERENCES federation_pr2_electors(owner_key),
 state text NOT NULL CHECK (state IN ('nominated','candidate','elected','active','withdrawn','recalled','resigned','expired')),
 transition_at bigint NOT NULL,
 previous_record_digest text REFERENCES federation_pr3_mandate_records(record_digest),
 election_decision_digest text CHECK (election_decision_digest IS NULL OR election_decision_digest ~ '^sha256:[0-9a-f]{64}$'),
 record_json text NOT NULL,
 PRIMARY KEY (mandate_id,sequence),
 UNIQUE (mandate_id,state),
 CHECK ((sequence=0 AND previous_record_digest IS NULL) OR (sequence>0 AND previous_record_digest IS NOT NULL))
);

CREATE FUNCTION reject_federation_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Federation governance records are append-only'; END $$;

CREATE FUNCTION enforce_federation_mandate_chain() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE latest federation_pr3_mandate_records%ROWTYPE;
BEGIN
 SELECT * INTO latest FROM federation_pr3_mandate_records
 WHERE mandate_id=NEW.mandate_id ORDER BY sequence DESC LIMIT 1;
 IF NOT FOUND THEN
  IF NEW.sequence<>0 OR NEW.previous_record_digest IS NOT NULL OR NEW.state<>'nominated' THEN
   RAISE EXCEPTION 'Mandate chain must start with nomination';
  END IF;
 ELSIF NEW.sequence<>latest.sequence+1 OR NEW.previous_record_digest<>latest.record_digest THEN
  RAISE EXCEPTION 'Mandate record does not extend the current head';
 END IF;
 RETURN NEW;
END $$;

CREATE TRIGGER federation_mandate_chain_guard BEFORE INSERT ON federation_pr3_mandate_records
FOR EACH ROW EXECUTE FUNCTION enforce_federation_mandate_chain();

DO $$
DECLARE table_name text;
BEGIN
 FOREACH table_name IN ARRAY ARRAY[
  'federation_nodes','federation_node_keys','federation_pr2_electors',
  'federation_pr2_attestations','federation_pr3_decisions',
  'federation_pr3_electorate','federation_pr3_ballots',
  'federation_pr3_certificates','federation_pr3_mandate_records'
 ] LOOP
  EXECUTE format('CREATE TRIGGER %I_append_only BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION reject_federation_mutation()',table_name,table_name);
 END LOOP;
END $$;
