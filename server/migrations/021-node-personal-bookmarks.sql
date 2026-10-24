-- Personal PR1 article saves, stored only in the database of the node.
-- Account records are not public knowledge and never participate in PR2 votes.
CREATE TABLE node_personal_article_bookmarks (
 space_id text NOT NULL CHECK (space_id ~ '^[a-z][a-z0-9-]{2,47}$'),
 owner_key text NOT NULL CHECK (char_length(owner_key) BETWEEN 1 AND 200),
 article_id text NOT NULL CHECK (char_length(article_id) BETWEEN 1 AND 256),
 source_id text NOT NULL CHECK (char_length(source_id) BETWEEN 1 AND 128),
 title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
 link text NOT NULL CHECK (char_length(link) BETWEEN 1 AND 1200),
 excerpt text NOT NULL DEFAULT '' CHECK (char_length(excerpt) <= 600),
 saved_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(space_id,owner_key,article_id)
);
CREATE INDEX node_personal_bookmarks_by_owner
 ON node_personal_article_bookmarks(space_id,owner_key,saved_at DESC);
