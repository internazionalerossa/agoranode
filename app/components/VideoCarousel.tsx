"use client";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ExternalLink, Eye, Play } from "lucide-react";
import { VIDEO_CHANNELS, videoChannel } from "@/app/data/video-catalog";
import SNAPSHOT from "@/app/data/video-snapshot.json" with { type: "json" };
import LANGUAGES from "@/app/data/languages.json";
import { rankVideos, validateVideos, matchesVideoChannel, mergeVideoUpdates, type VideoItem, type VideoFilters } from "@/app/lib/videos";
import { LocalizedText as T, useLocale } from "./Localization";
import {COLLECTION_CONCURRENCY} from "@/app/lib/collection";
import {browserVideoCountry} from "@/app/lib/visitor-country";
const CACHE_KEY = "rassegna-rossa.video-cache";
const MAX_AGE = 86400000;
export const VideoCarousel = memo(function VideoCarousel() {
  const locale = useLocale();
  const [filters,setFilters]=useState<VideoFilters>({language:'all',country:'all',topic:'all',search:''});
  const currentFilters=useRef(filters);currentFilters.current=filters;
  const [visibleCount,setVisibleCount]=useState(18),[directoryOpen,setDirectoryOpen]=useState(false),[filtersOpen,setFiltersOpen]=useState(false);
  const [country,setCountry]=useState<string|null>(null),[ready,setReady]=useState(false);
  const preferredCountry=useRef(country);preferredCountry.current=country;
  const matchingChannels=useMemo(()=>VIDEO_CHANNELS.filter(channel=>matchesVideoChannel(channel,filters)),[filters]);
  const matchingIds=useMemo(()=>new Set(matchingChannels.map(channel=>channel.id)),[matchingChannels]);
  const languages=[...new Set(VIDEO_CHANNELS.map(channel=>channel.language))].sort();
  const countries=[...new Set(VIDEO_CHANNELS.map(channel=>channel.country))].sort();
  const topics=[...new Set(VIDEO_CHANNELS.flatMap(channel=>channel.topics))].sort();
  const updateFilter=(key:keyof VideoFilters,value:string)=>{setFilters(old=>({...old,[key]:value}));setVisibleCount(18);track.current?.scrollTo({left:0});};
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [edges, setEdges] = useState({ start: true, end: false });
  const track = useRef<HTMLDivElement>(null);
  const preferred = useRef(locale); preferred.current = locale;
  const ordered = useMemo(() => rankVideos(videos.filter(video=>matchingIds.has(video.channel)), locale,country), [videos, locale,country,matchingIds]);
  useEffect(() => {
    const controller = new AbortController(); let active = true, running = false;
    let initial = Date.now()-SNAPSHOT.fetchedAt<MAX_AGE?validateVideos(SNAPSHOT.videos):[];
    try {
      const cached=JSON.parse(localStorage.getItem(CACHE_KEY)??"null");
      if(cached?.savedAt>SNAPSHOT.fetchedAt&&cached.savedAt>Date.now()-MAX_AGE&&cached.savedAt<=Date.now()){
        const restored=validateVideos(cached.videos);if(restored.length)initial=restored;
      }
    }catch{/* Public cache is optional. */}
    const initialize=async()=>{
      let visitorCountry=browserVideoCountry(navigator.languages);
      try{
        const response=await fetch('/api/visitor-country',{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(1200)])});
        if(response.ok){const data=await response.json();if(typeof data.country==='string'&&VIDEO_CHANNELS.some(channel=>channel.country===data.country))visitorCountry=data.country;}
      }catch{/* Unknown location never blocks international videos. */}
      if(active){preferredCountry.current=visitorCountry;setCountry(visitorCountry);setVideos(initial);setReady(true);void refresh();}
    };
    const refresh = async () => {
      if (running || document.visibilityState !== "visible") return;
      running = true; const updates:VideoItem[]=[];
      const channels = [...VIDEO_CHANNELS];
      const worker = async () => {
        while (channels.length && active) {
          channels.sort((a,b)=>Number(matchesVideoChannel(b,currentFilters.current))-Number(matchesVideoChannel(a,currentFilters.current))||Number(b.country===preferredCountry.current)-Number(a.country===preferredCountry.current)||Number(b.language===preferred.current)-Number(a.language===preferred.current));
          const channel = channels.shift()!;
          try {
            const response = await fetch(`/api/videos?channel=${encodeURIComponent(channel.id)}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]) });
            const data = await response.json();
            if (!response.ok) throw Error("Video source unavailable");
            const clips = validateVideos(data.videos).filter(video => video.channel === channel.id);
            updates.push(...clips);
          } catch { /* Keep previously recovered videos. */ }
        }
      };
      await Promise.all(Array.from({length:COLLECTION_CONCURRENCY.videos},()=>worker()));
      running = false;
      if (active) { if(updates.length)setVideos(previous=>mergeVideoUpdates(previous,updates)); }
    };
    void initialize();
    const timer = setInterval(() => void refresh(), 300000);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { active = false; controller.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, []);
  useEffect(() => {
    if (!videos.length) return;
    const timer = setTimeout(() => {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), videos })); } catch { /* Never evict bookmarks for video thumbnails. */ }
    }, 1000);
    return () => clearTimeout(timer);
  }, [videos]);
  const measure = useCallback(() => {
    const el = track.current; if (!el) return;
    if(ordered.length&&el.scrollLeft+el.clientWidth>=el.scrollWidth-900)setVisibleCount(count=>Math.min(count+18,ordered.length));
    const next = { start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 };
    setEdges(previous => previous.start === next.start && previous.end === next.end ? previous : next);
  }, [ordered.length]);
  useEffect(() => {
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (track.current) observer?.observe(track.current);
    return () => observer?.disconnect();
  }, [ordered.length,visibleCount, measure]);
  const move = (direction: number) => {
    const el = track.current;
    el?.scrollBy({ left: direction * el.clientWidth * .85, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  return <section className="video-carousel" aria-label="Ultimi video dai canali internazionali" aria-busy={!ready} data-defer-preparation>
    <div className="video-carousel-heading">
      <div><h2><T>Video dal mondo</T></h2></div>
      <div className="video-carousel-actions"><button type="button" className="video-filter-toggle" aria-expanded={filtersOpen} aria-controls="video-filter-panel" onClick={()=>setFiltersOpen(open=>!open)}><span className="video-filter-label"><T>Filtri e canali</T></span><span className="video-filter-short"><T>Filtri</T></span><span>{VIDEO_CHANNELS.length}</span></button><button type="button" aria-label="Video precedenti" onClick={() => move(-1)} disabled={edges.start}><ArrowLeft size={17}/></button><button type="button" aria-label="Video successivi" onClick={() => move(1)} disabled={edges.end}><ArrowRight size={17}/></button></div>
    </div>
    <div className="video-filters" id="video-filter-panel" hidden={!filtersOpen}><div>
      <label><T>Lingua dei video</T><select value={filters.language} onChange={event=>updateFilter('language',event.target.value)}><option value="all"><T>Tutte le lingue</T></option>{languages.map(code=><option key={code} value={code}>{(LANGUAGES as Record<string,string>)[code]??code.toUpperCase()}</option>)}</select></label>
      <label><T>Paese del canale</T><select value={filters.country} onChange={event=>updateFilter('country',event.target.value)}><option value="all"><T>Tutti i paesi</T></option>{countries.map(country=><option key={country} value={country}><T>{country}</T></option>)}</select></label>
      <label><T>Ambito dei canali</T><select value={filters.topic} onChange={event=>updateFilter('topic',event.target.value)}><option value="all"><T>Tutti gli ambiti</T></option>{topics.map(topic=><option key={topic} value={topic}><T>{topic}</T></option>)}</select></label>
      <label><T>Cerca un canale</T><input value={filters.search} onChange={event=>updateFilter('search',event.target.value)} type="search" maxLength={100}/></label>
      <button type="button" className="text-link" onClick={()=>{setFilters({language:'all',country:'all',topic:'all',search:''});setVisibleCount(18);}}><T>Azzera i filtri</T></button>
    </div><p><T>Il paese del visitatore dà precedenza ai canali locali, senza escludere gli altri. Puoi scegliere un paese diverso o una lingua originale con questi filtri.</T></p>
    <details className="video-channel-directory" onToggle={event=>setDirectoryOpen(event.currentTarget.open)}><summary><T>Esplora i canali</T> · {matchingChannels.length}</summary>{directoryOpen&&<div>{matchingChannels.map(channel => <a href={channel.url} key={channel.id} target="_blank" rel="noopener noreferrer">{channel.name}<span><T>{channel.country}</T> · {channel.language.toUpperCase()}</span><ExternalLink size={12}/></a>)}</div>}</details>
    </div>
    <div className="video-track" dir="ltr" ref={track} onScroll={measure} tabIndex={0} aria-label="Scorri i video">
      {ordered.length ? ordered.slice(0,visibleCount).map((video,index) => {
        const channel = videoChannel(video.channel)!;
        return <article className="video-card" key={video.id} dir={["ar","fa","he","ur"].includes(locale) ? "rtl" : "ltr"}>
          <a className="video-watch-link" href={video.url} target="_blank" rel="noopener noreferrer">
            <div className="video-thumbnail">
              <VideoThumbnail video={video} eager={index<8}/>
              <span className="video-play" aria-hidden="true"><Play size={20} fill="currentColor"/></span><span className="video-platform">{channel.platform === "youtube" ? "YouTube" : "PeerTube"}</span>
            </div>
            <h3 dir="auto"><T from={channel.language} defer>{video.title}</T></h3>
          </a>
          <div className="video-card-meta"><a href={channel.url} target="_blank" rel="noopener noreferrer">{channel.name}</a><span><T>{channel.country}</T></span></div>
          <div className="video-publication">{video.publishedAt&&<time dateTime={video.publishedAt} title={new Intl.DateTimeFormat(locale, { dateStyle:"full", timeStyle:"long" }).format(new Date(video.publishedAt))}>{new Intl.DateTimeFormat(locale, { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }).format(new Date(video.publishedAt))}</time>}
          {video.viewCount!==undefined&&<span className="video-views" title={new Intl.NumberFormat(locale).format(video.viewCount)}><Eye size={12} aria-hidden="true"/>{new Intl.NumberFormat(locale,{notation:'compact',maximumFractionDigits:1}).format(video.viewCount)}<span className="sr-only"><T>visualizzazioni</T></span></span>}</div>
        </article>;
      }) : !ready ? Array.from({length:6},(_,index)=><div className="video-card video-skeleton" key={index} aria-hidden="true"><div className="video-thumbnail"/><div className="video-skeleton-title"/></div>) : matchingChannels.slice(0,6).map(channel => <a className="video-channel-placeholder" key={channel.id} href={channel.url} target="_blank" rel="noopener noreferrer"><Play size={24}/><strong>{channel.name}</strong><span><T>Apri gli ultimi video sul canale</T><ExternalLink size={13}/></span></a>)}
    </div>
    {!matchingChannels.length&&<p className="video-availability"><T>Nessun canale corrisponde a questi filtri. Prova un’altra selezione.</T></p>}
  </section>;
});

const VideoThumbnail=memo(function VideoThumbnail({video,eager}:{video:VideoItem;eager:boolean}){
 const youtube=videoChannel(video.channel)?.platform==='youtube';
 const source=youtube?`https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`:video.image;
 const [failed,setFailed]=useState<string|null>(null);
 const fallback=youtube?`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`:null;
 const src=failed===source?fallback:source;
 if(!src||(failed!==null&&failed===fallback))return null;
 return <img src={src} alt="" width={320} height={180} loading={eager?'eager':'lazy'} decoding="async" fetchPriority={eager?'high':'low'} referrerPolicy="no-referrer" onError={()=>setFailed(src)}/>;
});
