CREATE UNIQUE INDEX forum_ballot_receipt_unique ON forum_ballots(topic_id,receipt);
CREATE FUNCTION reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Immutable record'; END $$;
CREATE TRIGGER forum_event_no_update BEFORE UPDATE OR DELETE ON forum_events FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER forum_electorate_no_update BEFORE UPDATE OR DELETE ON forum_electorate FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE FUNCTION protect_forum_rules() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (to_jsonb(NEW)-'withdrawn'-'sealed') IS DISTINCT FROM (to_jsonb(OLD)-'withdrawn'-'sealed') OR NEW.sealed<OLD.sealed THEN
  RAISE EXCEPTION 'Voting rules are immutable';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER forum_rules_immutable BEFORE UPDATE ON forum_topics FOR EACH ROW EXECUTE FUNCTION protect_forum_rules();
CREATE FUNCTION protect_electorate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM forum_topics WHERE id=NEW.topic_id AND sealed=1) THEN RAISE EXCEPTION 'Electorate is sealed'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER forum_electorate_sealed BEFORE INSERT ON forum_electorate FOR EACH ROW EXECUTE FUNCTION protect_electorate();
CREATE FUNCTION forum_audit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE event_kind text; entity text; detail json; stamp bigint;
BEGIN
 stamp=(extract(epoch FROM clock_timestamp())*1000)::bigint;
 IF TG_TABLE_NAME='forum_members' THEN
  entity=NEW.id;
  IF TG_OP='INSERT' THEN event_kind='application';detail='{}';stamp=NEW.created_at;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN event_kind='membership';detail=json_build_object('from',OLD.status,'to',NEW.status);
  ELSE RETURN NEW; END IF;
 ELSIF TG_TABLE_NAME='forum_admission_votes' THEN
  event_kind='admission-vote';entity=NEW.candidate_id;stamp=NEW.created_at;
  detail=json_build_object('member',NEW.member_id,'value',NEW.value,'identityChecked',NEW.identity_checked);
 ELSIF TG_TABLE_NAME='forum_topics' THEN
  event_kind='topic';entity=NEW.id;stamp=NEW.created_at;
  detail=json_build_object('method',NEW.method,'quorum',NEW.quorum,'startsAt',NEW.starts_at,'endsAt',NEW.ends_at,'options',NEW.options_json::json);
 ELSIF TG_OP='INSERT' THEN
  event_kind='ballot-cast';entity=NEW.topic_id;stamp=NEW.updated_at;detail=json_build_object('receipt',NEW.receipt);
 ELSIF TG_OP='DELETE' THEN
  event_kind='ballot-revoked';entity=OLD.topic_id;detail=json_build_object('receipt',OLD.receipt);
 ELSIF NEW.receipt IS DISTINCT FROM OLD.receipt OR NEW.choices_json IS DISTINCT FROM OLD.choices_json THEN
  event_kind='ballot-replaced';entity=NEW.topic_id;stamp=NEW.updated_at;detail=json_build_object('previousReceipt',OLD.receipt,'receipt',NEW.receipt);
 ELSE RETURN NEW;
 END IF;
 INSERT INTO forum_events(kind,entity_id,detail,created_at) VALUES(event_kind,entity,detail::text,stamp);
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER forum_member_audit AFTER INSERT OR UPDATE ON forum_members FOR EACH ROW EXECUTE FUNCTION forum_audit();
CREATE TRIGGER forum_admission_audit AFTER INSERT ON forum_admission_votes FOR EACH ROW EXECUTE FUNCTION forum_audit();
CREATE TRIGGER forum_topic_audit AFTER INSERT ON forum_topics FOR EACH ROW EXECUTE FUNCTION forum_audit();
CREATE TRIGGER forum_ballot_audit AFTER INSERT OR UPDATE OR DELETE ON forum_ballots FOR EACH ROW EXECUTE FUNCTION forum_audit();
