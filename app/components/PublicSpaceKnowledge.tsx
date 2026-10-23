"use client";
import {useEffect,useState} from 'react';

type Match={kind:string;id:string;title:string;summary:string;revisionSha256:string};
type PublicPage={
 format:string;
 identity:{spaceId:string;kind:string;id:string;locale:string};
 revisionSha256:string;
 content:Record<string,unknown>;
 sources:Array<{title:string;url:string;rights:{attribution:string}}>;
 relations:Array<{relationType:string;target:{spaceId:string;kind:string;id:string}}>;
 revisionHistory:string[];
};
const KIND=/^[a-z][a-z0-9-]{0,63}$/;
const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/;
function safeLink(raw:string):string|null{
 try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}
 catch{return null;}
}
function pageUrl(spaceId:string,kind:string,id:string){
 return '/n/'+spaceId+'?'+new URLSearchParams({view:'biblioteca',sezione:'timeline',modalita:'indice',knowledgeKind:kind,knowledgeId:id});
}
/** Read-only search against the PostgreSQL database *selected by the server*. */
export function PublicSpaceRemoteSearch({spaceId,query}:{spaceId:string;query:string}){
 const [matches,setMatches]=useState<Match[]>([]);
 const [ready,setReady]=useState(false);
 useEffect(()=>{
  if(query.trim().length<2){setMatches([]);setReady(false);return;}
  const controller=new AbortController();
  const timer=setTimeout(()=>{
   void fetch('/api/public-spaces/'+spaceId+'/search?'+new URLSearchParams({q:query.trim()}),{
    cache:'no-store',signal:controller.signal,
   }).then(async response=>{
    if(response.status===404)return {matches:[]};
    if(!response.ok)throw Error('Search unavailable');
    return response.json() as Promise<{matches:Match[]}>;
   }).then(data=>{
    if(!controller.signal.aborted){
     const verified=Array.isArray(data.matches)?data.matches.filter(x=>
       x&&typeof x==='object'&&KIND.test(x.kind)&&ID.test(x.id)&&
       typeof x.title==='string'&&typeof x.summary==='string').slice(0,30):[];
     setMatches(verified);setReady(true);
    }
   }).catch(()=>{if(!controller.signal.aborted){setReady(false);setMatches([]);}});
  },300);
  return()=>{clearTimeout(timer);controller.abort();};
 },[spaceId,query]);
 return ready&&matches.length>0?<section className="public-space-search-results" aria-label="Risultati dell'archivio del nodo">
  <h3>Pagine enciclopediche</h3>
  <ol>{matches.map(item=><li key={item.kind+':'+item.id}>
   <a href={pageUrl(spaceId,item.kind,item.id)}>{item.title}</a>
   {item.summary?<p>{item.summary}</p>:null}
  </li>)}</ol>
 </section>:null;
}
/** Read-only published article; no implied authority to edit this database. */
export function PublicSpaceKnowledgePage({spaceId}:{spaceId:string}){
 const [page,setPage]=useState<PublicPage|null>(null);
 const [state,setState]=useState<'idle'|'loading'|'not-found'|'error'|'ready'>('idle');
 useEffect(()=>{
  const url=new URL(window.location.href);
  const kind=url.searchParams.get('knowledgeKind')??'';
  const id=url.searchParams.get('knowledgeId')??'';
  if(!KIND.test(kind)||!ID.test(id)||url.searchParams.getAll('knowledgeKind').length!==1||
     url.searchParams.getAll('knowledgeId').length!==1){setState('idle');return;}
  const controller=new AbortController();
  setState('loading');
  void fetch('/api/public-spaces/'+spaceId+'/knowledge?'+new URLSearchParams({kind,id}),{
   cache:'no-store',signal:controller.signal,
  }).then(async response=>{
   if(response.status===404){setState('not-found');return null;}
   if(!response.ok)throw Error('Page unavailable');
   return response.json() as Promise<PublicPage>;
  }).then(value=>{
   if(controller.signal.aborted||!value)return;
   if(value.format!=='org.agoranode.public-space-knowledge-page.v1'||
      value.identity.spaceId!==spaceId||value.identity.kind!==kind||value.identity.id!==id){
    throw Error('Wrong community or page');
   }
   setPage(value);setState('ready');
  }).catch(()=>{if(!controller.signal.aborted)setState('error');});
  return()=>controller.abort();
 },[spaceId]);
 if(state==='idle')return null;
 if(state==='loading')return <p role="status">Caricamento della pagina enciclopedica…</p>;
 if(state==='not-found')return <p role="status">Questa pagina non è ancora pubblicata nel database del nodo.</p>;
 if(state==='error'||!page)return <p role="alert">Impossibile verificare la pagina pubblica.</p>;
 const {content}=page;
 const title=typeof content.title==='string'?content.title:
   typeof content.name==='string'?content.name:page.identity.id;
 const intro=typeof content.summary==='string'?content.summary:
   typeof content.description==='string'?content.description:'';
 return <article className="public-space-knowledge-page" aria-labelledby="public-space-article-title">
  <p className="eyebrow">ENCICLOPEDIA DEL NODO · {page.identity.kind}</p>
  <h2 id="public-space-article-title">{title}</h2>
  {intro?<p className="public-space-article-lead">{intro}</p>:null}
  {Array.isArray(content.paragraphs)?content.paragraphs.filter((x):x is string=>typeof x==='string').slice(0,40).map((text,i)=>
   <p key={i}>{text}</p>):null}
  <h3>Fonti e provenienza</h3>
  {page.sources.length?<ul>{page.sources.map((source,i)=>{
    const url=safeLink(source.url);
    return <li key={i}>{url?<a href={url} target="_blank" rel="noopener noreferrer">{source.title}</a>:source.title}
     {source.rights?.attribution?<span> · {source.rights.attribution}</span>:null}
    </li>;
  })}</ul>:<p>Non risultano fonti collegate in questa revisione.</p>}
  <details><summary>Campi strutturati della pagina</summary>
   <pre className="public-space-article-json">{JSON.stringify(content,null,2).slice(0,20000)}</pre>
  </details>
  <h3>Storia delle revisioni</h3>
  <p>Revisione pubblicata: <code>{page.revisionSha256}</code></p>
  <ul>{page.revisionHistory.map(hash=><li key={hash}><code>{String(hash).slice(0,16)}…</code></li>)}</ul>
 </article>;
}
