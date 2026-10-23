# Biblioteca di ogni nodo — navigazione a due livelli

**Questa specifica riguarda esclusivamente la pagina Biblioteca, non la struttura generale del sito.**

La home, la rassegna, le notizie e i video, l'accesso a **Agorà** (partecipazione, forum e proposte quando attivi), i preferiti personali e le altre funzioni continuano a essere moduli distinti, come nella prima applicazione PolisRossa. Agorà by AgoràNode usa gli stessi schemi di interazione, adattati al tema tecnologico.

## Primo livello: tre scelte visibili entrando in Biblioteca

1. **Libri e percorsi** — catalogo, edizioni e letture guidate; file soltanto quando i diritti consentono consultazione o distribuzione.
2. **Timeline e Atlante** — ingresso al racconto narrativo e alle pagine di approfondimento ricercabili.
3. **Dati e grafici** — indicatori e visualizzazioni con unità, metodo, fonte e data.

Questi sono **tre pulsanti affiancati**, non tre componenti dell'intera home del nodo.

## Secondo livello: solo dentro «Timeline e Atlante»

A questo punto compaiono **due pulsanti**, espliciti e distinti:

- **Timeline** — un percorso scelto e ordinato, con data/periodo accanto e un testo introduttivo narrativo per ogni tappa; da lì si apre la voce completa.
- **Atlante · Indice e ricerca** — cerca e apre una qualsiasi voce pubblicata e indicizzata, compresi gli approfondimenti **non** selezionati per la timeline.

La timeline non equivale all'intera base di conoscenza. Non tutte le voci devono figurare nel racconto. Aprire l'indice non significa approvare una modifica e nessun voto PR2 può rendere vere affermazioni senza fonti.

## Dettaglio della voce dell'Atlante

Quando si apre una voce, mostrare titolo, sintesi leggibile, sezioni testuali, fonti e attribuzioni, collegamenti alle voci correlate ed eventuale posizione narrativa. L'interfaccia di proposta deve restare una modalità separata dalla lettura, senza consentire una modifica pubblica diretta senza le autorizzazioni richieste. Le pagine non devono ridursi a titoli seguiti da parole-link.

Per il primo corpus tecnologico Agorà, una selezione iniziale documenta il percorso del progetto. È una **edizione repository-reviewed**, non una decisione PR2 certificata. Le voci restano disponibili nell'indice anche se escluse dalla timeline. PolisRossa mantiene i suoi testi, schede storiche, URL e indici precedenti; le nuove modalità non devono rompere i vecchi collegamenti.

## Schema di navigazione

```text
NODO TEMATICO
├── Rassegna   (news, video, feed, preferiti)
├── Biblioteca
│   ├── Libri e percorsi
│   ├── Timeline e Atlante
│   │   ├── Timeline
│   │   └── Atlante · Indice e ricerca
│   │       └── Voce completa (fonti e voci collegate)
│   └── Dati e grafici
└── Agorà      (partecipazione del nodo, quando attiva)
```

## Contratti di implementazione

- I link riproducono sezione e modalità con la query URL, anche dopo un refresh.
- Le pagine di dettaglio hanno URL stabili e appartengono al proprio nodo.
- Gli indici non cambiano la selezione narrativa; la scelta avviene con il workflow PR2 competente.
- Stati caricamento, ricerca vuota, tastiera e schermi piccoli sono parte dell'esperienza.
- La rassegna e i preferiti continuano a funzionare fuori da Biblioteca, separati per comunità.

La prima versione usa `LibraryNavigationTabs.tsx` per la navigazione a due livelli; `AgoraLibraryView.tsx` per le tre sezioni del nodo tecnologico; `PolisrossaAtlasIndex.tsx` per le voci già presenti nel patrimonio storico. `thematic-atlas.ts` separa la voce enciclopedica dalla sua eventuale inclusione nel percorso narrativo. La pubblicazione multi-nodo completa dopo voto PR2 resta lavoro aperto e non è attestata da questo intervento.


La stessa gerarchia è applicata anche ai **nuovi nodi read-only** installati da Node Studio: `PublicSpaceLibrary.tsx` mostra i tre accessi principali e, all'interno di «Timeline e Atlante», la selezione fra la Timeline del manifesto e l'Indice di tutte le sue voci. Se non ci sono libri, dati o tappe, mostra uno stato vuoto senza inventare contenuti o simulare decisioni PR2.
