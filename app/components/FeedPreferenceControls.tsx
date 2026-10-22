"use client";
import {useEffect,useState} from 'react';
import {feedPreferenceStorageKey,normaliseSourceChoices,type FeedMode} from '../lib/node-feed-preferences';
type Source={id:string;name:string};
function fromStorage(spaceId:string,allowed:Set<string>):string[]{
  if(typeof window==='undefined')return [];
  try{return normaliseSourceChoices(JSON.parse(localStorage.getItem(feedPreferenceStorageKey(spaceId))??'[]'),allowed);}
  catch{return [];}
}
export function useNodeFeedPreferences(spaceId:string,sources:readonly Source[]){
  const key=sources.map(source=>source.id).join(',');
  const allowed=new Set(key.split(',').filter(Boolean));
  const [sourceIds,setSourceIds]=useState<string[]>([]);
  const [mode,setMode]=useState<FeedMode>('all');
  const [account,setAccount]=useState(false);
  const [status,setStatus]=useState('');
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    let live=true;
    const local=fromStorage(spaceId,allowed);
    setSourceIds(local);
    setMode('all');
    setReady(false);
    const controller=new AbortController();
    void fetch('/api/spaces/'+spaceId+'/preferences',{signal:controller.signal,credentials:'same-origin',cache:'no-store'})
      .then(async response=>{
        if(response.status===401)return null;
        if(!response.ok)throw Error('Preferenze account temporaneamente non disponibili');
        return response.json() as Promise<{authenticated:boolean;saved:boolean;sourceIds:string[]}>;
      }).then(data=>{
        if(!live)return;
        if(data?.authenticated){
          setAccount(true);
          if(data.saved){
            const remote=normaliseSourceChoices(data.sourceIds,allowed);
            setSourceIds(remote);
            try{localStorage.setItem(feedPreferenceStorageKey(spaceId),JSON.stringify(remote));}catch{}
          } else if(local.length>0){
            // Upgrade guest selections into the newly authenticated account.
            void fetch('/api/spaces/'+spaceId+'/preferences',{
              method:'PUT',credentials:'same-origin',
              headers:{'content-type':'application/json'},body:JSON.stringify({sourceIds:local}),
            }).then(response=>{if(!response.ok&&live)setStatus('Preferenze disponibili sul dispositivo, non ancora sincronizzate.');})
              .catch(()=>{if(live)setStatus('Preferenze disponibili sul dispositivo, non ancora sincronizzate.');});
          }
        }
      }).catch(()=>{if(live)setStatus('Preferenze salvate solo su questo dispositivo.');})
      .finally(()=>{if(live)setReady(true);});
    return()=>{live=false;controller.abort();};
  },[spaceId,key]);
  const choose=(id:string)=>{
    if(!allowed.has(id))return;
    const next=sourceIds.includes(id)?sourceIds.filter(x=>x!==id):[...sourceIds,id];
    setSourceIds(next);
    try{localStorage.setItem(feedPreferenceStorageKey(spaceId),JSON.stringify(next));}
    catch{setStatus('Questo browser non consente il salvataggio delle preferenze.');}
    if(account){
      void fetch('/api/spaces/'+spaceId+'/preferences',{
        method:'PUT',credentials:'same-origin',
        headers:{'content-type':'application/json'},body:JSON.stringify({sourceIds:next}),
      }).then(response=>{if(!response.ok)setStatus('Salvataggio nell’account non riuscito: la scelta resta sul dispositivo.');else setStatus('Preferenze salvate nel tuo account.');})
        .catch(()=>setStatus('Salvataggio nell’account non riuscito: la scelta resta sul dispositivo.'));
    }
  };
  return {sourceIds:new Set(sourceIds),mode,setMode,choose,account,status,ready};
}
export function FeedPreferenceControls({sources,prefs,spaceId}:{
  sources:readonly Source[];spaceId:string;prefs:ReturnType<typeof useNodeFeedPreferences>;
}){
  return <section className="node-feed-preferences" aria-label="Personalizza il feed">
    <div className="node-feed-choice" role="group" aria-label="Scegli la modalità del feed">
      <button type="button" aria-pressed={prefs.mode==='all'} onClick={()=>prefs.setMode('all')}>Tutti i feed</button>
      <button type="button" aria-pressed={prefs.mode==='favourites'} onClick={()=>prefs.setMode('favourites')}>Feed preferiti ({prefs.sourceIds.size})</button>
    </div>
    <details><summary>Scegli le tue fonti</summary>
      <p>Puoi seguire più fonti. Nessuna selezione cambia le notizie visualizzate agli altri utenti.</p>
      <div className="node-feed-source-list">{sources.map(source=><label key={source.id}>
        <input type="checkbox" checked={prefs.sourceIds.has(source.id)} onChange={()=>prefs.choose(source.id)}/>
        {source.name}
      </label>)}</div>
      <p>{prefs.account?'Le fonti scelte vengono salvate nel tuo account PR1.':'Le scelte del visitatore vengono salvate su questo dispositivo. Accedi per sincronizzarle nel tuo account PR1.'}</p>
    </details>
    {prefs.mode==='favourites'&&prefs.sourceIds.size===0?<p role="status">Seleziona almeno una fonte per vedere il tuo feed preferito.</p>:null}
    {prefs.status?<p role="status">{prefs.status}</p>:null}
  </section>;
}
