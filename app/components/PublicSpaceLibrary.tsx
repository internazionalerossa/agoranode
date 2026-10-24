"use client";
import {useMemo,useState} from 'react';
import type {PublicSpaceSeed} from '../platform/public-space-seed';
import {
 thematicLibraryHref,thematicLibraryLocationFromUrl,
} from '../lib/thematic-library-navigation';
import {LibraryPrimaryTabs,LibraryTimelineTabs} from './LibraryNavigationTabs';
import {PublicSpaceKnowledgePage,PublicSpaceRemoteSearch} from './PublicSpaceKnowledge';

const INDEXABLE=new Set(['heading','paragraph','timeline','source','book','video','data','atlas','bibliography']);
export default function PublicSpaceLibrary({seed}:{seed:PublicSpaceSeed}){
 const spaceId=seed.spaceId;
 const location=thematicLibraryLocationFromUrl(
  typeof window==='undefined'?'/n/'+spaceId+'?view=biblioteca':window.location.href,spaceId);
 const [query,setQuery]=useState('');
 const entries=useMemo(()=>seed.blocks.filter(block=>INDEXABLE.has(block.kind)),[seed]);
 const selected=location.articleId?entries.find(block=>block.id===location.articleId):null;
 const filtered=useMemo(()=>entries.filter(block=>
  !query.trim()||[block.title,block.body,block.kind].join(' ')
   .toLocaleLowerCase('it').includes(query.trim().toLocaleLowerCase('it'))),[entries,query]);
 const books=seed.blocks.filter(block=>block.kind==='book'||block.kind==='source'||block.kind==='bibliography');
 const datasets=seed.blocks.filter(block=>block.kind==='data');
 const timeline=seed.blocks.filter(block=>block.kind==='timeline');
 const safeHref=(url:string):string|null=>{
  try{const parsed=new URL(url);return parsed.protocol==='https:'&&!parsed.username&&!parsed.password?parsed.href:null;}
  catch{return null;}
 };
 return <section className="agora-library public-space-library" aria-labelledby="public-space-library-title">
  <header className="agora-library-heading">
   <p className="eyebrow">BIBLIOTECA · {seed.name}</p>
   <h1 id="public-space-library-title">La biblioteca</h1>
   <p>Libri e percorsi, conoscenza raccontata e ricercabile, dati e grafici: lo stesso percorso di consultazione di ogni nodo AgoràNode.</p>
  </header>
  <LibraryPrimaryTabs destination={location.destination}
    href={destination=>thematicLibraryHref(spaceId,destination)}/>
  {location.destination==='libri'?<section className="atlas-library-books" aria-labelledby="public-space-books-title">
   <h2 id="public-space-books-title">Libri e percorsi</h2>
   <p>Opere e fonti inserite nel manifesto pubblico del nodo. I collegamenti esterni non implicano che il file sia ospitato o scaricabile qui.</p>
   {books.length?<div className="atlas-library-cards">{books.map(book=><article key={book.id}>
    <h3>{book.title}</h3>
    <p style={{whiteSpace:'pre-line'}}>{book.body}</p>
    {book.url&&safeHref(book.url)?<a href={safeHref(book.url)!} target="_blank" rel="noopener noreferrer">Apri la fonte originale ↗</a>:null}
    <p><a href={thematicLibraryHref(spaceId,'timeline','indice',book.id)}>Apri la voce dell'Atlante →</a></p>
   </article>)}</div>:<p>Questo nodo non ha ancora opere o fonti bibliografiche pubblicate nel suo manifesto.</p>}
  </section>:
  location.destination==='dati'?<section className="atlas-library-data" aria-labelledby="public-space-data-title">
   <h2 id="public-space-data-title">Dati e grafici</h2>
   <p>Le voci di dati sono rese consultabili con i riferimenti originali. Un grafico compare solo quando sono disponibili unità e serie effettivamente verificate.</p>
   {datasets.length?<div className="atlas-library-cards">{datasets.map(entry=><article key={entry.id}>
    <h3>{entry.title}</h3><p style={{whiteSpace:'pre-line'}}>{entry.body}</p>
    {entry.url&&safeHref(entry.url)?<a href={safeHref(entry.url)!} target="_blank" rel="noopener noreferrer">Fonte originale ↗</a>:null}
   </article>)}</div>:<p>Non sono stati ancora pubblicati dataset per questo nodo.</p>}
  </section>:<>
   <LibraryTimelineTabs mode={location.display}
    href={mode=>thematicLibraryHref(spaceId,'timeline',mode)}/>
   {location.articleId&&!selected?<p role="alert">Questa voce non risulta nel manifesto pubblico del nodo.</p>:null}
   {selected?<article className="atlas-article" aria-labelledby="public-space-seed-entry-title">
    <p className="eyebrow">ATLANTE · VOCE PUBBLICATA</p>
    <h2 id="public-space-seed-entry-title">{selected.title}</h2>
    <p style={{whiteSpace:'pre-line'}}>{selected.body}</p>
    {selected.url&&safeHref(selected.url)?<p><a href={safeHref(selected.url)!} target="_blank" rel="noopener noreferrer">Fonte originale ↗</a></p>:null}
    <p>Questa è una voce del manifesto di consultazione del nodo. Il suo salvataggio non certifica una votazione PR2.</p>
    <a href={thematicLibraryHref(spaceId,'timeline','indice')}>← Torna all'indice</a>
   </article>:location.articleId?null:location.display==='racconto'?
    <section className="atlas-timeline" aria-labelledby="public-space-timeline-title">
     <header><h2 id="public-space-timeline-title">Timeline narrativa</h2>
      <p>Le tappe sono quelle selezionate dal manifesto di consultazione. Le altre voci restano ricercabili nell'Atlante.</p>
     </header>
     {timeline.length?<div className="atlas-timeline-events">{timeline.map((entry,index)=>
      <article className="atlas-timeline-event" key={entry.id}>
       <div className="atlas-timeline-time"><strong>Tappa {index+1}</strong></div>
       <div className="atlas-timeline-prose">
        <h3>{entry.title}</h3><p style={{whiteSpace:'pre-line'}}>{entry.body}</p>
        <a href={thematicLibraryHref(spaceId,'timeline','indice',entry.id)}>Leggi la voce e le fonti →</a>
       </div>
      </article>)}</div>:<p>La comunità non ha ancora pubblicato tappe nella timeline.</p>}
    </section>:
    <section className="atlas-index" aria-labelledby="public-space-index-title">
     <h2 id="public-space-index-title">Atlante · Indice e ricerca</h2>
     <p>Trova una voce pubblicata del nodo, anche se non è stata selezionata per la timeline narrativa.</p>
     <label htmlFor="public-space-atlas-query">Cerca una voce per titolo o argomento</label>
     <input id="public-space-atlas-query" type="search" value={query} maxLength={160}
      onChange={event=>setQuery(event.currentTarget.value)} placeholder="Cerca nella conoscenza del nodo…"/>
     <PublicSpaceRemoteSearch spaceId={spaceId} query={query}/>
     <p role="status">{filtered.length} {filtered.length===1?'voce nel manifesto':'voci nel manifesto'}</p>
     {filtered.length?<ul className="atlas-index-list">{filtered.map(entry=><li key={entry.id}>
      <a href={thematicLibraryHref(spaceId,'timeline','indice',entry.id)}>
       <strong>{entry.title}</strong><span>{entry.body.slice(0,240)}</span>
      </a>
     </li>)}</ul>:<p>Nessuna voce corrisponde ai filtri attuali.</p>}
     <PublicSpaceKnowledgePage spaceId={spaceId}/>
    </section>}
  </>}
 </section>;
}
