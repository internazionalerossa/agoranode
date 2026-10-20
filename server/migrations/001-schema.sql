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
