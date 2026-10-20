# Ospitare PolisRossa sul proprio computer

Questa configurazione avvia il server Node, PostgreSQL 17 e un proxy HTTPS Caddy. Non richiede Render, Supabase o Brevo. Servono Node.js 24 e Docker con Compose sul computer che ospiterà il sito. Non basta aprire una pagina web per installarla. Il PC deve restare acceso, con Docker avviato e senza sospensione.

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

`node scripts/selfhost.mjs stop` ferma i servizi senza eliminare i dati. `start` li ricrea quando cambia il codice mantenendo i volumi. Non eseguire `docker compose down -v` sull'installazione che vuoi conservare: elimina il database e i certificati.

PostgreSQL non apre porte TCP: app e backup lo raggiungono attraverso un socket Unix condiviso sullo stesso host, con password. Le connessioni a database remoti continuano a richiedere TLS verificato. Gli amministratori del computer ospitante possono comunque leggere dati e segreti: il socket non promette protezione dal proprietario del sistema.

## Nodo locale di sola consultazione

In una seconda cartella o checkout, un volontario può creare un'installazione indipendente senza modificare router, firewall o DNS:

```sh
node scripts/selfhost.mjs init https://localhost:9443 mirror --project polisrossa-node2 --http-port 9080
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

## Pubblicazione diretta su Internet, facoltativa

Questa sezione serve soltanto a chi decide di esporre direttamente una propria installazione. Non è necessaria per usare un nodo locale o verificare un checkpoint.

Prima di aprire il sito scegli un nome stabile e verifica la raggiungibilità della connessione domestica. Un sottodominio DDNS gratuito può puntare all'IP pubblico, ma non supera il CGNAT dell'operatore. In quel caso serve una diversa connettività o un tunnel con un ingresso pubblico stabile. Non acquistare servizi per tentativi.

Per preparare una nuova installazione con dominio:

```sh
node scripts/selfhost.mjs init https://nome-del-server.example
```

Il comando resta deliberatamente in ascolto sul solo computer. Dopo le verifiche di rete, configura `.selfhost/runtime.env` con `BIND_ADDRESS=0.0.0.0`, `HTTPS_PORT=443` e `HTTP_PORT=80`, e il router/firewall per raggiungere il proxy sulle porte 80 e 443. Non esporre database, cartelle private o porte amministrative. Per un'installazione già inizializzata modifica l'origine `APP_URL` e l'hostname nel Caddyfile senza rigenerare i segreti. Caddy richiede un dominio realmente raggiungibile per ottenere il certificato pubblico. Account e forum restano chiusi fino al collaudo e alla configurazione del gestore.

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

## Email gratuita, solo dopo la scelta del gestore

L'impostazione iniziale resta `MAIL_TRANSPORT=none`. L'accesso social richiede una coppia OAuth configurata e il callback sul dominio effettivo. L'account personale e l'ammissione PR2 restano distinti.

L'adattatore SMTP esistente può usare Gmail: `MAIL_TRANSPORT=smtp`, `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER` e `MAIL_FROM` uguali alla casella verificata, `SMTP_PASSWORD` una password per app generata dopo la verifica in due passaggi (se disponibile per quell'account). Inserisci i valori solo in `runtime.env`; non usare la password principale dell'account. Questa modalità abilita anche i flussi di accesso con email della versione compatibile.

La quota di Gmail non è una garanzia di consegna né una capacità prenotata: Google può applicare limiti o blocchi. Il progetto non implementa ancora una coda distribuita, un contatore condiviso dei 500 invii o notifiche email del forum. Non configurare più server a inviare gli stessi messaggi. Nessuna email reale viene inviata dai comandi di installazione e backup; prova un invio soltanto a un indirizzo autorizzato prima di aprire le iscrizioni.
