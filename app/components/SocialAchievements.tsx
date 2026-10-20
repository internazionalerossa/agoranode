"use client";
import { lazy, Suspense, useState, useRef } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { ACHIEVEMENT_COUNTRIES, ACHIEVEMENT_THEMES, SOCIAL_ACHIEVEMENTS, selectAchievements } from '@/app/data/social-achievements';
import HISTORY from '@/app/data/history-world-index.json';
import { LocalizedText } from './Localization';

const AchievementReadings=lazy(()=>import('./AchievementReadings'));
const SocialHistoryStory=lazy(()=>import('./SocialHistoryStory'));
const ArchiveDirectory = lazy(() => import('./ArchiveDirectory'));
const WorldHistoryExplorer = lazy(() => import('./WorldHistoryExplorer'));
const HistoricalStatistics = lazy(() => import('./HistoricalStatistics'));
const HistoricalDossiers = lazy(() => import('./HistoricalDossiers'));

export default function SocialAchievements() {
  const [country,setCountry] = useState('all');
  const [theme,setTheme] = useState('all');
  const [atlasOpen,setAtlasOpen] = useState(false);
  const [archivesOpen,setArchivesOpen]=useState(false);
  const [dataOpen,setDataOpen]=useState(()=>typeof window!=='undefined'&&HISTORY.indicators.some(item=>item.id===new URL(location.href).searchParams.get('indicatore'))),[reportsOpen,setReportsOpen]=useState(false),[dossiersOpen,setDossiersOpen]=useState(()=>typeof window!=='undefined'&&new URL(window.location.href).searchParams.has('storia'));
  const dataRef=useRef<HTMLDetailsElement>(null);
  const openData=()=>{setDataOpen(true);requestAnimationFrame(()=>{dataRef.current?.scrollIntoView({block:'start'});dataRef.current?.querySelector('summary')?.focus();});};
  const results = selectAchievements(country,theme);
  return <div className="social-achievements" id="conquiste-sociali">
    <div className="usage-guide" aria-label="Guida alle conquiste"><p><strong><LocalizedText>Come esplorare</LocalizedText></strong> <LocalizedText>Comincia dal racconto cronologico: ogni tappa presenta una trasformazione concreta, le persone coinvolte e il contesto in cui maturò. Aprendo un approfondimento trovi spiegazioni più distese e collegamenti ai documenti. Non devi impostare filtri per seguire la storia: la ricerca per paese e argomento si trova nell’archivio, quando vuoi approfondire una domanda particolare.</LocalizedText></p><p><LocalizedText>I confronti statistici aiutano a passare da un’impressione a una domanda verificabile: quanto è cresciuta la produzione? Quante persone hanno avuto accesso all’istruzione? Quanto pesa la casa sul reddito? Scegli la misura che risponde alla tua domanda, affianca i paesi e osserva un periodo comune. Definizioni, unità e dati scaricabili permettono di controllare il confronto e di riprenderlo autonomamente.</LocalizedText> <button className="text-link" type="button" onClick={openData}><LocalizedText>Apri i dati e i confronti</LocalizedText> →</button> <span>{HISTORY.indicators.length} <LocalizedText>indicatori</LocalizedText> · {HISTORY.countries.length} <LocalizedText>paesi ed economie</LocalizedText></span></p></div>
    <Suspense fallback={<p role="status"><LocalizedText>Apertura del percorso storico…</LocalizedText></p>}><SocialHistoryStory/></Suspense>
    <Suspense fallback={null}><AchievementReadings/></Suspense>
    <section className="story-archive" id="archivio-conquiste"><header><p className="eyebrow"><LocalizedText>CONSULTA · CONFRONTA · APPROFONDISCI</LocalizedText></p><h3><LocalizedText>L’archivio delle conquiste</LocalizedText></h3><p><LocalizedText>Qui trovi gli strumenti di ricerca: schede per paese e tema, dati annuali, dossier e raccolte documentarie. Il racconto rimane sopra; i filtri servono quando vuoi approfondire una domanda.</LocalizedText></p></header>
    <details ref={dataRef} className="history-data-archive" open={dataOpen} onToggle={event=>setDataOpen(event.currentTarget.open)}><summary><LocalizedText>Dati e confronti fra paesi</LocalizedText><span>{HISTORY.indicators.length} <LocalizedText>indicatori</LocalizedText> · {HISTORY.countries.length} <LocalizedText>paesi ed economie</LocalizedText></span></summary>{dataOpen&&<Suspense fallback={<p role="status"><LocalizedText>Apertura dei dati…</LocalizedText></p>}><WorldHistoryExplorer/></Suspense>}</details>
    <details className="history-documented-examples" onToggle={event=>setReportsOpen(event.currentTarget.open)}><summary><LocalizedText>Rapporti e indicatori documentati</LocalizedText></summary>{reportsOpen&&<Suspense fallback={null}><HistoricalStatistics/></Suspense>}</details>
    <details className="history-dossiers-archive" open={dossiersOpen} onToggle={event=>setDossiersOpen(event.currentTarget.open)}><summary><LocalizedText>Dossier storici e bibliografie</LocalizedText></summary>{dossiersOpen&&<Suspense fallback={<p role="status"><LocalizedText>Apertura dei dossier…</LocalizedText></p>}><HistoricalDossiers/></Suspense>}</details>
    <details className="history-global-archives" onToggle={event=>setArchivesOpen(event.currentTarget.open)}><summary><LocalizedText>Documenti storici per paesi, movimenti e temi</LocalizedText></summary>{archivesOpen&&<Suspense fallback={<p role="status"><LocalizedText>Apertura degli archivi…</LocalizedText></p>}><ArchiveDirectory kind="history"/></Suspense>}</details>
    <details className="achievements-atlas" onToggle={event=>setAtlasOpen(event.currentTarget.open)}><summary><LocalizedText>Atlante delle conquiste</LocalizedText><span>20 <LocalizedText>paesi</LocalizedText> · 33 <LocalizedText>schede di consultazione</LocalizedText></span></summary>
    {atlasOpen && <>
    <div className="achievements-filters">
      <label><LocalizedText>Esplora un paese</LocalizedText><select value={country} onChange={event => setCountry(event.target.value)}><option value="all"><LocalizedText>Tutto il mondo</LocalizedText></option>{ACHIEVEMENT_COUNTRIES.map(name => <option key={name} value={name}><LocalizedText>{name}</LocalizedText></option>)}</select></label>
      <label><LocalizedText>Una conquista, un tema</LocalizedText><select value={theme} onChange={event => setTheme(event.target.value)}><option value="all"><LocalizedText>Tutti i temi</LocalizedText></option>{ACHIEVEMENT_THEMES.map(name => <option key={name} value={name}><LocalizedText>{name}</LocalizedText></option>)}</select></label>
      <p aria-live="polite">{results.length} <LocalizedText>schede</LocalizedText></p>
    </div>
    <div className="achievements-grid">
      {results.map(item => <article className="achievement-card" key={item.id}>
        <p className="eyebrow"><LocalizedText defer>{item.country}</LocalizedText> · <LocalizedText defer>{item.theme}</LocalizedText></p>
        <span className="achievement-year"><LocalizedText defer>{item.year}</LocalizedText></span>
        <h4><LocalizedText content defer>{item.title}</LocalizedText></h4>
        <p><LocalizedText content defer>{item.text}</LocalizedText></p>
        <p className="achievement-movement"><LocalizedText content defer>{item.movement}</LocalizedText></p>
        <a href={item.url} target="_blank" rel="noopener noreferrer"><LocalizedText defer>{item.source}</LocalizedText><ArrowUpRight size={15}/></a>
      </article>)}
    </div>
    {!results.length && <p className="notice"><LocalizedText>Non ci sono ancora schede per questo incrocio. Scegli un altro tema o esplora tutto il mondo.</LocalizedText></p>}
    </>}
    </details>
    </section>
    <p className="achievements-footnote"><LocalizedText>Raccolta tematica in ampliamento: celebra conquiste documentate e riconosce contributi diversi. I diritti scritti, la loro attuazione e i risultati misurati sono aspetti distinti. Apri i documenti e leggi i testi per approfondire.</LocalizedText></p>
  </div>;
}
