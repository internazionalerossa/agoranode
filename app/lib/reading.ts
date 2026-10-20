import { SOURCE_CATALOG } from "../data/catalog.ts";
import { articleTopics } from "./topics.ts";
import { isNewsArticle } from "./news-eligibility.ts";
import type { ArticleRecord } from "./feed";

export type ReadingArticle = ArticleRecord;
const publisherHost=(raw:string)=>{try{return new URL(raw).hostname.toLowerCase().replace(/^www\./,'');}catch{return '';}};
const publisherSources=SOURCE_CATALOG.filter(source=>source.kind!=='radar');
const publishersById=new Map(publisherSources.map(source=>[source.id,source]));
const publishersByHost=new Map(publisherSources.map(source=>[publisherHost(source.homepage),source]));


export function safeWebUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function validateArticles(value: unknown): ReadingArticle[] {
  try {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is ReadingArticle => {
      if (!item || typeof item !== "object") return false;
      return (
        [
          "id",
          "title",
          "sourceId",
          "sourceName",
          "sourceHomepage",
          "country",
          "language",
          "region",
          "kind",
          "excerpt",
        ].every((key) => typeof item[key] === "string") &&
        ["topics", "categories", "ideologies"].every(
          (key) =>
            Array.isArray(item[key]) &&
            item[key].every((entry: unknown) => typeof entry === "string"),
        ) &&
        typeof item.score === "number" &&
        (item.publishedAt === null || typeof item.publishedAt === "string") &&
        Boolean(safeWebUrl(item.link)) &&
        Boolean(safeWebUrl(item.sourceHomepage))
      );
    });
  } catch {
    return [];
  }
}

export function restoreSavedArticles(raw: string | null): ReadingArticle[] {
  if (!raw) return [];
  try { return validateArticles(JSON.parse(raw)); }
  catch { return []; }
}

export function mergeArticles(
  current: ReadingArticle[],
  incoming: ReadingArticle[],
): ReadingArticle[] {
  const merged = new Map(current.map((article) => [article.id, article]));
  let changed = false;
  for (const article of incoming) {
    const previous = merged.get(article.id);
    // A text-only RSS refresh must not erase a photo already recovered for this exact story.
    const candidate = !article.image && previous?.image && previous.link === article.link
      ? { ...article, image: previous.image, imageFallbacks: previous.imageFallbacks }
      : article;
    const same = previous && Object.keys(candidate).length === Object.keys(previous).length &&
      Object.entries(candidate).every(([key, value]) => {
        const before = previous[key as keyof ReadingArticle];
        return value === before || (Array.isArray(value) && Array.isArray(before) && value.length === before.length && value.every((item, index) => item === before[index]));
      });
    if (!same) { merged.set(article.id, candidate); changed = true; }
  }
  if (!changed && sortedCollections.has(current)) return current;
  const result = Array.from(merged.values()).sort(
    comparePublication,
  );
  sortedCollections.add(result);
  return result;
}
const sortedCollections = new WeakSet<ReadingArticle[]>();

/** Publication time is primary; missing dates belong at the end of the archive. */
export function comparePublication(a: ReadingArticle, b: ReadingArticle): number {
  const time = (value: string | null) => {
    const parsed = Date.parse(value ?? "");
    return Number.isFinite(parsed) ? parsed : 0;
  };
  return time(b.publishedAt) - time(a.publishedAt) || a.id.localeCompare(b.id);
}

export function filterArticles(
  articles: ReadingArticle[],
  filters: {
    query: string;
    region: string;
    country?: string;
    language: string;
    kind: string;
    ideology: string;
    topic: string;
    source: string;
    days: number;
    sort: string;
    preferredLanguage?: string;
  },
  now = Date.now(),
): ReadingArticle[] {
  const query = filters.query.trim().toLocaleLowerCase("it");
  return articles
    .filter((article) => {
      const published = Date.parse(article.publishedAt ?? "");
      const publisher=publishersById.get(article.sourceId.replace(/^pulse-direct-/,''))??publishersByHost.get(publisherHost(article.sourceHomepage));
      const region=publisher?.region??article.region;
      const language=article.kind==='radar'?(publisher?.language??article.language):article.language;
      const country=publisher?.country??article.country;
      return (
        (filters.region === "all" || region === filters.region) &&
        (filters.language === "all" || language === filters.language) &&
        (!filters.country || filters.country === "all" || country === filters.country) &&
        (filters.kind === "all" || article.kind === filters.kind) &&
        (filters.ideology === "all" ||
          article.ideologies.includes(filters.ideology)) &&
        (filters.topic === "all" || articleTopics(article).includes(filters.topic)) &&
        (filters.source === "all" || article.sourceId === filters.source || publisher?.id === filters.source) &&
        (filters.days === Infinity ||
          (Number.isFinite(published) && published <= now &&
            now - published <= filters.days * 864e5)) &&
        (!query ||
          `${article.title} ${article.excerpt} ${article.sourceName} ${country} ${article.categories.join(" ")}`
            .toLocaleLowerCase("it")
            .includes(query))
      );
    })
    .sort((a, b) =>
      (filters.sort === "score" ? b.score - a.score :
        filters.sort === "source" ? a.sourceName.localeCompare(b.sourceName, "it") : 0)
      || comparePublication(a, b),
    );
}

export function restoreNewsSnapshot(
  raw: string | null,
  now = Date.now(),
): { articles: ReadingArticle[]; updatedAt: number; fresh: boolean } | null {
  try {
    const value = JSON.parse(raw ?? "null");
    if (
      !value ||
      typeof value.updatedAt !== "number" ||
      !Array.isArray(value.articles) ||
      now - value.updatedAt > 864e5 ||
      value.updatedAt > now + 60_000
    )
      return null;
    const articles = restoreSavedArticles(JSON.stringify(value.articles)).filter(isNewsArticle).sort(comparePublication).slice(
      0,
      1200,
    );
    if (!articles.length) return null;
    return {
      articles,
      updatedAt: value.updatedAt,
      fresh: now - value.updatedAt < 600_000,
    };
  } catch {
    return null;
  }
}
