# Architettura

Questa guida descrive il percorso di una richiesta, dalla pagina aperta nel browser ai servizi che restituiscono contenuti e conservano dati. Serve a chi deve capire dove intervenire, quali informazioni possono essere pubbliche e quali devono rimanere separate per account. Per interfaccia si intende ciò che il visitatore vede e usa; per API gli indirizzi attraverso cui l’interfaccia chiede operazioni al server. Il database è invece l’archivio persistente: non deve dipendere dalla memoria temporanea del processo o dalla cache di un singolo dispositivo.

Leggi prima i componenti e i confini dei dati, poi la sezione relativa alla funzione che vuoi modificare. Le descrizioni del codice non attestano che gli stessi flussi siano già attivi sull’hosting pubblico: lo stato operativo è registrato in QUALITY.md.

**AgoràNode è la tecnologia e l’infrastruttura; i nodi sono comunità autonome ospitate su di essa.** La home `/` è un portale di accesso e orientamento, non un nodo sovraordinato né un elenco illimitato: mostra i percorsi reali locali e una mappa ricercabile di 124 temi possibili, esplicitamente non operativi. Un termine libero fuori dalla mappa viene mostrato solo come idea temporanea nel browser, senza essere salvato o inviato. La ricerca pagina i risultati per non richiedere il caricamento simultaneo di un catalogo vasto. Non esiste ancora un registro federato per scoprire nodi ospitati altrove. `/agora` ospita il nodo Agorà, dedicato alla tecnologia e alle questioni comuni; `/polisrossa` ospita il nodo tematico completo sulla sinistra politica. L’interfaccia PolisRossa è il riferimento visivo ed editoriale per i nodi, non una gerarchia di prodotto. `app/lib/site-routing.ts` mantiene compatibili i vecchi URL PolisRossa e li porta ai percorsi canonici senza perdere query o frammento. Lo strato v1 resta intenzionalmente piccolo: `app/platform/agora-node-manifest.ts` definisce il contratto, `app/instances/polisrossa.ts` descrive l’istanza costruita, `app/lib/instance.ts` offre la facciata usata da browser e server e `/api/instance` espone una proiezione pubblica priva di segreti e namespace di compatibilità. Non esiste ancora un generatore multi-argomento.

Ogni istanza completa dichiara notizie, video, biblioteca, Atlante, storyline, dati e comunità. Account, forum e autorità PolisRossa non governano AgoràNode o altri nodi. Nel monolite corrente i dati federali usano tabelle e contratti distinti nello stesso runtime PostgreSQL; un’attivazione pubblica deve conservare la separazione degli ambiti e non viene presentata come database federale operativo. Le identità persistenti già in uso — chiavi del browser, formati, sali, rete dei checkpoint, progetto Compose e volume — non vengono rinominate dall’estrazione della piattaforma.

Lo script di self-hosting genera per ogni nuovo progetto Compose un utente e un database PostgreSQL casuali e coerenti con `DATABASE_URL`. Il progetto Compose mantiene i volumi di ciascuna installazione separati; gli account PostgreSQL e i nomi `polisrossa` preesistenti restano il fallback per configurazioni storiche. Questa è separazione dei dati di installazioni PolisRossa, non supporto runtime per manifesti o contenuti tematici personalizzati.

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
| `app/platform/`, `app/instances/` | Contratto AgoràNode e manifesto concreto di PolisRossa |
| `app/lib/` | Parsing, selezione, sincronizzazione, diritti dei contributi e regole della comunità |
| `server/index.ts` | Server HTTP, distribuzione dei file e instradamento |
| `server/api.ts` | Confine delle API pubbliche e private |
| `server/auth.ts` | Account email/password, sessioni e consegna asincrona delle email transazionali |
| `server/knowledge.ts`, `server/knowledge-import.ts` | Deposito append-only, import amministrativo ed esportazione canonica della conoscenza pubblica |
| `server/knowledge-replication*.ts`, `server/knowledge-replica*.ts` | Validazione, finalità tecnica, import atomico e agente filesystem per la sola conoscenza pubblica |
| `server/federation.ts` | API database per attestazioni PR2, elezioni, mandati e revoche PR3; non ancora esposta da una UI pubblica |
| `server/database.ts` | Contratto delle istruzioni SQL e transazioni PostgreSQL |
| `server/migrations/` | Schema e vincoli persistenti |
| `deploy/edge-worker/` | Proxy Worker opzionale davanti all’origine Funnel; non contiene segreti |
| `public/data/history/` | Serie annuali e provenienza degli indicatori |

## Confine pubblico Worker–Funnel–Caddy

Il percorso pubblico preparato è `browser → Worker workers.dev → Tailscale Funnel → Caddy → Node`. Il Worker usa un’origine Funnel fissa, accetta soltanto `GET`, `HEAD`, `POST` e `DELETE`, rifiuta upgrade e host inattesi, convalida `CF-Connecting-IP` come IPv4 o IPv6 e rimuove gli header hop-by-hop, di inoltro e interni ricevuti dal visitatore. Aggiunge poi `X-Agoranode-Edge-Key` e `X-Agoranode-Client-IP` per il solo salto verso Caddy. Le risposte non possono riportare header interni AgoràNode al browser.

Caddy confronta il segreto edge e richiede l’IP client su tutti gli host raggiunti da Funnel; senza entrambi risponde `403` e `Cache-Control: no-store`. Prima di inoltrare rimuove nuovamente gli header di fiducia e costruisce un solo `X-Forwarded-For` dal valore convalidato. Il processo `app` riceve esplicitamente `EDGE_SHARED_SECRET` vuoto: il segreto serve solo al proxy. Un listener separato su Caddy `:444`, pubblicato per impostazione predefinita come `https://localhost:9443`, permette la manutenzione locale senza il segreto e rimane legato al loopback.

`edge-origin` ha due fasi. La prima genera o riusa il segreto e scrive un Caddyfile di prova senza cambiare `APP_URL` o il proxy attivo; la seconda, con `--activate`, richiede coerenza fra origine, upstream e segreto prima di sostituire la configurazione. `tunnel-origin` è il rollback reversibile. Il codice e i test di questo confine non dimostrano che il Worker sia stato distribuito: lo stato operativo resta in [QUALITY.md](QUALITY.md).

## Deposito della conoscenza pubblica

La migrazione 012 separa `knowledge_entities`, revisioni, fonti, collegamenti alle fonti, relazioni, puntatori correnti e audit. Entità e revisioni sono indirizzate dal contenuto con JSON canonico e SHA-256. Trigger rifiutano `UPDATE` e `DELETE` degli oggetti e degli eventi; il puntatore corrente può essere aggiornato a una nuova revisione ma non eliminato. L’importatore amministrativo è transazionale, serializzato con advisory lock e idempotente. Il seed corrente conserva i 64 eventi e le 17 persone della storyline, con gli URL e gli identificatori precedenti.

L’esportatore legge tutte le revisioni immutabili e i puntatori correnti, ricalcola ogni impronta e produce `org.agoranode.knowledge-bundle.v1` in ordine deterministico. Il bundle conserva quindi la cronologia completa e indica separatamente quale revisione è corrente per ogni entità e lingua. Contiene conoscenza pubblica e il testo/versione del grant supportato, non account, sessioni, email, identità sociali o segreti. Le 408.963 osservazioni statistiche non vengono ancora importate in questo deposito.

L’API pubblica di lettura accetta tipi di entità e identificatori convalidati invece di limitarsi a `event` e `person`. La scheda React usa il contratto esistente per mostrare revisione corrente, fonti, relazioni e cronologia delle revisioni; i collegamenti dagli eventi e dalle persone riusano la storyline e la navigazione Biblioteca/Timeline di PolisRossa. La selezione generica rende consultabili anche altre entità già presenti nello stesso deposito, ma non aggiunge un indice, un editor o contenuti mancanti: il seed resta di 64 eventi e 17 persone e le osservazioni statistiche sono ancora fuori dal deposito. Il testo viene renderizzato come contenuto React, non come HTML remoto.

La migrazione 013 e i moduli di replica aggiungono un kernel locale separato dal checkpoint di release. Un pacchetto lega `networkId`, `spaceId`, sequenza, predecessore e digest del bundle; un set congelato di `3f+1` validatori Ed25519 richiede almeno `2f+1` firme. La sequenza iniziale può importare soltanto il bootstrap esplicito già revisionato; le successive falliscono chiuse senza un’autorizzazione politica valida. L’importatore ricontrolla l’intero bundle e avanza testa e ricevuta nella stessa transazione. L’agente filesystem osserva soltanto file finali, resta idempotente dopo il riavvio e può rilanciare in una cartella di uscita esclusivamente pacchetti già verificati.

I test hanno osservato convergenza fra database PGlite distinti, ripartenza e idempotenza, oltre al rifiuto di pacchetti fuori ordine, manomissioni, fork, rollback e firme insufficienti. Non hanno collaudato computer o reti indipendenti, scoperta dei peer, disponibilità del trasporto, failover o continuità dell’indirizzo pubblico. L’overlay Syncthing è opzionale, separato dal normale Compose e non attivo per impostazione predefinita; non sincronizza dati personali, forum, backup o chiavi.

Le revisioni provenienti dal repository usano `org.agoranode.repository-publication.v1`, autore editoriale PolisRossa e metodo `repository-review`, senza inventare una licenza per il materiale esistente. Un futuro contributo usa `org.agoranode.contribution-publication.v1`: la licenza scelta dall’autore vale per il solo contributo, mentre il consenso separato riguarda il grant `org.agoranode.contribution-grant.v1`. La provenienza pubblica registra autore, richiedente, topic, decisione approvata e predecessore. Un esito respinto, ritirato, senza quorum o in pareggio non può autorizzare una nuova revisione. Non esiste alcun requisito di compatibilità con Wikipedia. Il grant è ancora una bozza soggetta a revisione legale e il deposito non è collegato a un editor pubblico.

## Checkpoint pubblico della release

Il comando di self-hosting può produrre un checkpoint deterministico della release eseguibile contenuta nella stessa immagine Docker taggata usata dall'app. Il manifesto elenca dimensione e SHA-256 dei soli `build-node/**`, `package.json` e `package-lock.json`, calcola una radice della lista canonica e viene firmato con Ed25519. Prima dell'hash, nei due file JSON e nelle migrazioni SQL le terminazioni CRLF vengono normalizzate a LF; un ritorno a capo CR isolato viene rifiutato. La chiave privata resta nel percorso privato dell'installazione; soltanto lo strumento di firma la monta, senza accesso alla rete o al database. Verifica e importazione non vedono la chiave. La chiave pubblica deve arrivare al nodo ricevente attraverso un canale autenticato separato.

La versione 1 dichiara `policy.scope=release-only`, mantiene `publicState` vuoto ed esclude esplicitamente i contenuti generati dagli utenti. Un nodo verifica firma e corrispondenza con la propria release già compilata; l'importazione registra in PostgreSQL soltanto provenienza e testa del checkpoint. Il bundle contiene manifesto e firma, non i file della release né dati applicativi, e non installa o aggiorna il codice. Il checkpoint non include `runtime.env` e non attesta che `MIRROR_MODE` o gli altri controlli di scrittura siano effettivamente applicati al servizio in esecuzione: la modalità di sola consultazione va collaudata separatamente.

Il primo checkpoint ha altezza zero e nessun predecessore. Ogni aggiornamento deve indicare l'altezza successiva e lo `snapshotId` esatto della testa precedente; rollback, salti e biforcazioni vengono rifiutati rispetto alla testa della singola installazione. Tutta la catena versione 1 deve usare la stessa chiave Ed25519: la rotazione della chiave non è supportata. L'esportazione non mantiene ancora una testa condivisa né impedisce al firmatario di produrre checkpoint concorrenti; nodi diversi possono quindi accettare rami diversi. Questo limite non equivale a consenso o quorum.

La firma attesta la provenienza rispetto alla chiave scelta, non rende affidabile codice che non sia già stato esaminato: il componente di firma appartiene alla stessa release candidata. Questo checkpoint, da solo, non assegna diritti editoriali o di voto e non realizza distribuzione del traffico, replica della conoscenza o del forum, scoperta fra nodi, failover, quorum o cifratura end-to-end. La replica pubblica usa il formato e il kernel separati descritti sopra; ogni nodo di sola consultazione mantiene comunque un database locale e recupera autonomamente le fonti dei feed.

## Account e dati privati

Better Auth gestisce account e sessioni. Con `MAIL_TRANSPORT=none`, predefinito, registrazione con password, recupero e invio email sono disabilitati anche sul server. Quando Gmail SMTP è configurato, il mailer applicativo invia esclusivamente conferme dell’indirizzo e recuperi dell’account: non implementa newsletter, campagne, digest o notifiche massive del forum. `ACCOUNT_ACCESS_HASH` è compatibilità facoltativa per un’installazione che vuole mantenere una barriera condivisa: se manca, la registrazione pubblica non chiede alcun codice; se è configurato, soltanto il flusso di registrazione lo convalida senza conservarne il testo in chiaro. Il recupero password non usa questa barriera e mantiene i propri limiti. Il codice non è una prova d’identità né un prerequisito per aprire il servizio.

Registrazione e recupero condividono un limite persistente di 5 richieste per client pseudonimo ogni 15 minuti. Prima di ogni consegna il mailer applica inoltre al massimo 3 messaggi per destinatario e funzione ogni 15 minuti, 5 consegne per client ogni 15 minuti, 20 messaggi complessivi all’ora e 100 al giorno. I contatori vivono in `auth_request_limits`; indirizzo, IP e chiave interna di Better Auth raggiungono la tabella soltanto come digest SHA-256 o HMAC-SHA-256. Un errore del database blocca l’invio. La risposta HTTP non attende Gmail: il processo conserva il job fino al termine o allo shutdown, ma non offre una coda durevole né un nuovo tentativo automatico.

L’accesso PR1 avviene sempre con email confermata e un account `credential`: Facebook, Instagram, Discord o un altro social non possono creare o aprire PR1. La pagina account offre due inizi nello stesso modulo: account personale oppure account con intenzione di proseguire verso PR2. Entrambi creano esclusivamente PR1; la seconda scelta modifica il percorso di ritorno dopo la conferma, ma non invia dati PR2 e non conserva una bozza in Better Auth. La conferma email non concede diritti comunitari.

Dopo l’accesso PR1 verificato, il percorso PR2 richiede un collegamento Facebook OAuth riuscito e una presentazione inviata esplicitamente da Partecipa. Il server ricava l’identità e il riferimento Facebook dal grant associato alla sessione: non accetta dal browser provider, identificativo, riferimento o nome dichiarati come prova. `handleForum` rifiuta la domanda se questa identità manca, è invalida o è già stata usata. Prima dell’inserimento il grant Facebook locale viene consumato e scollegato, quindi una transazione crea la pratica `pending` e il relativo elettorato. Se l’inserimento non riesce dopo il consumo, la persona deve collegare nuovamente Facebook; PR1 resta comunque utilizzabile.

Le sessioni social-only di versioni precedenti vengono revocate senza cancellare l’utente o i dati applicativi. Nel percorso Funnel semplice Caddy accetta `X-Forwarded-For` soltanto dal salto locale; nel percorso Worker attivo accetta soltanto l’IP convalidato e autenticato dal segreto edge, come descritto sopra. Il server raggruppa IPv6 per /64. Better Auth conserva IP e user-agent nella sessione per sicurezza fino alla scadenza; un job all’avvio e ogni 24 ore elimina sessioni e token di verifica scaduti, contatori più vecchi di 24 ore e account `credential` mai verificati da oltre sette giorni che non abbiano sessioni, dati personali o collegamenti social. In questo modo anche una registrazione che non riceve l’email perché la quota è esaurita non cresce indefinitamente nel database. Le API verificano la sessione nel database: header o identificatori inviati dal browser non attribuiscono un’identità. Le operazioni private controllano l’origine della richiesta e non entrano nelle cache condivise. I cookie sono HttpOnly e sicuri; le credenziali restano sul server.

Le raccolte sono separate per account. Le copie nel browser facilitano l’uso e l’importazione, ma non sostituiscono PostgreSQL. Le posizioni di lettura sono separate per libro ed edizione; un aggiornamento più vecchio non deve sovrascrivere il più recente. Gli ID dei libri, delle fonti e le chiavi browser esistenti sono mantenuti per compatibilità.

L’account personale non concede diritti di voto. Scegliere il percorso PR2 durante la registrazione riduce i passaggi di navigazione ma non fonde i livelli: servono ancora email verificata, collegamento Facebook, invio esplicito e valutazione. Un fondatore diventa PR2 soltanto usando uno dei tre inviti personali monouso, mentre le domande ordinarie richiedono tre sì; tre no respingono e l’assenza di esito entro 72 ore fa scadere la pratica. Le regole sono descritte in [COMMUNITY.md](COMMUNITY.md). Le impostazioni di apertura partono disabilitate.

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

## Federazione e mandati PR3

PR1 è l’account personale senza voto. PR2 è l’ammissione a un nodo preciso e vale soltanto nella sua assemblea. Ogni PR2 attivo di un nodo ammesso può presentare o accettare una candidatura PR3 in AgoràNode, ma non diventa PR3 automaticamente. PR3 è un mandato federale eletto, enumerato, con scadenza e revoca; non è un rango personale. Hosting, banda, denaro o numero di copie non entrano nel conteggio.

La migrazione 014 e `server/federation.ts` implementano il ciclo persistente: registro dei nodi ammessi e delle loro chiavi, attestazione PR2 firmata e legata a un account PR1, elettorato congelato, scheda Ed25519, certificato ricalcolato, candidatura, elezione, accettazione, scadenza e revoca. Tabelle e catene dei mandati sono append-only; replay, firme non valide, credenziali scadute e attraversamenti di nodo falliscono chiusi. `/api/federation/pr3` è il confine HTTP previsto dal runtime.

Questa implementazione è coperta da test locali, ma non è attivata nella UI o nell’istanza pubblica e non costituisce consenso distribuito. Mancano ancora chiavi e nodi reali, procedure operative, collaudo privacy, esercitazioni di revoca e applicazione delle decisioni fra computer indipendenti. Il modello completo e le soglie sono in [GOVERNANCE.md](GOVERNANCE.md).

## Verifiche e pubblicazione

`npm test` controlla logiche e flussi con dati sintetici; le prove PostgreSQL incorporano PGlite, comprese replica della conoscenza fra database distinti e vita del mandato PR3. `npm run build` verifica la compilazione e `npm run typecheck` controlla i tipi. Queste prove non sostituiscono test visivi, invio email reale, computer indipendenti, guasti di rete, concorrenza fra processi che condividono lo stesso provider e ripristino di un backup.

GitHub Actions verifica i sorgenti. Il deployment indipendente è configurato attraverso Docker Compose; il Worker edge e il blueprint Render sono percorsi separati e nessuno viene attivato da GitHub. Koyeb è escluso dalla configurazione. Mantenere la versione precedente fino alla verifica di quella nuova; un rollback del codice non deve cancellare i dati. Vedere [DEPLOYMENT.md](DEPLOYMENT.md), [PUBLICATION.md](PUBLICATION.md) e [LEGAL-OPERATIONS.md](LEGAL-OPERATIONS.md).

Le discussioni sono leggibili da chiunque, salvo quelle libere impostate alla pubblicazione come private ai soli membri PR2. Proposte e votazioni sono sempre pubbliche; i risultati e le schede nominative diventano consultabili alla scadenza. La privacy è controllata dal server prima della paginazione e sugli URL diretti.

Il carosello video applica prima il paese del visitatore, poi la lingua di lettura, mantenendo disponibili i canali internazionali. Nell’anteprima il paese arriva dai metadati nazionali della rete di hosting, attraverso una risposta privata non memorizzabile in cache pubbliche; non vengono restituiti IP o coordinate. Sul runtime indipendente, finché non è configurata una sorgente geografica attendibile, si usa soltanto la regione esplicita del browser, se presente. La lingua da sola non determina un paese. Il client applica una raccolta completata in un solo aggiornamento, anziché riordinare le schede a ogni risposta. Miniature a dimensione riservata, caricamento prioritario delle prime visibili e ripiego YouTube su errore riducono i cambiamenti durante l’apertura.
## Chat temporanea e forum permanente

La chat è implementata in `server/live-chat.ts`: il processo conserva in RAM messaggi e allegati, senza tabella, file, coda persistente, copia di backup applicativa o contenuto nei log. `server/index.ts` elimina gli elementi alla scadenza anche senza richieste, con una verifica ogni secondo. Tutte le stanze condividono finestre di 48 ore allineate all’epoca UTC; l’API comunica l’istante del prossimo azzeramento. Un riavvio, una sospensione con perdita del processo o una nuova distribuzione possono eliminare tutto prima. Le copie eventualmente create dai partecipanti non sono sotto il controllo del servizio.

La chat richiede un solo processo applicativo: la configurazione Free prevista usa un’istanza. Non avviare più worker o repliche senza progettare una distribuzione coerente delle stanze e dei limiti; il database PostgreSQL condiviso non rende condivisa la RAM. Il servizio rifiuta nuovi messaggi quando raggiunge 32 MB o 2.000 messaggi temporanei, invece di archiviare o esportare lo storico. Il polling avviene ogni quindici secondi, soltanto con chat aperta e pagina visibile; l’intervallo contiene il consumo di richieste del percorso pubblico gratuito, mentre invii e ritorno alla scheda aggiornano subito la stanza. Non è un archivio né un servizio di messaggistica durevole.

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

`handleForum` non accetta più un `referenceUrl` scelto dal browser. Per ogni nuova pratica usa come `reference_url` lo stesso riferimento Facebook app-scoped ricavato dall’identità OAuth verificata lato server; un URL Facebook, Instagram o personale scritto dal candidato viene rifiutato insieme a qualsiasi altro campo estraneo al contratto. La migrazione 010 mantiene la colonna nullable per compatibilità con le pratiche precedenti. Il server conserva il riferimento autenticato per la valutazione umana, ma non lo visita, non carica anteprime e non lo inoltra a proxy.

`server/social-identity.ts` offre soltanto Facebook come prova OAuth obbligatoria per PR2. Collegamento e callback non sono disponibili mentre `FORUM_OPEN=false`; lo scollegamento resta disponibile a una sessione PR1 valida. In produzione `FORUM_OPEN=true` richiede la coppia completa delle credenziali Facebook, mentre il solo servizio PR1 può restare aperto senza di esse. Il provider usa il solo scope `public_profile`; Discord non produce una claim di ammissione. `handleForum` rilegge nome e identificativo dal provider, controlla che non siano già associati a un’altra pratica e rimuove il grant locale prima dell’inserimento. Un collegamento non consumato viene eliminato dal job di autenticazione dopo 24 ore, con esecuzione giornaliera. La rimozione riguarda il record e i token locali: non afferma la revoca presso Meta. La pratica conserva soltanto provider, identificativo, nome e riferimento app-scoped ricevuti in quel momento; una rara corsa che faccia fallire l’inserimento dopo lo scollegamento richiede di collegare nuovamente Facebook. Candidato e membri PR2 vedono nome, presentazione e il riferimento Facebook autenticato; il record completo non compare nel board anonimo, nei topic o nelle schede/esportazioni pubbliche. Il ritiro di una domanda in attesa o respinta elimina riga di adesione, voti ed elettorato collegato, liberando alias e dati social per una nuova domanda. `server/forum-retention.ts` esegue la stessa eliminazione per le pratiche rimaste scadute o respinte per 30 giorni: parte senza attendere una richiesta HTTP e si ripete ogni 24 ore nella stessa transazione serializzata delle decisioni del forum. Per un rifiuto usa l’istante dell’evento di cambio stato; per dati precedenti privi dell’evento usa la scadenza della domanda. Gli eventi append-only conservano soltanto identificativi opachi. Un membro già attivo segue invece la procedura privacy, perché può avere interventi e schede pubbliche.

La dashboard delle ammissioni è visibile ai PR2 senza introduzione o pannello chiuso. Tutti i PR2 attivi possono votare richieste aperte, inclusi quelli appena ammessi. Tre voti favorevoli ammettono, tre contrari respingono; le transazioni PostgreSQL serializzano decisioni concorrenti. Proposte e issue vengono create dal forum; `?view=partecipa&nuova=proposta` apre il modulo con votazione. I link GitHub restano soltanto per il codice e le revisioni tecniche.

## Registro delle comunità locali e confine P2P (revisione 22 ottobre 2026)

`app/instances/agora.ts` aggiunge un manifesto **planned** per il nodo tematico Agorà; non sostituisce `app/instances/polisrossa.ts`. `app/instances/registry.ts` è una allowlist locale dei due spazi e alimenta la directory del portale `/` e `GET /api/nodes`. Questo catalogo non esplora peer remoti e non abilita account o forum del nodo Agorà.

`app/lib/instance-info.ts` continua a restituire PolisRossa senza parametri per compatibilità; la richiesta esplicita `GET /api/instance?id=agora` restituisce metadati pubblici della preview. Ogni altra richiesta con parametri inattesi è respinta, e il descrittore non contiene chiavi o namespace di compatibilità privati. Questa è una **separazione delle identità applicative**, non ancora il routing di due database produttivi.

`app/platform/data-placement.ts` classifica `public-verified`, `public-ephemeral`, `private-local`, `private-authorized` e `secret-never-export`; si tratta di un **contratto preparatorio** e non di enforcement. Il motore reale di esportazione conserva la propria allowlist del patrimonio conoscitivo. Prima di aggiungere nuovi exporter e trasporti P2P occorre applicare la classificazione sul server, dimostrare che non ci sono dati personali nel payload pubblico e collaudare le policy di cancellazione.

La rete completa con repliche incrementali, demoni dei volontari, bootstrap, gateway indipendenti e consenso tecnico è pianificata in [PEER-OWNED-ARCHITECTURE.md](PEER-OWNED-ARCHITECTURE.md) e [DECENTRALIZATION-ROADMAP.md](DECENTRALIZATION-ROADMAP.md). Non confondere certificati statici verificati localmente con consenso BFT in rete.

