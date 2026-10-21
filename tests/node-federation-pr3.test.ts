import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  AGORA_GOVERNANCE_BALLOT_FORMAT,
  AGORA_GOVERNANCE_PROTOCOL_VERSION,
  AGORA_PR2_MEMBERSHIP_FORMAT,
  governanceBallotMessage,
  type GovernanceBallot,
  type Pr2MembershipProof,
} from "../app/platform/agora-governance-protocol";
import { PostgresDatabase, type Connections } from "../server/database";
import {
  AGORA_FEDERATION_NETWORK_ID,
  PR2_NODE_ATTESTATION_FORMAT,
  admitFederationNode,
  federationPublicKeyId,
  handleFederationPr3,
  pr2NodeAttestationMessage,
  type Pr2NodeAttestation,
} from "../server/federation";

const digest = (value: string): `sha256:${string}` => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const nonCanonicalBase64urlAlias = (value: string) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const finalIndex = alphabet.indexOf(value.at(-1)!);
  assert.equal(finalIndex % 16, 0, "Ed25519 canonical base64url has four padding bits");
  const alias = `${value.slice(0, -1)}${alphabet[finalIndex + 1]}`;
  assert.deepEqual(Buffer.from(alias, "base64url"), Buffer.from(value, "base64url"));
  return alias;
};
const keyPair = () => {
  const pair = generateKeyPairSync("ed25519");
  const publicKey = pair.publicKey.export({ format: "der", type: "spki" }).toString("base64url");
  return { ...pair, publicKey, keyId: federationPublicKeyId(publicKey) };
};

async function fixture() {
  const pg = new PGlite();
  const migrationDirectory = new URL("../server/migrations/", import.meta.url);
  for (const name of (await readdir(migrationDirectory)).filter(name => /^\d+.*\.sql$/.test(name)).sort()) {
    await pg.exec(await readFile(new URL(name, migrationDirectory), "utf8"));
  }
  const connection = {
    query: async (sql: string, values: unknown[] = []) => {
      const result = await pg.query(sql, values);
      return { rows: result.rows as Record<string, unknown>[], rowCount: result.affectedRows, affectedRows: result.affectedRows };
    },
  };
  const pool = { ...connection, connect: async () => connection } satisfies Connections;
  return { pg, pool, db: new PostgresDatabase(pool) };
}

test("PR2 federali eleggono, richiamano e fanno scadere mandati PR3 senza voto dell'host", async () => {
  const { pg, pool, db } = await fixture();
  let now = 1_800_000_000_000;
  const origin = "https://agoranode.example";
  const nodeA = keyPair(), nodeB = keyPair();
  const admission = digest("decisione-ammissione-nodi");
  await admitFederationNode(pool, { nodeId: "node-a", displayName: "Nodo A", publicKeySpki: nodeA.publicKey, admittedByDecisionDigest: admission, admittedAt: now - 10_000 });
  await admitFederationNode(pool, { nodeId: "node-b", displayName: "Nodo B", publicKeySpki: nodeB.publicKey, admittedByDecisionDigest: admission, admittedAt: now - 10_000 });
  await assert.rejects(
    admitFederationNode(pool, { nodeId: "node-invalid", displayName: "Nodo non valido", publicKeySpki: Buffer.alloc(32).toString("base64url"), admittedByDecisionDigest: admission, admittedAt: now - 10_000 }),
    /Ed25519/,
  );

  const call = (userId: string | null, data?: unknown) => handleFederationPr3(new Request(origin + "/api/federation/pr3", { method: data ? "POST" : "GET", headers: data ? { origin, "content-type": "application/json" } : undefined, body: data ? JSON.stringify(data) : undefined }), db, userId, () => now);
  const users: Array<{userId: string; actorId: string; voter: ReturnType<typeof keyPair>; credentialSha256: string}> = [];

  const makeAttestation = (index: number, signingNode = nodeA, proofNode = "node-a", networkId: string = AGORA_FEDERATION_NETWORK_ID) => {
    const userId = `pr1-user-${index}`, actorId = `actor-${index}`, voter = keyPair();
    const proof: Pr2MembershipProof = {
      format: AGORA_PR2_MEMBERSHIP_FORMAT,
      protocolVersion: AGORA_GOVERNANCE_PROTOCOL_VERSION,
      networkId: networkId as typeof AGORA_FEDERATION_NETWORK_ID,
      membershipId: digest(`membership-${index}`), actorId, nodeId: proofNode,
      state: "active", admittedByDecisionDigest: digest(`admission-${index}`),
      validFrom: now - 1000, validUntil: now + 44 * 86400000,
    };
    const unsigned: Omit<Pr2NodeAttestation, "signature"> = {
      format: PR2_NODE_ATTESTATION_FORMAT, protocolVersion: AGORA_GOVERNANCE_PROTOCOL_VERSION,
      networkId: AGORA_FEDERATION_NETWORK_ID, subjectUserId: userId, publicAlias: `Membro ${index}`,
      proof, voterKeyId: voter.keyId, voterPublicKeySpki: voter.publicKey, issuedAt: now, issuerKeyId: signingNode.keyId,
    };
    return { userId, actorId, voter, attestation: { ...unsigned, signature: sign(null, pr2NodeAttestationMessage(unsigned), signingNode.privateKey).toString("base64url") } satisfies Pr2NodeAttestation };
  };

  const crossNode = makeAttestation(90, nodeB, "node-a");
  assert.equal((await call(crossNode.userId, { action: "enroll", attestation: crossNode.attestation })).status, 403);
  const crossNetwork = makeAttestation(91, nodeA, "node-a", "foreign-network");
  assert.equal((await call(crossNetwork.userId, { action: "enroll", attestation: crossNetwork.attestation })).status, 403);
  const aliasedSignature = makeAttestation(92);
  aliasedSignature.attestation.signature = nonCanonicalBase64urlAlias(aliasedSignature.attestation.signature);
  assert.equal((await call(aliasedSignature.userId, { action: "enroll", attestation: aliasedSignature.attestation })).status, 403);

  for (let index = 1; index <= 7; index++) {
    const member = makeAttestation(index, index === 7 ? nodeB : nodeA, index === 7 ? "node-b" : "node-a");
    const response = await call(member.userId, { action: "enroll", attestation: member.attestation });
    assert.equal(response.status, 201, await response.clone().text());
    const body = await response.json() as {attestationSha256: string};
    users.push({ userId: member.userId, actorId: member.actorId, voter: member.voter, credentialSha256: body.attestationSha256 });
    if (index === 1) assert.equal((await call(member.userId, { action: "enroll", attestation: member.attestation })).status, 409);
  }

  const vote = async (decision: {decisionId: string; decisionDigest: `sha256:${string}`}, member: typeof users[number], choice: "yes" | "no" | "abstain") => {
    const unsigned: Omit<GovernanceBallot, "signature"> = { format: AGORA_GOVERNANCE_BALLOT_FORMAT, protocolVersion: AGORA_GOVERNANCE_PROTOCOL_VERSION, decisionDigest: decision.decisionDigest, chamber: "members", voterId: member.actorId, choice, keyId: member.voter.keyId, mandateDecisionDigest: null };
    const signature = sign(null, governanceBallotMessage(unsigned), member.voter.privateKey).toString("base64url");
    return call(member.userId, { action: "vote", id: decision.decisionId, choice, signature });
  };

  const elect = async (requestId: string, candidate = users[0]) => {
    const response = await call(candidate.userId, { action: "apply", requestId, credentialSha256: candidate.credentialSha256, title: "Mandato di coordinamento", statement: "Candidatura pubblica con compiti limitati e revocabili.", discussionHours: 1, votingHours: 1, termDays: 30 });
    assert.equal(response.status, 201, await response.clone().text());
    const decision = await response.json() as {decisionId: string; decisionDigest: `sha256:${string}`; mandateId: string};
    now += 3600001;
    for (const member of users.slice(0, 4)) assert.equal((await vote(decision, member, "yes")).status, 201);
    assert.equal((await vote(decision, users[0], "yes")).status, 409, "one append-only ballot per elector");
    now += 3600000;
    const finalized = await call(users[6].userId, { action: "finalize", id: decision.decisionId });
    assert.equal(finalized.status, 200, await finalized.clone().text());
    const result = await finalized.json() as {certificate: {outcome: string}; mandate: {state: string}};
    assert.equal(result.certificate.outcome, "approved");
    assert.equal(result.mandate.state, "elected");
    now += 1;
    const active = await call(candidate.userId, { action: "activate", mandateId: decision.mandateId });
    assert.equal(active.status, 200, await active.clone().text());
    assert.equal(((await active.json()) as {mandate: {state: string}}).mandate.state, "active");
    return decision;
  };

  const first = await elect("11111111-1111-4111-8111-111111111111");
  const overlongRecall = await call(users[1].userId, { action: "recall", requestId: "22222222-2222-4222-8222-222222222221", credentialSha256: users[1].credentialSha256, mandateId: first.mandateId, title: "Richiamo oltre la scadenza", statement: "Questa finestra supererebbe la durata residua del mandato federale.", discussionHours: 168, votingHours: 720 });
  assert.equal(overlongRecall.status, 409);
  assert.match(await overlongRecall.text(), /chiudersi prima della scadenza/);
  const recallResponse = await call(users[1].userId, { action: "recall", requestId: "22222222-2222-4222-8222-222222222222", credentialSha256: users[1].credentialSha256, mandateId: first.mandateId, title: "Richiamo del mandato", statement: "Richiesta pubblica e motivata di revoca del mandato federale.", discussionHours: 1, votingHours: 1 });
  assert.equal(recallResponse.status, 201, await recallResponse.clone().text());
  const recall = await recallResponse.json() as {decisionId: string; decisionDigest: `sha256:${string}`};
  now += 3600001;
  for (const member of users.slice(0, 3)) assert.equal((await vote(recall, member, "yes")).status, 201);
  now += 3600000;
  const recalled = await call(users[4].userId, { action: "finalize", id: recall.decisionId });
  assert.equal(recalled.status, 200, await recalled.clone().text());
  assert.equal(((await recalled.json()) as {mandate: {state: string}}).mandate.state, "recalled");

  now += 1000;
  const second = await elect("33333333-3333-4333-8333-333333333333");
  now += 30 * 86400000;
  const expired = await call(users[5].userId, { action: "expire", mandateId: second.mandateId });
  assert.equal(expired.status, 200, await expired.clone().text());
  assert.equal(((await expired.json()) as {mandate: {state: string}}).mandate.state, "expired");

  const board = await (await call(null)).json() as {decisions: unknown[]; mandates: Array<{record: {state: string}}>};
  assert.equal(board.decisions.length, 3);
  assert.deepEqual(board.mandates.map(item => item.record.state).sort(), ["expired", "recalled"]);
  await assert.rejects(pg.query("DELETE FROM federation_pr3_ballots"), /append-only/);
  await assert.rejects(pg.query("UPDATE federation_pr3_mandate_records SET state='active'"), /append-only/);
  assert.equal((await pg.query<{count: number}>("SELECT count(*)::int AS count FROM federation_pr3_ballots")).rows[0].count, 11);
  await pg.close();
});
