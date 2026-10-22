# Guida alla manutenzione

Valide per l’intero repository. Convenzioni comuni: semplicità, comprensione del sistema, verifiche integrate, reversibilità e comunicazione precisa.

## Prima di modificare

Leggere `README.md`, `docs/ARCHITECTURE.md`, `CONTRIBUTING.md` e il codice pertinente. Controllare branch, head e modifiche locali. Definire risultato atteso, flusso dei dati interessato, invarianti e verifiche. Non ampliare il prodotto per inerzia.

## Principi

1. Saper evitare lavoro inutile: riusare o semplificare prima di aggiungere framework, dipendenze e documenti.
2. Possedere un modello spiegabile: browser → API → fonti esterne; cache dei soli dati pubblici; raccolte private persistenti in PostgreSQL per account.
3. Ispezionare contratti e funzioni interessate, con attenzione maggiore a URL remoti, parsing, HTML, credenziali e persistenza.
4. Preferire verifiche integrate del comportamento a test che ripetono l'implementazione. Nei nuovi comportamenti coprire successo, input errato, risposta vuota e rete indisponibile quando pertinenti.
5. Rendere esplicite le scelte difficili da invertire: identificatori delle fonti, chiavi localStorage, contratti API e hosting. Descrivere compatibilità e rollback.
6. Fermare l'espansione quando emergono regressioni o basi fragili; correggere la causa con il cambiamento minimo.
7. Aggiornare la documentazione del runtime reale e riportare solo test e deploy effettivamente osservati.

## Coerenza editoriale e del prodotto

- Interpretare esempi di autori, paesi o funzionalità alla luce dell’obiettivo generale: verificare le lacune dell’intero catalogo e del flusso interessato, senza restringere automaticamente il lavoro all’esempio.
- Integrare i contenuti nella tassonomia e nell’interfaccia esistenti. Creare una sezione autonoma solo quando serve a un compito distinto del lettore, non per ogni intervento di manutenzione.
- Descrivere lo stato corrente del progetto nei documenti. Aggiornare i paragrafi pertinenti; eliminare duplicazioni, resoconti conversazionali ed elenchi di aggiunte presentati come funzionalità separate. La cronologia tecnica resta in Git.
- Mantenere criteri uniformi per opere, autori, lingue, paesi e periodi. Segnalare i limiti di copertura; non presentare il catalogo come completo.
- Usare italiano naturale e termini adatti al pubblico: “lettura online” per la funzione, “lettore” per una persona o, nei dettagli tecnici, per il componente software.

## Chiarezza delle spiegazioni

- Scrivere anche per chi non conosce storia delle sinistre, lessico politico o statistica. Spiegare il problema concreto prima di introdurre una categoria teorica.
- Aprire con un orientamento breve; sviluppare contesto, meccanismo ed esempio nei paragrafi successivi. Definire sigle e termini al primo uso.
- Ampliare le spiegazioni quando aggiungono comprensione, senza sostituire la precisione con aggettivi o ripetere lo stesso avviso in ogni scheda.
- Conservare concisi pulsanti, etichette e titoli; usare corpo del testo e approfondimenti per la lettura distesa. Separare paragrafi con funzioni diverse.
- Distinguere fonti originali, interpretazioni redazionali e istruzioni del prodotto. Non riscrivere citazioni o articoli di terzi come se fossero testi del progetto.
- Nelle statistiche spiegare unità, popolazione osservata e significato del confronto. Conservare definizioni originali, anni e valori anche quando si aggiunge una spiegazione accessibile.

## Invarianti del progetto

- Conservare attribuzioni, URL originali e trasparenza degli errori delle fonti.
- Le classificazioni e i punteggi sono euristici: non dichiararli verifiche politiche o di verità.
- Non accettare URL arbitrari del visitatore come nuove destinazioni del proxy senza analizzare SSRF, protocolli e redirect.
- Trattare testo e markup dei feed come input non attendibile. Non introdurre rendering HTML non sanificato.
- Non inviare preferiti o altri dati personali a servizi esterni come effetto collaterale di una modifica ordinaria.
- Non committare token, cookie, file `.env`, dati personali, cache o output compilati.
- Mantenere il runtime indipendente e non introdurre identificativi, credenziali o dati personali del gestore nei sorgenti.
- GitHub Actions verifica il codice; non equivale a un deploy del servizio o a una verifica dei feed dal vivo.

## Verifica e consegna

Eseguire `npm test` e le verifiche pertinenti alla modifica. Per UI valutare tastiera, schermi piccoli, caricamento e fallimenti. Dichiarare eventuali blocchi o verifiche non eseguite. Prima di pubblicazioni o operazioni distruttive accertare che rientrino nella richiesta del maintainer; non riscrivere cronologia o dati per risolvere conflitti ordinari.

Riportare cosa è cambiato e perché, verifiche e risultati, limiti residui e riferimenti a commit/PR/deploy. Non inventare un esito positivo e non confondere specifiche future con funzionalità implementate.

## Evoluzione AgoraNode e limiti di decentralizzazione

Il portale `/`, il nodo tematico Agorà `/agora` e il nodo PolisRossa `/polisrossa` sono tre superfici differenti: il primo è una directory, le altre sono comunità. **Peer** significa computer partecipante; non equivale a spazio tematico o elettore. Evitare di far dipendere nuovi moduli comuni da `POLISROSSA_MANIFEST` o da cataloghi PolisRossa direttamente; preservare il flusso legacy finché la migrazione dei dati è testata. Nuovi manifesti locali si registrano nella allowlist `app/instances/registry.ts`.

Non dichiarare decentralizzato un backend per il solo fatto che genera snapshot firmati. Il kernel di replica pubblica è testato localmente ma non distribuisce ancora dati privati, forum, chat e account. Dati `public-ephemeral`, `private-local`, `private-authorized` e `secret-never-export` non entrano nella replica pubblica. Il contratto `app/platform/data-placement.ts` è soltanto una **policy preparatoria**: un futuro exporter deve farla rispettare lato server con test di non-divulgazione.

Separare prove di trasporto peer-to-peer, consenso BFT, certificati politici, accesso web failover e continuità dell'autenticazione. Non avviare scritture distribuite, aprire porte, introdurre relay di terzi o esporre chiavi senza un modello di minaccia, test tra computer indipendenti e revisione di sicurezza. Le specifiche guida sono `docs/PEER-OWNED-ARCHITECTURE.md` e `docs/DECENTRALIZATION-ROADMAP.md`.

Ogni nuova capacità deve preservare namespace, URL, volumi e ID PolisRossa, non inventare licenze per contenuti esistenti, e distinguere il contratto tipizzato dalla disponibilità pubblica comprovata.

## Qualità della conoscenza e concentrazione del potere

Una decisione democratica non certifica un fatto. Non creare API che trasformino un voto in verità editoriale o consentano a un custode tecnico di governare un nodo. Leggere `docs/EDITORIAL-GOVERNANCE.md` e `docs/CRITICAL-DESIGN-REVIEW.md` per i conflitti fra fonti, consenso, voto, privacy, ranking e anti-cattura. Non introdurre feed opachi di profilazione politica, replica irreversibile di relazioni personali o moderazione senza motivazione e rimedi.

## Revisione sistematica dei requisiti

Prima di cambiare moduli comuni, storie, dati, permessi o distribuzione, consultare **le specifiche tecniche pubbliche**: `docs/PEER-OWNED-ARCHITECTURE.md`, `docs/NODE-KNOWLEDGE-GRAPH.md`, `docs/CONTINUOUS-SYNC.md`, `docs/EDITORIAL-GOVERNANCE.md`, `docs/DECENTRALIZATION-ROADMAP.md` e `docs/QUALITY.md`. Verificare che il lavoro non contraddica invarianti già documentate: pagina ricercabile anche fuori timeline, inclusione narrativa decisa dai PR2 locali, provenienza e licenze dei file, replica pubblica separata dai dati personali, audit e rollback.

Le trascrizioni letterali, gli appunti personali e i materiali riservati **non fanno parte del repository pubblico**. Non aggiungerli a commit, issue, PR, README, log o fixture; utilizzare soltanto requisiti tecnici rielaborati, necessari e privi di informazioni non pertinenti al codice. La storia delle decisioni tecniche resta in Git e nei documenti pubblici, non in un diario privato.

A conclusione del cambiamento confrontare codice, API, test, interfaccia e documentazione con questi requisiti e annotare limiti ancora aperti; non trasformare gli obiettivi di prodotto in funzionalità dichiarate operative.
