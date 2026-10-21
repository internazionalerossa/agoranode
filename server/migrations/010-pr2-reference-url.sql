-- Nullable for applications created before this migration. New applications
-- require a validated HTTPS reference in the API before insertion.
ALTER TABLE forum_members ADD COLUMN reference_url text;
ALTER TABLE forum_members ADD CONSTRAINT forum_member_reference_format CHECK (reference_url IS NULL OR (char_length(reference_url) <= 500 AND reference_url ~ '^https://'));
