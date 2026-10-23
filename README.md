# AgoràNode

**Infrastruttura open source per conoscenza condivisa, comunità autonome e reti custodite dalle persone.**

[English](README.en.md) · [Prima lettura per sviluppatori](docs/ALPHA-BASELINE.md) · [Architettura](docs/ARCHITECTURE.md) · [Contribuire](CONTRIBUTING.md) · [Roadmap](docs/DECENTRALIZATION-ROADMAP.md) · [Stato verificato](docs/QUALITY.md) · [Sicurezza](docs/SECURITY-REVIEW.md)

AgoràNode è una piattaforma **AGPL-3.0-or-later** per creare comunità tematiche autonome che condividono lo stesso software: **wiki con fonti e revisioni, feed RSS, biblioteca digitale, timeline narrativa, dati e grafici, forum, proposte e autogoverno comunitario**.

L'obiettivo di lungo periodo è far funzionare il patrimonio pubblico della rete sui **computer di collaboratori indipendenti**, senza dipendere permanentemente da un server fondatore, un database commerciale o un unico cloud. Ogni computer dovrebbe custodire soltanto ciò che è autorizzato e sceglie di ospitare; le modifiche pubbliche devono essere verificabili e replicabili in modo incrementale, mentre le informazioni private restano protette.

**Agorà by AgoràNode è il nodo alpha di riferimento e il nucleo editoriale del prodotto.** Prende forma riutilizzando le soluzioni già sperimentate in PolisRossa, il prototipo storico che conserva contenuti, URL, account e identità autonoma. Agorà ha la propria rassegna RSS/video e una Biblioteca con primi documenti, Timeline narrativa, Atlante ricercabile e dati editoriali; **non è ancora un social federato pronto per la produzione** e il forum PR2 tematico indipendente non è operativo. Consenso BFT in rete, identità portabili, chat federata, runtime completo multi-comunità e failover indipendente non sono ancora operativi. Il registro [QUALITY.md](docs/QUALITY.md) distingue codice implementato, test locali ed evidenze esterne.

## Un motore, comunità diverse

| Concetto | Responsabilità |
| --- | --- |
| `/` | Portale e ricerca dei nodi |
| `/agora` | Nodo alpha di origine Agorà by AgoràNode: rassegna tecnologica, Biblioteca, Atlante e laboratorio |
| `/polisrossa` | Prototipo storico e comunità tematica autonoma: storia, notizie e cultura della sinistra internazionale |
| Nodo tematico | Contenuti, fonti, wiki, biblioteca, dati, regole e membership propri |
| Peer fisico | Un computer che offre storage, banda o servizi a uno o più nodi |

**Un peer non è un elettore e un nodo tematico non è un server.** Più computer possono conservare lo stesso nodo; un computer può ospitarne diversi. Ospitare hardware non dà diritti politici, editoriali o di moderazione.

## Perché esiste

Enciclopedie, aggregatori di notizie, biblioteche digitali e forum oggi spesso vivono in applicazioni separate. AgoràNode vuole renderli **parti della stessa conoscenza navigabile**, senza un algoritmo opaco che decida per gli utenti cosa pensare e senza concentrare dati e potere in una sola infrastruttura.

- **Pagine enciclopediche per ogni tema:** ID stabili, fonti, revisioni, collegamenti a persone, luoghi, eventi, libri, serie statistiche e discussioni. Le pagine pubblicate sono ricercabili anche se non sono nella timeline.
- **Timeline narrativa:** non un elenco di link, ma un racconto con periodo, contesto, testo introduttivo e accesso alle pagine di approfondimento, nello stile sviluppato su PolisRossa.
- **Autogoverno PR2 locale:** i membri PR2 del nodo decidono quali pagine inserire nel racconto, quali modificare o escludere e con quale testo, attraverso proposte tracciate. L'esclusione dalla timeline non cancella una pagina wiki.
- **Biblioteca vera, non una lista di URL:** opere, edizioni, lingue, formati, diritti e file locali verificabili *solo dove la ridistribuzione è permessa*, con collegamenti al resto del sapere.
- **Portabilità e integrità:** registro delle revisioni, esportazioni pubbliche verificabili, backup privati separati, replica senza proprietario unico.
- **Infrastruttura leggera:** indici locali ricostruibili, trasferimento dei soli oggetti mancanti, storage a blocchi deduplicati, consenso limitato alle decisioni che richiedono finalità comune.

Un voto può approvare una regola o una selezione editoriale; **non può rendere vero un fatto**. La verifica delle fonti, delle licenze e delle correzioni resta parte del sistema.

## Stato tecnico

| Sottosistema | Nel repository oggi | Da completare |
| --- | --- | --- |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS; navigazione dei sette moduli, selettore fonti e primo editor a blocchi condivisi | Generalizzare tutte le pagine PolisRossa e i backend per ogni nodo |
| Backend | Node.js, PostgreSQL, Better Auth; flussi locali account/forum | Runtime e database realmente isolati per ogni comunità |
| Wiki | Revisioni pubbliche append-only, provenienza, fonti e pagina strutturata | Editor completo, bozze, review e pubblicazione governata |
| Timeline | Racconto storico PolisRossa con pagine dedicate; wizard di proposte e contratto PR2 in sviluppo | Decisioni integrate con pubblicazione automatizzata verificata |
| Biblioteca | Catalogo multilingue e lettura interna di edizioni autorizzate | Archiviazione selettiva dei file scaricabili e metadati per singola edizione |
| Ricerca e feed | Indice locale PolisRossa, rassegna Agorà da fonti tecnologiche dichiarate, preferiti visitatore e PR1 per nodo | Motore full-text completo, feed per nuovi nodi e fonti attivate con voto PR2 |
| Replica | Pacchetti knowledge firmati, import atomico, peer HTTPS configurabili | Trasporto incrementale a blocchi e discovery fra host indipendenti |
| Storage | Codec a chunk deterministici SHA-256, benchmark sintetico | Integrare CAS al protocollo di pubblicazione e quote persistenti |
| Governance | Certificati di quorum verificati localmente, PR2/PR3 definiti | Consenso BFT operativo tra computer e audit indipendente |
| Social e identità | Forum persistente, chat temporanea, autenticazione | Eventi social federati, stanze, cifratura privata e recovery portabile |

Questa tabella distingue **codice esistente, funzioni alpha e lavoro incompleto**, non promesse di funzioni già attive. Le scelte di stack, i criteri di verifica e i merge già effettuati sono raccolti in [Alpha Baseline](docs/ALPHA-BASELINE.md). Dettagli e limiti sono in [QUALITY.md](docs/QUALITY.md).

## Architettura: piccolo nucleo, dati verificabili

```text
                        Browser / PWA
                             │
                 React + API del nodo tematico
                             │
           ┌─────────────────┴─────────────────┐
     Patrimonio pubblico                 Dati riservati
  wiki · timeline · libri                  account · sessioni
  grafici · fonti · forum                 messaggi · backup
           │                                     │
      PostgreSQL locale                 custodia autorizzata
   indici e audit transazionali          backup cifrati
           │
   revisione, fonti, diritti, decisione PR2
           │
   checkpoint pubblico finalizzato e firmato
           │
   scambio peer con verifica degli oggetti mancanti
           │
      PC volontario A — PC volontario B — altri peer
```

**Replica ogni secondo non significa backup integrale ogni secondo.** Il salvataggio transazionale locale, la decisione di pubblicazione e la ricezione remota sono tre eventi distinti. Il nuovo `knowledge-delta.ts` legge solo le modifiche pubbliche committate dal registro audit locale; non pubblica né autorizza bozze. `peer:watch` verifica periodicamente l'indice dei pacchetti già finalizzati, di default ogni secondo, usando richieste condizionali HTTP per limitare traffico inutile. Non garantisce un RPO di un secondo, finalità globale né replica delle informazioni private.

La replica attuale trasporta ancora bundle v1 cumulativi. Il codec sperimentale [Lean Storage](docs/LEAN-STORAGE.md) permette di riutilizzare blocchi content-addressed, ma **non è ancora il protocollo di rete di produzione**. Per il disegno completo consultare [Continuous Sync](docs/CONTINUOUS-SYNC.md).

## Installare un nodo tematico autonomo di consultazione

Il **Node Studio** permette di comporre in modo visuale una bozza tematica con blocchi, fonti, timeline e materiali. Un operatore può ora revisionarla e installare un manifesto pubblico separato con `npm run space:install -- --confirm-public-readonly <bozza.json> <directory-assoluta>`. Se il server configura `AGORANODE_PUBLIC_SPACES_DIRECTORY`, il nuovo nodo è consultabile su `/n/<id>` e compare nel portale, usando una **pagina React comune**. È una funzione realmente eseguibile, ma **solo read-only**: non crea account, un primo PR2, un forum o un nuovo database completo. Il salvataggio privato dei draft non pubblica nulla. [Procedura e limiti](docs/THEMATIC-BOOTSTRAP.md).

La biblioteca di PolisRossa dispone inoltre di collegamenti permanenti alla **scheda delle singole opere**, con edizioni linguistiche e disponibilità verificata separatamente dai diritti di replica. Le pagine pubbliche della knowledge base hanno un primo editor visuale a blocchi per **preparare** correzioni e inviarle al forum PR2, senza sostituire revisione delle fonti, votazione e pubblicazione autorizzata.

## Biblioteca in due livelli, uguale per ogni nodo

Dalla navigazione generale si apre **Biblioteca**; solo dentro Biblioteca appaiono tre scelte principali: **Libri e percorsi**, **Timeline e Atlante**, **Dati e grafici**. Cliccando **Timeline e Atlante** compaiono due opzioni secondarie: **Timeline** (racconto narrativo selezionato) oppure **Atlante · Indice e ricerca** (tutte le voci attualmente pubblicate e ricercabili). È una precisazione del modulo Biblioteca, **non un nuovo menu principale che sostituisce news, video o Agorà/partecipazione**. [Schema e contratti UX](docs/LIBRARY-TWO-LEVEL-NAVIGATION.md).

Agorà possiede un primo corpus originale documentato nell'Atlante, con fonti, pagine correlate e tappe narrative; PolisRossa mantiene le pagine storiche esistenti e ha una modalità separata di ricerca delle voci del suo patrimonio pubblico. La pubblicazione automatica dopo voto PR2 è ancora da sviluppare.

## Struttura del repository

```text
app/components/    Interfaccia React, moduli comuni, timeline e ricerca
app/data/          Cataloghi e testi attuali di PolisRossa
app/instances/     Manifesti, configurazioni e indici dei nodi
app/lib/           Modelli di dominio, ricerca, conoscenza, proposte
app/platform/      Contratti comuni e governance
server/            API, PostgreSQL, storage conoscitivo, trasporto peer
web/               Entrypoint Vite
scripts/           Build, strumenti operativi, benchmark
tests/             Test Node.js e fixture PGlite
docs/              Specifiche, sicurezza, runbook e evidenze
```

Gli identificatori tecnici storici di PolisRossa (URL, volumi e database) rimangono compatibili; una modifica al frontend non deve distruggere i dati esistenti.

## Avvio per sviluppatori

Richiede **Node.js 24+**, npm e Git.

```bash
git clone https://github.com/internazionalerossa/agoranode.git
cd agoranode
npm ci
npm run dev
```

Per verificare il codice:

```bash
npm run build
npm run typecheck
npm test
npm run benchmark:cas
```

Il benchmark CAS è sintetico: misura una modifica di un byte e i blocchi riutilizzati, **non** consumi energetici o prestazioni di produzione. Un server completo richiede PostgreSQL, configurazione e HTTPS secondo [SELF-HOSTING.md](docs/SELF-HOSTING.md).

I comandi opzionali `npm run peer:serve`, `npm run peer:pull` e `npm run peer:watch` gestiscono **soltanto pacchetti pubblici firmati**, tramite origini conosciute e TLS configurato dall'operatore. Non attivano il social federato, non copiano l'intero database e non sostituiscono backup privati. [Guida peer](docs/PEER-EXCHANGE.md).

## Conoscenza e partecipazione

Un nodo completo deve permettere di cercare un tema e arrivare alla sua pagina enciclopedica, seguirne le revisioni, aprire le fonti, vedere a quali tappe della timeline è collegato, leggere libri e dataset pertinenti e discutere una proposta di correzione. La timeline principale è una **selezione narrativa governata dai PR2 del nodo**, non l'intero elenco delle sue pagine.

Nel prototipo PolisRossa ora puoi selezionare più tappe e preparare una proposta testuale, oppure iniziare una nuova pagina. Su Agorà e nella sezione Agorà di PolisRossa è disponibile un **laboratorio visuale a blocchi** per comporre un nodo, aggiungere fonti, preparare pagine, vedere l'anteprima e salvare bozze private nell'account PR1. La creazione pubblica del nodo resta subordinata a una procedura PR2/federale non ancora attivata. [Guida Node Studio](docs/NODE-STUDIO.md). Il testo passa al modulo PR2 del forum senza pubblicare nulla automaticamente. L'editor visuale completo e l'esecuzione verificata delle decisioni sono lavoro ancora aperto. Contratto e UX: [Node Knowledge Graph](docs/NODE-KNOWLEDGE-GRAPH.md), [Editorial Governance](docs/EDITORIAL-GOVERNANCE.md).

I file di biblioteca devono distinguere **opera, edizione, diritto di replica, file effettivamente disponibile e posizione dei peer**. Un libro indicizzato e linkato non è automaticamente scaricabile o legalmente conservabile sui computer dei collaboratori.

## Come contribuire

Cerchiamo sviluppatori e ricercatori interessati a **TypeScript/React, database, archivi, motori di ricerca, distributed systems, sicurezza, crittografia, UX accessibile, conoscenza strutturata e strumenti di democrazia partecipativa**.

Non occorre introdurre un grande framework per fare un contributo importante: una query più efficiente, una verifica negativa, una pagina più leggibile o un import idempotente possono contare molto più di un nuovo servizio.

1. Leggi [AGENTS.md](AGENTS.md), [CONTRIBUTING.md](CONTRIBUTING.md) e [ARCHITECTURE.md](docs/ARCHITECTURE.md).
2. Individua un problema concreto, descrivine il confine dati e proponi il minimo cambiamento verificabile.
3. Lavora in un branch; includi test su errori, permessi, compatibilità e guasti quando pertinenti.
4. Esegui build, test e typecheck; non committare segreti, dati personali o media senza diritti.
5. Apri una pull request con trade-off, evidenze, modalità di rilascio e possibilità di ripristino.

**Priorità di progetto:** runtime multi-nodo realmente condiviso, wiki/editing PR2, pagine enciclopediche e ricerca completa, biblioteca locale con diritti, replica dei blocchi con quote, consenso validato, identità portabili, social/chat distribuiti e prove fra computer indipendenti.

## Principi di ingegneria

- **Misurare prima di scalare.** Non promettere “indistruttibile”, “senza costi” o capacità da miliardi di utenti con un singolo PC economico.
- **Complessità solo se necessaria.** Prima un monolite modulare, formati versionati e indici ricostruibili. Poi eventuali libp2p, IPFS/CAR, NATS o BFT quando giustificati da test.
- **Nessuna centralizzazione nascosta.** Il gestore delle chiavi, l'algoritmo di ricerca, l'amministratore del repository e il custode del server sono poteri diversi da sottoporre a controllo.
- **Privacy prima dell'immutabilità indiscriminata.** Dati personali, chiavi, chat private e bozze riservate non entrano nel patrimonio pubblico replicato.
- **Compatibilità e trasparenza.** Migrazioni additive, licenze per ogni opera, attribuzioni, storia delle decisioni e limiti documentati.

[Architettura peer-owned](docs/PEER-OWNED-ARCHITECTURE.md) · [Continuous Sync](docs/CONTINUOUS-SYNC.md) · [Lean Storage](docs/LEAN-STORAGE.md) · [Governance](docs/GOVERNANCE.md) · [Biblioteca](docs/LIBRARY.md) · [Roadmap](docs/DECENTRALIZATION-ROADMAP.md) · [Security review](docs/SECURITY-REVIEW.md)

**Licenza:** [AGPL-3.0-or-later](LICENSE). La licenza del codice non estende i diritti su libri, immagini, dataset o testi di terzi: [NOTICE](NOTICE).

*AgoràNode è aperto a chi vuole costruire un'infrastruttura della conoscenza che continui a esistere anche quando il suo primo server si spegne — e che sappia dimostrare, con prove riproducibili, ogni promessa tecnica.*



### Conoscenza in database separati (lettura)

Un manifesto installato può ora essere associato dal gestore a un **pool PostgreSQL pubblico dedicato**, dichiarato esclusivamente lato server con `AGORANODE_PUBLIC_SPACE_DATABASES_JSON`. Sono previsti fino a due collegamenti per pool: la ricerca e le pagine pubbliche del nodo vengono interrogate con namespace vincolato dal backend. Questo amplia il bootstrap dei nodi con una base di conoscenza consultabile, **non** abilita login/PR2/forum multi-tenant o pubblicazione wiki per i nuovi spazi. Configurazione e limiti in [THEMATIC-BOOTSTRAP.md](docs/THEMATIC-BOOTSTRAP.md).
