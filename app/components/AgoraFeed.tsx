"use client";
import {useEffect,useMemo,useState} from 'react';
import type {ArticleRecord} from '../lib/feed';
import {AGORA_SOURCES,AGORA_VIDEO_ARCHIVE,AGORA_LIVE_DESTINATION} from '../instances/agora-sources';
import {FeedPreferenceControls,useNodeFeedPreferences} from './FeedPreferenceControls';
import {selectPreferredArticles} from '../lib/node-feed-preferences';

type FeedResponse={spaceId:string;articles:ArticleRecord[];sourceCount:number;statuses:{sourceId:string;ok:boolean}[]};
const safeLink=(raw:string):string|null=>{
  try{const url=new URL(raw);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}
};
function ArticleList({items}:{items:ArticleRecord[]}){
  if(items.length===0)return <p className="node-feed-empty">Non risultano contenuti recenti per questa selezione. Prova tutte le fonti o visita gli editori originali.</p>;
  return <div className="agora-feed-cards">{items.map(item=>{
    const href=safeLink(item.link);
    return <article key={item.id+'-'+item.sourceId} className="agora-feed-card">
      <p className="eyebrow">{item.kind==='video'?'Video':'Notizia'} · {item.sourceName} · {item.country}</p>
      <h3>{href?<a href={href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{item.title}</a>:item.title}</h3>
      {item.excerpt?<p>{item.excerpt.slice(0,420)}</p>:null}
      <small>{item.publishedAt?new Intl.DateTimeFormat('it-IT',{dateStyle:'medium',timeStyle:'short'}).format(new Date(item.publishedAt)):'Data non specificata dalla fonte'}</small>
    </article>;
  })}</div>;
}
export default function AgoraFeed(){
  const prefs=useNodeFeedPreferences('agora',AGORA_SOURCES);
  const [articles,setArticles]=useState<ArticleRecord[]>([]);
  const [loading,setLoading]=useState(true);
  const [failed,setFailed]=useState(false);
  const [retry,setRetry]=useState(0);
  const ids=[...prefs.sourceIds].sort().join(',');
  useEffect(()=>{
    if(!prefs.ready)return;
    const controller=new AbortController();
    const requested=prefs.mode==='favourites'?[...prefs.sourceIds]:AGORA_SOURCES.map(x=>x.id);
    if(requested.length===0){setArticles([]);setLoading(false);return;}
    setLoading(true);setFailed(false);
    void fetch('/api/spaces/agora/feed?'+new URLSearchParams({sourceIds:requested.join(',')}),{
      signal:controller.signal,cache:'no-store',
    }).then(async response=>{
      if(!response.ok)throw Error('Feed unavailable');
      return response.json() as Promise<FeedResponse>;
    }).then(data=>{if(!controller.signal.aborted)setArticles(Array.isArray(data.articles)?data.articles:[]);})
      .catch(()=>{if(!controller.signal.aborted){setFailed(true);setArticles([]);}})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[prefs.ready,prefs.mode,ids,retry]);
  const visible=useMemo(()=>selectPreferredArticles(articles,prefs.mode,prefs.sourceIds),[articles,prefs.mode,ids]);
  const news=visible.filter(item=>item.kind!=='video');
  const videos=visible.filter(item=>item.kind==='video');
  return <section className="agora-current-news" aria-labelledby="agora-news-title">
    <header className="agora-feed-intro">
      <p className="eyebrow">NEWS · VIDEO · TECNOLOGIA APERTA</p>
      <h2 id="agora-news-title">Cosa succede nel software libero e nelle infrastrutture</h2>
      <p>Notizie aggiornate dalle fonti originali, video e registrazioni tecniche. Gli articoli si aprono dagli editori: Agorà non li ripubblica integralmente.</p>
    </header>
    <FeedPreferenceControls spaceId="agora" sources={AGORA_SOURCES} prefs={prefs}/>
    <div className="agora-feed-activity">
      <h3>Le notizie</h3>
      {loading?<p role="status">Aggiornamento delle fonti…</p>:failed?<p role="status">Le fonti non sono raggiungibili in questo momento. Puoi consultarle direttamente.</p>:<ArticleList items={news}/>}
      {failed?<button type="button" onClick={()=>setRetry(x=>x+1)}>Riprova</button>:null}
    </div>
    <div className="agora-feed-activity">
      <h3 id="agora-video-title">Video e conferenze</h3>
      {!loading&&!failed?<ArticleList items={videos}/>:null}
      <div className="agora-video-archives">
        <a href={AGORA_VIDEO_ARCHIVE.url} rel="noopener noreferrer" target="_blank">{AGORA_VIDEO_ARCHIVE.name}</a>
        <p>{AGORA_VIDEO_ARCHIVE.description}</p>
        <a href={AGORA_LIVE_DESTINATION.url} rel="noopener noreferrer" target="_blank">{AGORA_LIVE_DESTINATION.name}</a>
        <p>{AGORA_LIVE_DESTINATION.description} Nessuna diretta viene indicata come attiva senza una verifica.</p>
      </div>
    </div>
  </section>;
}
