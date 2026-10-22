# AgoraNode — baseline tecnica dell'alpha

**Stato:** baseline ingegneristica del repository, 23 ottobre 2026. Questo documento definisce le scelte attuali e le verifiche necessarie prima di chiamare una funzionalità «operativa». Non è una certificazione di sicurezza e non rappresenta la cronaca di conversazioni private.

## 1. Cosa stiamo costruendo

AgoraNode è un **motore comune** per comunità tematiche autonome. **PolisRossa è l'alpha**: la prima implementazione reale da cui estrarre componenti e contratti, senza azzerarne dati, URL, installazione o licenze. **Agorà** è la comunità tematica sulla tecnologia del progetto, distinta dal portale e dalla governance federale.

Il prodotto non è una blockchain onnivora. Un contenuto pubblico ha identità, fonti, diritto d'uso, revisione e collegamenti. Il suo eventuale inserimento nella timeline è una **scelta narrativa** separata e votata dai PR2 competenti. I dati personali e le conversazioni riservate non entrano nella replica pubblica. Un peer è un computer volontario, non un elettore o un amministratore politico.

La prima versione utile a una nuova comunità deve offrire lo stesso frontend, un backend con confini verificati, ricerca tra contenuti e strumenti di proposta accessibili. Soltanto dopo averlo dimostrato con due community realmente isolate ha senso promuovere a infrastruttura federata le funzionalità oggi collaudate localmente.

## 2. Architettura che preserviamo

| Elemento | Scelta iniziale | Motivazione |
| --- | --- | --- |
| Frontend | React, TypeScript, Vite, componenti comuni + manifesti tematici | Compatibilità col prototipo alpha, possibilità di refactoring graduale e controlli statici |
| Runtime | Node.js modulare, non una costellazione di microservizi | Meno memoria, distribuzione semplice, log e lifecycle comprensibili |
| Persistenza locale | PostgreSQL con database e ruoli per spazio, quando realmente collegati al runtime | Transazioni, integrità, migrazioni e ricostruzione degli indici |
| Conoscenza pubblica | Revisioni append-only con attribuzioni, fonti, hash e selezione corrente | Revisione tracciabile e recupero verificabile |
| Oggetti voluminosi | CAS a blocchi verificati **sperimentale**, con pinning per spazio e limiti | Evitare copie ridondanti, senza imporre ogni file a ogni peer |
| Trasporto attuale | HTTPS fra peer esplicitamente configurati, verifica dei pacchetti firmati | Una primitiva piccola, testabile senza discovery o credenziali di utenti |
| Trasporto futuro | Identità peer, discovery/relay e blocchi incrementali, da selezionare e auditare | Evitare una dipendenza obbligatoria da un solo ingresso |
| Consenso tecnico | Verifica statica di certificati oggi; **nessun BFT network operativo** | Non confondere soglie di firme con consenso distribuito |
| Chat/social | Servizi e retention propri, diversi dal deposito enciclopedico | Latenza, moderazione e privacy non tollerano un log universale immutabile |

**Non introdurre** CockroachDB, Cassandra, Ceph, K3s, Kubernetes, una blockchain general purpose, IPFS, Matrix, NATS o libp2p come prerequisito dell'alpha soltanto perché sono tecnologie disponibili. Raccogliere prima un carico reale, un modello di guasto e benchmark di RAM, CPU, disco, banda, recovery e operazioni. Alcune possono essere validissime in una fase successiva, ma non risolvono da sole la governance politica o le restrizioni dei contenuti.

## 3. Sorgente di verità e sincronizzazione

Tre azioni non equivalgono:

1. **Commit locale:** la modifica è registrata nella transazione del database che la possiede. Un salvataggio privato non diventa pubblico.
2. **Pubblicazione approvata:** una revisione con fonti e diritti validati passa attraverso l'eventuale decisione PR2 e il checkpoint tecnico previsto per quella classe di dati.
3. **Convergenza dei peer:** le macchine autorizzate scoprono il checkpoint e acquisiscono i soli contenuti mancanti, verificandoli prima di promuovere lo stato locale.

L'audit transazionale e il cursore `server/knowledge-delta.ts` sono **locali**. `peer:watch` interroga ogni secondo per impostazione predefinita l'indice HTTPS condizionale dei **pacchetti già finalizzati**. Questo **non garantisce** backup, RPO, disponibilità o visibilità delle scritture entro un secondo.

Il trasferimento v1 usa bundle cumulativi. Il codec `public-blob-cas.ts` produce blocchi riutilizzabili ed è collaudato in test sintetici, ma non è legato al checkpoint v1 né al wire protocol in produzione. Quando un peer è isolato può continuare a servire l'ultima versione pubblica finalizzata, non dichiarare finali nuove decisioni senza l'autorità richiesta.

## 4. Grafo delle pagine e UX da raggiungere

Ogni pagina enciclopedica del nodo deve poter essere trovata tramite ricerca e link; **non ogni pagina deve comparire nella timeline**. La timeline principale non è un indice di parole chiave: presenta brevi testi narrativi collegati a pagine profonde, ordinati cronologicamente e curati per il tema. I PR2 del **singolo nodo competente** possono proporre e deliberare aggiunte, correzioni, esclusioni e testo introduttivo; la verifica delle fonti non si sostituisce con un voto.

La biblioteca deve distinguere *opera*, *edizione*, *licenza*, *file realmente disponibile*, *provenienza*, *checksum* e *peer custode*. La presenza di un URL esterno non implica il diritto a distribuire il file da un computer volontario. Le immagini, i media, i post e le serie statistiche avranno politiche diverse di archiviazione, ricerca e conservazione.

Il wizard PR2 e l'indice locale biblioteca/timeline di PolisRossa sono un **primo livello di UX**, non una pipeline autorizzata di pubblicazione wiki universale. Prima del secondo nodo completo servono navigazione uniforme e API isolate, editor di pagina, diff leggibili, fonte per paragrafo ove appropriato, ricorsi e indicizzazione condivisa tra tutte le classi pubbliche.

## 5. Verifiche di accettazione prima di dichiarare «completo»

| Ambito | Evidenza da richiedere |
| --- | --- |
| Due nodi autonomi | Stesso frontend renderizzato per Agorà e PolisRossa, database e sessioni realmente separati, test cross-space anche con utenti omonimi |
| Wiki e timeline | Proposta → revisione fonti/diritti → voto PR2 valido → revisione pubblicata → ricerca aggiornata; esclusione timeline senza rimozione pagina |
| Biblioteca e media | Download solo delle edizioni redistribuibili, checksum, pinning volontario, quote e ripristino dopo perdita di una replica |
| Peer P2P | Tre host indipendenti sotto amministrazioni/reti diverse, firme, guasti, dischi saturi, NAT, riconnessioni, differenze di versione |
| Consenso | BFT reale revisionato con membership/reconfiguration, view changes, equivocation e partizioni; lettura in assenza di quorum |
| Identità, social e chat | Recovery con chiavi portabili, anti-Sybil, moderazione, retention e cifratura appropriata, senza esfiltrare dati privati |
| Gateway | Spegnimento dell'host fondatore con accesso HTTPS verificabile da gateway terzi, bootstrap e recovery documentati |
| Prestazioni e sicurezza | SLO misurati su hardware reale, test negativi, fuzzing dei formati, threat model e audit indipendente prima dell'apertura vincolante |

Il repository non soddisfa oggi tutte queste condizioni. Un test Node.js su loopback, una firma o una specifica non sono prove di disponibilità su computer indipendenti.

## 6. Come lavorare sulla base consolidata

1. Leggere [README](../README.md), [AGENTS](../AGENTS.md), [QUALITY](QUALITY.md) e [NODE-KNOWLEDGE-GRAPH](NODE-KNOWLEDGE-GRAPH.md) prima del codice pertinente.
2. Formulare un'invariante e un comportamento osservabile; tagliare il problema in una PR piccola con test regressivi e input ostili.
3. Preservare ID, URL e volumi PolisRossa; evitare migrazioni distruttive non provate su backup/restore.
4. Eseguire `npm ci`, `npm run build`, `npm run typecheck`, `npm test` e benchmark mirati. Per UX occorrono anche controlli manuali su mobile, tastiera e ingressi reali.
5. Non assumere «passato in CI» come «collaudato online», «conforme al GDPR» o «certificato».
6. Aggiornare il testo **che descrive lo stato attuale**, non accodare un nuovo changelog narrativo ogni volta. La cronologia dei cambi vive nelle PR e nei commit.

### Merge storici

Le PR **#2, #3, #4 e #5** risultano integrate in `main` con **squash merge**. Questo spiega perché i branch originali possono figurare «diverged» pur contenendo gli stessi file: la cronologia dei loro singoli commit non è ancestry di `main`. **Non ripetere il merge di quei branch** soltanto per farli apparire «merged» nel grafo: si rischia di reintrodurre vecchie modifiche. Prima di ogni nuova fusione confrontare *il contenuto effettivo* e gli esiti CI; un ramo senza commit nuovi non richiede merge.

`mobile-app-completion` risulta dietro a `main` senza commit aggiuntivi rispetto alla base verificata nell'ultima revisione. I branch storici possono essere mantenuti come riferimento, ma la fonte di sviluppo ordinaria è il `main` consolidato.

### Privacy delle discussioni di progetto

Le conversazioni personali integrali e gli appunti riservati **non** vanno committati nel repository pubblico, incluse issue, PR, fixture, log e README. Solo specifiche tecniche selezionate, impersonali e verificabili possono diventare documentazione pubblica.

## 7. Dove proseguire

- [Roadmap tecnica](DECENTRALIZATION-ROADMAP.md) — ordine di lavoro.
- [Protocollo e continuità dei dati](CONTINUOUS-SYNC.md) — differenza fra commit, pubblicazione e replica.
- [Conoscenza, timeline e decisioni](NODE-KNOWLEDGE-GRAPH.md) — esperienze di lettura e workflow PR2.
- [Lean Storage](LEAN-STORAGE.md) e [scambio peer](PEER-EXCHANGE.md) — primitive sperimentali e rischi.
- [Governance](GOVERNANCE.md) e [verifica editoriale](EDITORIAL-GOVERNANCE.md) — autorità e fonti.
- [Sicurezza](SECURITY-REVIEW.md) e [qualità](QUALITY.md) — ciò che è provato, non solo pianificato.

**Criterio di successo:** una persona capisce come contribuire senza conoscere Git o JSON, un operatore può ospitare una copia senza diventare proprietario del nodo, e uno sviluppatore può provare ogni affermazione con un test o un esperimento riproducibile.

### Estrazione di strumenti comuni dal prototipo PolisRossa

La rassegna Agorà con fonti fissate in `app/instances/agora-sources.ts`, il componente di preferenze personali del feed e il Node Studio a blocchi costituiscono un primo livello riusabile. La scelta delle fonti PR1 è privata e non determina l'ordine o la governance della rassegna altrui. Le bozze Node Studio sono protette da sessione e quota, ma non sono manifesti comunitari approvati. Ogni nuova fonte RSS proposta va revisionata, non interrogata automaticamente; ogni nuovo nodo deve ricevere namespace e backend isolati prima dell'attivazione.

Il resto di PolisRossa, compresi gli account, il social e la biblioteca, continua a essere il riferimento alpha e non è ancora un runtime generico completo. Percorso dettagliato: [NODE-STUDIO.md](NODE-STUDIO.md).
