"use client";
import {useEffect,useSyncExternalStore} from 'react';
import LANGUAGES from '@/app/data/languages.json';
import {LANGUAGE_PREFERENCES_KEY,resolveLanguagePreferences,validLanguageChoice,readingModePreferences,type LanguageChoices} from '@/app/lib/language-preferences';
import {LocalizedText as T} from './Localization';
const initial:LanguageChoices={interface:'auto',content:'auto'};let choices=initial,hydrated=false;const listeners=new Set<()=>void>();
const emit=()=>listeners.forEach(callback=>callback());
const read=()=>{try{const saved=JSON.parse(localStorage.getItem(LANGUAGE_PREFERENCES_KEY)??'null');const resolved=resolveLanguagePreferences(saved,navigator.language,localStorage.getItem('rassegna-rossa.reading-language'));choices={interface:resolved.interface,content:resolved.content};}catch{choices=initial;}emit();};
export function useLanguagePreferences(){const saved=useSyncExternalStore(callback=>{listeners.add(callback);return()=>{listeners.delete(callback);};},()=>choices,()=>initial);useEffect(()=>{if(!hydrated){hydrated=true;read();}const sync=(event:StorageEvent)=>{if(event.key===LANGUAGE_PREFERENCES_KEY)read();};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[]);const save=(next:LanguageChoices)=>{choices=next;try{localStorage.setItem(LANGUAGE_PREFERENCES_KEY,JSON.stringify(choices));}catch{/* Preferences remain usable without storage. */}emit();};const change=(kind:keyof LanguageChoices,value:string)=>{if(!validLanguageChoice(value,kind==='content'))return;save({...choices,[kind]:value});};return {...resolveLanguagePreferences(saved,hydrated&&typeof navigator!=='undefined'?navigator.language:'it'),setReadingMode:(mode:'original'|'translated')=>save(readingModePreferences(choices,mode)),setInterface:(value:string)=>change('interface',value),setContent:(value:string)=>change('content',value)};}
export function ContentLanguageSelector(){const preferences=useLanguagePreferences();return <label className="reading-language-control"><span><strong><T>Lingua di lettura</T></strong><small><T>Articoli, libri, storia, forum e chat</T></small></span><select aria-label="Lingua di lettura" value={preferences.content} onChange={event=>preferences.setContent(event.target.value)}><option value="auto"><T>Automatica · browser</T></option><option value="original"><T>Lingua originale</T></option>{Object.entries(LANGUAGES).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>;}
export default function LanguageSettings(){
 const preferences=useLanguagePreferences();
 return <details className="global-language-settings">
  <summary><span><T>Lingua di lettura</T></span><small>{preferences.interfaceLanguage.toUpperCase()} · {preferences.original?<T>Contenuti originali</T>:preferences.contentLanguage.toUpperCase()}</small></summary>
  <div>
   <h2><T>Come vuoi leggere?</T></h2>
   <label><strong><T>Lingua del lettore e dell’interfaccia</T></strong><small><T>Menu, pulsanti e istruzioni</T></small><select aria-label="Lingua dell’interfaccia" value={preferences.interface} onChange={event=>preferences.setInterface(event.target.value)}><option value="auto"><T>Automatica · browser</T></option>{Object.entries(LANGUAGES).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
   <div className="reading-mode-options" role="group" aria-label="Modalità di lettura">
    <button type="button" aria-pressed={preferences.original} onClick={()=>preferences.setReadingMode('original')}><strong><T>Interfaccia nella mia lingua, contenuti originali</T></strong><span><T>Menu nella lingua scelta sopra. Articoli e contenuti restano nelle lingue in cui sono pubblicati.</T></span></button>
    <button type="button" aria-pressed={!preferences.original&&preferences.content===preferences.interface} onClick={()=>preferences.setReadingMode('translated')}><strong><T>Interfaccia e contenuti nella mia lingua</T></strong><span><T>Menu e traduzioni nella lingua scelta sopra, quando disponibili.</T></span></button>
   </div>
   <ContentLanguageSelector/>
   <p><T>Puoi anche scegliere una lingua diversa per la lettura. La lingua di lettura regola le traduzioni. La lingua delle fonti filtra gli articoli per lingua originale. Il paese della testata indica dove ha sede la redazione: non seleziona una lingua e non indica il luogo della notizia. Questi ultimi due filtri sono nella rassegna. I libri conservano la lingua dell’edizione scelta.</T></p>
  </div>
 </details>;
}
