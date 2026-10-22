"use client";
import {useState} from 'react';
import {timelineProposalLink} from '../lib/timeline-proposal';

export type TimelineProposalTarget={id:string;title:string;year:string;country:string;text:string};
type Props={
  events:readonly TimelineProposalTarget[];
  selectedIds:readonly string[];
  onSelectionChange:(ids:string[])=>void;
};
const MAX_SELECTED=8;
export default function TimelineProposalTool({events,selectedIds,onSelectionChange}:Props){
  const [mode,setMode]=useState<'edit'|'new'>('edit');
  const [title,setTitle]=useState('');
  const [period,setPeriod]=useState('');
  const [context,setContext]=useState('');
  const [source,setSource]=useState('');
  const [find,setFind]=useState('');
  const [action,setAction]=useState<'revise'|'include'|'exclude'>('revise');
  const selected=events.filter(event=>selectedIds.includes(event.id)).slice(0,MAX_SELECTED);
  const validSource=source.trim()===''||(()=>{try{const u=new URL(source);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}})();
  const ready=mode==='new'
    ?title.trim().length>=5&&title.length<=140&&context.trim().length>=60&&context.length<=1800&&period.trim().length>0
    :selected.length>0&&selectedIds.length<=MAX_SELECTED&&context.trim().length>=60&&context.length<=1800;
  const matches=events.filter(event=>!find.trim()||[event.title,event.year,event.country].some(value=>value.toLocaleLowerCase('it').includes(find.trim().toLocaleLowerCase('it')))).slice(0,14);
  const proposalTitle=mode==='new'
    ?'Proposta di nuova pagina: '+title.trim().slice(0,110)
    :'Proposta di revisione timeline: '+selected[0]?.title.slice(0,90);
  const synopsis=selected.map(event=>[
    'Pagina: '+event.title,
    'Identificatore: '+event.id,
    'Periodo: '+event.year+' · '+event.country,
    'Link: /polisrossa?view=teoria&percorso=timeline&evento='+encodeURIComponent(event.id)
  ].join('\n')).join('\n\n');
  const description=(mode==='new'
    ? 'TIPO: proposta di nuova pagina enciclopedica\nTitolo: '+title.trim()+
      '\nPeriodo di riferimento: '+period.trim()+
      '\n\nTesto introduttivo proposto:\n'+context.trim()
    : 'TIPO: proposta di modifica alla timeline\nAzione: '+(
      action==='include'?'includere nel racconto':action==='exclude'?'rimuovere dal racconto, mantenendo le pagine ricercabili':'correggere il racconto')+
      '\n\n'+synopsis+'\n\nNuovo testo narrativo o motivazione:\n'+context.trim());
  const href=ready&&validSource?(()=>{try{return timelineProposalLink({
    title:proposalTitle.slice(0,140),
    body:description.slice(0,4000),
    references:source.trim(),
  });}catch{return null;}})():null;
  return <section className="timeline-proposal-tool" aria-labelledby="timeline-proposal-title">
    <header>
      <p className="eyebrow">LA STORIA SI MIGLIORA INSIEME</p>
      <h3 id="timeline-proposal-title">Proponi una modifica al racconto</h3>
      <p>Seleziona fino a otto tappe della timeline e descrivi cosa vorresti correggere, aggiungere o togliere. La proposta viene preparata qui, poi discussa e votata nel forum dai PR2 del nodo.</p>
    </header>
    <div className="timeline-proposal-switch" role="group" aria-label="Tipo di proposta">
      <button type="button" aria-pressed={mode==='edit'} onClick={()=>setMode('edit')}>Modifica tappe selezionate</button>
      <button type="button" aria-pressed={mode==='new'} onClick={()=>setMode('new')}>Proponi una nuova pagina</button>
    </div>
    {mode==='edit'?<>
      <div className="timeline-proposal-selected">
        <strong>{selected.length} tappe selezionate</strong>
        <p>Usa le caselle accanto alle tappe del racconto oppure seleziona qui quelle che vuoi modificare.</p>
        {selected.length>0&&<ul>{selected.map(event=><li key={event.id}><span>{event.year} · {event.title}</span><button type="button" onClick={()=>onSelectionChange(selectedIds.filter(id=>id!==event.id))}>Rimuovi</button></li>)}</ul>}
      </div>
      <details className="timeline-proposal-picker"><summary>Cerca e seleziona le tappe</summary><div><label>Cerca un evento, paese o periodo<input type="search" value={find} maxLength={160} onChange={e=>setFind(e.currentTarget.value)} placeholder="Es. Comune, 1871, lavoro…"/></label><p>{matches.length} risultati mostrati · massimo otto selezioni</p><ul>{matches.map(event=><li key={event.id}><label><input type="checkbox" checked={selectedIds.includes(event.id)} disabled={!selectedIds.includes(event.id)&&selectedIds.length>=MAX_SELECTED} onChange={()=>onSelectionChange(selectedIds.includes(event.id)?selectedIds.filter(id=>id!==event.id):[...selectedIds,event.id])}/><span>{event.year} · {event.title}</span></label></li>)}</ul></div></details>
      <label>Che cosa vuoi proporre?
        <select value={action} onChange={e=>setAction(e.currentTarget.value as typeof action)}>
          <option value="revise">Correggere o arricchire il racconto</option>
          <option value="include">Proporre l'inclusione di una pagina</option>
          <option value="exclude">Escludere una tappa dalla timeline (non dalla wiki)</option>
        </select>
      </label>
    </>:<>
      <label>Titolo della nuova pagina
        <input value={title} onChange={e=>setTitle(e.currentTarget.value)} maxLength={140} placeholder="Es. La storia di un movimento o di una scoperta"/>
      </label>
      <label>Periodo o collocazione nella cronologia
        <input value={period} onChange={e=>setPeriod(e.currentTarget.value)} maxLength={120} placeholder="Es. 1968–1975, oppure contemporaneo"/>
      </label>
      <p>La nuova pagina sarà proposta per la wiki; l’eventuale inserimento nella timeline rimarrà una decisione separata dei PR2.</p>
    </>}
    <label>{mode==='new'?'Scrivi un’introduzione comprensibile a chi scopre il tema':'Spiega il cambiamento o scrivi il nuovo passaggio narrativo'}
      <textarea value={context} onChange={e=>setContext(e.currentTarget.value)} rows={5} maxLength={1800}
        placeholder="Racconta il contesto, il problema e il motivo della modifica con parole tue (almeno 60 caratteri)."/>
    </label>
    <label>Fonte verificabile (indirizzo HTTPS, facoltativo nel modulo iniziale)
      <input type="url" value={source} onChange={e=>setSource(e.currentTarget.value)} maxLength={1000} placeholder="https://"/>
    </label>
    {source.trim()!==''&&!validSource&&<p role="alert">Inserisci un URL HTTPS valido, senza credenziali.</p>}
    <p className="timeline-proposal-disclaimer">La proposta non modifica il sito direttamente: aprirà il modulo ufficiale del forum. Per pubblicare o votare serve l'ammissione PR2; una decisione richiederà comunque la verifica delle fonti e la pubblicazione di una revisione autorizzata.</p>
    {href?<a className="button community-primary" href={href}>Continua nel forum e prepara il voto →</a>:
      <span className="button button-outline" aria-disabled="true">Completa i campi per continuare</span>}
  </section>;
}
