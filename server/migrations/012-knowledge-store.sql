-- Public, content-addressed knowledge. This schema deliberately contains no
-- account, session or forum ownership columns. Only the current pointer may
-- move; every object it points at remains append-only.
CREATE TABLE knowledge_entities (
 entity_sha256 text PRIMARY KEY CHECK (entity_sha256 ~ '^[0-9a-f]{64}$'),
 space_id text NOT NULL CHECK (space_id ~ '^[a-z0-9][a-z0-9._-]{1,127}$'),
 kind text NOT NULL CHECK (kind ~ '^[a-z][a-z0-9-]{0,63}$'),
 entity_id text NOT NULL CHECK (entity_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (space_id,kind,entity_id),
 UNIQUE (entity_sha256,space_id,kind,entity_id)
);

CREATE TABLE knowledge_revisions (
 revision_sha256 text PRIMARY KEY CHECK (revision_sha256 ~ '^[0-9a-f]{64}$'),
 entity_sha256 text NOT NULL,
 space_id text NOT NULL,
 kind text NOT NULL,
 entity_id text NOT NULL,
 locale text NOT NULL CHECK (locale ~ '^[a-z]{2,3}(-[a-z0-9]{2,8})*$'),
 content_json text NOT NULL CHECK (octet_length(content_json) BETWEEN 2 AND 1048576 AND jsonb_typeof(content_json::jsonb)='object'),
 rights_status text NOT NULL CHECK (rights_status IN ('reuse-not-documented','reference-only','licensed')),
 license_spdx text CHECK (license_spdx IS NULL OR license_spdx ~ '^[A-Za-z0-9.+-]{1,80}$'),
 attribution text NOT NULL CHECK (char_length(attribution) BETWEEN 1 AND 2000),
 source_type text NOT NULL CHECK (source_type ~ '^[a-z][a-z0-9-]{0,63}$'),
 publication_kind text NOT NULL CHECK (publication_kind IN ('repository-seed','community-contribution')),
 publication_record_sha256 text NOT NULL CHECK (publication_record_sha256 ~ '^[0-9a-f]{64}$'),
 publication_record_json text NOT NULL CHECK (octet_length(publication_record_json) BETWEEN 2 AND 131072 AND jsonb_typeof(publication_record_json::jsonb)='object'),
 public_license_sha256 text CHECK (public_license_sha256 IS NULL OR public_license_sha256 ~ '^[0-9a-f]{64}$'),
 public_license_json text CHECK (public_license_json IS NULL OR (octet_length(public_license_json) BETWEEN 2 AND 65536 AND jsonb_typeof(public_license_json::jsonb)='object')),
 author_public_id text NOT NULL CHECK (author_public_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$'),
 author_display_name text NOT NULL CHECK (char_length(author_display_name) BETWEEN 1 AND 160),
 previous_revision_sha256 text,
 requester_public_id text CHECK (requester_public_id IS NULL OR requester_public_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$'),
 requester_display_name text CHECK (requester_display_name IS NULL OR char_length(requester_display_name) BETWEEN 1 AND 160),
 forum_topic_id text CHECK (forum_topic_id IS NULL OR forum_topic_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
 forum_topic_url text CHECK (forum_topic_url IS NULL OR char_length(forum_topic_url) BETWEEN 2 AND 2048),
 decision_id text CHECK (decision_id IS NULL OR decision_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$'),
 approval_method text NOT NULL CHECK (approval_method IN ('repository-review','single','approval','ranked')),
 approval_result text NOT NULL CHECK (approval_result = 'approved'),
 approved_at timestamptz,
 decision_evidence_status text NOT NULL CHECK (decision_evidence_status IN ('legacy-not-recorded','recorded')),
 decision_criterion text CHECK (decision_criterion IS NULL OR decision_criterion IN ('absolute-approval-count','simple-majority','qualified-majority','consensus','ranked-choice-threshold')),
 eligible_voters integer CHECK (eligible_voters IS NULL OR eligible_voters BETWEEN 1 AND 2147483647),
 participants integer CHECK (participants IS NULL OR participants BETWEEN 0 AND 2147483647),
 quorum_required integer CHECK (quorum_required IS NULL OR quorum_required BETWEEN 1 AND 2147483647),
 approval_threshold integer CHECK (approval_threshold IS NULL OR approval_threshold BETWEEN 1 AND 2147483647),
 approved_option text CHECK (approved_option IS NULL OR approved_option ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$'),
 decision_tally_json text CHECK (decision_tally_json IS NULL OR (octet_length(decision_tally_json) BETWEEN 2 AND 65536 AND jsonb_typeof(decision_tally_json::jsonb)='object')),
 decision_tally_sha256 text CHECK (decision_tally_sha256 IS NULL OR decision_tally_sha256 ~ '^[0-9a-f]{64}$'),
 platform_grant_version text CHECK (platform_grant_version IS NULL OR platform_grant_version = 'org.agoranode.contribution-grant.v1'),
 imported_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (entity_sha256,space_id,kind,entity_id) REFERENCES knowledge_entities(entity_sha256,space_id,kind,entity_id),
 CONSTRAINT knowledge_revision_predecessor_same_identity_fk
  FOREIGN KEY (previous_revision_sha256,entity_sha256,space_id,locale)
  REFERENCES knowledge_revisions(revision_sha256,entity_sha256,space_id,locale),
 UNIQUE (revision_sha256,entity_sha256,space_id,locale),
 CHECK (rights_status <> 'licensed' OR license_spdx IS NOT NULL),
 CHECK (rights_status = 'licensed' OR license_spdx IS NULL),
 CHECK (previous_revision_sha256 IS NULL OR previous_revision_sha256 <> revision_sha256),
 CHECK ((public_license_sha256 IS NULL) = (public_license_json IS NULL)),
 CHECK (
  (decision_evidence_status='legacy-not-recorded'
   AND decision_criterion IS NULL AND eligible_voters IS NULL
   AND participants IS NULL AND quorum_required IS NULL
   AND approval_threshold IS NULL AND approved_option IS NULL
   AND decision_tally_json IS NULL AND decision_tally_sha256 IS NULL)
  OR
  (decision_evidence_status='recorded'
   AND decision_criterion IS NOT NULL AND eligible_voters IS NOT NULL
   AND participants IS NOT NULL AND quorum_required IS NOT NULL
   AND approval_threshold IS NOT NULL AND approved_option IS NOT NULL
   AND decision_tally_json IS NOT NULL AND decision_tally_sha256 IS NOT NULL
   AND participants <= eligible_voters AND quorum_required <= eligible_voters
   AND approval_threshold <= eligible_voters AND participants >= quorum_required)
 ),
 CHECK (
  decision_evidence_status='legacy-not-recorded'
  OR (approval_method='single' AND decision_criterion='absolute-approval-count')
  OR (approval_method='ranked' AND decision_criterion='ranked-choice-threshold')
  OR (approval_method='approval' AND decision_criterion IN ('absolute-approval-count','simple-majority','qualified-majority','consensus'))
 ),
 CHECK (
  (publication_kind='repository-seed'
   AND public_license_sha256 IS NULL AND requester_public_id IS NULL
   AND requester_display_name IS NULL AND forum_topic_id IS NULL
   AND forum_topic_url IS NULL AND decision_id IS NULL
   AND platform_grant_version IS NULL AND approval_method='repository-review'
   AND decision_evidence_status='legacy-not-recorded')
  OR
  (publication_kind='community-contribution'
   AND public_license_sha256 IS NOT NULL AND requester_public_id IS NOT NULL
   AND requester_display_name IS NOT NULL AND forum_topic_id IS NOT NULL
   AND forum_topic_url IS NOT NULL AND decision_id IS NOT NULL
   AND platform_grant_version='org.agoranode.contribution-grant.v1'
   AND approval_method IN ('single','approval','ranked') AND approved_at IS NOT NULL
   AND decision_evidence_status='recorded'
   AND rights_status='reuse-not-documented' AND license_spdx IS NULL)
 )
);

CREATE INDEX knowledge_revisions_entity_idx ON knowledge_revisions(space_id,kind,entity_id,locale,imported_at DESC);

CREATE TABLE knowledge_sources (
 source_sha256 text PRIMARY KEY CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
 space_id text NOT NULL CHECK (space_id ~ '^[a-z0-9][a-z0-9._-]{1,127}$'),
 source_type text NOT NULL CHECK (source_type ~ '^[a-z][a-z0-9-]{0,63}$'),
 title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 500),
 url text NOT NULL CHECK (char_length(url) BETWEEN 9 AND 4096 AND url ~ '^https://'),
 rights_status text NOT NULL CHECK (rights_status IN ('reuse-not-documented','reference-only','licensed')),
 license_spdx text CHECK (license_spdx IS NULL OR license_spdx ~ '^[A-Za-z0-9.+-]{1,80}$'),
 attribution text NOT NULL CHECK (char_length(attribution) BETWEEN 1 AND 2000),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (rights_status <> 'licensed' OR license_spdx IS NOT NULL),
 CHECK (rights_status = 'licensed' OR license_spdx IS NULL)
);

CREATE TABLE knowledge_revision_sources (
 link_sha256 text PRIMARY KEY CHECK (link_sha256 ~ '^[0-9a-f]{64}$'),
 revision_sha256 text NOT NULL REFERENCES knowledge_revisions(revision_sha256),
 source_sha256 text NOT NULL REFERENCES knowledge_sources(source_sha256),
 ordinal integer NOT NULL CHECK (ordinal BETWEEN 0 AND 4095),
 UNIQUE (revision_sha256,ordinal),
 UNIQUE (revision_sha256,source_sha256,ordinal)
);

CREATE TABLE knowledge_relations (
 relation_sha256 text PRIMARY KEY CHECK (relation_sha256 ~ '^[0-9a-f]{64}$'),
 revision_sha256 text NOT NULL REFERENCES knowledge_revisions(revision_sha256),
 space_id text NOT NULL CHECK (space_id ~ '^[a-z0-9][a-z0-9._-]{1,127}$'),
 relation_type text NOT NULL CHECK (relation_type ~ '^[a-z][a-z0-9-]{0,63}$'),
 target_entity_sha256 text NOT NULL REFERENCES knowledge_entities(entity_sha256),
 metadata_json text NOT NULL CHECK (octet_length(metadata_json) BETWEEN 2 AND 65536 AND jsonb_typeof(metadata_json::jsonb)='object'),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (revision_sha256,relation_type,target_entity_sha256,relation_sha256)
);

CREATE INDEX knowledge_relations_revision_idx ON knowledge_relations(revision_sha256,relation_type);

CREATE TABLE knowledge_current_revisions (
 space_id text NOT NULL,
 kind text NOT NULL,
 entity_id text NOT NULL,
 locale text NOT NULL,
 entity_sha256 text NOT NULL,
 revision_sha256 text NOT NULL,
 selected_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (space_id,kind,entity_id,locale),
 FOREIGN KEY (entity_sha256,space_id,kind,entity_id) REFERENCES knowledge_entities(entity_sha256,space_id,kind,entity_id),
 FOREIGN KEY (revision_sha256,entity_sha256,space_id,locale) REFERENCES knowledge_revisions(revision_sha256,entity_sha256,space_id,locale)
);

CREATE TABLE knowledge_audit_events (
 sequence bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 space_id text NOT NULL CHECK (space_id ~ '^[a-z0-9][a-z0-9._-]{1,127}$'),
 action text NOT NULL CHECK (action IN ('revision-imported','current-selected')),
 entity_sha256 text NOT NULL CHECK (entity_sha256 ~ '^[0-9a-f]{64}$'),
 locale text NOT NULL CHECK (locale ~ '^[a-z]{2,3}(-[a-z0-9]{2,8})*$'),
 previous_revision_sha256 text CHECK (previous_revision_sha256 IS NULL OR previous_revision_sha256 ~ '^[0-9a-f]{64}$'),
 revision_sha256 text NOT NULL CHECK (revision_sha256 ~ '^[0-9a-f]{64}$'),
 recorded_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (revision_sha256,entity_sha256,space_id,locale) REFERENCES knowledge_revisions(revision_sha256,entity_sha256,space_id,locale),
 FOREIGN KEY (previous_revision_sha256,entity_sha256,space_id,locale) REFERENCES knowledge_revisions(revision_sha256,entity_sha256,space_id,locale),
 UNIQUE (action,revision_sha256)
);

CREATE INDEX knowledge_audit_space_sequence_idx ON knowledge_audit_events(space_id,sequence);

-- Audit is produced by the same SQL statement as the state change. If audit
-- insertion fails, PostgreSQL rolls the revision or pointer change back too.
CREATE FUNCTION record_knowledge_revision_import() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO knowledge_audit_events(
  space_id,action,entity_sha256,locale,previous_revision_sha256,revision_sha256
 ) VALUES(
  NEW.space_id,'revision-imported',NEW.entity_sha256,NEW.locale,
  NEW.previous_revision_sha256,NEW.revision_sha256
 );
 RETURN NEW;
END;
$$;

CREATE TRIGGER knowledge_revision_audit AFTER INSERT ON knowledge_revisions
FOR EACH ROW EXECUTE FUNCTION record_knowledge_revision_import();

CREATE FUNCTION record_knowledge_current_selection() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO knowledge_audit_events(
  space_id,action,entity_sha256,locale,previous_revision_sha256,revision_sha256
 ) VALUES(
  NEW.space_id,'current-selected',NEW.entity_sha256,NEW.locale,
  CASE WHEN TG_OP='UPDATE' THEN OLD.revision_sha256 ELSE NULL END,
  NEW.revision_sha256
 );
 RETURN NEW;
END;
$$;

CREATE TRIGGER knowledge_current_insert_audit AFTER INSERT ON knowledge_current_revisions
FOR EACH ROW EXECUTE FUNCTION record_knowledge_current_selection();
CREATE TRIGGER knowledge_current_update_audit
AFTER UPDATE OF entity_sha256,revision_sha256 ON knowledge_current_revisions
FOR EACH ROW
WHEN (OLD.entity_sha256 IS DISTINCT FROM NEW.entity_sha256 OR OLD.revision_sha256 IS DISTINCT FROM NEW.revision_sha256)
EXECUTE FUNCTION record_knowledge_current_selection();

CREATE FUNCTION reject_knowledge_content_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'knowledge content is append-only; insert a new content-addressed object instead';
END;
$$;

CREATE TRIGGER knowledge_entities_append_only BEFORE UPDATE OR DELETE ON knowledge_entities
FOR EACH ROW EXECUTE FUNCTION reject_knowledge_content_mutation();
CREATE TRIGGER knowledge_revisions_append_only BEFORE UPDATE OR DELETE ON knowledge_revisions
FOR EACH ROW EXECUTE FUNCTION reject_knowledge_content_mutation();
CREATE TRIGGER knowledge_sources_append_only BEFORE UPDATE OR DELETE ON knowledge_sources
FOR EACH ROW EXECUTE FUNCTION reject_knowledge_content_mutation();
CREATE TRIGGER knowledge_revision_sources_append_only BEFORE UPDATE OR DELETE ON knowledge_revision_sources
FOR EACH ROW EXECUTE FUNCTION reject_knowledge_content_mutation();
CREATE TRIGGER knowledge_relations_append_only BEFORE UPDATE OR DELETE ON knowledge_relations
FOR EACH ROW EXECUTE FUNCTION reject_knowledge_content_mutation();
CREATE TRIGGER knowledge_audit_append_only BEFORE UPDATE OR DELETE ON knowledge_audit_events
FOR EACH ROW EXECUTE FUNCTION reject_knowledge_content_mutation();

CREATE FUNCTION reject_knowledge_pointer_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'knowledge current pointers cannot be deleted; select another revision instead';
END;
$$;

CREATE TRIGGER knowledge_current_no_delete BEFORE DELETE ON knowledge_current_revisions
FOR EACH ROW EXECUTE FUNCTION reject_knowledge_pointer_delete();
