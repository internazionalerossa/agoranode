-- Agorà alpha discussion board. NOT an electorate or PR2 vote ledger.
-- Private author IDs are never returned by the public list endpoint.
CREATE TABLE IF NOT EXISTS agora_forum_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id text NOT NULL DEFAULT 'agora' CHECK (space_id = 'agora'),
  author_id text NOT NULL CHECK (char_length(author_id) BETWEEN 1 AND 200),
  author_alias text NOT NULL CHECK (char_length(author_alias) BETWEEN 2 AND 60),
  title text NOT NULL CHECK (char_length(title) BETWEEN 8 AND 150),
  body text NOT NULL CHECK (char_length(body) BETWEEN 40 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agora_forum_recents_idx ON agora_forum_topics(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS agora_forum_author_recents_idx ON agora_forum_topics(author_id,created_at DESC);
