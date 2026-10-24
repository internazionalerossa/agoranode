"use client";
import {useEffect,useState} from 'react';
import type {ArticleRecord} from '../lib/feed';
import type {PublicSpaceSeed} from '../platform/public-space-seed';
import {NodeRassegna} from './NodeRassegna';

type Feed={spaceId:string;articles:ArticleRecord[];statuses:{sourceId:string;ok:boolean}[];sourceCount:number};

/**
 * Real Rassegna for installed nodes: retrieves stories using the same RSS
 * engine as PolisRossa but only from the operator-approved node seed.
 */
export default function PublicSpaceRassegna({seed}:{seed:PublicSpaceSeed}){
 const [feed,setFeed]=useState<Feed|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [retry,setRetry]=useState(0);
 const [savedIds,setSavedIds]=useState<Set<string>>(new Set());
 const [canSave,setCanSave]=useState(false);
 const [saveError,setSaveError]=useState('');
 const [saving,setSaving]=useState<string|null>(null);
 useEffect(()=>{
  const controller=new AbortController();
  setLoading(true);setError('');
  void fetch('/api/public-spaces/'+encodeURIComponent(seed.spaceId)+'/feed',{
   cache:'no-store',signal:controller.signal,headers:{accept:'application/json'},
  }).then(async response=>{
   if(!response.ok)throw Error('Feed unavailable');
   return response.json() as Promise<Feed>;
  }).then(result=>{
   if(controller.signal.aborted)return;
   if(result.spaceId!==seed.spaceId||!Array.isArray(result.articles))
    throw Error('Feed belongs to another node');
   setFeed(result);
  }).catch(()=>{
   if(!controller.signal.aborted){setFeed(null);setError('La rassegna di questo nodo non è temporaneamente raggiungibile.');}
  }).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[seed.spaceId,retry]);
 useEffect(()=>{
  const controller=new AbortController();
  setCanSave(false);setSavedIds(new Set());
  void fetch('/api/node-bookmarks?'+new URLSearchParams({spaceId:seed.spaceId}),{
   cache:'no-store',credentials:'same-origin',signal:controller.signal,
  }).then(async response=>{
   if(!response.ok)return null;
   return response.json() as Promise<{spaceId:string;bookmarks:Array<{article_id:string}>}>;
  }).then(data=>{
   if(controller.signal.aborted||!data||data.spaceId!==seed.spaceId)return;
   setSavedIds(new Set(data.bookmarks.map(x=>x.article_id)));
   setCanSave(true);
  }).catch(()=>{});
  return()=>controller.abort();
 },[seed.spaceId]);
 const toggleSave=async(article:ArticleRecord)=>{
  if(!canSave||saving)return;
  const remove=savedIds.has(article.id);
  setSaving(article.id);setSaveError('');
  try{
   const response=await fetch('/api/node-bookmarks?'+new URLSearchParams({spaceId:seed.spaceId}),{
    method:remove?'DELETE':'PUT',credentials:'same-origin',
    headers:{'content-type':'application/json'},
    body:JSON.stringify(remove?{articleId:article.id}:{
     articleId:article.id,sourceId:article.sourceId,title:article.title.slice(0,300),
     link:article.link,excerpt:article.excerpt.slice(0,600),
    }),
   });
   if(!response.ok)throw Error('Non è stato possibile aggiornare il salvataggio personale.');
   setSavedIds(previous=>{
    const copy=new Set(previous);
    if(remove)copy.delete(article.id);else copy.add(article.id);
    return copy;
   });
  }catch{setSaveError('Salvataggio non disponibile: controlla la sessione PR1 e riprova.');}
  finally{setSaving(null);}
 };
 return <section className="public-space-rassegna" aria-labelledby={'space-feed-heading-'+seed.spaceId}>
  <h2 id={'space-feed-heading-'+seed.spaceId} className="sr-only">Articoli dalle fonti del nodo {seed.name}</h2>
  {loading?<p role="status">Aggiornamento degli articoli del nodo…</p>:null}
  {error?<div><p role="status">{error}</p>
   <button type="button" onClick={()=>setRetry(n=>n+1)}>Riprova</button></div>:null}
  {!loading&&!error?<NodeRassegna spaceId={seed.spaceId} articles={feed?.articles??[]}
    title={'Rassegna stampa · '+seed.name}
    savedIds={savedIds} onToggleSave={canSave?article=>{void toggleSave(article);}:undefined}/>:null}
  {saveError?<p role="alert">{saveError}</p>:null}
  {!canSave?<p className="node-rassegna-account-notice">Per salvare articoli nel tuo account PR1, <a href={'/account?'+new URLSearchParams({return_to:'/n/'+seed.spaceId})}>accedi al nodo</a>. Non occorre essere PR2.</p>:null}
  <details><summary>Fonti selezionate per questo nodo</summary>
   <ul>{seed.sources.map(source=><li key={source.id}>
    <strong>{source.name}</strong>
    {source.homepage?<a href={source.homepage} target="_blank" rel="noopener noreferrer">Sito originale ↗</a>:null}
    {source.feedUrl?<a href={source.feedUrl} target="_blank" rel="noopener noreferrer">RSS/Atom ↗</a>:null}
   </li>)}</ul>
  </details>
 </section>;
}
