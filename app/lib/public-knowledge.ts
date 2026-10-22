import type { PublicLicenseSelection } from "./contribution-rights";
import type {
  KnowledgeIdentity,
  KnowledgeJson,
  KnowledgeRights,
} from "./knowledge-model";

export const PUBLIC_KNOWLEDGE_HISTORY_FORMAT =
  "org.agoranode.public-knowledge-history.v1" as const;
export const PUBLIC_KNOWLEDGE_REVISION_FORMAT =
  "org.agoranode.public-knowledge-revision.v1" as const;

export type PublicKnowledgeContributor = {
  publicId: string;
  displayName: string;
};

export type PublicKnowledgeRevision = {
  revisionSha256: string;
  publicationRecordSha256: string;
  publicLicenseSha256: string | null;
  current: boolean;
  sourceType: string;
  rights: KnowledgeRights;
  publicationKind: "repository-seed" | "community-contribution";
  author: PublicKnowledgeContributor;
  publicLicense: PublicLicenseSelection | null;
  licenseScope: "submitted-contribution-only" | null;
  previousRevisionSha256: string | null;
  request: {
    forumTopicId: string;
    forumTopicUrl: string;
    requestedBy: PublicKnowledgeContributor;
  } | null;
  decision: {
    id: string | null;
    method: "repository-review" | "single" | "approval" | "ranked";
    result: "approved";
    decidedAt: string | null;
  };
};

export type PublicKnowledgeCurrentEntity = {
  entitySha256: string;
  revisionSha256: string;
  identity: KnowledgeIdentity;
  sourceType: string;
  rights: KnowledgeRights;
  content: Record<string, KnowledgeJson>;
  sources: Array<{
    sourceType: string;
    title: string;
    url: string;
    rights: KnowledgeRights;
    ordinal: number;
    sourceSha256: string;
    linkSha256: string;
  }>;
  relations: Array<{
    relationType: string;
    target: { spaceId: string; kind: string; id: string };
    metadata: Record<string, KnowledgeJson>;
    relationSha256: string;
    targetEntitySha256: string;
  }>;
};

export type PublicKnowledgeHistory = {
  format: typeof PUBLIC_KNOWLEDGE_HISTORY_FORMAT;
  current: PublicKnowledgeCurrentEntity;
  revisions: PublicKnowledgeRevision[];
};

export type PublicKnowledgeRevisionDocument = {
  format: typeof PUBLIC_KNOWLEDGE_REVISION_FORMAT;
  entity: PublicKnowledgeCurrentEntity;
  revision: PublicKnowledgeRevision;
};

const HASH = /^[0-9a-f]{64}$/;

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function contributor(value: unknown): value is PublicKnowledgeContributor {
  return (
    record(value) &&
    typeof value.publicId === "string" &&
    typeof value.displayName === "string"
  );
}

function safeDiscussionUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.startsWith("//")) return false;
  if (value.startsWith("/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function revision(value: unknown): value is PublicKnowledgeRevision {
  if (
    !record(value) ||
    typeof value.revisionSha256 !== "string" ||
    !HASH.test(value.revisionSha256) ||
    typeof value.publicationRecordSha256 !== "string" ||
    !HASH.test(value.publicationRecordSha256) ||
    typeof value.current !== "boolean" ||
    !record(value.rights) ||
    !contributor(value.author) ||
    !record(value.decision) ||
    value.decision.result !== "approved"
  ) {
    return false;
  }
  if (
    value.publicLicenseSha256 !== null &&
    (typeof value.publicLicenseSha256 !== "string" ||
      !HASH.test(value.publicLicenseSha256))
  ) {
    return false;
  }
  if (value.request !== null) {
    if (
      !record(value.request) ||
      typeof value.request.forumTopicId !== "string" ||
      !safeDiscussionUrl(value.request.forumTopicUrl) ||
      !contributor(value.request.requestedBy)
    ) {
      return false;
    }
  }
  return value.publicLicense === null || record(value.publicLicense);
}

/** Narrow validation at the browser boundary; server-side hashes remain authoritative. */
export function isPublicKnowledgeHistory(
  value: unknown,
  expected: { kind: string; id: string; locale: string },
): value is PublicKnowledgeHistory {
  if (
    !record(value) ||
    value.format !== PUBLIC_KNOWLEDGE_HISTORY_FORMAT ||
    !record(value.current) ||
    !record(value.current.identity) ||
    value.current.identity.spaceId !== "polisrossa" ||
    value.current.identity.kind !== expected.kind ||
    value.current.identity.id !== expected.id ||
    value.current.identity.locale !== expected.locale ||
    typeof value.current.revisionSha256 !== "string" ||
    !HASH.test(value.current.revisionSha256) ||
    !Array.isArray(value.revisions) ||
    value.revisions.length < 1 ||
    !value.revisions.every(revision)
  ) {
    return false;
  }
  const currentRevisionSha256 = value.current.revisionSha256;
  return (
    value.revisions.filter(
      (item) =>
        item.current &&
        item.revisionSha256 === currentRevisionSha256,
    ).length === 1
  );
}
