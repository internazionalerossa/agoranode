"use client";
import {useEffect,useMemo,useState,type CSSProperties} from 'react';
import {validatePublicSpaceSeed,type PublicSpaceSeed} from '../platform/public-space-seed';

type ViewState={state:'loading'|'not-found'|'error'}|{state:'ready';seed:PublicSpaceSeed};
const LABELS={
 heading:'Capitolo',paragraph:'Approfondimento',timeline:'Timeline',source:'Fonte',
 book:'Biblioteca',video:'Video',data:'Dati',
} as const;

/**
 * Same public UI for any operator-provisioned thematic seed. It cannot create
 * privileged accounts or publish content; those require the community API and
 * valid PR2 authorization. The reader's view is always read-only.
 */
export default function PublicSpaceHome({spaceId}:{spaceId:string}){
 const [view,setView]=useState<ViewState>({state:'loading'});
 const [query,setQuery]=useState('');
 useEffect(()=>{
  const controller=new AbortController();
  setView({state:'loading'});
  void fetch('/api/public-spaces/'+encodeURIComponent(spaceId),{
    cache:'no-store',signal:controller.signal,headers:{accept:'application/json'},
  }).then(async response=>{
    if(response.status===404){setView({state:'not-found'});return;}
    if(!response.ok)throw Error('Public space unavailable');
    const seed=validatePublicSpaceSeed(await response.json());
    if(seed.spaceId!==spaceId)throw Error('Public space ID mismatch');
    if(!controller.signal.aborted)setView({state:'ready',seed});
  }).catch(()=>{if(!controller.signal.aborted)setView({state:'error'});});
  return()=>controller.abort();
 },[spaceId]);
 const seed=view.state==='ready'?view.seed:null;
 const blocks=useMemo(()=>seed?seed.blocks.filter(block=>
   !query.trim()||[block.title,block.body,block.kind].join(' ').toLocaleLowerCase('it')
     .includes(query.trim().toLocaleLowerCase('it'))):[],[seed,query]);
 return <div className="app-shell generic-node-shell">
  <a href="#public-space-content" className="skip-link">Vai ai contenuti</a>
  <header className="public-space-header">
   <a href="/" aria-label="Torna all'elenco dei nodi">AgoràNode · Nodi</a>
   {seed?<><h1>{seed.name}</h1><p>{seed.topic}</p></>:<h1>Nodo tematico</h1>}
   <nav aria-label="Navigazione del nodo">
     <a href="#public-space-content">Conoscenza</a>
     <a href="#public-space-sources">Fonti</a>
     <a href="/agora">Agorà</a>
   </nav>
  </header>
  <main id="public-space-content">
   {view.state==='loading'?<p role="status">Caricamento del nodo…</p>:
    view.state==='not-found'?<section><h2>Nodo non pubblicato</h2><p>Questo spazio non è ancora installato su questo peer.</p></section>:
    view.state==='error'?<p role="alert">Impossibile verificare il manifesto di questo nodo.</p>:
    seed?<div className="public-space-main" style={{'--space-accent':seed.accent} as CSSProperties}>
     <section className="public-space-intro">
      <p className="eyebrow">NODO TEMATICO · ANTEPRIMA PUBBLICA</p>
      <h2>{seed.name}</h2><p>{seed.description}</p>
      <p className="public-space-boundary">{seed.publication.notice}</p>
     </section>
     <section aria-labelledby="public-space-knowledge-title">
      <h2 id="public-space-knowledge-title">La conoscenza del nodo</h2>
      <p>Testi, fonti e racconti proposti nel manifesto di questo nodo. Questa anteprima non sostituisce una wiki con revisioni e decisioni PR2.</p>
      <label htmlFor="node-public-search">Cerca fra le sezioni</label>
      <input id="node-public-search" type="search" value={query} maxLength={160}
        onChange={event=>setQuery(event.target.value)} placeholder="Argomento, autore, evento…"/>
      <div className="public-space-content-grid">{blocks.map(block=>
       <article key={block.id} className="public-space-block" id={'node-block-'+block.id}>
        <p className="eyebrow">{LABELS[block.kind]}</p><h3>{block.title}</h3>
        <p style={{whiteSpace:'pre-line'}}>{block.body}</p>
        {block.url?<a href={block.url} target="_blank" rel="noopener noreferrer">Fonte originale ↗</a>:null}
       </article>)}</div>
      {blocks.length===0?<p role="status">Nessun contenuto corrispondente in questa anteprima.</p>:null}
     </section>
     <section id="public-space-sources"><h2>Fonti del nodo</h2>
      <ul>{seed.sources.map(source=><li key={source.id}>
       <strong>{source.name}</strong>
       {source.homepage?<a href={source.homepage} target="_blank" rel="noopener noreferrer">Visita la fonte ↗</a>:null}
       {source.feedUrl?<a href={source.feedUrl} target="_blank" rel="noopener noreferrer">RSS/Atom ↗</a>:null}
      </li>)}</ul>
      {seed.sources.length===0?<p>Le fonti sono ancora in preparazione.</p>:null}
     </section>
    </div>:<p role="alert">Il manifesto del nodo non è disponibile.</p>}
  </main>
 </div>;
}
