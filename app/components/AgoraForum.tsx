"use client";
import {useEffect,useState} from 'react';

type Topic={id:string;author:string;title:string;body:string;createdAt:number};
type Board={spaceId:'agora';topics:Topic[];nextOffset:number|null;authenticated:boolean;publication:string};
/** A real public discussion board with verified Agora PR2 submissions.
 * Role authorization comes only from the server, never a client selector.
 */
export default function AgoraForum(){
 const [topics,setTopics]=useState<Topic[]>([]);
 const [ready,setReady]=useState(false);
 const [authenticated,setAuthenticated]=useState(false);
 const [nextOffset,setNextOffset]=useState<number|null>(null);
 const [offset,setOffset]=useState(0);
 const [error,setError]=useState('');
 const [status,setStatus]=useState('');
 const [compose,setCompose]=useState(false);
 const [alias,setAlias]=useState('');
 const [title,setTitle]=useState('');
 const [body,setBody]=useState('');
 const [saving,setSaving]=useState(false);
 const [revision,setRevision]=useState(0);
 const isStaticPreview=import.meta.env?.VITE_PUBLIC_PREVIEW==='true';
 useEffect(()=>{
  const controller=new AbortController();
  setReady(false);setError('');
  if(isStaticPreview){
   setTopics([]);
   setError('Questa anteprima statica non ospita il forum reale di Agorà.');
   setAuthenticated(false);
   setNextOffset(null);
   setReady(true);
   return()=>controller.abort();
  }
  void fetch('/api/agora/forum?offset='+offset,{cache:'no-store',credentials:'same-origin',signal:controller.signal})
   .then(async response=>{
    if(!response.ok)throw Error('Forum unavailable');
    return response.json() as Promise<Board>;
   }).then(data=>{
    if(controller.signal.aborted)return;
    if(data.spaceId!=='agora'||!Array.isArray(data.topics))throw Error('Unexpected forum data');
    setTopics(data.topics.filter(topic=>typeof topic.id==='string'&&typeof topic.title==='string'&&
     typeof topic.body==='string'&&typeof topic.author==='string').slice(0,30));
    setAuthenticated(Boolean(data.authenticated));
    setNextOffset(typeof data.nextOffset==='number'?data.nextOffset:null);
    setReady(true);
   }).catch(()=>{if(!controller.signal.aborted){setReady(true);setError('Forum temporaneamente non disponibile su questa installazione.');}});
  return()=>controller.abort();
 },[offset,revision]);
 const publish=async()=>{
  if(saving)return;
  if(alias.trim().length<2||title.trim().length<8||body.trim().length<40){
   setStatus('Completa alias, titolo (8 caratteri) e testo (almeno 40 caratteri).');return;
  }
  setSaving(true);setStatus('');
  try{
   const response=await fetch('/api/agora/forum',{
    method:'POST',credentials:'same-origin',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({alias:alias.trim(),title:title.trim(),body:body.trim()}),
   });
   const result=await response.json() as {error?:string;ok?:boolean};
   if(!response.ok||!result.ok)throw Error(result.error??'Invio non riuscito');
   setStatus('La discussione è stata pubblicata nel forum Agorà. Non è una votazione PR2.');
   setBody('');setTitle('');setCompose(false);setOffset(0);setRevision(value=>value+1);
  }catch(e){setStatus(e instanceof Error?e.message:'Invio non riuscito');}
  finally{setSaving(false);}
 };
 return <section className="agora-forum" id="agora-forum" aria-labelledby="agora-forum-title">
  <header>
   <p className="eyebrow">AGORÀ · CONVERSAZIONI PUBBLICHE</p>
   <h2 id="agora-forum-title">Forum del nodo Agorà</h2>
   <p>Un luogo per discutere la tecnologia della piattaforma, proporre miglioramenti e confrontare fonti. Le discussioni sono pubbliche e persistono nel database del servizio, quando configurato. **Non** sono automaticamente referendum, votazioni o revisioni approvate.</p>
  </header>
  {isStaticPreview?<p role="status" className="agora-forum-preview-notice">Anteprima statica: nessuna discussione reale disponibile senza il backend di Agorà.</p>:null}
  <div className="agora-forum-toolbar">
   <h3>Discussioni</h3>
   {authenticated?<button type="button" onClick={()=>setCompose(x=>!x)} aria-expanded={compose}>
     {compose?'Chiudi il modulo':'Apri una discussione'}
   </button>:isStaticPreview?<span>Il forum interattivo richiede il backend e una sessione verificata.</span>:<a href="/account?return_to=%2Fagora%3Fview%3Dpartecipa">Accedi e verifica la tua appartenenza PR2 ad Agorà</a>}
  </div>
  {authenticated&&compose?<form onSubmit={event=>{event.preventDefault();void publish();}}>
   <label>Nome pubblico o pseudonimo<input required maxLength={60} minLength={2} value={alias} onChange={e=>setAlias(e.target.value)}/></label>
   <label>Titolo della discussione<input required maxLength={150} minLength={8} value={title} onChange={e=>setTitle(e.target.value)}/></label>
   <label>Contesto e proposta<textarea required minLength={40} maxLength={4000} rows={6} value={body} onChange={e=>setBody(e.target.value)}/></label>
   <button type="submit" disabled={saving}>{saving?'Pubblicazione…':'Pubblica la discussione'}</button>
  </form>:null}
  {status?<p role="status">{status}</p>:null}
  {!ready?<p role="status">Caricamento discussioni…</p>:
   error?<p role="status">{error}</p>:
   topics.length===0?<p>Non ci sono ancora discussioni pubblicate. L’alpha si costruisce anche a partire dalla prima proposta.</p>:
   <ol className="agora-forum-list">{topics.map(item=><li key={item.id}>
    <article><h4>{item.title}</h4>
     <p className="agora-forum-meta">Proposto da {item.author} · {item.createdAt>0&&Number.isFinite(item.createdAt)?new Date(item.createdAt).toLocaleDateString('it-IT'):'nessuna data di pubblicazione reale'}</p>
     <p style={{whiteSpace:'pre-wrap'}}>{item.body}</p>
    </article>
   </li>)}</ol>}
  {offset>0||nextOffset!==null?<nav aria-label="Pagine delle discussioni" className="agora-forum-pagination">
   <button type="button" disabled={!offset} onClick={()=>setOffset(Math.max(0,offset-30))}>Precedenti</button>
   <button type="button" disabled={nextOffset===null} onClick={()=>nextOffset!==null&&setOffset(nextOffset)}>Successive</button>
  </nav>:null}
  <p className="agora-forum-disclaimer">Attualmente il forum è uno spazio di discussione alpha. Solo PR2 verificati di Agorà possono partecipare al forum. PR3 è la loro funzione quando operano sulla tecnologia AgoraNode.</p>
 </section>;
}
