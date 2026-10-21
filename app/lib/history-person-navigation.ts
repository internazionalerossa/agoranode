import {
  copyHistoryEventUrl,
  shareHistoryEvent,
  type HistoryShareResult,
} from "./history-event-navigation";

type HistoryPersonLike = {
  slug: string;
  name: string;
  role: string;
  url: string;
};

type HistoryEventLike = {
  id: string;
  year: string;
  country: string;
  title: string;
  people?: readonly HistoryPersonLike[];
};

type HistoryEraLike = {
  period: string;
  events: readonly HistoryEventLike[];
};

export type IndexedHistoryPerson = {
  slug: string;
  name: string;
  roles: string[];
  links: string[];
  appearances: {
    eventId: string;
    eventTitle: string;
    year: string;
    country: string;
    period: string;
  }[];
};

export type { HistoryShareResult };

export function historyPersonSlug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildHistoryPersonIndex(
  eras: readonly HistoryEraLike[],
): IndexedHistoryPerson[] {
  const entries = new Map<string, IndexedHistoryPerson>();
  for (const era of eras) {
    for (const event of era.events) {
      for (const person of event.people ?? []) {
        const slug = person.slug;
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
          throw new Error(`Slug persona non valido: ${slug || person.name}`);
        }
        const existing = entries.get(slug);
        if (existing && existing.name !== person.name) {
          throw new Error(`Slug persona duplicato: ${slug}`);
        }
        const entry = existing ?? {
          slug,
          name: person.name,
          roles: [],
          links: [],
          appearances: [],
        };
        if (!entry.roles.includes(person.role)) entry.roles.push(person.role);
        if (!entry.links.includes(person.url)) entry.links.push(person.url);
        if (!entry.appearances.some(({ eventId }) => eventId === event.id)) {
          entry.appearances.push({
            eventId: event.id,
            eventTitle: event.title,
            year: event.year,
            country: event.country,
            period: era.period,
          });
        }
        entries.set(slug, entry);
      }
    }
  }
  return [...entries.values()].sort((left, right) =>
    left.name.localeCompare(right.name, "it"),
  );
}

export function historyPersonFromUrl(
  raw: string,
  validSlugs: ReadonlySet<string>,
): string | null {
  const slug = new URL(raw, "https://site.invalid").searchParams.get("persona");
  return slug !== null && validSlugs.has(slug) ? slug : null;
}

export function historyPersonUrl(slug: string): string {
  return `/?${new URLSearchParams({
    view: "teoria",
    percorso: "timeline",
    persona: slug,
  })}`;
}

export function historyIndexMatches(query: string, values: readonly string[]): boolean {
  const normalized = (value: string) =>
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("it")
      .replace(/\s+/g, " ")
      .trim();
  const terms = normalized(query).split(" ").filter(Boolean);
  if (!terms.length) return true;
  const haystack = normalized(values.join(" "));
  return terms.every((term) => haystack.includes(term));
}

export const copyHistoryPersonUrl = copyHistoryEventUrl;
export const shareHistoryPerson = shareHistoryEvent;
