-- Initial setup for the existing, empty Supabase public schema.
-- Generated from server/migrations and Better Auth 1.7.11; no users or secrets.
-- Run once. Existing application tables make the transaction fail without replacement.
BEGIN;
SET LOCAL search_path = public, pg_catalog;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;
CREATE TABLE app_migrations (name text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now());

-- 001-schema.sql
-- PostgreSQL schema for the independent Node runtime. Applied transactionally.
CREATE TABLE "bookmarks" (
	"owner_id" text NOT NULL,
	"kind" text NOT NULL,
	"item_key" text NOT NULL,
	"payload" text NOT NULL,
	"deleted" bigint DEFAULT 0 NOT NULL,
	"updated_at" bigint NOT NULL,
	PRIMARY KEY("owner_id", "kind", "item_key")
);

CREATE INDEX "bookmarks_owner_updated_idx" ON "bookmarks" ("owner_id","updated_at");
CREATE TABLE "public_news_cache" (
	"cache_key" text PRIMARY KEY NOT NULL,
	"body" text NOT NULL,
	"headers" text NOT NULL,
	"expires_at" bigint NOT NULL
);

CREATE TABLE "reading_progress" (
	"owner_id" text NOT NULL,
	"book_id" text NOT NULL,
	"edition" text NOT NULL,
	"chapter" bigint NOT NULL,
	"page" bigint NOT NULL,
	"scroll" bigint DEFAULT 0 NOT NULL,
	"revision" text NOT NULL,
	"updated_at" bigint NOT NULL,
	PRIMARY KEY("owner_id", "book_id", "edition")
);

CREATE TABLE "community_proposals" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_key" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"references_text" text DEFAULT '' NOT NULL,
	"category" text NOT NULL,
	"language" text NOT NULL,
	"created_at" bigint NOT NULL,
	"withdrawn" bigint DEFAULT 0 NOT NULL
);

CREATE INDEX "community_created_idx" ON "community_proposals" ("created_at");
CREATE INDEX "community_owner_created_idx" ON "community_proposals" ("owner_key","created_at");
CREATE TABLE "community_votes" (
	"proposal_id" text NOT NULL,
	"voter_key" text NOT NULL,
	"value" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	PRIMARY KEY("proposal_id", "voter_key")
);

CREATE TABLE "forum_admission_electorate" (
	"candidate_id" text NOT NULL,
	"member_id" text NOT NULL,
	PRIMARY KEY("candidate_id", "member_id")
);

CREATE TABLE "forum_admission_votes" (
	"candidate_id" text NOT NULL,
	"member_id" text NOT NULL,
	"value" bigint NOT NULL,
	"identity_checked" bigint DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	PRIMARY KEY("candidate_id", "member_id")
);

CREATE TABLE "forum_ballots" (
	"topic_id" text NOT NULL,
	"member_id" text NOT NULL,
	"choices_json" text NOT NULL,
	"receipt" text NOT NULL,
	"updated_at" bigint NOT NULL,
	PRIMARY KEY("topic_id", "member_id")
);

CREATE TABLE "forum_bootstrap" (
	"id" bigint PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"created_at" bigint NOT NULL
);

CREATE TABLE "forum_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"topic_id" text NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"language" text NOT NULL,
	"created_at" bigint NOT NULL,
	"deleted" bigint DEFAULT 0 NOT NULL
);

CREATE INDEX "forum_comment_topic_idx" ON "forum_comments" ("topic_id","created_at");
CREATE INDEX "forum_comment_author_idx" ON "forum_comments" ("author_id","created_at");
CREATE TABLE "forum_electorate" (
	"topic_id" text NOT NULL,
	"member_id" text NOT NULL,
	PRIMARY KEY("topic_id", "member_id")
);

CREATE TABLE "forum_events" (
	"sequence" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"entity_id" text NOT NULL,
	"detail" text NOT NULL,
	"created_at" bigint NOT NULL
);

CREATE INDEX "forum_event_entity_idx" ON "forum_events" ("entity_id","sequence");
CREATE TABLE "forum_members" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_key" text NOT NULL,
	"alias" text NOT NULL,
	"alias_key" text NOT NULL,
	"intro" text NOT NULL,
	"identity_name" text NOT NULL,
	"identity_kind" text NOT NULL,
	"identity_url" text NOT NULL,
	"language" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" bigint NOT NULL,
	"deadline" bigint NOT NULL,
	"admitted_at" bigint
);

CREATE UNIQUE INDEX "forum_members_owner_key_unique" ON "forum_members" ("owner_key");
CREATE UNIQUE INDEX "forum_members_alias_key_unique" ON "forum_members" ("alias_key");
CREATE INDEX "forum_member_status_idx" ON "forum_members" ("status","created_at");
CREATE TABLE "forum_topics" (
	"id" text PRIMARY KEY NOT NULL,
	"author_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"references_text" text DEFAULT '' NOT NULL,
	"category" text NOT NULL,
	"language" text NOT NULL,
	"options_json" text NOT NULL,
	"method" text NOT NULL,
	"quorum" bigint NOT NULL,
	"created_at" bigint NOT NULL,
	"starts_at" bigint NOT NULL,
	"ends_at" bigint NOT NULL,
	"withdrawn" bigint DEFAULT 0 NOT NULL,
	"sealed" bigint DEFAULT 0 NOT NULL
);

CREATE INDEX "forum_topic_created_idx" ON "forum_topics" ("created_at");
CREATE INDEX "forum_topic_author_idx" ON "forum_topics" ("author_id","created_at");

INSERT INTO app_migrations(name,sha256) VALUES('001-schema.sql','8c14d3ac322e93876172ec3234ae34e00fbd949cbd8b69f371c5ee88eae5a49f');

-- 002-forum-integrity.sql
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

INSERT INTO app_migrations(name,sha256) VALUES('002-forum-integrity.sql','71a61385887f0507b602328fd960e42cbbb6c2722ca990656cb6878ca5b93cdc');

-- 003-auth-limits.sql
-- Short-lived security counters contain hashes, never passwords or email text.
CREATE TABLE auth_request_limits(bucket text PRIMARY KEY,window_start bigint NOT NULL,attempts integer NOT NULL);
CREATE INDEX auth_limit_expiry_idx ON auth_request_limits(window_start);

INSERT INTO app_migrations(name,sha256) VALUES('003-auth-limits.sql','5e2938aa7220ae4adc2faa3383ad55c675b47d0ae9abe88b0db7b2711dde7df7');

-- 004-open-electorate.sql
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

INSERT INTO app_migrations(name,sha256) VALUES('004-open-electorate.sql','98bad5739c9778f2a02f014a8a2657849c4ddb5198d388cada676d6eab038f43');

-- 005-topic-visibility.sql
-- Public reading is the default; privacy applies only to free discussions.
ALTER TABLE forum_topics ADD COLUMN private INTEGER NOT NULL DEFAULT 0
 CHECK (private IN (0,1) AND (private=0 OR options_json='[]'));
CREATE INDEX forum_topics_public_recent ON forum_topics(created_at DESC,id) WHERE private=0 AND withdrawn=0;
-- protect_forum_rules compares the complete row and also seals visibility.

INSERT INTO app_migrations(name,sha256) VALUES('005-topic-visibility.sql','8863dc4ec0053d5fb983fe4b9b924d7c0ff75cc74d1deba496b18e76521ed667');

-- 006-three-founders.sql
-- One distinct recipient per initial invitation; ordinary admissions require three endorsements.
CREATE UNIQUE INDEX forum_bootstrap_recipient ON forum_bootstrap(member_id);
ALTER TABLE forum_bootstrap ADD CONSTRAINT forum_bootstrap_slots CHECK (id BETWEEN 1 AND 3);

INSERT INTO app_migrations(name,sha256) VALUES('006-three-founders.sql','c39601ddcdf9bdf49589435c181fc79d76c072cea48800eb47a460dc0ba0fc3f');

-- 007-social-identity.sql
ALTER TABLE forum_members ADD COLUMN identity_provider TEXT;
ALTER TABLE forum_members ADD COLUMN identity_subject TEXT;
CREATE UNIQUE INDEX forum_member_social_unique ON forum_members(identity_provider,identity_subject) WHERE identity_provider IS NOT NULL;

INSERT INTO app_migrations(name,sha256) VALUES('007-social-identity.sql','db5a9414497b4819c7c08f02accdf93f429da8e0dc17d74cc209494da18447e6');

-- Better Auth account, verification, session and rate-limit tables.
create table "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table "session" ("id" text not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade);

create table "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null);

create table "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table "rateLimit" ("id" text not null primary key, "key" text not null unique, "count" integer not null, "lastRequest" bigint not null);

create index "session_userId_idx" on "session" ("userId");

create index "account_userId_idx" on "account" ("userId");

create index "verification_identifier_idx" on "verification" ("identifier");
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated, service_role;
DO $$ DECLARE item record; BEGIN
 FOR item IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', item.tablename);
 END LOOP;
 FOR item IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prorettype='trigger'::regtype LOOP
  EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_catalog', item.signature);
 END LOOP;
END $$;
COMMIT;
