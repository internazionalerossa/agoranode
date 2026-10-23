import {useState,useEffect} from "react";
import {ArrowRight, BookOpen, Network, Search} from "lucide-react";
import {publicLocalSpaces} from "../instances/registry";

type LocalNode = {
  id: string;
  name: string;
  topic: string;
  description: string;
  href: string;
  status: string;
  kind: "local";
};

type PossibleNode = {
  id: string;
  name: string;
  kind: "possible";
  family: string;
};

type SearchIdea = {
  id: string;
  name: string;
  kind: "search-idea";
  family: string;
};

// This display-only catalogue derives from the same allowlisted manifests as /api/nodes.
const nodes: LocalNode[] = publicLocalSpaces().map(space => ({...space, kind: 'local'}));

const possibleNodeFamilies: ReadonlyArray<{name: string; topics: readonly string[]}> = [
  {name: "Scienze e matematica", topics: ["Matematica", "Fisica", "Astronomia", "Chimica", "Biologia", "Geologia", "Scienze del clima", "Statistica", "Informatica teorica"]},
  {name: "Tecnologie e ingegneria", topics: ["Intelligenza artificiale", "Software libero", "Reti e Internet", "Robotica", "Telecomunicazioni", "Energia", "Trasporti", "Architettura e costruzioni", "Manifattura", "Sicurezza informatica"]},
  {name: "Salute e cura", topics: ["Medicina", "Salute pubblica", "Salute mentale", "Farmacologia", "Epidemiologia", "Disabilità e accessibilità", "Assistenza e cura", "Alimentazione"]},
  {name: "Ambiente e territorio", topics: ["Ecologia", "Biodiversità", "Acqua", "Agricoltura", "Foreste", "Oceani", "Città", "Abitare", "Rischi e disastri", "Geografia"]},
  {name: "Società e istituzioni", topics: ["Sociologia", "Antropologia", "Diritto", "Governo e amministrazione", "Democrazia", "Politiche pubbliche", "Migrazioni", "Genere e società", "Lavoro", "Movimenti sociali"]},
  {name: "Economia e organizzazione", topics: ["Economia", "Finanza", "Cooperative", "Sindacati", "Imprese", "Commercio", "Economia digitale", "Povertà e disuguaglianze", "Bilanci pubblici"]},
  {name: "Storia e idee", topics: ["Storia antica", "Storia medievale", "Storia moderna", "Storia contemporanea", "Storia della scienza", "Filosofia", "Studi religiosi", "Archeologia", "Storia del lavoro"]},
  {name: "Educazione e ricerca", topics: ["Scuola", "Università", "Educazione degli adulti", "Didattica", "Ricerca scientifica", "Biblioteche e archivi", "Editoria", "Divulgazione"]},
  {name: "Arti e spettacolo", topics: ["Musica", "Cinema", "Teatro", "Danza", "Arti visive", "Fotografia", "Architettura", "Design", "Fumetto", "Moda"]},
  {name: "Lingue e letterature", topics: ["Letteratura", "Poesia", "Traduzione", "Linguistica", "Lingue del mondo", "Tradizioni orali", "Scrittura", "Letterature per l’infanzia"]},
  {name: "Informazione e comunicazione", topics: ["Giornalismo", "Media", "Comunicazione pubblica", "Piattaforme digitali", "Editoria indipendente", "Propaganda e persuasione", "Dati e visualizzazione", "Accesso all’informazione"]},
  {name: "Sport e attività", topics: ["Calcio", "Sport olimpici", "Sport di squadra", "Atletica", "Ciclismo", "Montagna", "Giochi e scacchi", "Storia dello sport"]},
  {name: "Luoghi e comunità", topics: ["Italia", "Europa", "Africa", "Asia", "Americhe", "Mediterraneo", "Comunità locali", "Popoli e minoranze", "Diaspore"]},
  {name: "Vita quotidiana", topics: ["Cibo e culture alimentari", "Famiglie", "Infanzia", "Età anziana", "Tempo libero", "Tecnologie domestiche", "Mobilità quotidiana", "Consumi"]},
] as const;

const possibleNodes: PossibleNode[] = possibleNodeFamilies.flatMap((family) =>
  family.topics.map((name, index) => ({
    id: `${family.name}-${index}`,
    name,
    kind: "possible" as const,
    family: family.name,
  })),
);

const pageSize = 8;

function normalizeSearchText(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("it");
}

export default function NodeDirectory() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [installed,setInstalled]=useState<LocalNode[]>([]);
  useEffect(()=>{
    const controller=new AbortController();
    void fetch("/api/public-spaces",{signal:controller.signal,cache:"no-store"})
      .then(response=>response.ok?response.json():{spaces:[]})
      .then((value:unknown)=>{
        if(controller.signal.aborted||!value||typeof value!=="object"||!("spaces" in value))return;
        const spaces=(value as {spaces:unknown}).spaces;
        if(!Array.isArray(spaces))return;
        const result:LocalNode[]=spaces.filter(item=>item&&typeof item==="object"&&
            typeof item.spaceId==="string"&&/^[a-z][a-z0-9-]{2,47}$/.test(item.spaceId)&&
            typeof item.name==="string"&&typeof item.topic==="string"&&typeof item.description==="string"&&
            item.href==="/n/"+item.spaceId).map(item=>({
            id:item.spaceId,name:item.name,topic:item.topic,description:item.description,
            href:item.href,status:"Anteprima tematica pubblicata",kind:"local" as const}));
        setInstalled(result);
      }).catch(()=>{});
    return()=>controller.abort();
  },[]);
  const allNodes=[...nodes,...installed];
  const queryTerms = normalizeSearchText(query.trim()).split(/\s+/).filter(Boolean);
  const localMatches = allNodes.filter((node) =>
    queryTerms.every((term) => normalizeSearchText(`${node.name} ${node.topic} ${node.description}`).includes(term)),
  );
  const possibleMatches = possibleNodes.filter((node) =>
    queryTerms.every((term) => normalizeSearchText(`${node.name} ${node.family}`).includes(term)),
  );
  const matchingEntries: Array<LocalNode | PossibleNode | SearchIdea> = [...localMatches, ...possibleMatches];
  if (query.trim() && matchingEntries.length === 0) {
    matchingEntries.push({
      id: `search-${normalizeSearchText(query.trim())}`,
      name: query.trim(),
      kind: "search-idea",
      family: "Tema non ancora nella mappa",
    });
  }
  const pageCount = Math.ceil(matchingEntries.length / pageSize);
  const visibleEntries = matchingEntries.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="app-shell node-directory-shell">
      <a className="skip-link" href="#node-directory-content">Vai ai nodi</a>
      <header className="node-directory-header">
        <a className="node-directory-brand" href="/" aria-label="Portale AgoràNode, trova nodi">
          <Network aria-hidden="true" />
          <span><strong>AgoràNode</strong><small>tecnologia e infrastruttura comune</small></span>
        </a>
        <p>Una rete di comunità tematiche, con conoscenze e decisioni legate al proprio ambito.</p>
      </header>

      <main id="node-directory-content" className="node-directory-main">
        <header className="node-directory-intro">
          <p className="eyebrow">PIAZZA PUBBLICA PER TEMI</p>
          <h1>Conoscenza e discussione, per tema.</h1>
          <p>
            AgoràNode fornisce l’infrastruttura per comunità tematiche autonome.
            In ogni nodo, attualità, fonti, biblioteca, storia, dati e confronto
            pubblico sono collegati; regole e decisioni restano nella comunità.
            Scegli una piazza oppure cerca un argomento.
          </p>
        </header>
        <section className="node-directory-catalog" aria-labelledby="node-directory-catalog-title">
          <div className="node-directory-catalog-heading">
            <div>
              <p className="eyebrow">ACCESSI LOCALI</p>
              <h2 id="node-directory-catalog-title">Trova un nodo</h2>
            </div>
            <span aria-live="polite">{query.trim() ? `${matchingEntries.length} risultati` : `${allNodes.length} nodi locali`}</span>
          </div>
          <label className="node-directory-search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Cerca tra i nodi disponibili</span>
            <input
              type="search"
              value={query}
              maxLength={120}
              onChange={(event) => {
                setQuery(event.currentTarget.value);
                setPage(0);
              }}
              placeholder="Cerca per argomento o nome del nodo"
            />
          </label>
          {query.trim() ? visibleEntries.length > 0 ? (
            <ol className="node-directory-list">
              {visibleEntries.map((entry) => entry.kind === "local" ? (
                <li key={entry.id}>
                  <a className={`node-directory-card node-directory-card-${entry.id}`} href={entry.href}>
                    <span className="node-directory-card-main">
                      <span className="node-directory-topic">{entry.topic}</span>
                      <strong className="node-directory-title">{entry.name} <span>— AgoràNode</span></strong>
                      <span className="node-directory-description">{entry.description}</span>
                      <span className="node-directory-status"><BookOpen size={14} aria-hidden="true" />{entry.status}</span>
                    </span>
                    <ArrowRight className="node-directory-arrow" size={20} aria-hidden="true" />
                  </a>
                </li>
              ) : (
                <li className="node-directory-possible-result" key={entry.id}>
                  <strong>{entry.name}</strong>
                  <span>{entry.family}</span>
                  <span className="node-directory-possible-status">
                    {entry.kind === "search-idea" ? "Idea temporanea · non salvata né attiva" : "Possibile nodo · non attivo"}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="node-directory-empty" role="status">
              Nessun nodo attivo o tema possibile corrisponde alla ricerca.
            </p>
          ) : (
            <>
              <ol className="node-directory-list">
                {allNodes.map((node) => (
                  <li key={node.id}>
                    <a className={`node-directory-card node-directory-card-${node.id}`} href={node.href}>
                      <span className="node-directory-card-main">
                        <span className="node-directory-topic">{node.topic}</span>
                        <strong className="node-directory-title">{node.name} <span>— AgoràNode</span></strong>
                        <span className="node-directory-description">{node.description}</span>
                        <span className="node-directory-status"><BookOpen size={14} aria-hidden="true" />{node.status}</span>
                      </span>
                      <ArrowRight className="node-directory-arrow" size={20} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ol>
              <section className="node-directory-topic-map" aria-labelledby="node-directory-topic-map-title">
                  <p className="eyebrow">ORIZZONTE DEI NODI</p>
                <h3 id="node-directory-topic-map-title">Ogni campo del sapere può avere la sua piazza</h3>
                  <p>Questi sono esempi di comunità possibili, non siti già attivi. Ognuna potrà adottare il formato editoriale di PolisRossa: attualità, biblioteca, conoscenza, cronologia, dati e discussione del proprio ambito. Cerca anche un tema non ancora elencato per visualizzarlo come idea.</p>
                <div>
                  {possibleNodeFamilies.map((family) => (
                    <details key={family.name}>
                      <summary>{family.name}<span>{family.topics.length} temi</span></summary>
                      <ul>{family.topics.map((topic) => <li key={topic}>{topic}</li>)}</ul>
                    </details>
                  ))}
                </div>
                <p className="node-directory-topic-map-note">{possibleNodes.length} esempi di temi; l’elenco non è un catalogo esaustivo e le proposte non equivalgono a nodi attivi.</p>
              </section>
            </>
          )}
          {query.trim() && pageCount > 1 && (
            <nav className="node-directory-pagination" aria-label="Pagine dei risultati">
              <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>
                Precedenti
              </button>
              <span aria-live="polite">Pagina {page + 1} di {pageCount}</span>
              <button type="button" disabled={page + 1 >= pageCount} onClick={() => setPage(page + 1)}>
                Successivi
              </button>
            </nav>
          )}
        </section>
      </main>

      <footer className="node-directory-footer">
        <span>AgoràNode · infrastruttura comune</span>
        <a href="https://github.com/internazionalerossa/agoranode/blob/main/docs/SELF-HOSTING.md" target="_blank" rel="noopener noreferrer">
          Ospitare una copia
        </a>
        <a href="https://github.com/internazionalerossa/agoranode" target="_blank" rel="noopener noreferrer">
          Codice e documentazione
        </a>
      </footer>
    </div>
  );
}
