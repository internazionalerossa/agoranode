"use client";
import {ArrowUpRight} from 'lucide-react';
import PATHS from '@/app/data/history-study-paths.json';
import {THEORY_LIBRARY} from '@/app/data/library';
import {libraryReadingDestination} from '@/app/lib/library-reading';
import {LocalizedText as T,useReadingLocale} from './Localization';
export default function AchievementReadings(){
 const locale=useReadingLocale();
 return <section className="achievement-reading-section" aria-labelledby="achievement-readings-title">
  <p className="eyebrow"><T content>STORIA, DATI E LETTURE</T></p>
  <h3 id="achievement-readings-title"><T>Le trasformazioni nella vita quotidiana</T></h3>
  <p><T content>Puoi leggere il cambiamento sociale partendo da ciò che conosci: trovare una casa, ricevere un salario, studiare, curarti o avere tempo per le persone che ami. Ogni tema collega libri, domande storiche e dati che osservano un aspetto della vita quotidiana. Aprilo per capire perché leggere un testo e quale misura può aiutare il confronto; non occorre conoscere già un autore o scegliere subito un indicatore statistico.</T></p>
  <div className="achievement-reading-topics">{PATHS.map(path=><details key={path.id}>
   <summary><T>{path.title}</T></summary><p><T content>{path.intro}</T></p>
   <ul>{path.books.map(reading=>{
    const book=THEORY_LIBRARY.find(item=>item.id===reading.id);if(!book)return null;
    const destination=libraryReadingDestination(book,locale);
    return <li key={book.id}><a href={destination?.href??book.links[0]?.url} target={destination&&!destination.internal?'_blank':undefined} rel={destination&&!destination.internal?'noopener noreferrer':undefined}><T>{book.title}</T></a><small>{book.author} · {book.period}{destination&&<> · {destination.edition.language.toUpperCase()}</>}</small><p><T content>{reading.why}</T></p></li>;
   })}</ul>
   <div className="reading-resource-links"><a href={`/polisrossa?view=teoria&percorso=conquiste&indicatore=${encodeURIComponent(path.indicator)}#world-history-title`}><T>Confronta i dati</T><ArrowUpRight size={13}/></a>{path.resources.map(([label,url])=><a key={url} href={url} target="_blank" rel="noopener noreferrer"><T>{label}</T><ArrowUpRight size={13}/></a>)}</div>
  </details>)}</div>
 </section>;
}
