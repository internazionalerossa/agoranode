import {
  createHash,
  createPublicKey,
  verify as verifyEd25519,
} from "node:crypto";
import {
  canonicalKnowledgeHash,
  canonicalKnowledgeJson,
} from "../app/lib/knowledge-model";
import type { KnowledgeBundle } from "./knowledge";
import {
  KnowledgeReplicationError,
  validateKnowledgeBundle,
} from "./knowledge-replication";

export const REPLICATION_VALIDATOR_SET_FORMAT =
  "org.agoranode.replication-validator-set.v1" as const;
export const REPLICATION_FINALITY_STATEMENT_FORMAT =
  "org.agoranode.knowledge-finalization-statement.v1" as const;
export const REPLICATION_FINALITY_CERTIFICATE_FORMAT =
  "org.agoranode.knowledge-finalization-certificate.v1" as const;
export const KNOWLEDGE_REPLICATION_PACKAGE_FORMAT =
  "org.agoranode.knowledge-replication-package.v1" as const;
const REPLICATION_CHECKPOINT_FORMAT =
  "org.agoranode.knowledge-checkpoint.v1" as const;
export const REPLICATION_FINALITY_PROTOCOL_VERSION = 1 as const;
export const REPLICATION_GENESIS_PREVIOUS = null;

const FINALITY_DOMAIN = Buffer.from(
  "AGORANODE-KNOWLEDGE-FINALITY-V1\0",
  "utf8",
);
const DIGEST = /^sha256:[0-9a-f]{64}$/;
const IDENTIFIER = /^[a-z0-9][a-z0-9._:-]{2,127}$/;
const SIGNATURE = /^[A-Za-z0-9_-]{86}$/;
const PUBLIC_KEY = /^[A-Za-z0-9_-]{40,512}$/;
const MAX_VALIDATORS = 10_000;

export type ReplicationValidator = {
  id: string;
  keyId: `sha256:${string}`;
  publicKeySpki: string;
};

export type ReplicationValidatorSet = {
  format: typeof REPLICATION_VALIDATOR_SET_FORMAT;
  protocolVersion: typeof REPLICATION_FINALITY_PROTOCOL_VERSION;
  networkId: string;
  spaceId: string;
  epoch: number;
  validators: readonly ReplicationValidator[];
};

export type ReplicationAuthorization =
  | {
      kind: "legacy-bootstrap";
      source: "repository-review";
    }
  | {
      kind: "governance-decision";
      decisionDigest: `sha256:${string}`;
    };

export type ReplicationFinalityStatement = {
  format: typeof REPLICATION_FINALITY_STATEMENT_FORMAT;
  protocolVersion: typeof REPLICATION_FINALITY_PROTOCOL_VERSION;
  networkId: string;
  spaceId: string;
  sequence: number;
  previousCheckpointId: `sha256:${string}` | null;
  bundleSha256: `sha256:${string}`;
  governanceDecisionDigest: `sha256:${string}` | null;
  authorization: ReplicationAuthorization;
};

export type ReplicationFinalitySignature = {
  validatorId: string;
  keyId: `sha256:${string}`;
  signature: string;
};

export type ReplicationFinalityCertificate = {
  format: typeof REPLICATION_FINALITY_CERTIFICATE_FORMAT;
  protocolVersion: typeof REPLICATION_FINALITY_PROTOCOL_VERSION;
  statement: ReplicationFinalityStatement;
  statementDigest: `sha256:${string}`;
  validatorSetDigest: `sha256:${string}`;
  signatures: readonly ReplicationFinalitySignature[];
};

export type KnowledgeReplicationPackage = {
  format: typeof KNOWLEDGE_REPLICATION_PACKAGE_FORMAT;
  networkId: string;
  spaceId: string;
  bundle: KnowledgeBundle;
  finality: ReplicationFinalityCertificate;
  sha256: string;
};

export type GovernanceAuthorizationVerifier = (input: {
  networkId: string;
  spaceId: string;
  bundle: KnowledgeBundle;
  decisionDigest: `sha256:${string}`;
  sequence: number;
  previousCheckpointId: `sha256:${string}`;
}) => boolean | Promise<boolean>;

type FinalityOptions = {
  validatorSet: unknown;
  allowLegacyBootstrap?: boolean;
  verifyGovernanceAuthorization?: GovernanceAuthorizationVerifier;
};

function fail(message: string): never {
  throw new KnowledgeReplicationError(message);
}

function plainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    fail(`${label} has unknown or missing fields`);
  }
}

function identifier(value: unknown, label: string) {
  if (typeof value !== "string" || !IDENTIFIER.test(value)) {
    fail(`${label} is invalid`);
  }
  return value;
}

function digest(value: unknown, label: string): `sha256:${string}` {
  if (typeof value !== "string" || !DIGEST.test(value)) fail(`${label} is invalid`);
  return value as `sha256:${string}`;
}

function decodePublicKey(value: unknown) {
  if (typeof value !== "string" || !PUBLIC_KEY.test(value)) {
    fail("validator public key encoding is invalid");
  }
  const bytes = Buffer.from(value, "base64url");
  if (bytes.toString("base64url") !== value || bytes.length > 384) {
    fail("validator public key encoding is not canonical");
  }
  let key: ReturnType<typeof createPublicKey>;
  try {
    key = createPublicKey({ key: bytes, format: "der", type: "spki" });
  } catch {
    fail("validator public key cannot be parsed");
  }
  if (key.asymmetricKeyType !== "ed25519") {
    fail("validator public key is not Ed25519");
  }
  return { bytes, key };
}

function keyId(bytes: Buffer): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export function parseReplicationValidatorSet(value: unknown): ReplicationValidatorSet {
  if (!plainObject(value)) fail("validator set is not an object");
  exactKeys(
    value,
    ["format", "protocolVersion", "networkId", "spaceId", "epoch", "validators"],
    "validator set",
  );
  if (
    value.format !== REPLICATION_VALIDATOR_SET_FORMAT ||
    value.protocolVersion !== REPLICATION_FINALITY_PROTOCOL_VERSION
  ) {
    fail("validator set format is unsupported");
  }
  const networkId = identifier(value.networkId, "validator network ID");
  const spaceId = identifier(value.spaceId, "validator space ID");
  if (!Number.isSafeInteger(value.epoch) || Number(value.epoch) < 0) {
    fail("validator epoch is invalid");
  }
  if (
    !Array.isArray(value.validators) ||
    value.validators.length < 4 ||
    value.validators.length > MAX_VALIDATORS ||
    (value.validators.length - 1) % 3 !== 0
  ) {
    fail("validator set size must be exactly 3f+1 and at least four");
  }
  const validators: ReplicationValidator[] = [];
  let previousId: string | null = null;
  const seenKeys = new Set<string>();
  for (const candidate of value.validators) {
    if (!plainObject(candidate)) fail("validator is not an object");
    exactKeys(candidate, ["id", "keyId", "publicKeySpki"], "validator");
    const id = identifier(candidate.id, "validator ID");
    if (previousId !== null && previousId >= id) {
      fail("validators must be unique and sorted by ID");
    }
    previousId = id;
    const publicKey = decodePublicKey(candidate.publicKeySpki);
    const expectedKeyId = keyId(publicKey.bytes);
    const candidateKeyId = digest(candidate.keyId, "validator key ID");
    if (candidateKeyId !== expectedKeyId) {
      fail("validator key ID does not match its Ed25519 public key");
    }
    if (seenKeys.has(candidateKeyId)) fail("validator key is duplicated");
    seenKeys.add(candidateKeyId);
    validators.push({
      id,
      keyId: candidateKeyId,
      publicKeySpki: candidate.publicKeySpki as string,
    });
  }
  return {
    format: REPLICATION_VALIDATOR_SET_FORMAT,
    protocolVersion: REPLICATION_FINALITY_PROTOCOL_VERSION,
    networkId,
    spaceId,
    epoch: Number(value.epoch),
    validators,
  };
}

export async function replicationValidatorSetDigest(
  value: unknown,
): Promise<`sha256:${string}`> {
  const set = parseReplicationValidatorSet(value);
  return `sha256:${await canonicalKnowledgeHash(set)}`;
}

export function parseReplicationFinalityStatement(
  value: unknown,
): ReplicationFinalityStatement {
  if (!plainObject(value)) fail("finality statement is not an object");
  exactKeys(
    value,
    [
      "format",
      "protocolVersion",
      "networkId",
      "spaceId",
      "sequence",
      "previousCheckpointId",
      "bundleSha256",
      "governanceDecisionDigest",
      "authorization",
    ],
    "finality statement",
  );
  if (
    value.format !== REPLICATION_FINALITY_STATEMENT_FORMAT ||
    value.protocolVersion !== REPLICATION_FINALITY_PROTOCOL_VERSION
  ) {
    fail("finality statement format is unsupported");
  }
  const networkId = identifier(value.networkId, "finality network ID");
  const spaceId = identifier(value.spaceId, "finality space ID");
  if (!Number.isSafeInteger(value.sequence) || Number(value.sequence) < 0) {
    fail("finality sequence is invalid");
  }
  const sequence = Number(value.sequence);
  const previousCheckpointId =
    value.previousCheckpointId === null
      ? null
      : digest(value.previousCheckpointId, "previous checkpoint ID");
  const bundleSha256 = digest(value.bundleSha256, "bundle digest");
  const governanceDecisionDigest =
    value.governanceDecisionDigest === null
      ? null
      : digest(value.governanceDecisionDigest, "governance decision digest");
  if (!plainObject(value.authorization)) fail("authorization is not an object");
  let authorization: ReplicationAuthorization;
  if (value.authorization.kind === "legacy-bootstrap") {
    exactKeys(value.authorization, ["kind", "source"], "bootstrap authorization");
    if (value.authorization.source !== "repository-review") {
      fail("bootstrap authorization source is invalid");
    }
    if (
      sequence !== 0 ||
      previousCheckpointId !== null ||
      governanceDecisionDigest !== null
    ) {
      fail("legacy bootstrap is confined to sequence zero");
    }
    authorization = { kind: "legacy-bootstrap", source: "repository-review" };
  } else if (value.authorization.kind === "governance-decision") {
    exactKeys(
      value.authorization,
      ["kind", "decisionDigest"],
      "governance authorization",
    );
    const decisionDigest = digest(
      value.authorization.decisionDigest,
      "authorization decision digest",
    );
    if (
      sequence === 0 ||
      previousCheckpointId === null ||
      governanceDecisionDigest !== decisionDigest
    ) {
      fail("governance authorization does not match the chained statement");
    }
    authorization = { kind: "governance-decision", decisionDigest };
  } else {
    fail("authorization kind is unsupported");
  }
  return {
    format: REPLICATION_FINALITY_STATEMENT_FORMAT,
    protocolVersion: REPLICATION_FINALITY_PROTOCOL_VERSION,
    networkId,
    spaceId,
    sequence,
    previousCheckpointId,
    bundleSha256,
    governanceDecisionDigest,
    authorization,
  };
}

export async function replicationFinalityStatementDigest(
  value: unknown,
): Promise<`sha256:${string}`> {
  const statement = parseReplicationFinalityStatement(value);
  return `sha256:${await canonicalKnowledgeHash(statement)}`;
}

export function replicationFinalityMessage(
  statementValue: unknown,
  validatorSetDigestValue: unknown,
): Uint8Array {
  const statement = parseReplicationFinalityStatement(statementValue);
  const setDigest = digest(validatorSetDigestValue, "validator set digest");
  return Buffer.concat([
    FINALITY_DOMAIN,
    Buffer.from(canonicalKnowledgeJson(statement), "utf8"),
    Buffer.from("\0", "utf8"),
    Buffer.from(setDigest, "ascii"),
  ]);
}

function parseFinalitySignature(value: unknown): ReplicationFinalitySignature {
  if (!plainObject(value)) fail("finality signature is not an object");
  exactKeys(value, ["validatorId", "keyId", "signature"], "finality signature");
  const validatorId = identifier(value.validatorId, "signature validator ID");
  const signatureKeyId = digest(value.keyId, "signature key ID");
  if (typeof value.signature !== "string" || !SIGNATURE.test(value.signature)) {
    fail("finality signature encoding is invalid");
  }
  const bytes = Buffer.from(value.signature, "base64url");
  if (bytes.length !== 64 || bytes.toString("base64url") !== value.signature) {
    fail("finality signature encoding is not canonical Ed25519");
  }
  return {
    validatorId,
    keyId: signatureKeyId,
    signature: value.signature,
  };
}

export async function verifyReplicationFinalityCertificate(
  value: unknown,
  validatorSetValue: unknown,
): Promise<ReplicationFinalityCertificate> {
  const validatorSet = parseReplicationValidatorSet(validatorSetValue);
  if (!plainObject(value)) fail("finality certificate is not an object");
  exactKeys(
    value,
    [
      "format",
      "protocolVersion",
      "statement",
      "statementDigest",
      "validatorSetDigest",
      "signatures",
    ],
    "finality certificate",
  );
  if (
    value.format !== REPLICATION_FINALITY_CERTIFICATE_FORMAT ||
    value.protocolVersion !== REPLICATION_FINALITY_PROTOCOL_VERSION
  ) {
    fail("finality certificate format is unsupported");
  }
  const statement = parseReplicationFinalityStatement(value.statement);
  if (
    statement.networkId !== validatorSet.networkId ||
    statement.spaceId !== validatorSet.spaceId
  ) {
    fail("finality certificate crosses validator network or instance");
  }
  const statementDigest = digest(value.statementDigest, "statement digest");
  if (statementDigest !== (await replicationFinalityStatementDigest(statement))) {
    fail("finality statement digest does not match");
  }
  const validatorSetDigest = digest(value.validatorSetDigest, "validator set digest");
  if (validatorSetDigest !== (await replicationValidatorSetDigest(validatorSet))) {
    fail("finality certificate uses a different validator set");
  }
  if (!Array.isArray(value.signatures)) fail("finality signatures are invalid");
  const signatures = value.signatures.map(parseFinalitySignature);
  const faultTolerance = (validatorSet.validators.length - 1) / 3;
  const required = 2 * faultTolerance + 1;
  if (signatures.length < required || signatures.length > validatorSet.validators.length) {
    fail(`finality certificate requires at least ${required} of ${validatorSet.validators.length} validators`);
  }
  const message = replicationFinalityMessage(statement, validatorSetDigest);
  let previousId: string | null = null;
  for (const signature of signatures) {
    if (previousId !== null && previousId >= signature.validatorId) {
      fail("finality signatures must be unique and sorted by validator ID");
    }
    previousId = signature.validatorId;
    const validator = validatorSet.validators.find(
      (candidate) => candidate.id === signature.validatorId,
    );
    if (!validator || validator.keyId !== signature.keyId) {
      fail("finality signer is not in the frozen validator set");
    }
    const publicKey = decodePublicKey(validator.publicKeySpki).key;
    if (
      !verifyEd25519(
        null,
        message,
        publicKey,
        Buffer.from(signature.signature, "base64url"),
      )
    ) {
      fail("finality signature verification failed");
    }
  }
  return {
    format: REPLICATION_FINALITY_CERTIFICATE_FORMAT,
    protocolVersion: REPLICATION_FINALITY_PROTOCOL_VERSION,
    statement,
    statementDigest,
    validatorSetDigest,
    signatures,
  };
}

export async function replicationCheckpointId(
  certificateValue: unknown,
  validatorSetValue: unknown,
): Promise<`sha256:${string}`> {
  const certificate = await verifyReplicationFinalityCertificate(
    certificateValue,
    validatorSetValue,
  );
  // A checkpoint identifies the finalized statement, not the particular
  // quorum proof that happened to reach this replica.  For a 3f+1 validator
  // set, several different valid 2f+1 signer subsets can certify the same
  // statement; including those signatures here would create artificial forks.
  return `sha256:${await canonicalKnowledgeHash({
    format: REPLICATION_CHECKPOINT_FORMAT,
    protocolVersion: REPLICATION_FINALITY_PROTOCOL_VERSION,
    statementDigest: certificate.statementDigest,
    validatorSetDigest: certificate.validatorSetDigest,
  })}`;
}

/**
 * Validates the public bundle, BFT finality (3f+1 validators, 2f+1 Ed25519
 * signatures), namespace binding and the separate political authorization.
 */
export async function validateKnowledgeReplicationPackage(
  value: unknown,
  options: FinalityOptions,
): Promise<KnowledgeReplicationPackage> {
  if (!plainObject(value)) fail("replication package is not an object");
  exactKeys(
    value,
    ["format", "networkId", "spaceId", "bundle", "finality", "sha256"],
    "replication package",
  );
  if (value.format !== KNOWLEDGE_REPLICATION_PACKAGE_FORMAT) {
    fail("replication package format is unsupported");
  }
  const networkId = identifier(value.networkId, "package network ID");
  const spaceId = identifier(value.spaceId, "package space ID");
  const validatorSet = parseReplicationValidatorSet(options.validatorSet);
  if (networkId !== validatorSet.networkId || spaceId !== validatorSet.spaceId) {
    fail("package crosses the configured validator network or instance");
  }
  const bundle = await validateKnowledgeBundle(value.bundle);
  if (bundle.spaceId !== spaceId) fail("package space does not match its bundle");
  const finality = await verifyReplicationFinalityCertificate(
    value.finality,
    validatorSet,
  );
  const statement = finality.statement;
  if (
    statement.networkId !== networkId ||
    statement.spaceId !== spaceId ||
    statement.bundleSha256 !== `sha256:${bundle.sha256}`
  ) {
    fail("finality statement does not bind this package and bundle");
  }
  if (statement.authorization.kind === "legacy-bootstrap") {
    if (!options.allowLegacyBootstrap) {
      fail("legacy bootstrap was not explicitly trusted by this replica");
    }
  } else {
    if (
      !options.verifyGovernanceAuthorization ||
      !(await options.verifyGovernanceAuthorization({
        networkId,
        spaceId,
        bundle,
        decisionDigest: statement.authorization.decisionDigest,
        sequence: statement.sequence,
        previousCheckpointId: statement.previousCheckpointId!,
      }))
    ) {
      fail("governance authorization is absent or invalid");
    }
  }
  const sha256 = typeof value.sha256 === "string" ? value.sha256 : fail("package SHA-256 is invalid");
  if (!/^[0-9a-f]{64}$/.test(sha256)) fail("package SHA-256 is invalid");
  const body = {
    format: KNOWLEDGE_REPLICATION_PACKAGE_FORMAT,
    networkId,
    spaceId,
    bundle,
    finality,
  } as const;
  if ((await canonicalKnowledgeHash(body)) !== sha256) {
    fail("package SHA-256 does not match its canonical public contents");
  }
  return { ...body, sha256 };
}

export async function serializeKnowledgeReplicationPackage(
  value: unknown,
  options: FinalityOptions,
) {
  const material = await validateKnowledgeReplicationPackage(value, options);
  return `${canonicalKnowledgeJson(material)}\n`;
}
