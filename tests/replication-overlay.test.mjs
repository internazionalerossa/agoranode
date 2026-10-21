import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("optional Syncthing transport is pinned, loopback-administered and public-only", async () => {
  const compose = await readFile(
    new URL("../deploy/replication/compose.syncthing.yaml", import.meta.url),
    "utf8",
  );
  assert.match(compose, /image: syncthing\/syncthing:2\.1\.5/);
  assert.match(compose, /127\.0\.0\.1:\$\{SYNCTHING_GUI_PORT:-8384\}:8384/);
  assert.match(compose, /\.selfhost\/public-replication\/exchange:\/var\/syncthing\/AgoràNode/);
  assert.match(compose, /syncthing-public-config:\/var\/syncthing\/config/);
  assert.doesNotMatch(compose, /(?:^|:)22000(?::|\b)|(?:^|:)21027(?::|\b)/m);
  assert.doesNotMatch(
    compose,
    /runtime\.env|backups|postgres|database:|age-key|snapshot-private|EDGE_SHARED_SECRET|SMTP_PASSWORD/,
  );
});
