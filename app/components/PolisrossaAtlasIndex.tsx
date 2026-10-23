"use client";
import {useMemo,useState} from 'react';
import {Search} from 'lucide-react';
import STORY from '../data/history-story.json' with {type:'json'};
import {historyEventUrl} from '../lib/history-event-navigation';
import {buildHistoryPersonIndex,historyIndexMatches,historyPersonUrl} from '../lib/history-person-navigation';

/**
 * The standalone index of PolisRossa's EXISTING public encyclopedia seed.
 * The timeline remains a separately selected narrative, not the catalogue.
 * Other verified wiki entities can be added when their public indexes exist.
 */
const eras=STORY;
const events=eras.flatMap(era=>era.events.map(event=>({
 id:event.id,title:event.title,year:event.year,country:event.country,
 period:era.period,summary:event.text.slice(0,420),
})));
const people=buildHistoryPersonIndex(eras);
export default function PolisrossaAtlasIndex(){
 const [query,setQuery]=useState('');
 const [filter,setFilter]=useState<'all'|'event'|'person'>('all');
 const selected=useMemo(()=>{
  const matchingEvents=filter!=='person'?events.filter(event=>
   historyIndexMatches(query,[event.title,event.year,event.country,event.period,event.summary])):[];
  const matchingPeople=filter!=='event'?people.filter(person=>
   historyIndexMatches(query,[person.name,...person.roles,
    ...person.appearances.map(x=>x.eventTitle)])):[];
  return {events:matchingEvents.slice(0,100),people:matchingPeople.slice(0,100),
   total:matchingEvents.length+matchingPeople.length};
 },[query,filter]);
 return <section className="polisrossa-atlas-index" aria-labelledby="polisrossa-atlas-title">
  <header>
   <p className="eyebrow">ATLANTE · INDICE E RICERCA</p>
   <h2 id="polisrossa-atlas-title">Cerca le voci dell'Atlante</h2>
   <p>Consulta eventi, persone e pagine di approfondimento con fonti e collegamenti.
    La timeline è un racconto selezionato: l'indice resta il punto di accesso alle voci
    attualmente pubblicate nel catalogo storico di PolisRossa.</p>
  </header>
  <div className="atlas-index-filters">
   <label htmlFor="polisrossa-atlas-search"><Search size={17} aria-hidden="true"/> Cerca un tema, una persona o un evento</label>
   <input id="polisrossa-atlas-search" type="search" maxLength={160}
    value={query} onChange={event=>setQuery(event.currentTarget.value)}
    placeholder="Es. Comune, Haymarket, istruzione…"/>
   <label htmlFor="polisrossa-atlas-filter">Tipologia della voce</label>
   <select id="polisrossa-atlas-filter" value={filter}
    onChange={event=>setFilter(event.currentTarget.value as typeof filter)}>
    <option value="all">Tutte le voci</option>
    <option value="event">Eventi e passaggi</option>
    <option value="person">Persone</option>
   </select>
  </div>
  <p className="atlas-index-count" role="status">{selected.total} {selected.total===1?'voce trovata':'voci trovate'}</p>
  {selected.total===0?<p>Nessuna voce corrisponde alla ricerca. Prova un'altra parola o rimuovi i filtri.</p>:null}
  {selected.events.length>0?<section><h3>Eventi e passaggi</h3>
   <ul className="atlas-index-list">{selected.events.map(item=><li key={item.id}>
    <a href={historyEventUrl(item.id)}>
     <strong>{item.title}</strong>
     <span>{item.year} · {item.country} · {item.summary}</span>
    </a>
   </li>)}</ul>
  </section>:null}
  {selected.people.length>0?<section><h3>Persone e contributi</h3>
   <ul className="atlas-index-list">{selected.people.map(person=><li key={person.slug}>
    <a href={historyPersonUrl(person.slug)}>
     <strong>{person.name}</strong>
     <span>{person.roles.join(' · ')} · {person.appearances.length} riferimenti nel racconto</span>
    </a>
   </li>)}</ul>
  </section>:null}
  {selected.total>200?<p>Mostriamo fino a 100 risultati per gruppo. Affina la ricerca per trovare una voce specifica.</p>:null}
 </section>;
}
