ALTER TABLE forum_members ADD COLUMN identity_provider TEXT;
ALTER TABLE forum_members ADD COLUMN identity_subject TEXT;
CREATE UNIQUE INDEX forum_member_social_unique ON forum_members(identity_provider,identity_subject) WHERE identity_provider IS NOT NULL;
