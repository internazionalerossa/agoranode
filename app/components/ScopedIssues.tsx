"use client";
import {useEffect,useState} from 'react';
type Scope='agora'|'agoranode';
type Issue={id:string;scope:Scope;title:string;body:string;status:string;created_at:string};
type Comment={id:string;body:string;created_at:string};
const endpoint=(scope:Scope,issueId?:string)=>'/api/scoped-issues?'+new URLSearchParams({scope,...(issueId?{issueId}:{})});
export default function ScopedIssues(){
 const [scope,setScope]=useState<Scope>('agora');
 const [issues,setIssues]=useState<Issue[]>([]);
 const [selected,setSelected]=useState<string|null>(null);
 const [comments,setComments]=useState<Comment[]>([]);
 const [title,setTitle]=useState('');
 const [body,setBody]=useState('');
 const [comment,setComment]=useState('');
 const [error,setError]=useState('');
 const [revision,setRevision]=useState(0);
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();
  setIssues([]);setComments([]);setError('');
  void fetch(endpoint(scope),{signal:controller.signal,cache:'no-store'})
   .then(async r=>{if(!r.ok)throw Error('Elenco temporaneamente non disponibile');return r.json() as Promise<{issues:Issue[]}>;})
   .then(v=>{if(!controller.signal.aborted)setIssues(Array.isArray(v.issues)?v.issues:[]);})
   .catch(()=>{if(!controller.signal.aborted)setError('Registro delle issue non disponibile su questa installazione.');});
  return()=>controller.abort();
 },[scope,revision]);
 useEffect(()=>{
  if(!selected){setComments([]);return;}
  const controller=new AbortController();
  void fetch(endpoint(scope,selected),{signal:controller.signal,cache:'no-store'})
   .then(async r=>{if(!r.ok)throw Error('Issue unavailable');return r.json() as Promise<{comments:Comment[]}>;})
   .then(v=>{if(!controller.signal.aborted)setComments(Array.isArray(v.comments)?v.comments:[]);})
   .catch(()=>{if(!controller.signal.aborted)setComments([]);});
  return()=>controller.abort();
 },[scope,selected,revision]);
 async function submit(data:Record<string,string>){
  setBusy(true);setError('');
  try{
   const r=await fetch(endpoint(scope),{method:'POST',credentials:'same-origin',
    headers:{'content-type':'application/json'},body:JSON.stringify(data)});
   const result=await r.json() as {error?:string};
   if(!r.ok)throw Error(result.error??'Operazione rifiutata');
   setRevision(v=>v+1);
   if(data.action==='create'){setTitle('');setBody('');}
   if(data.action==='comment')setComment('');
  }catch(e){setError(e instanceof Error?e.message:'Non è stato possibile salvare');}
  finally{setBusy(false);}
 }
 return <section className="agora-forum" aria-labelledby="scoped-issues-title">
  <header><p className="eyebrow">REGISTRO INTERNO · PROPOSTE E PROBLEMI</p>
   <h2 id="scoped-issues-title">Issue di Agorà e AgoraNode</h2>
   <p>Le issue sono persistenti soltanto nel backend autenticato. Non sono ticket GitHub né atti di voto PR2/PR3: le consultazioni registrano pareri, non approvazioni vincolanti.</p>
  </header>
  <div role="group" aria-label="Ambito delle issue">
   <button type="button" aria-pressed={scope==='agora'} onClick={()=>{setScope('agora');setSelected(null);}}>Nodo Agorà</button>
   <button type="button" aria-pressed={scope==='agoranode'} onClick={()=>{setScope('agoranode');setSelected(null);}}>Piattaforma AgoraNode</button>
  </div>
  <p>Creazione: PR2 verificato del nodo Agorà; per l'ambito AgoraNode è necessario un mandato PR3 federale attivo. Per commentare basta una sessione PR1.</p>
  <form onSubmit={e=>{e.preventDefault();void submit({action:'create',title,body});}}>
   <h3>Apri una issue</h3>
   <label>Titolo <input value={title} minLength={8} maxLength={160} required onChange={e=>setTitle(e.target.value)}/></label>
   <label>Motivazione e proposta <textarea value={body} minLength={20} maxLength={8000} required rows={4} onChange={e=>setBody(e.target.value)}/></label>
   <button type="submit" disabled={busy}>Proponi issue</button>
  </form>
  {error?<p role="alert">{error}</p>:null}
  <ul className="agora-forum-list">{issues.map(i=><li key={i.id}>
   <article><h3>{i.title}</h3><p>{i.body}</p><small>{i.status==='open'?'Aperta':'Chiusa'} · {i.created_at}</small>
    <button type="button" onClick={()=>setSelected(selected===i.id?null:i.id)} aria-expanded={selected===i.id}>Discussione e pareri</button>
   </article>
   {selected===i.id?<div>
    <h4>Commenti</h4><ol>{comments.map(c=><li key={c.id}><p>{c.body}</p></li>)}</ol>
    <form onSubmit={e=>{e.preventDefault();void submit({action:'comment',issueId:i.id,body:comment});}}>
     <label>Intervento <textarea minLength={5} maxLength={4000} value={comment} required onChange={e=>setComment(e.target.value)}/></label>
     <button type="submit" disabled={busy}>Pubblica intervento</button>
    </form>
    <div role="group" aria-label="Parere consultivo">
     {(['yes','no','abstain'] as const).map(choice=><button type="button" key={choice} disabled={busy}
      onClick={()=>void submit({action:'vote',issueId:i.id,choice})}>{choice==='yes'?'Favorevole':choice==='no'?'Contrario':'Astenuto'}</button>)}
    </div>
   </div>:null}
  </li>)}</ul>
  {issues.length===0?<p>Nessuna issue disponibile in questo ambito.</p>:null}
 </section>;
}
