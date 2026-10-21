# Replica automatica del patrimonio pubblico

Questo componente realizza un primo percorso **locale e verificabile** per
replicare fra database distinti soltanto il patrimonio pubblico. Non replica
account, email, sessioni, identità sociali, forum, credenziali o segreti e non
trasforma chi ospita un computer in elettore. Non è ancora una rete pubblica
collaudata né un sistema di failover del dominio.

«Non replica il forum» significa che non trasferisce account, profili,
messaggi, voti o altre tabelle del forum. Una revisione può conservare soltanto
`forumTopicId` e `forumTopicUrl` pubblici nella propria provenienza: sono
riferimenti verificabili alla decisione che ne ha autorizzato la pubblicazione,
non una copia del forum né un’identità privata.

## Confini e finalità

Ogni pacchetto appartiene a una coppia `networkId` / `spaceId`: PolisRossa e
un’altra istanza non possono condividere per errore testa, autorità o
cronologia. Il bundle porta tutte le revisioni append-only e un puntatore
corrente per ogni entità. Prima dell’import vengono ricalcolati il digest
canonico del bundle, gli indirizzi di entità, revisioni, fonti, collegamenti,
relazioni, licenze e provenienza. Una cronologia mancante, biforcata, arretrata
o alterata viene rifiutata prima di avanzare la testa locale.

Il certificato tecnico usa un insieme congelato di `3f+1` validatori Ed25519 e
richiede almeno `2f+1` firme distinte. Lega rete, istanza, sequenza, checkpoint
precedente e digest del bundle. Serve a stabilire quale pacchetto è finale; non
sostituisce il voto politico. La sequenza zero può usare esclusivamente
l’autorizzazione esplicita `legacy-bootstrap` per importare il patrimonio già
revisionato nel repository. Le sequenze successive richiedono il digest di una
decisione di governo e un verificatore politico configurato; in sua assenza
l’agente fallisce chiuso.

I file finali terminano in `.knowledge-final.json`. L’agente ignora i file
temporanei, accetta soltanto JSON canonico con nome coerente, importa in una
transazione PostgreSQL e registra una ricevuta persistente. Un riavvio o la
ricezione ripetuta dello stesso file è idempotente. Un pacchetto concorrente
alla stessa altezza, un salto o un predecessore diverso vengono rifiutati.

## Agente filesystem

Il comando compilato è `build-node/knowledge-replica-agent.mjs`; durante lo
sviluppo si può usare `npm run knowledge:replica -- --once`. Richiede:

- `DATABASE_URL` del database replica;
- `KNOWLEDGE_REPLICA_INBOX`, cartella osservata;
- `KNOWLEDGE_REPLICA_OUTBOX`, facoltativa, per rilanciare soltanto pacchetti
  già verificati;
- `KNOWLEDGE_REPLICA_VALIDATOR_SET`, file JSON pubblico con il set Ed25519
  congelato;
- `KNOWLEDGE_REPLICA_NETWORK_ID` e `KNOWLEDGE_REPLICA_SPACE_ID`;
- `KNOWLEDGE_REPLICA_ALLOW_LEGACY_BOOTSTRAP=true` soltanto per una nuova
  replica che deve accettare la sequenza zero già verificata indipendentemente.

Il file del set validatori è una radice di fiducia e va confrontato tramite un
canale indipendente prima del primo avvio. L’agente non scarica URL, non apre
porte e non legge la configurazione privata dell’applicazione.

Il comando autonomo configura intenzionalmente soltanto il bootstrap. Per le
sequenze governate successive, il server deve istanziare l’agente tramite la
sua API e fornirgli l’adapter che verifica la decisione politica e le relative
schede firmate. Fino a quel collegamento operativo, il comando rifiuta tali
pacchetti invece di fidarsi del solo digest dichiarato.

## Trasporto Syncthing opzionale

`deploy/replication/compose.syncthing.yaml` fissa l’immagine
`syncthing/syncthing:2.1.5`. È un overlay separato: il normale `selfhost start`
non lo avvia. La GUI viene pubblicata soltanto su `127.0.0.1:8384`; nessuna
porta di sincronizzazione o del router è aperta per impostazione predefinita.
La sola cartella scambiata è
`.selfhost/public-replication/exchange`. Configurazione e chiave privata del
dispositivo restano nel volume Docker `syncthing-public-config` e non devono
essere aggiunte a quella cartella.

Avvio manuale, dopo aver letto la configurazione:

```powershell
docker compose -f deploy/replication/compose.syncthing.yaml --profile public-replication up -d
```

Nella GUI va aggiunta esclusivamente `/var/syncthing/AgoràNode`, con cartelle
distinte per istanza. Global discovery e relay possono aiutare due computer
senza inoltri WAN, ma rivelano metadati come Device ID e indirizzo IP ai servizi
usati; possono essere disattivati o sostituiti da servizi propri. Il traffico
fra dispositivi è cifrato e il relay non decide quali pacchetti siano validi:
anche un file ricevuto da un dispositivo autorizzato deve superare digest,
catena e certificato `2f+1`. Verificare inoltre nella GUI che segnalazione
d’uso e aggiornamento automatico rispettino la politica del nodo; questo
overlay non li presume attivi.

Non sincronizzare mai `.selfhost/runtime.env`, backup, volumi PostgreSQL,
chiavi age, token, cookie o cartelle di account. Per arrestare il solo
trasporto senza toccare database o sito:

```powershell
docker compose -f deploy/replication/compose.syncthing.yaml --profile public-replication stop
```
