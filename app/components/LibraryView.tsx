"use client";
import { lazy, Suspense, useEffect, useState } from "react";
import { ArrowUpRight, BookOpen, Bookmark, BookmarkCheck, Search, X } from "lucide-react";
import { THEORY_LIBRARY, BOOK_LANGUAGES } from "@/app/data/library";
import { LIBRARY_SECTIONS, librarySectionFromUrl, librarySectionUrl, type LibrarySection } from "@/app/lib/library-navigation";
import { READING_PATHS, GLOSSARY } from "@/app/data/editorial";
import { LocalizedText, LocalizedInput, useReadingLocale } from "./Localization";
const ALL = "all";
const ArchiveDirectory = lazy(() => import('./ArchiveDirectory'));
const SocialAchievements = lazy(() => import('./SocialAchievements'));
const availableLanguages = [...new Set(THEORY_LIBRARY.flatMap(book => book.editions?.map(edition => edition.language) ?? []))].sort((a,b) => (BOOK_LANGUAGES[a] ?? a).localeCompare(BOOK_LANGUAGES[b] ?? b));
export function LibraryView({
  query,
  setQuery,
  savedBooks,
  onToggleBook,
}: {
  query: string;
  setQuery: (s: string) => void;
  savedBooks: Set<string>;
  onToggleBook: (id: string) => void;
}) {
  const readingLanguage = useReadingLocale();
  const [bookLanguage, setBookLanguage] = useState("all");
  const [country,setCountry]=useState('all'),[theme,setTheme]=useState('all'),[bookPage,setBookPage]=useState(0);
  const countries=[...new Set(THEORY_LIBRARY.flatMap(book=>book.country?[book.country]:[]))].sort();
  const themes=[...new Set(THEORY_LIBRARY.filter(book=>book.editions?.length).map(book=>book.lane))].sort();
  const [section, setSection] = useState<LibrarySection>("libri");
  const [archivesOpen,setArchivesOpen]=useState(false);
  useEffect(() => {
    const sync=()=>setSection(librarySectionFromUrl(window.location.href));
    sync();window.addEventListener('popstate',sync);window.addEventListener('hashchange',sync);
    return()=>{window.removeEventListener('popstate',sync);window.removeEventListener('hashchange',sync);};
  }, []);
  const chooseSection=(next:LibrarySection)=>{
    const target=librarySectionUrl(window.location.href,next);
    if(target!==window.location.pathname+window.location.search+window.location.hash)window.history.pushState(window.history.state,"",target);
    setSection(next);
    requestAnimationFrame(()=>document.getElementById('library-section-panel')?.focus({preventScroll:true}));
  };
  const readingLink = (book: typeof THEORY_LIBRARY[number]) => {
    const preferred = bookLanguage === "all" ? readingLanguage : bookLanguage;
    const edition = book.editions?.find(item => item.language === preferred) ?? book.editions?.find(item => item.language === "en") ?? book.editions?.[0];
    return edition ? `/read?${new URLSearchParams({ book: book.id, edition: edition.language })}` : book.links[0]?.url;
  };
  const [path, setPath] = useState("all");
  const active = READING_PATHS.find((p) => p.id === path);
  const books = THEORY_LIBRARY.filter(
    (book) =>
      !book.aliasOf && Boolean(book.editions?.length) &&
      (bookLanguage === "all" || book.editions?.some(edition => edition.language === bookLanguage)) &&
      (!active || active.books.includes(book.id)) &&
      (country==='all'||book.country===country) && (theme==='all'||book.lane===theme) &&
      `${book.title} ${book.editions?.map(edition=>edition.title).join(" ")??""} ${book.author} ${book.country??''} ${book.summary} ${book.tags.join(" ")}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  ).sort((a,b)=>active?active.books.indexOf(a.id)-active.books.indexOf(b.id):a.title.localeCompare(b.title,readingLanguage));
  useEffect(()=>setBookPage(0),[query,path,bookLanguage,country,theme]);
  const page=Math.min(bookPage,Math.max(0,Math.ceil(books.length/36)-1));
  return (
    <div className="library-view">
      <header className="section-heading"><h1 id="page-title"><LocalizedText>Biblioteca</LocalizedText></h1><BookOpen size={24} strokeWidth={1.3}/></header>
      <nav className="library-destinations" aria-label="Percorsi della biblioteca">{LIBRARY_SECTIONS.map(item=><a key={item.id} href={librarySectionUrl('/?view=teoria',item.id)} aria-current={section===item.id?'page':undefined} onClick={event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();chooseSection(item.id);}}><strong><LocalizedText>{item.label}</LocalizedText></strong><span><LocalizedText>{item.description}</LocalizedText></span><ArrowUpRight size={16}/></a>)}</nav>
      <div id="library-section-panel" tabIndex={-1}>
      {section==='libri'?<>
      <div className="usage-guide" aria-label="Guida alla biblioteca">
        <p><strong><LocalizedText>Come orientarsi</LocalizedText></strong> <LocalizedText>Questa biblioteca mette in relazione libri gratuiti, idee politiche e storia sociale. Se parti da zero, scegli un percorso: troverai un ordine di lettura suggerito, dai testi introduttivi alle opere più impegnative. Se cerchi già qualcosa di preciso, usa il catalogo per autore, argomento e lingua. Le edizioni disponibili possono essere aperte per la lettura online; con un account attivo puoi ritrovare il segnalibro e riprendere dal punto in cui ti eri fermato.</LocalizedText></p>
        <p><LocalizedText>La timeline ricostruisce le lotte, le organizzazioni e le trasformazioni delle condizioni di vita. Dati e grafici permette invece di costruire confronti, scegliendo indicatore, paesi, periodo e scala: comprende serie annuali, definizioni, fonti e download.</LocalizedText></p>
      </div>
      <p className="reading-paths-intro"><LocalizedText>Non occorre conoscere già il marxismo o la storia dei movimenti operai. I tre percorsi aiutano a costruire gradualmente gli strumenti di lettura: capire come si producono e si distribuiscono le risorse, conoscere le forme della solidarietà e confrontare diversi progetti di trasformazione sociale. Si comincia da opere relativamente brevi e si procede verso testi più complessi, con autori di paesi e tradizioni differenti. Non è un programma obbligatorio: puoi fermarti su una domanda, scegliere un’altra lingua o tornare in qualsiasi momento al catalogo completo.</LocalizedText></p>
      <div className="reading-paths">
        {READING_PATHS.map((p, i) => (
          <button
            className={`reading-path ${path === p.id ? "active" : ""}`}
            key={p.id}
            onClick={() => {setPath(path === p.id ? ALL : p.id);setQuery("");setCountry(ALL);setTheme(ALL);setBookLanguage(ALL);}}
            aria-pressed={path === p.id}
          >
            <span className="path-number">
              <LocalizedText>{"0"}</LocalizedText>
              <LocalizedText>{i + 1}</LocalizedText>
            </span>
            <span className="eyebrow">
              <LocalizedText>{p.subtitle}</LocalizedText>
            </span>
            <h3>
              <LocalizedText content>{p.title}</LocalizedText>
            </h3>
            <p>
              <LocalizedText content>{p.description}</LocalizedText>
            </p>
            <span className="path-link">
              <LocalizedText>{p.books.length}</LocalizedText>
              <LocalizedText>{" letture "}</LocalizedText>
              <ArrowUpRight size={17} />
            </span>
          </button>
        ))}
      </div>
      <div className="library-toolbar">
        <div>
          <p className="eyebrow">
            <LocalizedText>{"TESTI E ORIZZONTI"}</LocalizedText>
          </p>
          <h2>
            <LocalizedText>
              {active?.title ?? "La biblioteca aperta"}
            </LocalizedText>
          </h2>
        </div>
        <label className="search-box">
          <Search size={17} />
          <LocalizedInput
            aria-label="Cerca nella biblioteca"
            placeholder="Un autore, un testo, un concetto…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        {active ? (
          <button className="text-link" onClick={() => setPath(ALL)}>
            <LocalizedText>{"Tutti i testi "}</LocalizedText>
            <X size={15} />
          </button>
        ) : null}
      </div>
      {active&&<p className="reading-paths-intro"><LocalizedText>{active.description}</LocalizedText> <LocalizedText>Le opere seguono l’ordine suggerito, dai testi introduttivi agli approfondimenti. I filtri qui sotto restringono questo percorso.</LocalizedText></p>}
      <div className="library-language-bar">
        <label><LocalizedText>Lingua delle edizioni</LocalizedText><select value={bookLanguage} onChange={event => setBookLanguage(event.target.value)} aria-label="Lingua delle edizioni dei libri"><option value="all">Tutte le lingue</option>{availableLanguages.map(code => <option key={code} value={code}>{BOOK_LANGUAGES[code] ?? code}</option>)}</select></label>
        <label><LocalizedText>Contesto degli autori</LocalizedText><select value={country} onChange={event=>setCountry(event.target.value)}><option value="all"><LocalizedText>Tutti i contesti</LocalizedText></option>{countries.map(value=><option key={value} value={value}><LocalizedText>{value}</LocalizedText></option>)}</select></label>
        <label><LocalizedText>Tema</LocalizedText><select value={theme} onChange={event=>setTheme(event.target.value)}><option value="all"><LocalizedText>Tutti i temi</LocalizedText></option>{themes.map(value=><option key={value} value={value}><LocalizedText>{value}</LocalizedText></option>)}</select></label>
        <p><strong>{books.length}</strong> <LocalizedText>opere consultabili negli archivi</LocalizedText> · {availableLanguages.length} <LocalizedText>lingue disponibili</LocalizedText></p>
        <small><LocalizedText>Accedi per leggere nel sito e ritrovare la tua ultima pagina su ogni dispositivo.</LocalizedText></small>
      </div>
      <div className="book-grid">
        {books.slice(page*36,page*36+36).map((book, index) => (
          <article className="book-card" key={book.id}>
            <a href={readingLink(book)}
              className={`book-cover book-tone-${index % 4}`}
              aria-label={`Leggi ${book.title}`}
            >
              <span>
                <LocalizedText defer>
                  {"LA BIBLIOTECA / PolisRossa"}
                </LocalizedText>
              </span>
              <strong>
                <LocalizedText content defer>{book.title}</LocalizedText>
              </strong>
              <em>{book.author}</em>
              <span className="cover-year">
                <LocalizedText defer>{book.period}</LocalizedText>
              </span>
            </a>
            <div className="book-info">
              <p className="eyebrow">
                <LocalizedText defer>{book.lane}</LocalizedText>
              </p>
              <h3><a href={readingLink(book)}><LocalizedText content defer>{book.title}</LocalizedText></a></h3>
              <p className="book-author">
                {book.author}
                <LocalizedText defer>{" · "}</LocalizedText>
                <LocalizedText defer>{book.period}</LocalizedText>
              </p>
              <p>
                <LocalizedText content defer>{book.summary}</LocalizedText>
              </p>
              <button className={`text-link book-save ${savedBooks.has(book.id) ? "is-saved" : ""}`} onClick={() => onToggleBook(book.id)} aria-pressed={savedBooks.has(book.id)}>
                {savedBooks.has(book.id) ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}<LocalizedText defer>{savedBooks.has(book.id) ? "Libro salvato" : "Salva libro"}</LocalizedText>
              </button>
              <a className="book-read-link" href={readingLink(book)}><BookOpen size={17}/><LocalizedText defer>Leggi online</LocalizedText><ArrowUpRight size={17}/></a>
              <p className="book-edition-count">{book.editions?.length} <LocalizedText defer>edizioni linguistiche</LocalizedText> · <LocalizedText defer>{book.level === "base" ? "Per iniziare" : book.level === "avanzato" ? "Approfondimento" : "Lettura intermedia"}</LocalizedText></p>
              <div className="book-links">
                {book.links.map((link) => (
                  <a
                    href={link.url}
                    key={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <LocalizedText defer>{link.label}</LocalizedText>
                    <ArrowUpRight size={15} />
                  </a>
                ))}
              </div>
              <small>
                <LocalizedText defer>
                  {["dipendenza", "femminismo-marxista"].includes(book.id)
                    ? "Percorso tematico: i link portano a riviste e archivi di approfondimento."
                    : book.id === "gramsciana"
                      ? "Il link porta alla Fondazione Gramsci, non al testo integrale dei Quaderni."
                      : "Testo disponibile presso l’archivio esterno indicato."}
                </LocalizedText>
              </small>
            </div>
          </article>
        ))}
      </div>
      {!books.length ? (
        <div className="notice">
          <LocalizedText>
            {
              "Nessun testo trovato. Prova un altro autore o cancella la ricerca."
            }
          </LocalizedText>
        </div>
      ) : null}
      {books.length>36&&<div className="community-pagination"><button type="button" disabled={!page} onClick={()=>setBookPage(value=>value-1)}><LocalizedText>Precedenti</LocalizedText></button><span><LocalizedText>Pagina</LocalizedText> {page+1}/{Math.ceil(books.length/36)}</span><button type="button" disabled={page>=Math.ceil(books.length/36)-1} onClick={()=>setBookPage(value=>value+1)}><LocalizedText>Successivi</LocalizedText></button></div>}
      <details className="library-author-archives" onToggle={event=>setArchivesOpen(event.currentTarget.open)}><summary><LocalizedText>Archivi di autori e tradizioni</LocalizedText></summary>{archivesOpen&&<Suspense fallback={<p role="status"><LocalizedText>Apertura degli archivi…</LocalizedText></p>}><ArchiveDirectory kind="authors"/></Suspense>}</details>
      <details className="library-resources"><summary><LocalizedText>Archivi e percorsi di approfondimento</LocalizedText></summary>{THEORY_LIBRARY.filter(book => !book.editions?.length).map(book => <p key={book.id}><strong>{book.title}</strong> — {book.links.map(link => <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">{link.label} ↗ </a>)}</p>)}</details>
      <section className="glossary">
        <div>
          <p className="eyebrow">
            <LocalizedText>{"LE PAROLE PER ORIENTARSI"}</LocalizedText>
          </p>
          <h2>
            <LocalizedText>{"Un piccolo lessico,"}</LocalizedText>
            <br />
            <em>
              <LocalizedText>{"una porta d’ingresso."}</LocalizedText>
            </em>
          </h2>
          <p>
            <LocalizedText>
              {
                "Definizioni introduttive, non esaustive. I concetti assumono significati diversi nelle diverse tradizioni: i testi sono il luogo per approfondirli."
              }
            </LocalizedText>
          </p>
        </div>
        <div>
          {GLOSSARY.map((g) => (
            <details key={g.term}>
              <summary>
                <LocalizedText content>{g.term}</LocalizedText>
                <span>
                  <LocalizedText>{"+"}</LocalizedText>
                </span>
              </summary>
              <p>
                <LocalizedText content>{g.definition}</LocalizedText>
              </p>
            </details>
          ))}
        </div>
      </section>
      </>:<Suspense fallback={<p role="status"><LocalizedText>Apertura della sezione…</LocalizedText></p>}><SocialAchievements key={section} section={section}/></Suspense>}
      </div>
    </div>
  );
}


export function SavedBooks({ savedBooks, query, onToggleBook }: {
  savedBooks: Set<string>; query: string; onToggleBook: (id: string) => void;
}) {
  const language = useReadingLocale();
  const selectedBooks = THEORY_LIBRARY.filter(book => savedBooks.has(book.id) &&
    `${book.title} ${book.author}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="saved-books" aria-label="Libri salvati">
    <h3><LocalizedText>Libri salvati</LocalizedText></h3>
    {selectedBooks.map(book => {
      const edition = book.editions?.find(item => item.language === language) ?? book.editions?.find(item => item.language === "en") ?? book.editions?.[0];
      const href = edition ? `/read?${new URLSearchParams({ book: book.id, edition: edition.language })}` : book.links[0].url;
      return <article key={book.id}>
        <div>
          <strong><LocalizedText content>{book.title}</LocalizedText></strong>
          <p>{book.author}</p>
          <a href={href}><LocalizedText>Apri il testo</LocalizedText><ArrowUpRight size={14} /></a>
        </div>
        <button className="save-button is-saved" onClick={() => onToggleBook(book.id)} aria-label={`Rimuovi libro dai salvati: ${book.title}`}><BookmarkCheck size={18} /></button>
      </article>;
    })}
  </section>;
}
