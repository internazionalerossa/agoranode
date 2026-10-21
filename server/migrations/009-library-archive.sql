-- Licensed public books are stored as immutable parsed revisions. Personal
-- reading progress remains in reading_progress and is never copied here.
CREATE TABLE library_editions (
 book_id text NOT NULL CHECK (book_id ~ '^[a-z0-9][a-z0-9-]{0,127}$'),
 language text NOT NULL CHECK (language ~ '^[a-z][a-z0-9-]{0,15}$'),
 title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 500),
 source_name text NOT NULL CHECK (char_length(source_name) BETWEEN 1 AND 300),
 catalog_url text NOT NULL CHECK (catalog_url ~ '^https://'),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (book_id,language)
);

CREATE TABLE library_revisions (
 revision_sha256 text PRIMARY KEY CHECK (revision_sha256 ~ '^[0-9a-f]{64}$'),
 book_id text NOT NULL,
 language text NOT NULL,
 source_url text NOT NULL CHECK (source_url ~ '^https://'),
 parser_version integer NOT NULL CHECK (parser_version > 0),
 license_spdx text NOT NULL CHECK (license_spdx ~ '^[A-Za-z0-9.+-]{1,80}$'),
 license_url text NOT NULL CHECK (license_url ~ '^https://'),
 rights_statement_url text NOT NULL CHECK (rights_statement_url ~ '^https://'),
 rights_reviewed_at date NOT NULL,
 attribution text NOT NULL CHECK (char_length(attribution) BETWEEN 1 AND 2000),
 imported_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (book_id,language) REFERENCES library_editions(book_id,language),
 UNIQUE (book_id,language,revision_sha256)
);

CREATE TABLE library_chapters (
 revision_sha256 text NOT NULL REFERENCES library_revisions(revision_sha256) ON DELETE CASCADE,
 chapter_index integer NOT NULL CHECK (chapter_index BETWEEN 0 AND 255),
 title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 500),
 source_url text NOT NULL CHECK (source_url ~ '^https://'),
 content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
 pages_json text NOT NULL CHECK (octet_length(pages_json) BETWEEN 2 AND 8388608 AND jsonb_typeof(pages_json::jsonb)='array'),
 PRIMARY KEY (revision_sha256,chapter_index)
);

CREATE TABLE library_current_revisions (
 book_id text NOT NULL,
 language text NOT NULL,
 revision_sha256 text NOT NULL,
 selected_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (book_id,language),
 FOREIGN KEY (book_id,language) REFERENCES library_editions(book_id,language),
 FOREIGN KEY (book_id,language,revision_sha256) REFERENCES library_revisions(book_id,language,revision_sha256)
);

CREATE INDEX library_revisions_edition_idx ON library_revisions(book_id,language,imported_at DESC);

CREATE FUNCTION reject_library_archive_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 RAISE EXCEPTION 'library archive rows are immutable; insert a new revision instead';
END;
$$;

CREATE TRIGGER library_editions_immutable BEFORE UPDATE ON library_editions
FOR EACH ROW EXECUTE FUNCTION reject_library_archive_update();
CREATE TRIGGER library_revisions_immutable BEFORE UPDATE ON library_revisions
FOR EACH ROW EXECUTE FUNCTION reject_library_archive_update();
CREATE TRIGGER library_chapters_immutable BEFORE UPDATE ON library_chapters
FOR EACH ROW EXECUTE FUNCTION reject_library_archive_update();
