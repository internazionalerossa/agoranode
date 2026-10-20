# Polis-Rossa

**Notizie, conoscenza e strumenti comuni.** Polis-Rossa raccoglie fonti socialiste, comuniste, sindacali e anticoloniali, collega le notizie agli editori originali e mette a disposizione una biblioteca multilingue e approfondimenti storici documentati.

Il progetto ha un orientamento dichiarato e una vocazione internazionale. La scelta delle fonti è discutibile e migliorabile; un algoritmo non certifica la qualità di una notizia. Le traduzioni automatiche aiutano la consultazione e possono contenere errori. Aprire la fonte originale resta il modo per leggere il testo completo, verificarne il contesto e sostenere chi lo pubblica.

[English](README.en.md) · [Contribuire / Contribute](CONTRIBUTING.md) · [Partecipazione](docs/COMMUNITY.md) · [Documentazione tecnica](docs/ARCHITECTURE.md)

[Stato delle verifiche e attività aperte](docs/QUALITY.md)

## Stato del progetto

Questa repository contiene il runtime indipendente: React e TypeScript per l’interfaccia, Node.js per le API, PostgreSQL per i dati persistenti e Better Auth per gli account.

Il primo deployment indipendente è in preparazione. Il suo indirizzo sarà inserito qui dopo la verifica. Iscrizioni e forum sono disabilitati per impostazione predefinita: l’apertura richiede configurazione dell’hosting, invio email, verifiche dei dati e completamento degli adempimenti operativi. La presenza del codice non significa che ogni funzione sia già attiva su un servizio pubblico.

Il nome mantiene “Polis” invariato e traduce il colore nella lingua di lettura: Polis-Rossa, Polis-Red, Polis-Rouge. Le traduzioni del marchio sono incluse nel codice e non richiedono servizi esterni.

## Cosa offre

- **Rassegna e fonti.** 177 fonti dirette e 136 canali tematici di ricerca. Ricerca, filtri per argomento, paese, lingua e testata; ordine cronologico, aperture delle fonti e classifiche dei più letti quando pubblicate dagli editori. Nessun contatore di popolarità inventato dal progetto.
- **Lingue distinte.** Menu e comandi seguono la lingua dell’interfaccia; titoli e contenuti seguono la lingua di lettura, con l’opzione di conservarli in originale. Il filtro delle fonti seleziona separatamente le lingue delle pubblicazioni. I testi già nella lingua scelta non vengono ritradotti.
- **Osservatorio mondiale.** Notizie pubblicate nelle ultime sei ore, con testata, paese di provenienza e collegamento originale. La disponibilità dipende dalle fonti.
- **Video.** 84 canali in 27 paesi e 11 lingue, con filtri per lingua, paese, tema e nome del canale. Le riproduzioni si aprono sulle piattaforme originali, senza autoplay.
- **Biblioteca.** 176 opere fra libri, saggi e raccolte, 724 edizioni in 37 lingue, percorsi introduttivi e filtri per lingua, autore, contesto e tema. Un indice separato collega 589 archivi di autori e 83 raccolte storiche: non vengono conteggiati come libri ospitati nel sito.
- **Storia e confronti.** Un racconto cronologico in sette epoche, con sessantaquattro tappe espandibili e un archivio documentario consultabile separatamente; un esploratore di 93 indicatori per 217 paesi o economie, con 408.963 osservazioni dal 1960 al 2025. I dati mancanti restano tali; i confronti non dimostrano da soli rapporti causali.
- **Raccolta personale.** Articoli e libri salvati e ultima posizione di lettura conservati nel database per account, separati dalle cache pubbliche. Le edizioni disponibili per la lettura interna devono avere una base documentata alla riproduzione.
- **Gestione condivisa.** Un’adesione distinta dall’account personale permette di discutere fonti, organizzazione delle notizie, correzioni e funzionalità. Discussioni, issue, proposte e risultati sono pubblici; solo le conversazioni impostate come private sono riservate ai membri IR2. Scrivere e votare richiede l’ammissione. Le votazioni hanno regole verificabili e scrutinio esportabile.

La chat IR2 offre stanze temporanee con link e immagini: 200 parole e un invio al minuto. Tutte le stanze si azzerano ogni 48 ore; un riavvio può cancellarle prima. I thread del forum rimangono nel database.

I numeri descrivono il catalogo incluso in questa versione, non la disponibilità in tempo reale di tutti i collegamenti né una copertura completa della storia mondiale.

## Partecipare senza programmare

Apri [una proposta](https://github.com/internazionalerossa/polisrossa/issues/new/choose), scegli il modulo e spiega quale pagina o funzione vuoi migliorare, con quali modifiche e per quale motivo. Per dati storici, libri e fonti aggiungi riferimenti verificabili. Puoi scrivere nella tua lingua. Non pubblicare informazioni personali, credenziali o documenti riservati.

Per correggere un file puoi usare la matita di GitHub e proporre una pull request. La [guida ai contributi](CONTRIBUTING.md) è disponibile in sei lingue. Issue e pull request consentono di contribuire anche prima dell’apertura del forum interno.

## Eseguire e verificare il codice

Richiede Node.js 24 e npm. I servizi locali di prova possono essere avviati con Docker Compose; non servono credenziali di produzione.

```sh
npm ci
npm run build
npm test
npm run typecheck
```

Per sviluppo, database e invio email consulta [DEPLOYMENT.md](docs/DEPLOYMENT.md). Il filesystem del container non è un archivio permanente: account, salvataggi, messaggi e voti risiedono in PostgreSQL. Il deployment usa `Dockerfile`; non è un sito statico distribuibile integralmente con GitHub Pages.

## Documentazione

| Documento | Contenuto |
| --- | --- |
| [Fonti](docs/SOURCES.md) | Catalogo, provenienza e verifiche dei collegamenti |
| [Architettura](docs/ARCHITECTURE.md) | API, dati, cache e confini di fiducia |
| [Pubblicazione](docs/DEPLOYMENT.md) | Configurazione, migrazioni, verifiche e ripristino |
| [Biblioteca](docs/LIBRARY.md) | Catalogo, lettura, edizioni, diritti e dati storici |
| [Partecipazione](docs/COMMUNITY.md) | Ammissioni, discussioni, voto e limiti delle verifiche |
| [Adempimenti operativi](docs/LEGAL-OPERATIONS.md) | Privacy, contenuti e condizioni da verificare prima dell’apertura |
| [Licenze](docs/LICENSING.md) | Codice originale, dipendenze e contenuti di terzi |

## Licenza e limiti

Il codice originale è **AGPL-3.0-or-later**: sono consentite copie e modifiche alle condizioni della [licenza](LICENSE). L’obiettivo della partecipazione è migliorare uno strumento comune; la gestione comunitaria non limita il diritto di crearne versioni derivate.

La licenza mantiene aperti anche i sorgenti delle versioni modificate offerte online. [NOTICE](NOTICE) riporta gli avvisi e i limiti di garanzia; [TRADEMARKS.md](TRADEMARKS.md) distingue il riuso del codice dall'uso del nome e del logo come identità di un servizio ufficiale. I contributori conservano i propri diritti. Queste condizioni non sostituiscono gli obblighi legali del gestore.

Articoli, immagini, video, libri, traduzioni editoriali e dataset mantengono le rispettive condizioni. Essere consultabili gratuitamente non equivale a essere liberamente ripubblicabili. Il progetto non promette disponibilità continua delle fonti, traduzioni infallibili, identità anagrafiche certificate o votazioni tecnicamente incorruttibili.

## Biblioteca e lingue

La Biblioteca comprende libri gratuiti, percorsi di lettura, storia e un archivio statistico consultabile. La guida iniziale spiega gli strumenti senza aggiungere livelli di navigazione. Partecipa ospita il forum, le votazioni sul progetto e le chat temporanee. Il comando Lingue separa interfaccia e lettura, con la possibilità di vedere i contenuti originali. Le funzioni di partecipazione richiedono il servizio indipendente configurato.
