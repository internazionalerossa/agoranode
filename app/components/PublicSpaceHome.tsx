"use client";
import {useEffect,useMemo,useState,type CSSProperties} from 'react';
import {validatePublicSpaceSeed,type PublicSpaceSeed} from '../platform/public-space-seed';
import {PublicSpaceKnowledgePage,PublicSpaceRemoteSearch} from './PublicSpaceKnowledge';
import PublicSpaceLibrary from './PublicSpaceLibrary';
import {NODE_PRIMARY_TABS} from '../lib/node-primary-navigation';

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
 const currentView=typeof window!=='undefined'?new URL(window.location.href).searchParams.get('view'):null;
 const library=currentView==='biblioteca';
 const participation=currentView==='partecipa';
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
     {NODE_PRIMARY_TABS.map(tab=><a key={tab.id} href={'/n/'+spaceId+(tab.id==='notizie'?'':tab.id==='teoria'?'?view=biblioteca':'?view=partecipa')}
       aria-current={(tab.id==='notizie'&&!library&&!participation)||(tab.id==='teoria'&&library)||(tab.id==='partecipa'&&participation)?'page':undefined}>{tab.label}</a>)}
   </nav>
  </header>
  <main id="public-space-content">
   {view.state==='loading'?<p role="status">Caricamento del nodo…</p>:
    view.state==='not-found'?<section><h2>Nodo non pubblicato</h2><p>Questo spazio non è ancora installato su questo peer.</p></section>:
    view.state==='error'?<p role="alert">Impossibile verificare il manifesto di questo nodo.</p>:
    seed?<div className="public-space-main" style={{'--space-accent':seed.accent} as CSSProperties}>
     {library?<PublicSpaceLibrary seed={seed}/>:participation?<section className="agora-participation" aria-labelledby="public-space-community-title">
       <p className="eyebrow">AGORÀ · {seed.name}</p>
       <h2 id="public-space-community-title">Discussioni e proposte della comunità</h2>
       <p>Questo nodo condivide il formato dei moduli di partecipazione di PolisRossa, non i suoi utenti, voti o messaggi.</p>
       <p className="public-space-boundary">{seed.publication.notice}</p>
       <div className="public-space-content-grid">
        <article className="public-space-block"><h3>Discussioni</h3><p>Forum del nodo non attivato: nessun messaggio di PolisRossa viene riutilizzato.</p></article>
        <article className="public-space-block"><h3>Proposte</h3><p>La pubblicazione di nuove proposte richiede account e autorizzazioni propri del nodo.</p></article>
        <article className="public-space-block"><h3>Partecipazione</h3><p>I permessi PR1, PR2 e PR3 non sono attivati da un manifesto statico.</p></article>
       </div>
       <p>Puoi progettare modifiche e nuovi nodi nel <a href="/agora?view=partecipa#studio-agora">laboratorio comune Agorà</a>, senza trasferire privilegi.</p>
      </section>:<>
     <section className="public-space-intro">
      <p className="eyebrow">NODO TEMATICO · ANTEPRIMA PUBBLICA</p>
      <h2>{seed.name}</h2><p>{seed.description}</p>
      <p className="public-space-boundary">{seed.publication.notice}</p>
     </section>
     <section aria-labelledby="public-space-feed-title" className="agora-current-news">
      <h2 id="public-space-feed-title">La rassegna</h2>
      <p>La struttura di PolisRossa con fonti selezionabili per nodo. Il manifesto pubblico contiene i riferimenti, non un feed live: nessuna notizia o visualizzazione è inventata.</p>
      <label htmlFor="public-space-source-filter">Cerca una fonte</label>
      <input id="public-space-source-filter" type="search" maxLength={160} value={query}
       onChange={event=>setQuery(event.target.value)} placeholder="Nome della fonte o argomento"/>
      <div className="agora-feed-cards">
       {seed.sources.filter(source=>!query.trim()||[source.name,source.homepage].join(' ').toLocaleLowerCase('it').includes(query.trim().toLocaleLowerCase('it'))).map(source=><article className="agora-feed-card" key={source.id}>
        <h3>{source.name}</h3>
        {source.homepage?<p><a href={source.homepage} target="_blank" rel="noopener noreferrer">Sito originale ↗</a></p>:null}
        {source.feedUrl?<p><a href={source.feedUrl} target="_blank" rel="noopener noreferrer">Feed RSS/Atom ↗</a></p>:null}
       </article>)}
      </div>
      {seed.sources.length===0?<p>Non sono ancora state pubblicate fonti per questa rassegna.</p>:null}
      <h3>Video</h3>
      <p>I video verificati saranno disponibili quando l'operatore avrà configurato i relativi canali. I collegamenti del manifesto rimangono consultabili nella Biblioteca.</p>
     </section>
     <PublicSpaceKnowledgePage spaceId={spaceId}/>
     <section aria-labelledby="public-space-knowledge-title">
      <h2 id="public-space-knowledge-title">La conoscenza del nodo</h2>
      <p>Testi, fonti e racconti proposti nel manifesto di questo nodo. Questa anteprima non sostituisce un Atlante con revisioni e decisioni PR2.</p>
      <label htmlFor="node-public-search">Cerca fra le sezioni</label>
      <input id="node-public-search" type="search" value={query} maxLength={160}
        onChange={event=>setQuery(event.target.value)} placeholder="Argomento, autore, evento…"/>
      <PublicSpaceRemoteSearch spaceId={spaceId} query={query}/>
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
     </>}
    </div>:<p role="alert">Il manifesto del nodo non è disponibile.</p>}
  </main>
 </div>;
}
