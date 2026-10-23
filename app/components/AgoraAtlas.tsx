"use client";
import {useEffect,useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,CalendarDays,ExternalLink,FileText,Search,ShieldCheck} from 'lucide-react';
import {
  AGORA_ATLAS,AGORA_ATLAS_TIMELINE,AGORA_ATLAS_CATEGORIES,AGORA_READING,
  agoraAtlasEntry,agoraAtlasHref,type AgoraAtlasEntry,
} from '../instances/agora-atlante';

const STATUS:Record<AgoraAtlasEntry['state'],string>={
 alpha:'Contenuto alpha pubblicato',
 prototype:'Sottosistema in sperimentazione',
 planned:'Traguardo di progetto',
};
const CATEGORY_TYPES=AGORA_ATLAS_CATEGORIES;

function AtlasSource({title,url}:{title:string;url:string}){
 return <a href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">
   <span>{title}</span><ExternalLink size={13} aria-hidden="true"/>
 </a>;
}

function AtlasArticle({entry}:{entry:AgoraAtlasEntry}){
 const nearby=entry.relatesTo.map(id=>agoraAtlasEntry(id)).filter((value):value is AgoraAtlasEntry=>Boolean(value));
 return <section className="agora-atlas-page" aria-labelledby="agora-atlas-page-title">
  <div className="agora-atlas-page-top">
   <a href="/agora#atlante-agora" className="agora-atlas-back"><ArrowLeft size={16} aria-hidden="true"/> Torna all'Atlante</a>
   <span className="agora-atlas-state">{STATUS[entry.state]}</span>
  </div>
  <div className="agora-atlas-page-layout">
   <article className="agora-atlas-document">
    <header className="agora-atlas-document-header">
     <p className="eyebrow">{entry.category.toUpperCase()} · ATLANTE DELLA TECNOLOGIA</p>
     <h1 id="agora-atlas-page-title">{entry.title}</h1>
     <p className="agora-atlas-lead">{entry.abstract}</p>
     {entry.timeline?<p className="agora-atlas-time"><CalendarDays size={15} aria-hidden="true"/> {entry.timeline.period} · voce nel percorso narrativo</p>:<p className="agora-atlas-time"><BookOpen size={15} aria-hidden="true"/> Voce indicizzata · fuori dal percorso narrativo</p>}
    </header>
    {entry.timeline?<section className="agora-atlas-context" aria-label="Introduzione nella timeline">
      <p className="eyebrow">IL RACCONTO · {entry.timeline.period}</p>
      <p>{entry.timeline.narrative}</p>
     </section>:null}
    <div className="agora-atlas-prose">
     {entry.sections.map((section,i)=><section key={section.heading} id={'atlante-paragrafo-'+i} aria-labelledby={'atlante-paragrafo-title-'+i}>
      <h2 id={'atlante-paragrafo-title-'+i}>{section.heading}</h2>
      {section.paragraphs.map((paragraph,j)=><p key={j}>{paragraph}</p>)}
     </section>)}
    </div>
    <section className="agora-atlas-citations" aria-labelledby="agora-atlas-sources-title">
     <h2 id="agora-atlas-sources-title">Fonti e documentazione</h2>
     <p>Le informazioni di questa voce si riferiscono alle specifiche pubbliche di AgoraNode. Le fonti permettono di verificare lo stato di ciascuna funzione.</p>
     <ol>{entry.references.map(reference=><li key={reference.url}><AtlasSource {...reference}/></li>)}</ol>
    </section>
    <section className="agora-atlas-related" aria-labelledby="agora-atlas-related-title">
     <h2 id="agora-atlas-related-title">Continua a esplorare</h2>
     <div className="agora-atlas-related-grid">{nearby.map(item=><a key={item.id} href={agoraAtlasHref(item.id)+'#atlante-agora'}>
      <span className="eyebrow">{item.category}</span><strong>{item.title}</strong><ArrowRight size={16} aria-hidden="true"/>
     </a>)}</div>
    </section>
    <footer className="agora-atlas-publication">
     <p><ShieldCheck size={16} aria-hidden="true"/> Questa voce è un contenuto alpha revisionato nel repository. Non è un voto PR2 né una revisione finalizzata dalla rete BFT.</p>
     <p><a href="https://github.com/internazionalerossa/agoranode/commits/main/app/instances/agora-atlante.ts" target="_blank" rel="noopener noreferrer">Consulta la cronologia del testo nel codice sorgente ↗</a></p>
     <p><a href="/agora#studio-agora">Prepara una proposta di modifica nel Laboratorio Agorà →</a></p>
    </footer>
   </article>
   <aside className="agora-atlas-aside" aria-label="Indice della voce">
    <p className="eyebrow">IN QUESTA PAGINA</p>
    <nav><ol>{entry.sections.map((section,i)=><li key={section.heading}><a href={'#atlante-paragrafo-'+i}>{section.heading}</a></li>)}
      <li><a href="#agora-atlas-sources-title">Fonti</a></li>
      <li><a href="#agora-atlas-related-title">Collegamenti</a></li>
     </ol></nav>
     <a className="agora-atlas-aside-back" href="/agora#percorso-agora">Apri la timeline del nodo <ArrowRight size={15} aria-hidden="true"/></a>
   </aside>
  </div>
 </section>;
}
function AtlasTimeline(){
 return <section className="agora-atlas-timeline" id="percorso-agora" aria-labelledby="percorso-agora-title">
  <header className="agora-atlas-section-intro">
   <p className="eyebrow">IL PERCORSO · 2026</p>
   <h2 id="percorso-agora-title">Dalla prima comunità alla conoscenza in rete.</h2>
   <p>Una storia del progetto attraverso passaggi tecnici verificabili. Ogni tappa presenta un racconto e apre la propria voce di approfondimento. Le altre voci rimangono comunque nell’Atlante.</p>
  </header>
  <ol className="agora-atlas-timeline-list">{AGORA_ATLAS_TIMELINE.map((entry,i)=>
   <li className="agora-atlas-timeline-step" key={entry.id}>
    <div className="agora-atlas-track" aria-hidden="true"><span>{String(i+1).padStart(2,'0')}</span></div>
    <article className="agora-atlas-timeline-entry">
     <p className="eyebrow">{entry.timeline!.period} · {entry.category}</p>
     <h3><a href={agoraAtlasHref(entry.id)+'#atlante-agora'}>{entry.title}</a></h3>
     <p>{entry.timeline!.narrative}</p>
     <a className="agora-atlas-more" href={agoraAtlasHref(entry.id)+'#atlante-agora'}>Leggi la pagina e le fonti <ArrowRight size={16} aria-hidden="true"/></a>
    </article>
   </li>)}</ol>
 </section>;
}

function TechnicalLibrary(){
 return <section className="agora-atlas-library" id="biblioteca-agora" aria-labelledby="biblioteca-agora-title">
  <header className="agora-atlas-section-intro">
   <p className="eyebrow">LA BIBLIOTECA TECNICA</p>
   <h2 id="biblioteca-agora-title">Parti dal progetto. Approfondisci le scelte.</h2>
   <p>Documenti tecnici realmente conservati nel repository pubblico. Puoi leggerli e consultare la cronologia su GitHub; non si dichiara che libri di terzi siano replicati localmente senza diritti.</p>
  </header>
  <div className="agora-atlas-reading-grid">{AGORA_READING.map(item=><article className="agora-atlas-reading-card" key={item.id}>
   <span className="agora-atlas-reading-number">{item.label}</span>
   <p className="eyebrow">{item.genre}</p>
   <h3>{item.title}</h3><p>{item.description}</p>
   <a href={item.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Apri il documento <ExternalLink size={15} aria-hidden="true"/></a>
  </article>)}</div>
 </section>;
}

/**
 * The technology Atlas is loaded from the project's own published, reviewed
 * source. Client-side search covers every entry, irrespective of timeline
 * inclusion. No hidden database write, PR2, or federation claims.
 */
export default function AgoraAtlas(){
 const [selected,setSelected]=useState<string|null>(()=>typeof window==='undefined'?null:new URL(window.location.href).searchParams.get('atlante'));
 const [query,setQuery]=useState('');
 const [category,setCategory]=useState<(typeof CATEGORY_TYPES)[number]>('Tutti');
 useEffect(()=>{
  const sync=()=>setSelected(new URL(window.location.href).searchParams.get('atlante'));
  window.addEventListener('popstate',sync);
  return()=>window.removeEventListener('popstate',sync);
 },[]);
 const matches=useMemo(()=>{
  const q=query.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('it').trim();
  return AGORA_ATLAS.filter(entry=>{
   if(category!=='Tutti'&&entry.category!==category)return false;
   const content=[entry.title,entry.abstract,entry.category,...entry.sections.flatMap(s=>[s.heading,...s.paragraphs])]
      .join(' ').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('it');
   return !q||q.split(/\s+/).every(term=>content.includes(term));
  });
 },[query,category]);
 const entry=selected?agoraAtlasEntry(selected):null;
 return <div className="agora-atlas-root" id="atlante-agora">
   {selected?entry?<AtlasArticle entry={entry}/>:<section className="agora-atlas-missing" role="status">
    <h2>Questa voce non è presente nell’Atlante.</h2><p>Potrebbe non essere stata ancora scritta o aver cambiato identificatore.</p>
    <a href="/agora#atlante-agora">Torna all’indice completo</a>
   </section>:<>
    <section className="agora-atlas-index" aria-labelledby="atlante-agora-title">
     <div className="agora-atlas-section-intro">
      <p className="eyebrow">CONOSCENZA CON FONTI · NODO ORIGINARIO</p>
      <h2 id="atlante-agora-title">L’Atlante di Agorà</h2>
      <p>Le idee, i sistemi, gli strumenti e le decisioni dietro AgoraNode. Tutte le voci sono ricercabili; soltanto alcune compongono il racconto principale.</p>
     </div>
     <div className="agora-atlas-filters">
      <label><Search size={16} aria-hidden="true"/> Cerca una voce
       <input type="search" maxLength={120} placeholder="Un concetto, una tecnologia, un processo…" value={query}
        onChange={event=>setQuery(event.currentTarget.value)}/></label>
      <label>Area tematica
       <select value={category} onChange={event=>setCategory(event.currentTarget.value as typeof category)}>
        {CATEGORY_TYPES.map(name=><option key={name} value={name}>{name}</option>)}
       </select>
      </label>
     </div>
     <p className="agora-atlas-count" role="status">{matches.length} {matches.length===1?'voce trovata':'voci trovate'} nell’Atlante</p>
     <div className="agora-atlas-entry-grid">
      {matches.map((item,i)=><article className="agora-atlas-entry-card" key={item.id}>
       <div className="agora-atlas-card-meta"><span className="agora-atlas-card-number">{String(i+1).padStart(2,'0')}</span><span>{item.category}</span></div>
       <h3><a href={agoraAtlasHref(item.id)+'#atlante-agora'}>{item.title}</a></h3>
       <p>{item.abstract}</p>
       <div className="agora-atlas-card-footer">
        <span>{item.timeline?'Nel percorso narrativo':'Voce consultabile'}</span>
        <a href={agoraAtlasHref(item.id)+'#atlante-agora'} aria-label={'Leggi la voce '+item.title}><ArrowRight size={17} aria-hidden="true"/></a>
       </div>
      </article>)}
     </div>
     {matches.length===0?<p className="agora-atlas-empty">Non ci sono voci con questi termini. Prova una parola diversa.</p>:null}
    </section>
    <AtlasTimeline/>
    <TechnicalLibrary/>
   </>}
 </div>;
}
