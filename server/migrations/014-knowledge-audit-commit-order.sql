-- Public knowledge audit events are consumed with a strictly increasing
-- cursor. PostgreSQL identities are allocated before commit, so concurrent
-- transactions can otherwise commit out of sequence and hide an older event
-- from an incremental consumer forever.
--
-- Lock taken WITHIN the same transaction before the INSERT allocates an
-- identity. Next writer may allocate only after the predecessor commits or
-- rolls back. Existing receipts are untouched; new cursors can safely start
-- from a full replay after migration. The lock is knowledge-write-only;
-- ordinary forum/chat updates are unaffected.
CREATE OR REPLACE FUNCTION record_knowledge_revision_import() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 -- Serialize commit order before allocating the public audit sequence.
 PERFORM pg_advisory_xact_lock(194733,3);
 INSERT INTO knowledge_audit_events(
  space_id,action,entity_sha256,locale,previous_revision_sha256,revision_sha256
 ) VALUES(
  NEW.space_id,'revision-imported',NEW.entity_sha256,NEW.locale,
  NEW.previous_revision_sha256,NEW.revision_sha256
 );
 RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION record_knowledge_current_selection() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 -- Serialize commit order before allocating the public audit sequence.
 PERFORM pg_advisory_xact_lock(194733,3);
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
