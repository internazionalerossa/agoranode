/**
 * Rights and public provenance for a community-authored contribution.
 *
 * `publicLicense` is the author's choice for reuse by the public. It is kept
 * separate from the minimum AgoràNode grant: even a NoDerivatives or
 * rights-reserved choice can coexist with the author's additional permission
 * for the node to preserve the contribution and publish democratically
 * approved revisions.
 *
 * This module is a data contract, not legal advice. The grant text is marked
 * as a draft and must receive legal review before community editing is opened.
 */

export const REGISTERED_PUBLIC_LICENSES = {
  "CC0-1.0": {
    kind: "creative-commons",
    canonicalUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    allowsPublicRedistribution: true,
    allowsPublicAdaptations: true,
    requiresAttribution: false,
    nonCommercialOnly: false,
    shareAlike: false,
  },
  "CC-BY-4.0": {
    kind: "creative-commons",
    canonicalUrl: "https://creativecommons.org/licenses/by/4.0/",
    allowsPublicRedistribution: true,
    allowsPublicAdaptations: true,
    requiresAttribution: true,
    nonCommercialOnly: false,
    shareAlike: false,
  },
  "CC-BY-SA-4.0": {
    kind: "creative-commons",
    canonicalUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    allowsPublicRedistribution: true,
    allowsPublicAdaptations: true,
    requiresAttribution: true,
    nonCommercialOnly: false,
    shareAlike: true,
  },
  "CC-BY-NC-4.0": {
    kind: "creative-commons",
    canonicalUrl: "https://creativecommons.org/licenses/by-nc/4.0/",
    allowsPublicRedistribution: true,
    allowsPublicAdaptations: true,
    requiresAttribution: true,
    nonCommercialOnly: true,
    shareAlike: false,
  },
  "CC-BY-NC-SA-4.0": {
    kind: "creative-commons",
    canonicalUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    allowsPublicRedistribution: true,
    allowsPublicAdaptations: true,
    requiresAttribution: true,
    nonCommercialOnly: true,
    shareAlike: true,
  },
  "CC-BY-ND-4.0": {
    kind: "creative-commons",
    canonicalUrl: "https://creativecommons.org/licenses/by-nd/4.0/",
    allowsPublicRedistribution: true,
    allowsPublicAdaptations: false,
    requiresAttribution: true,
    nonCommercialOnly: false,
    shareAlike: false,
  },
  "CC-BY-NC-ND-4.0": {
    kind: "creative-commons",
    canonicalUrl: "https://creativecommons.org/licenses/by-nc-nd/4.0/",
    allowsPublicRedistribution: true,
    allowsPublicAdaptations: false,
    requiresAttribution: true,
    nonCommercialOnly: true,
    shareAlike: false,
  },
  "all-rights-reserved-with-agoranode-grant": {
    kind: "rights-reserved",
    canonicalUrl: null,
    allowsPublicRedistribution: false,
    allowsPublicAdaptations: false,
    requiresAttribution: true,
    nonCommercialOnly: false,
    shareAlike: false,
  },
} as const;

export type RegisteredPublicLicenseId = keyof typeof REGISTERED_PUBLIC_LICENSES;

export type PublicLicenseSelection =
  | { id: RegisteredPublicLicenseId }
  | {
      id: "custom";
      name: string;
      url: string;
      text: string;
      textSha256: string;
    };

export const AGORANODE_MINIMUM_GRANT_VERSION =
  "org.agoranode.contribution-grant.v1" as const;

export const AGORANODE_MINIMUM_GRANT_TEXT =
  "Pubblicando questo contributo, concedo all’istanza AgoràNode e ai custodi autorizzati dal suo governo democratico un permesso non esclusivo e gratuito per conservarlo, riprodurlo, archiviarlo, migrarne il formato e renderlo visibile a chiunque senza costo di accesso. Autorizzo inoltre la pubblicazione di traduzioni e revisioni del contributo soltanto quando sono state approvate tramite il governo democratico del nodo e restano collegate alla cronologia, all’attribuzione e alla decisione che le ha autorizzate. La licenza pubblica che scelgo disciplina il riuso da parte del pubblico e rimane distinta da questo permesso. Dichiaro di avere i diritti necessari; diritti di terzi, protezione dei dati e obblighi di legge restano applicabili. Per le revisioni già pubblicate, il permesso è destinato a rimanere efficace nei limiti consentiti dalla legge.";

/** Changing this statement digest requires a new grant version. */
export const AGORANODE_MINIMUM_GRANT_SHA256 =
  "54b20e86d150d14664066a7b5ea05936ec5044d7ae3889707cab8580786180d1" as const;

export const AGORANODE_MINIMUM_GRANT = {
  version: AGORANODE_MINIMUM_GRANT_VERSION,
  statementSha256: AGORANODE_MINIMUM_GRANT_SHA256,
  status: "draft-requires-legal-review-before-community-editing-opens",
  exclusive: false,
  accessFee: false,
  permissions: [
    "preserve",
    "reproduce",
    "archive",
    "format-migrate",
    "publicly-display",
    "publish-democratically-approved-revision",
    "publish-democratically-approved-translation",
  ],
  conditions: [
    "public-revision-history",
    "public-attribution",
    "public-governance-provenance",
    "law-and-third-party-rights-still-apply",
  ],
  text: AGORANODE_MINIMUM_GRANT_TEXT,
} as const;

export type AgoraNodeGrantConsent = {
  version: typeof AGORANODE_MINIMUM_GRANT_VERSION;
  statementSha256: string;
  accepted: true;
  acceptedAt: string;
  acceptedByPublicId: string;
};

export type PublicContributor = {
  publicId: string;
  displayName: string;
};

export const DEMOCRATIC_DECISION_METHODS = [
  "single",
  "approval",
  "ranked",
] as const;
export type DemocraticDecisionMethod =
  (typeof DEMOCRATIC_DECISION_METHODS)[number];

export const DEMOCRATIC_DECISION_RESULTS = [
  "approved",
  "rejected",
  "no-quorum",
  "tied",
  "withdrawn",
] as const;
export type DemocraticDecisionResult =
  (typeof DEMOCRATIC_DECISION_RESULTS)[number];

export const DEMOCRATIC_DECISION_CRITERIA = [
  "absolute-approval-count",
  "simple-majority",
  "qualified-majority",
  "consensus",
  "ranked-choice-threshold",
] as const;
export type DemocraticDecisionCriterion =
  (typeof DEMOCRATIC_DECISION_CRITERIA)[number];

export const DEMOCRATIC_DECISION_EVIDENCE_FORMAT =
  "org.agoranode.democratic-decision-evidence.v1" as const;
export const DEMOCRATIC_TALLY_FORMAT =
  "org.agoranode.democratic-tally.v1" as const;

export type LegacyDecisionEvidence = {
  format: typeof DEMOCRATIC_DECISION_EVIDENCE_FORMAT;
  status: "legacy-not-recorded";
  criterion: null;
  eligibleVoters: null;
  participants: null;
  quorumRequired: null;
  approvalThreshold: null;
  approvedOption: null;
  tally: null;
  tallySha256: null;
};

export type RecordedDecisionEvidence = {
  format: typeof DEMOCRATIC_DECISION_EVIDENCE_FORMAT;
  status: "recorded";
  criterion: DemocraticDecisionCriterion;
  eligibleVoters: number;
  participants: number;
  quorumRequired: number;
  approvalThreshold: number;
  approvedOption: string | null;
  /** Aggregate option counts only; this must never contain individual ballots. */
  tally: Record<string, number>;
  tallySha256: string;
};

export type DemocraticDecisionEvidence =
  | LegacyDecisionEvidence
  | RecordedDecisionEvidence;

export const LEGACY_NOT_RECORDED_DECISION_EVIDENCE: LegacyDecisionEvidence = {
  format: DEMOCRATIC_DECISION_EVIDENCE_FORMAT,
  status: "legacy-not-recorded",
  criterion: null,
  eligibleVoters: null,
  participants: null,
  quorumRequired: null,
  approvalThreshold: null,
  approvedOption: null,
  tally: null,
  tallySha256: null,
};

export const DEMOCRATIC_REVISION_PROVENANCE_FORMAT =
  "org.agoranode.democratic-revision-provenance.v1" as const;

export type DemocraticRevisionProvenance = {
  format: typeof DEMOCRATIC_REVISION_PROVENANCE_FORMAT;
  author: PublicContributor;
  request: {
    forumTopicId: string;
    forumTopicUrl: string;
    requestedBy: PublicContributor;
  };
  decision: {
    id: string;
    method: DemocraticDecisionMethod;
    result: DemocraticDecisionResult;
    decidedAt: string;
    evidence: RecordedDecisionEvidence;
  };
  previousRevisionSha256: string | null;
};

export const CONTRIBUTION_PUBLICATION_FORMAT =
  "org.agoranode.contribution-publication.v1" as const;

export type ContributionPublicationRecord = {
  format: typeof CONTRIBUTION_PUBLICATION_FORMAT;
  scope: "submitted-contribution-only";
  publicLicense: PublicLicenseSelection;
  grantConsent: AgoraNodeGrantConsent;
  provenance: DemocraticRevisionProvenance;
};

const HASH = /^[0-9a-f]{64}$/;
const PUBLIC_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/;
const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

function invalid(message: string): never {
  throw new Error(`Invalid contribution rights value: ${message}`);
}

function plainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value: Record<string, unknown>, expected: string[], label: string) {
  const actual = Object.keys(value).sort();
  const sorted = [...expected].sort();
  if (actual.length !== sorted.length || actual.some((key, i) => key !== sorted[i])) {
    invalid(`${label} has unknown or missing fields`);
  }
}

function boundedText(value: unknown, label: string, minimum: number, maximum: number) {
  if (
    typeof value !== "string" ||
    value.length < minimum ||
    value.length > maximum ||
    value !== value.normalize("NFC") ||
    CONTROL.test(value)
  ) {
    invalid(`${label} is invalid`);
  }
  return value;
}

function hash(value: unknown, label: string) {
  if (typeof value !== "string" || !HASH.test(value)) invalid(`${label} is invalid`);
  return value;
}

function publicId(value: unknown, label: string) {
  if (typeof value !== "string" || !PUBLIC_ID.test(value)) invalid(`${label} is invalid`);
  return value;
}

function opaqueId(value: unknown, label: string) {
  if (typeof value !== "string" || !OPAQUE_ID.test(value)) invalid(`${label} is invalid`);
  return value;
}

function instant(value: unknown, label: string) {
  if (
    typeof value !== "string" ||
    !ISO_INSTANT.test(value) ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    invalid(`${label} is invalid`);
  }
  return value;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function aggregateCount(value: unknown, label: string, minimum = 0) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > 2_147_483_647
  ) {
    invalid(`${label} is invalid`);
  }
  return value;
}

function aggregateTally(value: unknown): Record<string, number> {
  if (!plainObject(value)) invalid("aggregate tally is not an object");
  const entries = Object.entries(value);
  if (entries.length < 1 || entries.length > 64) {
    invalid("aggregate tally has an invalid number of options");
  }
  const tally: Record<string, number> = {};
  for (const [option, count] of entries.sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  )) {
    if (!OPAQUE_ID.test(option)) invalid("aggregate tally option is invalid");
    tally[option] = aggregateCount(count, "aggregate tally count");
  }
  return tally;
}

/** Digest of the canonical aggregate count document, never of individual ballots. */
export async function democraticDecisionTallySha256(
  tallyValue: unknown,
): Promise<string> {
  const tally = aggregateTally(tallyValue);
  return sha256(
    JSON.stringify({
      format: DEMOCRATIC_TALLY_FORMAT,
      counts: tally,
    }),
  );
}

function customLicenseUrl(value: unknown) {
  const input = boundedText(value, "custom license URL", 9, 2048);
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    invalid("custom license URL cannot be parsed");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.hash ||
    url.origin === "null"
  ) {
    invalid("custom license URL must be credential-free HTTPS without a fragment");
  }
  return url.href;
}

/** Validates an author's public-license choice and verifies custom text locally. */
export async function validatePublicLicenseSelection(
  value: unknown,
): Promise<PublicLicenseSelection> {
  if (!plainObject(value)) invalid("public license is not an object");
  if (value.id !== "custom") {
    exactKeys(value, ["id"], "registered public license");
    if (
      typeof value.id !== "string" ||
      !Object.hasOwn(REGISTERED_PUBLIC_LICENSES, value.id)
    ) {
      invalid("registered public license ID is unknown");
    }
    return { id: value.id as RegisteredPublicLicenseId };
  }
  exactKeys(
    value,
    ["id", "name", "url", "text", "textSha256"],
    "custom public license",
  );
  const name = boundedText(value.name, "custom license name", 3, 120);
  const url = customLicenseUrl(value.url);
  const text = boundedText(value.text, "custom license text", 40, 32768);
  const textSha256 = hash(value.textSha256, "custom license digest");
  if ((await sha256(text)) !== textSha256) {
    invalid("custom license digest does not match its text");
  }
  return { id: "custom", name, url, text, textSha256 };
}

export async function agoraNodeMinimumGrantSha256() {
  return sha256(AGORANODE_MINIMUM_GRANT_TEXT);
}

/** Validates the public, versioned record of the contributor's consent. */
export async function validateAgoraNodeGrantConsent(
  value: unknown,
): Promise<AgoraNodeGrantConsent> {
  if (!plainObject(value)) invalid("grant consent is not an object");
  exactKeys(
    value,
    ["version", "statementSha256", "accepted", "acceptedAt", "acceptedByPublicId"],
    "grant consent",
  );
  if (value.version !== AGORANODE_MINIMUM_GRANT_VERSION) {
    invalid("grant version is unsupported");
  }
  if (value.accepted !== true) invalid("grant was not accepted");
  const statementSha256 = hash(value.statementSha256, "grant statement digest");
  if ((await agoraNodeMinimumGrantSha256()) !== AGORANODE_MINIMUM_GRANT_SHA256) {
    invalid("grant definition changed without a new version");
  }
  if (AGORANODE_MINIMUM_GRANT_SHA256 !== statementSha256) {
    invalid("grant statement digest does not match this version");
  }
  return {
    version: AGORANODE_MINIMUM_GRANT_VERSION,
    statementSha256,
    accepted: true,
    acceptedAt: instant(value.acceptedAt, "grant acceptance time"),
    acceptedByPublicId: publicId(
      value.acceptedByPublicId,
      "grant consenting public ID",
    ),
  };
}

function contributor(value: unknown, label: string): PublicContributor {
  if (!plainObject(value)) invalid(`${label} is not an object`);
  exactKeys(value, ["publicId", "displayName"], label);
  return {
    publicId: publicId(value.publicId, `${label} public ID`),
    displayName: boundedText(value.displayName, `${label} display name`, 1, 160),
  };
}

function forumTopicUrl(value: unknown, topicId: string) {
  const input = boundedText(value, "forum topic URL", 2, 2048);
  const canonical = `/polisrossa?view=partecipa&proposal=${topicId}`;
  if (input !== canonical) {
    invalid("forum topic URL must be the canonical same-origin proposal path");
  }
  return canonical;
}

export async function validateDemocraticDecisionEvidence(
  value: unknown,
  context: {
    method: DemocraticDecisionMethod;
    result: DemocraticDecisionResult;
    allowLegacy?: boolean;
  },
): Promise<DemocraticDecisionEvidence> {
  if (!plainObject(value)) invalid("decision evidence is not an object");
  exactKeys(
    value,
    [
      "format",
      "status",
      "criterion",
      "eligibleVoters",
      "participants",
      "quorumRequired",
      "approvalThreshold",
      "approvedOption",
      "tally",
      "tallySha256",
    ],
    "decision evidence",
  );
  if (value.format !== DEMOCRATIC_DECISION_EVIDENCE_FORMAT) {
    invalid("decision evidence format is unsupported");
  }
  if (value.status === "legacy-not-recorded") {
    if (!context.allowLegacy) {
      invalid("community decisions require recorded aggregate evidence");
    }
    for (const field of [
      "criterion",
      "eligibleVoters",
      "participants",
      "quorumRequired",
      "approvalThreshold",
      "approvedOption",
      "tally",
      "tallySha256",
    ]) {
      if (value[field] !== null) {
        invalid("legacy decision evidence must not invent missing values");
      }
    }
    return { ...LEGACY_NOT_RECORDED_DECISION_EVIDENCE };
  }
  if (value.status !== "recorded") {
    invalid("decision evidence status is invalid");
  }
  if (
    typeof value.criterion !== "string" ||
    !DEMOCRATIC_DECISION_CRITERIA.includes(
      value.criterion as DemocraticDecisionCriterion,
    )
  ) {
    invalid("decision criterion is unsupported");
  }
  const criterion = value.criterion as DemocraticDecisionCriterion;
  if (
    (context.method === "single" && criterion !== "absolute-approval-count") ||
    (context.method === "ranked" && criterion !== "ranked-choice-threshold") ||
    (context.method === "approval" && criterion === "ranked-choice-threshold")
  ) {
    invalid("decision criterion does not match the voting method");
  }
  const eligibleVoters = aggregateCount(
    value.eligibleVoters,
    "eligible voter count",
    1,
  );
  const participants = aggregateCount(value.participants, "participant count");
  const quorumRequired = aggregateCount(
    value.quorumRequired,
    "required quorum",
    1,
  );
  const approvalThreshold = aggregateCount(
    value.approvalThreshold,
    "approval threshold",
    1,
  );
  if (
    participants > eligibleVoters ||
    quorumRequired > eligibleVoters ||
    approvalThreshold > eligibleVoters
  ) {
    invalid("decision aggregate counts exceed the electorate");
  }
  if (
    (context.result === "no-quorum" && participants >= quorumRequired) ||
    (context.result !== "no-quorum" && participants < quorumRequired)
  ) {
    invalid("decision result conflicts with the recorded quorum");
  }
  const tally = aggregateTally(value.tally);
  if (Object.values(tally).some((count) => count > participants)) {
    invalid("aggregate tally count exceeds participants");
  }
  if (
    context.method !== "approval" &&
    Object.values(tally).reduce((sum, count) => sum + count, 0) > participants
  ) {
    invalid("aggregate single-choice tally exceeds participants");
  }
  const tallySha256 = hash(value.tallySha256, "aggregate tally digest");
  if ((await democraticDecisionTallySha256(tally)) !== tallySha256) {
    invalid("aggregate tally digest does not match its counts");
  }
  let approvedOption: string | null = null;
  if (context.result === "approved") {
    approvedOption = opaqueId(value.approvedOption, "approved option");
    if (
      !Object.hasOwn(tally, approvedOption) ||
      tally[approvedOption] < approvalThreshold
    ) {
      invalid("approved option does not meet the recorded threshold");
    }
  } else if (value.approvedOption !== null) {
    invalid("a non-approved result cannot name an approved option");
  }
  return {
    format: DEMOCRATIC_DECISION_EVIDENCE_FORMAT,
    status: "recorded",
    criterion,
    eligibleVoters,
    participants,
    quorumRequired,
    approvalThreshold,
    approvedOption,
    tally,
    tallySha256,
  };
}

export async function validateDemocraticRevisionProvenance(
  value: unknown,
  options: { expectedForumOrigin?: string } = {},
): Promise<DemocraticRevisionProvenance> {
  if (!plainObject(value)) invalid("democratic provenance is not an object");
  exactKeys(
    value,
    ["format", "author", "request", "decision", "previousRevisionSha256"],
    "democratic provenance",
  );
  if (value.format !== DEMOCRATIC_REVISION_PROVENANCE_FORMAT) {
    invalid("democratic provenance format is unsupported");
  }
  if (!plainObject(value.request)) invalid("change request is not an object");
  exactKeys(
    value.request,
    ["forumTopicId", "forumTopicUrl", "requestedBy"],
    "change request",
  );
  if (
    typeof value.request.forumTopicId !== "string" ||
    !UUID_V4.test(value.request.forumTopicId)
  ) {
    invalid("forum topic ID is invalid");
  }
  const request = {
    forumTopicId: value.request.forumTopicId,
    forumTopicUrl: forumTopicUrl(
      value.request.forumTopicUrl,
      value.request.forumTopicId,
    ),
    requestedBy: contributor(value.request.requestedBy, "requester"),
  };
  if (!plainObject(value.decision)) invalid("decision is not an object");
  exactKeys(
    value.decision,
    ["id", "method", "result", "decidedAt", "evidence"],
    "decision",
  );
  if (typeof value.decision.id !== "string" || !OPAQUE_ID.test(value.decision.id)) {
    invalid("decision ID is invalid");
  }
  if (
    typeof value.decision.method !== "string" ||
    !DEMOCRATIC_DECISION_METHODS.includes(
      value.decision.method as DemocraticDecisionMethod,
    )
  ) {
    invalid("decision method is unsupported");
  }
  if (
    typeof value.decision.result !== "string" ||
    !DEMOCRATIC_DECISION_RESULTS.includes(
      value.decision.result as DemocraticDecisionResult,
    )
  ) {
    invalid("decision result is unsupported");
  }
  const method = value.decision.method as DemocraticDecisionMethod;
  const result = value.decision.result as DemocraticDecisionResult;
  return {
    format: DEMOCRATIC_REVISION_PROVENANCE_FORMAT,
    author: contributor(value.author, "revision author"),
    request,
    decision: {
      id: value.decision.id,
      method,
      result,
      decidedAt: instant(value.decision.decidedAt, "decision time"),
      evidence: (await validateDemocraticDecisionEvidence(
        value.decision.evidence,
        { method, result },
      )) as RecordedDecisionEvidence,
    },
    previousRevisionSha256:
      value.previousRevisionSha256 === null
        ? null
        : hash(value.previousRevisionSha256, "previous revision digest"),
  };
}

/**
 * Validates the complete metadata attached to a newly published contribution.
 * A rejected, tied, withdrawn or quorum-less proposal belongs in forum history,
 * but cannot authorize a public content revision.
 */
export async function validateContributionPublicationRecord(
  value: unknown,
  options: { expectedForumOrigin?: string } = {},
): Promise<ContributionPublicationRecord> {
  if (!plainObject(value)) invalid("publication record is not an object");
  exactKeys(
    value,
    ["format", "scope", "publicLicense", "grantConsent", "provenance"],
    "publication record",
  );
  if (value.format !== CONTRIBUTION_PUBLICATION_FORMAT) {
    invalid("publication format is unsupported");
  }
  if (value.scope !== "submitted-contribution-only") {
    invalid("public license scope is invalid");
  }
  const [publicLicense, grantConsent] = await Promise.all([
    validatePublicLicenseSelection(value.publicLicense),
    validateAgoraNodeGrantConsent(value.grantConsent),
  ]);
  const provenance = await validateDemocraticRevisionProvenance(
    value.provenance,
    options,
  );
  if (grantConsent.acceptedByPublicId !== provenance.author.publicId) {
    invalid("grant consent is not bound to the revision author");
  }
  if (provenance.decision.result !== "approved") {
    invalid("only an approved decision can authorize publication");
  }
  return {
    format: CONTRIBUTION_PUBLICATION_FORMAT,
    scope: "submitted-contribution-only",
    publicLicense,
    grantConsent,
    provenance,
  };
}
