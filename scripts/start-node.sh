#!/bin/sh
set -eu

node build-node/migrate.mjs
exec node build-node/server.mjs
