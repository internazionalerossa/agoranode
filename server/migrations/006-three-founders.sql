-- One distinct recipient per initial invitation; ordinary admissions require three endorsements.
CREATE UNIQUE INDEX forum_bootstrap_recipient ON forum_bootstrap(member_id);
ALTER TABLE forum_bootstrap ADD CONSTRAINT forum_bootstrap_slots CHECK (id BETWEEN 1 AND 3);
