import {
  AGORANODE_MINIMUM_GRANT,
  CONTRIBUTION_PUBLICATION_FORMAT,
} from "../app/lib/contribution-rights";
import {
  KNOWLEDGE_BUNDLE_FORMAT,
  canonicalKnowledgeHash,
  canonicalKnowledgeJson,
  knowledgeEntityHash,
  knowledgeRelationHash,
  knowledgeRevisionHash,
  knowledgeSourceHash,
  knowledgeSourceLinkHash,
  validateKnowledgeHash,
  validateKnowledgeIdentity,
  validateKnowledgeRevisionInput,
  type KnowledgeIdentity,
  type KnowledgeJson,
  type KnowledgeRelationInput,
  type KnowledgeRevisionInput,
  type KnowledgeSourceInput,
} from "../app/lib/knowledge-model";
import type {
  KnowledgeBundle,
  KnowledgeBundleEntity,
  KnowledgeBundleRelation,
  KnowledgeBundleSource,
} from "./knowledge";

const MAX_BUNDLE_REVISIONS = 100_000;
const MAX_SOURCES_PER_REVISION = 4_096;
const MAX_RELATIONS_PER_REVISION = 4_096;
const EMAIL = /(?:^|[^A-Za-z0-9._%+-])[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+(?:$|[^A-Za-z0-9-])/;
const PRIVATE_FIELD_NAMES = new Set([
  "accountid",
  "accesstoken",
  "authsecret",
  "cookie",
  "credential",
  "email",
  "emailaddress",
  "facebookid",
  "ipaddress",
  "oauth",
  "oauthcode",
  "ownerid",
  "password",
  "refreshtoken",
  "session",
  "sessionid",
  "smtp",
  "secret",
  "token",
  "userid",
  "useragent",
]);
const PRIVATE_URL_PARAMETER_NAMES = new Set([
  ...PRIVATE_FIELD_NAMES,
  "apikey",
  "authorization",
  "bearer",
  "clientsecret",
  "jwt",
  "signature",
  "signedtoken",
]);

function isPrivateUrlParameter(name: string) {
  const normalized = name.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
  return (
    PRIVATE_URL_PARAMETER_NAMES.has(normalized) ||
    /(?:token|secret|signature)$/.test(normalized)
  );
}

export class KnowledgeReplicationError extends Error {
  constructor(message: string) {
    super(`Invalid public knowledge replication material: ${message}`);
    this.name = "KnowledgeReplicationError";
  }
}

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

function lexical(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function identityOrder(left: KnowledgeIdentity, right: KnowledgeIdentity) {
  return (
    lexical(left.spaceId, right.spaceId) ||
    lexical(left.kind, right.kind) ||
    lexical(left.id, right.id) ||
    lexical(left.locale, right.locale)
  );
}

function identityKey(identity: KnowledgeIdentity) {
  return canonicalKnowledgeJson(identity);
}

function assertPublicPayload(value: unknown, path = "content") {
  if (typeof value === "string") {
    if (EMAIL.test(` ${value} `)) fail(`${path} contains an email address`);
    return;
  }
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertPublicPayload(item, `${path}[${index}]`));
    return;
  }
  if (!plainObject(value)) fail(`${path} is not canonical public JSON`);
  for (const [key, nested] of Object.entries(value)) {
    const normalized = key.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
    if (PRIVATE_FIELD_NAMES.has(normalized)) {
      fail(`${path} contains the private field ${key}`);
    }
    assertPublicPayload(nested, `${path}.${key}`);
  }
}

function parseSource(value: unknown, expectedOrdinal: number): KnowledgeBundleSource {
  if (!plainObject(value)) fail("source is not an object");
  exactKeys(
    value,
    [
      "sourceType",
      "title",
      "url",
      "rights",
      "ordinal",
      "sourceSha256",
      "linkSha256",
    ],
    "source",
  );
  if (value.ordinal !== expectedOrdinal) {
    fail("source ordinals must be contiguous and start at zero");
  }
  return {
    sourceType: value.sourceType as string,
    title: value.title as string,
    url: value.url as string,
    rights: value.rights as KnowledgeBundleSource["rights"],
    ordinal: expectedOrdinal,
    sourceSha256: validateKnowledgeHash(value.sourceSha256),
    linkSha256: validateKnowledgeHash(value.linkSha256),
  };
}

function parseRelation(value: unknown): KnowledgeBundleRelation {
  if (!plainObject(value)) fail("relation is not an object");
  exactKeys(
    value,
    [
      "relationType",
      "target",
      "metadata",
      "relationSha256",
      "targetEntitySha256",
    ],
    "relation",
  );
  return {
    relationType: value.relationType as string,
    target: value.target as KnowledgeBundleRelation["target"],
    metadata: value.metadata as Record<string, KnowledgeJson>,
    relationSha256: validateKnowledgeHash(value.relationSha256),
    targetEntitySha256: validateKnowledgeHash(value.targetEntitySha256),
  };
}

async function parseRevision(
  value: unknown,
  spaceId: string,
): Promise<KnowledgeBundleEntity> {
  if (!plainObject(value)) fail("revision is not an object");
  exactKeys(
    value,
    [
      "entitySha256",
      "revisionSha256",
      "identity",
      "sourceType",
      "publicationRecordSha256",
      "publicLicenseSha256",
      "publicationRecord",
      "rights",
      "content",
      "sources",
      "relations",
    ],
    "revision",
  );
  const identity = validateKnowledgeIdentity(value.identity);
  if (identity.spaceId !== spaceId) fail("revision crosses the bundle instance");
  if (!Array.isArray(value.sources) || value.sources.length > MAX_SOURCES_PER_REVISION) {
    fail("revision sources are invalid");
  }
  if (
    !Array.isArray(value.relations) ||
    value.relations.length > MAX_RELATIONS_PER_REVISION
  ) {
    fail("revision relations are invalid");
  }
  const sources = value.sources.map(parseSource);
  const relations = value.relations.map(parseRelation);
  const input = await validateKnowledgeRevisionInput({
    identity,
    sourceType: value.sourceType,
    publicationRecord: value.publicationRecord,
    rights: value.rights,
    content: value.content,
    sources: sources.map(
      ({ sourceType, title, url, rights }): KnowledgeSourceInput => ({
        sourceType,
        title,
        url,
        rights,
      }),
    ),
    relations: relations.map(
      ({ relationType, target, metadata }): KnowledgeRelationInput => ({
        relationType,
        target,
        metadata,
      }),
    ),
  });
  assertPublicPayload(input.content);
  assertPublicPayload(input.publicationRecord, "publicationRecord");
  input.relations.forEach((relation, index) => {
    if (relation.target.spaceId !== spaceId) {
      fail("relation crosses the bundle instance");
    }
    assertPublicPayload(relation.metadata, `relations[${index}].metadata`);
  });
  for (const [index, source] of input.sources.entries()) {
    assertPublicPayload(source.title, `sources[${index}].title`);
    assertPublicPayload(source.rights.attribution, `sources[${index}].attribution`);
    const sourceUrl = new URL(source.url);
    let decodedUrl: string;
    try {
      decodedUrl = decodeURIComponent(source.url);
    } catch {
      fail(`sources[${index}].url has invalid percent encoding`);
    }
    assertPublicPayload(decodedUrl, `sources[${index}].url`);
    for (const [key, nested] of sourceUrl.searchParams) {
      if (isPrivateUrlParameter(key)) {
        fail(`sources[${index}].url has a private query parameter`);
      }
      assertPublicPayload(nested, `sources[${index}].urlQuery.${key}`);
    }
  }
  assertPublicPayload(input.rights.attribution, "rights.attribution");

  const entitySha256 = validateKnowledgeHash(value.entitySha256);
  const revisionSha256 = validateKnowledgeHash(value.revisionSha256);
  const publicationRecordSha256 = validateKnowledgeHash(
    value.publicationRecordSha256,
  );
  const expectedEntitySha256 = await knowledgeEntityHash({
    spaceId,
    kind: identity.kind,
    id: identity.id,
  });
  if (entitySha256 !== expectedEntitySha256) fail("entity address does not match");
  if ((await knowledgeRevisionHash(input)) !== revisionSha256) {
    fail("revision address does not match");
  }
  if (
    (await canonicalKnowledgeHash(input.publicationRecord)) !==
    publicationRecordSha256
  ) {
    fail("publication provenance address does not match");
  }
  let publicLicenseSha256: string | null = null;
  if (input.publicationRecord.format === CONTRIBUTION_PUBLICATION_FORMAT) {
    publicLicenseSha256 = validateKnowledgeHash(value.publicLicenseSha256);
    if (
      (await canonicalKnowledgeHash(input.publicationRecord.publicLicense)) !==
      publicLicenseSha256
    ) {
      fail("public license address does not match");
    }
  } else if (value.publicLicenseSha256 !== null) {
    fail("repository revision cannot claim a contribution license address");
  }
  for (const [ordinal, source] of sources.entries()) {
    const sourceInput: KnowledgeSourceInput = {
      sourceType: source.sourceType,
      title: source.title,
      url: source.url,
      rights: source.rights,
    };
    if ((await knowledgeSourceHash(spaceId, sourceInput)) !== source.sourceSha256) {
      fail("source address does not match");
    }
    if (
      (await knowledgeSourceLinkHash(
        revisionSha256,
        source.sourceSha256,
        ordinal,
      )) !== source.linkSha256
    ) {
      fail("source link address does not match");
    }
  }
  for (const relation of relations) {
    const relationInput: KnowledgeRelationInput = {
      relationType: relation.relationType,
      target: relation.target,
      metadata: relation.metadata,
    };
    if ((await knowledgeEntityHash(relation.target)) !== relation.targetEntitySha256) {
      fail("relation target address does not match");
    }
    if (
      (await knowledgeRelationHash(revisionSha256, relationInput)) !==
      relation.relationSha256
    ) {
      fail("relation address does not match");
    }
  }
  const sortedRelations = [...relations].sort(
    (left, right) =>
      lexical(left.relationType, right.relationType) ||
      lexical(left.target.spaceId, right.target.spaceId) ||
      lexical(left.target.kind, right.target.kind) ||
      lexical(left.target.id, right.target.id) ||
      lexical(left.relationSha256, right.relationSha256),
  );
  if (canonicalKnowledgeJson(sortedRelations) !== canonicalKnowledgeJson(relations)) {
    fail("relations are not in canonical order");
  }
  return {
    entitySha256,
    revisionSha256,
    identity,
    sourceType: input.sourceType,
    publicationRecordSha256,
    publicLicenseSha256,
    publicationRecord: input.publicationRecord,
    rights: input.rights,
    content: input.content,
    sources,
    relations,
  };
}

function previousRevision(entry: KnowledgeBundleEntity): string | null {
  return entry.publicationRecord.format === CONTRIBUTION_PUBLICATION_FORMAT
    ? entry.publicationRecord.provenance.previousRevisionSha256
    : entry.publicationRecord.previousRevisionSha256;
}

function assertLinearHistory(
  entries: KnowledgeBundleEntity[],
  currentRevisionSha256: string,
) {
  const byHash = new Map(entries.map((entry) => [entry.revisionSha256, entry]));
  const childByPrevious = new Map<string, KnowledgeBundleEntity>();
  const roots: KnowledgeBundleEntity[] = [];
  for (const entry of entries) {
    const previous = previousRevision(entry);
    if (previous === null) {
      roots.push(entry);
      continue;
    }
    if (!byHash.has(previous)) fail("revision predecessor is absent from the bundle");
    if (childByPrevious.has(previous)) fail("bundle contains a revision fork");
    childByPrevious.set(previous, entry);
  }
  if (roots.length !== 1) fail("revision history must have exactly one root");
  let cursor = roots[0];
  const visited = new Set<string>();
  while (cursor) {
    if (visited.has(cursor.revisionSha256)) fail("revision history contains a cycle");
    visited.add(cursor.revisionSha256);
    const child = childByPrevious.get(cursor.revisionSha256);
    if (!child) break;
    cursor = child;
  }
  if (visited.size !== entries.length) fail("revision history is disconnected");
  if (cursor.revisionSha256 !== currentRevisionSha256) {
    fail("current pointer is not the unique revision tip");
  }
}

/**
 * Fully validates the deterministic public-only export before it can reach a
 * replica database. The accepted result is rebuilt from validated fields, so
 * unknown account, session, OAuth or secret fields cannot ride along.
 */
export async function validateKnowledgeBundle(value: unknown): Promise<KnowledgeBundle> {
  if (!plainObject(value)) fail("bundle is not an object");
  exactKeys(
    value,
    ["format", "spaceId", "platformGrants", "revisions", "currentRevisions", "sha256"],
    "bundle",
  );
  if (value.format !== KNOWLEDGE_BUNDLE_FORMAT) fail("bundle format is unsupported");
  const spaceId = validateKnowledgeIdentity({
    spaceId: value.spaceId,
    kind: "space",
    id: "validation",
    locale: "it",
  }).spaceId;
  if (
    !Array.isArray(value.platformGrants) ||
    value.platformGrants.length !== 1 ||
    canonicalKnowledgeJson(value.platformGrants[0]) !==
      canonicalKnowledgeJson(AGORANODE_MINIMUM_GRANT)
  ) {
    fail("bundle does not carry the exact supported platform grant");
  }
  if (!Array.isArray(value.revisions) || value.revisions.length > MAX_BUNDLE_REVISIONS) {
    fail("revision collection is invalid");
  }
  if (!Array.isArray(value.currentRevisions)) fail("current pointers are invalid");
  const revisions: KnowledgeBundleEntity[] = [];
  for (const revision of value.revisions) {
    revisions.push(await parseRevision(revision, spaceId));
  }
  const sortedRevisions = [...revisions].sort(
    (left, right) =>
      identityOrder(left.identity, right.identity) ||
      lexical(left.revisionSha256, right.revisionSha256),
  );
  if (canonicalKnowledgeJson(sortedRevisions) !== canonicalKnowledgeJson(revisions)) {
    fail("revisions are not in canonical order");
  }
  const hashes = new Set<string>();
  const entityAddresses = new Map<string, string>();
  const revisionsByIdentity = new Map<string, KnowledgeBundleEntity[]>();
  for (const revision of revisions) {
    if (hashes.has(revision.revisionSha256)) fail("revision address is duplicated");
    hashes.add(revision.revisionSha256);
    const entityKey = `${revision.identity.kind}\0${revision.identity.id}`;
    const oldAddress = entityAddresses.get(entityKey);
    if (oldAddress && oldAddress !== revision.entitySha256) {
      fail("one entity has conflicting content addresses");
    }
    entityAddresses.set(entityKey, revision.entitySha256);
    const key = identityKey(revision.identity);
    const entries = revisionsByIdentity.get(key) ?? [];
    entries.push(revision);
    revisionsByIdentity.set(key, entries);
  }
  for (const revision of revisions) {
    for (const relation of revision.relations) {
      const key = `${relation.target.kind}\0${relation.target.id}`;
      if (entityAddresses.get(key) !== relation.targetEntitySha256) {
        fail("relation target is absent from this instance bundle");
      }
    }
  }

  const currentRevisions: KnowledgeBundle["currentRevisions"] = [];
  const currentKeys = new Set<string>();
  for (const valuePointer of value.currentRevisions) {
    if (!plainObject(valuePointer)) fail("current pointer is not an object");
    exactKeys(
      valuePointer,
      ["identity", "entitySha256", "revisionSha256"],
      "current pointer",
    );
    const identity = validateKnowledgeIdentity(valuePointer.identity);
    if (identity.spaceId !== spaceId) fail("current pointer crosses the bundle instance");
    const pointer = {
      identity,
      entitySha256: validateKnowledgeHash(valuePointer.entitySha256),
      revisionSha256: validateKnowledgeHash(valuePointer.revisionSha256),
    };
    const key = identityKey(identity);
    if (currentKeys.has(key)) fail("current pointer is duplicated");
    currentKeys.add(key);
    const entries = revisionsByIdentity.get(key);
    const selected = entries?.find(
      (entry) => entry.revisionSha256 === pointer.revisionSha256,
    );
    if (!entries || !selected || selected.entitySha256 !== pointer.entitySha256) {
      fail("current pointer does not address an exported revision");
    }
    assertLinearHistory(entries, pointer.revisionSha256);
    currentRevisions.push(pointer);
  }
  if (currentKeys.size !== revisionsByIdentity.size) {
    fail("every revision history must have one current pointer");
  }
  const sortedPointers = [...currentRevisions].sort((left, right) =>
    identityOrder(left.identity, right.identity),
  );
  if (canonicalKnowledgeJson(sortedPointers) !== canonicalKnowledgeJson(currentRevisions)) {
    fail("current pointers are not in canonical order");
  }
  const sha256 = validateKnowledgeHash(value.sha256);
  const body = {
    format: KNOWLEDGE_BUNDLE_FORMAT as typeof KNOWLEDGE_BUNDLE_FORMAT,
    spaceId,
    platformGrants: [AGORANODE_MINIMUM_GRANT] as [typeof AGORANODE_MINIMUM_GRANT],
    revisions,
    currentRevisions,
  };
  if ((await canonicalKnowledgeHash(body)) !== sha256) {
    fail("bundle SHA-256 does not match its canonical public contents");
  }
  return { ...body, sha256 };
}

/** Orders a completely validated linear bundle root-to-tip for atomic import. */
export function knowledgeBundleImportOrder(
  bundle: KnowledgeBundle,
): KnowledgeRevisionInput[] {
  const byIdentity = new Map<string, KnowledgeBundleEntity[]>();
  for (const entry of bundle.revisions) {
    const key = identityKey(entry.identity);
    const entries = byIdentity.get(key) ?? [];
    entries.push(entry);
    byIdentity.set(key, entries);
  }
  const identities = [...byIdentity.keys()].sort(lexical);
  const ordered: KnowledgeRevisionInput[] = [];
  for (const key of identities) {
    const entries = byIdentity.get(key)!;
    const byPrevious = new Map<string | null, KnowledgeBundleEntity>();
    for (const entry of entries) byPrevious.set(previousRevision(entry), entry);
    let cursor = byPrevious.get(null);
    while (cursor) {
      ordered.push({
        identity: cursor.identity,
        sourceType: cursor.sourceType,
        publicationRecord: cursor.publicationRecord,
        rights: cursor.rights,
        content: cursor.content,
        sources: cursor.sources.map(({ sourceType, title, url, rights }) => ({
          sourceType,
          title,
          url,
          rights,
        })),
        relations: cursor.relations.map(({ relationType, target, metadata }) => ({
          relationType,
          target,
          metadata,
        })),
      });
      cursor = byPrevious.get(cursor.revisionSha256);
    }
  }
  return ordered;
}
