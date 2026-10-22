# AgoràNode — Pagine enciclopediche, racconto e decisioni PR2

**Contratto di prodotto e stato:** PolisRossa dispone oggi di pagine storiche narrative e di un catalogo di opere; questa specifica spiega come trasformare tali prototipi in moduli comuni per tutti i nodi. Un primo indice di ricerca e un editor di proposte della timeline sono presenti nel ramo di sviluppo; non esiste ancora il backend completo di pubblicazione federata.

## Tre oggetti differenti, sempre separati

1. **Pagina enciclopedica**: una pagina con identità stabile, testo, fonti, licenza, versione e collegamenti. Tutte le pagine pubblicate del nodo restano **ricercabili e accessibili**, anche se non compaiono nel racconto.
2. **Selezione per la timeline**: i membri **PR2 del nodo competente** deliberano se una determinata pagina debba entrare nella timeline principale, essere spostata o uscirne. La decisione deve essere verificabile e può essere cambiata con una nuova proposta. Un PR2 di un altro nodo non decide per questo nodo.
3. **Introduzione narrativa**: una tappa della timeline non è una parola-link. Contiene un periodo, un titolo e **uno o più paragrafi che raccontano perché il tema conta, cosa è successo e come si collega alle tappe vicine**, nello stile già presente in `SocialHistoryStory.tsx` di PolisRossa. Un link apre la pagina enciclopedica approfondita.

L'esclusione dalla timeline cambia solo la selezione narrativa, non cancella la pagina, la sua storia o i collegamenti dall'enciclopedia. Il motore comune non deve imporre che ogni articolo wiki compaia nella timeline.

## UX per chi non conosce strumenti wiki

**Percorso A — Modificare una o più tappe**
- Nella timeline sono presenti selettori chiaramente associati a ogni tappa narrativa.
- Chi legge può selezionare fino a otto tappe, aprire lo strumento «Proponi una modifica», scegliere l'operazione e scrivere il passaggio narrativo aggiornato.
- L'interfaccia mostra periodo, titoli, ID interessati, fonti e un riepilogo leggibile. Non serve conoscere Markdown, identificatori Git, JSON o hash.
- «Continua nel forum» trasferisce solo la **bozza testuale** al modulo esistente delle proposte PR2. La bozza non pubblica nulla da sola.
- Chi non è membro PR2 può capire il procedimento, ma il server non gli consente di inviare un voto o pubblicare come membro. L'autorizzazione non dipende da un pulsante nascosto.
- Il voto PR2 deve autorizzare **esattamente** contenuto, selezione, revisione di base e ambito della proposta. Non basta che un titolo generico vinca una votazione.

**Percorso B — Scrivere una nuova pagina**
- «Proponi una nuova pagina» chiede titolo, contesto introduttivo, periodo (se pertinente) e fonti.
- La futura vera esperienza wiki offrirà un editor a blocchi: titolo, sottosezioni, citazioni, fonti, dati, collegamenti, persone, libri; anteprima, salvataggio bozza, diff visivo, discussione e revisione.
- L'accettazione crea una **pagina indicizzata**. La sua inclusione nella timeline resta una **decisione separata** dei PR2 locali, con testo narrativo specifico e collocazione.
- L'interfaccia deve mostrare il risultato di ogni decisione, il motivo di un rifiuto e il percorso di ricorso. Nessuna automazione può convertire una proposta testuale in revisione definitiva senza certificato e controllo delle fonti.

Oggi è integrato soltanto un **wizard di testo** che apre il composer PR2 di PolisRossa: le bozze pubbliche versionate, l'editor completo, la selezione con diff e l'attivazione automatica dopo il voto restano da realizzare. Gli URL di handoff non sono certificati di voto o prova d'identità e non trasportano credenziali.

## Le pagine come grafo di conoscenza

| Oggetto | Identità | Relazioni |
| --- | --- | --- |
| Wiki | spaceId + kind + id + locale, revisione firmata | Citazioni, autori, temi, cronologia, correzioni |
| Evento | Identità stabile, intervallo/precisione temporale, fonti | Persone, libri, luoghi, decisioni e dataset |
| Opera | Work ID, non URL esterno | Autore, generi, edizioni e pagine collegate |
| Edizione | ID specifico, lingua, diritti, formato | Work ID e file verificabili solo se redistribuibili |
| Dataset | Indicatore, unità, metodo, provenienza, intervallo | Grafici e pagine contestuali |
| Discussione | Topic ID scoped al nodo e stato del voto | Proposta, base revision, emendamenti, risultato e revisione finale |
| Timeline | Vista selettiva di pagine con testo narrativo PR2 | Ordinamento, periodo, stato di inclusione e decisione collegata |

La timeline è una **proiezione leggera e ricostruibile** sopra il grafo più ampio: un nodo potrà avere milioni di pagine ricercabili e soltanto un percorso narrativo principale curato. La ricerca non decide l'autorità editoriale, e l'assenza dalla timeline non penalizza automaticamente l'indicizzazione. Sono necessari full-text server-side, filtri per categorie e risultati con provenienza spiegabile.

## Biblioteca pienamente sviluppata

L'attuale catalogo bibliografico PolisRossa non è ancora una biblioteca distribuita completa. Serve distinguere:
- **Metadati:** titolo, autori, lingua, opera, edizione, formati, fonti e permessi di accesso.
- **Disponibilità:** riferita all'edizione esatta; distinguere «lettura da archivio esterno», «disponibile localmente in questa istanza», «scaricabile da peer» e «non redistribuibile».
- **File:** PDF/EPUB/HTML e media conservati come blocchi content-addressed, con controllo d'integrità, quota, pinning volontario, idempotenza e verifica dei diritti.
- **Ricerca e relazioni:** collegare un libro alle pagine wiki, a una sequenza storica, a un autore e ai dataset pertinenti senza duplicare i file pesanti negli indici.
- **Edizioni con diritti differenti:** un link pubblico non equivale a licenza di replica. Evitare il download automatico di interi archivi privi di autorizzazione.
- **Dati personali:** i commenti privati, la cronologia di lettura, le prenotazioni e le sessioni non entrano nella rete dei blocchi pubblici.

## Dalle decisioni alla pubblicazione

L'oggetto `timeline-curation.v1` descrive una decisione di inclusione/esclusione: nodo, identità della pagina, revisione corrente, digest della decisione PR2, ID forum, precedente digest della selezione, azione e — per le inclusioni — periodo, ordine e testo narrativo obbligatorio.

Una futura API dovrà verificare server-side tutti gli elementi: membership PR2 **locale**, snapshot elettorale, voto certificato, revisione pubblicata e ancora corrente, diritti, assenza di dati riservati e compatibilità fra digest. L'ultimo passaggio è atomico: se nel frattempo la revisione o la selezione cambia, non si pubblica silenziosamente sopra la versione nuova. Un voto può determinare **cosa raccontare**, non rendere veri fatti non supportati.

## Cosa è realmente implementato in questo ramo

- `node-content-search.ts` e `polisrossa-content.ts`: indice leggibile di metadati di biblioteca e titoli delle tappe già esistenti, filtrato per nodo.
- `NodeContentSearch.tsx`: barra di ricerca e filtri comuni, con stati caricamento/vuoto/errore. La wiki e gli altri tipi restano aperti.
- `timeline-curation.ts`: validatore e transizione deterministica di selezione narrativa, **non** backend live dei voti.
- `TimelineProposalTool.tsx`: selezione di tappe e wizard testuale per una nuova pagina o per correggere il racconto; collegamento esplicito al forum PR2 PolisRossa.
- `CommunityView.tsx`: importazione della bozza dal deep link; non altera controlli PR2 o transazioni del server.
- Gli eventi esistenti continuano a usare `SocialHistoryStory.tsx`, con la stessa forma narrativa.

## Gate mancanti per una reale pubblicazione

Persistenza di proposte multiple e allegati autorizzati, diff delle revisioni, editor accessibile, protocollo completo di decisione locale, accettazione/rifiuto/ricorso, endpoint firmati di pubblicazione, full-text reale per milioni di pagine, distribuzione incrementale dei file di biblioteca e test d'isolamento tra comunità.

Collegamenti: [EDITORIAL-GOVERNANCE.md](EDITORIAL-GOVERNANCE.md), [CONTINUOUS-SYNC.md](CONTINUOUS-SYNC.md), [LEAN-STORAGE.md](LEAN-STORAGE.md), [LIBRARY.md](LIBRARY.md), [QUALITY.md](QUALITY.md).
