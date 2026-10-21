import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import STORY from "../app/data/history-story.json" with { type: "json" };
import { historyEventUrl } from "../app/lib/history-event-navigation";
import {
  AGORANODE_MINIMUM_GRANT,
  AGORANODE_MINIMUM_GRANT_SHA256,
  AGORANODE_MINIMUM_GRANT_VERSION,
  CONTRIBUTION_PUBLICATION_FORMAT,
  DEMOCRATIC_DECISION_EVIDENCE_FORMAT,
  DEMOCRATIC_REVISION_PROVENANCE_FORMAT,
  LEGACY_NOT_RECORDED_DECISION_EVIDENCE,
  democraticDecisionTallySha256,
  type ContributionPublicationRecord,
} from "../app/lib/contribution-rights";
import {
  KNOWLEDGE_BUNDLE_FORMAT,
  REPOSITORY_PUBLICATION_FORMAT,
  canonicalKnowledgeHash,
  canonicalKnowledgeJson,
  validateKnowledgeRevisionInput,
  type KnowledgeJson,
} from "../app/lib/knowledge-model";
import type { Connections } from "../server/database";
import {
  POLISROSSA_SPACE_ID,
  importPolisrossaKnowledge,
  polisrossaKnowledgeSeed,
} from "../server/knowledge-import";
import {
  exportKnowledgeBundle,
  importKnowledgeRevisions,
  readKnowledgeEntity,
  serializeKnowledgeBundle,
} from "../server/knowledge";

type TestPerson = { slug: string; name: string; role: string; url: string };
type TestSource = { name: string; url: string };
type TestEvent = {
  id: string;
  people?: TestPerson[];
  detail?: { sources?: TestSource[] };
};
type TestEra = { events: TestEvent[] };
const ERAS = STORY as unknown as TestEra[];

async function contributionPublication(
  previousRevisionSha256: string | null,
): Promise<ContributionPublicationRecord> {
  const forumTopicId = "123e4567-e89b-42d3-a456-426614174000";
  const tally = { approve: 3, reject: 1 };
  return {
    format: CONTRIBUTION_PUBLICATION_FORMAT,
    scope: "submitted-contribution-only",
    publicLicense: { id: "CC-BY-SA-4.0" },
    grantConsent: {
      version: AGORANODE_MINIMUM_GRANT_VERSION,
      statementSha256: AGORANODE_MINIMUM_GRANT_SHA256,
      accepted: true,
      acceptedAt: "2026-10-21T12:00:00.000Z",
      acceptedByPublicId: "public-pseudonym",
    },
    provenance: {
      format: DEMOCRATIC_REVISION_PROVENANCE_FORMAT,
      author: { publicId: "public-pseudonym", displayName: "Autrice pubblica" },
      request: {
        forumTopicId,
        forumTopicUrl: `/polisrossa?view=partecipa&proposal=${forumTopicId}`,
        requestedBy: {
          publicId: "requester-public-id",
          displayName: "Proponente pubblico",
        },
      },
      decision: {
        id: "decision-2026-1",
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

async function fixture(withPrivateTables = false) {
  const pg = new PGlite();
  if (withPrivateTables) {
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
  return { pg, pool };
}

test("the PolisRossa seed imports all 64 events and 17 people with stable legacy identifiers and URLs", async () => {
  const { pg, pool } = await fixture();
  try {
    const seed = polisrossaKnowledgeSeed();
    assert.equal(seed.filter((item) => item.identity.kind === "event").length, 64);
    assert.equal(seed.filter((item) => item.identity.kind === "person").length, 17);
    const imported = await importPolisrossaKnowledge(pool);
    assert.equal(imported.total, 81);
    assert.equal(imported.entities, 81);
    assert.equal(imported.revisions, 81);
    assert.equal(imported.currentSelections, 81);

    const counts = await pg.query<{ kind: string; count: number }>(
      "SELECT kind,count(*)::int AS count FROM knowledge_entities GROUP BY kind ORDER BY kind",
    );
    assert.deepEqual(counts.rows, [
      { kind: "event", count: 64 },
      { kind: "person", count: 17 },
    ]);
    const eventIds = new Set(
      (
        await pg.query<{ entity_id: string }>(
          "SELECT entity_id FROM knowledge_entities WHERE kind='event'",
        )
      ).rows.map((row) => row.entity_id),
    );
    assert.deepEqual(
      eventIds,
      new Set(ERAS.flatMap((era) => era.events.map((event) => event.id))),
    );
    const originalPeople = ERAS.flatMap((era) => era.events).flatMap(
      (event) => event.people ?? [],
    );
    const personIds = new Set(
      (
        await pg.query<{ entity_id: string }>(
          "SELECT entity_id FROM knowledge_entities WHERE kind='person'",
        )
      ).rows.map((row) => row.entity_id),
    );
    assert.deepEqual(personIds, new Set(originalPeople.map((person) => person.slug)));

    for (const era of ERAS) {
      for (const event of era.events) {
        const stored = await readKnowledgeEntity(pool, {
          spaceId: POLISROSSA_SPACE_ID,
          kind: "event",
          id: event.id,
          locale: "it",
        });
        assert.ok(stored);
        const legacy = stored.content.legacy as Record<string, KnowledgeJson>;
        assert.equal(legacy.id, event.id);
        assert.equal(legacy.url, historyEventUrl(event.id));
        assert.deepEqual(
          stored.sources.map((source) => source.url),
          (event.detail?.sources ?? []).map((source) => source.url),
        );
      }
    }
    for (const person of originalPeople) {
      const stored = await readKnowledgeEntity(pool, {
        spaceId: POLISROSSA_SPACE_ID,
        kind: "person",
        id: person.slug,
        locale: "it",
      });
      assert.ok(stored);
      const legacy = stored.content.legacy as Record<string, KnowledgeJson>;
      assert.equal(legacy.slug, person.slug);
      assert.equal(legacy.url, person.url);
      assert.equal(stored.sources[0]?.url, person.url);
    }

    const revisionRights = await pg.query<{
      rights_status: string;
      license_spdx: string | null;
    }>("SELECT DISTINCT rights_status,license_spdx FROM knowledge_revisions");
    assert.deepEqual(revisionRights.rows, [
      { rights_status: "reuse-not-documented", license_spdx: null },
    ]);
    const publication = await pg.query<{
      publication_kind: string;
      publication_record_sha256: string;
      publication_record_json: string;
      public_license_sha256: string | null;
      public_license_json: string | null;
      author_public_id: string;
      author_display_name: string;
      previous_revision_sha256: string | null;
      requester_public_id: string | null;
      requester_display_name: string | null;
      forum_topic_id: string | null;
      forum_topic_url: string | null;
      decision_id: string | null;
      approval_method: string;
      approval_result: string;
      approved_at: string | null;
      decision_evidence_status: string;
      decision_criterion: string | null;
      eligible_voters: number | null;
      participants: number | null;
      quorum_required: number | null;
      approval_threshold: number | null;
      approved_option: string | null;
      decision_tally_json: string | null;
      decision_tally_sha256: string | null;
      platform_grant_version: string | null;
    }>(
      `SELECT DISTINCT publication_kind,publication_record_sha256,
              publication_record_json,public_license_sha256,public_license_json,
              author_public_id,author_display_name,previous_revision_sha256,
              requester_public_id,requester_display_name,forum_topic_id,
              forum_topic_url,decision_id,approval_method,approval_result,
              approved_at,decision_evidence_status,decision_criterion,
              eligible_voters,participants,quorum_required,approval_threshold,
              approved_option,decision_tally_json,decision_tally_sha256,
              platform_grant_version
       FROM knowledge_revisions`,
    );
    const seedPublication = {
      format: REPOSITORY_PUBLICATION_FORMAT,
      author: { publicId: "polisrossa", displayName: "PolisRossa" },
      previousRevisionSha256: null,
      approval: {
        method: "repository-review",
        result: "approved",
        approvedAt: null,
        evidence: LEGACY_NOT_RECORDED_DECISION_EVIDENCE,
      },
    };
    assert.equal(publication.rows.length, 1);
    assert.deepEqual(publication.rows[0], {
      publication_kind: "repository-seed",
      publication_record_sha256: await canonicalKnowledgeHash(seedPublication),
      publication_record_json: canonicalKnowledgeJson(seedPublication),
      public_license_sha256: null,
      public_license_json: null,
      author_public_id: "polisrossa",
      author_display_name: "PolisRossa",
      previous_revision_sha256: null,
      requester_public_id: null,
      requester_display_name: null,
      forum_topic_id: null,
      forum_topic_url: null,
      decision_id: null,
      approval_method: "repository-review",
      approval_result: "approved",
      approved_at: null,
      decision_evidence_status: "legacy-not-recorded",
      decision_criterion: null,
      eligible_voters: null,
      participants: null,
      quorum_required: null,
      approval_threshold: null,
      approved_option: null,
      decision_tally_json: null,
      decision_tally_sha256: null,
      platform_grant_version: null,
    });
    const sourceRights = await pg.query<{
      rights_status: string;
      license_spdx: string | null;
    }>("SELECT DISTINCT rights_status,license_spdx FROM knowledge_sources");
    assert.deepEqual(sourceRights.rows, [
      { rights_status: "reference-only", license_spdx: null },
    ]);
  } finally {
    await pg.close();
  }
});

test("the seed import is idempotent and exports deterministic public-only bundles", async () => {
  const { pg, pool } = await fixture(true);
  try {
    await pg.query(
      `INSERT INTO bookmarks(owner_id,kind,item_key,payload,deleted,updated_at)
       VALUES('private-owner-secret@example.test','book','private-item-secret','private-payload-secret',0,1)`,
    );
    const first = await importPolisrossaKnowledge(pool);
    const auditBefore = (
      await pg.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM knowledge_audit_events",
      )
    ).rows[0].count;
    const second = await importPolisrossaKnowledge(pool);
    assert.equal(first.revisions, 81);
    assert.deepEqual(second, {
      total: 81,
      entities: 0,
      revisions: 0,
      sources: 0,
      sourceLinks: 0,
      relations: 0,
      currentSelections: 0,
      auditEvents: 0,
    });
    assert.equal(
      (
        await pg.query<{ count: number }>(
          "SELECT count(*)::int AS count FROM knowledge_audit_events",
        )
      ).rows[0].count,
      auditBefore,
    );

    const firstBundle = await exportKnowledgeBundle(pool, POLISROSSA_SPACE_ID);
    const secondBundle = await exportKnowledgeBundle(pool, POLISROSSA_SPACE_ID);
    assert.deepEqual(secondBundle, firstBundle);
    assert.equal(firstBundle.format, KNOWLEDGE_BUNDLE_FORMAT);
    assert.deepEqual(firstBundle.platformGrants, [AGORANODE_MINIMUM_GRANT]);
    assert.equal(firstBundle.revisions.length, 81);
    assert.equal(firstBundle.currentRevisions.length, 81);
    const { sha256, ...body } = firstBundle;
    assert.equal(sha256, await canonicalKnowledgeHash(body));
    const bytes = await serializeKnowledgeBundle(firstBundle);
    assert.equal(bytes, canonicalKnowledgeJson(firstBundle));
    await assert.rejects(
      serializeKnowledgeBundle({ ...firstBundle, spaceId: "altered-space" }),
      /SHA-256 does not match/,
    );
    for (const secret of [
      "private-owner-secret@example.test",
      "private-item-secret",
      "private-payload-secret",
      "owner_id",
      "forum_members",
    ]) {
      assert.equal(bytes.includes(secret), false, secret);
    }
    assert.equal(bytes.includes("imported_at"), false);
    assert.equal(bytes.includes("selected_at"), false);
  } finally {
    await pg.close();
  }
});

test("knowledge content and audit rows are append-only and every exported address verifies", async () => {
  const { pg, pool } = await fixture();
  try {
    await importPolisrossaKnowledge(pool);
    await assert.rejects(
      pg.query("UPDATE knowledge_revisions SET attribution='changed'"),
      /append-only/,
    );
    await assert.rejects(
      pg.query("DELETE FROM knowledge_relations"),
      /append-only/,
    );
    await assert.rejects(
      pg.query("DELETE FROM knowledge_audit_events"),
      /append-only/,
    );
    await assert.rejects(
      pg.query("DELETE FROM knowledge_current_revisions"),
      /cannot be deleted/,
    );
    const bundle = await exportKnowledgeBundle(pool, POLISROSSA_SPACE_ID);
    for (const entry of bundle.revisions) {
      assert.match(entry.entitySha256, /^[0-9a-f]{64}$/);
      assert.match(entry.revisionSha256, /^[0-9a-f]{64}$/);
      for (const source of entry.sources) {
        assert.match(source.sourceSha256, /^[0-9a-f]{64}$/);
        assert.match(source.linkSha256, /^[0-9a-f]{64}$/);
      }
      for (const relation of entry.relations) {
        assert.match(relation.relationSha256, /^[0-9a-f]{64}$/);
        assert.match(relation.targetEntitySha256, /^[0-9a-f]{64}$/);
      }
      assert.equal(entry.rights.reuseAllowed, false);
      assert.equal(entry.rights.licenseSpdx, null);
      assert.match(entry.publicationRecordSha256, /^[0-9a-f]{64}$/);
      assert.equal(entry.publicLicenseSha256, null);
      assert.deepEqual(entry.publicationRecord, {
        format: REPOSITORY_PUBLICATION_FORMAT,
        author: { publicId: "polisrossa", displayName: "PolisRossa" },
        previousRevisionSha256: null,
        approval: {
          method: "repository-review",
          result: "approved",
          approvedAt: null,
          evidence: LEGACY_NOT_RECORDED_DECISION_EVIDENCE,
        },
      });
    }
    assert.equal(
      await canonicalKnowledgeHash({ b: 2, a: [true, "è"] }),
      await canonicalKnowledgeHash({ a: [true, "è"], b: 2 }),
    );
    assert.throws(() => canonicalKnowledgeJson({ unsafe: 1.5 }), /safe integers/);
    const future = polisrossaKnowledgeSeed()[0];
    const publicationRecord = await contributionPublication(null);
    await assert.rejects(
      validateKnowledgeRevisionInput({
        ...future,
        publicationRecord: {
          ...publicationRecord,
          grantConsent: {
            ...publicationRecord.grantConsent,
            statementSha256: "0".repeat(64),
          },
        },
      }),
      /grant statement digest/,
    );
    await assert.rejects(
      validateKnowledgeRevisionInput({
        ...future,
        rights: {
          status: "licensed",
          licenseSpdx: "CC-BY-SA-4.0",
          attribution: "Autrice pubblica",
          reuseAllowed: true,
        },
        publicationRecord,
      }),
      /composite revision rights/,
    );
    const accepted = await validateKnowledgeRevisionInput({
      ...future,
      publicationRecord,
    });
    assert.equal(
      accepted.publicationRecord.format,
      CONTRIBUTION_PUBLICATION_FORMAT,
    );
    assert.equal(accepted.rights.licenseSpdx, null);
  } finally {
    await pg.close();
  }
});

test("database triggers make revision and current-pointer audit events atomic", async () => {
  const { pg, pool } = await fixture();
  try {
    const seed = polisrossaKnowledgeSeed().find(
      (entry) => entry.relations.length === 0,
    );
    assert.ok(seed);
    await pg.exec(`
      CREATE FUNCTION reject_test_knowledge_audit() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'synthetic audit failure';
      END;
      $$;
      CREATE TRIGGER reject_test_knowledge_audit
      BEFORE INSERT ON knowledge_audit_events
      FOR EACH ROW EXECUTE FUNCTION reject_test_knowledge_audit();
    `);
    await assert.rejects(
      importKnowledgeRevisions(pool, [seed]),
      /synthetic audit failure/,
    );
    for (const table of [
      "knowledge_entities",
      "knowledge_revisions",
      "knowledge_current_revisions",
      "knowledge_audit_events",
    ]) {
      const count = (
        await pg.query<{ count: number }>(
          `SELECT count(*)::int AS count FROM ${table}`,
        )
      ).rows[0].count;
      assert.equal(count, 0, table);
    }
    await pg.exec(`
      DROP TRIGGER reject_test_knowledge_audit ON knowledge_audit_events;
      DROP FUNCTION reject_test_knowledge_audit();
    `);
    const imported = await importKnowledgeRevisions(pool, [seed]);
    assert.equal(imported.auditEvents, 2);
    const actions = await pg.query<{ action: string; count: number }>(
      `SELECT action,count(*)::int AS count
       FROM knowledge_audit_events GROUP BY action ORDER BY action`,
    );
    assert.deepEqual(actions.rows, [
      { action: "current-selected", count: 1 },
      { action: "revision-imported", count: 1 },
    ]);
  } finally {
    await pg.close();
  }
});

test("a predecessor foreign key binds the space, entity and locale", async () => {
  const { pg, pool } = await fixture();
  try {
    const predecessorConstraint = (
      await pg.query<{ definition: string }>(
        `SELECT pg_get_constraintdef(oid) AS definition
         FROM pg_constraint
         WHERE conname='knowledge_revision_predecessor_same_identity_fk'`,
      )
    ).rows[0]?.definition;
    assert.match(
      predecessorConstraint ?? "",
      /FOREIGN KEY \(previous_revision_sha256, entity_sha256, space_id, locale\)/,
    );
    await importPolisrossaKnowledge(pool);
    const [firstSeed, secondSeed] = polisrossaKnowledgeSeed();
    const [first, second] = await Promise.all([
      readKnowledgeEntity(pool, firstSeed.identity),
      readKnowledgeEntity(pool, secondSeed.identity),
    ]);
    assert.ok(first);
    assert.ok(second);
    await assert.rejects(
      importKnowledgeRevisions(pool, [
        {
          ...firstSeed,
          sourceType: "community-contribution",
          content: { ...firstSeed.content, invalidPredecessor: "other-entity" },
          publicationRecord: await contributionPublication(second.revisionSha256),
        },
      ]),
      /foreign key|violates/i,
    );
    assert.equal(
      (await readKnowledgeEntity(pool, firstSeed.identity))?.revisionSha256,
      first.revisionSha256,
    );

    const englishSeed = {
      ...firstSeed,
      identity: { ...firstSeed.identity, locale: "en" },
      content: { ...firstSeed.content, localeMarker: "en" },
    };
    await importKnowledgeRevisions(pool, [englishSeed]);
    const english = await readKnowledgeEntity(pool, englishSeed.identity);
    assert.ok(english);
    await assert.rejects(
      importKnowledgeRevisions(pool, [
        {
          ...englishSeed,
          sourceType: "community-contribution",
          content: { ...englishSeed.content, invalidPredecessor: "other-locale" },
          publicationRecord: await contributionPublication(first.revisionSha256),
        },
      ]),
      /foreign key|violates/i,
    );
    assert.equal(
      (await readKnowledgeEntity(pool, englishSeed.identity))?.revisionSha256,
      english.revisionSha256,
    );
  } finally {
    await pg.close();
  }
});

test("an approved community revision keeps explicit public provenance and its scoped license", async () => {
  const { pg, pool } = await fixture();
  try {
    await importPolisrossaKnowledge(pool);
    const seed = polisrossaKnowledgeSeed()[0];
    const before = await readKnowledgeEntity(pool, seed.identity);
    assert.ok(before);
    const publicationRecord = await contributionPublication(before.revisionSha256);
    const nextRevision = {
      ...seed,
      sourceType: "community-contribution",
      content: {
        ...seed.content,
        communityRevision: "prova di revisione approvata",
      },
      publicationRecord,
    };
    const imported = await importKnowledgeRevisions(pool, [nextRevision]);
    assert.equal(imported.revisions, 1);
    assert.equal(imported.currentSelections, 1);

    const after = await readKnowledgeEntity(pool, seed.identity);
    assert.ok(after);
    assert.notEqual(after.revisionSha256, before.revisionSha256);
    assert.deepEqual(after.publicationRecord, publicationRecord);
    assert.equal(
      after.publicationRecordSha256,
      await canonicalKnowledgeHash(publicationRecord),
    );
    assert.equal(
      after.publicLicenseSha256,
      await canonicalKnowledgeHash(publicationRecord.publicLicense),
    );
    assert.equal(after.rights.status, "reuse-not-documented");
    assert.equal(after.rights.licenseSpdx, null);

    const stored = (
      await pg.query<{
        publication_kind: string;
        public_license_json: string;
        author_public_id: string;
        requester_public_id: string;
        forum_topic_id: string;
        forum_topic_url: string;
        decision_id: string;
        approval_method: string;
        approval_result: string;
        decision_evidence_status: string;
        decision_criterion: string;
        eligible_voters: number;
        participants: number;
        quorum_required: number;
        approval_threshold: number;
        approved_option: string;
        decision_tally_json: string;
        decision_tally_sha256: string;
        platform_grant_version: string;
      }>(
        `SELECT publication_kind,public_license_json,author_public_id,
                requester_public_id,forum_topic_id,forum_topic_url,decision_id,
                approval_method,approval_result,decision_evidence_status,
                decision_criterion,eligible_voters,participants,quorum_required,
                approval_threshold,approved_option,decision_tally_json,
                decision_tally_sha256,platform_grant_version
         FROM knowledge_revisions WHERE revision_sha256=$1`,
        [after.revisionSha256],
      )
    ).rows[0];
    assert.deepEqual(stored, {
      publication_kind: "community-contribution",
      public_license_json: canonicalKnowledgeJson(publicationRecord.publicLicense),
      author_public_id: "public-pseudonym",
      requester_public_id: "requester-public-id",
      forum_topic_id: "123e4567-e89b-42d3-a456-426614174000",
      forum_topic_url:
        "/polisrossa?view=partecipa&proposal=123e4567-e89b-42d3-a456-426614174000",
      decision_id: "decision-2026-1",
      approval_method: "approval",
      approval_result: "approved",
      decision_evidence_status: "recorded",
      decision_criterion: "absolute-approval-count",
      eligible_voters: 5,
      participants: 4,
      quorum_required: 3,
      approval_threshold: 3,
      approved_option: "approve",
      decision_tally_json: canonicalKnowledgeJson(
        publicationRecord.provenance.decision.evidence.tally,
      ),
      decision_tally_sha256:
        publicationRecord.provenance.decision.evidence.tallySha256,
      platform_grant_version: AGORANODE_MINIMUM_GRANT_VERSION,
    });
    assert.equal(
      (
        await pg.query<{ count: number }>(
          "SELECT count(*)::int AS count FROM knowledge_revisions WHERE entity_sha256=$1",
          [after.entitySha256],
        )
      ).rows[0].count,
      2,
    );

    const reimportedSeed = await importPolisrossaKnowledge(pool);
    assert.equal(reimportedSeed.currentSelections, 0);
    assert.equal(
      (await readKnowledgeEntity(pool, seed.identity))?.revisionSha256,
      after.revisionSha256,
    );

    const bundle = await exportKnowledgeBundle(pool, POLISROSSA_SPACE_ID);
    const exported = bundle.revisions.find(
      (entry) =>
        entry.identity.kind === seed.identity.kind &&
        entry.identity.id === seed.identity.id &&
        entry.revisionSha256 === after.revisionSha256,
    );
    assert.ok(exported);
    assert.deepEqual(exported.publicationRecord, publicationRecord);
    assert.equal(JSON.stringify(bundle).includes("@"), false);
    const exportedPrevious = bundle.revisions.find(
      (entry) => entry.revisionSha256 === before.revisionSha256,
    );
    assert.ok(exportedPrevious);
    assert.equal(
      exported.publicationRecord.format === CONTRIBUTION_PUBLICATION_FORMAT
        ? exported.publicationRecord.provenance.previousRevisionSha256
        : null,
      exportedPrevious.revisionSha256,
    );
    assert.deepEqual(
      bundle.currentRevisions.find(
        (pointer) =>
          pointer.identity.kind === seed.identity.kind &&
          pointer.identity.id === seed.identity.id &&
          pointer.identity.locale === seed.identity.locale,
      ),
      {
        identity: seed.identity,
        entitySha256: after.entitySha256,
        revisionSha256: after.revisionSha256,
      },
    );
  } finally {
    await pg.close();
  }
});
