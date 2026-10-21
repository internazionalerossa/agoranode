import {
  CONTRIBUTION_PUBLICATION_FORMAT,
  LEGACY_NOT_RECORDED_DECISION_EVIDENCE,
  validateContributionPublicationRecord,
  validateDemocraticDecisionEvidence,
  type ContributionPublicationRecord,
  type LegacyDecisionEvidence,
} from "./contribution-rights";

export const KNOWLEDGE_BUNDLE_FORMAT = "org.agoranode.knowledge-bundle.v1";
export const KNOWLEDGE_ENTRY_FORMAT = "org.agoranode.knowledge-entry.v1";
export const REPOSITORY_PUBLICATION_FORMAT =
  "org.agoranode.repository-publication.v1" as const;

export type KnowledgeJson =
  | null
  | boolean
  | number
  | string
  | KnowledgeJson[]
  | { [key: string]: KnowledgeJson };

export type KnowledgeEntityKey = {
  spaceId: string;
  kind: string;
  id: string;
};

export type KnowledgeIdentity = KnowledgeEntityKey & { locale: string };

export type KnowledgeRightsStatus =
  | "reuse-not-documented"
  | "reference-only"
  | "licensed";

export type KnowledgeRights = {
  status: KnowledgeRightsStatus;
  licenseSpdx: string | null;
  attribution: string;
  reuseAllowed: boolean;
};

export type KnowledgeSourceInput = {
  sourceType: string;
  title: string;
  url: string;
  rights: KnowledgeRights;
};

export type KnowledgeRelationInput = {
  relationType: string;
  target: KnowledgeEntityKey;
  metadata: Record<string, KnowledgeJson>;
};

export type RepositoryPublicationRecord = {
  format: typeof REPOSITORY_PUBLICATION_FORMAT;
  author: { publicId: string; displayName: string };
  previousRevisionSha256: string | null;
  approval: {
    method: "repository-review";
    result: "approved";
    approvedAt: string | null;
    evidence: LegacyDecisionEvidence;
  };
};

export type KnowledgePublicationRecord =
  | RepositoryPublicationRecord
  | ContributionPublicationRecord;

export type KnowledgeRevisionInput = {
  identity: KnowledgeIdentity;
  content: Record<string, KnowledgeJson>;
  rights: KnowledgeRights;
  sourceType: string;
  publicationRecord: KnowledgePublicationRecord;
  sources: KnowledgeSourceInput[];
  relations: KnowledgeRelationInput[];
};

const SPACE_ID = /^[a-z0-9][a-z0-9._-]{1,127}$/;
const KIND = /^[a-z][a-z0-9-]{0,63}$/;
const ENTITY_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/;
const LOCALE = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/;
const SPDX = /^[A-Za-z0-9.+-]{1,80}$/;
const HASH = /^[0-9a-f]{64}$/;
const PUBLIC_AUTHOR_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function invalid(message: string): never {
  throw new Error(`Invalid knowledge value: ${message}`);
}

function plainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validUnicode(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
  }
  return true;
}

function encodeCanonical(value: unknown, seen: Set<object>): string {
  if (value === null) return "null";
  if (typeof value === "string") {
    if (!validUnicode(value)) invalid("string contains an unpaired surrogate");
    return JSON.stringify(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) {
      invalid("numbers must be safe integers");
    }
    return String(value);
  }
  if (typeof value !== "object") invalid("unsupported JSON value");
  if (seen.has(value)) invalid("cyclic JSON value");
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return `[${value.map((item) => encodeCanonical(item, seen)).join(",")}]`;
    }
    if (!plainObject(value)) invalid("non-plain JSON object");
    return `{${Object.keys(value)
      .sort()
      .map((key) => {
        if (!validUnicode(key)) invalid("key contains an unpaired surrogate");
        return `${JSON.stringify(key)}:${encodeCanonical(value[key], seen)}`;
      })
      .join(",")}}`;
  } finally {
    seen.delete(value);
  }
}

/** Canonical, integer-only JSON used by AgoràNode knowledge hashes and exports. */
export function canonicalKnowledgeJson(value: unknown): string {
  return encodeCanonical(value, new Set());
}

/** SHA-256 of canonicalKnowledgeJson(value), encoded as 64 lowercase hex digits. */
export async function canonicalKnowledgeHash(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalKnowledgeJson(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function requiredString(
  value: unknown,
  label: string,
  pattern: RegExp,
): string {
  if (
    typeof value !== "string" ||
    !pattern.test(value) ||
    value !== value.normalize("NFC")
  ) {
    invalid(`${label} is invalid`);
  }
  return value;
}

export function validateKnowledgeEntityKey(value: unknown): KnowledgeEntityKey {
  if (!plainObject(value)) invalid("entity key is not an object");
  const keys = Object.keys(value).sort();
  if (keys.join("\0") !== ["id", "kind", "spaceId"].join("\0")) {
    invalid("entity key has unknown or missing fields");
  }
  return {
    spaceId: requiredString(value.spaceId, "space ID", SPACE_ID),
    kind: requiredString(value.kind, "kind", KIND),
    id: requiredString(value.id, "entity ID", ENTITY_ID),
  };
}

export function validateKnowledgeIdentity(value: unknown): KnowledgeIdentity {
  if (!plainObject(value)) invalid("identity is not an object");
  const keys = Object.keys(value).sort();
  if (keys.join("\0") !== ["id", "kind", "locale", "spaceId"].join("\0")) {
    invalid("identity has unknown or missing fields");
  }
  const key = validateKnowledgeEntityKey({
    spaceId: value.spaceId,
    kind: value.kind,
    id: value.id,
  });
  return {
    ...key,
    locale: requiredString(value.locale, "locale", LOCALE),
  };
}

export function validateKnowledgeHash(value: unknown): string {
  if (typeof value !== "string" || !HASH.test(value)) invalid("SHA-256 is invalid");
  return value;
}

export function validateKnowledgeRights(value: unknown): KnowledgeRights {
  if (!plainObject(value)) invalid("rights are not an object");
  const keys = Object.keys(value).sort();
  if (
    keys.join("\0") !==
    ["attribution", "licenseSpdx", "reuseAllowed", "status"].join("\0")
  ) {
    invalid("rights have unknown or missing fields");
  }
  if (
    value.status !== "reuse-not-documented" &&
    value.status !== "reference-only" &&
    value.status !== "licensed"
  ) {
    invalid("rights status is invalid");
  }
  if (
    typeof value.attribution !== "string" ||
    value.attribution.length < 1 ||
    value.attribution.length > 2000 ||
    !validUnicode(value.attribution)
  ) {
    invalid("attribution is invalid");
  }
  if (value.licenseSpdx !== null && !SPDX.test(String(value.licenseSpdx))) {
    invalid("SPDX license is invalid");
  }
  const licensed = value.status === "licensed";
  if (licensed !== (value.licenseSpdx !== null) || value.reuseAllowed !== licensed) {
    invalid("reuse flag, status and license disagree");
  }
  return {
    status: value.status,
    licenseSpdx: value.licenseSpdx as string | null,
    attribution: value.attribution,
    reuseAllowed: value.reuseAllowed as boolean,
  };
}

export function validateKnowledgeUrl(value: unknown): string {
  if (typeof value !== "string" || value.length > 4096 || !validUnicode(value)) {
    invalid("source URL is invalid");
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    invalid("source URL cannot be parsed");
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    invalid("source URL must be credential-free HTTPS");
  }
  return value;
}

function validateSource(value: unknown): KnowledgeSourceInput {
  if (!plainObject(value)) invalid("source is not an object");
  const sourceType = requiredString(value.sourceType, "source type", KIND);
  if (
    typeof value.title !== "string" ||
    value.title.length < 1 ||
    value.title.length > 500 ||
    !validUnicode(value.title)
  ) {
    invalid("source title is invalid");
  }
  return {
    sourceType,
    title: value.title,
    url: validateKnowledgeUrl(value.url),
    rights: validateKnowledgeRights(value.rights),
  };
}

function validateRelation(value: unknown): KnowledgeRelationInput {
  if (!plainObject(value)) invalid("relation is not an object");
  if (!plainObject(value.metadata)) invalid("relation metadata is not an object");
  canonicalKnowledgeJson(value.metadata);
  return {
    relationType: requiredString(value.relationType, "relation type", KIND),
    target: validateKnowledgeEntityKey(value.target),
    metadata: value.metadata as Record<string, KnowledgeJson>,
  };
}

function exactKeys(value: Record<string, unknown>, expected: string[], label: string) {
  const actual = Object.keys(value).sort();
  const sorted = [...expected].sort();
  if (
    actual.length !== sorted.length ||
    actual.some((key, index) => key !== sorted[index])
  ) {
    invalid(`${label} has unknown or missing fields`);
  }
}

function publicContributor(value: unknown) {
  if (!plainObject(value)) invalid("repository author is not an object");
  exactKeys(value, ["publicId", "displayName"], "repository author");
  const publicId = requiredString(
    value.publicId,
    "public author ID",
    PUBLIC_AUTHOR_ID,
  );
  if (
    typeof value.displayName !== "string" ||
    value.displayName.length < 1 ||
    value.displayName.length > 160 ||
    value.displayName !== value.displayName.normalize("NFC") ||
    !validUnicode(value.displayName)
  ) {
    invalid("public author display name is invalid");
  }
  return { publicId, displayName: value.displayName };
}

export async function validateKnowledgePublicationRecord(
  value: unknown,
): Promise<KnowledgePublicationRecord> {
  if (!plainObject(value)) invalid("publication record is not an object");
  if (value.format === CONTRIBUTION_PUBLICATION_FORMAT) {
    return validateContributionPublicationRecord(value);
  }
  exactKeys(
    value,
    ["format", "author", "previousRevisionSha256", "approval"],
    "repository publication record",
  );
  if (value.format !== REPOSITORY_PUBLICATION_FORMAT) {
    invalid("publication record format is unsupported");
  }
  if (!plainObject(value.approval)) invalid("repository approval is not an object");
  exactKeys(
    value.approval,
    ["method", "result", "approvedAt", "evidence"],
    "repository approval",
  );
  if (
    value.approval.method !== "repository-review" ||
    value.approval.result !== "approved"
  ) {
    invalid("repository approval is invalid");
  }
  if (
    value.approval.approvedAt !== null &&
    (typeof value.approval.approvedAt !== "string" ||
      !ISO_INSTANT.test(value.approval.approvedAt) ||
      new Date(value.approval.approvedAt).toISOString() !==
        value.approval.approvedAt)
  ) {
    invalid("repository approval time is invalid");
  }
  const evidence = await validateDemocraticDecisionEvidence(
    value.approval.evidence,
    {
      method: "single",
      result: "approved",
      allowLegacy: true,
    },
  );
  if (evidence.status !== "legacy-not-recorded") {
    invalid("repository approval must mark unavailable legacy evidence");
  }
  return {
    format: REPOSITORY_PUBLICATION_FORMAT,
    author: publicContributor(value.author),
    previousRevisionSha256:
      value.previousRevisionSha256 === null
        ? null
        : validateKnowledgeHash(value.previousRevisionSha256),
    approval: {
      method: "repository-review",
      result: "approved",
      approvedAt: value.approval.approvedAt as string | null,
      evidence: { ...LEGACY_NOT_RECORDED_DECISION_EVIDENCE },
    },
  };
}

export async function validateKnowledgeRevisionInput(
  value: unknown,
): Promise<KnowledgeRevisionInput> {
  if (!plainObject(value)) invalid("revision is not an object");
  if (!plainObject(value.content)) invalid("revision content is not an object");
  const contentJson = canonicalKnowledgeJson(value.content);
  if (new TextEncoder().encode(contentJson).length > 1024 * 1024) {
    invalid("revision content is too large");
  }
  if (!Array.isArray(value.sources) || value.sources.length > 4096) {
    invalid("sources are invalid");
  }
  if (!Array.isArray(value.relations) || value.relations.length > 4096) {
    invalid("relations are invalid");
  }
  const publicationRecord = await validateKnowledgePublicationRecord(
    value.publicationRecord,
  );
  const revisionRights = validateKnowledgeRights(value.rights);
  // A contribution's public license applies only to the submitted contribution,
  // never to citations or the complete composite revision stored here.
  if (
    publicationRecord.format === CONTRIBUTION_PUBLICATION_FORMAT &&
    (revisionRights.status !== "reuse-not-documented" ||
      revisionRights.licenseSpdx !== null ||
      revisionRights.reuseAllowed)
  ) {
    invalid("composite revision rights must not broaden a contribution license");
  }
  return {
    identity: validateKnowledgeIdentity(value.identity),
    content: value.content as Record<string, KnowledgeJson>,
    rights: revisionRights,
    sourceType: requiredString(value.sourceType, "source type", KIND),
    publicationRecord,
    sources: value.sources.map(validateSource),
    relations: value.relations.map(validateRelation),
  };
}

export async function knowledgeEntityHash(keyValue: KnowledgeEntityKey) {
  const key = validateKnowledgeEntityKey(keyValue);
  return canonicalKnowledgeHash({
    format: "org.agoranode.knowledge-entity.v1",
    ...key,
  });
}

export async function knowledgeRevisionEnvelope(inputValue: KnowledgeRevisionInput) {
  const input = await validateKnowledgeRevisionInput(inputValue);
  const relations = [...input.relations].sort((left, right) => {
    const a = canonicalKnowledgeJson(left);
    const b = canonicalKnowledgeJson(right);
    return a < b ? -1 : a > b ? 1 : 0;
  });
  return {
    format: "org.agoranode.knowledge-revision.v1",
    identity: input.identity,
    sourceType: input.sourceType,
    rights: input.rights,
    publicationRecord: input.publicationRecord,
    content: input.content,
    sources: input.sources,
    relations,
  };
}

export async function knowledgeRevisionHash(input: KnowledgeRevisionInput) {
  return canonicalKnowledgeHash(await knowledgeRevisionEnvelope(input));
}

export async function knowledgeSourceHash(
  spaceId: string,
  sourceValue: KnowledgeSourceInput,
) {
  const source = validateSource(sourceValue);
  validateKnowledgeEntityKey({ spaceId, kind: "source", id: "validation" });
  return canonicalKnowledgeHash({
    format: "org.agoranode.knowledge-source.v1",
    spaceId,
    ...source,
  });
}

export async function knowledgeSourceLinkHash(
  revisionSha256: string,
  sourceSha256: string,
  ordinal: number,
) {
  validateKnowledgeHash(revisionSha256);
  validateKnowledgeHash(sourceSha256);
  if (!Number.isSafeInteger(ordinal) || ordinal < 0 || ordinal > 4095) {
    invalid("source ordinal is invalid");
  }
  return canonicalKnowledgeHash({
    format: "org.agoranode.knowledge-source-link.v1",
    revisionSha256,
    sourceSha256,
    ordinal,
  });
}

export async function knowledgeRelationHash(
  revisionSha256: string,
  relationValue: KnowledgeRelationInput,
) {
  validateKnowledgeHash(revisionSha256);
  const relation = validateRelation(relationValue);
  return canonicalKnowledgeHash({
    format: "org.agoranode.knowledge-relation.v1",
    revisionSha256,
    ...relation,
  });
}
