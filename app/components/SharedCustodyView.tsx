"use client";

import {LocalizedText as T} from "./Localization";
import {INSTANCE_MANIFEST} from "@/app/lib/instance";

export default function SharedCustodyView() {
  return (
    <article className="custody-view" aria-labelledby="page-title">
      <header className="custody-opening">
        <p className="eyebrow"><T>AGORÀNODE · CONOSCENZA PUBBLICA E AUTOGOVERNO</T></p>
        <h1 id="page-title"><T>Un formato comune, molti nodi governati dalle loro comunità.</T></h1>
        <p className="custody-lead">
          <T>
            AgoràNode è l’infrastruttura comune; PolisRossa è la prima istanza, dedicata alla storia, all’attualità e alla cultura delle sinistre. Ogni nodo tratta un argomento diverso ma offre lo stesso insieme riconoscibile di strumenti: notizie, video, biblioteca, pagine enciclopediche, percorso storico, dati e forum democratico. Ospitare il servizio non significa possederlo.
          </T>
        </p>
        <aside className="custody-reality" aria-label="Stato attuale">
          <strong><T>Cosa funziona adesso</T></strong>
          <p><T>PolisRossa, il contratto comune AgoràNode, codice pubblico, installazioni indipendenti, database locale e un deposito pubblico in sola lettura con tutte le revisioni di 64 eventi e 17 persone, puntatori alle versioni correnti ed esportazione deterministica.</T></p>
          <strong><T>Cosa non funziona ancora</T></strong>
          <p><T>Scrittura enciclopedica pubblica, creazione automatica di nuovi nodi, trasporto collaudato fra PC indipendenti, scoperta dei nodi e failover. Account, forum e dati personali sono esclusi dalla replica pubblica; la loro replica e la cifratura end-to-end non sono implementate.</T></p>
        </aside>
      </header>

      <nav className="custody-index" aria-label="Sezioni della custodia condivisa">
        <a href="#formato"><T>Il formato AgoràNode</T></a>
        <a href="#funzionamento"><T>Come funziona</T></a>
        <a href="#avviare-un-nodo"><T>Avviare un nodo</T></a>
        <a href="#possesso"><T>Custodia e autorità</T></a>
        <a href="#conservazione"><T>Conservare PolisRossa</T></a>
        <a href="#checkpoint"><T>Checkpoint v1</T></a>
        <a href="#roadmap"><T>Roadmap</T></a>
      </nav>

      <section id="formato" aria-labelledby="agoranode-format-title">
        <p className="eyebrow"><T>LO STESSO PATTO PER OGNI ARGOMENTO</T></p>
        <h2 id="agoranode-format-title"><T>Che cosa deve offrire un AgoràNode.</T></h2>
        <p><T>Il nome del nodo, il tema, le fonti e la comunità possono cambiare. La struttura resta uguale, così chi arriva sa dove leggere, verificare, confrontare e partecipare. Un’installazione incompleta può essere una copia di consultazione, ma non viene presentata come un AgoràNode pienamente operativo.</T></p>
        <div className="custody-grid">
          <article><span aria-hidden="true">01</span><h3><T>Notizie scritte e video</T></h3><p><T>Una rassegna leggibile per fonte, lingua, luogo e data, con collegamento all’originale e senza trasformare la selezione in una certificazione di verità.</T></p></article>
          <article><span aria-hidden="true">02</span><h3><T>Biblioteca e wiki</T></h3><p><T>Opere gratuite leggibili nel sito quando la licenza lo permette, catalogo delle altre edizioni e pagine enciclopediche con fonti, revisioni e collegamenti stabili. Per i futuri contributi originali, la licenza viene scelta dall’autore.</T></p></article>
          <article><span aria-hidden="true">03</span><h3><T>Storyline dell’argomento</T></h3><p><T>Eventi, persone e concetti indicizzati diventano pagine complete, collegate fra loro e inserite in un percorso cronologico comprensibile.</T></p></article>
          <article><span aria-hidden="true">04</span><h3><T>Dati e confronti storici</T></h3><p><T>Serie, unità, popolazione osservata, anni e fonti restano insieme ai grafici; ogni confronto può essere aperto con un link permanente e scaricato.</T></p></article>
          <article><span aria-hidden="true">05</span><h3><T>Forum democratico</T></h3><p><T>La comunità del singolo nodo discute contenuti e regole, ammette i membri abilitati e vota le proposte secondo procedure pubbliche e verificabili.</T></p></article>
          <article><span aria-hidden="true">06</span><h3><T>Custodia portabile</T></h3><p><T>Codice, conoscenza pubblica e provenienza devono poter essere verificati ed esportati senza includere password, sessioni, dati personali o segreti del gestore.</T></p></article>
        </div>
        <p><T>Questa è la home principale di AgoràNode. Il suo spazio di coordinamento governerà soltanto formato comune, protocollo, sicurezza e risorse federali; resta separato dal forum di PolisRossa, che governa l’istanza tematica. La pagina principale è pubblicata, mentre account, forum federale ed elezioni PR3 non vengono dichiarati aperti finché il flusso completo non supera il collaudo.</T></p>
      </section>

      <section id="funzionamento" aria-labelledby="custody-how-title">
        <p className="eyebrow"><T>IL MODELLO ATTUALE</T></p>
        <h2 id="custody-how-title"><T>Stesso progetto, installazioni separate.</T></h2>
        <div className="custody-grid">
          <article>
            <span aria-hidden="true">01</span>
            <h3><T>Il codice è comune</T></h3>
            <p><T>Il repository contiene interfaccia, server e schema del database. La licenza AGPL permette di studiarli, eseguirli e modificarli alle sue condizioni; la cronologia Git rende le modifiche verificabili.</T></p>
          </article>
          <article>
            <span aria-hidden="true">02</span>
            <h3><T>Ogni nodo è indipendente</T></h3>
            <p><T>Un nodo di sola consultazione usa un proprio database tecnico e raccoglie autonomamente le fonti pubbliche. Non riceve account, sessioni, preferiti, messaggi o voti da un’altra installazione.</T></p>
          </article>
          <article>
            <span aria-hidden="true">03</span>
            <h3><T>L’host non governa</T></h3>
            <p><T>Le parole “primary” e “mirror” indicano soltanto una configurazione del software. Tenere acceso un computer non attribuisce diritti editoriali, politici o di voto e non rende quel computer il centro della rete.</T></p>
          </article>
          <article>
            <span aria-hidden="true">04</span>
            <h3><T>La conoscenza conserva la propria storia</T></h3>
            <p><T>Le API pubbliche in sola lettura espongono la revisione corrente, l’intera cronologia approvata, una revisione precisa tramite la sua impronta e un’esportazione deterministica. Il bundle include tutte le revisioni immutabili e indica separatamente quali sono correnti.</T></p>
          </article>
        </div>
      </section>

      <section id="avviare-un-nodo" aria-labelledby="custody-node-title">
        <p className="eyebrow"><T>UN NODO LOCALE DI SOLA CONSULTAZIONE</T></p>
        <h2 id="custody-node-title"><T>Scarica, avvia, verifica.</T></h2>
        <p><T>Servono Git, Node.js 24 e Docker con Compose. I comandi creano una configurazione privata, avviano app, PostgreSQL e HTTPS, e non sovrascrivono un’installazione già presente.</T></p>
        <pre className="custody-command" tabIndex={0} aria-label="Comandi per avviare un nodo di sola consultazione"><code>{`git clone https://github.com/internazionalerossa/agoranode.git
cd agoranode
git switch main
node scripts/selfhost.mjs init https://localhost:9443 mirror --project polisrossa-nodo --http-port 9080
node scripts/selfhost.mjs start
node scripts/selfhost.mjs status
node scripts/selfhost.mjs certificate`}</code></pre>
        <p><T>Questo nodo ascolta soltanto su questo computer. Non richiede modifiche al router, al firewall o al DNS e non diventa automaticamente pubblico. Il certificato locale va reso attendibile seguendo la procedura del proprio sistema; non disattivare la verifica HTTPS.</T></p>
        <p className="custody-action"><a href={INSTANCE_MANIFEST.links.selfHosting} target="_blank" rel="noopener noreferrer"><T>Apri la guida completa al self-hosting</T> ↗</a></p>
      </section>

      <section id="possesso" aria-labelledby="custody-authority-title">
        <p className="eyebrow"><T>RESPONSABILITÀ DISTINTE</T></p>
        <h2 id="custody-authority-title"><T>Governo comune, non proprietà dell’host.</T></h2>
        <p><T>La disponibilità tecnica e l’autorità sulle decisioni sono due cose diverse. Il protocollo e il registro PR3 sono implementati e collaudati localmente; l’emissione delle credenziali dai nodi, l’ammissione federale dei nodi e l’interfaccia pubblica non sono ancora collegate. Non è quindi il governo già attivo del servizio.</T></p>
        <div className="custody-grid">
          <article><span aria-hidden="true">01</span><h3><T>Assemblea del nodo</T></h3><p><T>La comunità della singola istanza delibera sui propri contenuti e sulle proprie regole con procedure, soglie, esiti e possibilità di ricorso pubblici.</T></p></article>
          <article><span aria-hidden="true">02</span><h3><T>Gruppi di lavoro e mandati</T></h3><p><T>Compiti circoscritti hanno durata dichiarata, responsabilità verificabili e una procedura di revoca; non diventano un diritto permanente all’ultima parola.</T></p></article>
          <article><span aria-hidden="true">03</span><h3><T>Coordinamento federale AgoràNode</T></h3><p><T>Il formato comune ha questa home principale ma richiede un’assemblea e un forum separati da quelli dei nodi. Il registro PR3 sa verificare candidatura, voto, mandato, scadenza e richiamo; l’accesso reale degli utenti non è ancora aperto.</T></p></article>
          <article><span aria-hidden="true">04</span><h3><T>Custodi tecnici</T></h3><p><T>Chi mantiene un server, conserva un backup o verifica una release non riceve voti aggiuntivi. Operazioni e cambi di mandato dovranno lasciare un audit pubblico contestabile.</T></p></article>
        </div>
        <div className="custody-role-ladder" aria-label="Livelli di partecipazione">
          <article><strong>PR1</strong><span><T>Account personale: lettura, raccolte e candidatura a membro del proprio nodo.</T></span></article>
          <article><strong>PR2</strong><span><T>Membro ammesso e votante in un nodo preciso. Un PR2 attivo di qualsiasi nodo federato può presentare una candidatura PR3.</T></span></article>
          <article><strong>PR3</strong><span><T>Mandato federale AgoràNode ottenuto con candidatura pubblica ed elezione: ha scopo, durata, obbligo di relazione, incompatibilità e revoca. Non è automatico e non deriva dal possesso di un server.</T></span></article>
        </div>
        <p><T>La gerarchia proposta adatta tre meccanismi concreti: assemblee di base, delegati eletti verso congressi di livello superiore e organi esecutivi responsabili davanti all’organo che li elegge. La discussione rimane aperta prima del voto; dopo una decisione valida il mandato esecutivo è unitario e verificabile. A differenza di una catena di comando permanente, ogni competenza è enumerata, ogni mandato scade e la base può revocarlo.</T></p>
        <p><T>Ogni delega editoriale deve essere pubblica, limitata nello scopo, datata, revocabile e separata dalle credenziali del server. Il runtime PR3 applica già durata, catena append-only e richiamo; ricorso, incompatibilità e collegamento con i forum devono ancora essere implementati e collaudati prima dell’apertura.</T></p>
        <blockquote><T>Obiettivo: se resta un solo nodo, il patrimonio pubblico rimane leggibile e il nodo può raccogliere contributi firmati ancora in attesa. Le decisioni definitive si fermano finché non torna il quorum previsto.</T></blockquote>
      </section>

      <section id="conservazione" aria-labelledby="custody-preservation-title">
        <p className="eyebrow"><T>POLISROSSA È PATRIMONIO, NON UN FILE USA E GETTA</T></p>
        <h2 id="custody-preservation-title"><T>Le correzioni aggiungono storia; non cancellano quella precedente.</T></h2>
        <p><T>L’identità pubblica <code>polisrossa</code> e i suoi identificatori rimangono stabili. Il primo import comprende 64 eventi e 17 persone. Una nuova versione può diventare corrente senza riscrivere la precedente: lo storico pubblico conserva autore, richiedente, discussione, metodo ed esito dell’approvazione, data della decisione e impronta della versione precedente. Le normali funzioni del sito non offrono una cancellazione distruttiva di questo patrimonio.</T></p>
        <p><T>AgoràNode non richiede né cerca compatibilità con Wikipedia e non impone una licenza pubblica unica. Quando la scrittura verrà aperta, ogni autore sceglierà la licenza del proprio contributo. Questa scelta resterà separata dal grant editoriale AgoràNode, necessario perché il nodo possa conservare il contributo, mantenerlo visibile a tutti senza costo di accesso e pubblicare soltanto revisioni approvate democraticamente.</T></p>
        <p><T>Il grant è ancora una bozza da sottoporre a revisione legale e il flusso pubblico fra proposta, decisione e pubblicazione non è aperto. Oggi le pagine e le cronologie si possono consultare; non si può inviare una modifica enciclopedica dal sito. Ai contenuti iniziali non viene attribuita una licenza inventata.</T></p>
        <p><T>Backup cifrati con prova di ripristino, esportazioni deterministiche e un motore di replica validato fra database separati permettono a custodi indipendenti di conservare copie verificabili. Password, sessioni, indirizzi email, identità sociali, preferiti e altri dati personali non entrano nell’archivio pubblico e restano cancellabili secondo i diritti delle persone.</T></p>
        <p className="custody-action"><a href="/api/knowledge/export" download><T>Scarica l’esportazione pubblica della conoscenza</T> ↓</a></p>
        <p><T>Nessun software può promettere che dei dati siano letteralmente “impossibili da eliminare” finché esistono su un solo computer: chi controlla disco, chiavi e backup può distruggerli. Il motore locale rifiuta pacchetti alterati e converge fra database separati, ma la garanzia forte richiede ancora più computer indipendenti collegati e collaudati. Per questo nessun singolo gestore, compreso quello iniziale, viene descritto come proprietario permanente di PolisRossa.</T></p>
      </section>

      <section id="checkpoint" aria-labelledby="custody-checkpoint-title">
        <p className="eyebrow"><T>CHECKPOINT RELEASE-ONLY · VERSIONE 1</T></p>
        <h2 id="custody-checkpoint-title"><T>Provare quale release si sta verificando.</T></h2>
        <p><T>Il checkpoint elenca gli hash dei file eseguibili ammessi e firma il manifesto con Ed25519. Un altro nodo può verificare firma e corrispondenza con la propria release già costruita, poi registrare nel proprio database soltanto la provenienza e la testa della catena.</T></p>
        <div className="custody-command-pair">
          <div>
            <h3><T>Sul nodo che firma</T></h3>
            <pre className="custody-command" tabIndex={0}><code>{`node scripts/selfhost.mjs snapshot-keygen
node scripts/selfhost.mjs snapshot-export`}</code></pre>
          </div>
          <div>
            <h3><T>Sul nodo che verifica</T></h3>
            <pre className="custody-command" tabIndex={0}><code>{`node scripts/selfhost.mjs snapshot-verify <snapshot> public.pem
node scripts/selfhost.mjs snapshot-import <snapshot> public.pem
node scripts/selfhost.mjs snapshot-status`}</code></pre>
          </div>
        </div>
        <p><T>Il bundle contiene soltanto manifesto e firma: non trasporta né installa il codice, non copia il database e non dimostra che il servizio in esecuzione sia configurato come mirror. La chiave pubblica va verificata attraverso un canale autenticato separato.</T></p>
      </section>

      <section id="roadmap" aria-labelledby="custody-roadmap-title">
        <p className="eyebrow"><T>PASSI VERIFICABILI, NON PROMESSE</T></p>
        <h2 id="custody-roadmap-title"><T>La strada verso una custodia realmente condivisa.</T></h2>
        <ol className="custody-roadmap">
          <li><strong><T>Presente · nodo indipendente.</T></strong><span><T>Installazione locale in sola consultazione e checkpoint release-only v1, senza contenuti degli utenti.</T></span></li>
          <li><strong><T>Presente · primo deposito pubblico portabile.</T></strong><span><T>Le 81 entità iniziali — 64 eventi e 17 persone — hanno revisioni append-only, puntatori correnti, provenienza e un bundle deterministico pubblico privo di account e segreti.</T></span></li>
          <li><strong><T>Presente · replica pubblica locale verificata.</T></strong><span><T>Pacchetti firmati, catena dei predecessori, quorum tecnico e importazione transazionale convergono fra database separati nei test. Account, forum e segreti sono esclusi.</T></span></li>
          <li><strong><T>Presente · mandato PR3 verificabile.</T></strong><span><T>Il runtime accetta una credenziale PR2 firmata da un nodo ammesso, congela l’elettorato e registra elezione, attivazione, scadenza e richiamo append-only. Emissione delle credenziali, ammissione democratica dei nodi e interfaccia restano da collegare.</T></span></li>
          <li><strong><T>Da estendere · patrimonio pubblico completo.</T></strong><span><T>Cataloghi, serie statistiche, grafici e sole opere legalmente ridistribuibili devono ancora entrare in pacchetti uniformi.</T></span></li>
          <li><strong><T>Da collaudare · trasporto e continuità.</T></strong><span><T>Scoperta e sincronizzazione fra computer indipendenti, gestione operativa dei conflitti, controlli di salute e un indirizzo stabile che non privilegi il primo computer.</T></span></li>
          <li><strong><T>Prima la protezione delle persone.</T></strong><span><T>Account, forum e dati privati potranno essere replicati soltanto dopo consenso, cancellazione, recupero delle chiavi e cifratura end-to-end realmente implementata e verificata.</T></span></li>
        </ol>
      </section>

      <aside className="custody-limits" aria-labelledby="custody-limits-title">
        <h2 id="custody-limits-title"><T>Limiti da non confondere con funzioni disponibili</T></h2>
        <p><T>AgoràNode non è una blockchain. Esistono un motore locale di replica del solo patrimonio pubblico e un runtime elettorale PR3 testati, ma non una rete multi-PC collaudata, un database condiviso di account o forum, un failover pubblico o cifratura end-to-end. Un backup cifrato protegge una copia; da solo non mantiene il sito vivo.</T></p>
      </aside>
    </article>
  );
}
