import type {TheoryCard} from '../data/library';
import {BOOK_LANGUAGES} from '../data/library';
import {libraryReadingDestination} from '../lib/library-reading';

function safeExternal(url:string){
 try{const parsed=new URL(url);return parsed.protocol==='https:'&&!parsed.username&&!parsed.password?parsed.href:null;}
 catch{return null;}
}
/** A single work, all known editions and their true rights/hosting state. */
export function LibraryBookDetail({book}:{book:TheoryCard}){
 return <article className="library-book-detail" id="book-detail" aria-labelledby="book-detail-title">
   <a href="/polisrossa?view=teoria&percorso=libri">← Torna alla biblioteca</a>
   <p className="eyebrow">SCHEDA BIBLIOGRAFICA · POLISROSSA</p>
   <h2 id="book-detail-title">{book.title}</h2>
   <p><strong>{book.author}</strong> · {book.period} · {book.lane}</p>
   <p>{book.summary}</p>
   <h3>Edizioni e disponibilità</h3>
   {book.editions?.length?<ul>{book.editions.map((edition,index)=>{
    const destination=libraryReadingDestination(book,edition.language);
    const original=safeExternal(edition.url);
    return <li key={edition.language+'-'+index}>
     <strong>{edition.title}</strong> · {BOOK_LANGUAGES[edition.language]??edition.language} · {edition.source}
     <p>{destination?.internal?'Testo consultabile nel lettore locale di PolisRossa.':
       'Edizione catalogata presso un archivio esterno; non è dichiarata conservata o scaricabile sul nostro server.'}</p>
     {destination?.internal?<a href={destination.href}>Leggi nel sito →</a>:
      original?<a href={original} target="_blank" rel="noopener noreferrer">Apri l'edizione originale ↗</a>:null}
    </li>;
   })}</ul>:<p>Non sono presenti edizioni digitali verificate per quest'opera.</p>}
   <h3>Fonti e collegamenti</h3>
   <ul>{book.links.map(link=>{
    const href=safeExternal(link.url);
    return href?<li key={href}><a href={href} target="_blank" rel="noopener noreferrer">{link.label} ↗</a></li>:null;
   })}</ul>
   <p>La presenza in catalogo non implica che i diritti consentano download, archiviazione locale o replica sui peer della rete.</p>
 </article>;
}
