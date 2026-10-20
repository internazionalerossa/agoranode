"use client";
import LanguageSettings,{useLanguagePreferences} from "./LanguageSettings";

import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  CircleHelp,
  ExternalLink,
  Globe2,
  Languages,
  Loader2,
  Newspaper,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  X,
  UserRound,
} from "lucide-react";
import {
  lazy,
  Suspense,
  memo,
  useDeferredValue,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  SOURCE_CATALOG,
  TOPIC_TAXONOMY,
  REGION_ORDER,
  type SourceDefinition,
} from "@/app/data/catalog";
import BOOK_IDS from "@/app/data/book-ids.json" with { type: "json" };
import { DOSSIERS } from "@/app/data/editorial";
import {
  comparePublication,
  validateArticles,
  mergeArticles,
  restoreSavedArticles,
  restoreNewsSnapshot,
  safeWebUrl,
  type ReadingArticle as Article,
} from "@/app/lib/reading";
import {
  preferredLanguageFor,
  resolveLanguageChoices,
} from "@/app/lib/source-selection";

import type { SourceStatus } from "@/app/lib/feed";
import { createBatchedSink } from "@/app/lib/batched-sink";
import { CommunityEmblem } from "./CommunityEmblem";
import { QUOTATIONS, nextQuotation } from "@/app/data/quotes";
import { internationalEdition, selectNews, NEWS_PERIODS, NEWS_ORDERS } from "@/app/lib/news-edition";
import { isNewsArticle } from "@/app/lib/news-eligibility";
import { ArticleImage } from "./ArticleImage";
import { InitialLoadBoundary } from "./InitialLoadBoundary";
import BrandName from './BrandName';
import {brandName} from '@/app/lib/brand';
import { historyId } from "@/app/lib/history-navigation";
import { VideoCarousel } from "./VideoCarousel";
import { useRegionalNews } from "./useRegionalNews";
import { useCloudBookmarks, type RestoredCollection } from "./CloudBookmarks";
import { createPublisherResolver } from "@/app/lib/publisher";
import { useSourceHighlights } from "./SourceHighlights";
import { applySourceImages } from "@/app/lib/source-highlights";
import {
  LocalizationProvider,
  LocalizedText,
  TranslationNotice,
  useLocale,
  useReadingLocale,
  LanguageName,
  LocalizedInput,
} from "./Localization";

import { collectionOrder, collectAll, COLLECTION_CONCURRENCY } from "@/app/lib/collection";


type FeedPayload = { articles: Article[]; statuses: SourceStatus[] };
import {viewFromUrl,viewUrl,newsDaysFromUrl,type View} from "@/app/lib/view-navigation";
type DirectorySource = SourceDefinition & {
  count: number;
  status?: SourceStatus;
  discovered?: boolean;
};
const ALL = "all";
const validBookIds = new Set(BOOK_IDS);
const LibraryView = lazy(() => import("./LibraryView").then(module => ({ default: module.LibraryView })));
const PrivacyView = lazy(()=>import("./PrivacyView"));
const Acknowledgements = lazy(()=>import("./Acknowledgements"));
const CommunityView = lazy(() => import("./CommunityView"));
const SavedBooks = lazy(() => import("./LibraryView").then(module => ({ default: module.SavedBooks })));
const publisherFor = createPublisherResolver(SOURCE_CATALOG);
const PAGE_SIZE = 24;
const NAV: { id: View; label: string }[] = [
  { id: "notizie", label: "La rassegna" },
  { id: "teoria", label: "Biblioteca" },
  { id: "partecipa", label: "Partecipa" },
];
const HEADINGS = {
  crediti:{overline:"UN LAVORO COLLETTIVO",title:<LocalizedText>Fonti, crediti e ringraziamenti.</LocalizedText>,description:"Questo progetto vive grazie al lavoro di redazioni, autori, traduttori, bibliotecari, archivisti, ricercatori e comunità del software libero. Qui puoi risalire alle risorse utilizzate."},
  fonti: {
    overline: "L’ATLANTE",
    title: (
      <>
        <LocalizedText>{"Le fonti,"}</LocalizedText>
        <br />
        <em>
          <LocalizedText>{"da tutto il mondo."}</LocalizedText>
        </em>
      </>
    ),
    description:
      "Dietro ogni notizia c’è una redazione, un’organizzazione o un autore. Qui puoi conoscere le pubblicazioni raccolte, vedere da quale paese e lingua provengono e aprire i loro siti. I filtri aiutano a trovare una voce precisa; la presenza nel catalogo non sostituisce la lettura e la valutazione dei suoi contenuti.",
  },
  salvati: {
    overline: "IL TUO TACCUINO",
    title: (
      <>
        <LocalizedText>{"Articoli e libri"}</LocalizedText>
        <br />
        <em>
          <LocalizedText>{"salvati da te."}</LocalizedText>
        </em>
      </>
    ),
    description:
      "Questo è il tuo spazio per ritrovare le letture che vuoi conservare: articoli da approfondire, libri da riprendere e percorsi da continuare. Quando il servizio indipendente è attivo, l’accesso al tuo account permette di conservare la raccolta online e ritrovarla anche dopo la cancellazione dei dati del browser o da un altro dispositivo. La raccolta personale rimane privata.",
  },
  metodo: {
    overline: "IL PROGETTO",
    title: (
      <>
        <LocalizedText>{"Come funziona"}</LocalizedText>
        <br />
        <em>
          <LocalizedText>{"PolisRossa."}</LocalizedText>
        </em>
      </>
    ),
    description:
      "PolisRossa è uno strumento per orientarsi nell’informazione socialista, comunista, sindacale e anticoloniale. Qui spieghiamo come funziona e quali sono i suoi limiti.",
  },
};

export function AggregatorApp() {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [browserLanguage, setBrowserLanguage] = useState("it");
  const [view, setView] = useState<View>("notizie");
  useEffect(() => {
    const sync = () => {
      const url = new URL(window.location.href);
      const legacy = url.searchParams.get("view") === "osservatorio" || url.hash === "#osservatorio-sei-ore";
      setView(legacy ? "notizie" : viewFromUrl(url.href));
      setDays(newsDaysFromUrl(url.href));
      if (legacy) {
        url.searchParams.delete("view"); url.searchParams.set("periodo", "6h"); url.hash = "";
        window.history.replaceState(window.history.state, "", url.pathname + url.search);
      }
    };
    sync(); window.addEventListener("popstate", sync); window.addEventListener("hashchange", sync);
    return () => { window.removeEventListener("popstate", sync); window.removeEventListener("hashchange", sync); };
  }, []);
  const [articles, setArticles] = useState<Article[]>([]);
  const [statuses, setStatuses] = useState<Record<string, SourceStatus>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savedArticles, setSavedArticles] = useState<Article[]>([]);
  const [savedBooks, setSavedBooks] = useState<Set<string>>(new Set());
  const [storageReady, setStorageReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [region, setRegion] = useState(ALL);
  const [country, setCountry] = useState(ALL);
  const [language, setLanguage] = useState(ALL);
  const [topic, setTopic] = useState(ALL);
  const [sourceId, setSourceId] = useState(ALL);
  const [days, setDays] = useState("1");
  const [sort, setSort] = useState("balanced");
  const sourceHighlights = useSourceHighlights(articles, view === "notizie" || view === "salvati");
  const regional = useRegionalNews(view === "notizie");
  const networkArticles = useMemo(() => mergeArticles(articles, regional.articles), [articles, regional.articles]);
  const displayArticles = useMemo(() => applySourceImages(networkArticles, sourceHighlights.images), [networkArticles, sourceHighlights.images]);
  const choosePeriod = (value: string) => {
    setDays(value);
    const url = new URL(window.location.href);
    if (value === "1") url.searchParams.delete("periodo"); else url.searchParams.set("periodo", value === "0.25" ? "6h" : value);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  };
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [initialWindowReady, setInitialWindowReady] = useState(false);
  const languagePreferences=useLanguagePreferences();
  const preferredRef = useRef("it");
  const hasArticlesRef = useRef(false);
  const collectingRef = useRef(false);
  const [progress, setProgress] = useState({
    done: 0,
    total: SOURCE_CATALOG.length,
  });
  const [dateLabel, setDateLabel] = useState("L’informazione, oltre i confini");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preferredLanguage, setPreferredLanguage] = useState("it");
  const [newsUpdatedAt, setNewsUpdatedAt] = useState(0);
  const [newsClock, setNewsClock] = useState(Date.now);
  useEffect(() => {
    const tick = () => setNewsClock(Date.now());
    const timer = setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, []);
  const [refreshNotice, setRefreshNotice] = useState("");
  const refreshNumber = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const readerDialog = useRef<HTMLDialogElement>(null);

  const restoreCollection = useCallback((snapshot: RestoredCollection) => {
    const removedArticles = new Set(snapshot.removed.filter(item => item.kind === "article").map(item => item.key));
    const removedBooks = new Set(snapshot.removed.filter(item => item.kind === "book").map(item => item.key));
    setSavedArticles(current => mergeArticles(snapshot.replace ? [] : current, snapshot.articles).filter(article => !removedArticles.has(article.id)));
    setSavedIds(current => new Set([...(snapshot.replace ? [] : current), ...snapshot.articles.map(article => article.id)].filter(id => !removedArticles.has(id))));
    setSavedBooks(current => new Set([...(snapshot.replace ? [] : current), ...snapshot.books].filter(id => validBookIds.has(id) && !removedBooks.has(id))));
  }, []);
  const cloud = useCloudBookmarks({ ready: storageReady, articles: savedArticles, books: useMemo(() => [...savedBooks], [savedBooks]), onRestore: restoreCollection });
  const toggleBook = (id: string) => {
    const saving = !savedBooks.has(id);
    setSavedBooks(current => { const next = new Set(current); saving ? next.add(id) : next.delete(id); return next; });
    cloud.change({ kind: "book", key: id, deleted: !saving });
  };

  useEffect(() => {
    setDateLabel(
      new Intl.DateTimeFormat("it-IT", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    );
    try {
      const restored = restoreSavedArticles(
        localStorage.getItem("rassegna-rossa.saved-articles"),
      );
      let rawIds: unknown = [];
      try {
        rawIds = JSON.parse(
          localStorage.getItem("rassegna-rossa.saved") ??
            localStorage.getItem("internazionale.saved") ??
            "[]",
        );
      } catch {
        /* Valid saved cards still restore if legacy IDs are corrupt. */
      }
      const claimed = Boolean(localStorage.getItem("rassegna-rossa.saved-account"));
      setSavedIds(
        new Set(claimed ? [] : [
          ...restored.map((a) => a.id),
          ...(Array.isArray(rawIds)
            ? rawIds.filter((id): id is string => typeof id === "string")
            : []),
        ]),
      );
      if (!claimed) {
        setSavedArticles(restored);
        const books = JSON.parse(localStorage.getItem("rassegna-rossa.saved-books") ?? "[]");
        if (Array.isArray(books)) setSavedBooks(new Set(books.filter(id => validBookIds.has(id))));
      }
      const requestedView = new URLSearchParams(window.location.search).get("view");
      setView(viewFromUrl(window.location.href));
    } catch {
      setStorageWarning(true);
    }
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      if (localStorage.getItem("rassegna-rossa.saved-account") && !cloud.account) return;
      localStorage.setItem(
        "rassegna-rossa.saved",
        JSON.stringify(Array.from(savedIds)),
      );
      localStorage.setItem(
        "rassegna-rossa.saved-articles",
        JSON.stringify(savedArticles),
      );
      localStorage.setItem("rassegna-rossa.saved-books", JSON.stringify([...savedBooks]));
    } catch {
      setStorageWarning(true);
    }
  }, [savedIds, savedArticles, savedBooks, storageReady, cloud.account]);

  useEffect(() => {
    // Old saved IDs become persistent article cards when their feed is fetched again.
    if (!articles.length || !storageReady) return;
    setSavedArticles((current) => {
      const matching = articles.filter((a) => savedIds.has(a.id));
      const next = mergeArticles(
        current.filter((a) => savedIds.has(a.id)),
        matching,
      );
      return JSON.stringify(next) === JSON.stringify(current) ? current : next;
    });
  }, [articles, savedIds, storageReady]);

  const reset = useCallback(() => {
    setQuery("");
    setRegion(ALL);
    setCountry(ALL);
    setLanguage(ALL);
    try { localStorage.setItem("rassegna-rossa.source-language", ALL); } catch { /* Optional preference storage. */ }
    setTopic(ALL);
    setSourceId(ALL);
    setDays("1");
    const url = new URL(window.location.href);
    url.searchParams.delete("periodo");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    setSort("balanced");
    setVisibleCount(PAGE_SIZE);
  }, []);
  const navigate = (next: View) => {
    const target=viewUrl(window.location.href,next);
    if(target!==window.location.pathname+window.location.search+window.location.hash)window.history.pushState(window.history.state,"",target);
    setView(next);
    reset();
    setFiltersOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const stopRefresh = () => {
    ++refreshNumber.current;
    abortRef.current?.abort();
    setLoading(false);
    setCollecting(false);
    collectingRef.current = false;
    setRefreshNotice(
      "Raccolta interrotta. Le notizie già recuperate restano disponibili.",
    );
  };

  const refresh = useCallback(
    async (
      _scope: "initial" | "all" | "selection" = "all",
      preferred = preferredRef.current,
      explicitIds?: string[],
    ) => {
      const applyResult = (payload: FeedPayload) => {
        if (
          !Array.isArray(payload.articles) ||
          !Array.isArray(payload.statuses)
        )
          return;
        const cards = validateArticles(payload.articles);
        if (cards.length) {
          hasArticlesRef.current = true;
          setLoading(false);
          setNewsUpdatedAt(Date.now());
          setArticles((current) => mergeArticles(current, cards));
        }
        setStatuses((current) => ({
          ...current,
          ...Object.fromEntries(
            payload.statuses.map((status) => [status.sourceId, status]),
          ),
        }));
      };
      const worker = async (source: SourceDefinition, signal: AbortSignal) => {
        const response = await fetch(
          `/api/articles?sourceIds=${encodeURIComponent(source.id)}&limitPerSource=24&includeImages=1`,
          { signal },
        );
        if (!response.ok) throw new Error("Source unavailable");
        return (await response.json()) as FeedPayload;
      };
      // Opening one source never interrupts the full catalogue collection.
      if (explicitIds) {
        await Promise.all(
          SOURCE_CATALOG.filter((source) =>
            explicitIds.includes(source.id),
          ).map(async (source) => {
            try {
              applyResult(await worker(source, AbortSignal.timeout(18000)));
            } catch {
              /* Full collection remains active. */
            }
          }),
        );
        return;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const run = ++refreshNumber.current;
      const targets = collectionOrder(SOURCE_CATALOG, preferred);
      collectingRef.current = true;
      setCollecting(true);
      setLoading(!hasArticlesRef.current);
      setRefreshNotice("");
      setProgress({ done: 0, total: targets.length });
      const firstScreenDeadline = setTimeout(() => {
        if (run === refreshNumber.current) { setLoading(false); setInitialWindowReady(true); }
      }, 3000);
      try {
        let completed = 0;
        const sink = createBatchedSink<{ payload?: FeedPayload; done?: number }>(updates => {
          if (run !== refreshNumber.current) return;
          const payloads = updates.flatMap(update => update.payload ? [update.payload] : []);
          if (payloads.length) applyResult({
            articles: payloads.flatMap(payload => Array.isArray(payload.articles) ? payload.articles : []),
            statuses: payloads.flatMap(payload => Array.isArray(payload.statuses) ? payload.statuses : []),
          });
          const last = updates.filter(update => update.done !== undefined).at(-1);
          if (last) setProgress({ done: last.done!, total: targets.length });
        });
        const options = {
          signal: controller.signal,
          worker,
          onResult: (_source: SourceDefinition, payload: FeedPayload) => {
            if (run === refreshNumber.current) sink.push({ payload });
          },
          onError: (source: SourceDefinition) => {
            if (run !== refreshNumber.current) return;
            sink.push({ payload: { articles: [], statuses: [{
              sourceId: source.id, name: source.name, ok: false, count: 0, feedUrl: null,
              fetchedAt: new Date().toISOString(), cached: false,
              error: "Verifica del feed non completata nel tempo previsto. Il sito originale resta accessibile.",
            }] } });
          },
          onProgress: () => {
            completed++;
            if (run === refreshNumber.current) sink.push({ done: completed });
          },
        };
        try {
          await Promise.all([
            collectAll({ ...options, items: targets.filter(source => source.kind !== "radar"), concurrency: COLLECTION_CONCURRENCY.direct, timeoutMs: 14000 }),
            collectAll({ ...options, items: targets.filter(source => source.kind === "radar"), concurrency: COLLECTION_CONCURRENCY.radar, timeoutMs: 18000 }),
          ]);
        } finally {
          sink.flush();
          sink.clear();
        }
      } finally {
        clearTimeout(firstScreenDeadline);
        if (run === refreshNumber.current) {
          collectingRef.current = false;
          setCollecting(false);
          setLoading(false);
          setInitialWindowReady(true);
              }
      }
    },
    [],
  );

  useEffect(() => {
    const available = [
      ...new Set(SOURCE_CATALOG.map((source) => source.language)),
    ];
    const detected = preferredLanguageFor(
      navigator.languages?.length ? navigator.languages : [navigator.language],
      available,
    );
    setBrowserLanguage(detected);
    setPreferredLanguage(detected);
    preferredRef.current = detected;
    let initialSourcePreference = detected;
    try {
      const previous = Number(
        sessionStorage.getItem("rassegna-rossa.quote") ?? "-1",
      );
      const next = nextQuotation(previous);
      setQuoteIndex(next);
      sessionStorage.setItem("rassegna-rossa.quote", String(next));
    } catch {
      setQuoteIndex(Math.floor(Math.random() * QUOTATIONS.length));
    }
    try {
      const choices = resolveLanguageChoices(
        {
          reading: localStorage.getItem("rassegna-rossa.reading-language"),
          sources: localStorage.getItem("rassegna-rossa.source-language"),
          legacy: localStorage.getItem("rassegna-rossa.language"),
        },
        available,
      );
      setLanguage(choices.sources);
      initialSourcePreference = choices.sources !== ALL ? choices.sources : choices.reading !== "auto" ? choices.reading : detected;
      const snapshot = restoreNewsSnapshot(
        localStorage.getItem("rassegna-rossa.feed-cache"),
      );
      if (snapshot) {
        setArticles(snapshot.articles);
        setInitialWindowReady(snapshot.articles.length > 0);
        hasArticlesRef.current = snapshot.articles.length > 0;
        setLoading(false);
        setNewsUpdatedAt(snapshot.updatedAt);
      }
    } catch {
      /* Browser storage is optional. */
    }
    void refresh("initial", initialSourcePreference);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && !collectingRef.current)
        void refresh("all", preferredRef.current);
    }, 600000);
    return () => {
      clearInterval(timer);
      abortRef.current?.abort();
      ++refreshNumber.current;
    };
  }, [refresh]);

  useEffect(() => {
    if (!storageReady || !newsUpdatedAt || !articles.length) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          "rassegna-rossa.feed-cache",
          JSON.stringify({
            updatedAt: newsUpdatedAt,
            articles: internationalEdition(displayArticles, Date.now()).slice(0, 1200),
          }),
        );
      } catch {
        /* Never discard bookmarks to make room for a feed cache. */
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [displayArticles, newsUpdatedAt, storageReady]);

  const chooseSourceLanguage = (value: string) => {
    setLanguage(value);
    setSourceId(ALL);
    try {
      localStorage.setItem("rassegna-rossa.source-language", value);
    } catch {
      /* Optional storage. */
    }
    if (value !== ALL) {
      const immediate = SOURCE_CATALOG.filter(source => source.language === value && source.kind !== "radar").slice(0, 4).map(source => source.id);
      if (immediate.length) void refresh("selection", preferredRef.current, immediate);
    }
  };
  const openSource = (id: string) => {
    navigate("notizie");
    setSourceId(id);
    choosePeriod("Infinity");
    void refresh("selection", preferredLanguage, [id]);
    requestAnimationFrame(() =>
      document
        .getElementById("letture")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.key !== "/" ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        readerDialog.current?.open ||
        target?.isContentEditable ||
        target?.closest("input, textarea, select")
      )
        return;
      const search = document.getElementById("rassegna-search");
      if (search) {
        event.preventDefault();

        requestAnimationFrame(() => search.focus());
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const allArticles = useMemo(
    () => mergeArticles(savedArticles, displayArticles),
    [savedArticles, displayArticles],
  );
  const filtered = useMemo(
    () =>
      selectNews(
        view === "salvati"
          ? allArticles.filter((a) => savedIds.has(a.id))
          : displayArticles.filter(isNewsArticle),
        {
          query: deferredQuery,
          region,
          country,
          language,
          kind: ALL,
          ideology: ALL,
          topic,
          source: sourceId,
          days: view === "salvati" ? Infinity : Number(days),
          sort,
        },
        newsClock,
      ),
    [
      view,
      allArticles,
      displayArticles,
      savedIds,
      deferredQuery,
      region,
      country,
      language,
      topic,
      sourceId,
      days,
      sort,
      newsClock,
    ],
  );
  const orderedArticles = filtered;
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [
    view,
    query,
    region,
    country,
    language,
    topic,
    sourceId,
    days,
    sort,
  ]);
  const selectedArticle = allArticles.find((a) => a.id === selectedId) ?? null;
  useEffect(() => {
    if (selectedArticle) {
      if (!readerDialog.current?.open) readerDialog.current?.showModal();
      readerDialog.current?.scrollTo({ top: 0 });
    }
  }, [selectedArticle]);

  const toggleSave = useCallback((article: Article) => {
    const saving = !savedIds.has(article.id);
    cloud.change({ kind: "article", key: article.id, article, deleted: !saving });
    setSavedIds((current) => {
      const next = new Set(current);
      saving ? next.add(article.id) : next.delete(article.id);
      return next;
    });
    setSavedArticles((current) =>
      saving
        ? mergeArticles(current, [article])
        : current.filter((a) => a.id !== article.id),
    );
  }, [savedIds, cloud.change]);
  const directory = useMemo(() => {
    const counts = new Map<string, number>();
    const sources = new Map<string, DirectorySource>(
      SOURCE_CATALOG.map((s) => [
        s.id,
        { ...s, count: 0, status: statuses[s.id] },
      ]),
    );
    for (const article of networkArticles.filter(isNewsArticle)) {
      counts.set(article.sourceId, (counts.get(article.sourceId) ?? 0) + 1);
      if (!sources.has(article.sourceId))
        sources.set(article.sourceId, {
          id: article.sourceId,
          name: article.sourceName,
          homepage: article.sourceHomepage,
          region: article.region,
          country: article.country,
          language: article.language,
          kind: article.kind,
          ideologies: article.ideologies,
          tags: article.topics,
          priority: 1,
          count: 0,
          discovered: true,
        });
    }
    return Array.from(sources.values())
      .map((s) => ({
        ...s,
        count:
          counts.get(s.id) ?? (s.kind === "radar" ? (s.status?.count ?? 0) : 0),
      }))
      .sort(
        (a, b) =>
          Number(b.language === preferredLanguage) -
            Number(a.language === preferredLanguage) ||
          a.name.localeCompare(b.name, "it"),
      );
  }, [networkArticles, statuses, preferredLanguage]);
  const visibleSources = useMemo(
    () =>
      directory.filter(
        (s) =>
          (region === ALL || s.region === region) &&
          (country === ALL || s.country === country) &&
          (language === ALL || s.language === language) &&
          (sourceId === ALL || s.id === sourceId) &&
          (!query.trim() ||
            `${s.name} ${s.country} ${s.tags.join(" ")} ${s.ideologies.join(" ")}`
              .toLowerCase()
              .includes(query.trim().toLowerCase())),
      ),
    [directory, region, country, language, sourceId, query],
  );
  const languages = useMemo(
    () => [...new Set(SOURCE_CATALOG.map((s) => s.language))].sort(),
    [],
  );
  const failedPublishers = SOURCE_CATALOG.filter(source => source.kind !== "radar" && statuses[source.id]?.ok === false).length;
  const failedRadars = SOURCE_CATALOG.filter(source => source.kind === "radar" && statuses[source.id]?.ok === false).length;
  const failedCount = failedPublishers + failedRadars;
  const filterCount =
    [region, country, language, topic, sourceId].filter((f) => f !== ALL).length +
    (days !== "1" ? 1 : 0) +
    (query ? 1 : 0);
  const heading = view in HEADINGS ? HEADINGS[view as keyof typeof HEADINGS] : null;
  const ContentHeading = view === "notizie" ? "h1" : "h2";
  const readingLanguage =
    languagePreferences.contentLanguage;
  const quote = QUOTATIONS[quoteIndex];
  useEffect(() => {
    setDateLabel(
      new Intl.DateTimeFormat(languagePreferences.interfaceLanguage, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    );
  }, [languagePreferences.interfaceLanguage]);

  return (
    <LocalizationProvider language={languagePreferences.interfaceLanguage} contentLanguage={readingLanguage} original={languagePreferences.original}>
      <InitialLoadBoundary collecting={(view === "notizie" && !initialWindowReady && orderedArticles.length < PAGE_SIZE) || (view === "salvati" && cloud.status === "checking")} progress={progress} language={languagePreferences.interfaceLanguage} brandLanguage={readingLanguage}>
      <div className="app-shell">
        <a className="skip-link" href="#letture">
          <LocalizedText>{"Vai ai contenuti"}</LocalizedText>
        </a>
        <header className="site-header">
          <div className="utility-bar">
            <span>{dateLabel}</span>

          </div>
          <div className="masthead">
            <div className="brand-block"><button
              className="wordmark"
              onClick={() => navigate("notizie")}
              aria-label={brandName(readingLanguage)}
            >
              <span className="brand-symbol" aria-hidden="true">
                <CommunityEmblem compact />
              </span>
              <span>
                <BrandName language={readingLanguage}/>
              </span>
            </button><p className="brand-tagline"><LocalizedText>Leggere le fonti, sostenere chi informa.</LocalizedText></p></div>
            <div className="header-account-actions"><LanguageSettings/><a href="/?view=salvati" onClick={event=>{event.preventDefault();navigate("salvati");}}><Bookmark size={16}/><LocalizedText>I tuoi salvati</LocalizedText>{savedIds.size+savedBooks.size>0&&<span>{savedIds.size+savedBooks.size}</span>}</a><a className="header-account-link" href={"/account?"+new URLSearchParams({return_to:view==="notizie"?"/":"/?view="+view})}><UserRound size={17}/><LocalizedText>{cloud.account?"Il tuo account":"Accedi / Registrati"}</LocalizedText></a></div>
          </div>
          <nav className="main-nav" aria-label="Navigazione principale">
            <div className="nav-links">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  aria-current={view === item.id ? "page" : undefined}
                  onClick={() => navigate(item.id)}
                >
                  <LocalizedText>{item.label}</LocalizedText>

                </button>
              ))}
            </div>
            <button className="source-directory-button" aria-current={view==="fonti"?"page":undefined} onClick={()=>navigate("fonti")}><Newspaper size={15}/><LocalizedText>Fonti</LocalizedText><strong>{SOURCE_CATALOG.filter(source=>source.kind!=="radar").length}</strong><span>+ {SOURCE_CATALOG.filter(source=>source.kind==="radar").length} <LocalizedText>radar</LocalizedText></span></button>
          </nav>
        </header>

        <main>
          {view === "notizie" ? <><VideoCarousel /><aside className="news-library-invitation" aria-label="Approfondimenti e comunità"><a href="/?view=teoria" onClick={event=>{event.preventDefault();navigate("teoria");}}><strong><LocalizedText>Biblioteca</LocalizedText> →</strong><span><LocalizedText>Libri gratuiti, percorsi di lettura, storia delle conquiste e un archivio di dati da confrontare.</LocalizedText></span></a><a href="/?view=partecipa" onClick={event=>{event.preventDefault();navigate("partecipa");}}><strong><LocalizedText>Partecipa</LocalizedText> →</strong><span><LocalizedText>Discussioni nel forum, stanze di chat e proposte con votazione per migliorare il progetto.</LocalizedText></span></a></aside></> : null}
          {heading ? (
            <section className="editorial-hero hero-compact" aria-labelledby="page-title">
              <div className="hero-copy">
                <p className="eyebrow"><LocalizedText>{heading.overline}</LocalizedText></p>
                <h1 id="page-title">{heading.title}</h1>
                <p className="hero-description"><LocalizedText>{heading.description}</LocalizedText></p>
              </div>
            </section>
          ) : null}

          <section
            id="letture"
            className="reading-section"
            aria-label="Contenuti della rassegna"
          >
            {view === "notizie" || view === "salvati" || view === "fonti" ? (
              <>
                <div className="news-controls-heading">
                  <div className="reading-controls-content">
                <div className="section-heading">
                  <div className="reading-heading-copy">
                    <p className="eyebrow">
                      <LocalizedText>
                        {view === "fonti"
                          ? "L’INFORMAZIONE HA UN’ORIGINE"
                          : view === "salvati"
                            ? "IL TEMPO DI APPROFONDIRE"
                            : "DALLA RETE AL CONTESTO"}
                      </LocalizedText>
                    </p>
                    <ContentHeading id={view === "notizie" ? "page-title" : undefined}>
                      <LocalizedText>
                        {view === "notizie"
                          ? "La rassegna"
                          : view === "salvati"
                            ? "Le tue letture"
                            : "Atlante delle fonti"}
                      </LocalizedText>
                      {view === "fonti" ? <span className="section-count">{visibleSources.length}</span> : null}
                    </ContentHeading>
                  </div>

                  {view !== "salvati" ? (
                    <button
                      className="button button-outline"
                      aria-label="Aggiorna le notizie"
                      disabled={collecting}
                      onClick={() => { regional.refresh(); if (!collecting) void refresh("all"); }}
                    >
                      <RefreshCcw size={15} />
                      <span>
                        <LocalizedText>
                          {collecting ? "Aggiornamento…" : "Aggiorna"}
                        </LocalizedText>
                      </span>
                    </button>
                  ) : (
                    <span className="local-note">
                      <Bookmark size={15} />
                      <LocalizedText>{cloud.account ? " Raccolta personale" : " Copia su questo dispositivo"}</LocalizedText>
                    </span>
                  )}
                </div>
                {view === "salvati" ? (
                  <div className="cloud-library-status" role="status">
                    <LocalizedText>{cloud.status === "checking" ? "Verifica dell’archivio personale…" : cloud.status === "synced" ? "Articoli e libri salvati nel tuo account. Li ritrovi anche dopo aver cancellato i dati del browser." : cloud.status === "syncing" ? "Sincronizzazione dei salvataggi in corso…" : cloud.status === "local" ? "Questa copia è solo sul dispositivo. Accedi per conservarla nel tuo archivio personale." : "La sincronizzazione non è riuscita. Le modifiche in attesa restano sul dispositivo."}</LocalizedText>
                    {!cloud.account && cloud.status === "local" ? <a href={cloud.signInUrl} target="_top"><LocalizedText>Accedi al tuo account</LocalizedText></a> : null}
                    {cloud.status === "error" ? <button className="text-link" onClick={cloud.retry}><LocalizedText>Riprova sincronizzazione</LocalizedText></button> : null}
                  </div>
                ) : null}
                {view !== "salvati" && cloud.status === "local" && savedIds.size + savedBooks.size > 0 ? <p className="account-save-note"><LocalizedText>Salvati su questo dispositivo.</LocalizedText> <a href={cloud.signInUrl} target="_top"><LocalizedText>Accedi per conservarli nel tuo account</LocalizedText></a></p> : null}
                <TranslationNotice />
                  </div>
                </div>
                <div className="filter-toolbar" aria-label="Filtri della rassegna">
                  <label className="search-box">
                    <Search size={18} />
                    <LocalizedInput
                      id="rassegna-search"
                      aria-label={
                        view === "fonti" ? "Cerca fonti" : "Cerca articoli"
                      }
                      placeholder={
                        view === "fonti"
                          ? "Cerca una fonte, un paese…"
                          : "Cerca notizie, fonti, parole chiave…"
                      }
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    {query ? (
                      <button
                        onClick={() => setQuery("")}
                        aria-label="Cancella ricerca"
                      >
                        <X size={16} />
                      </button>
                    ) : (
                      <kbd>
                        <LocalizedText>{"/"}</LocalizedText>
                      </kbd>
                    )}
                  </label>
                  {view === "notizie" ? <>
                    <Select label="Periodo" value={days} change={choosePeriod}>
                      {NEWS_PERIODS.map(([value, label]) => <option key={value} value={value}><LocalizedText>{label}</LocalizedText></option>)}
                    </Select>
                  </> : null}
                  {view !== "fonti" ? (
                    <label className="inline-select news-order">
                      <span><LocalizedText>Ordina</LocalizedText></span>
                      <select aria-label="Ordina le notizie" value={sort} onChange={event => setSort(event.target.value)}>
                        {NEWS_ORDERS.map(([value, label]) => <option key={value} value={value}><LocalizedText>{label}</LocalizedText></option>)}
                      </select>
                      <ChevronDown size={14} />
                    </label>
                  ) : null}
                  <button
                    className={`filter-toggle ${filtersOpen ? "active" : ""}`}
                    onClick={() => setFiltersOpen(!filtersOpen)}
                    aria-expanded={filtersOpen}
                    aria-controls="advanced-filters"
                  >
                    <SlidersHorizontal size={16} />
                    <LocalizedText>{" Filtra per fonte e argomento"}</LocalizedText>
                    <LocalizedText> </LocalizedText>
                    {filterCount > 0 ? (
                      <span>
                        <LocalizedText>{filterCount}</LocalizedText>
                      </span>
                    ) : null}
                  </button>
                </div>
                <div id="advanced-filters" className="advanced-filters unified-filters" hidden={!filtersOpen}>
                  <label className="source-language-control source-language-inline">
                    <Newspaper size={16} />
                    <span>
                      <strong>
                        <LocalizedText>
                          Lingua originale delle fonti
                        </LocalizedText>
                      </strong>
                      <small>
                        <LocalizedText>
                          Seleziona la lingua originale delle fonti
                        </LocalizedText>
                      </small>
                    </span>
                    <select
                      aria-label="Lingua delle fonti in analisi"
                      value={language}
                      onChange={(event) =>
                        chooseSourceLanguage(event.target.value)
                      }
                    >
                      <option value={ALL}>
                        <LocalizedText>Tutte le lingue</LocalizedText>
                      </option>
                      {languages.map((code) => (
                        <option key={code} value={code}>
                          <LanguageName code={code} />
                        </option>
                      ))}
                    </select>
                  </label>


                    <Select label="Area della testata" value={region} change={value=>{setRegion(value);setCountry(ALL);setSourceId(ALL);}}>
                      <option value={ALL}><LocalizedText>Tutto il mondo</LocalizedText></option>
                      {REGION_ORDER.map(value => <option key={value} value={value}><LocalizedText>{value}</LocalizedText></option>)}
                    </Select>
                    <Select label="Paese della testata" value={country} change={value=>{setCountry(value);setSourceId(ALL);}}>
                      <option value={ALL}><LocalizedText>Tutti i paesi</LocalizedText></option>
                      {[...new Set(directory.filter(source=>region===ALL||source.region===region).map(source => source.country).filter(Boolean))].sort().map(value => <option key={value} value={value}><LocalizedText>{value}</LocalizedText></option>)}
                    </Select>
                    <Select label="Fonte" value={sourceId} change={setSourceId}>
                      <option value={ALL}><LocalizedText>Tutte le fonti</LocalizedText></option>
                      {directory.filter(source=>source.kind!=="radar"&&(region===ALL||source.region===region)&&(country===ALL||source.country===country)&&(language===ALL||source.language===language)).map(source => <option key={source.id} value={source.id}>{source.name}</option>)}
                    </Select>
                    {view !== "fonti" ? <>
                      <Select label="Tema nel titolo o nell’estratto" value={topic} change={setTopic}>
                        <option value={ALL}><LocalizedText>Tutti gli argomenti</LocalizedText></option>
                        {TOPIC_TAXONOMY.map(item => <option key={item.id} value={item.id}><LocalizedText>{item.label}</LocalizedText></option>)}
                      </Select>
                    </> : null}
                    <p className="filter-explanation"><LocalizedText>La lingua di lettura, nell’intestazione, regola le traduzioni. La lingua delle fonti seleziona le lingue originali degli articoli; il paese indica la sede della testata e non la lingua o il luogo della notizia. La ricerca usa il testo originale delle fonti. Il tema è riconosciuto nel titolo, nell’estratto e nelle categorie, con possibili errori.</LocalizedText></p>
                    <button className="text-link" onClick={() => { reset(); chooseSourceLanguage(ALL); }}>
                      <X size={14} />
                      <LocalizedText>{" Azzera filtri"}</LocalizedText>
                    </button>
                </div>
                {view !== "fonti" ? <div className="news-selection-status" role="status" aria-live="polite" aria-atomic="true"><strong>{filtered.length} <LocalizedText>articoli trovati</LocalizedText></strong><span><LocalizedText>{NEWS_ORDERS.find(([value]) => value === sort)?.[1] ?? "Più recenti prima"}</LocalizedText>{view === "notizie" ? <> · <LocalizedText>{NEWS_PERIODS.find(([value]) => value === days)?.[1] ?? "Ultime 24 ore"}</LocalizedText></> : null}</span><small><LocalizedText>{sort === "balanced" ? "Una notizia per testata prima di ripetere una fonte, alternando i paesi nelle 24 ore. All’interno di ogni fonte, prima le più recenti." : sort === "source" ? "Testate in ordine alfabetico; per ogni testata, prima gli articoli più recenti." : "Ordine basato sulla data di pubblicazione indicata dalla fonte."}</LocalizedText></small>{days === "Infinity" && view === "notizie" ? <small><LocalizedText>Include solo gli articoli ricevuti dai feed e conservati sul dispositivo, anche senza data. Non è un archivio storico completo.</LocalizedText></small> : null}</div> : null}
                {view === "notizie" && regional.failed > 0 ? <p className="feed-note" role="status"><LocalizedText>Alcuni canali regionali non rispondono. La rassegna mostra le notizie disponibili e riprova al prossimo aggiornamento.</LocalizedText></p> : null}
                {sourceId !== ALL ? (
                  <div className="active-source">
                    <Newspaper size={16} />
                    <span>
                      <LocalizedText>{"Fonte:"}</LocalizedText>
                      <LocalizedText> </LocalizedText>
                      <strong>
                        <LocalizedText>
                          {directory.find((s) => s.id === sourceId)?.name ??
                            sourceId}
                        </LocalizedText>
                      </strong>
                    </span>
                    <button
                      onClick={() => setSourceId(ALL)}
                      aria-label="Mostra tutte le fonti"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : null}
                {filterCount>0&&<button className="reset-reading-filters text-link" onClick={()=>{reset();chooseSourceLanguage(ALL);}}><X size={14}/><LocalizedText>Ripristina la rassegna</LocalizedText></button>}
                {storageWarning ? (
                  <p className="notice" role="status">
                    <LocalizedText>
                      {
                        "Il browser non ha consentito l’accesso ai salvataggi. Puoi continuare a leggere, ma i nuovi preferiti potrebbero non restare dopo la chiusura."
                      }
                    </LocalizedText>
                  </p>
                ) : null}
                {refreshNotice ? (
                  <p className="notice" role="status">
                    <LocalizedText>{refreshNotice}</LocalizedText>
                  </p>
                ) : null}
                {view !== "salvati" ? <p className="feed-status" role="status"><span className="live-dot"/><LocalizedText>{collecting?"Aggiornamento delle fonti in corso. Puoi già leggere e filtrare.":"Raccolta aggiornata automaticamente. Aggiorna per riprovare le fonti."}</LocalizedText>{collecting&&<button className="text-link" onClick={stopRefresh}><LocalizedText>Interrompi</LocalizedText></button>}</p> : null}
                {view === "fonti" ? (
                  <SourcesDirectory
                    sources={visibleSources}
                    onSelect={openSource}
                  />
                ) : (
                  <div className="news-layout">
                    <div className="news-main" id="rassegna-articoli">


                      {topic !== ALL ? (
                        <div className="topic-intro">
                          <p className="eyebrow">
                            <LocalizedText>{"PERCORSO TEMATICO"}</LocalizedText>
                          </p>
                          <h3>
                            <LocalizedText>
                              {DOSSIERS.find((d) => d.id === topic)?.title ??
                                TOPIC_TAXONOMY.find((t) => t.id === topic)
                                  ?.label}
                            </LocalizedText>
                          </h3>
                          <p>
                            <LocalizedText>
                              {DOSSIERS.find((d) => d.id === topic)
                                ?.description ??
                                "Una selezione automatica dai feed: confronta le voci e risali sempre alla fonte originale."}
                            </LocalizedText>
                          </p>
                        </div>
                      ) : null}
                      {view === "salvati" && savedBooks.size ? <Suspense fallback={<p role="status"><LocalizedText>Apertura dei libri salvati…</LocalizedText></p>}><SavedBooks savedBooks={savedBooks} query={query} onToggleBook={toggleBook} /></Suspense> : null}
                      <div className="news-grid" aria-label="Articoli">
                        {orderedArticles
                          .slice(0, visibleCount)
                          .map((article) => (
                            <ArticleCard
                              key={article.id}
                              article={article}
                              now={newsClock}
                              saved={savedIds.has(article.id)}
                              onSelect={setSelectedId}
                              onSave={toggleSave}
                            />
                          ))}
                      </div>
                      {!filtered.length && !(view === "salvati" && savedBooks.size) ? (
                        <EmptyState
                          loading={loading && view !== "salvati"}
                          collecting={collecting}
                          saved={view === "salvati"}
                          filtered={filterCount > 0 || topic !== ALL}
                          onReset={reset}
                          onExplore={() =>
                            navigate(view === "salvati" ? "notizie" : "fonti")
                          }
                          onRetry={() => { regional.refresh(); void refresh("all"); }}
                        />
                      ) : null}
                      {filtered.length > visibleCount ? (
                        <button
                          className="button button-outline load-more"
                          onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                        >
                          <LocalizedText>Continua la lettura</LocalizedText><ArrowDown size={16} />
                        </button>
                      ) : null}
                      {!loading && failedCount > 0 && view === "notizie" ? (
                        <p className="feed-note">
                          <CircleHelp size={15} />{" "}
                          <span>{failedPublishers} <LocalizedText>fonti dirette con feed da ricontrollare</LocalizedText> · {failedRadars} <LocalizedText>ricerche radar non disponibili</LocalizedText>. <LocalizedText>Le copie già raccolte restano leggibili.</LocalizedText></span>
                          <button onClick={() => navigate("fonti")}>
                            <LocalizedText>{"Consulta le fonti"}</LocalizedText>
                          </button>
                        </p>
                      ) : null}
                    </div>

                  </div>
                )}
              </>
            ) : null}

            {view === "crediti" ? <Suspense fallback={<p role="status"><LocalizedText>Apertura dei crediti…</LocalizedText></p>}><Acknowledgements/></Suspense> : null}
            {view === "teoria" ? (
              <Suspense fallback={<p className="reader-message" role="status"><LocalizedText>Apertura della biblioteca…</LocalizedText></p>}><LibraryView query={query} setQuery={setQuery} savedBooks={savedBooks} onToggleBook={toggleBook} /></Suspense>
            ) : null}
            {view === "partecipa" ? <Suspense fallback={<p className="reader-message" role="status"><LocalizedText>Apertura della comunità…</LocalizedText></p>}><CommunityView/></Suspense> : null}
            {view === "privacy" ? <Suspense fallback={<p role="status"><LocalizedText>Apertura delle informazioni…</LocalizedText></p>}><PrivacyView/></Suspense> : null}
            {view === "metodo" ? (
              <MethodView onSources={() => navigate("fonti")} />
            ) : null}
          </section>
          {view === "notizie" ? (
            <section className="daily-quotation" aria-label="Una citazione per approfondire">
              <blockquote><LocalizedText content>{quote.text}</LocalizedText></blockquote>
              <p><strong>{quote.author}</strong> · <a href={quote.url} target="_blank" rel="noopener noreferrer"><LocalizedText>{quote.work}</LocalizedText>, {quote.year}</a></p>
              <small><LocalizedText>{quote.note}</LocalizedText> · Marxists Internet Archive</small>
            </section>
          ) : null}
        </main>
        <footer className="site-footer">
          <div className="footer-top">
            <span className="footer-brand">
              <BrandName language={readingLanguage}/>
            </span>
            <p>
              <LocalizedText>{"Per capire il mondo,"}</LocalizedText>
              <br />
              <LocalizedText>
                {"mettiamo in relazione le sue voci."}
              </LocalizedText>
            </p>
            <button className="text-link" onClick={() => navigate("metodo")}>
              <LocalizedText>{"Il progetto e il metodo "}</LocalizedText>
              <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="footer-acknowledgements"><p><LocalizedText>Grazie alle redazioni, agli archivi, agli autori, ai traduttori e alle comunità del software libero che rendono possibile questa raccolta.</LocalizedText></p><a href="/?view=crediti" onClick={event=>{event.preventDefault();navigate("crediti");}}><LocalizedText>Fonti, crediti e ringraziamenti</LocalizedText><ArrowUpRight size={14}/></a></div>
          <div className="footer-privacy"><a href="/?view=privacy" onClick={event=>{event.preventDefault();navigate("privacy");}}><LocalizedText>Privacy, cookie e diritti</LocalizedText></a><span aria-hidden="true"> · </span><a href="https://github.com/internazionalerossa/polisrossa" target="_blank" rel="noopener noreferrer"><LocalizedText>Codice sorgente</LocalizedText></a><span aria-hidden="true"> · </span><a href="https://github.com/internazionalerossa/polisrossa/blob/main/NOTICE" target="_blank" rel="noopener noreferrer"><LocalizedText>Licenza e avvisi</LocalizedText></a></div>
          <div className="footer-bottom">
            <span>
              <LocalizedText>
                {"Aggregatore socialista globale · Notizie, teoria, fonti."}
              </LocalizedText>
            </span>
            <span>
              <LocalizedText>
                {
                  "Autori e diritti restano alle rispettive fonti."
                }
              </LocalizedText>
            </span>
          </div>
        </footer>
        <dialog
          ref={readerDialog}
          className="reader-dialog"
          aria-labelledby="reader-title"
          onClose={() => setSelectedId(null)}
          onCancel={() => setSelectedId(null)}
        >
          {selectedArticle ? (
            <ArticleReader
              key={selectedArticle.id}
              article={selectedArticle}
              saved={savedIds.has(selectedArticle.id)}
              onSave={() => toggleSave(selectedArticle)}
              onClose={() => readerDialog.current?.close()}
              related={articles
                .filter(
                  (a) =>
                    a.sourceId === selectedArticle.sourceId &&
                    a.id !== selectedArticle.id,
                )
                .slice(0, 3)}
              onSelect={setSelectedId}
            />
          ) : null}
        </dialog>
      </div>
      </InitialLoadBoundary>
    </LocalizationProvider>
  );
}

function Select({
  label,
  value,
  change,
  children,
}: {
  label: string;
  value: string;
  change: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="select-field">
      <span>
        <LocalizedText>{label}</LocalizedText>
      </span>
      <select value={value} onChange={(e) => change(e.target.value)}>
        <LocalizedText>{children}</LocalizedText>
      </select>
    </label>
  );
}

const ArticleCard = memo(function ArticleCard({
  article,
  now,
  saved,
  onSelect,
  onSave,
}: {
  article: Article;
  now: number;
  saved: boolean;
  onSelect: (id: string) => void;
  onSave: (article: Article) => void;
}) {
  return (
    <article className="article-card">
      <button className="article-open" onClick={() => onSelect(article.id)}>
        <ArticleImage articleLink={article.link} sourceId={article.feedSourceId ?? article.sourceId} articleId={article.id} image={article.image} fallbacks={article.imageFallbacks} />
        <div className="article-copy">
          <div className="article-meta">
            <span>{article.sourceName}</span>
            <PublicationTime value={article.publishedAt} now={now} />
          </div>
          <h3>
            <LocalizedText priority={2} defer from={publisherFor(article).language}>
              {article.title}
            </LocalizedText>
          </h3>
          <p>
            <LocalizedText
              priority={1}
              defer
              from={article.excerpt ? publisherFor(article).language : "it"}
            >
              {article.excerpt ||
                "Questo feed non fornisce un estratto. Apri la fonte per leggere l’articolo."}
            </LocalizedText>
          </p>
        </div>
      </button>
      <a
        className="publisher-link"
        href={safeWebUrl(article.link) ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
      >
        <LocalizedText>{"Leggi e sostieni la fonte "}</LocalizedText>
        <ArrowUpRight size={14} />
      </a>
      <div className="article-bottom">
        <span>
          <LocalizedText>Fonte:</LocalizedText>{" "}<LocalizedText>{publisherFor(article).country ?? "Paese non verificato"}</LocalizedText>{" "}
          <i>
            <LocalizedText>{"·"}</LocalizedText>
          </i>
          <LocalizedText> </LocalizedText>
          <LanguageName code={publisherFor(article).language} />
        </span>
        <div>
          <button
            className={`save-button ${saved ? "is-saved" : ""}`}
            onClick={() => onSave(article)}
            aria-label={
              saved
                ? `Rimuovi dai salvati: ${article.title}`
                : `Salva articolo: ${article.title}`
            }
            aria-pressed={saved}
          >
            {saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
          </button>

        </div>
      </div>
    </article>
  );
});

function EmptyState({
  loading,
  collecting = false,
  saved,
  filtered,
  onReset,
  onExplore,
  onRetry,
}: {
  loading: boolean;
  collecting?: boolean;
  saved: boolean;
  filtered: boolean;
  onReset: () => void;
  onExplore: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        {loading ? (
          <Loader2 size={27} className="spin" />
        ) : saved ? (
          <Bookmark size={27} />
        ) : (
          <Search size={27} />
        )}
      </span>
      <p className="eyebrow">
        <LocalizedText>
          {loading
            ? "COLLEGHIAMO LE FONTI"
            : saved
              ? "IL TUO TACCUINO"
              : "UNO SGUARDO PIÙ AMPIO"}
        </LocalizedText>
      </p>
      <h3>
        <LocalizedText>
          {loading
            ? "Le prime voci stanno arrivando."
            : saved
              ? "Le letture importanti, tutte qui."
              : "Nessun articolo in questa selezione."}
        </LocalizedText>
      </h3>
      <p>
        <LocalizedText>
          {loading
            ? "Ogni fonte ha i suoi tempi. Gli articoli compariranno appena disponibili; nel frattempo puoi esplorare il catalogo e la biblioteca."
            : saved
              ? "Usa il segnalibro sulle schede per conservare titolo, estratto e link. I vecchi segnalibri saranno recuperati quando le relative notizie torneranno nei feed."
              : "Prova un altro tema, una finestra temporale più ampia oppure consulta direttamente le fonti. L’assenza di risultati non significa assenza di notizie."}
        </LocalizedText>
      </p>
      <div className="empty-actions">
        {filtered ? (
          <button className="button button-dark" onClick={onReset}>
            <LocalizedText>{"Azzera filtri "}</LocalizedText>
            <X size={14} />
          </button>
        ) : null}
        <button className="button button-outline" onClick={onExplore}>
          <LocalizedText>
            {saved ? "Esplora le notizie" : "Esplora le fonti"}
          </LocalizedText>
          <ArrowRight size={15} />
        </button>
        {!saved && !loading && !collecting ? (
          <button className="text-link" onClick={onRetry}>
            <RefreshCcw size={14} />
            <LocalizedText>{" Riprova aggiornamento"}</LocalizedText>
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SourcesDirectory({
  sources,
  onSelect,
}: {
  sources: DirectorySource[];
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(["Italia", "Europa"]),
  );
  const groups = useMemo(() => {
    const buckets = new Map<string, DirectorySource[]>();
    for (const source of sources) {
      const key = source.discovered
        ? "Fonti emerse dai radar"
        : source.kind === "radar"
          ? "Radar di ricerca"
          : source.region;
      const bucket = buckets.get(key) ?? [];
      bucket.push(source);
      buckets.set(key, bucket);
    }
    return [...buckets.entries()].sort(([a], [b]) => {
      const order = [
        ...REGION_ORDER,
        "Fonti emerse dai radar",
        "Radar di ricerca",
      ] as string[];
      return order.indexOf(a) - order.indexOf(b);
    });
  }, [sources]);
  const groupNames = groups.map(([name]) => name).join("|");
  useEffect(() => {
    const names = groupNames.split("|").filter(Boolean);
    if (names.length === 1)
      setExpanded((previous) => new Set([...previous, names[0]]));
  }, [groupNames]);
  return (
    <div className="source-atlas">
      <div className="directory-intro">
        <p>
          <LocalizedText>
            Tutta la rete è inclusa nella raccolta automatica. Apri un’area per
            esplorare le testate; i radar di ricerca e le fonti da essi scoperte
            rimangono distinti dagli editori del catalogo.
          </LocalizedText>
        </p>
        <span>
          <LocalizedText>
            Le etichette descrivono il catalogo, non certificano
            l’attendibilità.
          </LocalizedText>
        </span>
      </div>
      <div className="atlas-overview">
        {groups.map(([name, items]) => (
          <a
            href={`#atlas-${name.replace(/\s/g, "-")}`}
            key={name}
            onClick={() =>
              setExpanded((previous) => new Set([...previous, name]))
            }
          >
            <strong>{items.length}</strong>
            <LocalizedText>{name}</LocalizedText>
          </a>
        ))}
      </div>
      {groups.map(([name, items]) => {
        const open = expanded.has(name);
        return (
          <details
            className="atlas-group"
            key={name}
            id={`atlas-${name.replace(/\s/g, "-")}`}
            open={open}
            onToggle={(event) => {
              const nextOpen = event.currentTarget.open;
              setExpanded((previous) => {
                if (previous.has(name) === nextOpen) return previous;
                const next = new Set(previous);
                if (nextOpen) next.add(name);
                else next.delete(name);
                return next;
              });
            }}
          >
            <summary>
              <span>
                <LocalizedText>{name}</LocalizedText>
              </span>
              <span>
                {items.length}{" "}
                <LocalizedText>
                  {name === "Radar di ricerca" ? "canali" : "fonti"}
                </LocalizedText>
              </span>
            </summary>
            {open ? (
              <div className="atlas-rows">
                {items.map((source) => (
                  <article className="atlas-row" key={source.id}>
                    <div>
                      <h3>
                        {source.kind === "radar" ? (
                          <LocalizedText>{source.name}</LocalizedText>
                        ) : (
                          source.name
                        )}
                      </h3>
                      <p>
                        <LocalizedText>{source.country}</LocalizedText> ·{" "}
                        <LanguageName code={source.language} /> ·{" "}
                        <LocalizedText>
                          {source.tags.includes("archivio")
                            ? "Archivio"
                            : source.kind}
                        </LocalizedText>
                      </p>
                    </div>
                    <span
                      className={`atlas-status ${source.status?.ok || source.count ? "available" : ""}`}
                    >
                      {source.count ? (
                        <>
                          {source.count} <LocalizedText>articoli</LocalizedText>
                        </>
                      ) : (
                        <LocalizedText>
                          {source.status?.ok
                            ? "Feed disponibile"
                            : source.status
                              ? "Fonte non disponibile"
                              : "In raccolta"}
                        </LocalizedText>
                      )}
                    </span>
                    <div className="atlas-actions">
                      <button
                        className="text-link"
                        onClick={() => onSelect(source.id)}
                      >
                        <LocalizedText>Articoli</LocalizedText>
                        <ArrowRight size={14} />
                      </button>
                      <a
                        href={safeWebUrl(source.homepage) ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Apri ${source.name}`}
                      >
                        <ExternalLink size={17} />
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </details>
        );
      })}
      {!sources.length ? (
        <p className="notice">
          <LocalizedText>
            Nessuna fonte corrisponde alla selezione. Cambia lingua delle fonti
            o azzera la ricerca.
          </LocalizedText>
        </p>
      ) : null}
    </div>
  );
}

function MethodView({ onSources }: { onSources: () => void }) {
  return (
    <div className="method-view">
      <div className="method-intro">
        <p className="eyebrow">
          <LocalizedText content>{"DALLE FONTI ALLE DOMANDE"}</LocalizedText>
        </p>
        <h2>
          <LocalizedText>{"Informazione, studio e strumenti comuni."}</LocalizedText>
          <br />
          <em>
            <LocalizedText>{"Fonti riconoscibili, metodo trasparente."}</LocalizedText>
          </em>
        </h2>
        <p>
          <LocalizedText content>
            {
              "Mettiamo vicine prospettive che spesso restano lontane: il lavoro e la geopolitica, l’attualità e la teoria, le voci locali e le relazioni globali. La selezione ha un orientamento esplicito. Non pretende di rappresentare tutte le posizioni né di sostituire il confronto con le fonti."
            }
          </LocalizedText>
        </p>
      </div>
      <div className="method-grid">
        {[
          {
            n: "01",
            title: "Da dove arrivano le notizie",
            text: "Un catalogo di fonti e canali radar alimenta la raccolta tramite feed RSS e Atom. Per i canali YouTube configurati, leggiamo anche i titoli pubblici nella pagina dei video quando il feed non è utilizzabile. Un feed è un elenco aggiornabile di articoli; RSS e Atom sono formati con cui gli editori lo rendono leggibile alle applicazioni. I radar cercano contenuti per tema, ma ammettono soltanto editori approvati dalla politica delle fonti. Una parola chiave nel titolo non basta a rendere una pubblicazione coerente con il progetto.",
          },
          {
            n: "02",
            title: "Come sono organizzate",
            text: "La rassegna offre due ordini: alternanza fra paesi e testate, oppure pubblicazione più recente. Il periodo limita la data di pubblicazione, non quella di raccolta. Area e paese si riferiscono alla testata; la fonte comprende anche i suoi articoli trovati dai radar. Il tema viene riconosciuto nel titolo, nell’estratto e nelle categorie dell’articolo, senza attribuire a ogni testo tutti i temi generali del suo editore. Il riconoscimento resta automatico e può sbagliare: non è una certificazione politica o di verità. I filtri si combinano fra loro e le finestre recenti escludono date mancanti, non valide o future.",
          },
          {
            n: "03",
            title: "Cosa puoi leggere qui",
            text: "La scheda aiuta a decidere che cosa leggere: presenta il titolo, la provenienza e l’estratto disponibile, quando l’editore lo fornisce. Un estratto non è l’articolo completo e può omettere passaggi importanti del ragionamento. Il collegamento originale permette di leggere il contesto, conoscere l’autore e sostenere la pubblicazione. Alcuni editori limitano testi o anteprime; in questi casi la scheda mantiene il rimando alla fonte.",
          },
          {
            n: "04",
            title: "Traduzioni e servizi esterni",
            text: "La lingua di lettura segue il browser ed è modificabile. Interfaccia, citazioni, titoli ed estratti possono essere tradotti attraverso Google Translate e MyMemory. Il testo viene inviato al servizio utilizzato: le traduzioni automatiche possono contenere errori. Se la traduzione non riesce, resta disponibile l’originale. Il filtro della lingua delle fonti è distinto dalla lingua di lettura. Immagini e anteprime possono comportare richieste ai siti degli editori.",
          },
          {
            n: "05",
            title: "Il tuo taccuino resta tuo",
            text: "Con un account, articoli e libri salvati vengono conservati in un archivio personale sul server. Per i libri letti online viene registrata anche l’ultima posizione di lettura, così puoi riprendere su un altro dispositivo. Senza accesso i salvataggi restano nel browser e possono andare persi cancellandone i dati. La cache temporanea delle notizie serve a velocizzare il caricamento ed è separata dalla raccolta personale.",
          },
          {
            n: "06",
            title: "Disponibilità, attribuzione, limiti",
            text: "Le pubblicazioni esterne possono modificare un indirizzo, limitare gli accessi o rendere disponibili dati incompleti. La raccolta distingue quindi un contenuto ricevuto da una fonte momentaneamente irraggiungibile; le copie temporanee aiutano la consultazione, ma non garantiscono che ogni collegamento sia sempre disponibile. Testi, immagini e marchi mantengono i rispettivi diritti. Ringraziare e citare una fonte non significa che questa abbia approvato o sostenga il progetto.",
          },
        ].map((item) => (
          <article key={item.n}>
            <span>
              <LocalizedText>{item.n}</LocalizedText>
            </span>
            <h3>
              <LocalizedText>{item.title}</LocalizedText>
            </h3>
            <p>
              <LocalizedText content>{item.text}</LocalizedText>
            </p>
          </article>
        ))}
      </div>
      <div className="method-outro">
        <Globe2 size={34} strokeWidth={1} />
        <div>
          <h3>
            <LocalizedText>{"Parti dalle voci."}</LocalizedText>
          </h3>
          <p>
            <LocalizedText content>
              {"Scopri chi pubblica, da dove scrive e con quale prospettiva."}
            </LocalizedText>
          </p>
        </div>
        <button className="button button-dark" onClick={onSources}>
          <LocalizedText>{"Esplora le fonti "}</LocalizedText>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function ArticleReader({
  article,
  saved,
  onSave,
  onClose,
  related,
  onSelect,
}: {
  article: Article;
  saved: boolean;
  onSave: () => void;
  onClose: () => void;
  related: Article[];
  onSelect: (id: string) => void;
}) {
  const readingLanguage = useReadingLocale();
  const [embed, setEmbed] = useState(false);
  return (
    <div className="article-reader">
      <div className="reader-top">
        <span className="eyebrow">
          <LocalizedText>{"LA SCHEDA / PolisRossa"}</LocalizedText>
        </span>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Chiudi lettura"
          autoFocus
        >
          <X size={21} />
        </button>
      </div>
      <div className="reader-content"><LanguageSettings/>
        <div className="reader-meta">
          <span>{article.sourceName}</span>
          <span>
            <LocalizedText>Fonte:</LocalizedText>{" "}<LocalizedText>{publisherFor(article).country ?? "Paese non verificato"}</LocalizedText>
          </span>
          <PublicationTime value={article.publishedAt} />
        </div>
        <h2 id="reader-title">
          <LocalizedText priority={2} defer from={publisherFor(article).language}>
            {article.title}
          </LocalizedText>
        </h2>
        <p className="reader-byline">
          {article.author ? `${article.author} · ` : ""}
          <LanguageName code={publisherFor(article).language} />
        </p>
        <p className="reader-excerpt">
          <LocalizedText
            priority={1}
            defer
            from={article.excerpt ? publisherFor(article).language : "it"}
          >
            {article.excerpt ||
              "La fonte non fornisce un estratto. Leggi il testo completo sul sito dell’editore."}
          </LocalizedText>
        </p>
        <div className="reader-actions">
          <a
            href={safeWebUrl(article.link) ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="button button-dark"
              >
            <LocalizedText>{"Leggi sulla fonte "}</LocalizedText>
            <ArrowUpRight size={16} />
          </a>
          <button
            className={`button button-outline ${saved ? "is-saved" : ""}`}
            onClick={onSave}
            aria-pressed={saved}
          >
            {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            <LocalizedText>{saved ? "Salvato" : "Salva lettura"}</LocalizedText>
          </button>
        </div>
        <div className="reader-translation">
          <strong>
            <LocalizedText>{"Leggi e sostieni la fonte"}</LocalizedText>
          </strong>
          <p>
            <LocalizedText>
              {
                "Qui trovi titolo ed estratto tradotti automaticamente. Apri l’originale per il testo completo, il contesto e per sostenere il lavoro della redazione."
              }
            </LocalizedText>
          </p>
          <a
            href={`https://translate.google.com/translate?sl=${encodeURIComponent(publisherFor(article).language)}&tl=${encodeURIComponent(readingLanguage)}&u=${encodeURIComponent(safeWebUrl(article.link) ?? "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-link"
              >
            <LocalizedText>
              {"Apri la pagina con Google Translate "}
            </LocalizedText>
            <ArrowUpRight size={14} />
          </a>
        </div>
        <details className="reader-embed">
          <summary>
            <LocalizedText>{"Anteprima del sito originale "}</LocalizedText>
            <ChevronDown size={16} />
          </summary>
          <p>
            <LocalizedText>
              {
                "Caricando l’anteprima contatti il sito della fonte. Alcuni editori bloccano l’incorporamento: in quel caso usa “Leggi sulla fonte”."
              }
            </LocalizedText>
          </p>
          {embed ? (
            <iframe
              title={`Anteprima: ${article.title}`}
              src={safeWebUrl(article.link) ?? undefined}
              sandbox="allow-scripts allow-popups allow-forms"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          ) : (
            <button
              className="button button-outline"
              onClick={() => setEmbed(true)}
            >
              <LocalizedText>{"Carica anteprima esterna "}</LocalizedText>
              <ExternalLink size={15} />
            </button>
          )}
        </details>
        {related.length ? (
          <section className="reader-related">
            <p className="eyebrow">
              <LocalizedText>{"DALLA STESSA FONTE"}</LocalizedText>
            </p>
            {related.map((a) => (
              <button key={a.id} onClick={() => onSelect(a.id)}>
                <span>
                  <LocalizedText priority={2} from={a.language}>
                    {a.title}
                  </LocalizedText>
                </span>
                <ArrowUpRight size={17} />
              </button>
            ))}
          </section>
        ) : null}
        <p className="reader-attribution">
          <LocalizedText>
            {"Titolo ed estratto sono attribuiti a "}
          </LocalizedText>
          {article.sourceName}
          <LocalizedText>
            {
              ". La fonte originale rimane il riferimento per contenuto completo, aggiornamenti e correzioni."
            }
          </LocalizedText>
        </p>
      </div>
    </div>
  );
}

function PublicationTime({ value, now = Date.now() }: { value: string | null; now?: number }) {
  const locale = useLocale();
  if (!value || !Number.isFinite(Date.parse(value))) return <span><LocalizedText>Data non indicata</LocalizedText></span>;
  return <time dateTime={value} title={new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(Date.parse(value))}>{relativeTime(value, locale, now)}</time>;
}

function relativeTime(iso: string, locale: string, now: number) {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return "Data non indicata";
  const seconds = Math.round((time - now) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, amount] of [
    ["year", 31536e3],
    ["month", 2592e3],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ] as [Intl.RelativeTimeFormatUnit, number][])
    if (Math.abs(seconds) >= amount)
      return formatter.format(Math.round(seconds / amount), unit);
  return formatter.format(0, "second");
}
