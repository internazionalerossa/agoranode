# PolisRossa

**Notizie, conoscenza e strumenti comuni.** PolisRossa è un progetto editoriale e software che mette in relazione l’informazione quotidiana con gli strumenti necessari a comprenderla. Raccoglie fonti socialiste, comuniste, sindacali e anticoloniali da paesi diversi; accanto alle notizie offre libri gratuiti, percorsi introduttivi, ricostruzioni storiche e dati internazionali consultabili. Ogni articolo rimanda alla pubblicazione originale: l’obiettivo è facilitare la scoperta delle fonti e sostenere la lettura del loro lavoro.

Il progetto si rivolge anche a chi non conosce il lessico delle sinistre. Un termine come salario, proprietà pubblica o cooperazione apre domande concrete: come si guadagna da vivere, chi decide gli investimenti, come si organizzano servizi e risorse condivise? La biblioteca e il racconto storico aiutano a passare dalla singola notizia al suo contesto, con spiegazioni progressive e documenti da verificare. Non occorre aderire a una posizione politica per consultare, interrogare o discutere i contenuti.

L’orientamento editoriale è dichiarato e la prospettiva è internazionale. Fonti e interpretazioni possono essere discusse e migliorate: una classificazione automatica aiuta a organizzare la raccolta, ma non certifica che ogni notizia sia corretta. Le traduzioni rendono accessibili testi di altre lingue, pur potendo perdere sfumature o commettere errori. Per questo la fonte originale rimane sempre il riferimento per leggere il testo completo, verificare il contesto e riconoscere il lavoro di chi lo pubblica.

[English](README.en.md) · [Contribuire / Contribute](CONTRIBUTING.md) · [Partecipazione](docs/COMMUNITY.md) · [Documentazione tecnica](docs/ARCHITECTURE.md)

[Stato delle verifiche e attività aperte](docs/QUALITY.md)

## Stato del progetto

Questa repository contiene il codice dell’applicazione indipendente, compresi interfaccia, server, configurazione e struttura del database. React e TypeScript costruiscono le pagine che il visitatore usa; Node.js esegue sul server le operazioni necessarie a raccogliere i contenuti e gestire le richieste. PostgreSQL è l’archivio remoto dei dati che devono durare, come account, salvataggi, discussioni e voti. Better Auth gestisce accesso, sessioni e recupero dell’account.

Questa distinzione è importante: una copia temporanea nel browser rende la lettura più veloce, ma può scomparire cancellando i dati locali. Un salvataggio associato all’account viene invece conservato nel database del servizio e può essere ritrovato da un altro dispositivo, quando il servizio indipendente è configurato e attivo.

Il primo deployment indipendente è in preparazione. Il suo indirizzo sarà inserito qui dopo la verifica. Iscrizioni e forum sono disabilitati per impostazione predefinita: l’apertura richiede configurazione dell’hosting, invio email, verifiche dei dati e completamento degli adempimenti operativi. La presenza del codice non significa che ogni funzione sia già attiva su un servizio pubblico.

Il nome mantiene “Polis” invariato e traduce il colore nella lingua di lettura: PolisRossa, PolisRed, PolisRouge. Le traduzioni del marchio sono incluse nel codice e non richiedono servizi esterni.

## Come orientarsi

Puoi iniziare dalle notizie e aprire subito una fonte, oppure seguire una domanda più ampia nella Biblioteca. La rassegna alterna paesi e testate per non lasciare tutto lo spazio all’editore che pubblica di più; l’ordine cronologico rimane una scelta separata. Per seguire l’attualità immediata scegli “Ultime 6 ore” nel filtro Periodo della rassegna: i canali regionali dell’Osservatorio confluiscono nella stessa lista e rispettano gli stessi filtri. Nella Biblioteca i percorsi aiutano a scegliere un primo testo, mentre Conquiste mette in relazione eventi, diritti e risultati misurabili. L’archivio statistico si usa quando vuoi approfondire un confronto specifico, senza dover attraversare i filtri per leggere il racconto.

Partecipa distingue il confronto libero dalle decisioni sul funzionamento del sito. Il forum permette conversazioni articolate; le issue descrivono problemi o miglioramenti; le votazioni scelgono fra proposte esplicite. Queste funzioni richiedono il servizio indipendente attivo e l’ammissione prevista dalle regole.

La rassegna mostra subito ricerca, periodo e ordinamento. “Filtri” raccoglie lingua originale, area geografica, fonte e argomenti senza ulteriori pannelli annidati. L’impaginazione è centrata e più compatta: tre colonne sugli schermi ampi, due su quelli intermedi e una sul telefono. I vecchi collegamenti all’Osservatorio aprono direttamente il periodo delle ultime sei ore.

## Cosa offre

- **Rassegna e fonti.** 182 fonti dirette e 136 canali tematici di ricerca. Ricerca, filtri per argomento, paese, lingua e testata; ordine cronologico oppure alternanza fra paesi e testate. I temi sono riconosciuti nei singoli articoli, senza ereditare i tag generali degli editori. Nessun contatore di popolarità inventato dal progetto.
- **Lingue distinte.** Menu e comandi seguono la lingua dell’interfaccia; titoli e contenuti seguono la lingua di lettura, con l’opzione di conservarli in originale. Il filtro delle fonti seleziona separatamente le lingue delle pubblicazioni. I testi già nella lingua scelta non vengono ritradotti.
- **Osservatorio mondiale.** Notizie pubblicate nelle ultime sei ore, con testata, paese di provenienza e collegamento originale. La disponibilità dipende dalle fonti.
- **Video.** 90 canali in 28 paesi e 11 lingue, con filtri per lingua, paese, tema e nome del canale. Le riproduzioni si aprono sulle piattaforme originali, senza autoplay.
- **Biblioteca.** 176 opere fra libri, saggi e raccolte, 724 edizioni in 37 lingue, percorsi introduttivi e filtri per lingua, autore, contesto e tema. Un indice separato collega 589 archivi di autori e 83 raccolte storiche: non vengono conteggiati come libri ospitati nel sito.
- **Storia e confronti.** Un racconto cronologico in sette epoche, con sessantaquattro tappe espandibili e un archivio documentario consultabile separatamente; un esploratore di 93 indicatori per 217 paesi o economie, con 408.963 osservazioni dal 1960 al 2025. I dati mancanti restano tali; i confronti non dimostrano da soli rapporti causali.
- **Raccolta personale.** Articoli e libri salvati e ultima posizione di lettura conservati nel database per account, separati dalle cache pubbliche. Le edizioni disponibili per la lettura interna devono avere una base documentata alla riproduzione.
- **Gestione condivisa.** Un’adesione distinta dall’account personale permette di discutere fonti, organizzazione delle notizie, correzioni e funzionalità. Discussioni, issue, proposte e risultati sono pubblici; solo le conversazioni impostate come private sono riservate ai membri PR2. Scrivere e votare richiede l’ammissione. Le votazioni hanno regole verificabili e scrutinio esportabile.

La chat PR2 offre stanze temporanee con link e immagini: 200 parole e un invio al minuto. Tutte le stanze si azzerano ogni 48 ore; un riavvio può cancellarle prima. I thread del forum rimangono nel database.

I numeri descrivono il catalogo incluso in questa versione, non la disponibilità in tempo reale di tutti i collegamenti né una copertura completa della storia mondiale.

## Partecipare senza programmare

**Il progetto ha bisogno del tuo sguardo.** Cerchiamo persone che aiutino a valutare contenuti, testi, fonti, dati e direzione del progetto. Ogni scelta può essere discussa: una spiegazione, una traduzione, un confronto fra paesi, una funzione, un’immagine o la posizione di un pulsante. Anche chi arriva per la prima volta può notare qualcosa che sfugge a chi costruisce il sito. Non servono competenze tecniche né una soluzione già pronta: racconta con parole tue che cosa vorresti migliorare. Le proposte vengono discusse, verificate e sviluppate insieme prima della pubblicazione.

Apri [una proposta](https://rassegnarossa.luigilmnc.chatgpt.site/?view=partecipa&nuova=proposta) nel forum del sito. Per pubblicare serve PR2: collega un social tramite autorizzazione e presenta la domanda ai membri. Un’issue è una pagina pubblica dedicata a un problema o a un miglioramento, con risposte raccolte nello stesso luogo. Non devi sapere programmare: indica la pagina interessata, descrivi che cosa è poco chiaro o non funziona e spiega quale risultato vorresti ottenere. Un esempio concreto aiuta più di una formulazione tecnica.

Per dati storici, libri e nuove fonti aggiungi riferimenti verificabili e, quando disponibili, indicazioni sulla licenza. Puoi scrivere nella tua lingua e proporre direttamente una frase alternativa. Non pubblicare informazioni personali, credenziali o documenti riservati: il testo delle issue è visibile a chiunque.

Per correggere un file puoi usare la matita di GitHub e proporre una pull request, cioè una modifica che i manutentori possono leggere e verificare prima di integrarla. La modifica proposta non sostituisce immediatamente il progetto pubblico. La [guida ai contributi](CONTRIBUTING.md), disponibile in sei lingue, descrive i passaggi anche per chi non ha mai usato questi strumenti. Le proposte, le issue e le votazioni si svolgono nel forum interno. GitHub conserva sorgenti e revisioni tecniche.

## Eseguire e verificare il codice

Richiede Node.js 24 e npm. I servizi locali di prova possono essere avviati con Docker Compose; non servono credenziali di produzione.

```sh
npm ci
npm run build
npm test
npm run typecheck
```

Per sviluppo, database e accesso social consulta [DEPLOYMENT.md](docs/DEPLOYMENT.md). Il filesystem del container non è un archivio permanente: account, salvataggi, messaggi e voti risiedono in PostgreSQL. Il deployment usa `Dockerfile`; non è un sito statico distribuibile integralmente con GitHub Pages.

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

La Biblioteca ha tre accessi distinti: Libri e percorsi, Timeline storica, Dati e grafici. La timeline collega storia, protagonisti e documenti; Dati e grafici apre direttamente i confronti personalizzabili, con indicatori, fino a quattro paesi, periodo, valori o indice comune, tabelle annuali, soglie, fonti e CSV. I vecchi collegamenti ai dossier e agli indicatori aprono la destinazione corrispondente. La guida iniziale spiega gli strumenti senza aggiungere livelli di navigazione. Partecipa ospita il forum, le votazioni sul progetto e le chat temporanee. Il comando Lingua di lettura è visibile nell’intestazione: consente di usare l’interfaccia nella lingua del lettore con i contenuti originali, tradurre entrambi nella stessa lingua o scegliere separatamente le due lingue. Le funzioni di partecipazione richiedono il servizio indipendente configurato.

Per portare online il servizio indipendente, seguire [Prima pubblicazione](docs/PUBLICATION.md): configurazione gratuita, verifiche reali, informative e procedure necessarie prima di aprire account e comunità.

## App per telefono

Il codice prepara l’installazione dalla schermata Home su Android e iPhone, con icone dedicate, avvio in finestra autonoma, navigazione inferiore su telefono e schermata di assenza di rete. Account, forum, chat e aggiornamenti richiedono il servizio online. Lo stato del collaudo e i prerequisiti effettivamente mancanti sono descritti in [Rilascio dell’app](docs/APP-RELEASE.md). La preparazione dei sorgenti non equivale a un’attivazione del backend né a una pubblicazione sugli store.

