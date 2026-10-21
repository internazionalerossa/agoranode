"use client";

import {LocalizedText as T} from "./Localization";

const SELF_HOSTING_URL =
  "https://github.com/internazionalerossa/polisrossa/blob/main/docs/SELF-HOSTING.md";

export default function SharedCustodyView() {
  return (
    <article className="custody-view" aria-labelledby="page-title">
      <header className="custody-opening">
        <p className="eyebrow"><T>UN SITO CHE NON DIPENDA DA UN SOLO COMPUTER</T></p>
        <h1 id="page-title"><T>Condividere la custodia, non il comando.</T></h1>
        <p className="custody-lead">
          <T>
            PolisRossa vuole poter essere conservata e consultata da più persone senza trasformare chi ospita un server nel proprietario del progetto. Oggi è già possibile avviare un nodo locale autonomo di sola consultazione e verificare che usi la stessa release firmata. Replica automatica, subentro fra nodi e governo distribuito sono invece obiettivi ancora da costruire.
          </T>
        </p>
        <aside className="custody-reality" aria-label="Stato attuale">
          <strong><T>Cosa funziona adesso</T></strong>
          <p><T>Codice pubblico, installazioni indipendenti, database locale e checkpoint firmato della release.</T></p>
          <strong><T>Cosa non funziona ancora</T></strong>
          <p><T>Replica del database e del forum, scoperta fra nodi, failover, quorum, rotazione della chiave e cifratura end-to-end.</T></p>
        </aside>
      </header>

      <nav className="custody-index" aria-label="Sezioni della custodia condivisa">
        <a href="#funzionamento"><T>Come funziona</T></a>
        <a href="#avviare-un-nodo"><T>Avviare un nodo</T></a>
        <a href="#possesso"><T>Custodia e autorità</T></a>
        <a href="#checkpoint"><T>Checkpoint v1</T></a>
        <a href="#roadmap"><T>Roadmap</T></a>
      </nav>

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
        </div>
      </section>

      <section id="avviare-un-nodo" aria-labelledby="custody-node-title">
        <p className="eyebrow"><T>UN NODO LOCALE DI SOLA CONSULTAZIONE</T></p>
        <h2 id="custody-node-title"><T>Scarica, avvia, verifica.</T></h2>
        <p><T>Servono Git, Node.js 24 e Docker con Compose. I comandi creano una configurazione privata, avviano app, PostgreSQL e HTTPS, e non sovrascrivono un’installazione già presente.</T></p>
        <pre className="custody-command" tabIndex={0} aria-label="Comandi per avviare un nodo di sola consultazione"><code>{`git clone https://github.com/internazionalerossa/polisrossa.git
cd polisrossa
git switch main
node scripts/selfhost.mjs init https://localhost:9443 mirror --project polisrossa-nodo --http-port 9080
node scripts/selfhost.mjs start
node scripts/selfhost.mjs status
node scripts/selfhost.mjs certificate`}</code></pre>
        <p><T>Questo nodo ascolta soltanto su questo computer. Non richiede modifiche al router, al firewall o al DNS e non diventa automaticamente pubblico. Il certificato locale va reso attendibile seguendo la procedura del proprio sistema; non disattivare la verifica HTTPS.</T></p>
        <p className="custody-action"><a href={SELF_HOSTING_URL} target="_blank" rel="noopener noreferrer"><T>Apri la guida completa al self-hosting</T> ↗</a></p>
      </section>

      <section id="possesso" aria-labelledby="custody-authority-title">
        <p className="eyebrow"><T>RESPONSABILITÀ DISTINTE</T></p>
        <h2 id="custody-authority-title"><T>Conservare una copia non significa possedere il sito.</T></h2>
        <p><T>La disponibilità tecnica e l’autorità sulle decisioni sono due cose diverse. Un gestore può mantenere acceso un nodo, un custode può conservare un backup cifrato e un revisore può verificare una release: nessuno di questi compiti deve assegnare automaticamente l’ultima parola.</T></p>
        <p><T>Una futura delega editoriale dovrà essere pubblica, limitata nello scopo, datata, revocabile e separata dalle credenziali del server. Anche l’autorità temporanea del manutentore iniziale dovrà avere una scadenza o una procedura esplicita di revoca. Questa regola è una direzione di progetto, non una garanzia già applicata dal software.</T></p>
        <blockquote><T>Obiettivo: se resta un solo nodo, il patrimonio pubblico rimane leggibile e il nodo può raccogliere contributi firmati ancora in attesa. Le decisioni definitive si fermano finché non torna il quorum previsto.</T></blockquote>
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
          <li><strong><T>Da progettare · patrimonio pubblico portabile.</T></strong><span><T>Pacchetti deterministici di cataloghi, storia, dati, grafici e sole opere legalmente ridistribuibili, con identificatori, licenze e provenienza verificabili.</T></span></li>
          <li><strong><T>Da progettare · mandato revocabile.</T></strong><span><T>Ruoli separati dall’hosting, deleghe firmate con scadenza, registro pubblico delle revoche e rotazione delle chiavi senza un’autorità permanente.</T></span></li>
          <li><strong><T>Da progettare · decisioni a quorum.</T></strong><span><T>Proposte firmate, regole pubbliche per ammissione e soglia, e coda verificabile delle decisioni sospese quando non ci sono abbastanza partecipanti indipendenti.</T></span></li>
          <li><strong><T>Da progettare · replica e continuità.</T></strong><span><T>Scoperta dei nodi, sincronizzazione del solo stato pubblico, gestione dei conflitti, controlli di salute e un indirizzo stabile che non privilegi il primo computer.</T></span></li>
          <li><strong><T>Prima la protezione delle persone.</T></strong><span><T>Account, forum e dati privati potranno essere replicati soltanto dopo consenso, cancellazione, recupero delle chiavi e cifratura end-to-end realmente implementata e verificata.</T></span></li>
        </ol>
      </section>

      <aside className="custody-limits" aria-labelledby="custody-limits-title">
        <h2 id="custody-limits-title"><T>Limiti da non confondere con funzioni disponibili</T></h2>
        <p><T>Oggi non esistono una blockchain di PolisRossa, un database condiviso tra computer, replica automatica, elezione del gestore, quorum distribuito, failover o cifratura end-to-end. Un backup cifrato protegge una copia; un checkpoint autentica una release; nessuno dei due mantiene da solo il sito vivo.</T></p>
      </aside>
    </article>
  );
}
