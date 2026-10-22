# Piano esecutivo: da applicazione PolisRossa a rete AgoràNode su PC dei collaboratori

**Proposta, 22 ottobre 2026.** Questa roadmap non certifica attività in produzione. I test citati sotto sono **condizioni future di chiusura**, salvo evidenza esplicita in [QUALITY.md](QUALITY.md). Non sostituisce [DISTRIBUTED-NETWORK.md](DISTRIBUTED-NETWORK.md), ma stabilisce ordine, dipendenze e interventi reali su questo repository.

## Vincoli di migrazione

- `main`, i dati in PostgreSQL e gli identificatori legacy di PolisRossa rimangono intatti fino a prova di migrazione e restore. Ogni modifica operativa avviene su branch e con test regressivi.
- Nessun nuovo servizio obbligatorio commerciale, token, mining, Proof-of-Work o Proof-of-Stake.
- L'interfaccia è **un motore comune**: il portale `/` trova gli spazi; `/agora` è il nodo tecnologico; `/polisrossa` è uno spazio distinto. Un nuovo tema richiede configurazione e seed, non un fork del frontend.
- Ospitare il servizio non attribuisce voto, moderazione, copyright, proprietà o mandato politico.
- La classe `public-verified` è l'unica candidata alla replica indiscriminata; le altre richiedono isolamento e autorizzazioni.
- Non esporre configurazioni di consenso, peer bootstrap, IP pubblici, API amministrative o credenziali prima di un collaudo autorizzato.
- Non trasformare obiettivi in stati «implementato» per il solo fatto che esistono tipi o documenti.

## Stato iniziale rilevato

| Area | Evidenza nel repository | Limite attuale |
| --- | --- | --- |
| UI e istanze | React, Vite, `app/platform/agora-node-manifest.ts`; portale e pagine Agorà/PolisRossa | L'istanza di default è fissata a PolisRossa, Agorà non ha il set di moduli completo |
| Contenuti | `server/knowledge.ts` e moduli di import/export | Deposito pubblico limitato alla knowledge base importata; forum/dati statistici non inclusi |
| Replica | `server/knowledge-replica-agent.ts`, validazione firme e bundle | Pacchetti completi via filesystem; non peer discovery e sincronizzazione incrementale |
| Consenso | `server/knowledge-replication-finality.ts` | Certificato statico e test locali, non BFT di rete |
| Chat | `server/live-chat.ts` e polling nel componente React | RAM di un processo, stanze limitate e retention best-effort |
| Account/comunità | Better Auth, PostgreSQL, `app/lib/forum.ts` | Flussi locali/non pienamente collaudati fuori rete; nessun failover delle identità |
| Accesso pubblico | Caddy, Tailscale Funnel, Worker opzionale | Origine sostituibile solo attraverso lavoro manuale; nessun ingresso distribuito verificato |

## Traguardo 0 — Contratti e stato onesto (questa PR)

**Obiettivo:** riconoscere Agorà come comunità distinta e rendere espliciti i confini di rete.

- [x] Manifesto `app/instances/agora.ts` con tutte le capacità **planned**, senza fingere che il forum esista.
- [x] Registro allowlisted `app/instances/registry.ts`; directory del portale e endpoint `GET /api/nodes` leggono gli stessi dati.
- [x] Endpoint `GET /api/instance?id=agora` mantenendo `GET /api/instance` di PolisRossa per compatibilità.
- [x] Classificazione della destinazione dei dati `app/platform/data-placement.ts`: **solo modello di policy**, senza integrazione nel trasporto.
- [x] Test di contratto per ID, capacità, endpoint, classi e fallback.
- [x] Specifica coerente per indipendenza operativa, separazione peer/spazio, voto e privacy.

**Non incluso:** secondo backend tematico, registrazione Agorà, replica P2P o enforcement automatico della data policy.

## Traguardo 1 — Due spazi reali sullo stesso motore

**Prerequisito di ogni futura rete.** Oggi `/agora` è una preview diversa, non una seconda copia funzionante di tutti i moduli.

Attività:
1. Spostare cataloghi, etichette, fonti, libreria e layout specifici da `app/components/AggregatorApp.tsx` e `app/data/` in adapter tipizzati per spazio, preservando tutti gli ID polisrossa.
2. Introdurre una factory runtime `createSpaceRuntime(spaceId, database, services)`: nessuna query forum, lettura privata, feed o account usa uno spazio implicito.
3. Effettuare routing applicativo e API per spazio con una policy di autorizzazione verificata lato server. Il parametro URL non deve essere una fonte di fiducia per i permessi.
4. Implementare un archivio/database **separato per spazio in produzione**, con migrazioni, seed e rotte per Agorà. Aggiungere una superficie condivisa di wiki, news, biblioteca, cronologia, dati, forum e chat; i moduli non attivi mostrano uno stato esplicito.
5. Collegare il nodo Agorà al tema tecnologia, documentazione, feed e forum propri, senza usare la bacheca federale come se fosse la sua assemblea.

**Prove di uscita:** avvio di due spazi con dati e sessioni isolati; scritture inter-spazio negate; test di URL storici; creazione di terzo spazio sintetico *senza modificare componenti React*. Una sessione PR2 PolisRossa non attribuisce PR2 Agorà.

## Traguardo 2 — Eventi pubblici e replica incrementale, senza rete

1. Congelare e testare vettori canonical JSON, hash, namespace di firma, versioni e compatibilità dei bundle esistenti.
2. Progettare `SignedEvent`, `ContentBlock` e manifesti/checkpoint versionati con campi obbligatori, limiti di dimensione e politiche di conservazione; nessun elemento privato nel payload pubblico.
3. Passare da bundle completo a pacchetti incrementali di blocchi mancanti; costruire Merkle roots, prove, snapshot e indice ricostruibile.
4. Rendere verificabili provenienza, diritti della specifica edizione, autore e autorizzazione della pubblicazione, mai derivati dal solo hash.
5. Rendere idempotenti replay, ordine, crash, ripartenza, pacchetto parziale, hash errato, dischi saturi e versione sconosciuta.

**Prove:** due database indipendenti si ricostruiscono da bootstrap + eventi incrementali, producono lo stesso stato pubblico, senza copiare una singola tabella privata. I bundle v1 rimangono leggibili come bootstrap.

## Traguardo 3 — Trasporto fra computer reali

1. Aggiungere un demone P2P separabile dall'API HTTP, con peer identity, autenticazione mutua e canali libp2p.
2. Offrire invito firmato/manuale; bootstrap con più custodi; LAN mDNS; relays indipendenti; discovery DHT *non autorevole*.
3. Applicare limiti di banda, CPU, connessioni, disco e richieste per peer; proteggere la macchina volontaria e non esporre automaticamente porte pericolose.
4. Implementare pull incrementale per spazio con verifica ogni blocco e snapshot atomici, senza avviare ancora le scritture BFT.
5. Un client locale mostra esattamente che cosa condivide, esclude e quale spazio ospita.

**Prove:** tre PC amministrati da persone differenti su LAN, NAT, IPv6 e CGNAT; arresti e riavvii; nessuna dipendenza da una singola directory Syncthing; nessuna credenziale privata attraversa il trasporto.

## Traguardo 4 — Gateway multipli e spegnimento del server originario

- Servire le stesse pagine pubbliche da due o più gateway su reti diverse, leggendo la stessa testa pubblica verificata.
- Pubblicare un bootstrap firmato indipendente dai DNS dei fondatori e almeno un percorso manuale di recupero.
- Separare il download della release, il suo controllo e l'attivazione; rollback compatibile e build riproducibili come obiettivo.
- Introdurre diagnostica, metriche e policy di logging rispettose della privacy.
- **Demo vincolante:** scollegare il PC originario e mostrare da un dispositivo esterno che si può ancora leggere il patrimonio pubblico dall'altro gateway.

**Non implica:** failover degli account privati o possibilità di firmare decisioni nuove senza quorum.

## Traguardo 5 — Protocollo di consenso e governance distribuita

1. Selezionare un protocollo BFT esistente e un modello di guasto, senza inventare una blockchain da zero; integrare state machine deterministica.
2. Rendere verificabile il passaggio fra consenso politico e ordinamento tecnico: due certificati diversi, entrambi richiesti dove applicabile.
3. Gestire rotazione/espulsione dei finalizzatori, leader/view change, doppia firma, partizioni, ripartenza, replay e versione.
4. Migrare schema dei voti locali e federali con condizioni esplicite, distinguendo l'elettorato dinamico del forum odierno da quello congelato della governance federale.
5. Pubblicare report di minacce, audit esterno e simulazioni.

**Prove:** quattro finalizzatori su reti indipendenti (soglia 3); dopo la perdita del quorum nessuna nuova testa diventa finale, ma le letture continuano. La sottrazione o revoca di una chiave non permette promozioni automatiche. Nessuna macchina ottiene diritto di voto in virtù della potenza di calcolo.

## Traguardo 6 — Wiki, feed, social e stanze

- **Wiki:** editing condiviso e offline delle bozze; dopo discussione e decisione locale, nuova revisione immutabile con provenance; possibilità di correggere errori senza modificare falsamente la storia.
- **RSS:** acquisizione per fonte con scheduler/coda, controlli su timeout/duplicati, metadati e diritti; i peer replicano solo ciò che è legittimamente redistribuibile.
- **Forum/social:** eventi firmati e moderabili, sincronizzazione per spazio, blocco di utenti abusivi, deduplicazione, tombstone e cancellazioni applicabili; retention differente da wiki.
- **Chat:** protocolli di stanza dedicati (valutare Matrix), cifratura E2E per stanze riservate, accesso dei membri e reset coerente con le promesse del prodotto; **non** archiviarla automaticamente nel log perpetuo.
- **Notifiche e ricerca:** indici locali ricostruibili, preferenze private, anti-spam e filtro per nodo; non richiedere consenso BFT per ogni messaggio.
- **Mobile:** esperienza browser/PWA e notifiche con provider sostituibili; un browser non diventa automaticamente peer di storage persistente.

**Prove:** due utenti possono scrivere offline e sincronizzare senza perdita di provenienza; la replica di un forum privato è respinta da peer non autorizzati; dati eliminati non vengono riserviti nella replica pubblica come contenuti immutabili.

## Traguardo 7 — Identità portabile e operazioni gestite in comune

- Attestazioni membro firmate e verificabili per spazio, chiavi sul dispositivo, recovery sociale o a soglia, revoca, multi-dispositivo, procedure contro identità duplicate e coercizione.
- Recovery di account privati con backup cifrati presso custodi autorizzati, distinto dalla replica della knowledge base.
- Installer con verifica di firma e aggiornamenti sicuri per Windows, Linux e macOS; comandi semplici per entrare/uscire da un peer, limiti risorse e diagnostica.
- Mirror indipendenti del codice, più amministratori del repository, dominio e chiavi non controllati da una sola persona; prove di perdita di account GitHub, email, DNS, gateway e di ripristino di un peer.
- Analisi GDPR, diritti d'autore, moderazione, protezione dei minori, notifiche di sicurezza e condizioni per essere custode.

**Prove:** installazione di una copia pubblica senza account commerciale obbligatorio; recupero autenticato di dati privati senza renderli pubblici; nessun singolo soggetto può impedire l'installazione di una release verificata già distribuita.

## Come lavorare senza compromettere il patrimonio esistente

Per ogni PR:
1. Modifica un ambito delimitato, scrivi un test di fallimento prima del codice quando possibile.
2. Esegui `npm test`, `npm run typecheck` e `npm run build`; per cambi frontend verifica tastiera, smartphone e lingua.
3. Per le migrazioni: backup cifrato, restore in sandbox, test degli URL e degli ID legacy; rollback soltanto quando sicuro.
4. Aggiorna [QUALITY.md](QUALITY.md) con evidenze reali, non percentuali narrative.
5. Tieni disabilitati in produzione gateway P2P, consenso e scritture distribuite fino a threat model, test multi-host, audit e decisione comunitaria.

**Ordine critico:** multispazio reale → formato incrementale → trasporto verificato → gateway → consenso → social/chat/identità. I prototipi di UX possono procedere in parallelo, ma non devono essere descritti come infrastruttura già decentralizzata.

## Gate trasversale: affidabilità della conoscenza e prevenzione della cattura

Prima del primo wiki pubblico, completare [EDITORIAL-GOVERNANCE.md](EDITORIAL-GOVERNANCE.md) con ruoli, permessi, selezione delle fonti, gestione di conflitti e licenze, senza far diventare maggioritario il giudizio su un fatto. Prima del primo governo federale vincolante, risolvere la segretezza/opacità delle schede e la differenza fra elettorato locale dinamico e federale congelato. Prima del primo social federato, progettare feed trasparente, protezione del grafo privato, blocchi, ricorsi e rimedi a propaganda coordinata. Test di attacco e criteri sono in [CRITICAL-DESIGN-REVIEW.md](CRITICAL-DESIGN-REVIEW.md).

## Prototipi nel ramo di lavoro successivo

Uno scambio read-only su HTTPS di pacchetti pubblici firmati è aggiunto in `server/public-peer-transport.ts` e descritto in [PEER-EXCHANGE.md](PEER-EXCHANGE.md). Non copre discovery libp2p, trasporto peer con identità mutua a livello rete, consensus BFT, repliche incrementali o failover. `app/components/SharedSpaceModules.tsx` usa il medesimo renderer dei sette moduli per Agorà e PolisRossa, ma non rende identiche tutte le funzionalità né attiva backend e database del nodo Agorà. `server/space-databases.ts` introduce un controllo fail-closed sui database configurati: la separazione reale degli account richiede ancora istanze applicative e permessi diversi. Nessun traguardo sopra può considerarsi superato soltanto perché questi prototipi compilano.
