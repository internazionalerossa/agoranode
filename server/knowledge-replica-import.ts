import { canonicalKnowledgeJson } from "../app/lib/knowledge-model";
import type { Connection, Connections } from "./database";
import {
  exportKnowledgeBundle,
  importKnowledgeRevisionSequenceInTransaction,
  type KnowledgeBundle,
  type KnowledgeImportCounts,
} from "./knowledge";
import {
  knowledgeBundleImportOrder,
  KnowledgeReplicationError,
} from "./knowledge-replication";
import {
  replicationCheckpointId,
  validateKnowledgeReplicationPackage,
  type GovernanceAuthorizationVerifier,
  type KnowledgeReplicationPackage,
} from "./knowledge-replication-finality";

export type KnowledgeReplicaImportOptions = {
  validatorSet: unknown;
  expectedNetworkId: string;
  expectedSpaceId: string;
  allowLegacyBootstrap?: boolean;
  verifyGovernanceAuthorization?: GovernanceAuthorizationVerifier;
};

export type KnowledgeReplicaImportResult = {
  status: "accepted" | "already-accepted";
  networkId: string;
  spaceId: string;
  sequence: number;
  checkpointId: `sha256:${string}`;
  packageSha256: `sha256:${string}`;
  bundleSha256: `sha256:${string}`;
  counts: KnowledgeImportCounts;
};

const emptyCounts = (): KnowledgeImportCounts => ({
  total: 0,
  entities: 0,
  revisions: 0,
  sources: 0,
  sourceLinks: 0,
  relations: 0,
  currentSelections: 0,
  auditEvents: 0,
});

function fail(message: string): never {
  throw new KnowledgeReplicationError(message);
}

async function hasKnowledgeForSpace(connection: Connection, spaceId: string) {
  return (
    await connection.query(
      "SELECT 1 FROM knowledge_current_revisions WHERE space_id=$1 LIMIT 1",
      [spaceId],
    )
  ).rows.length > 0;
}

function revisionMap(bundle: KnowledgeBundle) {
  return new Map(
    bundle.revisions.map((revision) => [
      revision.revisionSha256,
      canonicalKnowledgeJson(revision),
    ]),
  );
}

function assertLocalHistoryIsPrefix(
  local: KnowledgeBundle,
  incoming: KnowledgeBundle,
) {
  if (local.spaceId !== incoming.spaceId) fail("local and incoming spaces differ");
  const received = revisionMap(incoming);
  for (const revision of local.revisions) {
    if (received.get(revision.revisionSha256) !== canonicalKnowledgeJson(revision)) {
      fail("incoming bundle rolls back or forks a locally stored revision");
    }
  }
  const receivedPointers = new Map(
    incoming.currentRevisions.map((pointer) => [
      canonicalKnowledgeJson(pointer.identity),
      pointer,
    ]),
  );
  for (const pointer of local.currentRevisions) {
    const receivedPointer = receivedPointers.get(
      canonicalKnowledgeJson(pointer.identity),
    );
    if (!receivedPointer) {
      fail("incoming bundle removes a local current history");
    }
    if (!received.has(pointer.revisionSha256)) {
      fail("incoming bundle does not descend from the local current revision");
    }
  }
}

function assertExpectedNamespace(
  material: KnowledgeReplicationPackage,
  options: KnowledgeReplicaImportOptions,
) {
  if (
    material.networkId !== options.expectedNetworkId ||
    material.spaceId !== options.expectedSpaceId
  ) {
    fail("package does not belong to this configured network and instance");
  }
}

/**
 * Atomically advances one instance replica. Validation and Ed25519 checks run
 * before the transaction; the transaction then serializes the head, rejects
 * gaps/forks/rollback, imports the complete append-only history and records a
 * durable receipt only after the resulting canonical bundle is identical.
 */
export async function importKnowledgeReplicationPackage(
  pool: Connections,
  value: unknown,
  options: KnowledgeReplicaImportOptions,
): Promise<KnowledgeReplicaImportResult> {
  const material = await validateKnowledgeReplicationPackage(value, {
    validatorSet: options.validatorSet,
    allowLegacyBootstrap: options.allowLegacyBootstrap,
    verifyGovernanceAuthorization: options.verifyGovernanceAuthorization,
  });
  assertExpectedNamespace(material, options);
  const statement = material.finality.statement;
  const checkpointId = await replicationCheckpointId(
    material.finality,
    options.validatorSet,
  );
  const packageSha256 = `sha256:${material.sha256}` as const;
  const bundleSha256 = `sha256:${material.bundle.sha256}` as const;
  const connection = await pool.connect();
  try {
    await connection.query("BEGIN");
    await connection.query("SELECT pg_advisory_xact_lock(194733,5)");
    const accepted = (
      await connection.query(
        `SELECT checkpoint_id,network_id,space_id,sequence,previous_checkpoint_id,
                package_sha256,bundle_sha256,validator_set_digest,
                authorization_kind,governance_decision_digest
         FROM knowledge_replication_packages
         WHERE package_sha256=$1 OR checkpoint_id=$2`,
        [packageSha256, checkpointId],
      )
    ).rows[0];
    if (accepted) {
      if (
        accepted.checkpoint_id !== checkpointId ||
        accepted.network_id !== material.networkId ||
        accepted.space_id !== material.spaceId ||
        Number(accepted.sequence) !== statement.sequence ||
        accepted.previous_checkpoint_id !== statement.previousCheckpointId ||
        accepted.bundle_sha256 !== bundleSha256 ||
        accepted.validator_set_digest !== material.finality.validatorSetDigest ||
        accepted.authorization_kind !== statement.authorization.kind ||
        accepted.governance_decision_digest !== statement.governanceDecisionDigest
      ) {
        fail("accepted package receipt conflicts with its content address");
      }
      await connection.query("COMMIT");
      return {
        status: "already-accepted",
        networkId: material.networkId,
        spaceId: material.spaceId,
        sequence: statement.sequence,
        checkpointId,
        packageSha256: accepted.package_sha256 as `sha256:${string}`,
        bundleSha256,
        counts: emptyCounts(),
      };
    }
    const head = (
      await connection.query(
        `SELECT sequence,checkpoint_id,package_sha256,bundle_sha256
         FROM knowledge_replication_heads
         WHERE network_id=$1 AND space_id=$2 FOR UPDATE`,
        [material.networkId, material.spaceId],
      )
    ).rows[0];
    if (!head) {
      if (statement.sequence !== 0 || statement.previousCheckpointId !== null) {
        fail("replica must begin with the finalized genesis package");
      }
    } else {
      const headSequence = Number(head.sequence);
      if (statement.sequence <= headSequence) {
        fail("package is a rollback or a competing finalized fork");
      }
      if (statement.sequence !== headSequence + 1) {
        fail("package leaves a gap in the finalized sequence");
      }
      if (statement.previousCheckpointId !== head.checkpoint_id) {
        fail("package does not extend the local finalized checkpoint");
      }
    }

    const localExists = await hasKnowledgeForSpace(connection, material.spaceId);
    if (localExists) {
      const localBundle = await exportKnowledgeBundle(connection, material.spaceId);
      assertLocalHistoryIsPrefix(localBundle, material.bundle);
    } else if (head) {
      fail("replica head exists without its public knowledge state");
    }

    const counts = await importKnowledgeRevisionSequenceInTransaction(
      connection,
      knowledgeBundleImportOrder(material.bundle),
    );
    const stored = await exportKnowledgeBundle(connection, material.spaceId);
    if (canonicalKnowledgeJson(stored) !== canonicalKnowledgeJson(material.bundle)) {
      fail("database did not converge to the finalized public bundle");
    }

    await connection.query(
      `INSERT INTO knowledge_replication_packages(
         checkpoint_id,network_id,space_id,sequence,previous_checkpoint_id,
         package_sha256,bundle_sha256,validator_set_digest,authorization_kind,
         governance_decision_digest
       ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        checkpointId,
        material.networkId,
        material.spaceId,
        statement.sequence,
        statement.previousCheckpointId,
        packageSha256,
        bundleSha256,
        material.finality.validatorSetDigest,
        statement.authorization.kind,
        statement.governanceDecisionDigest,
      ],
    );
    if (head) {
      await connection.query(
        `UPDATE knowledge_replication_heads SET
           sequence=$1,previous_checkpoint_id=$2,checkpoint_id=$3,
           package_sha256=$4,bundle_sha256=$5,validator_set_digest=$6,
           governance_decision_digest=$7,accepted_at=now()
         WHERE network_id=$8 AND space_id=$9`,
        [
          statement.sequence,
          statement.previousCheckpointId,
          checkpointId,
          packageSha256,
          bundleSha256,
          material.finality.validatorSetDigest,
          statement.governanceDecisionDigest,
          material.networkId,
          material.spaceId,
        ],
      );
    } else {
      await connection.query(
        `INSERT INTO knowledge_replication_heads(
           network_id,space_id,sequence,previous_checkpoint_id,checkpoint_id,
           package_sha256,bundle_sha256,validator_set_digest,
           governance_decision_digest
         ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          material.networkId,
          material.spaceId,
          statement.sequence,
          statement.previousCheckpointId,
          checkpointId,
          packageSha256,
          bundleSha256,
          material.finality.validatorSetDigest,
          statement.governanceDecisionDigest,
        ],
      );
    }
    await connection.query("COMMIT");
    return {
      status: "accepted",
      networkId: material.networkId,
      spaceId: material.spaceId,
      sequence: statement.sequence,
      checkpointId,
      packageSha256,
      bundleSha256,
      counts,
    };
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release?.();
  }
}
