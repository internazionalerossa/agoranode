"use client";
import { memo, useEffect, useRef, useState } from "react";
import { SOURCE_CATALOG } from "@/app/data/catalog";
import { createPhotoLoader } from "@/app/lib/photo-loader";
import { usePagePreparation } from "./InitialLoadBoundary";

const nativeSources = new Set(SOURCE_CATALOG.map(source => source.id));
// Separate queues let recovery proceed while a publisher's downloads are stalled.
const recoverOnce = createPhotoLoader(() => new Image(), 4);
const recover = async (url: string) => {
  const result = await recoverOnce(url);
  if (result) return result;
  await new Promise(resolve => setTimeout(resolve, 700));
  return recoverOnce(url);
};

export const ArticleImage = memo(function ArticleImage({ image, fallbacks, sourceId, articleId, articleLink }: {
  image: string | null; fallbacks?: string[]; sourceId: string; articleId: string; articleLink: string;
}) {
  const { preparing, begin } = usePagePreparation();
  const frame = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!frame.current || typeof IntersectionObserver === "undefined") { setNear(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setNear(true); observer.disconnect(); }
    }, { rootMargin: "1800px" });
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);
  const active = preparing || near;
  const proxy = (nativeSources.has(sourceId) || sourceId.startsWith("radar:")) ? `/api/article-image?${new URLSearchParams({ sourceId, articleId, articleLink })}` : null;
  useEffect(() => {
    if (!active) return;
    let alive = true;
    const end = begin();
    // Bound only the opening screen; a late successful download can still be used.
    const deadline = setTimeout(end, 12000);
    // Only our validated image endpoint contacts publishers. No visitor cookies,
    // IP address or referring page are forwarded to the source's image host.
    void (proxy ? recover(proxy) : Promise.resolve(null)).then(url => {
      if (alive && url) setSrc(url);
      clearTimeout(deadline); end();
    });
    return () => { alive = false; clearTimeout(deadline); end(); };
  }, [active, proxy, begin]);
  return <div ref={frame} className={`article-image ${!src ? "image-unavailable" : ""}`}>
    {src ? <img src={src} alt="" width={640} height={360} loading="eager" decoding="async" referrerPolicy="no-referrer" /> : null}
  </div>;
});
