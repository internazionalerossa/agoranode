import test from "node:test";
import assert from "node:assert/strict";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import FederationBoard, {FederationBoardView, fetchFederationBoard, parseFederationBoard} from "../app/components/FederationBoard";

const payload = {
  networkId: "agoranode-main",
  federationId: "agoranode",
  authenticated: false,
  elector: null,
  decisions: [{
    id: "decision-1",
    kind: "pr3-election",
    candidate: {actorId: "actor-1", alias: "Ada", sourceNodeId: "polisrossa"},
    requesterActorId: "actor-1",
    title: "Mandato per la sicurezza del protocollo",
    statement: "Mandato circoscritto, pubblico e revocabile.",
    createdAt: 1_799_971_200_000,
    opensAt: 1_799_971_200_000,
    closesAt: 1_800_057_600_000,
    phase: "voting",
    eligible: 11,
    turnout: 7,
    outcome: null,
    proposalSha256: `sha256:${"a".repeat(64)}`,
    decisionDigest: `sha256:${"b".repeat(64)}`,
  }],
  mandates: [{
    holderAlias: "Ada",
    record: {
      mandateId: `sha256:${"c".repeat(64)}`,
      actorId: "actor-1",
      sourceNodeId: "polisrossa",
      state: "active",
      transitionAt: 1_800_057_600_000,
      startsAt: 1_800_057_600_000,
      expiresAt: 1_831_593_600_000,
      electionDecisionDigest: `sha256:${"b".repeat(64)}`,
    },
  }],
};

test("the public federation board starts accessibly and never presents an unconnected vote form", () => {
  const html = renderToStaticMarkup(createElement(FederationBoard));
  assert.match(html, /Governo federale AgoràNode/);
  assert.match(html, /REGISTRO PUBBLICO · SOLA LETTURA/);
  assert.match(html, /PR1/);
  assert.match(html, /PR2/);
  assert.match(html, /PR3/);
  assert.match(html, /role="status"/);
  assert.match(html, /non una cabina di voto/);
  assert.doesNotMatch(html, /<form|>Vota</);
});

test("the read-only view renders public decisions, turnout and current mandates", () => {
  const board = parseFederationBoard(payload);
  const html = renderToStaticMarkup(createElement(FederationBoardView, {board}));
  assert.match(html, /Decisioni federali/);
  assert.match(html, /Mandato per la sicurezza del protocollo/);
  assert.match(html, /7 voti su 11 aventi diritto/);
  assert.match(html, /Ada/);
  assert.match(html, /Mandato attivo/);
  assert.match(html, /polisrossa/);
  assert.doesNotMatch(html, /actor-1/);
});

test("the board loader accepts the public API contract and fails closed on malformed data", async () => {
  const fetcher: typeof fetch = async () => Response.json(payload);
  assert.equal((await fetchFederationBoard(undefined, fetcher)).decisions[0].candidate.alias, "Ada");
  assert.doesNotThrow(() => parseFederationBoard({
    ...payload,
    decisions: [{...payload.decisions[0], phase: "final", outcome: "tied"}],
    mandates: ["nominated", "candidate", "elected", "active", "withdrawn", "recalled", "resigned", "expired"].map(state => ({
      ...payload.mandates[0],
      record: {...payload.mandates[0].record, mandateId: `sha256:${state.padEnd(64, "0")}`, state},
    })),
  }));
  assert.throws(() => parseFederationBoard({...payload, decisions: [{...payload.decisions[0], candidate: {sourceNodeId: "polisrossa"}}]}), /candidate alias/);
  await assert.rejects(fetchFederationBoard(undefined, async () => new Response("unavailable", {status: 503})), /unavailable/);
});
