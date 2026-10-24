"use client";
import {useEffect,useState} from 'react';
import type {PublicSpaceSeed} from '../platform/public-space-seed';

type ChatMessage={id:string;alias:string;body:string;created_at:string};
const urlFor=(spaceId:string)=>'/api/node-chat?'+new URLSearchParams({spaceId});

/** Real database-backed node chat, private to verified local PR2 members. */
export default function NodeChatPanel({seed}:{seed:PublicSpaceSeed}){
 const [messages,setMessages]=useState<ChatMessage[]>([]);
 const [alias,setAlias]=useState('');
 const [body,setBody]=useState('');
 const [error,setError]=useState('');
 const [ready,setReady]=useState(false);
 const [allowed,setAllowed]=useState(false);
 const [sending,setSending]=useState(false);
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  setReady(false);setAllowed(false);setMessages([]);setError('');
  const refresh=async()=>{
   try{
    const response=await fetch(urlFor(seed.spaceId),{cache:'no-store',credentials:'same-origin',signal:controller.signal});
    if(!response.ok){
     if(response.status===401||response.status===403)throw Error('La chat è accessibile soltanto ai PR2 verificati di questo nodo.');
     throw Error('Chat del nodo temporaneamente non disponibile.');
    }
    const json=await response.json() as {spaceId:string;messages:ChatMessage[]};
    if(json.spaceId!==seed.spaceId||!Array.isArray(json.messages))throw Error('Archivio chat non corrispondente al nodo.');
    if(!controller.signal.aborted){setMessages(json.messages);setAllowed(true);setError('');}
   }catch(e){
    if(!controller.signal.aborted){setAllowed(false);setError(e instanceof Error?e.message:'Chat non disponibile');}
   }finally{if(!controller.signal.aborted)setReady(true);}
  };
  void refresh();
  const timer=setInterval(()=>{if(!document.hidden)void refresh();},15000);
  return()=>{clearInterval(timer);controller.abort();};
 },[seed.spaceId,revision]);
 async function submit(){
  if(sending)return;
  setSending(true);setError('');
  try{
   const response=await fetch(urlFor(seed.spaceId),{method:'POST',credentials:'same-origin',
    headers:{'content-type':'application/json'},body:JSON.stringify({alias:alias.trim(),body:body.trim()})});
   const result=await response.json() as {error?:string};
   if(!response.ok)throw Error(result.error??'Invio non autorizzato');
   setBody('');setRevision(n=>n+1);
  }catch(e){setError(e instanceof Error?e.message:'Invio non riuscito');}
  finally{setSending(false);}
 }
 return <section className="agora-forum node-chat" aria-labelledby={'node-chat-heading-'+seed.spaceId}>
  <header><p className="eyebrow">COMUNITÀ · CHAT PR2</p>
   <h2 id={'node-chat-heading-'+seed.spaceId}>Chat di {seed.name}</h2>
   <p>Conversazione breve fra PR2 del nodo. Messaggi nel database della comunità, conservati fino a 30 giorni. Non è un luogo di voto: le decisioni editoriali passano dal registro delle proposte.</p>
  </header>
  {!ready?<p role="status">Verifica della chat…</p>:null}
  {error?<p role="status">{error}</p>:null}
  {allowed?<><ol className="agora-forum-list" aria-label="Messaggi recenti">
   {messages.map(message=><li key={message.id}><strong>{message.alias}</strong>
    <p style={{whiteSpace:'pre-wrap'}}>{message.body}</p>
    <small>{new Date(message.created_at).toLocaleString('it-IT')}</small>
   </li>)}
  </ol>
  {messages.length===0?<p>Non ci sono ancora messaggi nel periodo conservato.</p>:null}
  <form onSubmit={event=>{event.preventDefault();void submit();}}>
   <label>Alias pubblico <input maxLength={60} minLength={2} required value={alias} onChange={e=>setAlias(e.target.value)}/></label>
   <label>Messaggio <textarea rows={3} maxLength={1500} minLength={1} required value={body} onChange={e=>setBody(e.target.value)}/></label>
   <button type="submit" disabled={sending}>{sending?'Invio…':'Invia nella chat PR2'}</button>
  </form></>:null}
 </section>;
}
