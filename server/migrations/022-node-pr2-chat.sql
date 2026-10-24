-- PR2-only short-form chat. Every node has its own PostgreSQL database.
-- Application messages carry no personal account identifiers in public payloads.
CREATE TABLE node_chat_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 space_id text NOT NULL CHECK(space_id ~ '^[a-z][a-z0-9-]{2,47}$'),
 author_id text NOT NULL CHECK(char_length(author_id) BETWEEN 1 AND 200),
 alias text NOT NULL CHECK(char_length(alias) BETWEEN 2 AND 60),
 body text NOT NULL CHECK(char_length(body) BETWEEN 1 AND 1500),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);
CREATE INDEX node_chat_recent ON node_chat_messages(space_id,created_at DESC,id DESC);
CREATE INDEX node_chat_rate ON node_chat_messages(space_id,author_id,created_at DESC);
