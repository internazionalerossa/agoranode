"use client";
import {useEffect,useState} from 'react';
import {newNodeDraft,nodeStudioDraft,blueprintToProposal,type NodeBlueprintDraft} from '../lib/node-studio-model';
import {timelineProposalLink} from '../lib/timeline-proposal';
import {StudioBlocks,StudioSources} from './NodeStudioFields';

type Props={spaceId:'agora'|'polisrossa'};
const key=(spaceId:string)=>'agoranode.node-studio.draft.v1:'+spaceId;
export default function NodeStudio({spaceId}:Props){
 const [draft,setDraft]=useState<NodeBlueprintDraft>(()=>newNodeDraft('create-node'));
 const [saved,setSaved]=useState<NodeBlueprintDraft[]>([]);
 const [account,setAccount]=useState(false);
 const [status,setStatus]=useState('');
 const [preview,setPreview]=useState(false);
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
   let active=true;
   try{
     const raw=localStorage.getItem(key(spaceId));
     if(raw)setDraft(nodeStudioDraft(JSON.parse(raw)));
   }catch{}
   const controller=new AbortController();
   void fetch('/api/node-studio/drafts',{signal:controller.signal,cache:'no-store',credentials:'same-origin'})
     .then(async response=>{
       if(response.status===401)return null;
       if(!response.ok)throw Error('Private drafts unavailable');
       return response.json() as Promise<{drafts:NodeBlueprintDraft[]}>;
     }).then(result=>{
       if(!active||!result)return;
       setAccount(true);
       setSaved(result.drafts.map(item=>nodeStudioDraft(item)));
     }).catch(()=>{});
   return()=>{active=false;controller.abort();};
 },[spaceId]);
 const update=(patch:Partial<NodeBlueprintDraft>)=>setDraft(old=>({...old,...patch,updatedAt:Date.now()}));
 const reset=(operation:'create-node'|'edit-node')=>{
   const next=newNodeDraft(operation,operation==='edit-node'?spaceId:'nuovo-nodo');
   setDraft(operation==='edit-node'?{...next,name:spaceId==='agora'?'Agorà':'PolisRossa'}:next);
   setStatus('Nuova bozza avviata; non è stata pubblicata.');
 };
 const save=async()=>{
   let checked:NodeBlueprintDraft;
   try{checked=nodeStudioDraft(draft);}
   catch(error){setStatus(error instanceof Error?error.message:'Controlla la bozza');return;}
   setBusy(true);
   try{
     localStorage.setItem(key(spaceId),JSON.stringify(checked));
     if(account){
       const response=await fetch('/api/node-studio/drafts',{
         method:'PUT',credentials:'same-origin',headers:{'content-type':'application/json'},
         body:JSON.stringify({draft:checked}),
       });
       if(!response.ok)throw Error('Remote storage unavailable');
       const body=await response.json() as {draft:NodeBlueprintDraft};
       setSaved(old=>[body.draft,...old.filter(item=>item.draftId!==checked.draftId)].slice(0,20));
       setStatus('Bozza privata salvata nel tuo account.');
     }else setStatus('Bozza salvata sul dispositivo. Accedi come PR1 per salvarla nel tuo account.');
   }catch{setStatus('La bozza resta sul dispositivo. Il salvataggio nell’account non è riuscito.');}
   finally{setBusy(false);}
 };
 const download=()=>{
   let content:NodeBlueprintDraft;
   try{content=nodeStudioDraft(draft);}catch{setStatus('Completa e correggi i campi prima di esportare.');return;}
   const url=URL.createObjectURL(new Blob([JSON.stringify(content,null,2)],{type:'application/json'}));
   const a=document.createElement('a');a.href=url;a.download='bozza-agoranode-'+content.spaceId+'.json';a.click();
   setTimeout(()=>URL.revokeObjectURL(url),1500);
 };
 let proposal:string|null=null;
 if(spaceId==='polisrossa'){
   try{proposal=timelineProposalLink(blueprintToProposal(draft));}catch{}
 }
 return <section className="node-studio" id={'studio-'+spaceId} aria-labelledby={'studio-title-'+spaceId}>
   <header><p className="eyebrow">LABORATORIO · EDITOR VISUALE</p>
     <h2 id={'studio-title-'+spaceId}>Dai forma a un nodo, un blocco alla volta</h2>
     <p>Imposta argomento, fonti, pagine, timeline narrativa e biblioteca. Vedi l’anteprima e salva senza Git o codici.</p>
     <p>Un salvataggio è una <strong>bozza privata</strong>. Per rendere consultabile un nuovo nodo è disponibile il bootstrap pubblico read-only, installato manualmente da un operatore dopo la revisione di fonti e diritti. Non abilita account o voto PR2.</p>
     <p><a href="https://github.com/internazionalerossa/agoranode/blob/main/docs/THEMATIC-BOOTSTRAP.md" target="_blank" rel="noopener noreferrer">Come installare il nodo senza pubblicare bozze private ↗</a></p>
   </header>
   <div className="node-studio-modes" role="group" aria-label="Tipo di lavoro">
     <button type="button" aria-pressed={draft.operation==='create-node'} onClick={()=>reset('create-node')}>Nuovo nodo</button>
     <button type="button" aria-pressed={draft.operation==='edit-node'} onClick={()=>reset('edit-node')}>Modifica il nodo</button>
   </div>
   {account&&saved.length>0?<label>Bozze nel tuo account
     <select value="" onChange={e=>{const found=saved.find(item=>item.draftId===e.target.value);if(found){setDraft(found);setStatus('Bozza caricata.');}}}>
       <option value="">Scegli una bozza...</option>
       {saved.map(item=><option key={item.draftId} value={item.draftId}>{item.name} · {item.spaceId}</option>)}
     </select>
   </label>:null}
   <div className="node-studio-layout">
     <div className="node-studio-editor">
       <fieldset className="node-studio-group"><legend>01 · Identità della comunità</legend>
         <label>Identificatore <input maxLength={48} disabled={draft.operation==='edit-node'} value={draft.spaceId}
           onChange={e=>update({spaceId:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'')})}/></label>
         <label>Nome del nodo <input maxLength={90} value={draft.name} onChange={e=>update({name:e.target.value})}/></label>
         <label>Argomento <input maxLength={180} value={draft.topic} onChange={e=>update({topic:e.target.value})}/></label>
         <label>Presentazione <textarea rows={3} maxLength={1500} value={draft.description} onChange={e=>update({description:e.target.value})}/></label>
         <label>Colore distintivo <input type="color" value={draft.accent} onChange={e=>update({accent:e.target.value})}/></label>
       </fieldset>
       <StudioSources draft={draft} update={update}/>
       <StudioBlocks draft={draft} update={update}/>
       <div className="node-studio-actions">
         <button type="button" disabled={busy} onClick={()=>void save()}>{busy?'Salvataggio…':'Salva bozza'}</button>
         <button type="button" aria-pressed={preview} onClick={()=>setPreview(value=>!value)}>{preview?'Nascondi anteprima':'Mostra anteprima'}</button>
         <button type="button" onClick={download}>Esporta bozza</button>
       </div>
       {status?<p role="status">{status}</p>:null}
       {proposal?<a className="button button-outline" href={proposal}>Porta questa proposta al forum PR2 →</a>:
         <p role="status">La creazione pubblica di nodi tramite PR2/PR3 e il forum del nodo Agorà non sono ancora attivi. Esporta la bozza per una revisione senza pubblicarla automaticamente.</p>}
     </div>
     {preview?<aside className="node-studio-preview" aria-label="Anteprima privata">
       <p className="eyebrow">ANTEPRIMA · NON PUBBLICATA</p>
       <div style={{borderTop:'5px solid '+draft.accent,paddingTop:12}}>
         <h3>{draft.name}</h3><p>{draft.topic}</p><p>{draft.description}</p>
         <nav aria-label="Sezioni comuni">Notizie · Video · Biblioteca · Wiki · Timeline · Dati · Agorà</nav>
         {draft.blocks.map(block=><article className="node-studio-preview-block" key={block.id}>
           <small>{block.kind}</small><h4>{block.title}</h4><p>{block.body}</p>
           {block.url?<small>Fonte: {block.url}</small>:null}
         </article>)}
         <p>{draft.sources.length} fonti proposte · {draft.blocks.length} blocchi</p>
       </div>
     </aside>:null}
   </div>
 </section>;
}
