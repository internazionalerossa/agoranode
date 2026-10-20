-- New members join every proposal that has not reached its deadline.
-- Existing voting rules and existing electorate entries remain immutable.
CREATE OR REPLACE FUNCTION protect_electorate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM forum_topics t JOIN forum_members m ON m.id=NEW.member_id
   WHERE t.id=NEW.topic_id AND t.withdrawn=0 AND t.options_json<>'[]'
   AND m.status='active' AND m.admitted_at<t.ends_at) THEN
   RAISE EXCEPTION 'Electorate is sealed for this member';
 END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION audit_electorate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO forum_events(kind,entity_id,detail,created_at)
 SELECT 'electorate-added',NEW.topic_id,json_build_object('member',m.id,'admittedAt',m.admitted_at)::text,m.admitted_at
 FROM forum_members m WHERE m.id=NEW.member_id;
 RETURN NEW;
END $$;
CREATE TRIGGER forum_electorate_audit AFTER INSERT ON forum_electorate FOR EACH ROW EXECUTE FUNCTION audit_electorate();
