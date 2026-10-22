# Revisione di sicurezza parziale — 22 ottobre 2026

**Classificazione: engineering security review limitata; NON è una certificazione, un penetration test esterno, una revisione formale della crittografia né un audit di ogni riga del repository.**

## Perimetro effettivamente ispezionato

- Confine fra routing SPA, directory e manifesti di Agorà e PolisRossa: `web/main.tsx`, `app/lib/site-routing.ts`, `app/instances/registry.ts`, `app/components/SharedSpaceModules.tsx`.
- Confine delle API e runtime unico: `server/index.ts`, `server/api.ts`, `server/config.ts`, `server/pool.ts`.
- Import di pacchetti pubblici firmati e nuovo trasporto: `server/knowledge-replica-agent.ts`, `server/knowledge-replication-finality.ts`, `server/public-peer-transport.ts`, `server/public-peer-cli.ts`.
- Separazione della configurazione di database: `server/space-databases.ts`.
- Dipendenze e stato documentato di autenticazione, wiki, social e chat: `docs/ARCHITECTURE.md`, `docs/QUALITY.md`, `docs/CRITICAL-DESIGN-REVIEW.md` e relativi entrypoint.

Non sono stati ispezionati riga per riga tutti i cataloghi, le ~migliaia di righe CSS, tutte le query SQL, le dipendenze transitive, le immagini, tutti i middleware o le configurazioni delle macchine dei custodi. Non sono stati eseguiti fuzzing esterno, bug bounty, prove di downtime su reti geografiche, verifica crittografica di un algoritmo BFT o assessment legale/di privacy certificato.

## Rischi e stato

| ID | Gravità | Condizione osservata | Azione consigliata |
| --- | --- | --- | --- |
| S-01 | **Bloccante per produzione federata** | Le firme `2f+1` verificano pacchetti, ma nessun consenso BFT in rete garantisce ordine e sicurezza fra host maliziosi | Protocollo BFT auditato; test di partizioni, equivocation, view change, recovery e membership |
| S-02 | **Bloccante per identità federata** | Sessioni e membership locali non sono portabili, dipendenze SMTP/OAuth ancora operative | Protocollo di recovery e attestazione per nodo, mitigazioni Sybil, backup cifrati autorizzati |
| S-03 | **Alta** | Backend di produzione ancora legato prevalentemente a PolisRossa; il registry delle connessioni DB non è integrato in ogni endpoint | Separare runtime e pool per comunità; test cross-space negativi con database e credenziali diverse |
| S-04 | **Alta** | Chat in RAM e forum in un PostgreSQL originario non hanno autenticazione/replica social end-to-end | Protocollo dedicato, moderazione, retention E2E, conflitti e test di autorizzazione |
| S-05 | **Alta** | Un gateway e un dominio possono restare singoli punti di guasto nonostante copie pubbliche | Gateway HTTPS indipendenti e recovery manuale autenticato |
| S-06 | **Alta** | URL dei peer configurati manualmente: un operatore può sbagliare peer o proxy TLS; rete non scopre automaticamente custodi | Validazione degli ID, TLS rigoroso, pin trust root out-of-band e future multiple bootstrap |
| S-07 | **Media** | Nuovo server di exchange ha payload, elenco, path e signature checks ma non anti-DoS di rete oltre timeout/dimensioni; verifica pacchetti ripetuta per l'indice | Rate-limit esterno, quote, osservabilità, test di carico e CPU |
| S-08 | **Alta** | Open wiki editing e contenuti politici/sensibili in replica permanente possono rendere impossibili rettifiche e rimozioni | Protocolli di diritti, moderazione, retention e analisi dati prima di apertura |
| S-09 | **Alta** | Quorum e voto nominativo non risolvono coercizione, identità duplicate e segretezza | Revisione formale del voto prima di uso federale vincolante |
| S-10 | **Media** | Build e test su CI non provano la correttezza delle dipendenze né l'integrità del runtime ospitato da terzi | Lockfile, SBOM, dependency audit, provenance e firma release verificabile |
| S-12 | **Alta** | La CLI del peer non possiede oggi un verificatore completo dei certificati politici per i checkpoint successivi al bootstrap e fallisce in modalità chiusa | Collegare un verificatore di governance controllato indipendentemente prima di propagare aggiornamenti post-bootstrap |
| S-11 | **Alta** | Il controllo della separazione DB identifica target host/port/nome, non dimostra che DNS diversi non puntino allo stesso cluster | Ruoli e database realmente distinti, introspezione `current_database()`/`current_user` e credenziali scoped, test cross-tenant reali |

## Misure aggiunte in questa revisione

- Il server peer è **opt-in**, risponde soltanto a GET di pacchetti pubblici firmati, ascolta loopback e non legge direttamente il database privato.
- All'operatore è richiesto un proxy HTTPS per la connessione tra host; i client non accettano redirect o HTTP remoto.
- Nomi dei pacchetti, liste e corpi hanno limiti; percorsi malevoli e symlink non possono essere letti attraverso la route.
- I pacchetti sono verificati contro un insieme di chiavi fidate, namespace e digest prima di apparire nell'inbox; l'import nel database esistente continua con verifiche e transazione atomica.
- Il frontend usa un componente comune per presentare le capacità di entrambe le comunità, ma lascia le autorizzazioni al backend.
- Il registry di DB rifiuta target PostgreSQL duplicati e opzioni di connessione che potrebbero aggirare la classificazione.

Queste misure riducono specifici rischi ma **non** provano l'assenza di vulnerabilità.

## Verifiche automatizzate

GitHub Actions su una pull request esegue build, `npm test` e `npm run typecheck`. Test nuovi:
- rendering del modulo condiviso con due manifesti;
- blocco di target DB duplicati, URL non PostgreSQL e opzioni di socket;
- scambio HTTP fra listener e client di test più import su database PGlite distinti;
- rifiuto di percorsi malevoli, symlink, HTTP remoto, indici non validi, namespace non corrispondenti;
- idempotenza del recupero.

I test HTTP usano un listener su loopback nel runner CI: **non equivalgono a una prova fra computer fisicamente indipendenti**. Gli esiti precisi vanno letti nella run CI del commit corrispondente.

## Criteri necessari per una certificazione indipendente

Serve almeno un programma di verifica esterno con: threat model, inventario delle superfici di attacco e trust roots, controllo riga-per-riga dei moduli crittografici e di autorizzazione, test di confidenzialità e cancellazione, fuzzing di parser e protocollo, revisione delle dipendenze e dei segreti, esercizi su almeno tre host indipendenti e rapporto firmato con evidenza riproducibile, limiti e severità delle vulnerabilità. La certificazione può essere dichiarata solo dall'organismo che l'ha effettivamente emessa.

**Non dichiarare il software sicuro o decentralizzato solo perché la suite CI è verde.**


## Rischi residui del prototipo lean storage

I nuovi blocchi `gear32-v1` sono sperimentali: senza un certificato che vincoli il manifesto e i suoi hash al contenuto approvato, **non devono essere distribuiti come nuove revisioni pubbliche finali**. Deduplicare può rivelare la presenza di contenuti noti se applicato a oggetti segreti; quindi la policy del codec accetta solo `public-verified`, ma l'exporter deve comunque autorizzare realmente ogni dato. La verifica del contenuto per SHA-256 non prova verità o diritti. Il client ricontrolla i file locali prima di saltare il download, perciò il risparmio di banda non implica lo stesso risparmio di CPU. I peer di fallback sono URL configurati manualmente, non peer discovery autenticata.
