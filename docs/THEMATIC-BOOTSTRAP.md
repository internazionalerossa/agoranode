# Installare un nodo tematico di consultazione

**Stato: bootstrap pubblico read-only realmente eseguibile. Non è ancora un nodo con account, PR2, forum, wiki collaborativa, database isolato o consenso di rete.**

PolisRossa è la prima implementazione alpha. I nuovi nodi possono utilizzare il frontend React comune su `/n/<slug>` con un manifesto pubblico installato manualmente dall'operatore, senza creare un fork di AgoraNode.

## Dall'editor visuale alla pagina pubblica

Il curatore apre il **Node Studio** di Agorà, crea una bozza tematica, aggiunge blocchi (capitoli, paragrafi, timeline, fonti, biblioteca, video e dati) e verifica l'anteprima. Le fonti RSS possono essere registrate come riferimenti, **non** vengono automaticamente acquisite o ripubblicate. La bozza rimane privata finché l'operatore non ne controlla qualità, diritto alla diffusione, link e dati personali, quindi decide di installarla. Il salvataggio PR1 non equivale a pubblicazione.

Esempio su Linux, in una copia AgoràNode installata con `npm ci`:

```bash
mkdir -p /srv/agoranode/public-spaces
npm run space:install -- --confirm-public-readonly ./bozza-agoranode-storia-locale.json /srv/agoranode/public-spaces
```

Impostare sul **server**, non nel browser:

```text
AGORANODE_PUBLIC_SPACES_DIRECTORY=/srv/agoranode/public-spaces
```

Riavviare il server se è necessario caricare le nuove variabili. L'indice `GET /api/public-spaces` elenca i manifesti pubblici locali; `GET /api/public-spaces/storia-locale` restituisce soltanto il manifesto validato; `/n/storia-locale` apre il frontend tematico. La homepage mostra gli spazi installati.

L'installazione è atomica e **non sovrascrive** un manifesto già esistente: gli aggiornamenti richiederanno una procedura versionata. La cartella deve contenere soltanto dati esplicitamente pubblici; mai credenziali, account, chat private o libri non redistribuibili. Il server applica allowlist dei percorsi, dimensione massima e controllo contro symlink.

## Capacità e confini

| Funzione | Stato |
| --- | --- |
| Pagina pubblica generica, navigazione, tema, testi e fonti | **Operativa per manifesti installati** |
| Ricerca locale nei blocchi del manifesto | **Operativa nell'anteprima** |
| Elenco dinamico nel portale AgoràNode | **Operativo con configurazione locale** |
| Ingestion RSS, wiki revisionata e biblioteca di file | **Da integrare nel runtime multi-nodo** |
| Account PR1, primi PR2, forum, votazioni e autorizzazione di pubblicazione | **Non attivi per questi nuovi nodi** |
| Database realmente isolati per tutti gli endpoint | **Non ancora collegati** |
| Replica BFT, discovery P2P e failover | **Non realizzati da questo bootstrap** |

Un host tecnico non acquisisce alcun voto per il solo fatto di aver pubblicato un manifesto. La creazione di un nodo completo richiede una migrazione esplicita a database e ruoli per nodo, verifica della governance PR2, moderazione e collaudo degli accessi. Vedere [ALPHA-BASELINE.md](ALPHA-BASELINE.md), [NODE-KNOWLEDGE-GRAPH.md](NODE-KNOWLEDGE-GRAPH.md), [DECENTRALIZATION-ROADMAP.md](DECENTRALIZATION-ROADMAP.md).



## PostgreSQL indipendente: sola lettura della conoscenza pubblica

È possibile configurare opzionalmente, **solo nel processo backend**, una connessione PostgreSQL distinta per ciascun nodo installato. Esempio con valori fittizi, da custodire in un file di configurazione segreto:

```text
AGORANODE_PUBLIC_SPACE_DATABASES_JSON=[{"spaceId":"storia-locale","connectionString":"postgresql://USER:PASSWORD@localhost:5432/storia_locale"}]
```

Il database deve essere già predisposto con lo schema delle revisioni pubbliche e con i contenuti autorizzati. Prima del collegamento eseguire le migrazioni necessarie in un ambiente isolato, verificando che non puntino al database PolisRossa. Il server apre **al massimo due connessioni** per ciascun pool pubblico aggiuntivo e rifiuta target di database duplicati tramite il registry. Le impostazioni segrete non vengono serializzate nelle risposte HTTP.

Quando è configurato questo database, `GET /api/public-spaces/storia-locale/search?q=...` cerca le pagine pubbliche per titolo e descrizione e `GET /api/public-spaces/storia-locale/knowledge?kind=wiki&id=...` espone una pagina enciclopedica pubblicata, le sue fonti e fino a 100 hash delle revisioni. Il sito `/n/storia-locale` mostra i risultati e le pagine collegate con URL condivisibili. Tutte le query sono limitate dal `spaceId` selezionato **dal server**; il browser non può scegliere il database e non vengono esposte API di scrittura.

Questo **non crea automaticamente una banca dati wiki completa**; serve un import approvato, ruoli PostgreSQL con privilegi minimi, backup separati e test reali cross-tenant. In assenza di DB o manifesti approvati gli endpoint restituiscono 404 o 503, non dati di altri spazi.
