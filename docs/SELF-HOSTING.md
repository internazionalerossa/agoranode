# Ospitare PolisRossa sul proprio computer

Questa configurazione avvia il server Node, PostgreSQL 17 e un proxy HTTPS Caddy. Non richiede Render, Supabase o Brevo. Servono Node.js 24 e Docker con Compose sul computer che ospiterà il sito. Non basta aprire una pagina web per installarla. Il PC deve restare acceso, con Docker avviato e senza sospensione.

La configurazione ospita oggi **PolisRossa — AgoràNode**, il solo nodo con rassegna, biblioteca, storia, dati e comunità già completi, dedicato allo stato dell’arte della sinistra politica. AgoràNode è il nome della tecnologia/infrastruttura comune. La home-indice dei nodi è disponibile; `/agora` presenta stato tecnico, registro federale e custodia, ma non ha ancora tutte le superfici editoriali di PolisRossa. Il manifesto v1, la facciata dell’istanza e il deposito comune della conoscenza sono implementati; non esistono ancora un generatore completo per nuovi argomenti o una rete di nodi interoperabili.

Ogni installazione nuova creata con `init` riceve un identificatore PostgreSQL casuale, usato come nome del database e dell’utente, e volumi Compose separati. Questo isola le credenziali e i dati di installazioni distinte; non rende il tema o il manifesto dell’applicazione configurabili. Per retrocompatibilità, le installazioni inizializzate da versioni precedenti continuano a usare `polisrossa` quando i campi PostgreSQL dedicati non sono presenti.

## Creare nodi e contribuire hardware: stato attuale

`init` prepara una copia autonoma dell’applicazione PolisRossa. Anche in modalità `mirror`, il nome del progetto Compose cambia soltanto l’identità dell’installazione tecnica: il runtime, i percorsi, i cataloghi e l’API restano quelli di PolisRossa. La modalità `mirror` chiude le scritture; non importa né sincronizza automaticamente contenuti, account o forum da un altro server. Non usare questo comando per dichiarare creato un nuovo nodo tematico.

Al momento non c’è un comando o un flusso web che generi un manifesto operativo per un tema scelto dall’utente, registri il nodo nella home, o gli assegni contenuti e database tramite API multi-istanza. Non è nemmeno possibile aggiungere il proprio computer a un pool federato di calcolo o storage: non ci sono peer discovery, orchestrazione, monitoraggio, replica automatica o failover operativi. Puoi ospitare una copia indipendente di PolisRossa seguendo questa guida e contribuire al codice con una pull request; l’hosting non dà accesso ai dati privati altrui né diritti politici.

Il passaggio a nodi personalizzati richiede prima di caricare e validare un manifesto per istanza, separare identità, contenuti e API, e testare che database e dati personali restino isolati. Solo dopo ha senso registrare nodi ospitati da altri e definire un protocollo di custodia del contenuto pubblico. L’eventuale condivisione hardware viene dopo: deve specificare autorizzazioni, limiti delle risorse, aggiornamenti, osservabilità, revoca e ripristino prima di accettare host indipendenti. Il primo modello di replica da valutare deve riguardare soltanto contenuti pubblici verificabili; non credenziali, preferiti, account o altri dati privati.

## Stato e confini

Il pacchetto usa i nomi tecnici `primary` e `mirror` soltanto per scegliere la configurazione: `mirror` imposta i controlli di sola consultazione, mentre `primary` permette di configurare separatamente funzioni con scrittura, che restano inizialmente chiuse. La modalità effettiva va comunque verificata sul servizio in esecuzione; il checkpoint della release non comprende `runtime.env` e non prova che l'istanza stia usando `MIRROR_MODE=true`. Ospitare un'istanza non assegna diritti editoriali, di voto o di governo e non rende quel computer il proprietario del progetto.

Non sono implementati un cluster P2P, la replica continua del database o del forum, il passaggio automatico fra computer, il quorum fra nodi o la cifratura end-to-end. Un nodo può continuare a offrire la propria consultazione locale senza contattare altri nodi, ma non ricostruisce i dati di un'istanza spenta e non mantiene da solo un database condiviso. I checkpoint firmati e i backup cifrati non sono server di riserva pronti a subentrare. Il funzionamento completo dei container deve essere collaudato sul computer ospitante; i test del codice non lo sostituiscono.

## Primo avvio sul PC

Scarica i sorgenti di questo repository. Apri il terminale nella cartella del progetto ed esegui:

```sh
node scripts/selfhost.mjs init
node scripts/selfhost.mjs start
node scripts/selfhost.mjs status
```

L'indirizzo locale è `https://localhost:8443`. All'inizio è raggiungibile solo dal computer che ospita il servizio. La configurazione crea credenziali casuali nella cartella privata `.selfhost`, esclusa da Git e dall'immagine Docker. Un secondo `init` rifiuta di sovrascriverle. Non copiare questa cartella ai volontari.

Caddy emette un certificato locale. Esporta la sua autorità pubblica con `node scripts/selfhost.mjs certificate`, poi rendila attendibile nel sistema/browser con la procedura prevista dal tuo sistema operativo. Verifica che provenga dalla tua installazione. Non disabilitare globalmente la verifica HTTPS. Le chiavi private della CA rimangono nel volume Docker `certificates`.

`node scripts/selfhost.mjs stop` ferma i servizi senza eliminare i dati. `start` ricrea i container mantenendo i volumi, anche quando cambia soltanto una configurazione montata come il Caddyfile aggiornato da `tunnel-origin`. Non eseguire `docker compose down -v` sull'installazione che vuoi conservare: elimina il database e i certificati.

PostgreSQL non apre porte TCP: app e backup lo raggiungono attraverso un socket Unix condiviso sullo stesso host, con password. Le connessioni a database remoti continuano a richiedere TLS verificato. Gli amministratori del computer ospitante possono comunque leggere dati e segreti: il socket non promette protezione dal proprietario del sistema.

## Importare la copia autorizzata della Biblioteca

La lettura interna non scarica un libro durante la visita. Dopo il primo avvio importa esplicitamente la sola edizione registrata con diritto di redistribuzione:

```sh
node scripts/selfhost.mjs library-import commons-viventi en
```

Il comando è idempotente e salva testo, capitoli, licenza, attribuzione, origine e impronte in PostgreSQL. Deve terminare correttamente prima del backup destinato alla pubblicazione. Verifica poi senza account che `GET /api/library/read?bookId=commons-viventi&edition=en&chapter=0` restituisca `200` attraverso l'HTTPS locale e che un'edizione non importabile resti collegata all'archivio originale. Solo dopo ripeti backup cifrato e ripristino separato, controllando che la revisione del libro esista anche nel database ripristinato.

## Importare la conoscenza pubblica di PolisRossa

Dopo l’avvio e le migrazioni importa le pagine di conoscenza già revisionate nel repository:

```sh
node scripts/selfhost.mjs knowledge-import
```

Il comando usa un container senza rete, collegato a PostgreSQL soltanto tramite il socket locale. Importa in modo idempotente 64 eventi e 17 persone dalla storyline esistente; ogni entità, revisione, fonte e relazione ha un’impronta SHA-256 e le tabelle dei contenuti sono append-only. Ripetere il comando sulla stessa release non duplica i dati. Il seed dichiara PolisRossa come soggetto editoriale, approvazione `repository-review` e diritti di riuso non documentati: non attribuisce retroattivamente una licenza ai testi esistenti.

Il deposito può costruire un bundle canonico delle revisioni correnti, ma il comando non invia quel bundle ad altri computer e non importa account, forum o serie statistiche. Dopo l’import esegui un nuovo backup cifrato e una prova di ripristino separata; verifica nel database ripristinato la presenza di 64 eventi e 17 persone prima di considerare protetta questa migrazione.

## Nodo locale di sola consultazione

In una seconda cartella o checkout, un volontario può creare un'installazione indipendente della stessa applicazione PolisRossa senza modificare router, firewall o DNS:

```sh
node scripts/selfhost.mjs init https://localhost:9543 mirror --project polisrossa-node2 --http-port 9080
node scripts/selfhost.mjs start
node scripts/selfhost.mjs status
```

Il nome progetto e le porte devono essere diversi da quelli di eventuali installazioni già attive sullo stesso computer. La configurazione resta in ascolto su `127.0.0.1`; può effettuare connessioni in uscita per consultare le fonti pubbliche, ma non accetta traffico dalla rete. Per aprire l'indirizzo locale occorre rendere attendibile il certificato di questa specifica installazione come descritto sopra.

`MIRROR_MODE=true` forza la chiusura di account, adesioni, API private e invio email anche se altre opzioni sono abilitate per errore. Dopo l'avvio verifica sul nodo reale che questi accessi siano rifiutati: la presenza della riga nel file di configurazione o di un checkpoint valido, da sola, non costituisce il collaudo. Il nodo possiede un database separato per il proprio funzionamento; non importa account, sessioni, preferiti o forum da un'altra installazione.

## Checkpoint firmato della release

I comandi `snapshot-*` usano la stessa immagine Docker taggata dell'app e non la costruiscono autonomamente. Esegui prima `node scripts/selfhost.mjs start` sulla release da attestare, attendi che termini correttamente, quindi genera una coppia Ed25519 una sola volta e firma il checkpoint iniziale:

```sh
node scripts/selfhost.mjs snapshot-keygen
node scripts/selfhost.mjs snapshot-export
```

La chiave privata viene creata in `.selfhost/private/snapshot/private.pem` e non deve uscire da quel computer. Il comando rifiuta di sovrascrivere chiavi esistenti. La chiave pubblica è `.selfhost/replica/public.pem`; il bundle è la cartella `.selfhost/snapshots/<digest-sha256>` indicata dall'output e contiene soltanto `manifest.json` e `signature.json`. Come nome usa i 64 caratteri esadecimali dello `snapshotId`, senza il prefisso `sha256:`.

Il checkpoint iniziale ha altezza `0`. Per attestare la release successiva, dopo averla costruita con `start`, indica altezza `1` e lo `snapshotId` completo del checkpoint precedente; per gli aggiornamenti seguenti incrementa l'altezza di uno e usa sempre la testa precedente:

```sh
node scripts/selfhost.mjs snapshot-export 1 sha256:<64-caratteri-del-predecessore>
```

L'importazione rifiuta rollback, salti e biforcazioni rispetto alla testa già registrata sulla stessa installazione. La versione 1 richiede la stessa chiave per tutta la catena e non supporta la rotazione: se la chiave privata viene persa, quella catena non può essere estesa. L'esportatore non impedisce ancora di firmare due checkpoint concorrenti: nodi diversi potrebbero accettare rami diversi, perché non esiste ancora un protocollo di consenso o quorum.

Il ricevente deve disporre della stessa release e averla già costruita con `start`. Copia il bundle in `.selfhost/replica/<digest-sha256>` e la chiave pubblica autenticata in `.selfhost/replica/public.pem`, poi esegue:

```sh
node scripts/selfhost.mjs snapshot-verify <digest-sha256> public.pem
node scripts/selfhost.mjs snapshot-import <digest-sha256> public.pem
node scripts/selfhost.mjs snapshot-status
```

`snapshot-verify` usa la stessa immagine taggata dell'app e confronta quel runtime con il manifesto firmato, senza ricostruirlo. Per `package.json`, `package-lock.json` e le migrazioni SQL normalizza CRLF e LF prima del confronto, così il checkout Windows e quello Linux possono produrre lo stesso hash; gli altri file in `build-node/**` restano confrontati senza questa trasformazione. `snapshot-import` ripete la verifica e registra nel database locale soltanto provenienza e testa del checkpoint; non copia o installa la release e non importa contenuti. Il manifesto della versione 1 ha ambito `release-only`, stato pubblico vuoto ed esclude i contenuti generati dagli utenti.

Verificare la chiave pubblica con un canale separato è indispensabile: ricevere bundle e chiave dalla stessa fonte non dimostra chi abbia firmato. Soltanto il comando di firma monta la chiave privata e i comandi snapshot non hanno rete; verifica e importazione non possono leggere quella chiave. Firma però soltanto codice già esaminato e considerato affidabile: lo strumento di firma fa parte della stessa release candidata, quindi il checkpoint non sostituisce la revisione del codice. Questo meccanismo non sincronizza nodi, non instrada visitatori e non prova che un gestore stia effettivamente eseguendo l'immagine verificata dopo il controllo.

## Ingresso Worker davanti a Tailscale Funnel

Il percorso gratuito preparato per un indirizzo più breve usa un Cloudflare Worker `workers.dev` come ingresso e l’URL Tailscale Funnel già esistente come origine. Non richiede porte WAN, DMZ o nuove regole del firewall. È un proxy, non una replica: PC, Docker, Tailscale, Funnel e Worker devono funzionare tutti; se il PC si ferma, il sito si ferma. Cloudflare e Tailscale diventano fornitori del percorso pubblico e devono comparire nell’informativa effettiva.

Il repository contiene il Worker in `deploy/edge-worker/worker.mjs`, ma **non attesta che sia stato distribuito**. Prima conserva `REGISTRATIONS_OPEN=false` e `FORUM_OPEN=false`, verifica il backup e prepara l’origine senza attivarla:

```powershell
node scripts/selfhost.mjs edge-origin https://polisrossa.agoranode.workers.dev
```

Sostituisci l’URL soltanto se il nome realmente assegnato da Cloudflare è diverso. Questa prima fase crea un segreto casuale in `.selfhost/runtime.env` e scrive `.selfhost/Caddyfile.edge-origin`; non cambia `APP_URL`, non sostituisce il Caddyfile attivo e non riavvia i container. Non pubblicare né copiare in chat `EDGE_SHARED_SECRET`.

Nel Worker configura `PUBLIC_HOST` con il solo hostname `polisrossa.agoranode.workers.dev`, `UPSTREAM_ORIGIN` con l’origine HTTPS effettiva di Funnel e `EDGE_SHARED_SECRET` come secret, usando esattamente il valore privato generato. Il codice accetta soltanto `GET`, `HEAD`, `POST` e `DELETE`, rifiuta upgrade e host diversi, rimuove header di inoltro non attendibili e trasmette a Caddy il segreto e l’IP convalidato fornito da Cloudflare. Verifica prima il Worker con consultazione soltanto; questa prova non autorizza l’apertura di account o forum.

Dopo che Worker, home e `/healthz` hanno risposto correttamente, attiva il confine dell’origine:

```powershell
node scripts/selfhost.mjs edge-origin https://polisrossa.agoranode.workers.dev --activate
node scripts/selfhost.mjs start
node scripts/selfhost.mjs preflight
```

La seconda fase imposta `APP_URL` sull’origine Worker, installa il Caddyfile preparato e riserva `https://localhost:9443` per la manutenzione locale; puoi scegliere un’altra porta loopback libera con `--local-https-port`. Sul listener raggiunto da Funnel, Caddy accetta soltanto richieste con il segreto edge e l’header client previsti, rimuove gli header interni prima di inoltrarli e risponde `403` alle richieste dirette. Dopo l’attivazione controlla tutti questi casi: URL Worker valido, accesso diretto al nome `.ts.net` rifiutato anche con `Host: localhost`, manutenzione su `https://localhost:9443`, cookie e redirect riferiti al Worker e callback Facebook `${APP_URL}/api/identity/callback/facebook`.

Per tornare in modo reversibile all’ingresso Funnel senza cambiare database o segreti:

```powershell
node scripts/selfhost.mjs tunnel-origin https://polisrossa.tail37128d.ts.net
node scripts/selfhost.mjs start
```

Usa sempre l’hostname Funnel realmente restituito dalla tua installazione. Il rollback rende di nuovo Funnel l’origine dell’applicazione; disabilita separatamente il Worker se non deve più inoltrare richieste. Per chiudere ogni accesso Internet esegui anche `tailscale funnel reset` e verifica da una rete esterna. Nessuno di questi comandi elimina volumi, backup o chiavi.

## Pubblicazione diretta su Internet, alternativa facoltativa

Questa sezione serve soltanto a chi decide di esporre direttamente una propria installazione invece di usare Worker e Funnel. Non è necessaria per usare un nodo locale o verificare un checkpoint.

Prima di aprire il sito scegli un nome stabile e verifica la raggiungibilità della connessione domestica. Un sottodominio DDNS gratuito può puntare all'IP pubblico, ma non supera il CGNAT dell'operatore. In quel caso serve una diversa connettività o un tunnel con un ingresso pubblico stabile. Non acquistare servizi per tentativi.

Per preparare una nuova installazione destinata fin dall'inizio all'esposizione diretta con dominio:

```sh
node scripts/selfhost.mjs init https://nome-del-server.example
```

Il comando resta deliberatamente in ascolto sul solo computer. Dopo le verifiche di rete, configura `.selfhost/runtime.env` con `BIND_ADDRESS=0.0.0.0`, `HTTPS_PORT=443` e `HTTP_PORT=80`, e il router/firewall per raggiungere il proxy sulle porte 80 e 443. Non esporre database, cartelle private o porte amministrative.

Per convertire un'installazione locale già inizializzata, conserva `runtime.env`, volumi e segreti: modifica soltanto `APP_URL`, porte e indirizzo di ascolto, quindi sostituisci nel Caddyfile il sito `localhost:443` con il dominio pubblico. Rimuovi `tls internal`, perché nella pubblicazione diretta deve essere Caddy a richiedere e rinnovare il certificato pubblico; il redirect HTTP automatico resta quello di Caddy. Non usare `tunnel-origin`, che prepara invece il percorso separato tramite Tailscale Funnel. Caddy può ottenere il certificato soltanto dopo che DNS, inoltri WAN 80/443 e firewall rendono il dominio realmente raggiungibile. Account e forum restano chiusi fino al collaudo esterno e alla configurazione del gestore.

## Backup che i volontari possono conservare senza leggerli

Usiamo il formato age, non un algoritmo crittografico inventato dal progetto. Genera una chiave con age sul dispositivo del custode:

```sh
age-keygen -o chiave-privata-polisrossa.txt
age-keygen -y chiave-privata-polisrossa.txt
```

Conserva la chiave privata fuori dal repository, dal server di backup e dalle cartelle condivise. Il secondo comando mostra soltanto la chiave pubblica che inizia con `age1`: inseriscila in `.selfhost/recipients.txt`. Puoi aggiungere più destinatari, uno per riga: ciascuno potrà decifrare autonomamente il backup. Non è una divisione della chiave fra custodi.

Poi, sul server che conserva il database da proteggere:

```sh
node scripts/selfhost.mjs backup
```

Il container esegue `pg_dump` e passa direttamente il risultato ad age tramite una pipe. Scrive soltanto il file cifrato in `.selfhost/backups`, eliminando l'eventuale file incompleto se dump o cifratura falliscono. Non monta nessuna chiave privata del custode. Puoi consegnare il solo file `.dump.age` a più volontari; non consegnare `runtime.env` o le chiavi. La dimensione del file e il momento della copia restano osservabili.

Il backup contiene il database, non tutta l'installazione: custodisci separatamente AUTH_SECRET, credenziali OAuth e configurazione. AUTH_SECRET protegge anche i token OAuth cifrati nel database. Non archiviare questi segreti insieme alle copie destinate ai volontari. La chat attuale rimane temporanea in RAM e non entra nel dump.

## Prova di recupero

Su un computer fidato, separato dall'istanza attiva, decifra il file con `age --decrypt -i chiave-privata-polisrossa.txt backup.dump.age > ripristino.dump`. Il file ottenuto è sensibile. Ripristinalo con `pg_restore --no-owner --no-acl` in un database nuovo e vuoto, verifica record e flussi applicativi, poi elimina la copia in chiaro secondo le capacità del supporto. Non ripristinare sopra il database operativo per fare una prova. Confronta anche l'integrità/provenienza del file con una copia custodita dal gestore: cifratura e conservazione non impediscono al volontario di cancellare o sostituire un backup con una versione vecchia.

Se tutte le chiavi private vengono perse, le copie cifrate non sono recuperabili. Nessun meccanismo automatico di sincronizzazione o ripristino remoto è abilitato da questi comandi.

## Email gratuita per gli account, non per invii massivi

L'impostazione iniziale resta `MAIL_TRANSPORT=none`. Dopo aver configurato Gmail SMTP, PR1 usa soltanto email e password confermate. Chi sceglie il percorso PR2 crea comunque prima PR1; dopo la conferma deve accedere, collegare davvero Facebook tramite OAuth e inviare esplicitamente la domanda. Facebook non sostituisce l'accesso PR1 e non ammette automaticamente a PR2: prova il controllo dell'account social, mentre la valutazione resta ai membri.

Per il server domestico il percorso scelto è una casella Gmail gratuita dedicata al progetto, senza acquistare un servizio di invio. Evita una casella personale: l'indirizzo `MAIL_FROM` sarà visibile ai destinatari. Attiva la verifica in due passaggi sull'account Google e, se l'opzione è disponibile per quell'account, crea una password per app dedicata a PolisRossa. Le password per app possono non essere disponibili per account con sola chiave di sicurezza, Advanced Protection o restrizioni di un'organizzazione. Non usare mai la password principale di Google.

Inserisci soltanto nel file ignorato `.selfhost/runtime.env`:

```dotenv
MAIL_TRANSPORT=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=casella-del-progetto@gmail.com
SMTP_PASSWORD=password-per-app
MAIL_FROM=PolisRossa <casella-del-progetto@gmail.com>
```

La porta 465 usa TLS fin dall'apertura della connessione. È supportata anche la porta 587, sulla quale il server impone STARTTLS. `SMTP_USER` e l'indirizzo racchiuso in `MAIL_FROM` devono coincidere per questo percorso semplice; il preflight blocca una discordanza. La password per app resta un segreto del gestore temporaneo: non inserirla nel repository, in chat, nei backup distribuiti o negli screenshot e revocala dall'account Google quando cambia il custode.

Il codice privato di accesso iniziale è facoltativo. Può essere utile a un'altra installazione che voglia limitare temporaneamente le registrazioni durante un collaudo ristretto:

```sh
node scripts/selfhost.mjs account-access
```

Il comando salva il testo una sola volta in `.selfhost/private/account-access-code.txt` e inserisce in `runtime.env` soltanto `ACCOUNT_ACCESS_HASH`. Non stampa il codice, non sovrascrive un valore esistente e rifiuta la modalità `mirror`. Quando `ACCOUNT_ACCESS_HASH` è vuoto, la registrazione non mostra né richiede questo campo e resta protetta dai limiti persistenti descritti sotto. Quando l'hash è configurato, il codice serve soltanto a creare un nuovo account; il recupero password resta disponibile senza questa barriera, con i propri limiti. È soltanto un freno riutilizzabile per contenere la quota Gmail: non identifica una persona e non sostituisce conferma email, password, OAuth Facebook, valutazione PR2 o limiti anti-abuso. Se un'installazione che lo usa lo espone, deve richiudere le registrazioni prima di predisporre manualmente un nuovo codice e il relativo hash; il comando non offre una rotazione automatica.

Il mailer attuale invia soltanto conferma dell'indirizzo e recupero della password richiesti dall'utente. Non invia newsletter, annunci, digest o notifiche del forum e non esiste un comando che spedisca a tutti gli account. Per eventuali notifiche future serviranno consenso o scelta esplicita, disiscrizione, gestione dei rimbalzi, limiti e una revisione separata: non vanno riutilizzate implicitamente le email degli account.

Prima dell'invio il server applica in PostgreSQL limiti a finestre fisse: 3 messaggi per destinatario e funzione ogni 15 minuti, 5 consegne per client ogni 15 minuti, 20 messaggi complessivi per finestra oraria e 100 per finestra giornaliera. Conserva soltanto l'impronta SHA-256 normalizzata dell'indirizzo e digest HMAC pseudonimi del client e delle chiavi del limitatore; non inserisce l'IP nei contatori. Un errore del database blocca l'invio; un fallimento SMTP consuma comunque il contatore e non viene ritentato automaticamente. La risposta del sito non attende il server Gmail, ma il job non è una coda durevole: durante il collaudo controlla anche la ricezione reale.

Gmail personale applica inoltre propri limiti anti-abuso; Google documenta una soglia giornaliera, ma può limitare o bloccare gli invii anche in base ad altri segnali. Non è quindi una capacità garantita né una soluzione per invii massivi. Gmail riceve necessariamente indirizzo del destinatario, oggetto, testo e collegamento monouso di conferma o recupero; non riceve la password PolisRossa. Questo fornitore effettivo va indicato nell'informativa dell'istanza prima di aprire gli account. Non configurare più server a spedire gli stessi messaggi. Nessuna email reale viene inviata dai comandi di installazione, preflight e backup: prima di aprire le iscrizioni prova una conferma e un recupero soltanto verso indirizzi autorizzati.

Il gestore può leggere soltanto lo stato aggregato, senza destinatari o segreti:

```sh
node scripts/selfhost.mjs mail-status
```

I contatori si azzerano da soli alla scadenza delle rispettive finestre. Dopo aver chiuso le registrazioni e verificato che un blocco non derivi da un abuso in corso, il gestore può azzerare esclusivamente questi contatori con `node scripts/selfhost.mjs mail-reset`. Il comando non elimina account, sessioni, forum, configurazione o credenziali; non usarlo per aggirare ripetutamente i limiti Gmail.

Il codice conserva l'adattatore Brevo per compatibilità con installazioni esistenti, ma non è il percorso scelto per questo server e non deve essere attivato né acquistato. Il repository non può creare la password per app Gmail o verificarne il funzionamento senza una connessione e un invio reali.

Riferimenti ufficiali: [Google — password per app](https://support.google.com/accounts/answer/185833), [Google — limiti di invio di Gmail](https://support.google.com/mail/answer/22839), [Google Workspace — porte SMTP Gmail](https://support.google.com/a/answer/176600).

## Preparare account, social e forum senza aprirli

Lavora in `.selfhost/runtime.env`, che è escluso da Git e dall'immagine Docker. Non incollare password per app, API key o client secret in chat, issue, commit o schermate pubbliche. Mantieni inizialmente:

```dotenv
REGISTRATIONS_OPEN=false
FORUM_OPEN=false
```

Per rendere operativo l'intero flusso servono dati che il codice non può scegliere al posto del gestore:

1. `APP_URL` deve essere l'origine HTTPS pubblica e stabile definitiva, senza percorso e senza la porta interna `:8443`.
2. `PUBLIC_OPERATOR_NAME` indica il soggetto che esercita temporaneamente la responsabilità operativa; `PUBLIC_PRIVACY_CONTACT` è una casella email funzionante e pubblicata nella pagina Privacy. Questi campi non attribuiscono proprietà politica o diritti di voto.
3. Configura Gmail SMTP con una password per app e verifica in due passaggi, come sopra. Il primo collaudo deve comprendere una conferma e un recupero verso caselle autorizzate. Configura il codice facoltativo con `node scripts/selfhost.mjs account-access` soltanto se vuoi limitare temporaneamente le nuove registrazioni; non abilita né prova notifiche collettive.
4. Facebook OAuth è obbligatorio per inviare una domanda PR2. Crea un'app in Meta for Developers, conserva `FACEBOOK_CLIENT_ID` e `FACEBOOK_CLIENT_SECRET` soltanto nel file privato e registra esattamente `https://DOMINIO/api/identity/callback/facebook`, sostituendo `DOMINIO` con l'host di `APP_URL`. Il solo scope richiesto è `public_profile`; prova il controllo dell'account al momento della domanda, non certifica l'identità civile. Il server deriva il riferimento Facebook dalla risposta autenticata e non accetta al suo posto un link scritto dal candidato. Discord, Instagram e un sito personale non sostituiscono questo passaggio. Collegamento e callback restano disabilitati finché `FORUM_OPEN=false`; lo scollegamento resta disponibile.
5. PR2 richiede tre persone fondatrici distinte, ciascuna con il proprio account PR1 verificato e il proprio account Facebook autenticato. Genera i tre inviti una sola volta:

```sh
node scripts/selfhost.mjs community-invites
```

Il comando salva i codici in `.selfhost/private/community-founder-invites.txt`, con permessi privati dove il sistema li supporta, e inserisce in `runtime.env` soltanto i tre hash SHA-256. Non stampa i codici, non sovrascrive un set esistente e rifiuta la modalità `mirror`. Consegna un codice diverso a ciascuna persona attraverso un canale privato. Se il file viene perso dopo aver configurato gli hash, i codici non sono recuperabili: il comando rifiuta di sostituirli silenziosamente. Dopo l'uso dei tre inviti, conserva il file fuori linea o eliminalo secondo la procedura concordata; gli hash non consentono di ricostruire i codici.

Controlla quindi la configurazione statica:

```sh
node scripts/selfhost.mjs preflight
```

Il preflight mostra soltanto esiti, nomi dei requisiti e URL di callback; non mostra credenziali. Termina con codice `2` finché mancano origine pubblica, contatti, posta o tre hash distinti corrispondenti al file privato degli inviti. Il codice account non è un requisito: se `ACCOUNT_ACCESS_HASH` è vuoto il controllo indica che la barriera è disattivata; se l'hash è presente, il file privato deve esistere e corrispondere. Se `FORUM_OPEN=true`, client ID e client secret Facebook diventano entrambi obbligatori; una coppia incompleta è sempre un errore. Il controllo non contatta Gmail, Meta o il database: un esito positivo significa “configurazione completa”, non “servizi collaudati”. Se un file privato richiesto manca o non coincide con gli hash, il controllo resta bloccante e non modifica i file.

Il processo applicativo elimina le domande PR2 rimaste scadute per 30 giorni e quelle respinte da 30 giorni, insieme a voti ed elettorato di ammissione collegati. Elimina inoltre sessioni e token di verifica scaduti, contatori tecnici più vecchi di 24 ore e sessioni legacy prive di credenziale email/password, senza cancellare i relativi utenti o dati applicativi. Un account `credential` mai verificato da più di sette giorni viene eliminato soltanto se non ha sessioni, dati personali o un collegamento social; questo limita anche la crescita prodotta da registrazioni la cui email è stata negata per quota. Un grant/account Facebook locale non consumato viene rimosso dopo 24 ore. I controlli partono a ogni avvio e poi ogni 24 ore, quindi la cancellazione può completarsi entro il giorno successivo alla soglia; nei log compaiono soltanto conteggi. Gli eventi tecnici del forum conservano identificativi opachi. Verifica i messaggi `Forum application retention completed` e `Authentication retention completed` e includi nei tempi pubblicati anche la rotazione dei backup cifrati, perché una copia precedente non viene modificata dal processo in esecuzione.

## Collaudo e apertura graduale

Riavvia sempre dopo una modifica a `runtime.env`. Prima prova con accesso pubblico non ancora annunciato e con il forum chiuso:

1. abilita temporaneamente `REGISTRATIONS_OPEN=true`, riavvia e crea un account PR1 con email e password, senza codice se `ACCOUNT_ACCESS_HASH` è vuoto;
2. verifica ricezione e scadenza della conferma email, uscita e nuovo accesso, recupero password senza codice iniziale e revoca delle sessioni precedenti; se hai configurato la barriera facoltativa, verifica il codice su una nuova registrazione senza confonderlo con una prova d'identità;
3. verifica che con `FORUM_OPEN=false` collegamento e callback Facebook siano indisponibili ma un collegamento precedente possa essere rimosso; se hai configurato Facebook, apri poi il forum e da una sessione PR1 appena autenticata prova collegamento e callback definitivo, compresi rifiuto dell'autorizzazione e sessione scaduta. Verifica anche che Facebook non possa essere usato come accesso PR1 diretto;
4. verifica salvataggi e posizione di lettura da due browser, poi un riavvio del container;
5. configura Facebook, abilita `FORUM_OPEN=true` e prova entrambi i percorsi della prima registrazione. La scelta PR2 deve creare soltanto PR1 e guidare, dopo conferma e accesso, alla pagina Partecipa. Verifica che il modulo resti bloccato prima dell'OAuth, che l'utente debba premere esplicitamente “Invia”, che la pratica diventi `pending` e non `active`, che il riferimento salvato derivi da Facebook e che il grant locale sia rimosso dopo l'invio. Per le tre persone fondatrici usa un invito diverso per ciascuna; un errore dopo lo scollegamento deve richiedere un nuovo collegamento senza inventare una domanda riuscita;
6. con un account PR1 non ammesso verifica che scrittura, chat e voto siano rifiutati; con i tre PR2 verifica discussione pubblica e privata, proposta, voto, esportazione e persistenza dopo riavvio;
7. ripeti backup cifrato e ripristino separato dopo aver creato questi dati di collaudo.

Solo dopo questi risultati lascia entrambi i flag a `true` e verifica da una rete esterna `/healthz`, `/api/service-info`, registrazione, accesso, forum e invio email. Per richiudere immediatamente senza cancellare account o discussioni, rimetti entrambi i flag a `false` e riavvia; per interrompere anche la consultazione pubblica disattiva inoltre il tunnel o l'ingresso scelto. Non cancellare volumi e non rigenerare `AUTH_SECRET`, altrimenti le sessioni e i token OAuth cifrati esistenti non restano utilizzabili.
