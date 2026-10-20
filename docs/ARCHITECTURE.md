# Architettura

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
| `server/auth.ts` | Account, conferma email, accesso e recupero |
| `server/database.ts` | Contratto delle istruzioni SQL e transazioni PostgreSQL |
| `server/migrations/` | Schema e vincoli persistenti |
| `public/data/history/` | Serie annuali e provenienza degli indicatori |

## Account e dati privati

Better Auth gestisce password, conferma email, sessioni e recupero. Le API verificano la sessione nel database: header o identificatori inviati dal browser non attribuiscono un’identità. Le operazioni private controllano l’origine della richiesta e non entrano nelle cache condivise. I cookie sono HttpOnly e sicuri; le credenziali restano sul server.

Le raccolte sono separate per account. Le copie nel browser facilitano l’uso e l’importazione, ma non sostituiscono PostgreSQL. Le posizioni di lettura sono separate per libro ed edizione; un aggiornamento più vecchio non deve sovrascrivere il più recente. Gli ID dei libri, delle fonti e le chiavi browser esistenti sono mantenuti per compatibilità.

L’account personale non concede diritti di voto. L’adesione al forum richiede una verifica comunitaria distinta, descritta in [COMMUNITY.md](COMMUNITY.md). Le impostazioni di apertura partono disabilitate.

## Raccolta delle notizie

177 fonti dirette e 136 ricerche radar partecipano alla raccolta automatica, senza pulsanti per caricare altre fonti. Le code hanno concorrenza limitata: 24 richieste dirette e 6 radar. Un feed dichiarato evita l’esplorazione della homepage; errori, risposte vuote e risposte disponibili restano distinti.

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

Le serie statistiche includono osservazioni annuali e metadati. Un anno mancante resta mancante, anche nei grafici. Le comparazioni distinguono livelli, variazioni, unità e anni comuni. La Russia contemporanea non sostituisce l’URSS nei confronti; riconoscimento giuridico, attuazione e risultato misurato sono piani distinti.

## Forum e votazioni

Ogni argomento riunisce proposta, soluzioni, messaggi e, quando prevista, votazione. I messaggi sono persistenti e attribuiti al nome pubblico. La pagina controlla gli aggiornamenti a intervalli mentre è visibile; non offre presenza online o messaggistica privata.

Le transazioni sigillano le regole e aggiungono ogni nuovo membro all’elettorato delle consultazioni non scadute. Le ammissioni successive alla scadenza non modificano il risultato. Vincoli unici impediscono schede duplicate dello stesso membro. Trigger proteggono regole, elettorato e registro da modifiche ordinarie. Le decisioni che modificano adesioni ed elettorati sono serializzate attraverso un lock transazionale PostgreSQL condiviso dalle repliche.

Il registro e gli export rendono possibile ricalcolare il risultato e confrontare le ricevute. Non impediscono a un amministratore del database di rimuovere le protezioni; non certificano l’unicità di ogni persona. La documentazione deve mantenere espliciti questi limiti.

## Verifiche e pubblicazione

`npm test` controlla logiche e flussi con dati sintetici; le prove PostgreSQL incorporano PGlite. `npm run build` verifica la compilazione e `npm run typecheck` controlla i tipi. Queste prove non sostituiscono test visivi, invio email reale, concorrenza fra repliche del provider e ripristino di un backup.

GitHub Actions verifica i sorgenti. Il deployment indipendente è configurato separatamente attraverso il Dockerfile e il blueprint gratuito Render. Koyeb è escluso dalla configurazione. Mantenere la versione precedente fino alla verifica di quella nuova; un rollback del codice non deve cancellare i dati. Vedere [DEPLOYMENT.md](DEPLOYMENT.md) e [LEGAL-OPERATIONS.md](LEGAL-OPERATIONS.md).

Le discussioni sono leggibili da chiunque, salvo quelle libere impostate alla pubblicazione come private ai soli membri IR2. Proposte e votazioni sono sempre pubbliche; i risultati e le schede nominative diventano consultabili alla scadenza. La privacy è controllata dal server prima della paginazione e sugli URL diretti.

Il carosello video applica prima il paese del visitatore, poi la lingua di lettura, mantenendo disponibili i canali internazionali. Nell’anteprima il paese arriva dai metadati nazionali della rete di hosting, attraverso una risposta privata non memorizzabile in cache pubbliche; non vengono restituiti IP o coordinate. Sul runtime indipendente, finché non è configurata una sorgente geografica attendibile, si usa soltanto la regione esplicita del browser, se presente. La lingua da sola non determina un paese. Il client applica una raccolta completata in un solo aggiornamento, anziché riordinare le schede a ogni risposta. Miniature a dimensione riservata, caricamento prioritario delle prime visibili e ripiego YouTube su errore riducono i cambiamenti durante l’apertura.
## Chat temporanea e forum permanente

La chat è implementata in `server/live-chat.ts`: il processo conserva in RAM messaggi e allegati, senza tabella, file, coda persistente, copia di backup applicativa o contenuto nei log. `server/index.ts` elimina gli elementi alla scadenza anche senza richieste, con una verifica ogni secondo. Tutte le stanze condividono finestre di 48 ore allineate all’epoca UTC; l’API comunica l’istante del prossimo azzeramento. Un riavvio, una sospensione con perdita del processo o una nuova distribuzione possono eliminare tutto prima. Le copie eventualmente create dai partecipanti non sono sotto il controllo del servizio.

La chat richiede un solo processo applicativo: la configurazione Free prevista usa un’istanza. Non avviare più worker o repliche senza progettare una distribuzione coerente delle stanze e dei limiti; il database PostgreSQL condiviso non rende condivisa la RAM. Il servizio rifiuta nuovi messaggi quando raggiunge 32 MB o 2.000 messaggi temporanei, invece di archiviare o esportare lo storico. Il polling avviene ogni cinque secondi, soltanto con chat aperta e pagina visibile. Non è un archivio né un servizio di messaggistica durevole.

Tutte le letture, le scritture e le immagini verificano la sessione indipendente e l’ammissione IR2. Il minuto fra invii vale per la persona su tutte le stanze, con controllo e inserimento sincroni nel processo; i tentativi idempotenti non duplicano messaggi. Sono ammessi 200 termini con segmentazione Unicode e un’immagine PNG, JPEG, GIF o WebP fino a 2 MB. La traduzione automatica può inviare il testo a Google Translate o MyMemory. Le richieste di forum e chat usano `temporary:true`, senza cache del sito, localStorage o cache HTTP; le condizioni dei fornitori sono esterne al controllo del progetto. Non vengono caricate anteprime esterne automatiche. I link si aprono sulla fonte indicata. I corpi dei messaggi non devono essere aggiunti ai log di accesso o a servizi di monitoraggio.

Il forum conserva invece post e commenti in PostgreSQL: testo principale fino a 30.000 caratteri sul server e commenti fino a 20.000. L’interfaccia propone una bozza esplicita per sviluppare un proprio messaggio della chat in un thread; nessuna conversazione viene trasferita automaticamente. Gli allegati temporanei non diventano allegati permanenti del forum. La promozione in thread richiede la pubblicazione volontaria del testo.

## Lingue e biblioteca

La Biblioteca mantiene catalogo, percorsi e racconto storico nella stessa pagina. Una breve guida iniziale introduce gli strumenti e collega direttamente all’archivio comparativo. Le preferenze in `internazionalerossa.language-preferences` separano interfaccia e contenuti; `original` disattiva la traduzione dei contenuti mantenendo localizzati menu e comandi. I filtri per la lingua delle fonti restano indipendenti. Le preferenze precedenti vengono migrate.

La traduzione di forum e chat è differita ai paragrafi visibili, con due richieste concorrenti. Conserva i collegamenti, non modifica testi o schede di voto nel database e non scrive traduzioni in localStorage o nella cache del server. Il testo è inviato al servizio esterno dichiarato nell’interfaccia; il progetto non garantisce la cancellazione dei dati trattati da quel servizio. Le richieste pendenti si interrompono scegliendo l’originale, cambiando lingua o chiudendo il contenuto. La traduzione del libro cambia la presentazione, non l’edizione o l’identificatore del segnalibro.

## Identità multilingue

`app/lib/brand.ts` definisce il marchio: Polis resta invariato, mentre il colore segue la lingua di lettura. Il logo non passa ai traduttori automatici; nei testi circostanti il nome viene preservato e ricomposto localmente. Le chiavi persistenti precedenti e gli indirizzi dei servizi esistenti restano compatibili: una rinomina editoriale non migra account, raccolte o domini.
