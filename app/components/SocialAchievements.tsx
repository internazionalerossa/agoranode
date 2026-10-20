"use client";
import { lazy, Suspense, useState, useEffect } from 'react';
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

export default function SocialAchievements({section='timeline'}:{section?:'timeline'|'dati'}) {
  const [country,setCountry] = useState('all');
  const [theme,setTheme] = useState('all');
  const [atlasOpen,setAtlasOpen] = useState(false);
  const [archivesOpen,setArchivesOpen]=useState(false);
  const [reportsOpen,setReportsOpen]=useState(false),[dossiersOpen,setDossiersOpen]=useState(()=>typeof window!=='undefined'&&new URL(window.location.href).searchParams.has('storia'));
  useEffect(()=>{const sync=()=>{const params=new URL(location.href).searchParams;if(params.has('storia'))setDossiersOpen(true);};sync();window.addEventListener('popstate',sync);window.addEventListener('hashchange',sync);return()=>{window.removeEventListener('popstate',sync);window.removeEventListener('hashchange',sync);};},[]);
  const results = selectAchievements(country,theme);
  return <div className="social-achievements" id="conquiste-sociali">
    {section==='timeline'?<>
      <header className="library-research-intro"><p className="eyebrow"><LocalizedText>PERSONE · LOTTE · TRASFORMAZIONI</LocalizedText></p><h2><LocalizedText>Timeline delle conquiste sociali</LocalizedText></h2><p><LocalizedText>Segui le lotte per il lavoro, l’istruzione, la salute e i servizi, dal 1848 a oggi. Ogni tappa collega protagonisti, organizzazioni, contesto e risultati alle fonti documentarie. Gli approfondimenti intrecciano conquiste, repressione e resistenza; dossier, bibliografie e atlante permettono di proseguire la ricerca per paese e tema.</LocalizedText></p><a className="text-link" href="/?view=teoria&percorso=dati"><LocalizedText>Passa ai dati e ai grafici comparativi</LocalizedText> →</a></header>
      <Suspense fallback={<p role="status"><LocalizedText>Apertura del percorso storico…</LocalizedText></p>}><SocialHistoryStory/></Suspense>
      <Suspense fallback={null}><AchievementReadings/></Suspense>
    </>:<>
      <header className="library-research-intro"><p className="eyebrow"><LocalizedText>MISURA · CONFRONTA · VERIFICA</LocalizedText></p><h2><LocalizedText>Dati e grafici comparativi</LocalizedText></h2><p><LocalizedText>Costruisci il tuo confronto su salute, scuola, lavoro, reddito, abitazione e produzione. Scegli un indicatore, affianca fino a quattro paesi o economie e imposta gli anni. Puoi osservare i valori originali o la variazione rispetto a una base comune, esplorare un singolo anno e verificare quando viene raggiunta una soglia. Tabelle annuali, metadati, fonti originali e download in CSV rendono il confronto controllabile e riutilizzabile.</LocalizedText></p><p><strong>{HISTORY.indicators.length} <LocalizedText>indicatori</LocalizedText> · {HISTORY.countries.length} <LocalizedText>paesi ed economie</LocalizedText></strong>. <LocalizedText>La disponibilità degli anni varia per indicatore e paese: i dati mancanti restano visibili e non vengono trasformati in zeri.</LocalizedText></p></header>
      <Suspense fallback={<p role="status"><LocalizedText>Apertura dei dati…</LocalizedText></p>}><WorldHistoryExplorer/></Suspense>
    </>}
    <section className="story-archive" id="archivio-conquiste"><header><p className="eyebrow"><LocalizedText>FONTI · DOSSIER · RICERCA</LocalizedText></p><h3><LocalizedText>{section==='timeline'?'Dossier, atlante e documenti storici':'Documentare e interpretare i confronti'}</LocalizedText></h3><p><LocalizedText>Esplora rapporti statistici commentati, dossier con bibliografie, raccolte documentarie per paesi e movimenti e un atlante di conquiste sociali. Le schede collegano misure, diritti e condizioni di vita alle loro fonti: distinguono le leggi approvate, la loro attuazione e i risultati osservati, per sviluppare una ricerca oltre il singolo grafico o la singola tappa.</LocalizedText></p></header>
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
