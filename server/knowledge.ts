import type { Connection, Connections } from "./database";
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
  validateKnowledgeEntityKey,
  validateKnowledgeHash,
  validateKnowledgeIdentity,
  validateKnowledgePublicationRecord,
  validateKnowledgeRevisionInput,
  type KnowledgeEntityKey,
  type KnowledgeIdentity,
  type KnowledgeJson,
  type KnowledgePublicationRecord,
  type KnowledgeRelationInput,
  type KnowledgeRevisionInput,
  type KnowledgeRights,
  type KnowledgeRightsStatus,
  type KnowledgeSourceInput,
} from "../app/lib/knowledge-model";

type PreparedSource = KnowledgeSourceInput & {
  ordinal: number;
  sourceSha256: string;
  linkSha256: string;
};

type PreparedRelation = KnowledgeRelationInput & {
  relationSha256: string;
  targetEntitySha256: string;
};

type PublicationColumns = {
  publicationKind: "repository-seed" | "community-contribution";
  publicationRecordSha256: string;
  publicationRecordJson: string;
  publicLicenseSha256: string | null;
  publicLicenseJson: string | null;
  authorPublicId: string;
  authorDisplayName: string;
  previousRevisionSha256: string | null;
  requesterPublicId: string | null;
  requesterDisplayName: string | null;
  forumTopicId: string | null;
  forumTopicUrl: string | null;
  decisionId: string | null;
  approvalMethod: "repository-review" | "single" | "approval" | "ranked";
  approvalResult: "approved";
  approvedAt: string | null;
  decisionEvidenceStatus: "legacy-not-recorded" | "recorded";
  decisionCriterion: string | null;
  eligibleVoters: number | null;
  participants: number | null;
  quorumRequired: number | null;
  approvalThreshold: number | null;
  approvedOption: string | null;
  decisionTallyJson: string | null;
  decisionTallySha256: string | null;
  platformGrantVersion: string | null;
};

type PreparedRevision = KnowledgeRevisionInput & {
  contentJson: string;
  entitySha256: string;
  revisionSha256: string;
  publication: PublicationColumns;
  sources: PreparedSource[];
  relations: PreparedRelation[];
};

export type KnowledgeBundleSource = KnowledgeSourceInput & {
  ordinal: number;
  sourceSha256: string;
  linkSha256: string;
};

export type KnowledgeBundleRelation = KnowledgeRelationInput & {
  relationSha256: string;
  targetEntitySha256: string;
};

export type KnowledgeBundleEntity = {
  entitySha256: string;
  revisionSha256: string;
  identity: KnowledgeIdentity;
  sourceType: string;
  publicationRecordSha256: string;
  publicLicenseSha256: string | null;
  publicationRecord: KnowledgePublicationRecord;
  rights: KnowledgeRights;
  content: Record<string, KnowledgeJson>;
  sources: KnowledgeBundleSource[];
  relations: KnowledgeBundleRelation[];
};

export type KnowledgeBundle = {
  format: typeof KNOWLEDGE_BUNDLE_FORMAT;
  spaceId: string;
  platformGrants: [typeof AGORANODE_MINIMUM_GRANT];
  revisions: KnowledgeBundleEntity[];
  currentRevisions: Array<{
    identity: KnowledgeIdentity;
    entitySha256: string;
    revisionSha256: string;
  }>;
  sha256: string;
};

export type KnowledgeEntityHistory = {
  current: KnowledgeBundleEntity;
  revisions: KnowledgeBundleEntity[];
};

export type KnowledgeImportCounts = {
  total: number;
  entities: number;
  revisions: number;
  sources: number;
  sourceLinks: number;
  relations: number;
  currentSelections: number;
  auditEvents: number;
};

function fail(message: string): never {
  throw new Error(`Invalid stored knowledge: ${message}`);
}

function rights(
  statusValue: unknown,
  licenseValue: unknown,
  attributionValue: unknown,
): KnowledgeRights {
  if (
    statusValue !== "reuse-not-documented" &&
    statusValue !== "reference-only" &&
    statusValue !== "licensed"
  ) {
    fail("rights status is invalid");
  }
  if (
    licenseValue !== null &&
    licenseValue !== undefined &&
    typeof licenseValue !== "string"
  ) {
    fail("license is invalid");
  }
  if (typeof attributionValue !== "string") fail("attribution is invalid");
  const status = statusValue as KnowledgeRightsStatus;
  return {
    status,
    licenseSpdx: (licenseValue ?? null) as string | null,
    attribution: attributionValue,
    reuseAllowed: status === "licensed",
  };
}

function parseCanonicalObject(
  value: unknown,
  label: string,
): Record<string, KnowledgeJson> {
  if (typeof value !== "string") fail(`${label} is not text`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    fail(`${label} is not JSON`);
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    canonicalKnowledgeJson(parsed) !== value
  ) {
    fail(`${label} is not a canonical JSON object`);
  }
  return parsed as Record<string, KnowledgeJson>;
}

function sameRow(
  row: Record<string, unknown>,
  expected: Record<string, unknown>,
  label: string,
) {
  for (const [key, value] of Object.entries(expected)) {
    if (row[key] !== value) fail(`${label} conflicts with its content address`);
  }
}

function lexical(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function storedInstant(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  fail("approval time is invalid");
}

function revisionOrder(left: KnowledgeRevisionInput, right: KnowledgeRevisionInput) {
  return (
    lexical(left.identity.spaceId, right.identity.spaceId) ||
    lexical(left.identity.kind, right.identity.kind) ||
    lexical(left.identity.id, right.identity.id) ||
    lexical(left.identity.locale, right.identity.locale)
  );
}

function identityOrder(left: KnowledgeIdentity, right: KnowledgeIdentity) {
  return (
    lexical(left.spaceId, right.spaceId) ||
    lexical(left.kind, right.kind) ||
    lexical(left.id, right.id) ||
    lexical(left.locale, right.locale)
  );
}

async function publicationColumns(
  record: KnowledgePublicationRecord,
): Promise<PublicationColumns> {
  const publicationRecordJson = canonicalKnowledgeJson(record);
  const publicationRecordSha256 = await canonicalKnowledgeHash(record);
  if (record.format === CONTRIBUTION_PUBLICATION_FORMAT) {
    const publicLicenseJson = canonicalKnowledgeJson(record.publicLicense);
    return {
      publicationKind: "community-contribution",
      publicationRecordSha256,
      publicationRecordJson,
      publicLicenseSha256: await canonicalKnowledgeHash(record.publicLicense),
      publicLicenseJson,
      authorPublicId: record.provenance.author.publicId,
      authorDisplayName: record.provenance.author.displayName,
      previousRevisionSha256: record.provenance.previousRevisionSha256,
      requesterPublicId: record.provenance.request.requestedBy.publicId,
      requesterDisplayName: record.provenance.request.requestedBy.displayName,
      forumTopicId: record.provenance.request.forumTopicId,
      forumTopicUrl: record.provenance.request.forumTopicUrl,
      decisionId: record.provenance.decision.id,
      approvalMethod: record.provenance.decision.method,
      approvalResult: "approved",
      approvedAt: record.provenance.decision.decidedAt,
      decisionEvidenceStatus: "recorded",
      decisionCriterion: record.provenance.decision.evidence.criterion,
      eligibleVoters: record.provenance.decision.evidence.eligibleVoters,
      participants: record.provenance.decision.evidence.participants,
      quorumRequired: record.provenance.decision.evidence.quorumRequired,
      approvalThreshold: record.provenance.decision.evidence.approvalThreshold,
      approvedOption: record.provenance.decision.evidence.approvedOption,
      decisionTallyJson: canonicalKnowledgeJson(
        record.provenance.decision.evidence.tally,
      ),
      decisionTallySha256: record.provenance.decision.evidence.tallySha256,
      platformGrantVersion: record.grantConsent.version,
    };
  }
  return {
    publicationKind: "repository-seed",
    publicationRecordSha256,
    publicationRecordJson,
    publicLicenseSha256: null,
    publicLicenseJson: null,
    authorPublicId: record.author.publicId,
    authorDisplayName: record.author.displayName,
    previousRevisionSha256: record.previousRevisionSha256,
    requesterPublicId: null,
    requesterDisplayName: null,
    forumTopicId: null,
    forumTopicUrl: null,
    decisionId: null,
    approvalMethod: "repository-review",
    approvalResult: "approved",
    approvedAt: record.approval.approvedAt,
    decisionEvidenceStatus: "legacy-not-recorded",
    decisionCriterion: null,
    eligibleVoters: null,
    participants: null,
    quorumRequired: null,
    approvalThreshold: null,
    approvedOption: null,
    decisionTallyJson: null,
    decisionTallySha256: null,
    platformGrantVersion: null,
  };
}

async function prepareRevision(
  inputValue: KnowledgeRevisionInput,
): Promise<PreparedRevision> {
  const input = await validateKnowledgeRevisionInput(inputValue);
  const entityKey: KnowledgeEntityKey = {
    spaceId: input.identity.spaceId,
    kind: input.identity.kind,
    id: input.identity.id,
  };
  const entitySha256 = await knowledgeEntityHash(entityKey);
  const revisionSha256 = await knowledgeRevisionHash(input);
  const sources: PreparedSource[] = [];
  for (const [ordinal, source] of input.sources.entries()) {
    const sourceSha256 = await knowledgeSourceHash(input.identity.spaceId, source);
    sources.push({
      ...source,
      ordinal,
      sourceSha256,
      linkSha256: await knowledgeSourceLinkHash(
        revisionSha256,
        sourceSha256,
        ordinal,
      ),
    });
  }
  const relations: PreparedRelation[] = [];
  for (const relation of input.relations) {
    relations.push({
      ...relation,
      relationSha256: await knowledgeRelationHash(revisionSha256, relation),
      targetEntitySha256: await knowledgeEntityHash(relation.target),
    });
  }
  return {
    ...input,
    contentJson: canonicalKnowledgeJson(input.content),
    entitySha256,
    revisionSha256,
    publication: await publicationColumns(input.publicationRecord),
    sources,
    relations,
  };
}

async function existing(
  connection: Connection,
  table: string,
  column: string,
  value: string,
) {
  // table and column are closed constants at call sites, never external input.
  return (await connection.query(`SELECT * FROM ${table} WHERE ${column}=$1`, [value]))
    .rows[0];
}

async function insertEntities(
  connection: Connection,
  prepared: PreparedRevision[],
) {
  let created = 0;
  for (const item of prepared) {
    const result = await connection.query(
      `INSERT INTO knowledge_entities(entity_sha256,space_id,kind,entity_id)
       VALUES($1,$2,$3,$4) ON CONFLICT(entity_sha256) DO NOTHING
       RETURNING entity_sha256`,
      [
        item.entitySha256,
        item.identity.spaceId,
        item.identity.kind,
        item.identity.id,
      ],
    );
    created += result.rows.length;
    const row = await existing(
      connection,
      "knowledge_entities",
      "entity_sha256",
      item.entitySha256,
    );
    if (!row) fail("entity disappeared during import");
    sameRow(
      row,
      {
        space_id: item.identity.spaceId,
        kind: item.identity.kind,
        entity_id: item.identity.id,
      },
      "entity",
    );
  }
  return created;
}

async function insertRevision(connection: Connection, item: PreparedRevision) {
  const result = await connection.query(
    `INSERT INTO knowledge_revisions(
       revision_sha256,entity_sha256,space_id,kind,entity_id,locale,
       content_json,rights_status,license_spdx,attribution,source_type,
       publication_kind,publication_record_sha256,publication_record_json,
       public_license_sha256,public_license_json,author_public_id,author_display_name,
       previous_revision_sha256,requester_public_id,requester_display_name,
       forum_topic_id,forum_topic_url,decision_id,approval_method,approval_result,
       approved_at,decision_evidence_status,decision_criterion,eligible_voters,
       participants,quorum_required,approval_threshold,approved_option,
       decision_tally_json,decision_tally_sha256,platform_grant_version
     ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37)
     ON CONFLICT(revision_sha256) DO NOTHING RETURNING revision_sha256`,
    [
      item.revisionSha256,
      item.entitySha256,
      item.identity.spaceId,
      item.identity.kind,
      item.identity.id,
      item.identity.locale,
      item.contentJson,
      item.rights.status,
      item.rights.licenseSpdx,
      item.rights.attribution,
      item.sourceType,
      item.publication.publicationKind,
      item.publication.publicationRecordSha256,
      item.publication.publicationRecordJson,
      item.publication.publicLicenseSha256,
      item.publication.publicLicenseJson,
      item.publication.authorPublicId,
      item.publication.authorDisplayName,
      item.publication.previousRevisionSha256,
      item.publication.requesterPublicId,
      item.publication.requesterDisplayName,
      item.publication.forumTopicId,
      item.publication.forumTopicUrl,
      item.publication.decisionId,
      item.publication.approvalMethod,
      item.publication.approvalResult,
      item.publication.approvedAt,
      item.publication.decisionEvidenceStatus,
      item.publication.decisionCriterion,
      item.publication.eligibleVoters,
      item.publication.participants,
      item.publication.quorumRequired,
      item.publication.approvalThreshold,
      item.publication.approvedOption,
      item.publication.decisionTallyJson,
      item.publication.decisionTallySha256,
      item.publication.platformGrantVersion,
    ],
  );
  const row = await existing(
    connection,
    "knowledge_revisions",
    "revision_sha256",
    item.revisionSha256,
  );
  if (!row) fail("revision disappeared during import");
  sameRow(
    { ...row, approved_at: storedInstant(row.approved_at) },
    {
      entity_sha256: item.entitySha256,
      space_id: item.identity.spaceId,
      kind: item.identity.kind,
      entity_id: item.identity.id,
      locale: item.identity.locale,
      content_json: item.contentJson,
      rights_status: item.rights.status,
      license_spdx: item.rights.licenseSpdx,
      attribution: item.rights.attribution,
      source_type: item.sourceType,
      publication_kind: item.publication.publicationKind,
      publication_record_sha256: item.publication.publicationRecordSha256,
      publication_record_json: item.publication.publicationRecordJson,
      public_license_sha256: item.publication.publicLicenseSha256,
      public_license_json: item.publication.publicLicenseJson,
      author_public_id: item.publication.authorPublicId,
      author_display_name: item.publication.authorDisplayName,
      previous_revision_sha256: item.publication.previousRevisionSha256,
      requester_public_id: item.publication.requesterPublicId,
      requester_display_name: item.publication.requesterDisplayName,
      forum_topic_id: item.publication.forumTopicId,
      forum_topic_url: item.publication.forumTopicUrl,
      decision_id: item.publication.decisionId,
      approval_method: item.publication.approvalMethod,
      approval_result: item.publication.approvalResult,
      approved_at: item.publication.approvedAt,
      decision_evidence_status: item.publication.decisionEvidenceStatus,
      decision_criterion: item.publication.decisionCriterion,
      eligible_voters: item.publication.eligibleVoters,
      participants: item.publication.participants,
      quorum_required: item.publication.quorumRequired,
      approval_threshold: item.publication.approvalThreshold,
      approved_option: item.publication.approvedOption,
      decision_tally_json: item.publication.decisionTallyJson,
      decision_tally_sha256: item.publication.decisionTallySha256,
      platform_grant_version: item.publication.platformGrantVersion,
    },
    "revision",
  );
  return result.rows.length === 1;
}

async function insertSources(connection: Connection, item: PreparedRevision) {
  let sources = 0;
  let links = 0;
  for (const source of item.sources) {
    const insertedSource = await connection.query(
      `INSERT INTO knowledge_sources(
         source_sha256,space_id,source_type,title,url,rights_status,license_spdx,attribution
       ) VALUES($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT(source_sha256) DO NOTHING RETURNING source_sha256`,
      [
        source.sourceSha256,
        item.identity.spaceId,
        source.sourceType,
        source.title,
        source.url,
        source.rights.status,
        source.rights.licenseSpdx,
        source.rights.attribution,
      ],
    );
    sources += insertedSource.rows.length;
    const sourceRow = await existing(
      connection,
      "knowledge_sources",
      "source_sha256",
      source.sourceSha256,
    );
    if (!sourceRow) fail("source disappeared during import");
    sameRow(
      sourceRow,
      {
        space_id: item.identity.spaceId,
        source_type: source.sourceType,
        title: source.title,
        url: source.url,
        rights_status: source.rights.status,
        license_spdx: source.rights.licenseSpdx,
        attribution: source.rights.attribution,
      },
      "source",
    );
    const insertedLink = await connection.query(
      `INSERT INTO knowledge_revision_sources(link_sha256,revision_sha256,source_sha256,ordinal)
       VALUES($1,$2,$3,$4) ON CONFLICT(link_sha256) DO NOTHING
       RETURNING link_sha256`,
      [source.linkSha256, item.revisionSha256, source.sourceSha256, source.ordinal],
    );
    links += insertedLink.rows.length;
    const linkRow = await existing(
      connection,
      "knowledge_revision_sources",
      "link_sha256",
      source.linkSha256,
    );
    if (!linkRow) fail("source link disappeared during import");
    sameRow(
      linkRow,
      {
        revision_sha256: item.revisionSha256,
        source_sha256: source.sourceSha256,
        ordinal: source.ordinal,
      },
      "source link",
    );
  }
  return { sources, links };
}

async function insertRelations(connection: Connection, item: PreparedRevision) {
  let created = 0;
  for (const relation of item.relations) {
    const result = await connection.query(
      `INSERT INTO knowledge_relations(
         relation_sha256,revision_sha256,space_id,relation_type,target_entity_sha256,metadata_json
       ) VALUES($1,$2,$3,$4,$5,$6)
       ON CONFLICT(relation_sha256) DO NOTHING RETURNING relation_sha256`,
      [
        relation.relationSha256,
        item.revisionSha256,
        item.identity.spaceId,
        relation.relationType,
        relation.targetEntitySha256,
        canonicalKnowledgeJson(relation.metadata),
      ],
    );
    created += result.rows.length;
    const row = await existing(
      connection,
      "knowledge_relations",
      "relation_sha256",
      relation.relationSha256,
    );
    if (!row) fail("relation disappeared during import");
    sameRow(
      row,
      {
        revision_sha256: item.revisionSha256,
        space_id: item.identity.spaceId,
        relation_type: relation.relationType,
        target_entity_sha256: relation.targetEntitySha256,
        metadata_json: canonicalKnowledgeJson(relation.metadata),
      },
      "relation",
    );
  }
  return created;
}

async function selectCurrent(
  connection: Connection,
  item: PreparedRevision,
  revisionCreated: boolean,
) {
  const current = (
    await connection.query(
      `SELECT revision_sha256 FROM knowledge_current_revisions
       WHERE space_id=$1 AND kind=$2 AND entity_id=$3 AND locale=$4 FOR UPDATE`,
      [
        item.identity.spaceId,
        item.identity.kind,
        item.identity.id,
        item.identity.locale,
      ],
    )
  ).rows[0];
  if (current?.revision_sha256 === item.revisionSha256) {
    return { changed: false, previous: item.revisionSha256 };
  }
  const previous = current ? String(current.revision_sha256) : null;
  // Re-importing an older, already stored revision must never roll the current
  // pointer back after a later democratically approved revision was selected.
  if (!revisionCreated) return { changed: false, previous };
  if (previous !== item.publication.previousRevisionSha256) {
    fail("revision does not directly extend the current pointer");
  }
  if (current) {
    await connection.query(
      `UPDATE knowledge_current_revisions
       SET entity_sha256=$1,revision_sha256=$2,selected_at=now()
       WHERE space_id=$3 AND kind=$4 AND entity_id=$5 AND locale=$6`,
      [
        item.entitySha256,
        item.revisionSha256,
        item.identity.spaceId,
        item.identity.kind,
        item.identity.id,
        item.identity.locale,
      ],
    );
  } else {
    await connection.query(
      `INSERT INTO knowledge_current_revisions(
         space_id,kind,entity_id,locale,entity_sha256,revision_sha256
       ) VALUES($1,$2,$3,$4,$5,$6)`,
      [
        item.identity.spaceId,
        item.identity.kind,
        item.identity.id,
        item.identity.locale,
        item.entitySha256,
        item.revisionSha256,
      ],
    );
  }
  return { changed: true, previous };
}

async function importPreparedKnowledge(
  connection: Connection,
  prepared: PreparedRevision[],
): Promise<KnowledgeImportCounts> {
  const counts: KnowledgeImportCounts = {
    total: prepared.length,
    entities: 0,
    revisions: 0,
    sources: 0,
    sourceLinks: 0,
    relations: 0,
    currentSelections: 0,
    auditEvents: 0,
  };
  counts.entities = await insertEntities(connection, prepared);
  for (const item of prepared) {
    const revisionCreated = await insertRevision(connection, item);
    if (revisionCreated) {
      counts.revisions += 1;
      // The database trigger writes this event in the same statement. A
      // trigger failure rolls the revision back, so the two cannot diverge.
      counts.auditEvents += 1;
    }
    const sourceCounts = await insertSources(connection, item);
    counts.sources += sourceCounts.sources;
    counts.sourceLinks += sourceCounts.links;
    counts.relations += await insertRelations(connection, item);
    const selected = await selectCurrent(connection, item, revisionCreated);
    if (selected.changed) {
      counts.currentSelections += 1;
      // INSERT/UPDATE of the current pointer owns its audit event in SQL.
      counts.auditEvents += 1;
    }
  }
  return counts;
}

/**
 * Imports complete, root-to-tip histories while the caller owns the database
 * transaction and advisory lock. This is deliberately narrower than the
 * ordinary administrative importer: every repeated identity must form one
 * complete causal chain beginning at a null predecessor.
 */
export async function importKnowledgeRevisionSequenceInTransaction(
  connection: Connection,
  inputs: KnowledgeRevisionInput[],
): Promise<KnowledgeImportCounts> {
  const prepared: PreparedRevision[] = [];
  for (const input of inputs) prepared.push(await prepareRevision(input));
  const lastByIdentity = new Map<string, PreparedRevision>();
  const revisionHashes = new Set<string>();
  const closedIdentities = new Set<string>();
  let activeIdentity: string | null = null;
  for (const item of prepared) {
    const key = canonicalKnowledgeJson(item.identity);
    if (activeIdentity !== key) {
      if (closedIdentities.has(key)) {
        throw new Error(`Knowledge identity is not contiguous: ${key}`);
      }
      if (activeIdentity !== null) closedIdentities.add(activeIdentity);
      activeIdentity = key;
    }
    if (revisionHashes.has(item.revisionSha256)) {
      throw new Error(`Duplicate knowledge revision: ${item.revisionSha256}`);
    }
    revisionHashes.add(item.revisionSha256);
    const previous = lastByIdentity.get(key);
    if (
      item.publication.previousRevisionSha256 !==
      (previous?.revisionSha256 ?? null)
    ) {
      throw new Error(`Knowledge history is not a complete linear chain: ${key}`);
    }
    lastByIdentity.set(key, item);
  }
  return importPreparedKnowledge(connection, prepared);
}

/**
 * Administrative, source-controlled import only. This is intentionally not
 * wired to HTTP and cannot remove an older public revision.
 */
export async function importKnowledgeRevisions(
  pool: Connections,
  inputs: KnowledgeRevisionInput[],
) {
  const prepared = await Promise.all(
    inputs.map((input) => prepareRevision(input)),
  );
  prepared.sort(revisionOrder);
  const keys = new Set<string>();
  for (const item of prepared) {
    const key = canonicalKnowledgeJson(item.identity);
    if (keys.has(key)) throw new Error(`Duplicate knowledge identity: ${key}`);
    keys.add(key);
  }
  const connection = await pool.connect();
  try {
    await connection.query("BEGIN");
    await connection.query("SELECT pg_advisory_xact_lock(194733,4)");
    const counts = await importPreparedKnowledge(connection, prepared);
    await connection.query("COMMIT");
    return counts;
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release?.();
  }
}

async function readSources(
  connection: Pick<Connection, "query">,
  revisionSha256: string,
): Promise<KnowledgeBundleSource[]> {
  const rows = (
    await connection.query(
      `SELECT l.link_sha256,l.ordinal,s.source_sha256,s.space_id,s.source_type,
              s.title,s.url,s.rights_status,s.license_spdx,s.attribution
       FROM knowledge_revision_sources l
       JOIN knowledge_sources s ON s.source_sha256=l.source_sha256
       WHERE l.revision_sha256=$1`,
      [revisionSha256],
    )
  ).rows;
  const sources: KnowledgeBundleSource[] = [];
  for (const row of rows) {
    const source: KnowledgeSourceInput = {
      sourceType: String(row.source_type),
      title: String(row.title),
      url: String(row.url),
      rights: rights(row.rights_status, row.license_spdx, row.attribution),
    };
    const sourceSha256 = String(row.source_sha256);
    const ordinal = Number(row.ordinal);
    const linkSha256 = String(row.link_sha256);
    if (
      (await knowledgeSourceHash(String(row.space_id), source)) !== sourceSha256 ||
      (await knowledgeSourceLinkHash(revisionSha256, sourceSha256, ordinal)) !==
        linkSha256
    ) {
      fail("source hash does not match stored content");
    }
    sources.push({ ...source, ordinal, sourceSha256, linkSha256 });
  }
  return sources.sort((left, right) => left.ordinal - right.ordinal);
}

async function readRelations(
  connection: Pick<Connection, "query">,
  revisionSha256: string,
): Promise<KnowledgeBundleRelation[]> {
  const rows = (
    await connection.query(
      `SELECT r.relation_sha256,r.relation_type,r.target_entity_sha256,r.metadata_json,
              e.space_id AS target_space_id,e.kind AS target_kind,e.entity_id AS target_id
       FROM knowledge_relations r
       JOIN knowledge_entities e ON e.entity_sha256=r.target_entity_sha256
       WHERE r.revision_sha256=$1`,
      [revisionSha256],
    )
  ).rows;
  const relations: KnowledgeBundleRelation[] = [];
  for (const row of rows) {
    const target = validateKnowledgeEntityKey({
      spaceId: row.target_space_id,
      kind: row.target_kind,
      id: row.target_id,
    });
    const relation: KnowledgeRelationInput = {
      relationType: String(row.relation_type),
      target,
      metadata: parseCanonicalObject(row.metadata_json, "relation metadata"),
    };
    const relationSha256 = String(row.relation_sha256);
    const targetEntitySha256 = String(row.target_entity_sha256);
    if (
      (await knowledgeEntityHash(target)) !== targetEntitySha256 ||
      (await knowledgeRelationHash(revisionSha256, relation)) !== relationSha256
    ) {
      fail("relation hash does not match stored content");
    }
    relations.push({
      ...relation,
      relationSha256,
      targetEntitySha256,
    });
  }
  return relations.sort(
    (left, right) =>
      lexical(left.relationType, right.relationType) ||
      lexical(left.target.spaceId, right.target.spaceId) ||
      lexical(left.target.kind, right.target.kind) ||
      lexical(left.target.id, right.target.id) ||
      lexical(left.relationSha256, right.relationSha256),
  );
}

const STORED_REVISION_COLUMNS = `
  e.entity_sha256,r.revision_sha256,r.content_json,r.rights_status,
  r.license_spdx,r.attribution,r.source_type,r.publication_kind,
  r.publication_record_sha256,r.publication_record_json,
  r.public_license_sha256,r.public_license_json,
  r.author_public_id,r.author_display_name,r.previous_revision_sha256,
  r.requester_public_id,r.requester_display_name,r.forum_topic_id,
  r.forum_topic_url,r.decision_id,
  r.approval_method,r.approval_result,r.approved_at,
  r.decision_evidence_status,r.decision_criterion,r.eligible_voters,
  r.participants,r.quorum_required,r.approval_threshold,r.approved_option,
  r.decision_tally_json,r.decision_tally_sha256,r.platform_grant_version`;

async function materializeKnowledgeRevision(
  connection: Pick<Connection, "query">,
  identity: KnowledgeIdentity,
  row: Record<string, unknown>,
): Promise<KnowledgeBundleEntity> {
  const content = parseCanonicalObject(row.content_json, "revision content");
  const entryRights = rights(
    row.rights_status,
    row.license_spdx,
    row.attribution,
  );
  const sourceType = String(row.source_type);
  const publicationRecord = await validateKnowledgePublicationRecord(
    parseCanonicalObject(row.publication_record_json, "publication record"),
  );
  const publication = await publicationColumns(publicationRecord);
  sameRow(
    { ...row, approved_at: storedInstant(row.approved_at) },
    {
      publication_kind: publication.publicationKind,
      publication_record_sha256: publication.publicationRecordSha256,
      publication_record_json: publication.publicationRecordJson,
      public_license_sha256: publication.publicLicenseSha256,
      public_license_json: publication.publicLicenseJson,
      author_public_id: publication.authorPublicId,
      author_display_name: publication.authorDisplayName,
      previous_revision_sha256: publication.previousRevisionSha256,
      requester_public_id: publication.requesterPublicId,
      requester_display_name: publication.requesterDisplayName,
      forum_topic_id: publication.forumTopicId,
      forum_topic_url: publication.forumTopicUrl,
      decision_id: publication.decisionId,
      approval_method: publication.approvalMethod,
      approval_result: publication.approvalResult,
      approved_at: publication.approvedAt,
      decision_evidence_status: publication.decisionEvidenceStatus,
      decision_criterion: publication.decisionCriterion,
      eligible_voters: publication.eligibleVoters,
      participants: publication.participants,
      quorum_required: publication.quorumRequired,
      approval_threshold: publication.approvalThreshold,
      approved_option: publication.approvedOption,
      decision_tally_json: publication.decisionTallyJson,
      decision_tally_sha256: publication.decisionTallySha256,
      platform_grant_version: publication.platformGrantVersion,
    },
    "publication record",
  );
  const entitySha256 = String(row.entity_sha256);
  const revisionSha256 = String(row.revision_sha256);
  const sources = await readSources(connection, revisionSha256);
  const relations = await readRelations(connection, revisionSha256);
  const hashInput: KnowledgeRevisionInput = {
    identity,
    content,
    rights: entryRights,
    sourceType,
    publicationRecord,
    sources: sources.map(({ sourceType: type, title, url, rights: sourceRights }) => ({
      sourceType: type,
      title,
      url,
      rights: sourceRights,
    })),
    relations: relations.map(({ relationType, target, metadata }) => ({
      relationType,
      target,
      metadata,
    })),
  };
  if (
    (await knowledgeEntityHash({
      spaceId: identity.spaceId,
      kind: identity.kind,
      id: identity.id,
    })) !== entitySha256 ||
    (await knowledgeRevisionHash(hashInput)) !== revisionSha256
  ) {
    fail("revision hash does not match stored content");
  }
  return {
    entitySha256,
    revisionSha256,
    identity,
    sourceType,
    publicationRecordSha256: publication.publicationRecordSha256,
    publicLicenseSha256: publication.publicLicenseSha256,
    publicationRecord,
    rights: entryRights,
    content,
    sources,
    relations,
  };
}

export async function readKnowledgeRevision(
  connection: Pick<Connection, "query">,
  identityValue: KnowledgeIdentity,
  revisionSha256Value: string,
): Promise<KnowledgeBundleEntity | null> {
  const identity = validateKnowledgeIdentity(identityValue);
  const revisionSha256 = validateKnowledgeHash(revisionSha256Value);
  const row = (
    await connection.query(
      `SELECT ${STORED_REVISION_COLUMNS}
       FROM knowledge_revisions r
       JOIN knowledge_entities e ON e.entity_sha256=r.entity_sha256
       WHERE r.space_id=$1 AND r.kind=$2 AND r.entity_id=$3 AND r.locale=$4
         AND r.revision_sha256=$5`,
      [
        identity.spaceId,
        identity.kind,
        identity.id,
        identity.locale,
        revisionSha256,
      ],
    )
  ).rows[0];
  return row ? materializeKnowledgeRevision(connection, identity, row) : null;
}

export async function readKnowledgeEntity(
  connection: Pick<Connection, "query">,
  identityValue: KnowledgeIdentity,
): Promise<KnowledgeBundleEntity | null> {
  const identity = validateKnowledgeIdentity(identityValue);
  const row = (
    await connection.query(
      `SELECT ${STORED_REVISION_COLUMNS}
       FROM knowledge_current_revisions c
       JOIN knowledge_entities e ON e.entity_sha256=c.entity_sha256
       JOIN knowledge_revisions r ON r.revision_sha256=c.revision_sha256
       WHERE c.space_id=$1 AND c.kind=$2 AND c.entity_id=$3 AND c.locale=$4`,
      [identity.spaceId, identity.kind, identity.id, identity.locale],
    )
  ).rows[0];
  return row ? materializeKnowledgeRevision(connection, identity, row) : null;
}

function publicationInstant(entry: KnowledgeBundleEntity): string | null {
  const record = entry.publicationRecord;
  return record.format === CONTRIBUTION_PUBLICATION_FORMAT
    ? record.provenance.decision.decidedAt
    : record.approval.approvedAt;
}

/**
 * Reads every immutable revision for one public entity. The current revision is
 * first; the remaining accepted revisions have a deterministic order that does
 * not expose database import timestamps.
 */
export async function readKnowledgeEntityHistory(
  connection: Pick<Connection, "query">,
  identityValue: KnowledgeIdentity,
): Promise<KnowledgeEntityHistory | null> {
  const identity = validateKnowledgeIdentity(identityValue);
  const current = await readKnowledgeEntity(connection, identity);
  if (!current) return null;
  const rows = (
    await connection.query(
      `SELECT revision_sha256
       FROM knowledge_revisions
       WHERE space_id=$1 AND kind=$2 AND entity_id=$3 AND locale=$4
       ORDER BY revision_sha256`,
      [identity.spaceId, identity.kind, identity.id, identity.locale],
    )
  ).rows;
  const revisions: KnowledgeBundleEntity[] = [];
  for (const row of rows) {
    const revisionSha256 = validateKnowledgeHash(row.revision_sha256);
    if (revisionSha256 === current.revisionSha256) {
      revisions.push(current);
      continue;
    }
    const revision = await readKnowledgeRevision(
      connection,
      identity,
      revisionSha256,
    );
    if (!revision) fail("revision disappeared while reading history");
    revisions.push(revision);
  }
  revisions.sort((left, right) => {
    if (left.revisionSha256 === current.revisionSha256) return -1;
    if (right.revisionSha256 === current.revisionSha256) return 1;
    const leftInstant = publicationInstant(left) ?? "";
    const rightInstant = publicationInstant(right) ?? "";
    return (
      lexical(rightInstant, leftInstant) ||
      lexical(left.revisionSha256, right.revisionSha256)
    );
  });
  return { current, revisions };
}

export async function exportKnowledgeBundle(
  connection: Pick<Connection, "query">,
  spaceIdValue: string,
): Promise<KnowledgeBundle> {
  const spaceId = validateKnowledgeEntityKey({
    spaceId: spaceIdValue,
    kind: "space",
    id: "validation",
  }).spaceId;
  const revisionRows = (
    await connection.query(
      `SELECT kind,entity_id,locale,revision_sha256 FROM knowledge_revisions
       WHERE space_id=$1`,
      [spaceId],
    )
  ).rows;
  const revisionKeys = revisionRows
    .map((row) => ({
      identity: validateKnowledgeIdentity({
        spaceId,
        kind: row.kind,
        id: row.entity_id,
        locale: row.locale,
      }),
      revisionSha256: validateKnowledgeHash(row.revision_sha256),
    }))
    .sort(
      (left, right) =>
        identityOrder(left.identity, right.identity) ||
        lexical(left.revisionSha256, right.revisionSha256),
    );
  const revisions: KnowledgeBundleEntity[] = [];
  for (const key of revisionKeys) {
    const entry = await readKnowledgeRevision(
      connection,
      key.identity,
      key.revisionSha256,
    );
    if (!entry) fail("revision disappeared during export");
    revisions.push(entry);
  }
  const currentRows = (
    await connection.query(
      `SELECT kind,entity_id,locale,entity_sha256,revision_sha256
       FROM knowledge_current_revisions WHERE space_id=$1`,
      [spaceId],
    )
  ).rows;
  const currentRevisions = currentRows
    .map((row) => ({
      identity: validateKnowledgeIdentity({
        spaceId,
        kind: row.kind,
        id: row.entity_id,
        locale: row.locale,
      }),
      entitySha256: validateKnowledgeHash(row.entity_sha256),
      revisionSha256: validateKnowledgeHash(row.revision_sha256),
    }))
    .sort((left, right) => identityOrder(left.identity, right.identity));
  const revisionAddresses = new Set(
    revisions.map(
      (entry) =>
        `${entry.identity.kind}\u0000${entry.identity.id}\u0000${entry.identity.locale}\u0000${entry.entitySha256}\u0000${entry.revisionSha256}`,
    ),
  );
  for (const pointer of currentRevisions) {
    const address = `${pointer.identity.kind}\u0000${pointer.identity.id}\u0000${pointer.identity.locale}\u0000${pointer.entitySha256}\u0000${pointer.revisionSha256}`;
    if (!revisionAddresses.has(address)) fail("current pointer has no exported revision");
  }
  const platformGrants: [typeof AGORANODE_MINIMUM_GRANT] = [
    AGORANODE_MINIMUM_GRANT,
  ];
  const body = {
    format: KNOWLEDGE_BUNDLE_FORMAT,
    spaceId,
    platformGrants,
    revisions,
    currentRevisions,
  } as const;
  return { ...body, sha256: await canonicalKnowledgeHash(body) };
}

export async function serializeKnowledgeBundle(bundle: KnowledgeBundle): Promise<string> {
  validateKnowledgeHash(bundle.sha256);
  const { sha256, ...body } = bundle;
  if ((await canonicalKnowledgeHash(body)) !== sha256) {
    fail("bundle SHA-256 does not match its public contents");
  }
  return canonicalKnowledgeJson(bundle);
}
