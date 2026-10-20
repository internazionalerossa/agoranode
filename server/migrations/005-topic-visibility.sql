-- Public reading is the default; privacy applies only to free discussions.
ALTER TABLE forum_topics ADD COLUMN private INTEGER NOT NULL DEFAULT 0
 CHECK (private IN (0,1) AND (private=0 OR options_json='[]'));
CREATE INDEX forum_topics_public_recent ON forum_topics(created_at DESC,id) WHERE private=0 AND withdrawn=0;
-- protect_forum_rules compares the complete row and also seals visibility.
