import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import STORY from "../app/data/history-story.json" with { type: "json" };
import { historyEventUrl } from "../app/lib/history-event-navigation";
import { buildHistoryPersonIndex } from "../app/lib/history-person-navigation";
import { LEGACY_NOT_RECORDED_DECISION_EVIDENCE } from "../app/lib/contribution-rights";
import {
  KNOWLEDGE_ENTRY_FORMAT,
  REPOSITORY_PUBLICATION_FORMAT,
  canonicalKnowledgeJson,
  type KnowledgeJson,
  type KnowledgeRevisionInput,
  type KnowledgeRights,
} from "../app/lib/knowledge-model";
import { connections, createPool } from "./pool";
import { migrateDatabase } from "./migrations";
import { importKnowledgeRevisions } from "./knowledge";

export const POLISROSSA_SPACE_ID = "polisrossa";

const EDITORIAL_RIGHTS: KnowledgeRights = {
  status: "reuse-not-documented",
  licenseSpdx: null,
  attribution: "PolisRossa · app/data/history-story.json",
  reuseAllowed: false,
};

const REPOSITORY_PUBLICATION = {
  format: REPOSITORY_PUBLICATION_FORMAT,
  author: {
    publicId: "polisrossa",
    displayName: "PolisRossa",
  },
  previousRevisionSha256: null,
  approval: {
    method: "repository-review" as const,
    result: "approved" as const,
    approvedAt: null,
    evidence: LEGACY_NOT_RECORDED_DECISION_EVIDENCE,
  },
} as const;

function referenceRights(attribution: string): KnowledgeRights {
  return {
    status: "reference-only",
    licenseSpdx: null,
    attribution,
    reuseAllowed: false,
  };
}

function knowledgeObject(value: unknown): Record<string, KnowledgeJson> {
  canonicalKnowledgeJson(value);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Knowledge seed entry must be an object");
  }
  return value as Record<string, KnowledgeJson>;
}

type StoryPerson = { slug: string; name: string; role: string; url: string };
type StorySource = { name: string; url: string };
type StoryEvent = {
  id: string;
  year: string;
  country: string;
  title: string;
  text: string;
  people?: StoryPerson[];
  detail?: { paragraphs: string[]; sources?: StorySource[] };
  [key: string]: unknown;
};
type StoryEra = {
  id: string;
  period: string;
  title: string;
  intro: string;
  events: StoryEvent[];
};
const ERAS = STORY as unknown as StoryEra[];

function eventSources(event: StoryEvent) {
  return (event.detail?.sources ?? []).map((source) => ({
    sourceType: "citation",
    title: source.name,
    url: source.url,
    rights: referenceRights(source.name),
  }));
}

function eventRelations(event: StoryEvent) {
  return (event.people ?? []).map((person) => ({
    relationType: "mentions-person",
    target: {
      spaceId: POLISROSSA_SPACE_ID,
      kind: "person",
      id: person.slug,
    },
    metadata: knowledgeObject({
      name: person.name,
      role: person.role,
      legacyUrl: person.url,
    }),
  }));
}

function eventSeed(
  era: StoryEra,
  event: StoryEvent,
): KnowledgeRevisionInput {
  return {
    identity: {
      spaceId: POLISROSSA_SPACE_ID,
      kind: "event",
      id: event.id,
      locale: "it",
    },
    sourceType: "repository-seed",
    rights: EDITORIAL_RIGHTS,
    publicationRecord: REPOSITORY_PUBLICATION,
    content: knowledgeObject({
      format: KNOWLEDGE_ENTRY_FORMAT,
      legacy: { id: event.id, url: historyEventUrl(event.id) },
      era: {
        id: era.id,
        period: era.period,
        title: era.title,
        intro: era.intro,
      },
      event,
    }),
    sources: eventSources(event),
    relations: eventRelations(event),
  };
}

function personSeed(
  person: ReturnType<typeof buildHistoryPersonIndex>[number],
  original: StoryPerson,
): KnowledgeRevisionInput {
  return {
    identity: {
      spaceId: POLISROSSA_SPACE_ID,
      kind: "person",
      id: person.slug,
      locale: "it",
    },
    sourceType: "repository-seed",
    rights: EDITORIAL_RIGHTS,
    publicationRecord: REPOSITORY_PUBLICATION,
    content: knowledgeObject({
      format: KNOWLEDGE_ENTRY_FORMAT,
      legacy: {
        slug: original.slug,
        url: original.url,
        urls: person.links,
      },
      name: person.name,
      roles: person.roles,
      appearances: person.appearances,
    }),
    sources: person.links.map((url, index) => ({
      sourceType: "profile-reference",
      title:
        person.links.length === 1
          ? person.name
          : `${person.name} · riferimento ${index + 1}`,
      url,
      rights: referenceRights(person.name),
    })),
    relations: person.appearances.map((appearance) => ({
      relationType: "appears-in-event",
      target: {
        spaceId: POLISROSSA_SPACE_ID,
        kind: "event",
        id: appearance.eventId,
      },
      metadata: knowledgeObject({
        eventTitle: appearance.eventTitle,
        year: appearance.year,
        country: appearance.country,
        period: appearance.period,
      }),
    })),
  };
}

/**
 * Builds only the existing public history seed. Statistical observations,
 * accounts and forum data are intentionally outside this bundle.
 */
export function polisrossaKnowledgeSeed(): KnowledgeRevisionInput[] {
  const events = ERAS.flatMap((era) =>
    era.events.map((event) => eventSeed(era, event)),
  );
  const originals = new Map<string, StoryPerson>();
  for (const event of ERAS.flatMap((era) => era.events)) {
    for (const person of event.people ?? []) {
      const previous = originals.get(person.slug);
      if (
        previous &&
        canonicalKnowledgeJson(previous) !== canonicalKnowledgeJson(person)
      ) {
        throw new Error(`Conflicting legacy person: ${person.slug}`);
      }
      originals.set(person.slug, person);
    }
  }
  const people = buildHistoryPersonIndex(ERAS).map((person) => {
    const original = originals.get(person.slug);
    if (!original) throw new Error(`Missing legacy person: ${person.slug}`);
    return personSeed(person, original);
  });
  return [...events, ...people];
}

export async function importPolisrossaKnowledge(
  pool: Parameters<typeof importKnowledgeRevisions>[0],
) {
  return importKnowledgeRevisions(pool, polisrossaKnowledgeSeed());
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("Missing configuration: DATABASE_URL");
    const pool = createPool(connectionString);
    try {
      await migrateDatabase(connections(pool), new URL("./migrations/", import.meta.url));
      const result = await importPolisrossaKnowledge(connections(pool));
      process.stdout.write(`${JSON.stringify(result)}\n`);
    } finally {
      await pool.end();
    }
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Knowledge import failed",
    );
    process.exitCode = 1;
  }
}
