"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { mergeArticles, validateArticles, type ReadingArticle } from "@/app/lib/reading";

const AREAS = ["europe", "north", "latin", "africa", "asia", "east", "mena", "pacific"];
const CACHE = "rassegna-rossa.pulse-cache";
/** Regional discovery feeds join the same collection and filters as every other source. */
export function useRegionalNews(enabled: boolean) {
  const [articles, setArticles] = useState<ReadingArticle[]>([]);
  const [failed, setFailed] = useState(0);
  const refreshRef = useRef<() => void>(() => {});
  const refresh = useCallback(() => refreshRef.current(), []);
  useEffect(() => {
    if (!enabled) return;
    let current: ReadingArticle[] = [];
    let busy = false;
    const controller = new AbortController();
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE) ?? "null");
      if (cached?.savedAt <= Date.now() && cached.savedAt > Date.now() - 600_000) {
        current = validateArticles(cached.articles);
        setArticles(current);
      }
    } catch { /* Public cache is optional; private collections are never evicted. */ }
    const refresh = async () => {
      if (busy || controller.signal.aborted) return;
      busy = true;
      let cursor = 0, errors = 0;
      const worker = async () => {
        while (cursor < AREAS.length && !controller.signal.aborted) {
          const area = AREAS[cursor++];
          try {
            const response = await fetch(`/api/pulse?area=${area}`, {
              signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]),
            });
            if (!response.ok) throw new Error("Regional feed unavailable");
            const data = await response.json();
            const incoming = validateArticles(data.articles);
            if (!data.ok) errors++;
            if (!controller.signal.aborted) {
              const now = Date.now();
              current = mergeArticles(current, incoming).filter(article => {
                const date = Date.parse(article.publishedAt ?? "");
                return date <= now && date >= now - 21_600_000;
              });
              setArticles(current);
            }
          } catch { errors++; }
        }
      };
      await Promise.all([worker(), worker(), worker()]);
      busy = false;
      if (controller.signal.aborted) return;
      setFailed(errors);
      try { localStorage.setItem(CACHE, JSON.stringify({ savedAt: Date.now(), articles: current.slice(0, 480) })); }
      catch { /* A full cache must not affect reading or private saves. */ }
    };
    refreshRef.current = () => { void refresh(); };
    void refresh();
    const timer = setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 300_000);
    return () => { refreshRef.current = () => {}; controller.abort(); clearInterval(timer); };
  }, [enabled]);
  return { articles, failed, refresh };
}
