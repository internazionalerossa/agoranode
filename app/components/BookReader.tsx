"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookmarkCheck, BookOpen, Copy, Share2 } from "lucide-react";
import { BOOK_LANGUAGES, THEORY_LIBRARY, bookEdition } from "@/app/data/library";
import type { ReaderDocument } from "@/app/lib/book-reader";
import type { Progress } from "@/app/lib/reading-progress";
import { readerDestination } from "@/app/lib/book-navigation";
import {bookReaderPositionFits,bookReaderPositionFromUrl,bookReaderSelectionFromUrl,bookReaderUrl,copyBookReaderUrl,publicBookReaderFallback,shareBookReaderUrl,type BookReaderLoadResult,type BookReaderPosition,type BookReaderShareResult} from "@/app/lib/book-reader-navigation";
import {AppRuntime} from "./MobileApp";
import LanguageSettings,{useLanguagePreferences} from "./LanguageSettings";
import { LocalizationProvider, LocalizedText } from "./Localization";

export function BookReader() {
 const preferences=useLanguagePreferences();
 const [ready,setReady]=useState(false);useEffect(()=>setReady(true),[]);
 return <LocalizationProvider language={preferences.interfaceLanguage} contentLanguage={preferences.contentLanguage} original={preferences.original}><AppRuntime/><LanguageSettings/><Reader language={preferences.interfaceLanguage} ready={ready}/></LocalizationProvider>;
}
function Reader({language,ready}:{language:string;ready:boolean}) {
 const [bookId,setBookId]=useState("");
 const [edition,setEdition]=useState("");
 const [document,setDocument]=useState<ReaderDocument|null>(null);
 const [page,setPage]=useState(0);
 const [font,setFont]=useState(20);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [auth,setAuth]=useState(false);
 const [signIn,setSignIn]=useState("");
 const [resumed,setResumed]=useState(false);
 const [retryKey,setRetryKey]=useState(0);
 const [saveState,setSaveState]=useState<"idle"|"saving"|"saved"|"error">("idle");
 const [progressNotice,setProgressNotice]=useState("");
 const [shareResult,setShareResult]=useState<BookReaderShareResult|null>(null);
 const [shareLink,setShareLink]=useState("");
 const viewport=useRef<HTMLDivElement>(null);
 const current=useRef<(Progress & {clientAt:number;scope:string})|null>(null);
 const pending=useRef<(Progress & {clientAt:number;scope:string})|null>(null);
 const sending=useRef(false);
 const scope=useRef("");
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const restoring=useRef(false);
 const restoredScroll=useRef(0);
 const request=useRef(0);
 const controller=useRef<AbortController|null>(null);
 const book=THEORY_LIBRARY.find(item=>item.id===bookId);
 const selected=bookEdition(bookId,edition);
 const pump=useCallback(async()=>{
  if(sending.current)return;sending.current=true;
  try{
   while(pending.current){const point=pending.current;pending.current=null;setSaveState("saving");
    try{const response=await fetch("/api/reading-progress",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(point),keepalive:true,signal:AbortSignal.timeout(12000)});
     if(response.status===401){const data=await response.json();setAuth(false);setSignIn(data.signInUrl);throw Error("Login required");}
     if(response.status===409){pending.current=null;current.current=null;setRetryKey(value=>value+1);return;}
     if(!response.ok)throw Error("Save failed");setSaveState("saved");
    }catch{pending.current??=point;setSaveState("error");break;}
   }
  }finally{sending.current=false;}
 },[]);
 const queueSave=useCallback((immediate=false)=>{
  if(!current.current)return;
  current.current={...current.current,clientAt:Date.now()};pending.current=current.current;
  clearTimeout(timer.current);
  if(immediate)void pump();else timer.current=setTimeout(()=>void pump(),900);
 },[pump]);
 const load=useCallback(async(chapter:number,restorePage=0,scroll=0,shared?:BookReaderPosition):Promise<BookReaderLoadResult>=>{
  const version=++request.current;controller.current?.abort();const abort=new AbortController();controller.current=abort;
  setLoading(true);setError("");
  try{const params=new URLSearchParams({bookId,edition,chapter:String(chapter)});
   const response=await fetch(`/api/library/read?${params}`,{cache:"no-store",signal:AbortSignal.any([abort.signal,AbortSignal.timeout(25000)])});
   const data=await response.json();if(version!==request.current)return "cancelled";
   if(response.status===401){setAuth(false);setSignIn(data.signInUrl);return "failed";}
   if(shared&&response.status===400)return "invalid";
   if(!response.ok||!Array.isArray(data.pages)||!Array.isArray(data.chapters))throw Error(data.error??"Edizione non disponibile");
   if(shared&&!bookReaderPositionFits(shared,data))return "invalid";
   restoredScroll.current=scroll;setDocument(data);setPage(restorePage===-1?data.pages.length-1:Math.min(Math.max(0,restorePage),data.pages.length-1));
   return "loaded";
  }catch(e){if(!abort.signal.aborted){setError(e instanceof Error?e.message:"Non è stato possibile aprire il testo.");return "failed";}return "cancelled";}
  finally{if(version===request.current)setLoading(false);}
 },[bookId,edition]);
 useEffect(()=>{
  if(!ready)return;
  const selection=bookReaderSelectionFromUrl(window.location.href,language);
  if(!selection){setError("Libro o edizione non disponibili nel lettore.");setLoading(false);return;}
  setBookId(selection.bookId);setEdition(selection.edition);
 },[ready]);
 useEffect(()=>{
  if(!bookId||!edition)return;let alive=true;setLoading(true);setError("");setProgressNotice("");setSignIn("");setAuth(false);setResumed(false);setDocument(null);setSaveState("idle");current.current=null;
  const params=new URLSearchParams({bookId,edition});
  void(async()=>{const shared=bookReaderPositionFromUrl(window.location.href),initial=load(shared?.chapter??0,shared?.page??0,0,shared??undefined);try{
   const response=await fetch(`/api/reading-progress?${params}`,{cache:"no-store",signal:AbortSignal.timeout(12000)});
   const result=await response.json();if(!alive)return;
   if(response.status===401){setSignIn(`/polisrossa/account?return_to=${encodeURIComponent(bookReaderUrl(shared??{bookId,edition,chapter:0,page:0}))}`);const loaded=await initial,fallback=publicBookReaderFallback(loaded);if(alive&&fallback)await load(fallback.chapter,fallback.page);return;}
   if(!response.ok){setProgressNotice("Il servizio dei segnalibri non è raggiungibile; la lettura resta disponibile ma la posizione non verrà salvata.");const loaded=await initial,fallback=publicBookReaderFallback(loaded);if(alive&&fallback)await load(fallback.chapter,fallback.page);return;}
   scope.current=result.scope;
   const saved=result.items?.[0];
   if(shared&&shared.bookId===bookId&&shared.edition===edition){
    const loaded=await initial;if(!alive)return;
    if(loaded==="invalid"){setResumed(Boolean(saved));await load(saved?.chapter??0,saved?.page??0,saved?.scroll??0);}
   }else if(saved){setResumed(true);await load(saved.chapter??0,saved.page??0,saved.scroll??0);}
   else await initial;
   if(alive)setAuth(true);
  }catch{if(alive){setProgressNotice("Il servizio dei segnalibri non è raggiungibile; la lettura resta disponibile ma la posizione non verrà salvata.");const loaded=await initial,fallback=publicBookReaderFallback(loaded);if(alive&&fallback)await load(fallback.chapter,fallback.page);}}})();
  return()=>{alive=false;controller.current?.abort();};
 },[bookId,edition,load,retryKey]);
 useEffect(()=>{
  if(!document||loading||document.language!==edition)return;
  window.history.replaceState(window.history.state,"",bookReaderUrl({bookId,edition,chapter:document.chapter,page}));
 },[bookId,edition,document,page,loading]);
 useEffect(()=>{setShareResult(null);setShareLink("");},[bookId,edition,document?.chapter,page]);
 useEffect(()=>{
  if(!document||loading)return;
  if(!auth){current.current=null;restoring.current=true;const frame=requestAnimationFrame(()=>{const el=viewport.current;if(el)el.scrollTop=restoredScroll.current/10000*Math.max(0,el.scrollHeight-el.clientHeight);restoredScroll.current=0;restoring.current=false;});return()=>cancelAnimationFrame(frame);}
  current.current={bookId,edition,chapter:document.chapter,page,scroll:restoredScroll.current,revision:document.revision,updatedAt:0,clientAt:Date.now(),scope:scope.current};
  restoring.current=true;
  const frame=requestAnimationFrame(()=>{const el=viewport.current;if(el)el.scrollTop=restoredScroll.current/10000*Math.max(0,el.scrollHeight-el.clientHeight);restoredScroll.current=0;restoring.current=false;queueSave(true);});
  return()=>cancelAnimationFrame(frame);
 },[document,page,loading,bookId,edition,queueSave,auth]);
 useEffect(()=>{
  const flush=()=>{clearTimeout(timer.current);if(pending.current){void fetch("/api/reading-progress",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(pending.current),keepalive:true}).catch(()=>{});}};
  window.addEventListener("pagehide",flush);return()=>{window.removeEventListener("pagehide",flush);flush();};
 },[]);
 const move=(delta:number)=>{
  if(!document)return;
  const next=readerDestination(document.chapter,page,document.pages.length,document.chapters.length,delta);
  if(!next)return;queueSave(true);
  if(next.chapter===document.chapter){restoredScroll.current=0;setPage(next.page);}
  else void load(next.chapter,next.page);
 };
 const scroll=()=>{if(restoring.current||!current.current||!viewport.current)return;const el=viewport.current;current.current={...current.current,scroll:Math.max(0,Math.min(10000,Math.round(el.scrollTop/Math.max(1,el.scrollHeight-el.clientHeight)*10000)))};queueSave();};
 const sharePosition=async(copy=false)=>{
  if(!document||!book)return;
  const relative=bookReaderUrl({bookId,edition,chapter:document.chapter,page}),url=new URL(relative,window.location.origin).href;
  const payload={title:`${book.title} · PolisRossa`,text:`${book.author} · capitolo ${document.chapter+1}, pagina ${page+1}`,url};
  setShareLink(url);setShareResult(copy?await copyBookReaderUrl(navigator,url):await shareBookReaderUrl(navigator,payload));
 };
 const shareMessage=shareResult==="copied"?"Link copiato.":shareResult==="shared"?"Posizione di lettura condivisa.":shareResult==="cancelled"?"Condivisione annullata.":shareResult==="unavailable"?"Copia automatica non disponibile: seleziona il link.":"";
 return <main className="book-reader">
  <header className="book-reader-header">
   <a href="/polisrossa?view=teoria" onClick={()=>queueSave(true)}><ArrowLeft size={18}/><LocalizedText>Biblioteca</LocalizedText></a>
   <div><span className="eyebrow"><LocalizedText>Lettura online</LocalizedText></span><h1>{book?.title??<LocalizedText>PolisRossa</LocalizedText>}</h1><p>{book?.author}</p></div>
   <BookOpen size={24}/>
  </header>
  {!auth&&signIn?<section className="reader-message"><h2><LocalizedText>Accedi per salvare e ritrovare il tuo segnalibro</LocalizedText></h2><p><LocalizedText>Il testo resta leggibile senza account; accedendo, la posizione rimane nel tuo archivio anche su un altro dispositivo.</LocalizedText></p><a className="primary-button" href={signIn} target="_top"><LocalizedText>Accedi al tuo account</LocalizedText></a></section>:null}
  {progressNotice?<p className="reader-message" role="status"><LocalizedText>{progressNotice}</LocalizedText></p>:null}
  {book?<div className="reader-controls">
   <label><LocalizedText>Edizione del libro</LocalizedText><select value={edition} onChange={e=>{queueSave(true);setEdition(e.target.value);}}>{book.editions?.map(item=><option key={item.language} value={item.language}>{BOOK_LANGUAGES[item.language]??item.language}</option>)}</select></label>
   {document?<label className="reader-chapters"><LocalizedText>Capitolo</LocalizedText><select value={document.chapter} onChange={e=>{queueSave(true);void load(Number(e.target.value));}}>{document.chapters.map((chapter,i)=><option key={`${chapter.url}:${i}`} value={i}>{chapter.title}</option>)}</select></label>:null}
   <label><LocalizedText>Testo</LocalizedText><select value={font} onChange={e=>setFont(Number(e.target.value))}><option value={18}>A</option><option value={20}>A+</option><option value={23}>A++</option></select></label>
  </div>:null}
  {loading?<p className="reader-message" role="status"><LocalizedText>Apertura del testo…</LocalizedText></p>:null}
  {error?<section className="reader-message" role="alert"><p>{error}</p>{bookId?<button className="text-link" onClick={()=>setRetryKey(value=>value+1)}><LocalizedText>Riprova</LocalizedText></button>:null}{selected?<a href={selected.url} target="_blank" rel="noopener noreferrer"><LocalizedText>Apri l’archivio originale</LocalizedText></a>:null}</section>:null}
  {document&&!loading&&!error?<>
   {auth?<div className="reader-save-status" role="status" aria-live="polite">
    <BookmarkCheck size={16}/><LocalizedText>{saveState==="error"?"Segnalibro non salvato. Riprova.":saveState==="saved"?"Segnalibro salvato nel tuo account":saveState==="saving"?"Salvataggio del segnalibro…":resumed?"Ripresa dall’ultima posizione salvata":"Lettura con segnalibro automatico"}</LocalizedText>
    {saveState==="error"?<button className="text-link" onClick={()=>void pump()}><LocalizedText>Riprova</LocalizedText></button>:null}
   </div>:null}
   <div className="reader-save-status forum-inline-actions">
    <button className="text-link" type="button" onClick={()=>void sharePosition()}><Share2 size={15}/><LocalizedText>Condividi</LocalizedText></button>
    <button className="text-link" type="button" onClick={()=>void sharePosition(true)}><Copy size={15}/><LocalizedText>Copia link</LocalizedText></button>
    {shareMessage?<span role="status" aria-live="polite"><LocalizedText>{shareMessage}</LocalizedText></span>:null}
    {shareResult==="unavailable"?<input aria-label="Link alla posizione di lettura" readOnly value={shareLink} onFocus={input=>input.currentTarget.select()}/>:null}
   </div>
   <div ref={viewport} className="reader-viewport" onScroll={scroll} tabIndex={0} aria-label="Pagina del libro" style={{fontSize:font}}>
    <article className="reader-paper" lang={edition} dir={["ar","fa","he","ur"].includes(edition)?"rtl":"ltr"}>
     {document.pages[page]?.map((block,i)=>block.type==="p"?<p key={i}><LocalizedText content from={edition}>{block.text}</LocalizedText></p>:block.type==="h2"?<h2 key={i}><LocalizedText content from={edition}>{block.text}</LocalizedText></h2>:<h3 key={i}><LocalizedText content from={edition}>{block.text}</LocalizedText></h3>)}
    </article>
   </div>
   <footer className="reader-pagination">
    <button onClick={()=>move(-1)} disabled={page===0&&document.chapter===0}><ArrowLeft size={18}/><LocalizedText>Precedente</LocalizedText></button>
    <label><LocalizedText>Pagina di lettura</LocalizedText><input aria-label="Numero pagina di lettura" type="number" min={1} max={document.pages.length} value={page+1} onChange={e=>{const next=Number(e.target.value)-1;if(Number.isSafeInteger(next)&&next>=0&&next<document.pages.length){queueSave(true);restoredScroll.current=0;setPage(next);}}}/><span>/ {document.pages.length}</span></label>
    <button onClick={()=>move(1)} disabled={page===document.pages.length-1&&document.chapter===document.chapters.length-1}><LocalizedText>Successiva</LocalizedText><ArrowRight size={18}/></button>
   </footer>
   <div className="reader-source"><span>{document.source} · {BOOK_LANGUAGES[edition]??edition}</span>{document.archive?<><span>{document.archive.attribution}</span><a href={document.archive.licenseUrl} target="_blank" rel="license noopener noreferrer">{document.archive.license}</a><a href={document.archive.rightsStatementUrl} target="_blank" rel="noopener noreferrer"><LocalizedText>Dichiarazione dei diritti</LocalizedText></a><a href={document.url} target="_blank" rel="noopener noreferrer"><LocalizedText>Apri il capitolo originale</LocalizedText></a></>:<a href={document.url} target="_blank" rel="noopener noreferrer"><LocalizedText>Testo, attribuzione e licenza nell’archivio originale</LocalizedText></a>}{auth?<button className="text-link" onClick={()=>queueSave(true)}><BookmarkCheck size={16}/><LocalizedText>Segna questa pagina</LocalizedText></button>:signIn?<a href={signIn} target="_top"><LocalizedText>Accedi per salvare la posizione</LocalizedText></a>:null}</div>
  </>:null}
 <p className="footer-privacy"><a href="/"><LocalizedText>AgoràNode</LocalizedText></a>{" · "}<a href="/polisrossa?view=privacy"><LocalizedText>Privacy, cookie e diritti</LocalizedText></a>{" · "}<a href="/polisrossa?view=condizioni"><LocalizedText>Condizioni d’uso</LocalizedText></a></p>
 </main>;
}
