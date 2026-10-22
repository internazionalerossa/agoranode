import test from "node:test";
import assert from "node:assert/strict";
import {
  copyFile,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createHash,
  generateKeyPairSync,
  sign as signEd25519,
  verify as verifyEd25519,
  type KeyObject,
} from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  AGORA_GOVERNANCE_BALLOT_FORMAT,
  AGORA_GOVERNANCE_DECISION_FORMAT,
  AGORA_GOVERNANCE_PROTOCOL_VERSION,
  evaluateGovernanceDecision,
  governanceBallotMessage,
  governanceDecisionDigest,
  governanceElectorateSnapshotId,
  type GovernanceBallot,
  type GovernanceDecisionEnvelope,
} from "../app/platform/agora-governance-protocol";
import {
  LEGACY_NOT_RECORDED_DECISION_EVIDENCE,
} from "../app/lib/contribution-rights";
import {
  REPOSITORY_PUBLICATION_FORMAT,
  canonicalKnowledgeHash,
  canonicalKnowledgeJson,
  type KnowledgeRevisionInput,
} from "../app/lib/knowledge-model";
import type { Connections } from "../server/database";
import {
  exportKnowledgeBundle,
  importKnowledgeRevisions,
  type KnowledgeBundle,
} from "../server/knowledge";
import {
  KnowledgeReplicaDirectoryAgent,
  processKnowledgeReplicationInbox,
  writeKnowledgeReplicationOutbox,
} from "../server/knowledge-replica-agent";
import { importKnowledgeReplicationPackage } from "../server/knowledge-replica-import";
import {createPublicPeerServer, pullPublicPeer} from "../server/public-peer-transport";
import { knowledgeGovernanceAuthorizationVerifier } from "../server/knowledge-replication-governance";
import {
  KNOWLEDGE_REPLICATION_PACKAGE_FORMAT,
  REPLICATION_FINALITY_CERTIFICATE_FORMAT,
  REPLICATION_FINALITY_PROTOCOL_VERSION,
  REPLICATION_FINALITY_STATEMENT_FORMAT,
  REPLICATION_VALIDATOR_SET_FORMAT,
  replicationCheckpointId,
  replicationFinalityMessage,
  replicationFinalityStatementDigest,
  replicationValidatorSetDigest,
  validateKnowledgeReplicationPackage,
  type KnowledgeReplicationPackage,
  type ReplicationAuthorization,
  type ReplicationFinalityCertificate,
  type ReplicationFinalityStatement,
  type ReplicationValidatorSet,
} from "../server/knowledge-replication-finality";

const NETWORK_ID = "agoranode.public.v1";
const SPACE_ID = "polisrossa";
const GOVERNANCE_DIGEST = `sha256:${"a".repeat(64)}` as const;

type ValidatorFixture = {
  set: ReplicationValidatorSet;
  privateKeys: Map<string, KeyObject>;
};

function validators(networkId = NETWORK_ID, spaceId = SPACE_ID): ValidatorFixture {
  const privateKeys = new Map<string, KeyObject>();
  const actors = ["node-a", "node-b", "node-c", "node-d"].map((id) => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const der = publicKey.export({ format: "der", type: "spki" });
    const keyId = `sha256:${createHash("sha256").update(der).digest("hex")}` as const;
    privateKeys.set(id, privateKey);
    return { id, keyId, publicKeySpki: der.toString("base64url") };
  });
  return {
    set: {
      format: REPLICATION_VALIDATOR_SET_FORMAT,
      protocolVersion: REPLICATION_FINALITY_PROTOCOL_VERSION,
      networkId,
      spaceId,
      epoch: 0,
      validators: actors,
    },
    privateKeys,
  };
}

async function fixture() {
  const pg = new PGlite();
  for (const migration of [
    "012-knowledge-store.sql",
    "013-knowledge-replication.sql",
  ]) {
    await pg.exec(
      await readFile(
        new URL(`../server/migrations/${migration}`, import.meta.url),
        "utf8",
      ),
    );
  }
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

function repositoryPublication(previousRevisionSha256: string | null) {
  return {
    format: REPOSITORY_PUBLICATION_FORMAT,
    author: { publicId: "polisrossa", displayName: "PolisRossa" },
    previousRevisionSha256,
    approval: {
      method: "repository-review" as const,
      result: "approved" as const,
      approvedAt: null,
      evidence: LEGACY_NOT_RECORDED_DECISION_EVIDENCE,
    },
  };
}

function revision(
  text: string,
  previousRevisionSha256: string | null = null,
): KnowledgeRevisionInput {
  return {
    identity: {
      spaceId: SPACE_ID,
      kind: "article",
      id: "replication-proof",
      locale: "it",
    },
    content: { title: "Prova di replica", text },
    rights: {
      status: "reuse-not-documented",
      licenseSpdx: null,
      attribution: "PolisRossa",
      reuseAllowed: false,
    },
    sourceType: "repository-seed",
    publicationRecord: repositoryPublication(previousRevisionSha256),
    sources: [],
    relations: [],
  };
}

async function finalizedPackage(
  bundle: KnowledgeBundle,
  validatorFixture: ValidatorFixture,
  options: {
    sequence: number;
    previousCheckpointId: `sha256:${string}` | null;
    authorization: ReplicationAuthorization;
    signatures?: number;
    signerIds?: readonly string[];
  },
): Promise<KnowledgeReplicationPackage> {
  const governanceDecisionDigest =
    options.authorization.kind === "governance-decision"
      ? options.authorization.decisionDigest
      : null;
  const statement: ReplicationFinalityStatement = {
    format: REPLICATION_FINALITY_STATEMENT_FORMAT,
    protocolVersion: REPLICATION_FINALITY_PROTOCOL_VERSION,
    networkId: validatorFixture.set.networkId,
    spaceId: validatorFixture.set.spaceId,
    sequence: options.sequence,
    previousCheckpointId: options.previousCheckpointId,
    bundleSha256: `sha256:${bundle.sha256}`,
    governanceDecisionDigest,
    authorization: options.authorization,
  };
  const validatorSetDigest = await replicationValidatorSetDigest(
    validatorFixture.set,
  );
  const message = replicationFinalityMessage(statement, validatorSetDigest);
  const signingValidators = options.signerIds
    ? validatorFixture.set.validators.filter((validator) =>
        options.signerIds!.includes(validator.id),
      )
    : validatorFixture.set.validators.slice(0, options.signatures ?? 3);
  const signatures = signingValidators
    .map((validator) => ({
      validatorId: validator.id,
      keyId: validator.keyId,
      signature: signEd25519(
        null,
        message,
        validatorFixture.privateKeys.get(validator.id)!,
      ).toString("base64url"),
    }));
  const finality: ReplicationFinalityCertificate = {
    format: REPLICATION_FINALITY_CERTIFICATE_FORMAT,
    protocolVersion: REPLICATION_FINALITY_PROTOCOL_VERSION,
    statement,
    statementDigest: await replicationFinalityStatementDigest(statement),
    validatorSetDigest,
    signatures,
  };
  const body = {
    format: KNOWLEDGE_REPLICATION_PACKAGE_FORMAT,
    networkId: validatorFixture.set.networkId,
    spaceId: validatorFixture.set.spaceId,
    bundle,
    finality,
  } as const;
  return { ...body, sha256: await canonicalKnowledgeHash(body) };
}

const governanceVerifier = async ({ decisionDigest }: { decisionDigest: string }) =>
  decisionDigest === GOVERNANCE_DIGEST;

async function approvedGovernance(
  bundle: KnowledgeBundle,
  previousCheckpointId: `sha256:${string}`,
) {
  const signingKeys = new Map<string, KeyObject>();
  const verificationKeys = new Map<string, KeyObject>();
  const actors = ["member-a", "member-b", "member-c"].map((id) => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const der = publicKey.export({ format: "der", type: "spki" });
    const keyId = `sha256:${createHash("sha256").update(der).digest("hex")}` as const;
    signingKeys.set(id, privateKey);
    verificationKeys.set(keyId, publicKey);
    return { id, keyId };
  });
  const opensAt = 1_800_000_000_000;
  const decision: GovernanceDecisionEnvelope = {
    format: AGORA_GOVERNANCE_DECISION_FORMAT,
    protocolVersion: AGORA_GOVERNANCE_PROTOCOL_VERSION,
    networkId: NETWORK_ID,
    scope: { kind: "instance", id: SPACE_ID },
    decisionClass: "instance-ordinary",
    sequence: 1,
    baseCheckpointId: previousCheckpointId,
    proposalSha256: `sha256:${bundle.sha256}`,
    proposalPath: "/polisrossa/proposte/replication-proof",
    opensAt,
    closesAt: opensAt + 3_600_000,
    appealClosesAt: opensAt + 7_200_000,
    electorates: {
      members: {
        snapshotId: await governanceElectorateSnapshotId("members", actors),
        actors,
      },
      nodes: null,
    },
  };
  const digestValue = await governanceDecisionDigest(decision);
  const ballots: GovernanceBallot[] = actors.slice(0, 2).map((actor) => {
    const unsigned = {
      format: AGORA_GOVERNANCE_BALLOT_FORMAT,
      protocolVersion: AGORA_GOVERNANCE_PROTOCOL_VERSION,
      decisionDigest: digestValue,
      chamber: "members" as const,
      voterId: actor.id,
      choice: "yes" as const,
      keyId: actor.keyId,
      mandateDecisionDigest: null,
    };
    return {
      ...unsigned,
      signature: signEd25519(
        null,
        governanceBallotMessage(unsigned),
        signingKeys.get(actor.id)!,
      ).toString("base64url"),
    };
  });
  const certificate = await evaluateGovernanceDecision(decision, ballots, {
    now: decision.appealClosesAt,
    verifySignature: ({ keyId, signature, message }) => {
      const key = verificationKeys.get(keyId);
      return Boolean(
        key &&
          verifyEd25519(null, message, key, Buffer.from(signature, "base64url")),
      );
    },
  });
  const verifier = knowledgeGovernanceAuthorizationVerifier(
    async (requested) =>
      requested === digestValue ? { decision, certificate } : null,
    {
      now: decision.appealClosesAt,
      verifySignature: ({ keyId, signature, message }) => {
        const key = verificationKeys.get(keyId);
        return Boolean(
          key &&
            verifyEd25519(
              null,
              message,
              key,
              Buffer.from(signature, "base64url"),
            ),
        );
      },
    },
  );
  return { digest: digestValue, verifier, decision, certificate };
}

test("two independent databases converge through finalized directory packages and survive restart", async () => {
  const primary = await fixture();
  const replica = await fixture();
  const outOfOrderReplica = await fixture();
  const forkSource = await fixture();
  const directory = await mkdtemp(join(tmpdir(), "agoranode-replication-"));
  const outbox = join(directory, "outbox");
  const inbox = join(directory, "inbox");
  const validatorFixture = validators();
  try {
    await importKnowledgeRevisions(primary.pool, [revision("genesi pubblica")]);
    await importKnowledgeRevisions(forkSource.pool, [revision("genesi pubblica")]);
    const firstBundle = await exportKnowledgeBundle(primary.pool, SPACE_ID);
    const firstPackage = await finalizedPackage(firstBundle, validatorFixture, {
      sequence: 0,
      previousCheckpointId: null,
      authorization: { kind: "legacy-bootstrap", source: "repository-review" },
    });
    const firstOutbox = await writeKnowledgeReplicationOutbox(
      outbox,
      firstPackage,
      { validatorSet: validatorFixture.set, allowLegacyBootstrap: true },
    );
    await mkdir(inbox, { recursive: true });
    await writeFile(join(inbox, "unfinished.tmp"), "{");
    // Exercise direct transport through an independent HTTP listener. The
    // receiving database still validates and imports finalized bytes itself.
    const peer = createPublicPeerServer({
      directory: outbox, validatorSet: validatorFixture.set,
      expectedNetworkId: NETWORK_ID, expectedSpaceId: SPACE_ID,
      allowLegacyBootstrap: true,
    });
    await new Promise<void>(resolve => peer.listen(0, "127.0.0.1", resolve));
    try {
      const address = peer.address();
      if (!address || typeof address === "string") throw Error("No test peer port");
      const pulled = await pullPublicPeer("http://127.0.0.1:" + address.port, {
        directory: inbox, validatorSet: validatorFixture.set,
        expectedNetworkId: NETWORK_ID, expectedSpaceId: SPACE_ID,
        allowLegacyBootstrap: true,
      }, {allowInsecureLoopback: true});
      assert.equal(pulled.length, 1);
      assert.equal(pulled[0].created, true);
      let packageDownloads = 0;
      const measuringFetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).includes('/v1/packages/')) packageDownloads++;
        return fetch(input,init);
      }) as typeof fetch;
      const retry = await pullPublicPeer("http://127.0.0.1:" + address.port, {
        directory: inbox, validatorSet: validatorFixture.set,
        expectedNetworkId: NETWORK_ID, expectedSpaceId: SPACE_ID,
        allowLegacyBootstrap: true,
      }, {allowInsecureLoopback: true,fetcher:measuringFetcher});
      assert.equal(retry[0].created, false);
      assert.equal(packageDownloads, 0, 'unchanged knowledge bytes must not be transferred a second time');
    } finally {
      await new Promise<void>((resolve, reject) => peer.close(error => error ? reject(error) : resolve()));
    }
    const firstScan = await processKnowledgeReplicationInbox({
      pool: replica.pool,
      inboxDirectory: inbox,
      outboxDirectory: join(directory, "relay"),
      validatorSet: validatorFixture.set,
      expectedNetworkId: NETWORK_ID,
      expectedSpaceId: SPACE_ID,
      allowLegacyBootstrap: true,
      verifyGovernanceAuthorization: governanceVerifier,
    });
    assert.equal(firstScan.length, 1);
    assert.equal(firstScan[0].status, "accepted");
    assert.deepEqual(
      await exportKnowledgeBundle(replica.pool, SPACE_ID),
      firstBundle,
    );
    const firstImport = firstScan[0].status === "accepted" ? firstScan[0].import : null;
    assert.ok(firstImport);

    const alternateFirstPackage = await finalizedPackage(
      firstBundle,
      validatorFixture,
      {
        sequence: 0,
        previousCheckpointId: null,
        authorization: { kind: "legacy-bootstrap", source: "repository-review" },
        signerIds: ["node-a", "node-b", "node-d"],
      },
    );
    assert.notEqual(alternateFirstPackage.sha256, firstPackage.sha256);
    assert.equal(
      await replicationCheckpointId(
        alternateFirstPackage.finality,
        validatorFixture.set,
      ),
      firstImport.checkpointId,
      "equivalent quorum subsets identify the same finalized checkpoint",
    );
    const alternateImport = await importKnowledgeReplicationPackage(
      replica.pool,
      alternateFirstPackage,
      {
        validatorSet: validatorFixture.set,
        expectedNetworkId: NETWORK_ID,
        expectedSpaceId: SPACE_ID,
        allowLegacyBootstrap: true,
      },
    );
    assert.equal(alternateImport.status, "already-accepted");
    assert.equal(alternateImport.packageSha256, firstImport.packageSha256);

    const root = firstBundle.currentRevisions[0].revisionSha256;
    await importKnowledgeRevisions(primary.pool, [
      revision("seconda revisione finalizzata", root),
    ]);
    const secondBundle = await exportKnowledgeBundle(primary.pool, SPACE_ID);
    const approved = await approvedGovernance(
      secondBundle,
      firstImport.checkpointId,
    );
    const secondPackage = await finalizedPackage(secondBundle, validatorFixture, {
      sequence: 1,
      previousCheckpointId: firstImport.checkpointId,
      authorization: {
        kind: "governance-decision",
        decisionDigest: approved.digest,
      },
    });
    const secondOutbox = await writeKnowledgeReplicationOutbox(
      outbox,
      secondPackage,
      {
        validatorSet: validatorFixture.set,
        verifyGovernanceAuthorization: approved.verifier,
      },
    );
    await copyFile(secondOutbox.path, join(inbox, secondOutbox.path.split(/[\\/]/).at(-1)!));
    const secondScan = await processKnowledgeReplicationInbox({
      pool: replica.pool,
      inboxDirectory: inbox,
      validatorSet: validatorFixture.set,
      expectedNetworkId: NETWORK_ID,
      expectedSpaceId: SPACE_ID,
      allowLegacyBootstrap: true,
      verifyGovernanceAuthorization: approved.verifier,
    });
    assert.equal(secondScan.filter((item) => item.status === "accepted").length, 1);
    assert.deepEqual(
      await exportKnowledgeBundle(replica.pool, SPACE_ID),
      secondBundle,
    );

    const delayedInbox = join(directory, "delayed-inbox");
    await mkdir(delayedInbox, { recursive: true });
    await copyFile(
      secondOutbox.path,
      join(delayedInbox, secondOutbox.path.split(/[\\/]/).at(-1)!),
    );
    const delayedAgent = new KnowledgeReplicaDirectoryAgent({
      pool: outOfOrderReplica.pool,
      inboxDirectory: delayedInbox,
      validatorSet: validatorFixture.set,
      expectedNetworkId: NETWORK_ID,
      expectedSpaceId: SPACE_ID,
      allowLegacyBootstrap: true,
      verifyGovernanceAuthorization: approved.verifier,
    });
    assert.equal((await delayedAgent.scan())[0].status, "rejected");
    await copyFile(
      firstOutbox.path,
      join(delayedInbox, firstOutbox.path.split(/[\\/]/).at(-1)!),
    );
    const recovered = await delayedAgent.scan();
    assert.equal(
      recovered.filter((item) => item.status === "accepted").length,
      2,
    );
    assert.deepEqual(await delayedAgent.scan(), []);
    assert.deepEqual(
      await exportKnowledgeBundle(outOfOrderReplica.pool, SPACE_ID),
      secondBundle,
    );

    const restarted = new KnowledgeReplicaDirectoryAgent({
      pool: replica.pool,
      inboxDirectory: inbox,
      validatorSet: validatorFixture.set,
      expectedNetworkId: NETWORK_ID,
      expectedSpaceId: SPACE_ID,
      allowLegacyBootstrap: true,
      verifyGovernanceAuthorization: approved.verifier,
    });
    const restartScan = await restarted.scan();
    assert.equal(restartScan.length, 2);
    assert.ok(restartScan.every((item) => item.status === "already-accepted"));
    assert.deepEqual(await restarted.scan(), []);
    assert.deepEqual(
      (
        await replica.pg.query<{ sequence: number; count: number }>(
          `SELECT max(sequence)::int AS sequence,count(*)::int AS count
           FROM knowledge_replication_packages`,
        )
      ).rows[0],
      { sequence: 1, count: 2 },
    );

    const raw = await readFile(secondOutbox.path, "utf8");
    for (const forbidden of [
      "owner_id",
      "account_id",
      "session_id",
      "oauth",
      "access_token",
      "refresh_token",
      "smtp",
      "password",
      "@",
    ]) {
      assert.equal(raw.toLowerCase().includes(forbidden), false, forbidden);
    }

    await importKnowledgeRevisions(forkSource.pool, [
      revision("ramo concorrente", root),
    ]);
    const forkBundle = await exportKnowledgeBundle(forkSource.pool, SPACE_ID);
    const forkPackage = await finalizedPackage(forkBundle, validatorFixture, {
      sequence: 1,
      previousCheckpointId: firstImport.checkpointId,
      authorization: {
        kind: "governance-decision",
        decisionDigest: GOVERNANCE_DIGEST,
      },
    });
    await assert.rejects(
      importKnowledgeReplicationPackage(replica.pool, forkPackage, {
        validatorSet: validatorFixture.set,
        expectedNetworkId: NETWORK_ID,
        expectedSpaceId: SPACE_ID,
        verifyGovernanceAuthorization: governanceVerifier,
      }),
      /rollback|competing finalized fork/,
    );

    const secondAccepted = secondScan.find((item) => item.status === "accepted");
    const secondCheckpoint =
      secondAccepted?.status === "accepted"
        ? secondAccepted.import.checkpointId
        : null;
    assert.ok(secondCheckpoint);
    const rollbackPackage = await finalizedPackage(firstBundle, validatorFixture, {
      sequence: 2,
      previousCheckpointId: secondCheckpoint,
      authorization: {
        kind: "governance-decision",
        decisionDigest: GOVERNANCE_DIGEST,
      },
    });
    await assert.rejects(
      importKnowledgeReplicationPackage(replica.pool, rollbackPackage, {
        validatorSet: validatorFixture.set,
        expectedNetworkId: NETWORK_ID,
        expectedSpaceId: SPACE_ID,
        verifyGovernanceAuthorization: governanceVerifier,
      }),
      /rolls back|forks|converge/,
    );
    assert.equal(
      (
        await replica.pg.query<{ count: number }>(
          "SELECT count(*)::int AS count FROM knowledge_revisions",
        )
      ).rows[0].count,
      2,
    );
  } finally {
    await Promise.all([
      primary.pg.close(),
      replica.pg.close(),
      outOfOrderReplica.pg.close(),
      forkSource.pg.close(),
    ]);
    await rm(directory, { recursive: true, force: true });
  }
});

test("tamper, insufficient finality quorum, private fields and cross-namespace packages fail closed", async () => {
  const source = await fixture();
  const replica = await fixture();
  const validatorFixture = validators();
  try {
    const sourceRevision = revision("contenuto pubblico");
    sourceRevision.sources = [
      {
        sourceType: "public-reference",
        title: "Fonte pubblica",
        url: "https://example.test/documento",
        rights: {
          status: "reference-only",
          licenseSpdx: null,
          attribution: "Example",
          reuseAllowed: false,
        },
      },
    ];
    await importKnowledgeRevisions(source.pool, [sourceRevision]);
    const bundle = await exportKnowledgeBundle(source.pool, SPACE_ID);
    const valid = await finalizedPackage(bundle, validatorFixture, {
      sequence: 0,
      previousCheckpointId: null,
      authorization: { kind: "legacy-bootstrap", source: "repository-review" },
    });

    const tampered = JSON.parse(canonicalKnowledgeJson(valid));
    tampered.bundle.revisions[0].content.text = "alterato in transito";
    await assert.rejects(
      validateKnowledgeReplicationPackage(tampered, {
        validatorSet: validatorFixture.set,
        allowLegacyBootstrap: true,
      }),
      /revision address does not match|bundle SHA-256/,
    );

    const privateField = JSON.parse(canonicalKnowledgeJson(valid));
    privateField.bundle.revisions[0].content.session_id = "private-session";
    await assert.rejects(
      validateKnowledgeReplicationPackage(privateField, {
        validatorSet: validatorFixture.set,
        allowLegacyBootstrap: true,
      }),
      /private field/,
    );

    const privateEmail = JSON.parse(canonicalKnowledgeJson(valid));
    privateEmail.bundle.revisions[0].publicationRecord.author.displayName =
      "private@example.test";
    await assert.rejects(
      validateKnowledgeReplicationPackage(privateEmail, {
        validatorSet: validatorFixture.set,
        allowLegacyBootstrap: true,
      }),
      /email address/,
    );

    const privateUrlEmail = JSON.parse(canonicalKnowledgeJson(valid));
    privateUrlEmail.bundle.revisions[0].sources[0].url =
      "https://example.test/private%40example.test";
    await assert.rejects(
      validateKnowledgeReplicationPackage(privateUrlEmail, {
        validatorSet: validatorFixture.set,
        allowLegacyBootstrap: true,
      }),
      /email address/,
    );

    const credentialedUrl = JSON.parse(canonicalKnowledgeJson(valid));
    credentialedUrl.bundle.revisions[0].sources[0].url =
      "https://example.test/documento?client_secret=not-public";
    await assert.rejects(
      validateKnowledgeReplicationPackage(credentialedUrl, {
        validatorSet: validatorFixture.set,
        allowLegacyBootstrap: true,
      }),
      /private query parameter/,
    );

    const insufficient = await finalizedPackage(bundle, validatorFixture, {
      sequence: 0,
      previousCheckpointId: null,
      authorization: { kind: "legacy-bootstrap", source: "repository-review" },
      signatures: 2,
    });
    await assert.rejects(
      validateKnowledgeReplicationPackage(insufficient, {
        validatorSet: validatorFixture.set,
        allowLegacyBootstrap: true,
      }),
      /requires at least 3 of 4 validators/,
    );

    await assert.rejects(
      importKnowledgeReplicationPackage(replica.pool, valid, {
        validatorSet: validatorFixture.set,
        expectedNetworkId: "agoranode.other.v1",
        expectedSpaceId: SPACE_ID,
        allowLegacyBootstrap: true,
      }),
      /configured network and instance/,
    );
    await assert.rejects(
      importKnowledgeReplicationPackage(replica.pool, valid, {
        validatorSet: validatorFixture.set,
        expectedNetworkId: NETWORK_ID,
        expectedSpaceId: "another-node",
        allowLegacyBootstrap: true,
      }),
      /configured network and instance/,
    );

    const unauthorized = await finalizedPackage(bundle, validatorFixture, {
      sequence: 1,
      previousCheckpointId: `sha256:${"b".repeat(64)}`,
      authorization: {
        kind: "governance-decision",
        decisionDigest: GOVERNANCE_DIGEST,
      },
    });
    await assert.rejects(
      validateKnowledgeReplicationPackage(unauthorized, {
        validatorSet: validatorFixture.set,
      }),
      /governance authorization is absent or invalid/,
    );

    const { sha256: _sha256, ...body } = valid;
    assert.equal(valid.sha256, await canonicalKnowledgeHash(body));
    assert.equal(
      canonicalKnowledgeJson(JSON.parse(canonicalKnowledgeJson(valid))),
      canonicalKnowledgeJson(valid),
    );
  } finally {
    await Promise.all([source.pg.close(), replica.pg.close()]);
  }
});
