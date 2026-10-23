"use client";
import {useMemo,useState} from 'react';
import {ArrowLeft,ArrowUpRight,BookOpen,Download,Search} from 'lucide-react';
import {AGORA_ATLANTE,AGORA_ATLANTE_BY_ID} from '../instances/agora-atlante';
import {atlasMarkdown,atlasSearch,atlasTimeline,type AtlasEntry} from '../lib/thematic-atlas';
import {
 thematicLibraryHref,thematicLibraryLocationFromUrl,
} from '../lib/thematic-library-navigation';
import {LibraryPrimaryTabs,LibraryTimelineTabs} from './LibraryNavigationTabs';

const verifiedExternal=(raw:string):string|null=>{
 try{const url=new URL(raw);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}
 catch{return null;}
};
function LibraryIndex({selected}:{selected:AtlasEntry|null}){
 const [query,setQuery]=useState('');
 const results=useMemo(()=>query.trim()
   ?atlasSearch(AGORA_ATLANTE,query):[...AGORA_ATLANTE].sort((a,b)=>a.title.localeCompare(b.title,'it')),[query]);
 return <section className="atlas-index" aria-label="Atlante, indice e ricerca">
  <header><p className="eyebrow">TUTTE LE VOCI · NON SOLTANTO LA TIMELINE</p>
   <h2>Indice e ricerca dell'Atlante</h2>
   <p>Ogni voce è consultabile anche quando non è stata selezionata per il Percorso narrativo.
    Le fonti e i collegamenti consentono di seguire un tema senza conoscere strumenti wiki.</p>
  </header>
  <label htmlFor="agora-atlas-query"><Search size={16} aria-hidden="true"/> Cerca un articolo per parola, argomento o titolo</label>
  <input id="agora-atlas-query" type="search" value={query} onChange={e=>setQuery(e.currentTarget.value)}
   maxLength={200} placeholder="Es. privacy, federazione, biblioteca, PolisRossa…"/>
  <p role="status">{results.length} {results.length===1?'voce disponibile':'voci disponibili'}</p>
  <ul className="atlas-index-list">{results.map(entry=><li key={entry.id}>
   <a href={thematicLibraryHref('agora','timeline','indice',entry.id)}
      aria-current={selected?.id===entry.id?'page':undefined}>
    <strong>{entry.title}</strong><span>{entry.timeline?'Nel Percorso · ':'Voce di approfondimento · '}{entry.summary}</span>
   </a>
  </li>)}</ul>
  {results.length===0?<p>Non ci sono risultati: prova una parola differente.</p>:null}
 </section>;
}
function AtlasArticle({entry}:{entry:AtlasEntry}){
 const download=()=>{
  const text=atlasMarkdown(entry);
  const blob=new Blob([text],{type:'text/markdown;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='atlante-agora-'+entry.id+'.md';
  a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);
 };
 return <article className="atlas-article" id="atlas-article" aria-labelledby="atlas-article-title">
  <p className="eyebrow">ATLANTE · VOCE DI APPROFONDIMENTO · AGORÀ</p>
  <h2 id="atlas-article-title" tabIndex={-1}>{entry.title}</h2>
  <p className="atlas-article-lead">{entry.summary}</p>
  {entry.timeline?<p className="atlas-article-period">{entry.timeline.period} · {entry.timeline.place}</p>:null}
  {entry.sections.map(section=><section key={section.heading}>
   <h3>{section.heading}</h3>{section.paragraphs.map((paragraph,i)=><p key={i}>{paragraph}</p>)}
  </section>)}
  <section className="atlas-article-sources"><h3>Fonti e riferimenti</h3>
   <ol>{entry.sources.map(source=><li key={source.url}>
    <a href={verifiedExternal(source.url)??'#atlas-article-title'} target="_blank" rel="noopener noreferrer">{source.label} <ArrowUpRight size={14} aria-hidden="true"/></a>
    <p>{source.context}</p>
   </li>)}</ol>
  </section>
  <section className="atlas-article-related"><h3>Voci collegate</h3><ul>
   {entry.related.map(id=>{
    const related=AGORA_ATLANTE_BY_ID.get(id);
    return related?<li key={id}><a href={thematicLibraryHref('agora','timeline','indice',id)}>{related.title}</a></li>:null;
   })}
  </ul></section>
  <p className="atlas-article-status">Edizione iniziale pubblicata nel repository. Le decisioni PR2 future richiederanno un flusso di revisione, voto e attribuzioni verificabili.</p>
  <button type="button" className="atlas-download" onClick={download}><Download size={16} aria-hidden="true"/> Salva questa voce in Markdown</button>
  <p><a href={thematicLibraryHref('agora','timeline','indice')}><ArrowLeft size={15} aria-hidden="true"/> Torna all'indice dell'Atlante</a></p>
 </article>;
}
function NarrativeTimeline(){
 const entries=atlasTimeline(AGORA_ATLANTE);
 return <section className="atlas-timeline" aria-labelledby="agora-timeline-title">
  <header><p className="eyebrow">UNA STORIA DELLA TECNOLOGIA COMUNE</p>
   <h2 id="agora-timeline-title">Dall'esperimento al nodo origine</h2>
   <p>Questa è una selezione di voci, raccontate in ordine e collegate alle rispettive fonti.
    Le altre pagine restano disponibili nell'Atlante. La selezione iniziale è editoriale;
    la futura pubblicazione delle decisioni PR2 non è ancora automatizzata.</p>
  </header>
  <div className="atlas-timeline-events">{entries.map(entry=><article className="atlas-timeline-event" key={entry.id}>
    <div className="atlas-timeline-time">
     <strong>{entry.timeline!.period}</strong><span>{entry.timeline!.place}</span>
    </div>
    <div className="atlas-timeline-prose">
     <h3>{entry.title}</h3>
     <p>{entry.timeline!.introduction}</p>
     <a href={thematicLibraryHref('agora','timeline','indice',entry.id)}>Leggi la voce e le fonti <ArrowUpRight size={14} aria-hidden="true"/></a>
    </div>
  </article>)}</div>
 </section>;
}
function BooksAndPaths(){
 const guides=AGORA_ATLANTE.filter(entry=>entry.kind==='guide'||entry.kind==='technical-document');
 const resources=[{title:'Architettura tecnica',url:'https://github.com/internazionalerossa/agoranode/blob/main/docs/ARCHITECTURE.md',
  description:'Componenti, confini e avvio dello stack'},
  {title:'Rete custodita dai peer',url:'https://github.com/internazionalerossa/agoranode/blob/main/docs/PEER-OWNED-ARCHITECTURE.md',
   description:'Pubblicazione e conservazione della conoscenza pubblica'},
  {title:'Creare un nodo tematico',url:'https://github.com/internazionalerossa/agoranode/blob/main/docs/THEMATIC-BOOTSTRAP.md',
   description:'Dal laboratorio a una pagina pubblica verificabile'}];
 return <section className="atlas-library-books" aria-label="Libri e percorsi di lettura">
  <header><p className="eyebrow">TESTI · DOCUMENTI · CAMMINI DI LETTURA</p><h2>Libri e percorsi</h2>
   <p>Il primo catalogo di Agorà comprende guide e documentazione originale del progetto.
    I libri e le edizioni esterne saranno catalogati indicando licenza e disponibilità reale,
    senza dichiarare scaricabili file che questo nodo non conserva.</p>
  </header>
  <div className="atlas-library-cards">
   {guides.map(entry=><article key={entry.id}>
    <BookOpen size={24} aria-hidden="true"/><h3>{entry.title}</h3><p>{entry.summary}</p>
    <a href={thematicLibraryHref('agora','timeline','indice',entry.id)}>Leggi nell'Atlante →</a>
   </article>)}
   {resources.map(item=><article key={item.url}>
    <BookOpen size={24} aria-hidden="true"/><h3>{item.title}</h3><p>{item.description}</p>
    <a href={item.url} target="_blank" rel="noopener noreferrer">Apri il documento originale ↗</a>
   </article>)}
  </div>
 </section>;
}
function DataAndCharts(){
 const timelineCount=atlasTimeline(AGORA_ATLANTE).length;
 const entries=AGORA_ATLANTE.length;
 return <section className="atlas-library-data" aria-labelledby="agora-data-title">
  <header><p className="eyebrow">DATI TRACCIABILI · NON STIME DELLA RETE</p><h2 id="agora-data-title">Dati e grafici</h2>
   <p>Per questa edizione mostriamo soltanto conteggi ricavabili dal catalogo editoriale.
    Non sono statistiche di traffico o di peer attivi, e non attestano la disponibilità del servizio.</p>
  </header>
  <div className="atlas-library-metrics">
   <div><strong>{entries}</strong><span>Voci dell'Atlante</span></div>
   <div><strong>{timelineCount}</strong><span>Tappe nel Percorso</span></div>
   <div><strong>{entries-timelineCount}</strong><span>Voci consultabili fuori dal Percorso</span></div>
  </div>
  <figure><figcaption>Selezione delle voci del catalogo editoriale di questa edizione</figcaption>
   <div className="atlas-library-bars" role="img" aria-label={timelineCount+' voci selezionate nel Percorso su '+entries+' pubblicate'}>
    <span style={{width:(timelineCount/entries*100)+'%'}}/>
   </div>
   <p>{timelineCount} / {entries} voci nel percorso narrativo · conteggio estratto dall'indice pubblico Agorà, non da un servizio di analisi utenti.</p>
  </figure>
  <p>Per misure di latenza, disponibilità e consumi dei peer consulta i <a href="https://github.com/internazionalerossa/agoranode/blob/main/docs/QUALITY.md" target="_blank" rel="noopener noreferrer">criteri di collaudo</a>. Verranno mostrate serie solo quando saranno state misurate con una metodologia verificabile.</p>
 </section>;
}
export default function AgoraLibraryView(){
 const location=thematicLibraryLocationFromUrl(typeof window==='undefined'?'/agora?view=biblioteca':window.location.href,'agora');
 const selected=location.articleId?AGORA_ATLANTE_BY_ID.get(location.articleId)??null:null;
 return <section className="agora-library" id="agora-library" aria-labelledby="agora-library-title">
  <header className="agora-library-heading">
   <p className="eyebrow">BIBLIOTECA · AGORÀ BY AGORÀNODE</p>
   <h1 id="agora-library-title">La biblioteca</h1>
   <p>Tre modi per esplorare la conoscenza: letture e documenti, una storia narrativa con le sue voci, dati e grafici.</p>
  </header>
  <LibraryPrimaryTabs destination={location.destination} href={destination=>thematicLibraryHref('agora',destination)}/>
  {location.destination==='libri'?<BooksAndPaths/>:
   location.destination==='dati'?<DataAndCharts/>:<>
    <LibraryTimelineTabs mode={location.display} href={mode=>thematicLibraryHref('agora','timeline',mode)}/>
    {selected?<AtlasArticle entry={selected}/>:
     location.articleId?<p role="alert">Voce non trovata. <a href={thematicLibraryHref('agora','timeline','indice')}>Torna all'indice</a>.</p>:
     location.display==='racconto'?<NarrativeTimeline/>:<LibraryIndex selected={selected}/>}
   </>}
 </section>;
}
