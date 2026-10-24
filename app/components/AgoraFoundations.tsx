"use client";
import {useEffect,useState} from 'react';
import NodeStudio from './NodeStudio';
import type {NodeBlueprintDraft} from '../lib/node-studio-model';

type Proposal={id:string;space_id:string;digest:string;electorate_size:number;status:string;created_at:string};
type Board={canPropose:boolean;proposals:Proposal[]};
type Detail={proposal:{id:string;spaceId:string;digest:string;status:string;electorateSize:number;required:number;counts:{choice:string;count:number}[];blueprint?:NodeBlueprintDraft};canPropose:boolean;provisioned:false};
const api='/api/agora/foundations';

/** Only Agorà PR2 (PR3 in platform scope) may create/vote new-node proposals. */
export default function AgoraFoundations(){
 const [board,setBoard]=useState<Board|null>(null);
 const [selected,setSelected]=useState<string|null>(null);
 const [detail,setDetail]=useState<Detail|null>(null);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [refresh,setRefresh]=useState(0);
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();
  void fetch(api,{signal:controller.signal,cache:'no-store',credentials:'same-origin'})
   .then(async r=>{if(!r.ok)throw Error('Registro delle proposte non disponibile.');return r.json() as Promise<Board>;})
   .then(data=>{if(!controller.signal.aborted)setBoard(data);})
   .catch(()=>{if(!controller.signal.aborted)setError('Il registro delle proposte non è disponibile su questo servizio.');});
  return()=>controller.abort();
 },[refresh]);
 useEffect(()=>{
  if(!selected){setDetail(null);return;}
  const controller=new AbortController();
  void fetch(api+'?'+new URLSearchParams({proposalId:selected}),{signal:controller.signal,cache:'no-store',credentials:'same-origin'})
   .then(async r=>{if(!r.ok)throw Error('Proposta non disponibile');return r.json() as Promise<Detail>;})
   .then(data=>{if(!controller.signal.aborted)setDetail(data);})
   .catch(()=>{if(!controller.signal.aborted)setDetail(null);});
  return()=>controller.abort();
 },[selected,refresh]);
 async function act(payload:Record<string,unknown>){
  setBusy(true);setError('');
  try{
   const res=await fetch(api,{method:'POST',credentials:'same-origin',
    headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
   const out=await res.json() as {error?:string;status?:string};
   if(!res.ok)throw Error(out.error??'Operazione non autorizzata');
   setRefresh(n=>n+1);
   return out;
  }catch(e){setError(e instanceof Error?e.message:'Operazione non riuscita');throw e;}
  finally{setBusy(false);}
 }
 async function create(draft:NodeBlueprintDraft){
  const result=await act({action:'propose',draft});
  return result.status==='pending'
   ?'Proposta di nuovo nodo registrata con contenuto immutabile. Attende il voto dei PR2 di Agorà (PR3).'
   :'Proposta registrata.';
 }
 return <section id="agora-foundations" className="agora-foundations" aria-labelledby="agora-foundation-title">
  <header><p className="eyebrow">AGORÀ · COMPETENZA PR3</p>
   <h2 id="agora-foundation-title">Creazione comunitaria dei nodi</h2>
   <p>Solo i PR2 di Agorà, cioè PR3 quando operano sulla piattaforma, propongono e approvano la creazione di nodi. La proposta conserva il blueprint esatto e il corpo elettorale del momento; un voto non crea automaticamente database o account.</p>
  </header>
  {error?<p role="alert">{error}</p>:null}
  {notice?<p role="status">{notice}</p>:null}
  <NodeStudio spaceId="agora" onCreateNode={board?.canPropose?create:undefined}/>
  {board?<section aria-labelledby="agora-foundations-list-title">
   <h3 id="agora-foundations-list-title">Proposte di nuovi nodi</h3>
   {board.proposals.length===0?<p>Non ci sono ancora proposte registrate.</p>:null}
   <ol>{board.proposals.map(p=><li key={p.id}>
    <strong>{p.space_id}</strong> · {p.status} · elettori PR3: {p.electorate_size}
    <button type="button" onClick={()=>setSelected(selected===p.id?null:p.id)} aria-expanded={selected===p.id}>Esamina proposta</button>
   </li>)}</ol>
   {selected&&detail?<article className="node-studio-preview-block">
    <h4>Proposta per {detail.proposal.spaceId}</h4>
    <p>Digest immutabile: <code>{detail.proposal.digest}</code></p>
    <p>Stato: {detail.proposal.status}. Maggioranza richiesta: {detail.proposal.required} voti.</p>
    {detail.proposal.blueprint?<div>
     <h5>{detail.proposal.blueprint.name}</h5>
     <p>{detail.proposal.blueprint.topic} · {detail.proposal.blueprint.description}</p>
     <p>{detail.proposal.blueprint.sources.length} fonti · {detail.proposal.blueprint.blocks.length} blocchi editoriali</p>
     {detail.proposal.blueprint.blocks.map(block=><section key={block.id}><h5>{block.title}</h5><p>{block.body}</p></section>)}
    </div>:<p>Il contenuto integrale delle proposte non approvate è accessibile solo ai PR3 verificati.</p>}
    <p>Pareri registrati: {detail.proposal.counts.map(x=>x.choice+' '+x.count).join(' · ')||'nessuno'}</p>
    {board.canPropose&&detail.proposal.status==='pending'?<div role="group" aria-label="Voto sulla creazione del nodo">
     <button disabled={busy} type="button" onClick={()=>void act({action:'vote',proposalId:selected,choice:'yes'}).then(out=>setNotice(out.status==='approved'?'Proposta approvata. Richiede installazione verificata.':'Voto favorevole registrato.')).catch(()=>{})}>Approva la creazione</button>
     <button disabled={busy} type="button" onClick={()=>void act({action:'vote',proposalId:selected,choice:'no'}).then(()=>setNotice('Voto contrario registrato.')).catch(()=>{})}>Vota contro</button>
    </div>:null}
   </article>:null}
  </section>:<p role="status">Verifica del registro delle proposte…</p>}
 </section>;
}
