"use client";
import {ArrowUpRight} from 'lucide-react';
import PATHS from '@/app/data/history-study-paths.json';
import {THEORY_LIBRARY} from '@/app/data/library';
import {LocalizedText as T,useReadingLocale} from './Localization';
export default function AchievementReadings(){
 const locale=useReadingLocale();
 return <section className="achievement-reading-section" aria-labelledby="achievement-readings-title">
  <p className="eyebrow"><T content>STORIA, DATI E LETTURE</T></p>
  <h3 id="achievement-readings-title"><T>Le trasformazioni nella vita quotidiana</T></h3>
  <p><T content>Casa, salario, servizi, istruzione e tempo libero sono modi concreti di leggere il cambiamento sociale. Questi percorsi uniscono testi di tradizioni e paesi differenti a rapporti e serie statistiche. Apri un tema per trovare le letture e passare direttamente ai dati pertinenti.</T></p>
  <div className="achievement-reading-topics">{PATHS.map(path=><details key={path.id}>
   <summary><T>{path.title}</T></summary><p><T content>{path.intro}</T></p>
   <ul>{path.books.map(reading=>{
    const book=THEORY_LIBRARY.find(item=>item.id===reading.id);if(!book)return null;
    const edition=book.editions?.find(item=>item.language===locale)??book.editions?.find(item=>item.language==='en')??book.editions?.[0];
    return <li key={book.id}><a href={edition?`/read?${new URLSearchParams({book:book.id,edition:edition.language})}`:book.links[0]?.url}><T>{book.title}</T></a><small>{book.author} · {book.period}{edition&&<> · {edition.language.toUpperCase()}</>}</small><p><T content>{reading.why}</T></p></li>;
   })}</ul>
   <div className="reading-resource-links"><a href={`/?view=teoria&percorso=conquiste&indicatore=${encodeURIComponent(path.indicator)}#world-history-title`}><T>Confronta i dati</T><ArrowUpRight size={13}/></a>{path.resources.map(([label,url])=><a key={url} href={url} target="_blank" rel="noopener noreferrer"><T>{label}</T><ArrowUpRight size={13}/></a>)}</div>
  </details>)}</div>
 </section>;
}
