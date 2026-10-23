# Agorà — nodo alpha originario di AgoraNode

**Decisione di prodotto: 23 ottobre 2026. Stato: alpha editoriale pubblico e storage PostgreSQL locale opzionale.**
**NON** equivale ad aver attivato il forum autonomo di Agorà, il primo PR2, una identità federata, il consenso BFT o gateway autosufficienti. Tali passaggi devono essere implementati e collaudati con evidenze distinte.

## Cos'è Agorà

**AgoraNode** è la tecnologia e il formato comune; **Agorà** è la **comunità tematica alpha originaria sulla tecnologia stessa**. La homepage `/` rimane il portale dei nodi, non una terza assemblea; `/agora` è il nodo fondativo. **PolisRossa** conserva il proprio lavoro come **primo prototipo applicativo** dal quale sono state estratte componenti, esperienze editoriali, feed, biblioteca e struttura della timeline. Non è eliminato né subordinato politicamente ad Agorà.

Agorà deve essere il primo posto in cui il motore comune è utilizzabile come prodotto tematico: news, video, Atlante, racconti, documentazione tecnica, strumenti di proposta e governance delle materie che competono a questa comunità. I mandati federali si distinguono dalle proposte tecniche locali: pubblicare una pagina su `/agora` non equivale a legiferare per gli altri nodi.

## Atlante, non “wiki”

Il nome rivolto ai lettori è **Atlante**.

Una voce dell'Atlante è una pagina con titolo, sommario, testi argomentati, fonti, relazioni, stato di maturità e storia. **Tutte** le voci sono raggiungibili dalla ricerca e dai collegamenti, indipendentemente dall'inclusione nella timeline. La timeline è invece una **selezione narrativa**, con periodo, titolo e un vero testo introduttivo, ispirata a quella già sviluppata in PolisRossa; i PR2 del rispettivo nodo potranno scegliere le tappe e approvare modifiche di testo, ordine e inclusione. Questo **workflow completo di approvazione PR2 non è ancora attivo** nel nodo Agorà.

### Dettaglio della voce — struttura della pagina

1. **Testata:** categoria, titolo grande, sommario editoriale, posizione nella timeline oppure stato di voce fuori dal racconto.
2. **Introduzione narrativa:** quando la voce è selezionata, il periodo e il testo che la connette alla storia del tema.
3. **Corpo:** sezioni con paragrafi leggibili, non JSON grezzo, con indice laterale delle sezioni su desktop e collegamenti accessibili su mobile.
4. **Fonti e documentazione:** URL HTTPS verso materiali pubblicamente verificabili e attribuiti.
5. **Relazioni:** lettura trasversale fra altre voci dell'Atlante.
6. **Tracciabilità:** collegamento ai commit di revisione nel repository e stato editoriale reale, senza simulare un voto PR2.
7. **Partecipazione:** collegamento al Laboratorio Agorà per preparare proposte, non un bottone fittizio di pubblicazione automatica.

Il modello dei dati è `app/instances/agora-atlante.ts` e la UI è `app/components/AgoraAtlas.tsx`. La ricerca include anche le voci non presenti nel percorso e lavora su un corpus di ingresso finito, senza bisogno di telemetria o tracciamento dei lettori. La pagina di dettaglio ha un URL stabile del tipo `/agora?atlante=atlante`.

### Biblioteca tecnica

`/agora#biblioteca-agora` raccoglie documentazione tecnica realmente conservata nel repository: specifiche, architettura, sicurezza, conoscenza, roadmap e installazione. Ogni scheda apre il proprio documento e ne lascia verificare le modifiche. Non è un deposito di libri non autorizzati; la futura libreria condivisa avrà file, edizioni, checksum, licenze e pinning per nodo.

## Avviare l'Atlante

Il frontend pubblico è leggibile immediatamente su `/agora` e `/agora?atlante=...` dopo una build: il corpus di base è contenuto nel codice del repository e non richiede account né configurazione di OAuth. Questo rende Agorà **un alpha editoriale realmente navigabile**, anche quando non è ancora stato collegato il database indipendente.

### Archivio PostgreSQL autonomo (opt-in)

Per rendere le voci anche revisioni verificabili e interrogabili in un database di conoscenza **separato da PolisRossa**, predisporre un PostgreSQL distinto e con backup separato. Impostare le variabili **solo lato server** e con privilegi amministrativi controllati:

```text
DATABASE_URL=postgresql://POLIS_USER:POLIS_PASSWORD@DB_HOST:5432/polisrossa
AGORANODE_AGORA_DATABASE_URL=postgresql://AGORA_USER:AGORA_PASSWORD@DB_HOST:5432/agora
AGORANODE_SEED_CONFIRM=public-repository-alpha
```

L'operatore deve revisionare i contenuti e **provare il restore del backup** prima della prima importazione. Il comando esplicito è:

```bash
npm ci
npm run agora:seed
```

`agora:seed` rifiuta se i due target PostgreSQL coincidono, applica le migrazioni dell'applicazione al solo database Agorà e importa le revisioni alpha del namespace `agora` con pubblicazione `repository-review`, come il seed originale di PolisRossa. **Non crea account, forum o credenziali PR2.** La sorgente della pubblicazione è il repository, non una votazione fittizia. L'API del server espone le pagine pubbliche soltanto su `GET /api/spaces/agora/knowledge?kind=article&id=...` e la ricerca su `GET /api/spaces/agora/search?q=...` quando la connessione privata lato server è configurata. Questo non è un URL di database accessibile dal browser.

Il database locale pubblico è un backend di lettura della comunità, non un'autorità mondiale; un futuro checkpoint pubblicato e finalizzato potrà essere replicato su peer indipendenti con il protocollo della rete. La conservazione delle identità personali e delle schede PR2 richiede una diversa policy.

## Le prossime prove decisive

| Prova | Criterio di uscita |
| --- | --- |
| User experience | Aprire `/agora`, cercare una voce non presente in timeline, aprirla, leggere fonti e tornare al percorso |
| Persistenza | Importare due volte su un database di test Agorà, verificare hash e revisione, conservare PolisRossa intatto |
| Isolamento | Nessuna query Agorà può modificare, pubblicare o interrogare dati di PolisRossa senza essere respinta |
| Autogoverno | Il futuro primo PR2 deve essere ammesso secondo una procedura pubblica e ricorribile; hosting non dà voti |
| Pubblicazione | Una proposta editoriale PR2 collega identità, base revision, fonti, license e decisione effettivamente approvata |
| Distribuzione | Tre macchine amministrate indipendentemente ricostruiscono la stessa testa finalizzata, con perdita dell'origine e partizioni |
| Sicurezza | Review esterna di autorizzazioni/consenso, segreti, retention e licenze prima di aprire scritture federate |

**Non esiste ancora una certificazione indipendente del software.** La suite CI e una demo locale non sono una prova di sicurezza distribuita.

## Riferimenti

- [Architecture](ARCHITECTURE.md) e [Alpha baseline](ALPHA-BASELINE.md)
- [Node Knowledge Graph](NODE-KNOWLEDGE-GRAPH.md) e [Editorial Governance](EDITORIAL-GOVERNANCE.md)
- [Peer-Owned Architecture](PEER-OWNED-ARCHITECTURE.md)
- [Security Review](SECURITY-REVIEW.md) e [Quality](QUALITY.md)
