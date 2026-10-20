# Biblioteca e lettura online

Il catalogo contiene 176 opere, saggi e raccolte, 724 edizioni linguistiche e 37 lingue. La disponibilità è quella degli archivi esterni; la completezza delle traduzioni può variare. Le tre schede tematiche storiche restano nel catalogo e nei salvataggi, ma non sono conteggiate come libri gratuiti leggibili nel sito.

## Provenienza

- [Indice multilingue Marx ed Engels](https://www.marxists.org/xlang/marx.htm).
- [Indice multilingue Lenin](https://www.marxists.org/xlang/lenin.htm).
- [Rosa Luxemburg, MIA](https://www.marxists.org/archive/luxemburg/).
- [Kropotkin, MIA](https://www.marxists.org/reference/archive/kropotkin-peter/1902/mutual-aid/).
- [Edizioni Anarchismo: Il mutuo appoggio](https://www.edizionianarchismo.net/library/il-mutuo-appoggio) e [La conquista del pane](https://www.edizionianarchismo.net/library/petr-kropotkin-la-conquista-del-pane).
- [Project Gutenberg: The Conquest of Bread](https://www.gutenberg.org/ebooks/23428).
- [William Morris, MIA](https://www.marxists.org/archive/morris/).
- [Free, Fair and Alive, sito degli autori](https://freefairandalive.org/read-it/), con testi anche in [tedesco](https://freefairandalive.org/de/hineinlesen/) e [spagnolo](https://freefairandalive.org/es/leelo/).
- [Anarchistische Bibliothek: Gegenseitige Hilfe](https://de.anarchistlibraries.net/library/peter-kropotkin-gegenseitige-hilfe-in-der-tier-und-menschenwelt).

Le opere provengono da archivi e siti editoriali pubblici. Il catalogo distingue libri, saggi, antologie e raccolte: alcuni testi possono comparire sia come opere singole sia all’interno di un volume, quindi il numero delle voci non equivale al numero di testi indipendenti. Le descrizioni sono redazionali. La provenienza e il collegamento all’edizione originale restano visibili durante la lettura.

La selezione riguarda la storia e il pensiero delle sinistre nel mondo, in periodi e tradizioni differenti: movimento operaio, socialismi, comunismi, anarchismo, anticolonialismo, femminismi, cooperazione e beni comuni. Il catalogo è parziale: la disponibilità di edizioni online non deve essere confusa con la rappresentatività di un autore o di un paese. Le proposte di ampliamento seguono gli stessi criteri per ogni provenienza, senza creare raccolte privilegiate a partire da singole segnalazioni.

Altri indici e documenti utilizzati:

- [Opere scelte di Mao Zedong](https://www.marxists.org/reference/archive/mao/selected-works/index.htm), con indici in [portoghese](https://www.marxists.org/portugues/mao/index.htm) e [italiano](https://www.marxists.org/italiano/reference/mao/index.htm).
- [Gramsci: La città futura](https://www.marxists.org/italiano/gramsci/17/cittafutura.htm).
- [Clara Zetkin: organizzazione delle lavoratrici](https://www.marxists.org/archive/zetkin/1896/10/women.htm).

I collegamenti sono sottoposti a verifiche HTTP e di parsing; una risposta riuscita non certifica la qualità della traduzione, la completezza di tutti i capitoli o la disponibilità futura. Non vengono presentati risultati di negozi, servizi a pagamento o testi inventati come edizioni gratuite leggibili nel sito.

## Lettura e privacy

`/read?book=…&edition=…` carica esclusivamente un’edizione del catalogo tramite `/api/library/read`. Il runtime indipendente richiede un account personale con email verificata prima di leggere il testo. Le pagine remote sono limitate a 3,5 MB e non eseguono JavaScript; i redirect restano nel dominio configurato. Il testo è restituito in blocchi di stringhe, resi da React senza HTML non sanificato. Gli indici permettono soltanto capitoli HTML nel percorso dell’opera. Un libro pubblicato come pagina unica viene suddiviso in sezioni e pagine di lettura, conservando l’ordine del testo. La cache contiene solo documenti pubblici già scaricati, con limite di circa 8 MB e nessuna promessa I/O condivisa tra invocazioni.

`/api/reading-progress` richiede sempre un account e usa `private, no-store`. La tabella `reading_progress`, aggiunta dalla migrazione `0002_stormy_elektra`, ha chiave composta da proprietario, libro ed edizione. Conserva capitolo, pagina di lettura, posizione nello scorrimento, impronta del testo e data dell’aggiornamento. Gli aggiornamenti sono serializzati nel client e quelli temporali più vecchi non sovrascrivono una posizione più recente. Un errore di salvataggio è visibile e permette di riprovare. Il lettore non usa localStorage per simulare la persistenza del segnalibro. Un nuovo libro letto compare nella raccolta privata, senza riattivare un libro precedentemente rimosso.

Le prove automatiche verificano autenticazione, isolamento di account ed edizioni, ripristino da nuove richieste, richieste non valide o da altre origini, ordinamento degli aggiornamenti, testo inerte, capitoli confinati all’opera e continuità dei salvataggi esistenti. Non sostituiscono una verifica visiva in un browser autenticato.

Il testo e i titoli dei capitoli decodificano l’intero insieme delle entità HTML5 (incluse lettere accentate e riferimenti numerici), una sola volta dopo la rimozione del markup. Le sequenze sconosciute restano visibili; i caratteri decodificati vengono sempre resi come stringhe inerti.

## Conquiste, repressioni e resistenze

Il racconto cronologico comprende 64 tappe in sette epoche, dal 1848 al 2024, con riferimenti a inchieste e decisioni successive. Quattro confronti visibili in apertura distinguono crescita reale per abitante, mortalità infantile, primi voli spaziali femminili e minimi legali delle ferie. I riferimenti a persone e testi sono integrati nelle tappe. Il grafico sovietico sull’alfabetizzazione mantiene la fascia storica 9–49 anni. Le serie complete e i documenti originali restano consultabili; i risultati non sono presentati come prove automatiche di causalità. `?view=teoria&percorso=conquiste` apre direttamente il racconto delle conquiste senza selezionare un dossier.

L’archivio separato contiene 33 schede relative a 20 paesi, consultabili per paese e tema. Nessun filtro dell’archivio modifica il catalogo dei libri.

Undici dossier comprendono Italia, Comune di Parigi, Cina, Rivoluzione culturale, Francia, sanità britannica, Vienna Rossa, Cuba, URSS, Vietnam e la storia internazionale degli attacchi ai diritti: 46 capitoli e 81 riferimenti documentari. La cronologia integra 28 episodi di repressione, persecuzione, pressione economica e riduzione delle tutele. Il dossier “Diritti sotto attacco” collega le singole tappe e distingue documenti, testimonianze, mandati di inchiesta e sentenze; le fonti sono incluse nei crediti. Un selettore apre un dossier alla volta, con indice espandibile e una colonna di lettura. I percorsi collegano edizioni reali della biblioteca. Il parametro pubblico `?storia=<id>` apre direttamente un approfondimento.

I grafici presentano il PIL reale cinese dal 1978 al 2024, la povertà in Vietnam nel 2010 e nel 2020 e l’aspettativa di vita dal 1960 al 2024 per Cina, Vietnam, Cuba e mondo. I dati, le unità, le soglie e le fonti sono consultabili nella pagina; le serie annuali includono tutte le osservazioni del periodo. Gli iscritti dichiarati da alcuni partiti sono presentati separatamente con data e fonte: non misurano gli attivisti effettivi o il consenso di una popolazione.

La raccolta non è una storia nazionale esaustiva. Diritti riconosciuti dalle leggi, loro attuazione e risultati osservati sono distinti. Un andamento statistico non dimostra da solo un rapporto causale tra una politica e un risultato.

L’indice esterno comprende 589 archivi di autori e 83 raccolte storiche ricercabili. Non sono conteggiati come libri leggibili con segnalibro. L’esploratore statistico mette a confronto 93 indicatori e 217 paesi o economie, con 408.963 osservazioni disponibili dal 1960 al 2025. Non interpola gli anni mancanti e non equipara correlazione e causalità. Il catalogo delle letture ha filtri per lingua, paese o contesto e tema.


## Dati sulla vita materiale e letture tematiche

L’archivio comparativo contiene 93 indicatori e 408.963 osservazioni, con coperture diverse per paese, misura e anno. Banca Mondiale: infrastrutture, reddito, lavoro, servizi, istruzione e ricerca. Eurostat: abitazione, energia, istruzione superiore, professioni scientifiche e lettura. ILOSTAT: salari medi e mediani mensili e orari in PPP 2021 e produttività oraria. Il periodo complessivo arriva al 2025; non tutte le serie raggiungono quell’anno. Le osservazioni successive al 2025 sono escluse.

Le bollette elettriche usano la fascia DC e il gas la fascia D2, imposte incluse. Le osservazioni annuali sono la media aritmetica dei due semestri pubblicati, soltanto quando entrambi esistono; non sono medie ponderate per consumi. Gli indici dei prezzi delle abitazioni descrivono variazioni nel tempo, non il prezzo in euro di una casa. La quota di costi abitativi eccessivi e l’impossibilità di scaldare l’abitazione descrivono condizioni delle famiglie, non prezzi unitari.

Gli stipendi in PPP non sono il PIL per abitante, il reddito netto disponibile o automaticamente una serie reale depurata dall’inflazione. Per ogni paese ILOSTAT viene mantenuta una sola indagine: maggiore copertura annuale, poi anno più recente, poi codice in ordine alfabetico. Fonte nazionale, segnalazioni e note originali restano nel file scaricabile. I confronti richiedono attenzione alla copertura dei dipendenti. La produttività oraria è una stima modellata, distinta dalla retribuzione.

Il totale dei diplomati STEM somma i campi ISCED-F 05, 06 e 07 soltanto con tutte le componenti per lo stesso paese e anno. I diplomati annuali sono distinti dagli specialisti occupati. L’aggregato Eurostat degli scienziati e ingegneri include anche professioni sanitarie e ICT; il personale accademico non identifica soltanto professori ordinari. La lettura è una percentuale delle persone di almeno 16 anni in famiglie private, non un conteggio mondiale di lettori; la rilevazione non è annuale.

Otto percorsi nelle Conquiste collegano 32 suggerimenti di lettura a casa, infrastrutture, salari, energia, formazione, cultura, cura e cooperazione. Sei nuove opere sono integrate nello stesso catalogo degli altri autori. I rapporti e le tavole degli enti statistici sono identificati come risorse documentarie e non gonfiano il numero dei libri.

Aggiornamento riproducibile, in sequenza dalla radice del progetto:

```sh
python scripts/refresh-history-data.py
python scripts/refresh-eurostat-history.py
python scripts/refresh-ilo-history.py
python scripts/refresh-history-derived.py
```

Verificare i metadati e le eventuali revisioni delle fonti prima di pubblicare. I file statici vengono caricati per singolo indicatore quando si apre l’archivio: l’intero insieme non entra nel primo caricamento delle notizie.

Le edizioni con capitoli distribuiti in directory sorelle possono dichiarare un indice esplicito nel catalogo. Il lettore accetta soltanto i collegamenti dichiarati, sullo stesso dominio dell’edizione; non allarga la ricerca automatica ad altre directory.

## Organizzazione della biblioteca

La Biblioteca mantiene il catalogo, i percorsi e le conquiste nella stessa pagina. Una guida iniziale ne spiega l’uso e collega direttamente all’archivio statistico. I collegamenti alle opere e agli indicatori restano condivisi: una lettura può accompagnare più percorsi senza creare copie editoriali separate. La lingua dei comandi è distinta dalla lingua dei contenuti; la modalità originale conserva testi e titoli nella lingua di provenienza. La traduzione del libro riguarda la presentazione della pagina e non modifica l’edizione, la paginazione o l’identificatore del segnalibro.
