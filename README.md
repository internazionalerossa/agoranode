# PolisRossa

**Notizie, conoscenza e strumenti comuni.** PolisRossa collega l'informazione quotidiana ai libri, alla storia e ai dati necessari per capirla. Raccoglie fonti socialiste, comuniste, sindacali, anarchiche e anticoloniali di paesi diversi, mantenendo visibili provenienza e collegamento originale. Non chiede a chi legge di aderire a una posizione politica: offre materiali per verificare, confrontare e discutere.

L'orientamento editoriale è dichiarato. Le classificazioni automatiche aiutano a ordinare i contenuti, ma non certificano la verità di una notizia né l'identità politica di una fonte. Le traduzioni possono perdere sfumature; i grafici descrivono misure e associazioni, non dimostrano da soli rapporti causali. Per questo PolisRossa conserva date, unità, definizioni, attribuzioni e collegamenti ai documenti originali.

Il progetto vuole diventare un bene mantenuto da più persone senza trasformare il primo server nel proprietario del sito. Il lavoro attuale prepara questa direzione in modo verificabile: il codice è copiabile, un nodo locale può funzionare in sola consultazione, una release può essere attestata con una firma e il database può essere affidato in copie cifrate. La replica automatica dei contenuti, il subentro fra nodi, il quorum e la cifratura end-to-end **non sono ancora implementati**.

[English](README.en.md) · [Contribuire](CONTRIBUTING.md) · [Architettura](docs/ARCHITECTURE.md) · [Self-hosting](docs/SELF-HOSTING.md) · [Stato delle verifiche](docs/QUALITY.md)

## Come si usa

La rassegna è il punto di partenza per l'attualità. Ricerca, periodo, area, lingua, fonte e temi permettono di passare da una panoramica internazionale alle pubblicazioni desiderate. L'ordine può privilegiare il tempo oppure alternare paesi e testate, così un editore molto prolifico non occupa da solo la pagina. L'Osservatorio usa la stessa raccolta con il periodo “Ultime 6 ore”. Articoli e video si aprono presso chi li ha pubblicati.

La Biblioteca aggiunge contesto. Libri e percorsi introducono temi e autori; Conquiste racconta eventi, persone, repressioni e trasformazioni sociali lungo una cronologia; Dati e grafici permette di confrontare indicatori, paesi e periodi. I tre accessi restano collegati, ma rispondono a compiti diversi: leggere un testo, seguire una vicenda storica o verificare una misura.

Partecipa separa la conversazione dalle decisioni. Un account personale con email confermata serve per raccolte e posizione di lettura; l'ammissione PR2 è un passaggio distinto per scrivere nel forum e votare. Il percorso gratuito scelto usa Gmail SMTP soltanto per conferma dell'indirizzo e recupero password: finché non è configurato e collaudato sull'istanza, gli account restano chiusi. Durante il lancio un codice privato condiviso limita registrazioni e recuperi, ma non prova l'identità e non sostituisce conferma email o limiti anti-abuso. La persona dichiara nome, presentazione e un URL HTTPS pubblico a Facebook, Instagram o al proprio sito: il riferimento è obbligatorio ma non verificato, non viene aperto dal server ed è visibile soltanto al candidato e ai membri che valutano la domanda. Facebook OAuth è facoltativo e prova il controllo dell'account, non l'identità civile; Discord non qualifica la domanda e nessun social sostituisce l'accesso PR1. Discussioni permanenti, proposte ed esiti vivono in PostgreSQL; la chat è intenzionalmente temporanea e rimane nella memoria del singolo processo. Le funzioni disponibili su un'istanza pubblica dipendono dalla sua configurazione e dal collaudo effettivo, non dalla sola presenza del codice.

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
| Serie storiche e metadati | File pubblici caricati per indicatore | Fonte, unità, periodo e valori restano insieme |
| Feed, immagini e documenti recuperati | Cache limitata dei dati pubblici | Destinazioni, redirect, tipi e dimensioni sono controllati |
| Testi dei libri letti online | Revisioni persistenti in PostgreSQL, importate solo da un registro esplicito dei diritti | Nessun recupero remoto durante la visita; le altre edizioni restano nell'archivio originale |
| Account, sessioni, preferiti e avanzamento | PostgreSQL | Privati per account, mai parte della cache pubblica |
| Forum, ammissioni e votazioni | PostgreSQL dell'istanza che accetta scritture | Pubblici o riservati secondo le regole; non replicati fra nodi |
| Chat | Memoria del processo, per finestre di 48 ore | Può sparire prima con un riavvio; non entra nei backup del database |

Il percorso ordinario è `browser → server Node → fonte pubblica` per la consultazione e `browser → server Node → PostgreSQL` per dati personali e comunitari. Il server non accetta dal visitatore destinazioni arbitrarie per il proxy e rende il testo remoto come contenuto inerte, senza eseguire il markup della fonte.

## Condividere la custodia senza inventare una blockchain

La continuità richiede compiti diversi. Copiare il codice, attestare una release, conservare un backup e decidere una modifica non sono la stessa operazione.

Oggi è possibile:

1. clonare il repository e costruire la stessa applicazione;
2. avviare un nodo indipendente in sola consultazione, con database e configurazione propri;
3. firmare un checkpoint deterministico della release con Ed25519 e verificare che un altro nodo abbia già costruito gli stessi file eseguibili;
4. produrre un backup PostgreSQL cifrato con age e consegnarne copie a più custodi;
5. provare il ripristino in un database separato, senza toccare quello operativo.

Il checkpoint attuale è `release-only`: contiene manifesto e firma, non trasferisce codice, libri, forum, account o database. Importarlo registra soltanto provenienza e testa locale della catena. Una chiave pubblica va verificata tramite un canale indipendente; la firma prova la corrispondenza con quella chiave, non la bontà politica o tecnica del software.

I backup age sono leggibili da ogni destinatario la cui chiave pubblica è stata inclusa. Questo permette a più custodi di conservare una copia, ma **non** divide automaticamente il potere di decifrazione fra loro e non sostituisce consenso, replica o controllo degli accessi.

Queste basi non mantengono ancora “un solo sito condiviso” se il server che possiede il database scompare. Un nodo rimasto acceso può offrire il proprio codice e recuperare autonomamente fonti pubbliche; non riceve automaticamente i dati dell'istanza spenta e non ne eredita l'indirizzo. La procedura completa e i comandi sono in [SELF-HOSTING.md](docs/SELF-HOSTING.md).

## Proprietà, ruolo del gestore e decisioni

Chi tiene acceso un computer fornisce una risorsa tecnica: non ottiene per questo diritti editoriali, voti aggiuntivi o proprietà sul progetto. Allo stesso modo, il nome tecnico `primary` indica soltanto un'istanza sulla quale possono essere abilitate scritture; non significa autorità politica principale.

Oggi, però, le decisioni e le scritture dipendono ancora dall'istanza e dalle credenziali che le amministrano. Il progetto non possiede ancora un protocollo capace di far rispettare fra computer indipendenti la durata di un incarico, la sua revoca o una decisione a quorum. Presentare il sistema attuale come proprietà collettiva già garantita sarebbe scorretto.

L'obiettivo di governo è un mandato di custodia **temporaneo, limitato e revocabile**, non un diritto personale permanente all'ultima parola. Per diventare reale dovrà almeno definire:

- chi può proporre, approvare e revocare un mandato e con quale soglia;
- durata, scadenza e poteri di emergenza circoscritti;
- registro verificabile delle decisioni e procedura di contestazione;
- rotazione e recupero delle chiavi senza consegnarle a una sola persona;
- passaggio di servizio e dati pubblici a nuovi custodi;
- trattamento separato dei dati personali, che non possono essere copiati in una rete pubblica per impostazione predefinita.

Fino a quando questi vincoli non saranno implementati e collaudati, Git conserva la storia tecnica e il forum dell'istanza conserva la discussione comunitaria, ma nessuno dei due realizza da solo una sovranità distribuita.

## Biblioteca persistente, enciclopedia e contenuti condivisibili

Una prima parte di questo lavoro è implementata senza cambiare la struttura principale del sito. L’importatore amministrativo accetta soltanto coppie libro/lingua presenti nel registro dei diritti; salva in PostgreSQL capitoli, attribuzione, licenza, fonte, data di revisione e impronte SHA-256. Le revisioni non vengono sovrascritte. Durante una visita il lettore usa esclusivamente la copia persistente e ricontrolla il permesso: non trasforma l’assenza o la revoca in un recupero remoto del testo. Il registro iniziale comprende una sola edizione inglese, *Free, Fair and Alive* con licenza CC BY-SA 4.0; tutte le altre restano collegate ai rispettivi archivi finché la specifica edizione non viene verificata.

La cronologia non è più soltanto un’unica pagina lunga: tutte le 64 tappe hanno identificatori stabili e pagine condivisibili. Un primo indice enciclopedico riunisce 17 persone citate, con ruoli, eventi e fonti già presenti. È un inizio verificabile, non una Wikipedia completa: organizzazioni, luoghi, opere e molte altre persone devono ancora ricevere un modello e una revisione editoriale uniformi.

La posizione di un libro, la pagina di un evento o di una persona e lo stato di un grafico hanno collegamenti permanenti. I grafici possono inoltre essere esportati come immagine mantenendo insieme titolo, fonte, unità, periodo e collegamento. Per libri, articoli ed eventi la funzione integrata condivide il link; non può impedire che uno screenshot manuale ritagli attribuzione o contesto. Uno screenshot non autorizza a ripubblicare materiale protetto e non sostituisce la fonte.

Restano da realizzare l’ampliamento documentato dell’archivio dei libri, le schede per tutti gli altri tipi di entità, snapshot pubblici esportabili, sincronizzazione e subentro automatico fra nodi. Questi ultimi non vanno confusi con backup cifrati o checkpoint firmati: replica automatica, quorum infrastrutturale e cifratura end-to-end **non sono implementati**.

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
node scripts/selfhost.mjs status
```

L'installazione predefinita ascolta soltanto sul computer locale e conserva configurazione, dati e chiavi fuori da Git. Fermarla con `node scripts/selfhost.mjs stop` non elimina i volumi. Non usare `docker compose down -v` su un'installazione da conservare.

Un secondo checkout può essere inizializzato come nodo di sola consultazione con progetto e porte distinti:

```sh
node scripts/selfhost.mjs init https://localhost:9443 mirror --project polisrossa-node2 --http-port 9080
node scripts/selfhost.mjs start
```

Un nodo locale non richiede modifiche al router. [PUBLICATION.md](docs/PUBLICATION.md) descrive il percorso scelto con Tailscale Funnel, senza inoltri WAN; [SELF-HOSTING.md](docs/SELF-HOSTING.md) documenta invece runtime locale, backup, ripristino, checkpoint e l’alternativa diretta che richiederebbe router e firewall. Non pubblicare `.selfhost`, file `.env`, token, chiavi, cookie o copie del database.

## Partecipare

Non serve saper programmare. Una segnalazione utile indica la pagina, ciò che non è chiaro o non funziona e il risultato desiderato; per libri, eventi e dati aggiunge riferimenti verificabili e, quando disponibile, la licenza. Non pubblicare dati personali o documenti riservati.

Le proposte editoriali e di prodotto appartengono al forum dell'istanza comunitaria quando quel servizio è operativo. GitHub conserva modifiche ai sorgenti e revisioni tecniche: puoi usare la matita sul file, creare un fork e aprire una pull request. La [guida ai contributi](CONTRIBUTING.md) spiega entrambi i percorsi anche a chi non li ha mai usati.

## Privacy, sicurezza e licenze

Il codice originale è distribuito con licenza **AGPL-3.0-or-later**. Chi offre online una versione modificata deve rendere disponibili i relativi sorgenti secondo la licenza. [NOTICE](NOTICE) raccoglie avvisi e limiti di garanzia; [TRADEMARKS.md](TRADEMARKS.md) distingue il diritto di modificare il codice dall'uso del nome e del logo per presentare un servizio come ufficiale.

Articoli, fotografie, video, libri, traduzioni e dataset conservano le condizioni dei rispettivi titolari. La consultazione gratuita non implica il diritto di copiarli o redistribuirli. Ogni importazione persistente deve quindi registrare provenienza e diritti, e prevedere rettifica o rimozione.

Account, sessioni, raccolte, avanzamento di lettura e richieste di ammissione sono dati personali. Non entrano nei checkpoint pubblici e non devono essere replicati fra volontari finché non esistono finalità, consenso o altra base giuridica, controlli di accesso, tempi di conservazione, cancellazione e una cifratura end-to-end realmente verificata. Le password, i token OAuth e le chiavi restano segreti del runtime, mai contenuti del repository.

## Documentazione

| Documento | Contenuto |
| --- | --- |
| [QUALITY.md](docs/QUALITY.md) | Evidenze osservate, verifiche parziali e attività aperte |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Flussi, contratti, persistenza e confini di fiducia |
| [SELF-HOSTING.md](docs/SELF-HOSTING.md) | Server locale, nodo di consultazione, HTTPS, backup e checkpoint |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Configurazione del server e migrazioni |
| [PUBLICATION.md](docs/PUBLICATION.md) | Collaudo di un'istanza pubblica e requisiti operativi |
| [LIBRARY.md](docs/LIBRARY.md) | Catalogo, lettura online, storia, statistiche e provenienza |
| [COMMUNITY.md](docs/COMMUNITY.md) | Account, ammissioni, discussioni e voto |
| [SOURCES.md](docs/SOURCES.md) | Fonti delle notizie e controlli dei collegamenti |
| [LEGAL-OPERATIONS.md](docs/LEGAL-OPERATIONS.md) | Privacy, moderazione, contenuti e responsabilità del gestore |
| [LICENSING.md](docs/LICENSING.md) | Licenze del codice, delle dipendenze e dei contenuti di terzi |
