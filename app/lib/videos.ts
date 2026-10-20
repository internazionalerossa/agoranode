import { videoChannel } from "../data/video-catalog.ts";
export type VideoItem = { id: string; channel: string; title: string; url: string; image: string | null; publishedAt: string | null; viewCount?: number };
export function validateVideos(raw: unknown): VideoItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw.flatMap(item => {
    if (!item || typeof item.id !== "string" || typeof item.channel !== "string" || typeof item.title !== "string" || !item.title.trim() || item.title.length > 600) return [];
    const channel = videoChannel(item.channel);
    if (!channel) return [];
    try {
      const url = new URL(item.url), home = new URL(channel.url);
      if (url.protocol !== "https:" || url.username || url.password) return [];
      if (channel.platform === "youtube" ? !/^[\w-]{11}$/.test(item.id) || url.hostname !== "www.youtube.com" || url.pathname !== "/watch" || url.searchParams.get("v") !== item.id : url.hostname !== home.hostname || !/^[\da-f-]{36}$/.test(item.id) || url.pathname !== `/videos/watch/${item.id}`) return [];
      if (seen.has(url.href)) return []; seen.add(url.href);
      let image: string | null = null;
      if (typeof item.image === "string") {
        const photo = new URL(item.image);
        if (photo.protocol === "https:" && !photo.username && !photo.password && (channel.platform === "youtube" ? /(^|\.)ytimg\.com$/.test(photo.hostname) : photo.hostname === home.hostname)) image = photo.href;
      }
      const time = typeof item.publishedAt === "string" && /(?:T|\s)\d{1,2}:\d{2}/.test(item.publishedAt) ? Date.parse(item.publishedAt) : NaN;
      const views = Number.isSafeInteger(item.viewCount) && item.viewCount >= 0 ? { viewCount: item.viewCount as number } : {};
      return [{ id: item.id, channel: item.channel, title: item.title.trim(), url: url.href, image, publishedAt: Number.isFinite(time) ? item.publishedAt : null, ...views }];
    } catch { return []; }
  });
}
/** One recent video per channel first; visitor country, then language, change priority without filtering. */
export function rankVideos(videos: VideoItem[], language: string, country: string | null = null): VideoItem[] {
  const sorted = [...videos].sort((a,b) => Number(Boolean(country)&&videoChannel(b.channel)?.country === country) - Number(Boolean(country)&&videoChannel(a.channel)?.country === country) || Number(videoChannel(b.channel)?.language === language) - Number(videoChannel(a.channel)?.language === language) || (Date.parse(b.publishedAt ?? "") || 0) - (Date.parse(a.publishedAt ?? "") || 0));
  const diversify=(group:VideoItem[])=>{
    const seen=new Set<string>(),opening:VideoItem[]=[],remaining:VideoItem[]=[];
    for(const video of group){if(seen.has(video.channel))remaining.push(video);else{seen.add(video.channel);opening.push(video);}}
    return [...opening,...remaining];
  };
  return country?[...diversify(sorted.filter(video=>videoChannel(video.channel)?.country===country)),...diversify(sorted.filter(video=>videoChannel(video.channel)?.country!==country))]:diversify(sorted);
}

export type VideoFilters={language:string;country:string;topic:string;search:string};
export function matchesVideoChannel(channel:import('../data/video-catalog.ts').VideoChannel,filters:VideoFilters):boolean{
 const query=filters.search.normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase().trim();
 const haystack=[channel.name,channel.country,...channel.topics].join(' ').normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase();
 return (filters.language==='all'||channel.language===filters.language)&&(filters.country==='all'||channel.country===filters.country)&&(filters.topic==='all'||channel.topics.includes(filters.topic))&&(!query||query.split(/\s+/).every(term=>haystack.includes(term)));
}

/** Merge a completed collection once, preserving known photos and counts when feeds omit them. */
export function mergeVideoUpdates(previous:VideoItem[],updates:VideoItem[]):VideoItem[]{
 const known=new Map(previous.map(video=>[video.url,video]));
 for(const video of updates){const old=known.get(video.url);known.set(video.url,{...old,...video,image:video.image??old?.image??null,...(video.viewCount===undefined&&old?.viewCount!==undefined?{viewCount:old.viewCount}:{})});}
 return [...known.values()].slice(-1500);
}
