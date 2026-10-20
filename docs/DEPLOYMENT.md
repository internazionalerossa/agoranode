# Gestione e pubblicazione

Pubblicare il servizio significa collegare il codice a un server raggiungibile, a un database duraturo e a un sistema che invii le email necessarie all’account. Caricare i file su GitHub rende disponibili i sorgenti, ma non attiva da solo questi componenti. Questa guida accompagna il passaggio dalla compilazione alla verifica del servizio reale e distingue ciò che può essere preparato nel repository da ciò che deve essere configurato presso i fornitori.

Le variabili di ambiente sono impostazioni fornite al server senza scriverle nel codice pubblico. Alcune sono credenziali e devono rimanere segrete; altre descrivono l’indirizzo e il gestore del servizio. Una migrazione prepara o aggiorna la struttura del database: va eseguita controllando versione, permessi e possibilità di ripristino.

## Runtime indipendente

Il target Node contiene interfaccia React, API, autenticazione Better Auth e database PostgreSQL. `npm run build` produce `build-node/`; `Dockerfile` esegue il processo senza privilegi di root. La compilazione non necessita di credenziali. `node build-node/server.mjs` avvia il servizio sulla porta `PORT` (8000 per impostazione predefinita). Preparare un’immagine non trasferisce dominio, utenti o dati da un altro servizio.

Configurazione disponibile solo sul server, tramite i secret dell’hosting:

| Variabile | Uso |
| --- | --- |
| `PUBLIC_OPERATOR_NAME`, `PUBLIC_PRIVACY_CONTACT` | Identità del titolare e recapito pubblico per i diritti; configurazione server, senza inserirli nei sorgenti |
| `APP_URL` | Origine HTTPS definitiva del sito, senza percorsi |
| `DATABASE_URL` | Connessione PostgreSQL con TLS e certificato verificabile |
| `AUTH_SECRET` | Segreto casuale di almeno 32 caratteri, da generare nel gestore dei secret |
| `MAIL_TRANSPORT` | `smtp` oppure `brevo`; il secondo usa HTTPS |
| `BREVO_API_KEY` | Segreto per il solo trasporto Brevo |
| `SMTP_HOST`, `SMTP_PORT` | Server email e porta TLS 465 oppure STARTTLS 587, solo con trasporto SMTP |
| `SMTP_USER`, `SMTP_PASSWORD` | Credenziali SMTP dedicate |
| `MAIL_FROM` | Mittente verificato e autorizzato dal servizio email |
| `REGISTRATIONS_OPEN`, `FORUM_OPEN` | Aperture esplicite, disabilitate per impostazione predefinita fino alle verifiche operative |
| `COMMUNITY_BOOTSTRAP_HASH` | Tre SHA-256 distinti separati da virgole, per tre inviti personali monouso ai membri iniziali; mai i codici in chiaro |

`npm run db:migrate`, oppure `node build-node/migrate.mjs` nell’immagine, applica le migrazioni applicative e lo schema della versione installata di Better Auth. Eseguire una sola release di migrazione, con backup verificato, prima di avviare la nuova versione. Non usare il ruolo amministratore come credenziale quotidiana del sito: separare ruolo di migrazione e ruolo applicativo, con permessi sulle sole tabelle necessarie. Le migrazioni applicate hanno un digest: una modifica successiva interrompe l’esecuzione.

## Configurazione gratuita indipendente

Koyeb è escluso dal percorso di pubblicazione. Il blueprint `render.yaml` del runtime indipendente predispone **Render Free a Francoforte**, PostgreSQL **Neon Free a Francoforte** e invio delle email attraverso l’API HTTPS di **Brevo Free**. È una configurazione da collegare e verificare, non un servizio già attivato. Codice applicativo, Better Auth e PostgreSQL restano indipendenti dal login dei fornitori.

Il blueprint richiede solo un Web Service Free, senza database Render a scadenza, dischi a pagamento o componenti aggiuntivi. Le migrazioni vengono eseguite all’avvio sotto lock PostgreSQL, prima del server. Creare il database Neon nella regione `aws-eu-central-1`; inserire `DATABASE_URL` esclusivamente nei secret del servizio. Il piano Neon Free dichiara 100 CU-ore e 1 GB per progetto. Account, segnalibri e forum risiedono nel database remoto, non nel filesystem temporaneo del server.

Render Free si sospende dopo 15 minuti senza traffico e il primo accesso può richiedere circa un minuto. Ha quote di traffico e compilazione e può limitare applicazioni con molte richieste esterne: verificare la raccolta dei feed sul servizio reale. Non viene promessa disponibilità continua. Mantenere il piano Free, evitare componenti a pagamento e controllare le impostazioni di spesa; senza un metodo di pagamento le quote esaurite comportano sospensioni anziché extra addebitati. Le regioni scelte non costituiscono una garanzia generale sull’assenza di trasferimenti internazionali.

Render Free blocca le porte SMTP 25, 465 e 587. Per questo il codice supporta `MAIL_TRANSPORT=brevo`, `BREVO_API_KEY` e `MAIL_FROM`, senza richiedere credenziali SMTP. Brevo Free dichiara 300 email al giorno e comprende le email transazionali. Verificare il mittente e le condizioni del servizio prima di aprire le iscrizioni. Non importare rubriche né abilitare campagne: il progetto usa solo conferme e recupero dell’account. Il trasporto SMTP rimane disponibile per altri hosting e per lo sviluppo locale con `MAIL_TRANSPORT=smtp`.

Il primo avvio del blueprint richiede anche `PUBLIC_OPERATOR_NAME`, `PUBLIC_PRIVACY_CONTACT` e `COMMUNITY_BOOTSTRAP_HASH`: i primi due identificano il titolare e il recapito pubblico; il terzo contiene esclusivamente i tre hash degli inviti iniziali. Questi valori si inseriscono nella configurazione del servizio, non nel repository. I campi `sync: false` vengono richiesti soltanto alla creazione iniziale del blueprint; per un servizio già creato vanno aggiunti nelle impostazioni dell’ambiente.

Dopo il collegamento alla sola repository del progetto: configurare secret, verificare migrazioni, email reali, accesso di due utenti, persistenza, backup e ripristino. Aprire `REGISTRATIONS_OPEN` e `FORUM_OPEN` solo dopo queste verifiche. In produzione il server rifiuta l’apertura senza identità del titolare e contatto privacy validi. Questi due campi pubblici non sono credenziali, ma vanno forniti nella configurazione dell’hosting e non nei sorgenti. Il controllo impedisce una configurazione incompleta: non certifica le altre condizioni legali. Non usare il PostgreSQL Free di Render per i dati persistenti: scade dopo 30 giorni.

Riferimenti verificati il 20 ottobre 2026: [Render Free](https://render.com/docs/free), [blueprint](https://render.com/docs/blueprint-spec), [Neon Free](https://neon.com/pricing), [regioni Neon](https://neon.com/docs/introduction/regions), [Brevo Free](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans), [API email](https://developers.brevo.com/reference/send-transac-email). Prezzi, quote e requisiti del mittente vanno ricontrollati prima dell’attivazione.

## Accesso e trasferimento

Conferma email obbligatoria, password di almeno 12 caratteri, sessioni nel database e cookie sicuri HttpOnly. Il recupero usa un collegamento monouso e revoca le sessioni precedenti. Le operazioni private controllano l’origine e non accettano header di identità del visitatore. I limiti persistenti alle richieste di accesso sono condivisi dalle repliche; il loro funzionamento non dipende solo dall’IP dichiarato da un proxy.

L’account personale conserva letture e segnalibri. L’adesione con verifica comunitaria attribuisce separatamente la facoltà di intervenire e votare. Controllare il possesso della mail non costituisce verifica dell’identità civile. Non vengono raccolte scansioni di documenti.

Gli identificatori di account di servizi diversi non sono equivalenti. Prima di spostare raccolte personali occorre un flusso in cui il titolare dimostri il controllo di entrambi gli account. Non associare utenti in base al solo nome o a indirizzi non verificati. Le copie browser non attraversano automaticamente un cambio di dominio. Nessuna importazione di dati privati è eseguita dalla compilazione.

## Verifica prima dell’apertura

Eseguire build, typecheck e test del runtime. Verificare sul servizio di prova: conferma e recupero email reali, isolamento tra due account, persistenza dopo riavvio e nuova distribuzione, richieste concorrenti da più repliche, backup e ripristino, scadenze del voto e accessibilità da telefono. I test PostgreSQL incorporati usano PGlite: non certificano la rete, il failover o la concorrenza del provider scelto.

Non aprire le iscrizioni pubbliche prima di completare [gli adempimenti operativi](LEGAL-OPERATIONS.md). Conservare il deployment precedente fino alla verifica del nuovo. Un rollback del codice non deve cancellare tabelle, account, schede o eventi.

## Sviluppo locale

Richiede Node.js 24, npm e Docker con Compose. I container di questa configurazione sono destinati esclusivamente allo sviluppo e ascoltano sulla macchina locale.

```sh
npm ci
docker compose up -d postgres mail
cp .env.example .env
npm run db:migrate
npm run dev:server
```

In un secondo terminale eseguire `npm run dev` e aprire l’indirizzo locale indicato da Vite. La posta di prova è consultabile su `http://localhost:8025`: non viene consegnata a destinatari reali. Per provare iscrizioni e forum abilitare le rispettive variabili solo nel file locale e riavviare il server. Le ammissioni richiedono anche l’attivazione controllata dei tre membri iniziali.

Le eccezioni per HTTP, database senza TLS e SMTP sulla porta 1025 valgono esclusivamente per lo sviluppo locale esplicito. In produzione servono origine HTTPS, database con certificato verificato, mittente email autorizzato e un segreto casuale nuovo. I valori di `.env.example` non sono credenziali di produzione.
## Chat temporanea e forum permanente

La chat è implementata in `server/live-chat.ts`: il processo conserva in RAM messaggi e allegati, senza tabella, file, coda persistente, copia di backup applicativa o contenuto nei log. `server/index.ts` elimina gli elementi alla scadenza anche senza richieste, con una verifica ogni secondo. Tutte le stanze condividono finestre di 48 ore allineate all’epoca UTC; l’API comunica l’istante del prossimo azzeramento. Un riavvio, una sospensione con perdita del processo o una nuova distribuzione possono eliminare tutto prima. Le copie eventualmente create dai partecipanti non sono sotto il controllo del servizio.

La chat richiede un solo processo applicativo: la configurazione Free prevista usa un’istanza. Non avviare più worker o repliche senza progettare una distribuzione coerente delle stanze e dei limiti; il database PostgreSQL condiviso non rende condivisa la RAM. Il servizio rifiuta nuovi messaggi quando raggiunge 32 MB o 2.000 messaggi temporanei, invece di archiviare o esportare lo storico. Il polling avviene ogni cinque secondi, soltanto con chat aperta e pagina visibile. Non è un archivio né un servizio di messaggistica durevole.

Tutte le letture, le scritture e le immagini verificano la sessione indipendente e l’ammissione PR2. Il minuto fra invii vale per la persona su tutte le stanze, con controllo e inserimento sincroni nel processo; i tentativi idempotenti non duplicano messaggi. Sono ammessi 200 termini con segmentazione Unicode e un’immagine PNG, JPEG, GIF o WebP fino a 2 MB. La traduzione automatica può inviare il testo a Google Translate o MyMemory. Le richieste di forum e chat usano `temporary:true`, senza cache del sito, localStorage o cache HTTP; le condizioni dei fornitori sono esterne al controllo del progetto. Non vengono caricate anteprime esterne automatiche. I link si aprono sulla fonte indicata. I corpi dei messaggi non devono essere aggiunti ai log di accesso o a servizi di monitoraggio.

Il forum conserva invece post e commenti in PostgreSQL: testo principale fino a 30.000 caratteri sul server e commenti fino a 20.000. L’interfaccia propone una bozza esplicita per sviluppare un proprio messaggio della chat in un thread; nessuna conversazione viene trasferita automaticamente. Gli allegati temporanei non diventano allegati permanenti del forum. La promozione in thread richiede la pubblicazione volontaria del testo.

## Lingue e biblioteca

La Biblioteca mantiene catalogo, percorsi e racconto storico nella stessa pagina. Una breve guida iniziale introduce gli strumenti e collega direttamente all’archivio comparativo. Le preferenze in `internazionalerossa.language-preferences` separano interfaccia e contenuti; `original` disattiva la traduzione dei contenuti mantenendo localizzati menu e comandi. I filtri per la lingua delle fonti restano indipendenti. Le preferenze precedenti vengono migrate.

La traduzione di forum e chat è differita ai paragrafi visibili, con due richieste concorrenti. Conserva i collegamenti, non modifica testi o schede di voto nel database e non scrive traduzioni in localStorage o nella cache del server. Il testo è inviato al servizio esterno dichiarato nell’interfaccia; il progetto non garantisce la cancellazione dei dati trattati da quel servizio. Le richieste pendenti si interrompono scegliendo l’originale, cambiando lingua o chiudendo il contenuto. La traduzione del libro cambia la presentazione, non l’edizione o l’identificatore del segnalibro.
