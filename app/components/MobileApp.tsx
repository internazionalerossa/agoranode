"use client";
import {useEffect,useState} from 'react';
import {Download} from 'lucide-react';
import {LocalizedText as T} from './Localization';
type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
/** Browser hints only; account, chat and forum requests always go to the server. */
export function AppRuntime(){
 const [offline,setOffline]=useState(false);
 useEffect(()=>{
  const network=()=>setOffline(!navigator.onLine);
  network();window.addEventListener('online',network);window.addEventListener('offline',network);
  if('serviceWorker'in navigator&&window.isSecureContext)void navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>{/* Reading remains available if installation support is blocked. */});
  const viewport=window.visualViewport;
  let fullHeight=window.innerHeight,frame=0;
  const keyboard=()=>{
   const editing=document.activeElement?.matches('input:not([type=checkbox]):not([type=radio]),textarea,[contenteditable="true"]');
   if(!editing)fullHeight=Math.max(fullHeight,window.innerHeight);
   const visibleHeight=viewport?viewport.height*viewport.scale:window.innerHeight;
   document.body.dataset.keyboardOpen=String(Boolean(editing&&fullHeight-visibleHeight>150));
  };
  const focus=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(keyboard);};
  const orientation=()=>{fullHeight=window.innerHeight;focus();};
  viewport?.addEventListener('resize',keyboard);window.addEventListener('resize',keyboard);window.addEventListener('orientationchange',orientation);document.addEventListener('focusin',focus);document.addEventListener('focusout',focus);
  return()=>{window.removeEventListener('online',network);window.removeEventListener('offline',network);viewport?.removeEventListener('resize',keyboard);window.removeEventListener('resize',keyboard);window.removeEventListener('orientationchange',orientation);document.removeEventListener('focusin',focus);document.removeEventListener('focusout',focus);cancelAnimationFrame(frame);delete document.body.dataset.keyboardOpen;};
 },[]);
 return offline?<aside className="app-network-status" role="status"><T>Connessione assente. Account, aggiornamenti, forum e chat richiedono la rete. Un invio non confermato non è un messaggio pubblicato: controlla il risultato prima di riprovare.</T></aside>:null;
}
export function InstallApp(){
 const [offer,setOffer]=useState<InstallEvent|null>(null),[installed,setInstalled]=useState(false),[ios,setIos]=useState(false),[notice,setNotice]=useState('');
 useEffect(()=>{
  const display=window.matchMedia('(display-mode: standalone)');
  const detect=()=>setInstalled(display.matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone));
  detect();setIos(/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1));
  const available=(event:Event)=>{event.preventDefault();setOffer(event as InstallEvent);};
  const done=()=>{setInstalled(true);setOffer(null);};
  window.addEventListener('beforeinstallprompt',available);window.addEventListener('appinstalled',done);display.addEventListener('change',detect);
  return()=>{window.removeEventListener('beforeinstallprompt',available);window.removeEventListener('appinstalled',done);display.removeEventListener('change',detect);};
 },[]);
 const install=async()=>{if(!offer)return;try{await offer.prompt();const choice=await offer.userChoice;setOffer(null);setNotice(choice.outcome==='accepted'?'Installazione richiesta al dispositivo.':'Installazione annullata. Puoi riprovare dal menu del browser.');}catch{setOffer(null);setNotice('Il browser non ha completato la richiesta. Usa il suo menu per aggiungere l’app alla schermata Home.');}};
 if(installed)return null;
 return <details className="app-install"><summary><Download size={14}/><T>Installa l’app</T></summary><div><strong><T>PolisRossa sul tuo telefono</T></strong><p><T>Aprila dalla schermata Home, in una finestra dedicata.</T></p>{offer?<button className="button button-outline" type="button" onClick={()=>void install()}><T>Installa su questo dispositivo</T></button>:<p><T>{ios?'Nel menu Condividi del browser scegli Aggiungi alla schermata Home. Se compare Apri come app web, lascialo attivo.':'Nel menu del browser scegli Installa app oppure Aggiungi alla schermata Home. Se il comando non compare, apri questo indirizzo in Chrome o nel browser principale del telefono.'}</T></p>}<small><T>Account, chat, forum e nuovi dati richiedono una connessione. L’installazione non sostituisce l’accesso personale.</T></small>{notice&&<p role="status"><T>{notice}</T></p>}</div></details>;
}
