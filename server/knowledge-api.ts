import { CONTRIBUTION_PUBLICATION_FORMAT } from "../app/lib/contribution-rights";
import { INSTANCE_MANIFEST } from "../app/lib/instance";
import {
  PUBLIC_KNOWLEDGE_HISTORY_FORMAT,
  PUBLIC_KNOWLEDGE_REVISION_FORMAT,
  type PublicKnowledgeCurrentEntity,
  type PublicKnowledgeHistory,
  type PublicKnowledgeRevision,
  type PublicKnowledgeRevisionDocument,
} from "../app/lib/public-knowledge";
import type { Connections } from "./database";
import {
  exportKnowledgeBundle,
  readKnowledgeEntity,
  readKnowledgeEntityHistory,
  readKnowledgeRevision,
  serializeKnowledgeBundle,
  type KnowledgeBundleEntity,
} from "./knowledge";

const PUBLIC_HEADERS = {
  "cache-control": "public, max-age=60, stale-while-revalidate=300",
  "content-type": "application/json; charset=utf-8",
} as const;
const ERROR_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
} as const;
const PUBLIC_KINDS = new Set(["event", "person"] as const);
const PUBLIC_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function error(message: string, status: number, allow?: string) {
  return Response.json(
    { error: message },
    { status, headers: allow ? { ...ERROR_HEADERS, allow } : ERROR_HEADERS },
  );
}

function currentEntity(entry: KnowledgeBundleEntity): PublicKnowledgeCurrentEntity {
  return {
    entitySha256: entry.entitySha256,
    revisionSha256: entry.revisionSha256,
    identity: entry.identity,
    sourceType: entry.sourceType,
    rights: entry.rights,
    content: entry.content,
    sources: entry.sources.map((source) => ({
      sourceType: source.sourceType,
      title: source.title,
      url: source.url,
      rights: source.rights,
      ordinal: source.ordinal,
      sourceSha256: source.sourceSha256,
      linkSha256: source.linkSha256,
    })),
    relations: entry.relations.map((relation) => ({
      relationType: relation.relationType,
      target: relation.target,
      metadata: relation.metadata,
      relationSha256: relation.relationSha256,
      targetEntitySha256: relation.targetEntitySha256,
    })),
  };
}

function publicRevision(
  entry: KnowledgeBundleEntity,
  currentRevisionSha256: string,
): PublicKnowledgeRevision {
  const record = entry.publicationRecord;
  if (record.format === CONTRIBUTION_PUBLICATION_FORMAT) {
    return {
      revisionSha256: entry.revisionSha256,
      publicationRecordSha256: entry.publicationRecordSha256,
      publicLicenseSha256: entry.publicLicenseSha256,
      current: entry.revisionSha256 === currentRevisionSha256,
      sourceType: entry.sourceType,
      rights: entry.rights,
      publicationKind: "community-contribution",
      author: record.provenance.author,
      publicLicense: record.publicLicense,
      licenseScope: record.scope,
      previousRevisionSha256: record.provenance.previousRevisionSha256,
      request: {
        forumTopicId: record.provenance.request.forumTopicId,
        forumTopicUrl: `/polisrossa?view=partecipa&proposal=${record.provenance.request.forumTopicId}`,
        requestedBy: record.provenance.request.requestedBy,
      },
      decision: { ...record.provenance.decision, result: "approved" },
    };
  }
  return {
    revisionSha256: entry.revisionSha256,
    publicationRecordSha256: entry.publicationRecordSha256,
    publicLicenseSha256: null,
    current: entry.revisionSha256 === currentRevisionSha256,
    sourceType: entry.sourceType,
    rights: entry.rights,
    publicationKind: "repository-seed",
    author: record.author,
    publicLicense: null,
    licenseScope: null,
    previousRevisionSha256: record.previousRevisionSha256,
    request: null,
    decision: {
      id: null,
      method: record.approval.method,
      result: record.approval.result,
      decidedAt: record.approval.approvedAt,
    },
  };
}

function entityQuery(url: URL) {
  const keys = [...url.searchParams.keys()];
  if (
    keys.length !== 3 ||
    keys.some(
      (key) =>
        !["kind", "id", "locale"].includes(key) ||
        url.searchParams.getAll(key).length !== 1,
    )
  ) {
    return null;
  }
  const kind = url.searchParams.get("kind");
  const id = url.searchParams.get("id");
  const locale = url.searchParams.get("locale");
  if (
    (kind !== "event" && kind !== "person") ||
    !PUBLIC_KINDS.has(kind) ||
    !id ||
    id.length > 191 ||
    !PUBLIC_ID.test(id) ||
    locale !== INSTANCE_MANIFEST.instance.language
  ) {
    return null;
  }
  return { kind, id, locale: "it" as const };
}

function revisionQuery(url: URL) {
  const keys = [...url.searchParams.keys()];
  if (
    keys.length !== 4 ||
    keys.some(
      (key) =>
        !["kind", "id", "locale", "revision"].includes(key) ||
        url.searchParams.getAll(key).length !== 1,
    )
  ) {
    return null;
  }
  const revisionSha256 = url.searchParams.get("revision");
  url.searchParams.delete("revision");
  const identity = entityQuery(url);
  if (!identity || !revisionSha256 || !/^[0-9a-f]{64}$/.test(revisionSha256)) {
    return null;
  }
  return { identity, revisionSha256 };
}

export async function publicKnowledgeEntityResponse(
  request: Request,
  pool: Connections,
): Promise<Response> {
  if (request.method !== "GET") return error("Method not allowed", 405, "GET");
  const query = entityQuery(new URL(request.url));
  if (!query) return error("Invalid request", 400);
  try {
    const history = await readKnowledgeEntityHistory(pool, {
      spaceId: INSTANCE_MANIFEST.instance.id,
      ...query,
    });
    if (!history) return error("Knowledge entity not found", 404);
    const body: PublicKnowledgeHistory = {
      format: PUBLIC_KNOWLEDGE_HISTORY_FORMAT,
      current: currentEntity(history.current),
      revisions: history.revisions.map((revision) =>
        publicRevision(revision, history.current.revisionSha256),
      ),
    };
    return Response.json(body, { headers: PUBLIC_HEADERS });
  } catch {
    return error("Knowledge history temporarily unavailable", 503);
  }
}

export async function publicKnowledgeRevisionResponse(
  request: Request,
  pool: Connections,
): Promise<Response> {
  if (request.method !== "GET") return error("Method not allowed", 405, "GET");
  const query = revisionQuery(new URL(request.url));
  if (!query) return error("Invalid request", 400);
  const identity = {
    spaceId: INSTANCE_MANIFEST.instance.id,
    ...query.identity,
  };
  try {
    const [current, revision] = await Promise.all([
      readKnowledgeEntity(pool, identity),
      readKnowledgeRevision(pool, identity, query.revisionSha256),
    ]);
    if (!current || !revision) return error("Knowledge revision not found", 404);
    const body: PublicKnowledgeRevisionDocument = {
      format: PUBLIC_KNOWLEDGE_REVISION_FORMAT,
      entity: currentEntity(revision),
      revision: publicRevision(revision, current.revisionSha256),
    };
    return Response.json(body, { headers: PUBLIC_HEADERS });
  } catch {
    return error("Knowledge revision temporarily unavailable", 503);
  }
}

export async function publicKnowledgeExportResponse(
  request: Request,
  pool: Connections,
): Promise<Response> {
  if (request.method !== "GET") return error("Method not allowed", 405, "GET");
  if ([...new URL(request.url).searchParams.keys()].length) {
    return error("Invalid request", 400);
  }
  try {
    const bundle = await exportKnowledgeBundle(pool, INSTANCE_MANIFEST.instance.id);
    const body = await serializeKnowledgeBundle(bundle);
    const etag = `"sha256-${bundle.sha256}"`;
    const headers = {
      ...PUBLIC_HEADERS,
      "content-disposition": 'attachment; filename="polisrossa-knowledge-v1.json"',
      etag,
    };
    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, { status: 304, headers });
    }
    return new Response(body, { headers });
  } catch {
    return error("Knowledge export temporarily unavailable", 503);
  }
}
