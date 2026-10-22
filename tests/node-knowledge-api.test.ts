import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  AGORANODE_MINIMUM_GRANT_SHA256,
  AGORANODE_MINIMUM_GRANT_VERSION,
  CONTRIBUTION_PUBLICATION_FORMAT,
  DEMOCRATIC_DECISION_EVIDENCE_FORMAT,
  DEMOCRATIC_REVISION_PROVENANCE_FORMAT,
  democraticDecisionTallySha256,
  type ContributionPublicationRecord,
} from "../app/lib/contribution-rights";
import { PUBLIC_KNOWLEDGE_HISTORY_FORMAT } from "../app/lib/public-knowledge";
import { api } from "../server/api";
import { PostgresDatabase, type Connections } from "../server/database";
import {
  importPolisrossaKnowledge,
  polisrossaKnowledgeSeed,
} from "../server/knowledge-import";
import {
  importKnowledgeRevisions,
  readKnowledgeEntity,
} from "../server/knowledge";

async function fixture(withPrivateData = false) {
  const pg = new PGlite();
  if (withPrivateData) {
    await pg.exec(
      await readFile(
        new URL("../server/migrations/001-schema.sql", import.meta.url),
        "utf8",
      ),
    );
  }
  await pg.exec(
    await readFile(
      new URL("../server/migrations/012-knowledge-store.sql", import.meta.url),
      "utf8",
    ),
  );
  const query = async (sql: string, values: unknown[] = []) => {
    const result = await pg.query(sql, values);
    return {
      rows: result.rows as Record<string, unknown>[],
      rowCount: result.affectedRows,
    };
  };
  const connection = { query };
  const pool = {
    ...connection,
    connect: async () => connection,
  } satisfies Connections;
  return { pg, pool, db: new PostgresDatabase(pool) };
}

async function publication(
  previousRevisionSha256: string,
): Promise<ContributionPublicationRecord> {
  const topic = "123e4567-e89b-42d3-a456-426614174000";
  const tally = { approve: 3, reject: 1 };
  return {
    format: CONTRIBUTION_PUBLICATION_FORMAT,
    scope: "submitted-contribution-only",
    publicLicense: { id: "CC-BY-ND-4.0" },
    grantConsent: {
      version: AGORANODE_MINIMUM_GRANT_VERSION,
      statementSha256: AGORANODE_MINIMUM_GRANT_SHA256,
      accepted: true,
      acceptedAt: "2026-10-21T12:00:00.000Z",
      acceptedByPublicId: "autrice-pubblica",
    },
    provenance: {
      format: DEMOCRATIC_REVISION_PROVENANCE_FORMAT,
      author: {
        publicId: "autrice-pubblica",
        displayName: "Autrice pubblica",
      },
      request: {
        forumTopicId: topic,
        forumTopicUrl: `/polisrossa?view=partecipa&proposal=${topic}`,
        requestedBy: {
          publicId: "proponente-pubblico",
          displayName: "Proponente pubblico",
        },
      },
      decision: {
        id: "decisione-pubblica-1",
        method: "approval",
        result: "approved",
        decidedAt: "2026-10-21T12:30:00.000Z",
        evidence: {
          format: DEMOCRATIC_DECISION_EVIDENCE_FORMAT,
          status: "recorded",
          criterion: "absolute-approval-count",
          eligibleVoters: 5,
          participants: 4,
          quorumRequired: 3,
          approvalThreshold: 3,
          approvedOption: "approve",
          tally,
          tallySha256: await democraticDecisionTallySha256(tally),
        },
      },
      previousRevisionSha256,
    },
  };
}

async function request(db: PostgresDatabase, path: string, method = "GET") {
  return api(
    new Request(`https://example.test${path}`, { method }),
    db,
    null,
    undefined,
    () => {},
    false,
  );
}

test("the public entity endpoint returns the current content and complete approved history without private data", async () => {
  const { pg, pool, db } = await fixture(true);
  try {
    const privateSecret = "private-owner-knowledge@example.test";
    await pg.query(
      `INSERT INTO bookmarks(owner_id,kind,item_key,payload,deleted,updated_at)
       VALUES($1,'book','private-item','private-token-value',0,1)`,
      [privateSecret],
    );
    await importPolisrossaKnowledge(pool);
    const seed = polisrossaKnowledgeSeed().find(
      (entry) => entry.identity.kind === "event" && entry.identity.id === "haymarket-1886",
    );
    assert.ok(seed);
    const before = await readKnowledgeEntity(pool, seed.identity);
    assert.ok(before);
    await importKnowledgeRevisions(pool, [
      {
        ...seed,
        sourceType: "community-contribution",
        content: { ...seed.content, publicChange: "correzione approvata" },
        publicationRecord: await publication(before.revisionSha256),
      },
    ]);

    const response = await request(
      db,
      "/api/knowledge/entity?kind=event&id=haymarket-1886&locale=it",
    );
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control") ?? "", /^public,/);
    const text = await response.text();
    const body = JSON.parse(text);
    assert.equal(body.format, PUBLIC_KNOWLEDGE_HISTORY_FORMAT);
    assert.deepEqual(body.current.identity, {
      spaceId: "polisrossa",
      kind: "event",
      id: "haymarket-1886",
      locale: "it",
    });
    assert.equal(body.current.content.publicChange, "correzione approvata");
    assert.equal(body.revisions.length, 2);
    assert.equal(body.revisions[0].current, true);
    assert.deepEqual(body.revisions[0].author, {
      publicId: "autrice-pubblica",
      displayName: "Autrice pubblica",
    });
    assert.deepEqual(body.revisions[0].publicLicense, { id: "CC-BY-ND-4.0" });
    assert.equal(body.revisions[0].previousRevisionSha256, before.revisionSha256);
    assert.equal(body.revisions[0].request.requestedBy.displayName, "Proponente pubblico");
    assert.equal(body.revisions[0].decision.method, "approval");
    assert.equal(body.revisions[0].decision.result, "approved");
    assert.equal(body.revisions[1].publicLicense, null);
    assert.equal(body.revisions[1].rights.status, "reuse-not-documented");
    assert.equal(body.revisions[1].request, null);
    for (const forbidden of [
      privateSecret,
      "private-item",
      "private-token-value",
      "owner_id",
      "email",
      "session",
    ]) {
      assert.equal(text.includes(forbidden), false, forbidden);
    }

    const previousResponse = await request(
      db,
      `/api/knowledge/revision?kind=event&id=haymarket-1886&locale=it&revision=${before.revisionSha256}`,
    );
    assert.equal(previousResponse.status, 200);
    const previous = await previousResponse.json();
    assert.equal(previous.entity.revisionSha256, before.revisionSha256);
    assert.equal(previous.revision.current, false);
    assert.equal(previous.revision.publicationKind, "repository-seed");
    assert.equal(previous.entity.content.publicChange, undefined);
  } finally {
    await pg.close();
  }
});

test("knowledge endpoints reject unsupported methods and malformed or empty lookups before querying arbitrary identities", async () => {
  const { pg, pool, db } = await fixture();
  try {
    await importPolisrossaKnowledge(pool);
    const invalid = [
      "/api/knowledge/entity?kind=event&id=haymarket-1886",
      "/api/knowledge/entity?kind=Article&id=haymarket-1886&locale=it",
      "/api/knowledge/entity?kind=bad_kind&id=haymarket-1886&locale=it",
      "/api/knowledge/entity?kind=event&id=bad%2Fid&locale=it",
      "/api/knowledge/entity?kind=event&id=haymarket-1886&locale=en",
      "/api/knowledge/entity?kind=event&id=haymarket-1886&locale=it&extra=1",
      "/api/knowledge/entity?kind=event&kind=person&id=haymarket-1886&locale=it",
      "/api/knowledge/revision?kind=event&id=haymarket-1886&locale=it&revision=not-a-hash",
    ];
    for (const path of invalid) {
      assert.equal((await request(db, path)).status, 400, path);
    }
    assert.equal(
      (
        await request(
          db,
          "/api/knowledge/entity?kind=event&id=evento-inesistente&locale=it",
        )
      ).status,
      404,
    );
    const entityWrite = await request(
      db,
      "/api/knowledge/entity?kind=event&id=haymarket-1886&locale=it",
      "POST",
    );
    assert.equal(entityWrite.status, 405);
    assert.equal(entityWrite.headers.get("allow"), "GET");
    assert.equal((await request(db, "/api/knowledge/export", "DELETE")).status, 405);
    assert.equal((await request(db, "/api/knowledge/export?space=other")).status, 400);
  } finally {
    await pg.close();
  }
});

test("the public knowledge API serves structured entity kinds beyond the historical seed", async () => {
  const { pg, pool, db } = await fixture();
  try {
    const base = polisrossaKnowledgeSeed().find(
      (entry) => entry.identity.kind === "event" && entry.identity.id === "haymarket-1886",
    );
    assert.ok(base);
    await importKnowledgeRevisions(pool, [{
      ...base,
      identity: { ...base.identity, kind: "concept", id: "collective-memory" },
      content: {
        format: "org.agoranode.knowledge-entry.v1",
        title: "Memoria collettiva",
        summary: "Un concetto collegato a esperienze e istituzioni condivise.",
      },
    }]);
    const response = await request(
      db,
      "/api/knowledge/entity?kind=concept&id=collective-memory&locale=it",
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.current.identity.kind, "concept");
    assert.equal(body.current.identity.id, "collective-memory");
    assert.equal(body.current.content.title, "Memoria collettiva");

    const missing = await request(
      db,
      "/api/knowledge/entity?kind=concept&id=not-yet-imported&locale=it",
    );
    assert.equal(missing.status, 404);
  } finally {
    await pg.close();
  }
});

test("the public export is deterministic and database failures remain generic", async () => {
  const { pg, pool, db } = await fixture(true);
  try {
    await pg.query(
      `INSERT INTO bookmarks(owner_id,kind,item_key,payload,deleted,updated_at)
       VALUES('export-private@example.test','book','private-key','private-token',0,1)`,
    );
    await importPolisrossaKnowledge(pool);
    const first = await request(db, "/api/knowledge/export");
    const firstText = await first.text();
    const second = await request(db, "/api/knowledge/export");
    assert.equal(await second.text(), firstText);
    assert.match(first.headers.get("content-disposition") ?? "", /polisrossa-knowledge-v1\.json/);
    assert.match(first.headers.get("etag") ?? "", /^"sha256-[0-9a-f]{64}"$/);
    assert.equal(firstText.includes("export-private@example.test"), false);
    assert.equal(firstText.includes("private-token"), false);
    const exported = JSON.parse(firstText);
    assert.equal(exported.revisions.length, 81);
    assert.equal(exported.currentRevisions.length, 81);
    const notModified = await api(
      new Request("https://example.test/api/knowledge/export", {
        headers: { "if-none-match": first.headers.get("etag") ?? "" },
      }),
      db,
      null,
      undefined,
      () => {},
      false,
    );
    assert.equal(notModified.status, 304);
  } finally {
    await pg.close();
  }

  const failureMessage = "database-secret-detail";
  const failingConnection = {
    query: async () => {
      throw new Error(failureMessage);
    },
  };
  const failingPool = {
    ...failingConnection,
    connect: async () => failingConnection,
  } satisfies Connections;
  const failed = await request(
    new PostgresDatabase(failingPool),
    "/api/knowledge/entity?kind=person&id=clara-zetkin&locale=it",
  );
  assert.equal(failed.status, 503);
  assert.equal((await failed.text()).includes(failureMessage), false);
});
