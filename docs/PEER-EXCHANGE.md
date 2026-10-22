# Scambio diretto della conoscenza pubblica tra computer

**Stato: prototipo opt-in, non una rete distribuita collaudata in produzione.**

Il modulo `server/public-peer-transport.ts` aggiunge uno scambio read-only di pacchetti pubblici già finalizzati con firme valide. Un computer A può offrire i pacchetti, B può scaricarli e passarli all'importatore PostgreSQL esistente. B non si fida dell'URL di A: accetta solo byte canonici, formato supportato, spazio/rete esatti e certificato valido verificato rispetto a un insieme di chiavi installato fuori banda.

Si tratta di un collegamento P2P **diretto con indirizzo già noto**, non di libp2p automatico, DHT, leader election, consenso BFT o federazione del social. Non trasferisce dati personali, password, chat o intere tabelle PostgreSQL.

## Configurazione minima — da usare su installazioni di prova

Sono richiesti i seguenti valori **non segreti** (il file JSON delle chiavi deve provenire da un canale attendibile):

- `KNOWLEDGE_REPLICA_VALIDATOR_SET`: percorso del set di chiavi pubbliche Ed25519 del solo spazio previsto;
- `KNOWLEDGE_REPLICA_NETWORK_ID` e `KNOWLEDGE_REPLICA_SPACE_ID`: identificatori invarianti da confrontare sul ricevente;
- `KNOWLEDGE_REPLICA_ALLOW_LEGACY_BOOTSTRAP=true` soltanto quando si riceve un bootstrap di sequenza zero già revisionato.

Sul computer A, configurare `KNOWLEDGE_REPLICA_OUTBOX` con una **cartella che contiene esclusivamente i pacchetti pubblici già verificati**. Avviare `npm run peer:serve` (oppure `node build-node/public-peer-cli.mjs serve` dopo la build). L'ascolto avviene solo su `127.0.0.1:9393` per impostazione predefinita, configurabile con `AGORANODE_PEER_PORT`. È necessario un proxy HTTPS **gestito esplicitamente dal custode** per essere raggiunti da altri computer. La porta non viene esposta automaticamente all'esterno.

Sul computer B, impostare `KNOWLEDGE_REPLICA_INBOX`, gli stessi ID di rete e spazio, il set di chiavi fidato e `AGORANODE_PEER_ORIGIN=https://peer-esempio.invalid` (sostituire con l'origine reale). Eseguire `npm run peer:pull`, poi `npm run knowledge:replica -- --once` per verificare e importare con transazione atomica nel database locale già predisposto.

Il receiver rifiuta URL HTTP remoti, credenziali nell'URL, query string, redirect, file di nomi inattesi, pacchetti oversized, contenuti con firme insufficienti, namespace di altro nodo e file non canonici. Un'eccezione HTTP verso loopback è disponibile **solo alle funzioni di test**, non dalla CLI di produzione. **Limite attuale della CLI:** non è ancora collegata al verificatore delle autorizzazioni politiche delle revisioni successive al bootstrap: per i pacchetti `governance-decision` la CLI rifiuta l'importazione e la pubblicazione per impostazione predefinita. Un'integrazione futura dovrà fornire un verificatore autonomo delle decisioni, mai un bypass `return true`. L'inbox non fa automaticamente pubblicazione politica o modifica delle revisioni.

I pacchetti sono ancora bundle completi: l'incrementalismo tramite blocchi e Merkle DAG resta nella roadmap. Un peer malevolo può negare disponibilità e scegliere di non servire contenuti; l'integrità non garantisce vivacità o consenso in rete.

## Piano di collaudo fra host fisicamente indipendenti (non eseguito)

1. Prevedere tre macchine A, B e C di amministratori diversi, su reti diverse, con PostgreSQL indipendenti. Non usare dati personali reali.
2. Produrre un pacchetto di conoscenza **sintetica** autorizzato e certificato in un ambiente di test. Non distribuire chiavi private dei validatori.
3. Far servire i file pubblici da A tramite un gateway HTTPS con certificato verificabile. Dal PC B, eseguire `peer:pull`, importare e confrontare digest e cronologia della stessa revisione.
4. Spegnere A; B deve continuare a servire i pacchetti già verificati mediante la propria outbox. C deve riuscire a recuperarli da B e ricostruire il medesimo bundle.
5. Ripetere con pacchetto alterato, certificato con firme insufficienti, namespace errato, contenuto privato inserito per errore, perdita della rete, risposta lenta, dischi pieni, TLS non valido, replay e riavvio del processo.
6. Conservare log sanificati e report con hardware, OS, commit, indirizzi di test, esiti e modalità di errore. Una prova fra due processi o due database sulla stessa macchina non soddisfa questo criterio.

**Non attivare una rete pubblica con scritture distribuite** finché mancano consenso BFT, rotazione chiavi, audit esterno, minacce e capacità reali di risposta agli abusi. La directory locale `GET /api/nodes` non è discovery P2P.

Vedere [PEER-OWNED-ARCHITECTURE.md](PEER-OWNED-ARCHITECTURE.md), [DECENTRALIZATION-ROADMAP.md](DECENTRALIZATION-ROADMAP.md) e [SECURITY-REVIEW.md](SECURITY-REVIEW.md).


## Riduzione della banda e scelta della sorgente

Il client verifica gli oggetti già presenti e non ne riscarica il corpo; una copia locale corrotta richiede quarantena esplicita. Per consentire il ripiego su peer noti indipendenti è disponibile `AGORANODE_PEER_ORIGINS` come elenco di massimo 8 origini HTTPS separate da virgole, in alternativa al singolo `AGORANODE_PEER_ORIGIN`. Tutti gli URL vengono validati prima di contattarli. Il ripiego riguarda il **trasporto dei pacchetti pubblici**, non le sessioni web degli utenti. Il prototipo [Lean Storage](LEAN-STORAGE.md) esplora blocchi riutilizzabili fra revisioni ma non è ancora collegato all'endpoint peer.
