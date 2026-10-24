-- Scoped issue tracker. Advisory issue votes are NOT binding PR2/PR3 governance.
CREATE TABLE agora_internal_issues (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 scope text NOT NULL CHECK(scope IN ('agora','agoranode')),
 author_id text NOT NULL,
 title text NOT NULL CHECK(char_length(title) BETWEEN 8 AND 160),
 body text NOT NULL CHECK(char_length(body) BETWEEN 20 AND 8000),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agora_internal_issues_scope_created ON agora_internal_issues(scope,created_at DESC,id DESC);
CREATE TABLE agora_internal_issue_comments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 issue_id uuid NOT NULL REFERENCES agora_internal_issues(id),
 author_id text NOT NULL,
 body text NOT NULL CHECK(char_length(body) BETWEEN 5 AND 4000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agora_issue_comments_created ON agora_internal_issue_comments(issue_id,created_at,id);
CREATE TABLE agora_internal_issue_votes (
 issue_id uuid NOT NULL REFERENCES agora_internal_issues(id),
 voter_id text NOT NULL,
 choice text NOT NULL CHECK(choice IN ('yes','no','abstain')),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(issue_id,voter_id)
);
