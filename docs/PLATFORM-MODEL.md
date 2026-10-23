# AgoràNode — modello tecnico e guida al progetto

AgoràNode è un software comune per comunità tematiche autonome. Non è un sito costruito attorno a un'unica ideologia o disciplina; lo stesso motore deve permettere a una comunità di parlare di informatica, storia, medicina, cultura, quartieri o altri argomenti, con fonti, editoria e persone proprie. Un nodo non deve nascere copiando un sito precedente e sostituendone il logo: deve usare **componenti e contratti di AgoràNode**, mantenendo separati i propri dati.

La presente guida distingue il **modello desiderato** dalle parti **effettivamente implementate**. È pensata per chi vuole capire il progetto senza aver seguito le discussioni o letto ogni commit.

## Tre entità da non confondere

**AgoràNode** è la piattaforma e la documentazione del suo funzionamento. Contiene frontend, contratti per la conoscenza pubblica, sicurezza degli accessi, servizi di database e primitive di distribuzione. È ciò che un nuovo gruppo installa o riutilizza.

**Agorà** è il primo nodo alpha di riferimento. Si occupa del software stesso e permette di verificare concretamente rassegna, Biblioteca, Atlante, timeline, primi dati editoriali, forum dimostrativo e laboratorio per creare altri nodi. È un nodo tematico, **non** l'autorità politica permanente di tutti gli altri.

**PolisRossa** è la comunità tematica nata prima dell'estrazione del motore comune. Alcune soluzioni importanti — timeline narrative, Biblioteca con percorsi di lettura, preferenze dei feed, componenti del forum — provengono da quel lavoro. PolisRossa conserva i propri dati, URL, account, contenuti e decisioni; nessun nodo futuro deve ereditarne implicitamente identità o argomento.

L'indirizzo `/` ospita il **registro dei nodi**: qui compaiono solo comunità realmente pubblicate, con identificatori, ambiti e stato del servizio. I temi ipotetici sono suggerimenti separati e non vanno presentati come installazioni operative.

## Esperienza comune a ogni nodo

La navigazione principale comprende tre parti.

**La rassegna** presenta articoli, fonti RSS/Atom, video, registrazioni e link a eventuali dirette ospitate dagli editori originali. Il lettore può selezionare le proprie fonti e passare fra *Tutti i feed* e *Feed preferiti*. Le scelte di un visitatore restano sul suo dispositivo; se un account PR1 e il relativo backend sono disponibili possono essere conservate in modo privato per nodo. Il feed deve sempre indicare la fonte originale, senza copiare automaticamente testi e media protetti.

**Biblioteca** non è un archivio indiscriminato di link. All'ingresso presenta tre pulsanti: **Libri e percorsi**, **Timeline e Atlante**, **Dati e grafici**. Il secondo pulsante porta a una scelta ulteriore fra **Timeline** e **Atlante · Indice e ricerca**. La timeline contiene un racconto curato, composto da tappe con periodo, contesto, spiegazione e collegamento alla voce completa; l'Atlante permette di trovare **tutte le voci pubblicate**, anche quelle che la comunità non ha selezionato per il racconto principale. Libri, edizioni e file sono distinti: un collegamento a un archivio esterno non conferisce il diritto di copiare un libro su un peer.

**Agorà** è il nome dell'area di partecipazione di ogni nodo, indipendentemente dal nome della comunità. Contiene forum, discussione delle proposte, editor visuale e, nelle installazioni abilitate, le procedure di voto e di controllo delle decisioni. Un'anteprima dei ruoli non concede automaticamente poteri e non registra votazioni valide.

## Il linguaggio delle pagine

Chi visita il sito incontra il termine **Atlante**, non la denominazione storica di alcuni software enciclopedici. Una **voce dell'Atlante** ha una identità stabile, un titolo, una introduzione comprensibile, sezioni, fonti, attribuzioni, voci correlate e, quando pertinente, dati o opere. La sua cronologia distingue revisioni e motivazioni.

La **Timeline** è una vista selettiva di voci, con narrazione propria. Un membro competente può proporre di inserire, cambiare o escludere una tappa; questo non cancella la voce dall'Atlante. Il voto riguarda una scelta editoriale **esplicita** e non rende vera un'affermazione che non abbia prove.

## Dal foglio bianco al nodo pubblicato

Node Studio offre un editor a blocchi per il primo curatore: nome, ambito, descrizione, fonti, testi, documenti e tappe. **Nuovo nodo · pagina vuota** avvia una bozza senza dati tematici precompilati. La persona può aggiungere e riordinare blocchi, visualizzare l'anteprima e salvare la bozza localmente. La creazione di un nodo non si completa quando viene premuto «Salva».

Esistono fasi diverse:

1. **Bozza privata**: visibile soltanto al curatore o al suo account, quando il servizio di salvataggio è attivo.
2. **Manifesto pubblico di consultazione**: l'operatore verifica fonti, copyright e dati personali e installa esplicitamente una versione read-only. Il nuovo spazio diventa navigabile e mantiene un proprio identificatore.
3. **Comunità partecipativa completa**: devono essere inizializzati database e sessioni separati, procedure di ammissione PR2, forum, moderazione, revisione e pubblicazione autorizzata delle voci. Questa fase non è ancora automatizzata nel runtime multi-nodo.

## Identità e governance

Un **visitatore** legge le parti pubbliche e può scegliere preferenze locali. **PR1** è un account personale autenticato con capacità definite dal nodo. **PR2** è un membro ammesso alle decisioni pertinenti alla propria comunità. **PR3** è un mandato federale limitato, verificabile e revocabile; non è un superutente.

Un **peer fisico** è una macchina che fornisce disco, rete o un gateway. Essere proprietari di un computer o amministratori tecnici non deve conferire voti, diritti editoriali o mandati. I dati privati — account, credenziali, sessioni, comunicazioni riservate — rimangono fuori dai pacchetti pubblici replicati.

## Stack e limiti operativi

Il client è scritto in React e TypeScript, compilato con Vite. Il server applicativo usa Node.js e PostgreSQL. Sono disponibili manifesti di nodo, prime pagine pubbliche riutilizzabili, ricerca, procedure locali di account/forum, esportazioni della conoscenza pubblica e primitive per scambio HTTPS e blocchi verificati da hash. **Non** significa che oggi un nodo appena creato disponga automaticamente di identità PR2 autonome, consenso BFT, chat federata o recupero dopo la perdita di tutti i server.

Un cambiamento pubblico deve distinguere la transazione locale, la decisione editoriale che lo autorizza, il checkpoint tecnico e la replica ai peer che hanno scelto di conservarlo. Test su un solo computer verificano algoritmi e contratti, non disponibilità fra organizzazioni indipendenti.

## Orientarsi nel repository

| Percorso | Responsabilità |
| --- | --- |
| `web/main.tsx` | Ingresso frontend; seleziona la pagina in base all'URL |
| `app/components/` | Interfaccia React: rassegna, Biblioteca, forum, Atlante, editor |
| `app/instances/` | Contenuti e configurazioni tematiche, **non** il modello universale |
| `app/lib/` | Ricerca, navigazione, validazione, diritti e contratti applicativi |
| `app/platform/` | Definizioni comuni dei nodi e classi di dati |
| `server/` | HTTP, autenticazione, persistenza, pubblicazione e trasporto |
| `tests/` | Controlli di regressione e contratti da preservare |
| `docs/` | Documentazione operativa e limiti tecnici verificati |

Per avviare l'interfaccia localmente: installare Node.js 24+, clonare il repository, eseguire `npm ci` e `npm run dev`. Un frontend avviato senza backend può mostrare pagine e contenuti statici ma non autenticare utenti o salvare discussioni sul server. Per verificare il progetto usare `npm run build`, `npm run typecheck` e `npm test`. Migrazioni e apertura dei servizi pubblici vanno eseguite soltanto dopo aver configurato correttamente il database e le credenziali.

Per ulteriori dettagli: [navigazione Biblioteca](LIBRARY-TWO-LEVEL-NAVIGATION.md), [installazione di un nodo di consultazione](THEMATIC-BOOTSTRAP.md), [architettura](ARCHITECTURE.md), [stato delle prove](QUALITY.md) e [sicurezza](SECURITY-REVIEW.md).

**Criterio di successo:** una nuova persona deve poter aprire un nodo e comprenderne le sezioni; un curatore deve poter creare e correggere una bozza senza conoscere Git; uno sviluppatore deve poter dimostrare con test o misure ciò che il progetto dichiara realmente operativo.
