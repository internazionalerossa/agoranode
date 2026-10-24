"use client";
import {useEffect,useState} from 'react';
import type {PublicSpaceSeed} from '../platform/public-space-seed';

type Topic={id:string;space_id:string;author_alias:string;title:string;body:string;status:string;created_at:string};
type Comment={id:string;author_alias:string;body:string;created_at:string};
const endpoint=(spaceId:string,topicId?:string)=>'/api/node-forum?'+new URLSearchParams({spaceId,...(topicId?{topicId}:{})});

/** Real, independent PR2 discussion board. Nothing is stored in PolisRossa. */
export default function NodeForumPanel({seed}:{seed:PublicSpaceSeed}){
 const [topics,setTopics]=useState<Topic[]>([]);
 const [selected,setSelected]=useState<string|null>(null);
 const [comments,setComments]=useState<Comment[]>([]);
 const [alias,setAlias]=useState('');
 const [title,setTitle]=useState('');
 const [body,setBody]=useState('');
 const [replyBody,setReplyBody]=useState('');
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [revision,setRevision]=useState(0);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setError('');
  void fetch(endpoint(seed.spaceId),{signal:controller.signal,cache:'no-store'})
   .then(async response=>{if(!response.ok)throw Error('Forum non disponibile su questo nodo');return response.json() as Promise<{topics:Topic[]}>;})
   .then(result=>{if(!controller.signal.aborted)setTopics(Array.isArray(result.topics)?result.topics:[]);})
   .catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Forum non disponibile');})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[seed.spaceId,revision]);
 useEffect(()=>{
  if(!selected){setComments([]);return;}
  const controller=new AbortController();
  void fetch(endpoint(seed.spaceId,selected),{signal:controller.signal,cache:'no-store'})
   .then(async response=>{if(!response.ok)throw Error('Discussione non disponibile');return response.json() as Promise<{comments:Comment[]}>;})
   .then(result=>{if(!controller.signal.aborted)setComments(Array.isArray(result.comments)?result.comments:[]);})
   .catch(()=>{if(!controller.signal.aborted)setComments([]);});
  return()=>controller.abort();
 },[seed.spaceId,selected,revision]);
 async function submit(action:'create'|'reply'){
  setBusy(true);setNotice('');setError('');
  try{
   const payload=action==='create'?{action,alias,title,body}:{action,alias,topicId:selected,body:replyBody};
   const response=await fetch(endpoint(seed.spaceId),{method:'POST',credentials:'same-origin',
    headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
   const data=await response.json() as {error?:string};
   if(!response.ok)throw Error(data.error??'Pubblicazione rifiutata');
   if(action==='create'){setTitle('');setBody('');}else setReplyBody('');
   setRevision(n=>n+1);
   setNotice('Intervento pubblicato nel forum di '+seed.name+'.');
  }catch(e){setError(e instanceof Error?e.message:'Invio non riuscito');}
  finally{setBusy(false);}
 }
 return <section className="agora-forum" aria-labelledby={'node-forum-title-'+seed.spaceId}>
  <header><p className="eyebrow">COMUNITÀ · DISCUSSIONI</p>
   <h2 id={'node-forum-title-'+seed.spaceId}>Forum di {seed.name}</h2>
   <p>Discussioni reali, salvate esclusivamente nel database del nodo. Per scrivere occorre essere PR2 di questo nodo; l'account PR1 consente soltanto preferenze e salvataggi personali.</p>
  </header>
  {error?<p role="alert">{error}</p>:null}
  {notice?<p role="status">{notice}</p>:null}
  <form onSubmit={event=>{event.preventDefault();void submit('create');}}>
   <h3>Apri una discussione</h3>
   <label>Alias pubblico <input value={alias} autoComplete="nickname" minLength={2} maxLength={60} required
    onChange={e=>setAlias(e.target.value)}/></label>
   <label>Titolo <input value={title} minLength={8} maxLength={160} required onChange={e=>setTitle(e.target.value)}/></label>
   <label>Discussione <textarea rows={4} minLength={30} maxLength={5000} value={body} required onChange={e=>setBody(e.target.value)}/></label>
   <button type="submit" disabled={busy}>Pubblica nel forum</button>
  </form>
  {loading?<p role="status">Caricamento delle discussioni…</p>:null}
  <ol className="agora-forum-list">
   {topics.map(topic=><li key={topic.id}>
    <article>
     <h3>{topic.title}</h3><p className="agora-forum-meta">Alias dichiarato: {topic.author_alias}</p>
     <p>{topic.body}</p>
     <button type="button" onClick={()=>setSelected(selected===topic.id?null:topic.id)} aria-expanded={selected===topic.id}>
      {selected===topic.id?'Chiudi risposte':'Leggi e rispondi'}
     </button>
    </article>
    {selected===topic.id?<div>
     <h4>Risposte</h4>
     <ol>{comments.map(comment=><li key={comment.id}>
      <p><strong>{comment.author_alias}</strong></p><p>{comment.body}</p>
     </li>)}</ol>
     {topic.status==='open'?<form onSubmit={event=>{event.preventDefault();void submit('reply');}}>
      <label>La tua risposta <textarea minLength={5} maxLength={3000} rows={3} value={replyBody} required onChange={e=>setReplyBody(e.target.value)}/></label>
      <button type="submit" disabled={busy||!alias.trim()}>Invia risposta</button>
     </form>:<p>Discussione chiusa.</p>}
    </div>:null}
   </li>)}
  </ol>
  {!loading&&!topics.length?<p>Il forum non contiene ancora discussioni.</p>:null}
 </section>;
}
