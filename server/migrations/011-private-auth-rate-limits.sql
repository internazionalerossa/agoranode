-- Better Auth now uses auth_request_limits with HMAC-pseudonymized keys.
-- This obsolete table may contain raw IP/path keys from earlier releases.
DROP TABLE IF EXISTS "rateLimit";
