"use client";
import {useEffect, useRef, useState} from 'react';
import {ArrowUpRight, BookOpen, Clock} from 'lucide-react';
import DATA from '@/app/data/history-dossiers.json';
import {HISTORY_INDEX,historyId,historyLink} from '@/app/lib/history-navigation';
import {THEORY_LIBRARY} from '@/app/data/library';
import {libraryReadingDestination} from '@/app/lib/library-reading';
import {LocalizedText as T,useReadingLocale} from './Localization';

type HistoricalSource = typeof DATA.sources[keyof typeof DATA.sources];
const sources: Record<string,HistoricalSource> = DATA.sources;
function SourceLinks({ids}: {ids:string[]}) {
  return <p className="history-citations">{[...new Set(ids)].map(id => {const source=sources[id];return source ? <a key={id} href={source.url} target="_blank" rel="noopener noreferrer" title={source.locator}><T defer>{source.publisher}</T><span> · <T defer>{source.locator || source.title}</T></span><ArrowUpRight size={12}/></a> : null;})}</p>;
}
export default function HistoricalDossiers() {
  const [selected,setSelected] = useState('italia');
  const heading = useRef<HTMLHeadingElement>(null);
  const locale = useReadingLocale();
  useEffect(() => {
    const sync=()=>{const id=historyId(new URL(location.href).searchParams.get('storia'));if(id)setSelected(id);};
    sync();window.addEventListener('popstate',sync);window.addEventListener('hashchange',sync);return()=>{window.removeEventListener('popstate',sync);window.removeEventListener('hashchange',sync);};
  },[]);
  useEffect(()=>{const url=new URL(location.href);if(historyId(url.searchParams.get('storia'))!==selected||(url.hash&&!url.hash.startsWith('#dossier-')))return;const frame=requestAnimationFrame(()=>{heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:'start',behavior:'instant'});});return()=>cancelAnimationFrame(frame);},[selected]);
  const choose = (id:string) => {
    if(!historyId(id))return;
    setSelected(id);
    const url=new URL(historyLink(id),location.origin);
    history.pushState(history.state,'',url);
    requestAnimationFrame(()=>{heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:'start',behavior:'auto'});});
  };
  const dossier = DATA.dossiers.find(item => item.id === selected) ?? DATA.dossiers[0];
  const bibliography=[...new Set([...dossier.sections.flatMap(item=>item.sources),...dossier.timeline.map(item=>item.source),...dossier.changes.map(item=>item.source),...dossier.metrics.map(item=>item.source)])];
  return <section className="history-dossiers" aria-label="Approfondimenti storici">
    <label className="history-dossier-select"><span><T>Scegli un approfondimento storico</T></span><select value={selected} onChange={event=>choose(event.target.value)}>{HISTORY_INDEX.map(item=><option key={item.id} value={item.id}><T>{item.country}</T> · <T content>{item.title}</T></option>)}</select></label>
    <article id={"dossier-"+dossier.id} className="history-article" key={dossier.id} aria-labelledby="history-article-title">
      <header className="history-article-header"><p className="eyebrow"><T content>{dossier.country}</T> / <T>{dossier.period}</T></p><h3 id="history-article-title" ref={heading} tabIndex={-1}><T>{dossier.title}</T></h3><p className="history-deck"><T content>{dossier.deck}</T></p><p className="history-article-meta"><span><Clock size={14}/>{dossier.minutes} <T>min di lettura circa</T></span><a href={historyLink(dossier.id)}><T>Link a questo dossier</T><ArrowUpRight size={14}/></a></p><p className="history-intro"><T content>{dossier.intro}</T></p></header>
      {dossier.metrics.length>0 && <div className="history-metrics">{dossier.metrics.map(metric=><div key={metric.label}><strong><T defer>{metric.value}</T></strong><h4><T content defer>{metric.label}</T></h4><p><T content defer>{metric.note}</T></p><SourceLinks ids={[metric.source]}/></div>)}</div>}
      <div className="history-article-layout">
        <details className="history-outline"><summary><T>Indice del dossier</T></summary><ol>{dossier.sections.map(section=><li key={section.id}><a href={`#${dossier.id}-${section.id}`}><T defer>{section.title}</T></a></li>)}</ol>{dossier.timeline.length>0&&<a href={`#${dossier.id}-cronologia`}><T>Cronologia</T></a>}<a href={`#${dossier.id}-documenti`}><T>Documenti e fonti</T></a></details>
        <div className="history-prose">
          {dossier.sections.map((section,index)=><section id={`${dossier.id}-${section.id}`} key={section.id}><span className="history-chapter-number">{String(index+1).padStart(2,'0')}</span><h4><T content defer>{section.title}</T></h4>{section.paragraphs.map((paragraph,i)=><p key={i}><T content defer>{paragraph}</T></p>)}<SourceLinks ids={section.sources}/></section>)}
          {dossier.changes.length>0&&<section className="history-changes"><h4><T content>Che cosa cambia</T></h4><div className="history-change-heading" aria-hidden="true"><span><T>La condizione di partenza</T></span><span><T>La trasformazione</T></span></div>{dossier.changes.map((change,index)=><div className="history-change" key={index}><p><small><T>Prima</T></small><T defer>{change.before}</T></p><p><small><T>Il cambiamento</T></small><T defer>{change.after}</T></p><SourceLinks ids={[change.source]}/></div>)}</section>}
          {dossier.timeline.length>0&&<section id={`${dossier.id}-cronologia`} className="history-timeline"><h4><T content>Le tappe</T></h4><ol>{dossier.timeline.map((event,index)=><li key={index}><strong><T defer>{event.date}</T></strong><div><p>{"eventId" in event&&typeof event.eventId==="string"?<a href={"#"+event.eventId}><T content defer>{event.text}</T></a>:<T content defer>{event.text}</T>}</p><SourceLinks ids={[event.source]}/></div></li>)}</ol></section>}
          {dossier.readings.length>0 && <section className="history-readings"><h4><T content>Dalla storia ai libri</T></h4>{dossier.readings.map(reading=>{
            const book=THEORY_LIBRARY.find(item=>item.id===reading.book);
            if(!book)return null;const destination=libraryReadingDestination(book,locale);if(!destination)return null;
            return <a key={book.id} href={destination.href} target={destination.internal?undefined:'_blank'} rel={destination.internal?undefined:'noopener noreferrer'}><BookOpen size={23}/><span><small>{book.author}</small><strong><T defer>{book.title}</T></strong><p><T content defer>{reading.why}</T></p></span><ArrowUpRight size={18}/></a>;
          })}</section>}
          <section id={`${dossier.id}-documenti`} className="history-bibliography"><h4><T content>Documenti e fonti del dossier</T></h4><ol>{bibliography.map(id=>{const source=sources[id];return <li key={id}><span className="eyebrow"><T defer>{source.kind}</T>{source.date&&<> · {source.date}</>}</span><a href={source.url} target="_blank" rel="noopener noreferrer"><T defer>{source.title}</T><ArrowUpRight size={14}/></a><p><T content defer>{source.publisher}</T> · <T defer>{source.locator}</T></p></li>;})}</ol></section>
          <nav className="history-related" aria-label="Altri approfondimenti"><p className="eyebrow"><T content>CONTINUA IL PERCORSO</T></p>{dossier.related.map(id=>{const next=HISTORY_INDEX.find(item=>item.id===id);return next?<button key={id} type="button" onClick={()=>choose(id)}><span><T defer>{next.title}</T></span><ArrowUpRight size={18}/></button>:null;})}</nav>
        </div>
      </div>
    </article>
  </section>;
}
