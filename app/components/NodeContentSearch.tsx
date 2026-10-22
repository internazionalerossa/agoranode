"use client";
import {useEffect,useMemo,useState} from 'react';
import type {NodeContentItem,NodeContentKind} from '../lib/node-content-search';
import {searchNodeContent} from '../lib/node-content-search';

/** Same search surface for all communities, with space-isolated indexes. */
export default function NodeContentSearch({spaceId}:{spaceId:string}){
  const [items,setItems]=useState<readonly NodeContentItem[]>([]);
  const [query,setQuery]=useState('');
  const [kind,setKind]=useState<'all'|NodeContentKind>('all');
  const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
  useEffect(()=>{
    let active=true;
    setStatus('loading');setItems([]);
    // Do not eagerly load another community's content in Agorà's bundle.
    const pending=spaceId==='polisrossa'
      ? import('../instances/polisrossa-content').then(m=>m.POLISROSSA_CONTENT)
      : Promise.resolve([] as readonly NodeContentItem[]);
    pending.then(data=>{if(active){setItems(data);setStatus('ready');}})
      .catch(()=>{if(active)setStatus('error');});
    return()=>{active=false;};
  },[spaceId]);
  const results=useMemo(()=>query.trim()?searchNodeContent(items,spaceId,query,{
    limit:20,...(kind!=='all'?{kind}:{})
  }):[],[items,spaceId,query,kind]);
  return <section className="node-content-discovery" aria-label="Ricerca nella conoscenza del nodo">
    <h2>Esplora la conoscenza di questo nodo</h2>
    <p>Ricerca comune fra biblioteca e timeline. Le pagine wiki, i dati e il forum saranno collegati quando i rispettivi indici saranno operativi.</p>
    <label htmlFor={'space-search-'+spaceId}>Cerca per titolo, autore, tema o periodo</label>
    <input id={'space-search-'+spaceId} type="search" value={query} maxLength={240}
      onChange={e=>setQuery(e.currentTarget.value)} placeholder="Cerca nella conoscenza pubblica"/>
    <label htmlFor={'space-filter-'+spaceId}>Tipologia</label>
    <select id={'space-filter-'+spaceId} value={kind} onChange={e=>setKind(e.currentTarget.value as typeof kind)}>
      <option value="all">Tutti i risultati</option>
      <option value="book">Biblioteca</option>
      <option value="timeline">Timeline</option>
      <option value="wiki">Wiki</option>
      <option value="dataset">Dati</option>
      <option value="forum">Forum</option>
    </select>
    {status==='loading'?<p role="status">Preparazione dell'indice…</p>:
      status==='error'?<p role="status">Ricerca temporaneamente non disponibile.</p>:
      items.length===0?<p>Questo nodo non ha ancora un indice pubblico consultabile.</p>:
      query.trim()?<>
        <p role="status">{results.length} risultati visualizzati</p>
        <ol>{results.map(item=><li key={item.kind+':'+item.id}>
          <a href={item.href}><strong>{item.title}</strong></a>
          <span> · {item.kind==='book'?'Biblioteca':item.kind==='timeline'?'Timeline':item.kind}</span>
          <p>{item.summary}</p>
        </li>)}</ol>
      </>:<p>Inserisci una parola chiave per cercare nell'indice del nodo.</p>}
  </section>;
}
