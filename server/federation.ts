import {
  AGORA_GOVERNANCE_BALLOT_FORMAT,
  AGORA_GOVERNANCE_DECISION_FORMAT,
  AGORA_GOVERNANCE_PROTOCOL_VERSION,
  GOVERNANCE_DECISION_RULES,
  evaluateGovernanceDecision,
  governanceBallotMessage,
  governanceDecisionDigest,
  governanceElectorateSnapshotId,
  isPr3EligiblePr2,
  parsePr2MembershipProof,
  pr3MandateRecordDigest,
  validatePr3MandateTransition,
  type GovernanceBallot,
  type GovernanceDecisionEnvelope,
  type GovernanceQuorumCertificate,
  type Pr2MembershipProof,
  type Pr3MandateRecord,
} from "../app/platform/agora-governance-protocol";
import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";
import type { Connection, Connections } from "./database";
import type { PostgresDatabase } from "./database";

export const AGORA_FEDERATION_NETWORK_ID = "agoranode-main" as const;
export const AGORA_FEDERATION_ID = "agoranode" as const;
export const PR2_NODE_ATTESTATION_FORMAT = "org.agoranode.pr2-node-attestation.v1" as const;

const DIGEST = /^sha256:[0-9a-f]{64}$/;
const IDENTIFIER = /^[a-z0-9][a-z0-9._:-]{2,127}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SIGNATURE = /^[A-Za-z0-9_-]{86}$/;
const MAX_ATTESTATION_LIFETIME_MS = 45 * 24 * 60 * 60 * 1000;
const GENESIS_CHECKPOINT = `sha256:${createHash("sha256").update("AGORANODE-FEDERATION-GENESIS-V1").digest("hex")}` as const;

export type Pr2NodeAttestation = {
  format: typeof PR2_NODE_ATTESTATION_FORMAT;
  protocolVersion: typeof AGORA_GOVERNANCE_PROTOCOL_VERSION;
  networkId: typeof AGORA_FEDERATION_NETWORK_ID;
  subjectUserId: string;
  publicAlias: string;
  proof: Pr2MembershipProof;
  voterKeyId: `sha256:${string}`;
  voterPublicKeySpki: string;
  issuedAt: number;
  issuerKeyId: `sha256:${string}`;
  signature: string;
};

class FederationRequestError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) => {
  const actual = Object.keys(value).sort(), expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) throw new FederationRequestError(400, "Attestazione PR2 non valida.");
};
const text = (value: unknown, minimum: number, maximum: number): value is string => typeof value === "string" && value.trim() === value && value.length >= minimum && value.length <= maximum;
const integer = (value: unknown, minimum: number, maximum: number): value is number => Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum;

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) throw new FederationRequestError(400, "Valore numerico non valido.");
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (!object(value)) throw new FederationRequestError(400, "Valore non serializzabile.");
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

const sha256 = (value: unknown): `sha256:${string}` => `sha256:${createHash("sha256").update(typeof value === "string" ? value : canonicalJson(value)).digest("hex")}`;
const keyBytes = (encoded: string) => {
  if (!/^[A-Za-z0-9_-]{40,500}$/.test(encoded)) throw new FederationRequestError(400, "Chiave pubblica non valida.");
  const bytes = Buffer.from(encoded, "base64url");
  if (bytes.length < 32 || bytes.length > 300 || bytes.toString("base64url") !== encoded) throw new FederationRequestError(400, "Chiave pubblica non valida.");
  return bytes;
};
export const federationPublicKeyId = (spkiBase64url: string): `sha256:${string}` => {
  const bytes = keyBytes(spkiBase64url);
  try {
    if (createPublicKey({ key: bytes, format: "der", type: "spki" }).asymmetricKeyType !== "ed25519") throw Error();
  } catch {
    throw new FederationRequestError(400, "La chiave pubblica deve essere Ed25519.");
  }
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
};

function ed25519Verify(publicKeySpki: string, signature: string, message: Uint8Array) {
  if (!SIGNATURE.test(signature)) return false;
  try {
    const signatureBytes = Buffer.from(signature, "base64url");
    if (signatureBytes.length !== 64 || signatureBytes.toString("base64url") !== signature) return false;
    const publicKey = createPublicKey({ key: keyBytes(publicKeySpki), format: "der", type: "spki" });
    return publicKey.asymmetricKeyType === "ed25519" && verifySignature(null, message, publicKey, signatureBytes);
  } catch { return false; }
}

export function pr2NodeAttestationMessage(value: Omit<Pr2NodeAttestation, "signature"> | Pr2NodeAttestation): Uint8Array {
  const { signature: _signature, ...unsigned } = value as Pr2NodeAttestation;
  return new TextEncoder().encode(`AGORANODE-PR2-NODE-ATTESTATION-V1\0${canonicalJson(unsigned)}`);
}

function parseAttestation(value: unknown, userId: string, now: number): Pr2NodeAttestation {
  if (!object(value)) throw new FederationRequestError(400, "Attestazione PR2 non valida.");
  exactKeys(value, ["format", "protocolVersion", "networkId", "subjectUserId", "publicAlias", "proof", "voterKeyId", "voterPublicKeySpki", "issuedAt", "issuerKeyId", "signature"]);
  if (value.format !== PR2_NODE_ATTESTATION_FORMAT || value.protocolVersion !== AGORA_GOVERNANCE_PROTOCOL_VERSION || value.networkId !== AGORA_FEDERATION_NETWORK_ID) throw new FederationRequestError(403, "Attestazione destinata a un'altra federazione.");
  if (value.subjectUserId !== userId || !text(value.subjectUserId, 1, 200)) throw new FederationRequestError(403, "L'attestazione non appartiene a questo account PR1.");
  if (!text(value.publicAlias, 2, 80) || typeof value.voterKeyId !== "string" || !DIGEST.test(value.voterKeyId) || typeof value.voterPublicKeySpki !== "string" || typeof value.issuerKeyId !== "string" || !DIGEST.test(value.issuerKeyId) || typeof value.signature !== "string" || !SIGNATURE.test(value.signature) || !integer(value.issuedAt, 0, Number.MAX_SAFE_INTEGER)) throw new FederationRequestError(400, "Attestazione PR2 non valida.");
  let proof: Pr2MembershipProof;
  try { proof = parsePr2MembershipProof(value.proof); } catch { throw new FederationRequestError(400, "Prova PR2 non valida."); }
  if (proof.networkId !== AGORA_FEDERATION_NETWORK_ID || !isPr3EligiblePr2(proof, now, AGORA_FEDERATION_NETWORK_ID) || proof.validUntil === null) throw new FederationRequestError(403, "La credenziale PR2 non è attiva in questa federazione.");
  if (Number(value.issuedAt) > now + 5 * 60_000 || Number(value.issuedAt) < proof.validFrom || proof.validUntil - Number(value.issuedAt) > MAX_ATTESTATION_LIFETIME_MS) throw new FederationRequestError(403, "La validità dell'attestazione PR2 non è accettabile.");
  if (federationPublicKeyId(value.voterPublicKeySpki) !== value.voterKeyId) throw new FederationRequestError(400, "La chiave di voto non corrisponde al suo identificatore.");
  return { ...value, proof } as Pr2NodeAttestation;
}

async function transaction<T>(pool: Connections, operation: (connection: Connection) => Promise<T>): Promise<T> {
  const connection = await pool.connect();
  try {
    await connection.query("BEGIN");
    await connection.query("SELECT pg_advisory_xact_lock(194733,3)");
    const result = await operation(connection);
    await connection.query("COMMIT");
    return result;
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally { connection.release?.(); }
}

export async function admitFederationNode(pool: Connections, input: {nodeId: string; displayName: string; publicKeySpki: string; admittedByDecisionDigest: string; admittedAt: number; validUntil?: number | null}) {
  if (!IDENTIFIER.test(input.nodeId) || !text(input.displayName, 2, 120) || !DIGEST.test(input.admittedByDecisionDigest) || !integer(input.admittedAt, 0, Number.MAX_SAFE_INTEGER) || (input.validUntil !== undefined && input.validUntil !== null && (!integer(input.validUntil, input.admittedAt + 1, Number.MAX_SAFE_INTEGER)))) throw new FederationRequestError(400, "Dati del nodo federato non validi.");
  const keyId = federationPublicKeyId(input.publicKeySpki);
  await transaction(pool, async connection => {
    await connection.query("INSERT INTO federation_nodes(node_id,display_name,admitted_by_decision_digest,admitted_at) VALUES($1,$2,$3,$4)", [input.nodeId, input.displayName, input.admittedByDecisionDigest, input.admittedAt]);
    await connection.query("INSERT INTO federation_node_keys(node_id,key_id,public_key_spki_base64,valid_from,valid_until,admitted_by_decision_digest) VALUES($1,$2,$3,$4,$5,$6)", [input.nodeId, keyId, input.publicKeySpki, input.admittedAt, input.validUntil ?? null, input.admittedByDecisionDigest]);
  });
  return { nodeId: input.nodeId, keyId };
}

async function acceptAttestation(pool: Connections, value: unknown, userId: string, now: number) {
  const attestation = parseAttestation(value, userId, now), proof = attestation.proof;
  const unsignedMessage = pr2NodeAttestationMessage(attestation);
  const serialized = canonicalJson(attestation), attestationSha256 = sha256(serialized);
  return transaction(pool, async connection => {
    const replay = await connection.query("SELECT 1 FROM federation_pr2_attestations WHERE attestation_sha256=$1", [attestationSha256]);
    if (replay.rows.length) throw new FederationRequestError(409, "Questa attestazione PR2 è già stata utilizzata.");
    const issuer = await connection.query("SELECT k.public_key_spki_base64 FROM federation_nodes n JOIN federation_node_keys k ON k.node_id=n.node_id WHERE n.node_id=$1 AND k.key_id=$2 AND n.admitted_at<=$3 AND k.valid_from<=$3 AND (k.valid_until IS NULL OR k.valid_until>$3)", [proof.nodeId, attestation.issuerKeyId, attestation.issuedAt]);
    if (!issuer.rows.length || !ed25519Verify(String(issuer.rows[0].public_key_spki_base64), attestation.signature, unsignedMessage)) throw new FederationRequestError(403, "La firma del nodo di origine non è valida o il nodo non è ammesso.");
    const existing = await connection.query("SELECT * FROM federation_pr2_electors WHERE owner_key=$1", [userId]);
    if (existing.rows.length) {
      const row = existing.rows[0];
      if (row.actor_id !== proof.actorId || row.source_node_id !== proof.nodeId || row.source_membership_id !== proof.membershipId || row.voter_key_id !== attestation.voterKeyId || row.voter_public_key_spki_base64 !== attestation.voterPublicKeySpki || row.public_alias !== attestation.publicAlias) throw new FederationRequestError(409, "Questo account PR1 è già collegato a un'altra identità federale.");
    } else {
      await connection.query("INSERT INTO federation_pr2_electors(owner_key,actor_id,source_node_id,source_membership_id,voter_key_id,voter_public_key_spki_base64,public_alias,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)", [userId, proof.actorId, proof.nodeId, proof.membershipId, attestation.voterKeyId, attestation.voterPublicKeySpki, attestation.publicAlias, now]);
    }
    await connection.query("INSERT INTO federation_pr2_attestations(attestation_sha256,owner_key,source_node_id,source_membership_id,issuer_key_id,proof_json,attestation_json,valid_from,valid_until,accepted_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", [attestationSha256, userId, proof.nodeId, proof.membershipId, attestation.issuerKeyId, canonicalJson(proof), serialized, proof.validFrom, proof.validUntil, now]);
    return { ok: true, attestationSha256, actorId: proof.actorId, sourceNodeId: proof.nodeId, publicAlias: attestation.publicAlias, validUntil: proof.validUntil };
  });
}

type ElectorRow = {owner_key: string; actor_id: string; voter_key_id: string; voter_public_key_spki_base64: string; source_attestation_sha256: string};
type DecisionRow = Record<string, unknown> & {decision_id: string; kind: "pr3-election" | "pr3-recall"; candidate_owner_key: string; candidate_actor_id: string; source_node_id: string; source_membership_id: string; source_attestation_sha256: string; target_mandate_id: string | null; term_days: number; opens_at: number; closes_at: number; proposal_sha256: string; envelope_sha256: string; envelope_json: string};

async function currentAttestation(connection: Connection, ownerKey: string, attestationSha256: string, at: number, through: number) {
  const result = await connection.query("SELECT e.*,a.proof_json,a.valid_from,a.valid_until,a.attestation_sha256 FROM federation_pr2_electors e JOIN federation_pr2_attestations a ON a.owner_key=e.owner_key WHERE e.owner_key=$1 AND a.attestation_sha256=$2 AND a.valid_from<=$3 AND a.valid_until>$4", [ownerKey, attestationSha256, at, through]);
  if (!result.rows.length) throw new FederationRequestError(403, "Serve una credenziale PR2 valida per tutta la votazione.");
  return result.rows[0];
}

async function frozenElectorate(connection: Connection, at: number, through: number): Promise<ElectorRow[]> {
  const result = await connection.query(`SELECT DISTINCT ON (e.owner_key)
    e.owner_key,e.actor_id,e.voter_key_id,e.voter_public_key_spki_base64,a.attestation_sha256 AS source_attestation_sha256
    FROM federation_pr2_electors e JOIN federation_pr2_attestations a ON a.owner_key=e.owner_key
    WHERE a.valid_from<=$1 AND a.valid_until>$2
    ORDER BY e.owner_key,a.valid_until DESC,a.accepted_at DESC,a.attestation_sha256 DESC`, [at, through]);
  return result.rows as ElectorRow[];
}

async function insertMandateRecord(connection: Connection, record: Pr3MandateRecord, ownerKey: string, sequence: number) {
  const digest = await pr3MandateRecordDigest(record);
  await connection.query("INSERT INTO federation_pr3_mandate_records(record_digest,mandate_id,sequence,actor_id,owner_key,state,transition_at,previous_record_digest,election_decision_digest,record_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", [digest, record.mandateId, sequence, record.actorId, ownerKey, record.state, record.transitionAt, record.previousRecordDigest, record.electionDecisionDigest, canonicalJson(record)]);
  return digest;
}

async function createDecision(pool: Connections, data: Record<string, unknown>, userId: string, now: number, kind: "pr3-election" | "pr3-recall") {
  if (!UUID.test(String(data.requestId)) || !text(data.title, 3, 140) || !text(data.statement, 20, 30000) || typeof data.credentialSha256 !== "string" || !DIGEST.test(data.credentialSha256) || !integer(data.discussionHours, 1, 168) || !integer(data.votingHours, 1, 720)) throw new FederationRequestError(400, "Controlla candidatura, tempi e credenziale PR2.");
  if (kind === "pr3-election" && !integer(data.termDays, 30, 365)) throw new FederationRequestError(400, "Il mandato PR3 deve durare da 30 a 365 giorni.");
  if (kind === "pr3-recall" && (typeof data.mandateId !== "string" || !DIGEST.test(data.mandateId))) throw new FederationRequestError(400, "Mandato da richiamare non valido.");
  const opensAt = now + Number(data.discussionHours) * 3600000, closesAt = opensAt + Number(data.votingHours) * 3600000;
  return transaction(pool, async connection => {
    const requester = await currentAttestation(connection, userId, String(data.credentialSha256), now, closesAt);
    let candidate = requester, mandateId: string, candidateOwnerKey = userId;
    if (kind === "pr3-recall") {
      const pendingRecall = await connection.query("SELECT 1 FROM federation_pr3_decisions d LEFT JOIN federation_pr3_certificates c ON c.decision_id=d.decision_id WHERE d.kind='pr3-recall' AND d.target_mandate_id=$1 AND c.decision_id IS NULL LIMIT 1", [data.mandateId]);
      if (pendingRecall.rows.length) throw new FederationRequestError(409, "Esiste già una procedura di richiamo aperta per questo mandato.");
      const latest = await connection.query("SELECT * FROM federation_pr3_mandate_records WHERE mandate_id=$1 ORDER BY sequence DESC LIMIT 1", [data.mandateId]);
      if (!latest.rows.length || !["elected", "active"].includes(String(latest.rows[0].state))) throw new FederationRequestError(409, "Il mandato non è attivo o è già terminato.");
      const record = JSON.parse(String(latest.rows[0].record_json)) as Pr3MandateRecord;
      if (record.expiresAt === null || now >= record.expiresAt) throw new FederationRequestError(409, "Il mandato è già scaduto.");
      if (closesAt >= record.expiresAt) throw new FederationRequestError(409, "La votazione di richiamo deve chiudersi prima della scadenza del mandato.");
      mandateId = String(data.mandateId);
      candidateOwnerKey = String(latest.rows[0].owner_key);
      const election = await connection.query("SELECT e.*,a.proof_json,a.attestation_sha256 FROM federation_pr2_electors e JOIN federation_pr2_attestations a ON a.owner_key=e.owner_key WHERE e.owner_key=$1 AND e.actor_id=$2 ORDER BY a.accepted_at DESC LIMIT 1", [candidateOwnerKey, record.actorId]);
      if (!election.rows.length) throw new FederationRequestError(409, "Origine del mandato non disponibile.");
      candidate = election.rows[0];
    } else {
      const pendingElection = await connection.query("SELECT 1 FROM federation_pr3_decisions d LEFT JOIN federation_pr3_certificates c ON c.decision_id=d.decision_id WHERE d.kind='pr3-election' AND d.candidate_owner_key=$1 AND c.decision_id IS NULL LIMIT 1", [userId]);
      if (pendingElection.rows.length) throw new FederationRequestError(409, "Hai già una candidatura PR3 non conclusa.");
      const already = await connection.query("SELECT record_json FROM federation_pr3_mandate_records WHERE owner_key=$1 ORDER BY transition_at DESC,sequence DESC LIMIT 1", [userId]);
      if (already.rows.length) {
        const record = JSON.parse(String(already.rows[0].record_json)) as Pr3MandateRecord;
        if (["elected", "active"].includes(record.state) && record.expiresAt !== null && record.expiresAt > now) throw new FederationRequestError(409, "Esiste già un mandato PR3 non terminato per questa persona.");
      }
      mandateId = sha256({ format: "org.agoranode.pr3-mandate-id.v1", networkId: AGORA_FEDERATION_NETWORK_ID, decisionId: data.requestId, actorId: requester.actor_id });
    }
    const rule = GOVERNANCE_DECISION_RULES[kind].chambers.members!;
    const electorate = await frozenElectorate(connection, now, closesAt);
    if (electorate.length < rule.minimumEligible) throw new FederationRequestError(409, `Servono almeno ${rule.minimumEligible} PR2 federali con credenziale valida per aprire questa votazione.`);
    const proposal = { format: "org.agoranode.pr3-proposal.v1", kind, decisionId: data.requestId, mandateId, candidateActorId: candidate.actor_id, sourceNodeId: candidate.source_node_id, sourceMembershipId: candidate.source_membership_id, title: data.title, statement: data.statement, termDays: kind === "pr3-election" ? Number(data.termDays) : 0, createdAt: now };
    const proposalSha256 = sha256(proposal);
    const previous = await connection.query("SELECT sequence,envelope_sha256 FROM federation_pr3_decisions ORDER BY sequence DESC LIMIT 1");
    const sequence = previous.rows.length ? Number(previous.rows[0].sequence) + 1 : 1;
    const actors = electorate.map(row => ({ id: row.actor_id, keyId: row.voter_key_id as `sha256:${string}` })).sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
    const envelope: GovernanceDecisionEnvelope = {
      format: AGORA_GOVERNANCE_DECISION_FORMAT, protocolVersion: AGORA_GOVERNANCE_PROTOCOL_VERSION,
      networkId: AGORA_FEDERATION_NETWORK_ID, scope: { kind: "federation", id: AGORA_FEDERATION_ID }, decisionClass: kind,
      sequence, baseCheckpointId: (previous.rows[0]?.envelope_sha256 ?? GENESIS_CHECKPOINT) as `sha256:${string}`,
      proposalSha256, proposalPath: `/governance/pr3/${data.requestId}`, opensAt, closesAt, appealClosesAt: closesAt,
      electorates: { members: { snapshotId: await governanceElectorateSnapshotId("members", actors), actors }, nodes: null },
    };
    const envelopeSha256 = await governanceDecisionDigest(envelope);
    await connection.query("INSERT INTO federation_pr3_decisions(decision_id,sequence,kind,candidate_owner_key,candidate_actor_id,source_node_id,source_membership_id,source_attestation_sha256,target_mandate_id,requester_actor_id,title,statement,term_days,created_at,opens_at,closes_at,proposal_sha256,envelope_sha256,envelope_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)", [data.requestId, sequence, kind, candidateOwnerKey, candidate.actor_id, candidate.source_node_id, candidate.source_membership_id, candidate.attestation_sha256, kind === "pr3-recall" ? mandateId : null, requester.actor_id, data.title, data.statement, kind === "pr3-election" ? data.termDays : 0, now, opensAt, closesAt, proposalSha256, envelopeSha256, canonicalJson(envelope)]);
    for (const elector of electorate) await connection.query("INSERT INTO federation_pr3_electorate(decision_id,owner_key,actor_id,voter_key_id,voter_public_key_spki_base64,source_attestation_sha256) VALUES($1,$2,$3,$4,$5,$6)", [data.requestId, elector.owner_key, elector.actor_id, elector.voter_key_id, elector.voter_public_key_spki_base64, elector.source_attestation_sha256]);
    if (kind === "pr3-election") {
      const proof = parsePr2MembershipProof(JSON.parse(String(candidate.proof_json)));
      const nomination: Pr3MandateRecord = { format: "org.agoranode.pr3-mandate-record.v1", protocolVersion: 1, networkId: AGORA_FEDERATION_NETWORK_ID, mandateId: mandateId as `sha256:${string}`, actorId: String(candidate.actor_id), federationId: AGORA_FEDERATION_ID, sourceNodeId: String(candidate.source_node_id), sourceMembershipId: String(candidate.source_membership_id) as `sha256:${string}`, candidacySha256: proposalSha256, state: "nominated", transitionAt: now, previousRecordDigest: null, electionDecisionDigest: null, startsAt: null, expiresAt: null, evidenceSha256: proposalSha256 };
      await validatePr3MandateTransition(null, nomination, { now, sourceMembership: proof });
      const nominationDigest = await insertMandateRecord(connection, nomination, userId, 0);
      const candidacy = { ...nomination, state: "candidate", transitionAt: now + 1, previousRecordDigest: nominationDigest } as Pr3MandateRecord;
      await validatePr3MandateTransition(nomination, candidacy, { now: now + 1, sourceMembership: proof, verifyActorConsent: async () => true });
      await insertMandateRecord(connection, candidacy, userId, 1);
    }
    return { ok: true, decisionId: data.requestId, mandateId, proposalSha256, decisionDigest: envelopeSha256, envelope };
  });
}

async function castBallot(pool: Connections, data: Record<string, unknown>, userId: string, now: number) {
  if (!UUID.test(String(data.id)) || !["yes", "no", "abstain"].includes(String(data.choice)) || typeof data.signature !== "string" || !SIGNATURE.test(data.signature)) throw new FederationRequestError(400, "Scheda federale non valida.");
  return transaction(pool, async connection => {
    const decision = await connection.query("SELECT * FROM federation_pr3_decisions WHERE decision_id=$1", [data.id]);
    if (!decision.rows.length) throw new FederationRequestError(404, "Votazione non disponibile.");
    const row = decision.rows[0] as DecisionRow;
    if (now < Number(row.opens_at) || now >= Number(row.closes_at)) throw new FederationRequestError(409, "La votazione non è aperta.");
    const elector = await connection.query("SELECT * FROM federation_pr3_electorate WHERE decision_id=$1 AND owner_key=$2", [data.id, userId]);
    if (!elector.rows.length) throw new FederationRequestError(403, "Non appartieni all'elettorato PR2 congelato per questa votazione.");
    const voter = elector.rows[0];
    const ballot: GovernanceBallot = { format: AGORA_GOVERNANCE_BALLOT_FORMAT, protocolVersion: AGORA_GOVERNANCE_PROTOCOL_VERSION, decisionDigest: String(row.envelope_sha256) as `sha256:${string}`, chamber: "members", voterId: String(voter.actor_id), choice: data.choice as "yes" | "no" | "abstain", keyId: String(voter.voter_key_id) as `sha256:${string}`, mandateDecisionDigest: null, signature: String(data.signature) };
    if (!ed25519Verify(String(voter.voter_public_key_spki_base64), ballot.signature, governanceBallotMessage(ballot))) throw new FederationRequestError(403, "Firma della scheda non valida.");
    const ballotSha256 = sha256(ballot);
    const inserted = await connection.query("INSERT INTO federation_pr3_ballots(decision_id,owner_key,ballot_sha256,ballot_json,cast_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING", [data.id, userId, ballotSha256, canonicalJson(ballot), now]);
    if (!inserted.rowCount && !inserted.affectedRows) throw new FederationRequestError(409, "Hai già espresso una scheda in questa votazione.");
    return { ok: true, receipt: ballotSha256 };
  });
}

async function latestMandate(connection: Connection, mandateId: string) {
  const result = await connection.query("SELECT * FROM federation_pr3_mandate_records WHERE mandate_id=$1 ORDER BY sequence DESC LIMIT 1", [mandateId]);
  if (!result.rows.length) throw new FederationRequestError(404, "Mandato non disponibile.");
  return { row: result.rows[0], record: JSON.parse(String(result.rows[0].record_json)) as Pr3MandateRecord };
}

async function finalizeDecision(pool: Connections, data: Record<string, unknown>, now: number) {
  if (!UUID.test(String(data.id))) throw new FederationRequestError(400, "Votazione non valida.");
  return transaction(pool, async connection => {
    if ((await connection.query("SELECT 1 FROM federation_pr3_certificates WHERE decision_id=$1", [data.id])).rows.length) throw new FederationRequestError(409, "Questa decisione è già stata finalizzata.");
    const found = await connection.query("SELECT * FROM federation_pr3_decisions WHERE decision_id=$1", [data.id]);
    if (!found.rows.length) throw new FederationRequestError(404, "Votazione non disponibile.");
    const decision = found.rows[0] as DecisionRow;
    if (now < Number(decision.closes_at)) throw new FederationRequestError(409, "La votazione non è ancora chiusa.");
    const electorate = await connection.query("SELECT voter_key_id,voter_public_key_spki_base64 FROM federation_pr3_electorate WHERE decision_id=$1", [data.id]);
    const publicKeys = new Map(electorate.rows.map(row => [String(row.voter_key_id), String(row.voter_public_key_spki_base64)]));
    const ballots = (await connection.query("SELECT ballot_json FROM federation_pr3_ballots WHERE decision_id=$1 ORDER BY ballot_sha256", [data.id])).rows.map(row => JSON.parse(String(row.ballot_json)));
    const certificate = await evaluateGovernanceDecision(JSON.parse(String(decision.envelope_json)), ballots, { now, verifySignature: ({ keyId, signature, message }) => { const key = publicKeys.get(keyId); return Boolean(key && ed25519Verify(key, signature, message)); } });
    await connection.query("INSERT INTO federation_pr3_certificates(decision_id,decision_digest,outcome,certificate_json,finalized_at) VALUES($1,$2,$3,$4,$5)", [data.id, certificate.decisionDigest, certificate.outcome, canonicalJson(certificate), now]);
    let mandate: Pr3MandateRecord | null = null;
    if (certificate.outcome === "approved" && decision.kind === "pr3-election") {
      const head = await latestMandate(connection, sha256({ format: "org.agoranode.pr3-mandate-id.v1", networkId: AGORA_FEDERATION_NETWORK_ID, decisionId: decision.decision_id, actorId: decision.candidate_actor_id }));
      const proofRow = await connection.query("SELECT proof_json FROM federation_pr2_attestations WHERE attestation_sha256=$1", [decision.source_attestation_sha256]);
      const proof = parsePr2MembershipProof(JSON.parse(String(proofRow.rows[0].proof_json)));
      mandate = { ...head.record, state: "elected", transitionAt: Number(decision.closes_at), previousRecordDigest: String(head.row.record_digest) as `sha256:${string}`, electionDecisionDigest: certificate.decisionDigest, startsAt: Number(decision.closes_at), expiresAt: Number(decision.closes_at) + Number(decision.term_days) * 86400000, evidenceSha256: certificate.ballotsSha256 };
      await validatePr3MandateTransition(head.record, mandate, { now, sourceMembership: proof, authorizationCertificate: certificate });
      await insertMandateRecord(connection, mandate, decision.candidate_owner_key, Number(head.row.sequence) + 1);
    } else if (certificate.outcome === "approved" && decision.kind === "pr3-recall") {
      const head = await latestMandate(connection, String(decision.target_mandate_id));
      const proofRow = await connection.query("SELECT proof_json FROM federation_pr2_attestations WHERE attestation_sha256=(SELECT source_attestation_sha256 FROM federation_pr3_decisions WHERE envelope_sha256=$1)", [head.record.electionDecisionDigest]);
      let proof: Pr2MembershipProof;
      if (proofRow.rows.length) proof = parsePr2MembershipProof(JSON.parse(String(proofRow.rows[0].proof_json)));
      else {
        const fallback = await connection.query("SELECT proof_json FROM federation_pr2_attestations WHERE source_node_id=$1 AND source_membership_id=$2 ORDER BY accepted_at DESC LIMIT 1", [head.record.sourceNodeId, head.record.sourceMembershipId]);
        if (!fallback.rows.length) throw new FederationRequestError(409, "Prova PR2 di origine non disponibile.");
        proof = parsePr2MembershipProof(JSON.parse(String(fallback.rows[0].proof_json)));
      }
      const recalled: Pr3MandateRecord = { ...head.record, state: "recalled", transitionAt: now, previousRecordDigest: String(head.row.record_digest) as `sha256:${string}`, evidenceSha256: String(decision.proposal_sha256) as `sha256:${string}` };
      await validatePr3MandateTransition(head.record, recalled, { now, sourceMembership: proof, authorizationCertificate: certificate });
      await insertMandateRecord(connection, recalled, String(head.row.owner_key), Number(head.row.sequence) + 1);
      mandate = recalled;
    }
    return { ok: true, certificate, mandate };
  });
}

async function transitionMandate(pool: Connections, data: Record<string, unknown>, userId: string, now: number, state: "active" | "expired") {
  if (typeof data.mandateId !== "string" || !DIGEST.test(data.mandateId)) throw new FederationRequestError(400, "Mandato non valido.");
  return transaction(pool, async connection => {
    const head = await latestMandate(connection, data.mandateId as string);
    if (state === "active" && String(head.row.owner_key) !== userId) throw new FederationRequestError(403, "Solo la persona eletta può accettare il mandato.");
    const proofResult = await connection.query(
      state === "active"
        ? "SELECT proof_json FROM federation_pr2_attestations WHERE source_node_id=$1 AND source_membership_id=$2 AND valid_from<=$3 AND valid_until>$3 ORDER BY valid_until DESC,accepted_at DESC LIMIT 1"
        : "SELECT proof_json FROM federation_pr2_attestations WHERE source_node_id=$1 AND source_membership_id=$2 ORDER BY accepted_at DESC LIMIT 1",
      state === "active"
        ? [head.record.sourceNodeId, head.record.sourceMembershipId, now]
        : [head.record.sourceNodeId, head.record.sourceMembershipId],
    );
    if (!proofResult.rows.length) throw new FederationRequestError(409, "Prova PR2 di origine non disponibile.");
    const proof = parsePr2MembershipProof(JSON.parse(String(proofResult.rows[0].proof_json)));
    const evidenceSha256 = sha256({ format: `org.agoranode.pr3-${state}-consent.v1`, mandateId: data.mandateId, actorId: head.record.actorId, at: now });
    const next = { ...head.record, state, transitionAt: now, previousRecordDigest: String(head.row.record_digest) as `sha256:${string}`, evidenceSha256 } as Pr3MandateRecord;
    await validatePr3MandateTransition(head.record, next, { now, sourceMembership: proof, verifyActorConsent: async () => state === "active" && String(head.row.owner_key) === userId });
    const digest = await insertMandateRecord(connection, next, String(head.row.owner_key), Number(head.row.sequence) + 1);
    return { ok: true, recordDigest: digest, mandate: next };
  });
}

async function publicBoard(pool: Connections, userId: string | null, now: number) {
  const decisions = await pool.query(`SELECT d.decision_id,d.kind,d.candidate_actor_id,d.source_node_id,d.requester_actor_id,d.title,d.statement,d.created_at,d.opens_at,d.closes_at,d.proposal_sha256,d.envelope_sha256,d.envelope_json,e.public_alias,c.outcome,c.certificate_json,
    (SELECT count(*)::int FROM federation_pr3_electorate x WHERE x.decision_id=d.decision_id) AS eligible,
    (SELECT count(*)::int FROM federation_pr3_ballots b WHERE b.decision_id=d.decision_id) AS turnout
    FROM federation_pr3_decisions d JOIN federation_pr2_electors e ON e.owner_key=d.candidate_owner_key LEFT JOIN federation_pr3_certificates c ON c.decision_id=d.decision_id ORDER BY d.created_at DESC,d.decision_id DESC LIMIT 100`);
  const mandates = await pool.query(`SELECT DISTINCT ON (r.mandate_id) r.record_json,e.public_alias FROM federation_pr3_mandate_records r JOIN federation_pr2_electors e ON e.owner_key=r.owner_key ORDER BY r.mandate_id,r.sequence DESC`);
  const own = userId ? await pool.query("SELECT actor_id,public_alias,source_node_id FROM federation_pr2_electors WHERE owner_key=$1", [userId]) : { rows: [] };
  return {
    networkId: AGORA_FEDERATION_NETWORK_ID, federationId: AGORA_FEDERATION_ID,
    authenticated: Boolean(userId), elector: own.rows[0] ?? null,
    decisions: decisions.rows.map(row => ({ id: row.decision_id, kind: row.kind, candidate: { actorId: row.candidate_actor_id, alias: row.public_alias, sourceNodeId: row.source_node_id }, requesterActorId: row.requester_actor_id, title: row.title, statement: row.statement, createdAt: Number(row.created_at), opensAt: Number(row.opens_at), closesAt: Number(row.closes_at), phase: row.outcome ? "final" : now < Number(row.opens_at) ? "discussion" : now < Number(row.closes_at) ? "voting" : "awaiting-finalization", eligible: Number(row.eligible), turnout: Number(row.turnout), outcome: row.outcome ?? null, proposalSha256: row.proposal_sha256, decisionDigest: row.envelope_sha256, envelope: JSON.parse(String(row.envelope_json)), certificate: row.certificate_json ? JSON.parse(String(row.certificate_json)) : null })),
    mandates: mandates.rows.map(row => ({ holderAlias: row.public_alias, record: JSON.parse(String(row.record_json)) })),
  };
}

export async function handleFederationPr3(request: Request, db: PostgresDatabase, userId: string | null, clock: () => number = Date.now): Promise<Response> {
  const url = new URL(request.url), reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "private, no-store", vary: "cookie" } });
  try {
    if (request.method === "GET") {
      if ([...url.searchParams.keys()].length) return reply({ error: "Filtri non validi." }, 400);
      return reply(await publicBoard(db.pool, userId, clock()));
    }
    if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);
    if (!userId) return reply({ error: "Accedi con un account PR1 per partecipare." }, 401);
    if (request.headers.get("origin") !== url.origin || request.headers.get("sec-fetch-site") === "cross-site") return reply({ error: "Invalid origin" }, 403);
    if (!request.headers.get("content-type")?.startsWith("application/json")) return reply({ error: "JSON required" }, 415);
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 120000) return reply({ error: "Payload too large" }, 413);
    let data: Record<string, unknown>;
    try { data = JSON.parse(raw); if (!object(data)) throw Error(); } catch { return reply({ error: "Invalid JSON" }, 400); }
    if (["ownerKey", "userId", "status", "eligible", "outcome", "hostingWeight"].some(key => Object.hasOwn(data, key))) return reply({ error: "Invalid input" }, 400);
    const now = clock();
    switch (data.action) {
      case "enroll": return reply(await acceptAttestation(db.pool, data.attestation, userId, now), 201);
      case "apply": return reply(await createDecision(db.pool, data, userId, now, "pr3-election"), 201);
      case "recall": return reply(await createDecision(db.pool, data, userId, now, "pr3-recall"), 201);
      case "vote": return reply(await castBallot(db.pool, data, userId, now), 201);
      case "finalize": return reply(await finalizeDecision(db.pool, data, now));
      case "activate": return reply(await transitionMandate(db.pool, data, userId, now, "active"));
      case "expire": return reply(await transitionMandate(db.pool, data, userId, now, "expired"));
      default: return reply({ error: "Azione federale sconosciuta." }, 400);
    }
  } catch (error) {
    if (error instanceof FederationRequestError) return reply({ error: error.message }, error.status);
    if (error instanceof Error && /duplicate key|unique constraint/i.test(error.message)) return reply({ error: "Operazione già registrata o identificatore già usato." }, 409);
    return reply({ error: "Operazione federale non completata. Aggiorna lo stato e riprova." }, 503);
  }
}
