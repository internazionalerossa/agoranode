# Architettura

Questa guida descrive il percorso di una richiesta, dalla pagina aperta nel browser ai servizi che restituiscono contenuti e conservano dati. Serve a chi deve capire dove intervenire, quali informazioni possono essere pubbliche e quali devono rimanere separate per account. Per interfaccia si intende ciò che il visitatore vede e usa; per API gli indirizzi attraverso cui l’interfaccia chiede operazioni al server. Il database è invece l’archivio persistente: non deve dipendere dalla memoria temporanea del processo o dalla cache di un singolo dispositivo.

Leggi prima i componenti e i confini dei dati, poi la sezione relativa alla funzione che vuoi modificare. Le descrizioni del codice non attestano che gli stessi flussi siano già attivi sull’hosting pubblico: lo stato operativo è registrato in QUALITY.md.

## Rassegna e dimensioni dello schermo

La rassegna integra anche gli otto canali regionali dell’Osservatorio: “Ultime 6 ore” è una selezione del periodo nella lista comune. `useRegionalNews.ts` conserva acquisizione concorrente, timeout, recuperi indipendenti e cache pubblica, senza coinvolgere i salvataggi privati. I vecchi collegamenti all’Osservatorio aprono la rassegna con il periodo corrispondente; gli altri periodi possono essere condivisi nello stesso URL.

Ricerca, periodo e ordinamento sono visibili. Un solo pannello raccoglie lingua originale, area geografica, fonte e criteri tematici. La superficie centrata ha larghezza massima di 1.080 pixel; le colonne si adattano e i contenuti possono restringersi senza imporre la larghezza minima del testo o dei menu. Il marchio è scritto senza trattino in ogni lingua.

## Componenti

L’applicazione ha un’interfaccia React compilata con Vite e un server Node.js. Il server espone API same-origin e distribuisce i file compilati. PostgreSQL conserva account, sessioni, raccolte private e dati del forum. La lettura dei contenuti esterni avviene attraverso endpoint con destinazioni e dimensioni limitate.

| Percorso | Responsabilità |
| --- | --- |
| `web/` | Entrata del browser, pagine principali e configurazione di sviluppo |
| `app/components/` | Rassegna, biblioteca, lettura, account e comunità |
| `app/data/` | Cataloghi, testi editoriali, riferimenti e indici |
| `app/api/` | Raccolta dei feed, immagini, video e traduzione |
| `app/lib/` | Parsing, selezione, sincronizzazione e regole della comunità |
| `server/index.ts` | Server HTTP, distribuzione dei file e instradamento |
| `server/api.ts` | Confine delle API pubbliche e private |
| `server/auth.ts` | Account email/password, sessioni e consegna asincrona delle email transazionali |
| `server/database.ts` | Contratto delle istruzioni SQL e transazioni PostgreSQL |
| `server/migrations/` | Schema e vincoli persistenti |
| `public/data/history/` | Serie annuali e provenienza degli indicatori |

## Checkpoint pubblico della release

Il comando di self-hosting può produrre un checkpoint deterministico della release eseguibile contenuta nella stessa immagine Docker taggata usata dall'app. Il manifesto elenca dimensione e SHA-256 dei soli `build-node/**`, `package.json` e `package-lock.json`, calcola una radice della lista canonica e viene firmato con Ed25519. Prima dell'hash, nei due file JSON e nelle migrazioni SQL le terminazioni CRLF vengono normalizzate a LF; un ritorno a capo CR isolato viene rifiutato. La chiave privata resta nel percorso privato dell'installazione; soltanto lo strumento di firma la monta, senza accesso alla rete o al database. Verifica e importazione non vedono la chiave. La chiave pubblica deve arrivare al nodo ricevente attraverso un canale autenticato separato.

La versione 1 dichiara `policy.scope=release-only`, mantiene `publicState` vuoto ed esclude esplicitamente i contenuti generati dagli utenti. Un nodo verifica firma e corrispondenza con la propria release già compilata; l'importazione registra in PostgreSQL soltanto provenienza e testa del checkpoint. Il bundle contiene manifesto e firma, non i file della release né dati applicativi, e non installa o aggiorna il codice. Il checkpoint non include `runtime.env` e non attesta che `MIRROR_MODE` o gli altri controlli di scrittura siano effettivamente applicati al servizio in esecuzione: la modalità di sola consultazione va collaudata separatamente.

Il primo checkpoint ha altezza zero e nessun predecessore. Ogni aggiornamento deve indicare l'altezza successiva e lo `snapshotId` esatto della testa precedente; rollback, salti e biforcazioni vengono rifiutati rispetto alla testa della singola installazione. Tutta la catena versione 1 deve usare la stessa chiave Ed25519: la rotazione della chiave non è supportata. L'esportazione non mantiene ancora una testa condivisa né impedisce al firmatario di produrre checkpoint concorrenti; nodi diversi possono quindi accettare rami diversi. Questo limite non equivale a consenso o quorum.

La firma attesta la provenienza rispetto alla chiave scelta, non rende affidabile codice che non sia già stato esaminato: il componente di firma appartiene alla stessa release candidata. Questa attestazione tecnica non assegna diritti editoriali o di voto e non realizza distribuzione del traffico, replica del database o del forum, scoperta fra nodi, failover, quorum o cifratura end-to-end. Ogni nodo di sola consultazione mantiene un database locale separato e recupera autonomamente le fonti pubbliche.

## Account e dati privati

Better Auth gestisce account e sessioni. Con `MAIL_TRANSPORT=none`, predefinito, registrazione con password, recupero e invio email sono disabilitati anche sul server. Quando Gmail SMTP è configurato, il mailer applicativo invia esclusivamente conferme dell'indirizzo e recuperi dell'account: non implementa newsletter, campagne, digest o notifiche massive del forum. Nel lancio self-hosted entrambi i flussi richiedono inoltre un codice privato, del quale il server conserva soltanto `ACCOUNT_ACCESS_HASH`; è una barriera condivisa contro l'uso anonimo della quota, non una prova d'identità. Prima della consegna applica contatori persistenti per destinatario, per client e complessivi in `auth_request_limits`; indirizzo, IP e chiave interna di Better Auth raggiungono la tabella soltanto come digest SHA-256 o HMAC-SHA-256. Un errore del database blocca l'invio. La risposta HTTP non attende Gmail: il processo conserva il job fino al termine o allo shutdown, ma non offre una coda durevole né un nuovo tentativo automatico.

L'accesso PR1 avviene sempre con email confermata e un account `credential`: Facebook, Instagram, Discord o un altro social non possono creare o aprire PR1. Facebook può essere collegato successivamente da una sessione PR1 verificata come prova facoltativa per PR2. Le sessioni social-only di versioni precedenti vengono revocate senza cancellare l'utente o i dati applicativi. Caddy accetta `X-Forwarded-For` soltanto dal salto locale usato da Tailscale, lo riduce a un valore canonico e il server raggruppa IPv6 per /64. Better Auth conserva IP e user-agent nella sessione per sicurezza fino alla scadenza; un job all'avvio e ogni 24 ore elimina sessioni e token di verifica scaduti, contatori più vecchi di 24 ore e account `credential` mai verificati da oltre sette giorni che non abbiano sessioni, dati personali o collegamenti social. In questo modo anche una registrazione che non riceve l'email perché la quota è esaurita non cresce indefinitamente nel database. Le API verificano la sessione nel database: header o identificatori inviati dal browser non attribuiscono un’identità. Le operazioni private controllano l’origine della richiesta e non entrano nelle cache condivise. I cookie sono HttpOnly e sicuri; le credenziali restano sul server.

Le raccolte sono separate per account. Le copie nel browser facilitano l’uso e l’importazione, ma non sostituiscono PostgreSQL. Le posizioni di lettura sono separate per libro ed edizione; un aggiornamento più vecchio non deve sovrascrivere il più recente. Gli ID dei libri, delle fonti e le chiavi browser esistenti sono mantenuti per compatibilità.

L’account personale non concede diritti di voto. L’adesione al forum richiede una verifica comunitaria distinta, descritta in [COMMUNITY.md](COMMUNITY.md). Le impostazioni di apertura partono disabilitate.

## Raccolta delle notizie

182 fonti dirette e 136 ricerche radar partecipano alla raccolta automatica, senza pulsanti per caricare altre fonti. Le code hanno concorrenza limitata: 24 richieste dirette e 6 radar. Un feed dichiarato evita l’esplorazione della homepage; errori, risposte vuote e risposte disponibili restano distinti.

All’apertura la rassegna alterna paesi e testate nell’intera giornata selezionata, limitandosi alle ultime 24 ore. La modalità Ogni editore disponibile riceve un primo spazio prima di riproporre altri suoi articoli nella stessa giornata. Ultimi articoli mantiene separatamente l’ordine cronologico integrale. Nessun articolo viene eliminato per ottenere questa alternanza. I filtri aggiornano subito i risultati; il pulsante Aggiorna richiede nuovi dati alle fonti. Il filtro Periodo rende consultabili anche gli articoli precedenti. Le date assenti, non valide o future restano fuori dalle finestre recenti. La finestra viene ricalcolata ogni minuto e quando la pagina torna visibile. L’archivio completo conserva anche le voci prive di una data affidabile, dichiarandone il limite.

La cache locale conserva fino a 1.200 schede con alternanza tra paesi e testate: un editore prolifico non deve escludere gli altri al ricaricamento. Cache, nuovi arrivi e aggiornamenti rispettano l’ordine selezionato. La preferenza linguistica non scavalca la data nell’ordine cronologico. Le chiavi React degli articoli rimangono stabili durante il refresh, evitando di rimontare immagini già caricate. Su telefono titoli ed estratti hanno altezza naturale; le fotografie mantengono un riquadro di proporzioni definite.

Il caricamento iniziale ha un budget di sei secondi e non attende indefinitamente tutte le fonti. Il termine di questo budget non garantisce che ogni server esterno abbia già fornito traduzioni e immagini. Una foto mancante non viene sostituita con una copertina inventata.

L’ordine per evidenza e per letture usa segnali osservati nelle pagine degli editori, quando disponibili. Senza segnali corrispondenti resta l’ordine cronologico e l’interfaccia lo dichiara. Le classifiche non diventano indici SEO e non vengono simulate con contatori interni. L’ordinamento politico e formativo è una modalità esplicita, basata su euristiche di titolo ed estratto.

L’osservatorio seleziona soltanto pubblicazioni delle ultime sei ore. Il suo ordine per rilevanza è distinto dall’ordine cronologico selezionabile; nessun punteggio viene presentato nelle schede.

## Cache, immagini e servizi esterni

La cache persistente contiene esclusivamente dati pubblici. Le chiavi sono canoniche e limitate ai cataloghi configurati; cookie, sessioni, preferiti e messaggi privati non fanno parte delle chiavi o dei corpi memorizzati. Gli errori non devono sostituire una risposta valida come se fossero contenuti.

Gli endpoint che recuperano immagini o documenti convalidano protocollo, host, redirect, dimensioni e tipo della risposta. Non eseguono script remoti e non offrono un proxy verso URL arbitrari del visitatore. I riferimenti fotografici osservati nei feed permettono di recuperare le immagini senza autorizzare domini inventati.

Le traduzioni hanno una coda limitata, precedenza per i titoli e servizi alternativi. La stessa lingua di partenza e destinazione evita la traduzione. Il testo trasmesso ai servizi esterni e i limiti di queste connessioni devono essere descritti nell’informativa del servizio effettivamente pubblicato.

## Biblioteca e storia

Biblioteca, dossier e indici estesi vengono caricati su richiesta. L’indice leggero dei libri consente di validare i salvataggi senza includere tutte le edizioni nel primo caricamento delle notizie. Gli archivi esterni sono distinti dai testi leggibili internamente e non gonfiano il conteggio delle opere.

La lettura interna usa esclusivamente `library_current_revisions` in PostgreSQL. `library_editions`, `library_revisions` e `library_chapters` separano identità del catalogo, provenienza/licenza di una revisione e testo inerte dei capitoli; SHA-256 permette di rilevare corruzioni prima di servire il contenuto. Le revisioni non vengono sovrascritte: un aggiornamento crea una nuova impronta e sposta soltanto il puntatore corrente; una rimozione ordinata per revoca dei diritti o altro obbligo è invece un'operazione amministrativa esplicita e registrata. L’importatore amministrativo accetta unicamente la coppia libro/lingua e l’URL esatti presenti nel registro dei diritti chiuso per impostazione predefinita. In assenza della copia, o se il diritto registrato cambia, il server fallisce chiuso e l’interfaccia mantiene soltanto il collegamento all’archivio originale. Non è un proxy del visitatore, non memorizza HTML eseguibile e non trasforma una pagina accessibile online in un permesso di redistribuzione.

Le serie statistiche includono osservazioni annuali e metadati. Un anno mancante resta mancante, anche nei grafici. Le comparazioni distinguono livelli, variazioni, unità e anni comuni. La Russia contemporanea non sostituisce l’URSS nei confronti; riconoscimento giuridico, attuazione e risultato misurato sono piani distinti.

## Forum e votazioni

Ogni argomento riunisce proposta, soluzioni, messaggi e, quando prevista, votazione. I messaggi sono persistenti e attribuiti al nome pubblico. La pagina controlla gli aggiornamenti a intervalli mentre è visibile; non offre presenza online o messaggistica privata.

Le transazioni sigillano le regole e aggiungono ogni nuovo membro all’elettorato delle consultazioni non scadute. Le ammissioni successive alla scadenza non modificano il risultato. Vincoli unici impediscono schede duplicate dello stesso membro. Trigger proteggono regole, elettorato e registro da modifiche ordinarie. Le decisioni che modificano adesioni ed elettorati sono serializzate attraverso un lock transazionale PostgreSQL fra le istanze applicative collegate allo stesso database.

Il registro e gli export rendono possibile ricalcolare il risultato e confrontare le ricevute. Non impediscono a un amministratore del database di rimuovere le protezioni; non certificano l’unicità di ogni persona. La documentazione deve mantenere espliciti questi limiti.

## Verifiche e pubblicazione

`npm test` controlla logiche e flussi con dati sintetici; le prove PostgreSQL incorporano PGlite. `npm run build` verifica la compilazione e `npm run typecheck` controlla i tipi. Queste prove non sostituiscono test visivi, invio email reale, concorrenza fra repliche del provider e ripristino di un backup.

GitHub Actions verifica i sorgenti. Il deployment indipendente è configurato separatamente attraverso il Dockerfile e il blueprint gratuito Render. Koyeb è escluso dalla configurazione. Mantenere la versione precedente fino alla verifica di quella nuova; un rollback del codice non deve cancellare i dati. Vedere [DEPLOYMENT.md](DEPLOYMENT.md) e [LEGAL-OPERATIONS.md](LEGAL-OPERATIONS.md).

Le discussioni sono leggibili da chiunque, salvo quelle libere impostate alla pubblicazione come private ai soli membri PR2. Proposte e votazioni sono sempre pubbliche; i risultati e le schede nominative diventano consultabili alla scadenza. La privacy è controllata dal server prima della paginazione e sugli URL diretti.

Il carosello video applica prima il paese del visitatore, poi la lingua di lettura, mantenendo disponibili i canali internazionali. Nell’anteprima il paese arriva dai metadati nazionali della rete di hosting, attraverso una risposta privata non memorizzabile in cache pubbliche; non vengono restituiti IP o coordinate. Sul runtime indipendente, finché non è configurata una sorgente geografica attendibile, si usa soltanto la regione esplicita del browser, se presente. La lingua da sola non determina un paese. Il client applica una raccolta completata in un solo aggiornamento, anziché riordinare le schede a ogni risposta. Miniature a dimensione riservata, caricamento prioritario delle prime visibili e ripiego YouTube su errore riducono i cambiamenti durante l’apertura.
## Chat temporanea e forum permanente

La chat è implementata in `server/live-chat.ts`: il processo conserva in RAM messaggi e allegati, senza tabella, file, coda persistente, copia di backup applicativa o contenuto nei log. `server/index.ts` elimina gli elementi alla scadenza anche senza richieste, con una verifica ogni secondo. Tutte le stanze condividono finestre di 48 ore allineate all’epoca UTC; l’API comunica l’istante del prossimo azzeramento. Un riavvio, una sospensione con perdita del processo o una nuova distribuzione possono eliminare tutto prima. Le copie eventualmente create dai partecipanti non sono sotto il controllo del servizio.

La chat richiede un solo processo applicativo: la configurazione Free prevista usa un’istanza. Non avviare più worker o repliche senza progettare una distribuzione coerente delle stanze e dei limiti; il database PostgreSQL condiviso non rende condivisa la RAM. Il servizio rifiuta nuovi messaggi quando raggiunge 32 MB o 2.000 messaggi temporanei, invece di archiviare o esportare lo storico. Il polling avviene ogni cinque secondi, soltanto con chat aperta e pagina visibile. Non è un archivio né un servizio di messaggistica durevole.

Tutte le letture, le scritture e le immagini verificano la sessione indipendente e l’ammissione PR2. Il minuto fra invii vale per la persona su tutte le stanze, con controllo e inserimento sincroni nel processo; i tentativi idempotenti non duplicano messaggi. Sono ammessi 200 termini con segmentazione Unicode e un’immagine PNG, JPEG, GIF o WebP fino a 2 MB. La traduzione automatica può inviare il testo a Google Translate o MyMemory. Le richieste di forum e chat usano `temporary:true`, senza cache del sito, localStorage o cache HTTP; le condizioni dei fornitori sono esterne al controllo del progetto. Non vengono caricate anteprime esterne automatiche. I link si aprono sulla fonte indicata. I corpi dei messaggi non devono essere aggiunti ai log di accesso o a servizi di monitoraggio.

Il forum conserva invece post e commenti in PostgreSQL: testo principale fino a 30.000 caratteri sul server e commenti fino a 20.000. L’interfaccia propone una bozza esplicita per sviluppare un proprio messaggio della chat in un thread; nessuna conversazione viene trasferita automaticamente. Gli allegati temporanei non diventano allegati permanenti del forum. La promozione in thread richiede la pubblicazione volontaria del testo.

## Lingue e biblioteca

La Biblioteca mantiene catalogo, percorsi e racconto storico nella stessa pagina. Una breve guida iniziale introduce gli strumenti e collega direttamente all’archivio comparativo. Le preferenze in `internazionalerossa.language-preferences` separano interfaccia e contenuti; `original` disattiva la traduzione dei contenuti mantenendo localizzati menu e comandi. I filtri per la lingua delle fonti restano indipendenti. Le preferenze precedenti vengono migrate.

La traduzione di forum e chat richiede prima il comando esplicito sul testo e viene poi differita ai paragrafi visibili, con due richieste concorrenti. Conserva i collegamenti, non modifica testi o schede di voto nel database e non scrive traduzioni in localStorage o nella cache del server. Il testo è inviato al servizio esterno dichiarato nell’interfaccia; il progetto non garantisce la cancellazione dei dati trattati da quel servizio. Le richieste pendenti si interrompono scegliendo l’originale, cambiando lingua o chiudendo il contenuto. La traduzione del libro cambia la presentazione, non l’edizione o l’identificatore del segnalibro.

## Identità multilingue

`app/lib/brand.ts` definisce il marchio: Polis resta invariato, mentre il colore segue la lingua di lettura. Il logo non passa ai traduttori automatici; nei testi circostanti il nome viene preservato e ricomposto localmente. Le chiavi persistenti precedenti e gli indirizzi dei servizi esistenti restano compatibili: una rinomina editoriale non migra account, raccolte o domini.

## Filtri e destinazioni della Biblioteca

La rassegna espone due soli ordini e un solo pannello di filtri aggiuntivi: niente guida duplicata, classificatori politici o classifiche prive di copertura adeguata. Geografia, lingua e fonte seguono l’editore effettivo anche nei risultati radar. Il tema si ricava da titolo, estratto e categorie dell’articolo, senza i tag generali della testata. Il cambio di area, paese o lingua rimuove le selezioni di fonte incompatibili.

I dossier hanno URL espliciti e ancore al proprio titolo; i vecchi link brevi, la navigazione del browser e le ancore delle tappe riaprono il contenuto dopo il caricamento differito. I quattro casi sulle condizioni di vita hanno contesto, misure e fonti verificabili. Il blocco su produzione e proprietà è un approfondimento facoltativo dopo la cronologia, con modelli distinti.

## Filtri della rassegna

Il periodo offre ultime 6 ore, ultime 24 ore o tutta la raccolta disponibile. Quest’ultima comprende i feed ricevuti e la cache del dispositivo, anche senza data; non promette un archivio storico completo. `selectNews` applica in una sola funzione ricerca, filtri, periodo e ordine scelto. Gli ordini sono alternanza di fonti e paesi nelle 24 ore, pubblicazione decrescente e nome della fonte dalla A alla Z (poi pubblicazione decrescente). Il conteggio dei risultati segue la selezione; l’aggiornamento dei feed non modifica la scelta dell’utente. Il ripristino azzera anche la lingua originale delle fonti. Nell’Atlante il filtro Fonte seleziona effettivamente la voce richiesta.

## Accessi alla Biblioteca

`library-navigation.ts` risolve le destinazioni Libri e percorsi, Timeline storica e Dati e grafici, mantenendo i collegamenti precedenti con `percorso=conquiste`, `storia` e `indicatore`. La timeline e i confronti statistici si caricano indipendentemente: Dati e grafici monta direttamente l’esploratore, senza il racconto o un pannello intermedio. Il catalogo e i suoi filtri rimangono nello spazio Libri e percorsi. I pulsanti aggiornano la cronologia e rispondono a indietro/avanti. Lingua di lettura (traduzioni), lingua originale delle fonti (selezione degli articoli) e paese della testata (sede editoriale) conservano preferenze e significati distinti.


## Adesioni social e decisioni interne

`handleForum` richiede a ogni nuova domanda un nome dichiarato e `referenceUrl`: un URL HTTPS pubblico, senza credenziali, porte, IP o nomi locali, verso Facebook, Instagram o un sito personale. La migrazione 010 aggiunge la colonna nullable per compatibilità con le pratiche precedenti; l’API la rende obbligatoria per le nuove. Il server la convalida e conserva ma non la visita, non carica anteprime e non la inoltra a proxy.

`server/social-identity.ts` offre soltanto Facebook come prova OAuth facoltativa per PR2. Collegamento e callback non sono disponibili mentre `FORUM_OPEN=false`; lo scollegamento resta sempre disponibile a una sessione PR1 valida. Il provider usa il solo scope `public_profile`; Discord non produce una claim di ammissione. Se il candidato lo collega, `handleForum` rilegge nome e identificativo dal provider, controlla che non siano già associati a un’altra pratica e rimuove il grant locale prima dell’inserimento. Un collegamento non consumato viene eliminato dal job di autenticazione dopo 24 ore, con esecuzione giornaliera. La rimozione riguarda il record e i token locali: non afferma la revoca presso Meta. La pratica conserva soltanto provider, identificativo, nome e riferimento app-scoped ricevuti in quel momento; una rara corsa che faccia fallire l’inserimento dopo lo scollegamento richiede di collegare nuovamente Facebook. Candidato e membri PR2 vedono nome, presentazione e `referenceUrl`; quest'ultimo è sempre etichettato come dichiarato e non verificato. Il record completo non compare nel board anonimo, nei topic o nelle schede/esportazioni pubbliche. Il ritiro di una domanda in attesa o respinta elimina riga di adesione, voti ed elettorato collegato, liberando alias e dati social per una nuova domanda. `server/forum-retention.ts` esegue la stessa eliminazione per le pratiche rimaste scadute o respinte per 30 giorni: parte senza attendere una richiesta HTTP e si ripete ogni 24 ore nella stessa transazione serializzata delle decisioni del forum. Per un rifiuto usa l'istante dell'evento di cambio stato; per dati precedenti privi dell'evento usa la scadenza della domanda. Gli eventi append-only conservano soltanto identificativi opachi. Un membro già attivo segue invece la procedura privacy, perché può avere interventi e schede pubbliche.

La dashboard delle ammissioni è visibile ai PR2 senza introduzione o pannello chiuso. Tutti i PR2 attivi possono votare richieste aperte, inclusi quelli appena ammessi. Tre voti favorevoli ammettono, tre contrari respingono; le transazioni PostgreSQL serializzano decisioni concorrenti. Proposte e issue vengono create dal forum; `?view=partecipa&nuova=proposta` apre il modulo con votazione. I link GitHub restano soltanto per il codice e le revisioni tecniche.
