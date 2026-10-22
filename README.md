# AgoràNode

AgoràNode è il software e l’infrastruttura condivisa per costruire nodi tematici autonomi. Il paragone utile è ForumFree: un servizio mette a disposizione tecnologia e accesso per molte comunità, senza diventare una di esse né accentrare le loro discussioni e decisioni. Ogni nodo collega attualità, fonti, biblioteca, conoscenza, storia, dati e confronto pubblico sul proprio tema.

**Agorà è un nodo** dedicato allo stato dell’arte della tecnologia AgoràNode e alle questioni comuni dell’infrastruttura. **PolisRossa è un altro nodo**, dedicato alla sinistra politica. Sono sullo stesso piano istituzionale: **dovranno condividere** formato e impaginazione, ma non argomento, comunità o ambito decisionale. Oggi l'interfaccia completa di PolisRossa non è ancora riusata integralmente da Agorà. La home `/` è il portale per trovare i nodi: oggi raggiunge i due percorsi reali presenti nel repository e permette di esplorare idee per altri temi. `/agora` è in costruzione, mentre `/polisrossa` è il nodo tematico sviluppato. Non esiste ancora un registro federato per trovare nodi ospitati altrove.

Ogni nodo dovrebbe rendere consultabile lo stato dell’arte del proprio tema: notizie e video con le fonti originali, biblioteca e conoscenza strutturata, cronologia, dati e confronto pubblico. I contenuti e le decisioni restano attribuiti alla comunità pertinente; Agorà tratta soltanto tecnologia, regole e risorse comuni dell’infrastruttura.

L’ambizione politica è una democrazia diretta informata da fonti, dati e discussione, fino a poter sostituire in futuro alcune funzioni decisionali delle istituzioni. È un obiettivo, non una condizione attuale: il servizio non ha autorità legale per sostituire organi pubblici e la federazione non è operativa. Il repository canonico è `internazionalerossa/agoranode`; i nomi tecnici storici `polisrossa` di istanza, database, volumi e configurazioni restano invariati per compatibilità.

PolisRossa collega l'informazione quotidiana ai libri, alla storia e ai dati necessari per capirla. Raccoglie fonti socialiste, comuniste, sindacali, anarchiche e anticoloniali di paesi diversi, mantenendo visibili provenienza e collegamento originale. Non chiede a chi legge di aderire a una posizione politica: offre materiali per verificare, confrontare e discutere.

L'orientamento editoriale è dichiarato. Le classificazioni automatiche aiutano a ordinare i contenuti, ma non certificano la verità di una notizia né l'identità politica di una fonte. Le traduzioni possono perdere sfumature; i grafici descrivono misure e associazioni, non dimostrano da soli rapporti causali. Per questo PolisRossa conserva date, unità, definizioni, attribuzioni e collegamenti ai documenti originali.

Il progetto vuole diventare un bene mantenuto da più persone senza trasformare il primo server nel proprietario del sito. Il lavoro attuale prepara questa direzione in modo verificabile: il codice è copiabile, un nodo locale può funzionare in sola consultazione, una release può essere attestata con una firma e il database può essere affidato in copie cifrate. Un primo kernel replica soltanto la conoscenza pubblica fra database distinti, con pacchetti verificati e import atomico; è stato provato localmente, non fra computer indipendenti. Trasporto di rete, scoperta dei peer, subentro dell'indirizzo pubblico, failover e cifratura end-to-end **non sono ancora collaudati o implementati come servizio operativo**.

Il manifesto tipizzato e l’endpoint pubblico definiscono un primo contratto per le istanze. Il portale distingue i due nodi reali presenti nel repository da una mappa iniziale di 124 temi possibili in numerosi campi del sapere: sono idee da cui potranno nascere comunità, non nodi già attivi. La ricerca trova sia nodi esistenti sia temi candidabili; un argomento non ancora in mappa può essere cercato e appare come idea temporanea, non salvata né inviata. La mappa non è esaustiva e non equivale a una rete federata. `/agora` presenta stato tecnico, registro federale e custodia, ma non ha ancora le superfici editoriali complete di `/polisrossa`. Non esistono un generatore completo di nodi, un forum federale aperto o una rete mondiale collaudata. Il runtime database/API per candidatura, voto, mandato e revoca PR3 è implementato e verificato con test locali, ma non ha ancora un’interfaccia pubblica né è attivo in produzione. Per i limiti verificati, consulta [QUALITY.md](docs/QUALITY.md).

[English](README.en.md) · [Il modello AgoràNode](docs/AGORANODE.md) · [Governo comune](docs/GOVERNANCE.md) · [Rete distribuita](docs/DISTRIBUTED-NETWORK.md) · [Replica pubblica](docs/PUBLIC-REPLICATION.md) · [Contribuire](CONTRIBUTING.md) · [Architettura](docs/ARCHITECTURE.md) · [Self-hosting](docs/SELF-HOSTING.md) · [Stato delle verifiche](docs/QUALITY.md)

## Visione tecnica: infrastruttura custodita dai partecipanti

AgoràNode vuole diventare una rete **eseguibile e custodita dai computer dei collaboratori**, non un social che richiede per sempre un database centrale presso un'azienda. Un peer è un computer che replica, serve o convalida; un **nodo tematico** è una comunità con argomento, contenuti e autonomia propri. Lo stesso peer potrà ospitare più temi e lo stesso tema potrà sopravvivere su più peer.

Questo obiettivo non richiede criptovaluta o mining: richiede blocchi verificabili, log di revisioni, consenso limitato alle decisioni che lo richiedono, gateway multipli, identità portabili e dati personali **mai diffusi nella replica pubblica**. Nessuna di queste proprietà va presunta operativa soltanto perché esiste uno schema. L'implementazione attuale ha un deposito pubblico e test di replica tra database locali; rete P2P e failover non sono ancora collaudati.

La prima prova di trasporto diretto fra peer di pacchetti pubblici firmati è documentata in [PEER-EXCHANGE.md](docs/PEER-EXCHANGE.md); non è una federazione di social o una rete BFT. Il [rapporto di sicurezza limitato](docs/SECURITY-REVIEW.md) chiarisce quali controlli mancano. La revisione critica su fonti, governo, sicurezza, feedback e manipolazione del social è in [CRITICAL-DESIGN-REVIEW.md](docs/CRITICAL-DESIGN-REVIEW.md); il workflow wiki proposto è in [EDITORIAL-GOVERNANCE.md](docs/EDITORIAL-GOVERNANCE.md). La specifica aggiornata è in [Architettura custodita dai peer](docs/PEER-OWNED-ARCHITECTURE.md). L'ordine dei lavori e i test vincolanti sono nel [Piano di decentralizzazione](docs/DECENTRALIZATION-ROADMAP.md); [Stato delle verifiche](docs/QUALITY.md) distingue sempre codice, prove locali e rete reale.

## Il formato comune AgoràNode

Un nodo completo cambia argomento, fonti, colori e comunità, ma conserva sei ambienti riconoscibili:

1. **notizie scritte e video**, sempre collegate alla pubblicazione originale;
2. **biblioteca gratuita e wiki**, con lettura interna soltanto per opere legalmente ridistribuibili e pagine enciclopediche revisionate;
3. **storyline dell’argomento**, in cui eventi, persone, organizzazioni, luoghi e concetti possiedono identificatori e pagine stabili;
4. **dati, confronti storici e grafici**, con unità, anni, popolazione osservata, fonte e collegamento permanente;
5. **forum democratico di autogestione**, separato per ogni istanza e collegato alle proposte sui contenuti e sulle regole;
6. **custodia portabile**, con revisioni, provenienza, esportazioni verificabili e backup senza credenziali o dati personali.

Il contratto `org.agoranode.instance.v1` descrive le capacità attese, ma non rende automaticamente completo un nuovo nodo: servono contenuti, diritti, fonti, moderazione, responsabilità dichiarate e collaudo. La scoperta di comunità ospitate su altri server richiederà un registro e un protocollo federato che oggi non esistono. Account, dati e forum devono restare separati per nodo; non si dichiarano aperti finché il relativo percorso reale non è collaudato.

La separazione è intenzionale: chi viene ammesso come PR2 nel forum PolisRossa decide nell’ambito PolisRossa. Può candidarsi a un mandato PR3 nella federazione AgoràNode, come ogni PR2 attivo di qualsiasi nodo ammesso, ma non lo riceve automaticamente: servono candidatura pubblica, elezione federale, scadenza e possibilità di revoca. Chi ospita una copia offre una risorsa tecnica e non acquisisce voti aggiuntivi.

## Come si usa

La rassegna è il punto di partenza per l'attualità. Ricerca, periodo, area, lingua, fonte e temi permettono di passare da una panoramica internazionale alle pubblicazioni desiderate. L'ordine può privilegiare il tempo oppure alternare paesi e testate, così un editore molto prolifico non occupa da solo la pagina. L'Osservatorio usa la stessa raccolta con il periodo “Ultime 6 ore”. Articoli e video si aprono presso chi li ha pubblicati.

La Biblioteca aggiunge contesto. Libri e percorsi introducono temi e autori; Conquiste racconta eventi, persone, repressioni e trasformazioni sociali lungo una cronologia; Dati e grafici permette di confrontare indicatori, paesi e periodi. I tre accessi restano collegati, ma rispondono a compiti diversi: leggere un testo, seguire una vicenda storica o verificare una misura.

Partecipa separa l’account personale dall’ammissione comunitaria. Nella stessa pagina si può scegliere soltanto PR1, per raccolte e posizione di lettura, oppure iniziare il percorso PR2. Entrambe le scelte creano prima lo stesso account PR1 con email e password: la seconda imposta soltanto la continuazione verso Partecipa e non invia né conserva ancora una domanda. Dopo aver confermato l’email e aver effettuato l’accesso, chi vuole PR2 deve collegare realmente un account Facebook tramite OAuth, compilare nome e presentazione, quindi inviare esplicitamente la domanda. Il riferimento Facebook mostrato ai valutatori viene ricavato dal collegamento OAuth e non può essere sostituito da un URL scritto nel modulo. Soltanto allora la pratica entra in valutazione; ciascuno dei tre membri fondatori deve usare il proprio invito iniziale, mentre una domanda ordinaria richiede tre voti favorevoli e tre contrari la respingono.

| Livello | Ambito | Come si ottiene | Potere |
| --- | --- | --- | --- |
| **PR1** | account personale | email e password confermate | dati e raccolte propri, nessun voto politico |
| **PR2** | un nodo preciso | domanda, prova sociale prevista dal nodo e ammissione dei PR2 esistenti | una persona, un voto nell’assemblea del nodo |
| **PR3** | AgoràNode federale | candidatura di un PR2 attivo, elezione federale e accettazione del mandato | soltanto le competenze enumerate, fino a scadenza o revoca |

PR3 non è un rango personale superiore e non sostituisce l’assemblea. Coordina ed esegue il mandato ricevuto; un nuovo mandato richiede una nuova elezione. La specifica, le soglie e gli stati append-only sono in [GOVERNANCE.md](docs/GOVERNANCE.md).

Il runtime federale conserva in PostgreSQL nodi ammessi, attestazioni PR2 firmate, elettorato congelato, schede, certificati e transizioni PR3 append-only. I test coprono il ciclo dalla candidatura alla revoca e i principali rifiuti di firme, replay e attraversamento di nodo; questa evidenza non apre il servizio. Finché mancano interfaccia, chiavi e nodi reali, configurazione operativa e collaudo in produzione, nessun utente viene presentato come PR3 attivo.

Il percorso gratuito scelto usa Gmail SMTP soltanto per conferma dell’indirizzo e recupero password: finché non è configurato e collaudato sull’istanza, gli account restano chiusi. Le iscrizioni pubbliche non richiedono per forza un codice condiviso: `ACCOUNT_ACCESS_HASH` è una barriera facoltativa conservata per installazioni a invito e, se configurata, viene richiesta soltanto alla registrazione; il recupero password resta disponibile senza quel codice e conserva i propri limiti. Anche senza codice, contatori persistenti limitano gli invii a 5 per client ogni 15 minuti, 20 complessivi all’ora e 100 al giorno, con un limite più stretto per destinatario. Quando il forum è aperto, Facebook OAuth è un requisito tecnico per inviare PR2: il server ricava da quel collegamento il riferimento Facebook mostrato al candidato e ai valutatori. La prova riguarda il controllo dell’account in quel momento, non l’identità civile, e non permette di accedere a PR1. Discord, Instagram o un sito personale non sostituiscono questo passaggio. Discussioni permanenti, proposte ed esiti vivono in PostgreSQL; la chat è intenzionalmente temporanea e rimane nella memoria del singolo processo. Le funzioni disponibili su un’istanza pubblica dipendono dalla sua configurazione e dal collaudo effettivo, non dalla sola presenza del codice.

L'evoluzione dell'infrastruttura e dei contenuti non richiede di stravolgere l'aspetto del sito. Rassegna, Biblioteca e Partecipa rimangono i tre accessi principali; i nuovi permalink, le schede enciclopediche e le funzioni di custodia devono inserirsi nella navigazione esistente.

## Cosa comprende oggi

- **Rassegna internazionale:** fonti dirette e ricerche tematiche, filtri combinabili, aggiornamento concorrente e cache dei soli dati pubblici.
- **Lingue distinte:** lingua dell'interfaccia, lingua di lettura e lingua originale delle fonti sono scelte separate. L'originale resta disponibile.
- **Video:** canali internazionali filtrabili; la riproduzione avviene sulla piattaforma di provenienza e non parte automaticamente.
- **Biblioteca:** catalogo multilingue di opere, edizioni e archivi esterni; la lettura interna usa soltanto copie persistenti con un diritto di redistribuzione registrato, mentre le altre edizioni si aprono presso la fonte.
- **Storia:** una cronologia in sette epoche con 64 pagine di evento, un primo indice di 17 persone, dossier e un archivio consultabile per paese e tema.
- **Dati e grafici:** serie annuali, metadati, confronti fra paesi, tabelle, CSV, permalink ed esportazione del grafico con unità, periodo, fonte e URL. Gli anni mancanti non vengono inventati o interpolati.
- **Raccolta personale:** preferiti e posizione di lettura persistenti per account nel runtime indipendente.
- **Comunità:** ammissioni, discussioni, proposte, votazioni ed esportazioni verificabili nel runtime indipendente; la chat temporanea non è un archivio.
- **Server autonomo:** applicazione Node.js, PostgreSQL e HTTPS avviabili con Docker Compose, senza dipendere dall'anteprima o da un fornitore specifico.

I numeri del catalogo e lo stato dei controlli cambiano con le revisioni: [LIBRARY.md](docs/LIBRARY.md) descrive provenienza e copertura, mentre [QUALITY.md](docs/QUALITY.md) distingue codice verificato, prova locale e comportamento realmente osservato online.

## Dove vivono i dati

PolisRossa non ha un unico tipo di contenuto e non deve trattare allo stesso modo una serie statistica pubblica e una sessione personale.

| Informazione | Stato attuale | Confine |
| --- | --- | --- |
| Cataloghi, percorsi e testi redazionali | File versionati con il codice | Pubblici, rivedibili tramite Git |
| Pagine di conoscenza | Revisioni content-addressed in PostgreSQL | Import amministrativo append-only; il primo insieme comprende 64 eventi e 17 persone |
| Serie storiche e metadati | File pubblici caricati per indicatore | Fonte, unità, periodo e valori restano insieme |
| Feed, immagini e documenti recuperati | Cache limitata dei dati pubblici | Destinazioni, redirect, tipi e dimensioni sono controllati |
| Testi dei libri letti online | Revisioni persistenti in PostgreSQL, importate solo da un registro esplicito dei diritti | Nessun recupero remoto durante la visita; le altre edizioni restano nell'archivio originale |
| Account, sessioni, preferiti e avanzamento | PostgreSQL | Privati per account, mai parte della cache pubblica |
| Forum, ammissioni e votazioni | PostgreSQL dell'istanza che accetta scritture | Pubblici o riservati secondo le regole; non replicati fra nodi |
| Chat | Memoria del processo, per finestre di 48 ore | Può sparire prima con un riavvio; non entra nei backup del database |

Il patrimonio pubblico di PolisRossa usa identificatori stabili, impronte SHA-256 e revisioni append-only: una correzione può cambiare la revisione corrente senza riscrivere la precedente. Lo schema già distingue i contenuti iniziali revisionati nel repository dai futuri contributi comunitari. Per questi ultimi il record di pubblicazione conserva autore, licenza pubblica scelta per il solo contributo, consenso alla versione del grant AgoràNode, revisione precedente, richiedente, discussione e decisione di approvazione. AgoràNode non impone una licenza editoriale unica e non cerca compatibilità con Wikipedia: la licenza scelta dall’autore per il pubblico resta distinta dal grant minimo `org.agoranode.contribution-grant.v1`, che autorizza il nodo a conservare il contributo, mostrarlo gratuitamente e pubblicarne revisioni approvate democraticamente. Il testo del grant è ancora una **bozza da sottoporre a revisione legale**; perciò l’editing pubblico non è aperto. Le normali API non espongono una cancellazione distruttiva delle entità pubbliche. Questo principio non si applica ai dati personali, che rimangono separati ed eliminabili secondo i diritti delle persone.

Il percorso ordinario è `browser → server Node → fonte pubblica` per la consultazione e `browser → server Node → PostgreSQL` per dati personali e comunitari. Il server non accetta dal visitatore destinazioni arbitrarie per il proxy e rende il testo remoto come contenuto inerte, senza eseguire il markup della fonte.

## Condividere la custodia senza inventare una blockchain

La continuità richiede compiti diversi. Copiare il codice, attestare una release, conservare un backup e decidere una modifica non sono la stessa operazione.

Oggi è possibile:

1. clonare il repository e costruire la stessa applicazione;
2. avviare un nodo indipendente in sola consultazione, con database e configurazione propri;
3. firmare un checkpoint deterministico della release con Ed25519 e verificare che un altro nodo abbia già costruito gli stessi file eseguibili;
4. produrre un backup PostgreSQL cifrato con age e consegnarne copie a più custodi;
5. provare il ripristino in un database separato, senza toccare quello operativo;
6. validare e importare in modo atomico pacchetti finalizzati della sola conoscenza pubblica fra database locali distinti.

Il checkpoint attuale è `release-only`: contiene manifesto e firma, non trasferisce codice, libri, forum, account o database. Importarlo registra soltanto provenienza e testa locale della catena. Una chiave pubblica va verificata tramite un canale indipendente; la firma prova la corrispondenza con quella chiave, non la bontà politica o tecnica del software.

I backup age sono leggibili da ogni destinatario la cui chiave pubblica è stata inclusa. Questo permette a più custodi di conservare una copia, ma **non** divide automaticamente il potere di decifrazione fra loro e non sostituisce consenso, replica o controllo degli accessi.

Queste basi non mantengono ancora “un solo sito condiviso” se il server che possiede il database scompare. L'agente di replica sa acquisire un pacchetto valido reso disponibile nella propria cartella e l'overlay Syncthing opzionale può trasportare quella cartella, ma il percorso non è attivo per impostazione predefinita né è stato collaudato fra computer indipendenti. Un nodo rimasto acceso non eredita automaticamente dati privati, scritture o indirizzo pubblico dell'istanza spenta. La procedura locale è in [PUBLIC-REPLICATION.md](docs/PUBLIC-REPLICATION.md); self-hosting e recupero sono in [SELF-HOSTING.md](docs/SELF-HOSTING.md).

Dire che PolisRossa non deve poter sparire significa costruire più difese, non formulare una promessa fisicamente impossibile. Finché disco, chiavi e backup dipendono da un solo gestore, quel gestore può ancora distruggerli. Revisioni non distruttive, esportazioni deterministiche, copie cifrate presso custodi indipendenti e prove di ripristino riducono il rischio; il kernel locale è soltanto il primo passo. La continuità più forte richiede ancora replica e recupero verificati fra più computer e amministrazioni.

## Proprietà, ruolo del gestore e decisioni

Chi tiene acceso un computer fornisce una risorsa tecnica: non ottiene per questo diritti editoriali, voti aggiuntivi o proprietà sul progetto. Allo stesso modo, il nome tecnico `primary` indica soltanto un'istanza sulla quale possono essere abilitate scritture; non significa autorità politica principale.

Oggi, però, le decisioni e le scritture di produzione dipendono ancora dall'istanza e dalle credenziali che le amministrano. Il contratto di governo e il runtime PR3 sanno verificare localmente elettorati, schede, quorum, durata e revoca, ma non sono attivati nell'interfaccia o in produzione e non fanno ancora rispettare una decisione fra computer indipendenti. Presentare il sistema attuale come proprietà collettiva già garantita sarebbe scorretto.

L'obiettivo di governo è un mandato di custodia **temporaneo, limitato e revocabile**, non un diritto personale permanente all'ultima parola. Per diventare reale dovrà almeno definire:

- chi può proporre, approvare e revocare un mandato e con quale soglia;
- durata, scadenza e poteri di emergenza circoscritti;
- registro verificabile delle decisioni e procedura di contestazione;
- rotazione e recupero delle chiavi senza consegnarle a una sola persona;
- passaggio di servizio e dati pubblici a nuovi custodi;
- trattamento separato dei dati personali, che non possono essere copiati in una rete pubblica per impostazione predefinita.

Fino a quando questi vincoli non saranno attivati e collaudati fra nodi indipendenti, Git conserva la storia tecnica e il forum dell'istanza conserva la discussione comunitaria, ma nessuno dei due realizza da solo una sovranità distribuita.

## Biblioteca persistente, enciclopedia e contenuti condivisibili

Una prima parte di questo lavoro è implementata senza cambiare la struttura principale del sito. L’importatore amministrativo accetta soltanto coppie libro/lingua presenti nel registro dei diritti; salva in PostgreSQL capitoli, attribuzione, licenza, fonte, data di revisione e impronte SHA-256. Le revisioni non vengono sovrascritte. Durante una visita il lettore usa esclusivamente la copia persistente e ricontrolla il permesso: non trasforma l’assenza o la revoca in un recupero remoto del testo. Il registro iniziale comprende una sola edizione inglese, *Free, Fair and Alive* con licenza CC BY-SA 4.0; tutte le altre restano collegate ai rispettivi archivi finché la specifica edizione non viene verificata.

La cronologia non è più soltanto un’unica pagina lunga: tutte le 64 tappe hanno identificatori stabili e pagine condivisibili. Un primo indice enciclopedico riunisce 17 persone citate, con ruoli, eventi e fonti già presenti. Lo stesso insieme di 81 entità può essere importato in modo idempotente nel deposito di conoscenza PostgreSQL ed esportato internamente come bundle pubblico deterministico, senza account o segreti. È un inizio verificabile dell’enciclopedia AgoràNode, non un catalogo completo: organizzazioni, luoghi, opere e molte altre persone devono ancora ricevere un modello e una revisione editoriale uniformi.

Le schede di conoscenza riusano la presentazione della storyline e possono aprire qualsiasi tipo di entità già presente nel deposito, mostrando revisione, fonti, relazioni e provenienza. Eventi e persone della cronologia hanno collegamenti diretti; il contratto pubblico non è più limitato a quei due tipi. Questo primo percorso non aggiunge ancora un indice generale né popola automaticamente gli altri tipi: le schede non sostituiscono il catalogo, la cronologia o i contenuti editoriali già curati di PolisRossa.

La posizione di un libro, la pagina di un evento o di una persona e lo stato di un grafico hanno collegamenti permanenti. I grafici possono inoltre essere esportati come immagine mantenendo insieme titolo, fonte, unità, periodo e collegamento. Per libri, articoli ed eventi la funzione integrata condivide il link; non può impedire che uno screenshot manuale ritagli attribuzione o contesto. Uno screenshot non autorizza a ripubblicare materiale protetto e non sostituisce la fonte.

Restano da realizzare l’ampliamento documentato dell’archivio dei libri, contenuti e indici editoriali per gli altri tipi di entità, e il flusso pubblico per proporre e pubblicare revisioni. Il kernel e l'agente filesystem possono verificare, importare e rilanciare pacchetti finalizzati; i test hanno osservato convergenza, ripartenza, idempotenza e rifiuto di manomissioni fra database locali. L'overlay Syncthing è facoltativo e separato dal normale avvio. Trasporto fra PC indipendenti, scoperta, quorum eseguito da amministrazioni reali, subentro automatico e cifratura end-to-end **non sono ancora collaudati o attivi**.

## Avvio per sviluppo

Servono Node.js 24 e npm.

```sh
npm ci
npm run dev
```

Per verificare una modifica:

```sh
npm run build
npm test
npm run typecheck
```

Il server completo richiede PostgreSQL e le variabili descritte in [DEPLOYMENT.md](docs/DEPLOYMENT.md). GitHub Actions verifica i sorgenti, ma non pubblica il servizio e non dimostra che provider, feed o email funzionino dal vivo.

## Avvio di un server o di un nodo locale

Su un computer con Node.js 24 e Docker Compose, dalla radice del repository:

```sh
node scripts/selfhost.mjs init
node scripts/selfhost.mjs start
node scripts/selfhost.mjs knowledge-import
node scripts/selfhost.mjs status
```

L'installazione predefinita ascolta soltanto sul computer locale e conserva configurazione, dati e chiavi fuori da Git. Fermarla con `node scripts/selfhost.mjs stop` non elimina i volumi. Non usare `docker compose down -v` su un'installazione da conservare.

Un secondo checkout può essere inizializzato come installazione indipendente in sola consultazione, usando la stessa applicazione PolisRossa e un progetto Compose e porte distinti:

```sh
node scripts/selfhost.mjs init https://localhost:9543 mirror --project polisrossa-node2 --http-port 9080
node scripts/selfhost.mjs start
```

`mirror` mette in sola consultazione la stessa applicazione PolisRossa: non crea un tema o un’identità di nodo nuovi e non sincronizza contenuti con altri host. Ogni nuova installazione genera un utente e un database PostgreSQL propri, oltre a volumi Compose separati; le configurazioni preesistenti senza questi campi continuano a usare i nomi storici `polisrossa`. Non pubblicare `.selfhost`, file `.env`, token, chiavi, cookie o copie del database.

**Creare un nodo tematico personalizzato e partecipare con hardware a un pool comune non è ancora supportato dal runtime.** La mappa nella home presenta temi possibili, non installazioni generabili; il portale non registra nodi remoti e gli host non ricevono né replicano automaticamente dati. Oggi puoi ospitare una copia indipendente dell’app esistente, seguendo [SELF-HOSTING.md](docs/SELF-HOSTING.md). [PUBLICATION.md](docs/PUBLICATION.md) descrive il percorso gratuito preparato con un Worker `workers.dev` davanti a Tailscale Funnel, senza inoltri WAN; il Worker non è ancora stato distribuito né attivato. Per creare nodi personalizzati servono prima configurazione runtime del manifesto, isolamento di contenuti e API per istanza, e un registro interoperabile; per condividere risorse hardware servono inoltre protocollo, autorizzazione, monitoraggio, replica e recupero collaudati. Ospitare un server non conferisce potere di governo o proprietà.

## Partecipare

Non serve saper programmare. Una segnalazione utile indica la pagina, ciò che non è chiaro o non funziona e il risultato desiderato; per libri, eventi e dati aggiunge riferimenti verificabili e, quando disponibile, la licenza. Non pubblicare dati personali o documenti riservati.

Le proposte editoriali e di prodotto appartengono al forum dell'istanza comunitaria quando quel servizio è operativo. GitHub conserva modifiche ai sorgenti e revisioni tecniche: puoi usare la matita sul file, creare un fork e aprire una pull request. La [guida ai contributi](CONTRIBUTING.md) spiega entrambi i percorsi anche a chi non li ha mai usati.

## Privacy, sicurezza e licenze

Il codice originale è distribuito con licenza **AGPL-3.0-or-later**. Chi offre online una versione modificata deve rendere disponibili i relativi sorgenti secondo la licenza. [NOTICE](NOTICE) raccoglie avvisi e limiti di garanzia; [TRADEMARKS.md](TRADEMARKS.md) distingue il diritto di modificare il codice dall'uso del nome e del logo per presentare un servizio come ufficiale.

Articoli, fotografie, video, libri, traduzioni e dataset conservano le condizioni dei rispettivi titolari. La consultazione gratuita non implica il diritto di copiarli o redistribuirli. Ogni importazione persistente deve quindi registrare provenienza e diritti, e prevedere rettifica o rimozione.

Per un futuro articolo originale della comunità, l’autore sceglie la licenza pubblica del proprio contributo; non è richiesta compatibilità con Wikipedia. La pubblicazione richiederà inoltre l’accettazione separata del grant AgoràNode versionato e renderà pubblici autore, richiesta, discussione, decisione e predecessore della revisione. Il grant corrente è una bozza tecnica, non consulenza legale né autorizzazione ad aprire ora l’editing pubblico.

Account, sessioni, raccolte, avanzamento di lettura e richieste di ammissione sono dati personali. Non entrano nei checkpoint pubblici e non devono essere replicati fra volontari finché non esistono finalità, consenso o altra base giuridica, controlli di accesso, tempi di conservazione, cancellazione e una cifratura end-to-end realmente verificata. Le password, i token OAuth e le chiavi restano segreti del runtime, mai contenuti del repository.

## Documentazione

| Documento | Contenuto |
| --- | --- |
| [QUALITY.md](docs/QUALITY.md) | Evidenze osservate, verifiche parziali e attività aperte |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Flussi, contratti, persistenza e confini di fiducia |
| [AGORANODE.md](docs/AGORANODE.md) | Formato comune, istanze, governo separato e conservazione |
| [SELF-HOSTING.md](docs/SELF-HOSTING.md) | Server locale, nodo di consultazione, HTTPS, backup e checkpoint |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Configurazione del server e migrazioni |
| [PUBLICATION.md](docs/PUBLICATION.md) | Collaudo di un'istanza pubblica e requisiti operativi |
| [LIBRARY.md](docs/LIBRARY.md) | Catalogo, lettura online, storia, statistiche e provenienza |
| [COMMUNITY.md](docs/COMMUNITY.md) | Account, ammissioni, discussioni e voto |
| [SOURCES.md](docs/SOURCES.md) | Fonti delle notizie e controlli dei collegamenti |
| [LEGAL-OPERATIONS.md](docs/LEGAL-OPERATIONS.md) | Privacy, moderazione, contenuti e responsabilità del gestore |
| [LICENSING.md](docs/LICENSING.md) | Licenze del codice, delle dipendenze e dei contenuti di terzi |
