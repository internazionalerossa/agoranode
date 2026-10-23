"use client";
import {useEffect,useMemo,useState} from 'react';
import {LOCAL_WIKI_DRAFT_FORMAT,localWikiDraftKey,validateLocalWikiDraft} from '../lib/local-wiki-draft';
import {timelineProposalLink} from '../lib/timeline-proposal';
import type {PublicKnowledgeHistory} from '../lib/public-knowledge';

type EditableBlock={id:string;text:string};
const MAX_BLOCKS=10;
const MAX_BLOCK_CHARS=700;
const MAX_SOURCE_CHARS=1000;

/**
 * A visual proposal composer for existing PUBLIC knowledge pages. The
 * result is a reviewable forum proposal only; it never writes directly to
 * the content-addressed wiki, finalizes decisions or bypasses PR2.
 */
export default function WikiProposalEditor({history}: {history:PublicKnowledgeHistory}){
 const entity=history.current;
 const [open,setOpen]=useState(false);
 const [blocks,setBlocks]=useState<EditableBlock[]>([{id:'first',text:''}]);
 const [source,setSource]=useState('');
 const [reason,setReason]=useState('');
 const [preview,setPreview]=useState(false);
 const [savedStatus,setSavedStatus]=useState('');
 const storageKey=localWikiDraftKey(entity.identity.spaceId,entity.identity.kind,entity.identity.id);
 useEffect(()=>{
  try{
   const stored=localStorage.getItem(storageKey);
   if(!stored)return;
   const previous=validateLocalWikiDraft(JSON.parse(stored));
   if(previous.revisionSha256!==entity.revisionSha256)return;
   setBlocks(previous.blocks);setReason(previous.reason);setSource(previous.source);
   setSavedStatus('Bozza presente su questo dispositivo, ripristinata sulla stessa revisione.');
  }catch{/* Local drafts are optional and are never trusted as published material. */}
 },[storageKey,entity.revisionSha256]);
 const saveLocal=()=>{
  try{
   const validated=validateLocalWikiDraft({
    format:LOCAL_WIKI_DRAFT_FORMAT,spaceId:entity.identity.spaceId,
    kind:entity.identity.kind,id:entity.identity.id,revisionSha256:entity.revisionSha256,
    reason,source,blocks,
   });
   localStorage.setItem(storageKey,JSON.stringify(validated));
   setSavedStatus('Bozza salvata su questo dispositivo. Non è stata inviata al forum.');
  }catch{setSavedStatus('Impossibile salvare la bozza: verifica i campi o lo spazio disponibile.');}
 };
 const title=typeof entity.content.title==='string'?entity.content.title:
   typeof entity.content.name==='string'?entity.content.name:entity.identity.id;
 const text=blocks.map((block,index)=>(index+1)+'. '+block.text.trim()).join('\n\n');
 const proposal=useMemo(()=>{
  if(blocks.length<1||blocks.length>MAX_BLOCKS||
     blocks.some(block=>block.text.trim().length<25||block.text.length>MAX_BLOCK_CHARS)||
     reason.trim().length<30||reason.length>1000)return null;
  if(source.trim()){
   try{const url=new URL(source);if(url.protocol!=='https:'||url.username||url.password)return null;}
   catch{return null;}
  }
  const body=[
   'PROPOSTA DI REVISIONE DELL’ATLANTE — DA SOTTOPORRE A VALUTAZIONE PR2',
   'Pagina: '+title,
   'Nodo: '+entity.identity.spaceId,
   'Tipo: '+entity.identity.kind,
   'ID pagina: '+entity.identity.id,
   'Revisione di base: '+entity.revisionSha256,
   'Motivazione: '+reason.trim(),
   'Blocchi di testo proposti:\n'+text,
   'La pagina corrente non viene modificata automaticamente. Fonti, licenze e decisioni PR2 devono essere verificate prima di un eventuale nuovo checkpoint.',
  ].join('\n\n');
  try{return timelineProposalLink({
   title:'Revisione Atlante: '+title.slice(0,112),
   body:body.slice(0,3950),references:source.trim(),
  });}catch{return null;}
 },[blocks,reason,source,title,entity.identity.spaceId,entity.identity.kind,entity.identity.id,entity.revisionSha256]);
 const update=(id:string,value:string)=>setBlocks(old=>old.map(block=>block.id===id?{...block,text:value}:block));
 const move=(id:string,direction:-1|1)=>setBlocks(old=>{
  const next=[...old],index=next.findIndex(block=>block.id===id),target=index+direction;
  if(index<0||target<0||target>=next.length)return old;
  [next[index],next[target]]=[next[target],next[index]];
  return next;
 });
 return <section className="wiki-proposal-editor" aria-labelledby="wiki-proposal-title">
  <header>
   <h2 id="wiki-proposal-title">Migliora questa pagina</h2>
   <p>Hai trovato un errore, un passaggio poco chiaro o una fonte migliore? Scrivi una proposta per il forum della comunità. Nessuna conoscenza verrà modificata senza revisione e decisione competente.</p>
   <button type="button" onClick={()=>setOpen(value=>!value)} aria-expanded={open}>
    {open?'Chiudi l’editor':'Proponi una correzione'}
   </button>
  </header>
  {open?<div className="wiki-proposal-workspace">
   <p><strong>Pagina:</strong> {title} · <strong>Revisione attuale:</strong> <code>{entity.revisionSha256.slice(0,12)}…</code></p>
   <label>Perché serve questa modifica?
    <textarea rows={3} maxLength={1000} value={reason}
      onChange={event=>setReason(event.target.value)}
      placeholder="Descrivi l’errore, il contesto e quale problema risolve la modifica (almeno 30 caratteri)."/>
   </label>
   <div role="group" aria-label="Blocchi della proposta">
    {blocks.map((block,index)=><div className="wiki-proposal-block" key={block.id}>
     <strong>Paragrafo {index+1}</strong>
     <label>Testo proposto
      <textarea rows={4} maxLength={MAX_BLOCK_CHARS} value={block.text}
       onChange={event=>update(block.id,event.target.value)}
       placeholder="Scrivi con parole tue un passaggio documentato (almeno 25 caratteri)."/>
     </label>
     <div className="wiki-proposal-actions">
      <button type="button" disabled={index===0} onClick={()=>move(block.id,-1)}>Sposta su</button>
      <button type="button" disabled={index===blocks.length-1} onClick={()=>move(block.id,1)}>Sposta giù</button>
      <button type="button" disabled={blocks.length===1} onClick={()=>setBlocks(old=>old.filter(x=>x.id!==block.id))}>Rimuovi</button>
     </div>
    </div>)}
    <button type="button" disabled={blocks.length>=MAX_BLOCKS}
     onClick={()=>setBlocks(old=>[...old,{id:crypto.randomUUID(),text:''}])}>+ Aggiungi paragrafo</button>
   </div>
   <label>Fonte verificabile (HTTPS)
    <input type="url" value={source} maxLength={MAX_SOURCE_CHARS}
     onChange={event=>setSource(event.target.value)} placeholder="https://…"/>
   </label>
   <button type="button" onClick={saveLocal}>Salva bozza su questo dispositivo</button>
   {savedStatus?<p role="status">{savedStatus}</p>:null}
   <button type="button" onClick={()=>setPreview(value=>!value)} aria-expanded={preview}>Anteprima dei cambiamenti</button>
   {preview?<section aria-label="Anteprima dei testi proposti">
    <h3>Nuovi paragrafi</h3>
    {blocks.map((block,i)=><p key={block.id}><strong>{i+1}.</strong> {block.text.trim()||'Paragrafo da scrivere'}</p>)}
    <p>Questa è una proposta distinta dal testo attualmente pubblicato; l'originale e le revisioni restano consultabili sopra.</p>
   </section>:null}
   {proposal?<a className="button" href={proposal}>Continua nel forum PR2 →</a>:
     <p role="status">Completa motivazione e testi (o correggi l'URL) per aprire la proposta.</p>}
   <p>Solo i PR2 autorizzati possono inviare proposte e votare quando il forum è aperto. La revisione di partenza è inclusa per evitare aggiornamenti silenziosi durante la discussione.</p>
  </div>:null}
 </section>;
}
