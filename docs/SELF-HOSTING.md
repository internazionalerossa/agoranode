# Ospitare PolisRossa sul proprio computer

Questa configurazione avvia il server Node, PostgreSQL 17 e un proxy HTTPS Caddy. Non richiede Render, Supabase o Brevo. Servono Node.js 24 e Docker con Compose sul computer che ospiterà il sito. Non basta aprire una pagina web per installarla. Il PC deve restare acceso, con Docker avviato e senza sospensione.

## Stato e confini

Il pacchetto distingue un'istanza principale da una copia pubblica indipendente. Non implementa ancora un cluster P2P, la replica continua del forum, il passaggio automatico del database fra computer o la cifratura end-to-end della chat. I backup cifrati non sono server di riserva già pronti a prendere il controllo. Il funzionamento completo dei container deve essere collaudato sul computer ospitante; i test del codice non lo sostituiscono.

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

PostgreSQL non apre porte TCP: app e backup lo raggiungono attraverso un socket Unix condiviso sullo stesso host, con password. Le connessioni a database remoti continuano a richiedere TLS verificato. Gli amministratori del computer principale possono comunque leggere dati e segreti: il socket non promette protezione dal proprietario del sistema.

## Pubblicazione su Internet

Prima di aprire il sito scegli un nome stabile e verifica la raggiungibilità della connessione domestica. Un sottodominio DDNS gratuito può puntare all'IP pubblico, ma non supera il CGNAT dell'operatore. In quel caso serve una diversa connettività o un tunnel con un ingresso pubblico stabile. Non acquistare servizi per tentativi.

Per preparare una nuova installazione con dominio:

```sh
node scripts/selfhost.mjs init https://nome-del-server.example
```

Il comando resta deliberatamente in ascolto sul solo computer. Dopo le verifiche di rete, configura `.selfhost/runtime.env` con `BIND_ADDRESS=0.0.0.0`, `HTTPS_PORT=443` e `HTTP_PORT=80`, e il router/firewall per raggiungere il proxy sulle porte 80 e 443. Non esporre database, cartelle private o porte amministrative. Per un'installazione già inizializzata modifica l'origine `APP_URL` e l'hostname nel Caddyfile senza rigenerare i segreti. Caddy richiede un dominio realmente raggiungibile per ottenere il certificato pubblico. Account e forum restano chiusi fino al collaudo e alla configurazione del gestore.

## Copia pubblica per i volontari

Ogni volontario scarica soltanto il repository e crea una nuova installazione:

```sh
node scripts/selfhost.mjs init https://nome-della-copia.example mirror
node scripts/selfhost.mjs start
```

`MIRROR_MODE=true` forza la chiusura di account, adesioni, API private e invio email anche se altre opzioni sono abilitate per errore. La copia possiede un database separato per il funzionamento locale; non importa account, sessioni, preferiti o forum del servizio principale. Consulta autonomamente le fonti pubbliche. Per aggiornare codice e cataloghi scarica una versione verificata del repository e ripeti `start`.

Una copia pubblica non è la stessa cosa di una replica del database. Non indirizzare l'accesso degli utenti verso mirror non fidati: il loro amministratore può modificare il codice delle pagine. Mantieni l'accesso sul dominio principale verificato. I contenuti di terzi mantengono licenze e limiti di riproduzione; questo pacchetto non autorizza a copiare qualsiasi libro o articolo.

## Backup che i volontari possono conservare senza leggerli

Usiamo il formato age, non un algoritmo crittografico inventato dal progetto. Genera una chiave con age sul dispositivo del custode:

```sh
age-keygen -o chiave-privata-polisrossa.txt
age-keygen -y chiave-privata-polisrossa.txt
```

Conserva la chiave privata fuori dal repository, dal server di backup e dalle cartelle condivise. Il secondo comando mostra soltanto la chiave pubblica che inizia con `age1`: inseriscila in `.selfhost/recipients.txt`. Puoi aggiungere più destinatari, uno per riga: ciascuno potrà decifrare autonomamente il backup. Non è una divisione della chiave fra custodi.

Poi, sul server principale:

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
