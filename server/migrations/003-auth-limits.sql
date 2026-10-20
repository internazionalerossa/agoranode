-- Short-lived security counters contain hashes, never passwords or email text.
CREATE TABLE auth_request_limits(bucket text PRIMARY KEY,window_start bigint NOT NULL,attempts integer NOT NULL);
CREATE INDEX auth_limit_expiry_idx ON auth_request_limits(window_start);
