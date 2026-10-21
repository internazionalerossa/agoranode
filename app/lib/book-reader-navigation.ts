import { THEORY_LIBRARY, bookEdition } from "../data/library";

export type BookReaderSelection = { bookId: string; edition: string };
export type BookReaderPosition = BookReaderSelection & { chapter: number; page: number };
export type BookReaderShareResult = "shared" | "copied" | "cancelled" | "unavailable";
export type BookReaderLoadResult = "loaded" | "invalid" | "failed" | "cancelled";

type SharePayload = { title: string; text?: string; url: string };
type ShareNavigator = {
  share?: (payload: SharePayload) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
};

const MAX_CHAPTER = 255;
const MAX_PAGE = 100_000;

function urlFrom(raw: string): URL | null {
  try {
    return new URL(raw, "https://site.invalid");
  } catch {
    return null;
  }
}

function only(params: URLSearchParams, key: string): string | null {
  const values = params.getAll(key);
  return values.length === 1 ? values[0] : null;
}

/** Shared chapter and page numbers are one-based; internal reader coordinates stay zero-based. */
function coordinate(value: string | null, maximum: number): number | null {
  if (value === null || !/^[1-9][0-9]*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= maximum + 1 ? parsed - 1 : null;
}

export function bookReaderSelectionFromUrl(raw: string, preferredLanguage: string): BookReaderSelection | null {
  const url = urlFrom(raw);
  if (!url) return null;
  const requestedBook = only(url.searchParams, "book");
  const requestedEdition = only(url.searchParams, "edition");
  if (url.searchParams.has("book") && requestedBook === null) return null;
  if (url.searchParams.has("edition") && requestedEdition === null) return null;
  const bookId = requestedBook ?? "manifesto";
  const book = THEORY_LIBRARY.find((entry) => entry.id === bookId);
  if (!book?.editions?.length) return null;
  if (requestedEdition !== null && !bookEdition(bookId, requestedEdition)) return null;
  const edition = requestedEdition ??
    book.editions.find((item) => item.language === preferredLanguage)?.language ??
    book.editions.find((item) => item.language === "en")?.language ??
    book.editions[0].language;
  return { bookId, edition };
}

export function bookReaderPositionFromUrl(raw: string): BookReaderPosition | null {
  const url = urlFrom(raw);
  if (!url) return null;
  const bookId = only(url.searchParams, "book");
  const edition = only(url.searchParams, "edition");
  const chapter = coordinate(only(url.searchParams, "chapter"), MAX_CHAPTER);
  const page = coordinate(only(url.searchParams, "page"), MAX_PAGE);
  if (!bookId || !edition || chapter === null || page === null || !bookEdition(bookId, edition)) return null;
  return { bookId, edition, chapter, page };
}

export function bookReaderPositionFits(
  position: BookReaderPosition,
  document: { language: string; chapter: number; chapters: readonly unknown[]; pages: readonly unknown[] },
): boolean {
  return position.edition === document.language &&
    position.chapter === document.chapter &&
    position.chapter < document.chapters.length &&
    position.page < document.pages.length;
}

/** An out-of-range public permalink falls back to the beginning of the selected edition. */
export function publicBookReaderFallback(result: BookReaderLoadResult): Pick<BookReaderPosition, "chapter" | "page"> | null {
  return result === "invalid" ? { chapter: 0, page: 0 } : null;
}

export function bookReaderUrl(position: BookReaderPosition): string {
  if (!bookEdition(position.bookId, position.edition) ||
      !Number.isSafeInteger(position.chapter) || position.chapter < 0 || position.chapter > MAX_CHAPTER ||
      !Number.isSafeInteger(position.page) || position.page < 0 || position.page > MAX_PAGE) {
    throw new RangeError("Invalid book reader position");
  }
  return `/read?${new URLSearchParams({
    book: position.bookId,
    edition: position.edition,
    chapter: String(position.chapter + 1),
    page: String(position.page + 1),
  })}`;
}

export async function copyBookReaderUrl(
  navigatorLike: ShareNavigator,
  url: string,
): Promise<BookReaderShareResult> {
  if (!navigatorLike.clipboard?.writeText) return "unavailable";
  try {
    await navigatorLike.clipboard.writeText(url);
    return "copied";
  } catch {
    return "unavailable";
  }
}

export async function shareBookReaderUrl(
  navigatorLike: ShareNavigator,
  payload: SharePayload,
): Promise<BookReaderShareResult> {
  if (navigatorLike.share) {
    try {
      await navigatorLike.share(payload);
      return "shared";
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return "cancelled";
    }
  }
  return copyBookReaderUrl(navigatorLike, payload.url);
}
