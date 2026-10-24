-- Every thematic node stores its own public conversations, independent of
-- PolisRossa and of binding editorial PR2 ballots.
CREATE TABLE node_forum_topics (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 space_id text NOT NULL CHECK(space_id ~ '^[a-z][a-z0-9-]{2,47}$'),
 author_id text NOT NULL CHECK(char_length(author_id) BETWEEN 1 AND 200),
 author_alias text NOT NULL CHECK(char_length(author_alias) BETWEEN 2 AND 60),
 title text NOT NULL CHECK(char_length(title) BETWEEN 8 AND 160),
 body text NOT NULL CHECK(char_length(body) BETWEEN 30 AND 5000),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX node_forum_topics_recent ON node_forum_topics(space_id,created_at DESC,id DESC);
CREATE INDEX node_forum_topics_author ON node_forum_topics(author_id,created_at DESC);
CREATE TABLE node_forum_comments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 topic_id uuid NOT NULL REFERENCES node_forum_topics(id),
 author_id text NOT NULL CHECK(char_length(author_id) BETWEEN 1 AND 200),
 author_alias text NOT NULL CHECK(char_length(author_alias) BETWEEN 2 AND 60),
 body text NOT NULL CHECK(char_length(body) BETWEEN 5 AND 3000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX node_forum_comments_recent ON node_forum_comments(topic_id,created_at,id);
CREATE INDEX node_forum_comments_author ON node_forum_comments(author_id,created_at DESC);
