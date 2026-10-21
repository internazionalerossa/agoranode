import test from "node:test";
import assert from "node:assert/strict";
import {
  AGORANODE_MINIMUM_GRANT,
  AGORANODE_MINIMUM_GRANT_SHA256,
  AGORANODE_MINIMUM_GRANT_VERSION,
  CONTRIBUTION_PUBLICATION_FORMAT,
  DEMOCRATIC_DECISION_EVIDENCE_FORMAT,
  DEMOCRATIC_REVISION_PROVENANCE_FORMAT,
  REGISTERED_PUBLIC_LICENSES,
  agoraNodeMinimumGrantSha256,
  democraticDecisionTallySha256,
  validateAgoraNodeGrantConsent,
  validateContributionPublicationRecord,
  validateDemocraticRevisionProvenance,
  validatePublicLicenseSelection,
} from "../app/lib/contribution-rights";

const topicId = "7de07742-32af-41f2-b823-e4c926ec645a";
const previousRevisionSha256 = "a".repeat(64);

async function recordedEvidence() {
  const tally = { approve: 4, reject: 1 };
  return {
    format: DEMOCRATIC_DECISION_EVIDENCE_FORMAT,
    status: "recorded" as const,
    criterion: "absolute-approval-count" as const,
    eligibleVoters: 7,
    participants: 5,
    quorumRequired: 3,
    approvalThreshold: 4,
    approvedOption: "approve",
    tally,
    tallySha256: await democraticDecisionTallySha256(tally),
  };
}

async function customLicense(overrides: Record<string, unknown> = {}) {
  const text =
    "Puoi leggere e condividere questo contributo gratuitamente, conservando attribuzione, provenienza e collegamento alla versione originale.";
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const textSha256 = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return {
    id: "custom",
    name: "Licenza personale di prova",
    url: "https://example.org/licenze/personale-v1",
    text,
    textSha256,
    ...overrides,
  };
}

async function record(overrides: Record<string, unknown> = {}) {
  const statementSha256 = await agoraNodeMinimumGrantSha256();
  return {
    format: CONTRIBUTION_PUBLICATION_FORMAT,
    scope: "submitted-contribution-only",
    publicLicense: { id: "CC-BY-ND-4.0" },
    grantConsent: {
      version: AGORANODE_MINIMUM_GRANT_VERSION,
      statementSha256,
      accepted: true,
      acceptedAt: "2026-10-21T12:30:00.000Z",
      acceptedByPublicId: "member.alice",
    },
    provenance: {
      format: DEMOCRATIC_REVISION_PROVENANCE_FORMAT,
      author: { publicId: "member.alice", displayName: "Alice" },
      request: {
        forumTopicId: topicId,
        forumTopicUrl: `/polisrossa?view=partecipa&proposal=${topicId}`,
        requestedBy: { publicId: "member.bob", displayName: "Bob" },
      },
      decision: {
        id: "decision.2026-10-21.1",
        method: "single",
        result: "approved",
        decidedAt: "2026-10-21T14:30:00.000Z",
        evidence: await recordedEvidence(),
      },
      previousRevisionSha256,
    },
    ...overrides,
  };
}

test("the public registry offers CC, ND and rights-reserved choices without imposing one license", () => {
  assert.deepEqual(Object.keys(REGISTERED_PUBLIC_LICENSES), [
    "CC0-1.0",
    "CC-BY-4.0",
    "CC-BY-SA-4.0",
    "CC-BY-NC-4.0",
    "CC-BY-NC-SA-4.0",
    "CC-BY-ND-4.0",
    "CC-BY-NC-ND-4.0",
    "all-rights-reserved-with-agoranode-grant",
  ]);
  assert.equal(
    REGISTERED_PUBLIC_LICENSES["CC-BY-ND-4.0"].allowsPublicAdaptations,
    false,
  );
  assert.equal(
    REGISTERED_PUBLIC_LICENSES["all-rights-reserved-with-agoranode-grant"]
      .allowsPublicRedistribution,
    false,
  );
  assert.equal(AGORANODE_MINIMUM_GRANT.exclusive, false);
  assert.equal(
    AGORANODE_MINIMUM_GRANT_SHA256,
    "54b20e86d150d14664066a7b5ea05936ec5044d7ae3889707cab8580786180d1",
  );
  assert.equal(
    AGORANODE_MINIMUM_GRANT.status,
    "draft-requires-legal-review-before-community-editing-opens",
  );
});

test("registered licenses accept ND and rights-reserved as author choices", async () => {
  assert.deepEqual(await validatePublicLicenseSelection({ id: "CC-BY-ND-4.0" }), {
    id: "CC-BY-ND-4.0",
  });
  assert.deepEqual(
    await validatePublicLicenseSelection({
      id: "all-rights-reserved-with-agoranode-grant",
    }),
    { id: "all-rights-reserved-with-agoranode-grant" },
  );
  await assert.rejects(
    validatePublicLicenseSelection({ id: "CC-BY-ND-4.0", email: "private@example.org" }),
    /unknown or missing fields/,
  );
  await assert.rejects(
    validatePublicLicenseSelection({ id: "not-a-license" }),
    /unknown/,
  );
});

test("a custom choice requires credential-free HTTPS, exact text and its matching digest", async () => {
  const valid = await customLicense();
  assert.deepEqual(await validatePublicLicenseSelection(valid), valid);
  await assert.rejects(
    validatePublicLicenseSelection(await customLicense({ url: "http://example.org/license" })),
    /HTTPS/,
  );
  await assert.rejects(
    validatePublicLicenseSelection(await customLicense({ textSha256: "0".repeat(64) })),
    /does not match/,
  );
  const { text: _text, ...withoutText } = await customLicense();
  await assert.rejects(
    validatePublicLicenseSelection(withoutText),
    /unknown or missing fields/,
  );
});

test("grant consent is versioned, public-only and bound to the exact draft statement", async () => {
  assert.equal(await agoraNodeMinimumGrantSha256(), AGORANODE_MINIMUM_GRANT_SHA256);
  const consent = {
    version: AGORANODE_MINIMUM_GRANT_VERSION,
    statementSha256: await agoraNodeMinimumGrantSha256(),
    accepted: true,
    acceptedAt: "2026-10-21T12:30:00.000Z",
    acceptedByPublicId: "member.alice",
  };
  assert.deepEqual(await validateAgoraNodeGrantConsent(consent), consent);
  await assert.rejects(
    validateAgoraNodeGrantConsent({ ...consent, statementSha256: "f".repeat(64) }),
    /does not match/,
  );
  await assert.rejects(
    validateAgoraNodeGrantConsent({ ...consent, token: "never-store-this" }),
    /unknown or missing fields/,
  );
});

test("democratic provenance keeps author, requester, aggregate decision evidence and predecessor", async () => {
  const source = {
    format: DEMOCRATIC_REVISION_PROVENANCE_FORMAT,
    author: { publicId: "member.alice", displayName: "Alice" },
    request: {
      forumTopicId: topicId,
      forumTopicUrl: `/polisrossa?view=partecipa&proposal=${topicId}`,
      requestedBy: { publicId: "member.bob", displayName: "Bob" },
    },
    decision: {
      id: "decision.2026-10-21.1",
      method: "ranked",
      result: "approved",
      decidedAt: "2026-10-21T14:30:00.000Z",
      evidence: {
        ...(await recordedEvidence()),
        criterion: "ranked-choice-threshold" as const,
      },
    },
    previousRevisionSha256,
  };
  assert.deepEqual(
    await validateDemocraticRevisionProvenance(source, {
      expectedForumOrigin: "https://polisrossa.example",
    }),
    source,
  );
  const absolute = {
    ...source,
    request: {
      ...source.request,
      forumTopicUrl: `https://polisrossa.example/polisrossa?view=partecipa&proposal=${topicId}`,
    },
  };
  await assert.rejects(
    validateDemocraticRevisionProvenance(absolute, {
        expectedForumOrigin: "https://polisrossa.example",
      }),
    /canonical same-origin proposal path/,
  );
  await assert.rejects(
    validateDemocraticRevisionProvenance(
        {
          ...source,
          request: {
            ...source.request,
            forumTopicUrl: `https://other.example/polisrossa?view=partecipa&proposal=${topicId}`,
          },
        },
        { expectedForumOrigin: "https://polisrossa.example" },
      ),
    /canonical same-origin proposal path/,
  );
  await assert.rejects(
    validateDemocraticRevisionProvenance({
        ...source,
        request: {
          ...source.request,
          forumTopicUrl: "/polisrossa?view=partecipa&proposal=00000000-0000-4000-8000-000000000000",
        },
      }),
    /canonical same-origin proposal path/,
  );
});

test("aggregate evidence rejects invented legacy values, inconsistent counts and a changed tally", async () => {
  const input = await record();
  const provenance = input.provenance as Record<string, unknown>;
  const decision = provenance.decision as Record<string, unknown>;
  const evidence = decision.evidence as Record<string, unknown>;
  await assert.rejects(
    validateDemocraticRevisionProvenance({
      ...provenance,
      decision: {
        ...decision,
        evidence: {
          ...evidence,
          status: "legacy-not-recorded",
          criterion: null,
          eligibleVoters: null,
          participants: null,
          quorumRequired: null,
          approvalThreshold: null,
          approvedOption: null,
          tally: null,
          tallySha256: null,
        },
      },
    }),
    /require recorded aggregate evidence/,
  );
  await assert.rejects(
    validateDemocraticRevisionProvenance({
      ...provenance,
      decision: {
        ...decision,
        evidence: { ...evidence, participants: 8 },
      },
    }),
    /exceed the electorate/,
  );
  await assert.rejects(
    validateDemocraticRevisionProvenance({
      ...provenance,
      decision: {
        ...decision,
        evidence: {
          ...evidence,
          tally: { approve: 3, reject: 2 },
        },
      },
    }),
    /digest does not match/,
  );
});

test("a publication accepts ND through the separate grant but only after approval", async () => {
  const input = await record();
  const validated = await validateContributionPublicationRecord(input, {
    expectedForumOrigin: "https://polisrossa.example",
  });
  assert.equal(validated.publicLicense.id, "CC-BY-ND-4.0");
  assert.equal(validated.grantConsent.accepted, true);
  assert.equal(validated.provenance.request.requestedBy.displayName, "Bob");

  const rejectedTally = { approve: 2, reject: 3 };
  await assert.rejects(
    validateContributionPublicationRecord(
      await record({
        provenance: {
          ...(input.provenance as Record<string, unknown>),
          decision: {
            ...(input.provenance as { decision: Record<string, unknown> }).decision,
            result: "rejected",
            evidence: {
              ...(
                input.provenance as {
                  decision: { evidence: Record<string, unknown> };
                }
              ).decision.evidence,
              approvedOption: null,
              tally: rejectedTally,
              tallySha256: await democraticDecisionTallySha256(rejectedTally),
            },
          },
        },
      }),
    ),
    /only an approved decision/,
  );
  await assert.rejects(
    validateContributionPublicationRecord(
      await record({
        grantConsent: {
          ...(input.grantConsent as Record<string, unknown>),
          acceptedByPublicId: "member.mallory",
        },
      }),
    ),
    /not bound to the revision author/,
  );
});
