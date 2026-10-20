#!/usr/bin/env bash
set -euo pipefail
umask 077
if ! grep -q '^age1' /recipients.txt; then
  echo 'Add the custodians public age recipients to .selfhost/recipients.txt first.' >&2
  exit 1
fi
name="polisrossa-$(date -u +%Y%m%dT%H%M%SZ)-${RANDOM}.dump.age"
temporary="/backups/${name}.partial"
trap 'rm -f "$temporary"' EXIT
# The plaintext database flows through a pipe, never a temporary dump file.
pg_dump --format=custom --no-owner --no-acl | age --encrypt -R /recipients.txt -o "$temporary"
mv "$temporary" "/backups/$name"
trap - EXIT
printf 'Encrypted backup ready: %s\n' "$name"
