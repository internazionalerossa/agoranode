"use client";
import {ArrowUpRight} from 'lucide-react';
import COMPARISONS from '@/app/data/history-comparisons.json';
import LITERACY from '@/app/data/history-soviet-literacy.json';
import {LocalizedText as T,useLocale} from './Localization';

/** Ratios, outcomes, dates and legal guarantees retain their own units. */
export default function HistoricalComparisons(){
 const locale=useLocale();
 const number=(value:number)=>new Intl.NumberFormat(locale,{maximumFractionDigits:2}).format(value);
 return <section className="historical-comparisons" aria-labelledby="history-comparisons-title">
  <header><p className="eyebrow"><T content>RISULTATI, DISTANZE, DIRITTI</T></p><h3 id="history-comparisons-title"><T>Quattro confronti che meritano attenzione</T></h3><p><T content>Che cosa rende significativo un confronto internazionale? Non basta affiancare due numeri: devono misurare lo stesso fenomeno e riferirsi a periodi confrontabili. Questi quattro esempi riguardano crescita economica, sopravvivenza infantile, ricerca spaziale e tempo di riposo. Mostrano risultati importanti attraverso domande concrete; sotto ciascuno trovi la spiegazione necessaria per capire che cosa dice il numero e quali conclusioni richiedono altre prove.</T></p></header>
  <div className="history-comparison-grid">{COMPARISONS.map(comparison=>{
   const maximum=Math.max(...comparison.values.map(v=>v.value));
   return <figure key={comparison.id} className="history-comparison-card">
    <figcaption><p className="eyebrow"><T content>{comparison.eyebrow}</T></p><h4><T content>{comparison.title}</T></h4><p className="history-comparison-unit"><T content>{comparison.unit}</T></p></figcaption>
    <div className={'history-comparison-values'+(comparison.kind==='year'?' comparison-dates':'')}>{comparison.values.map(value=><div key={value.name}>
     <span><T>{value.name}</T></span><strong>{comparison.kind==='ratio'?'×':''}{number(value.value)}</strong>
     {comparison.kind!=='year'&&<div className="history-comparison-track" aria-hidden="true"><span style={{width:`${100*value.value/maximum}%`}}/></div>}
    </div>)}</div>
    <p className="history-comparison-note"><T content>{comparison.note}</T></p>
    <div className="history-comparison-sources">{comparison.sources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer"><T>{source.name}</T><ArrowUpRight size={12}/></a>)}{'indicator'in comparison&&comparison.indicator&&<a href={'/data/history/'+comparison.indicator+'.json'}><T>Scarica la serie annuale completa</T> ↓</a>}</div>
   </figure>;
  })}</div>
 </section>;
}

export function SovietLiteracyChart(){
 const locale=useLocale();
 const number=(value:number)=>new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format(value);
 return <figure className="soviet-literacy-chart">
  <figcaption><p className="eyebrow"><T content>URSS · ALFABETIZZAZIONE · 1926–1970</T></p><h5><T content>Una trasformazione di massa, anche per le donne</T></h5></figcaption>
  <div className="literacy-key"><span><i aria-hidden="true"/><T>Popolazione complessiva</T></span><span><i aria-hidden="true"/><T>Donne</T></span></div>
  <div className="literacy-rows">{LITERACY.values.map(row=><div key={row.year}><strong>{row.year}</strong><div>{(['total','women'] as const).map(key=><div className={'literacy-bar literacy-'+key} key={key}><div aria-hidden="true"><span style={{width:row[key]+'%'}}/></div><span>{number(row[key])}%</span></div>)}</div></div>)}</div>
  <p><T content>{LITERACY.note}</T></p><a href={LITERACY.source} target="_blank" rel="noopener noreferrer"><T>Statistiche storiche sovietiche · studio Blumenthal–Benson</T><ArrowUpRight size={12}/></a><small><T>{LITERACY.locator}</T></small>
 </figure>;
}
