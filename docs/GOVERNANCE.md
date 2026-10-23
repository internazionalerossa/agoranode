# Governo comune di AgoràNode

Questa specifica definisce il modello costituzionale verso cui deve evolvere l’infrastruttura AgoràNode. Trasforma “il sistema è di tutti” in poteri limitati, mandati verificabili e procedure revocabili. **AgoràNode è il nome della tecnologia e del formato condiviso; Agorà è il nodo dedicato alla tecnologia AgoràNode, mentre PolisRossa è un nodo tematico sullo stesso piano, dedicato alla sinistra politica.** La home `/` è il portale per trovare i nodi, non un nodo superiore né un catalogo federato già completo: la ricerca attuale copre i due percorsi locali. Il percorso `/agora` presenta il registro federale e la custodia, ma non offre ancora tutte le superfici editoriali di PolisRossa; `/polisrossa` resta l’unico nodo tematico completo. Non descrive come già operative funzioni che oggi non lo sono: il forum attuale, i tre inviti iniziali PR2 e il singolo database PolisRossa non applicano ancora questo protocollo distribuito.

Il riferimento politico è la proprietà comune con democrazia consiliare. Riprende dai congressi, dalla delega dal basso e dal “centralismo democratico” della tradizione comunista — compresa l’esperienza cinese — l’idea di discutere ampiamente, decidere con procedure note e poi coordinare l’esecuzione comune. Ne rende però verificabili i limiti: la base elegge, vincola e può revocare chi svolge un compito; dissenso, verbali e ricorsi restano pubblicabili; nessuna disciplina organizzativa può cancellare diritti, prove o minoranze. Non viene copiata la struttura statale cinese né un altro apparato esistente. AgoràNode non ammette partito unico, decisioni non rendicontate degli organi dirigenti, incarichi permanenti o un’autorità tecnica sottratta al controllo della comunità. “Gerarchia” significa catena pubblica delle responsabilità, non rango personale.

I riferimenti usati per distinguere meccanismi reali da slogan sono fonti istituzionali pubbliche: l’articolo 3 della [Costituzione della Repubblica Popolare Cinese](https://english.www.gov.cn/archive/law%C2%A0%E2%80%8Bsregulations/201911/20/content_WS5ed8856ec6d0b3f0e9499913.html) lega il centralismo democratico a congressi eletti, responsabilità e supervisione; la descrizione ufficiale delle [sessioni dell’Assemblea nazionale del popolo](https://english.www.gov.cn/archive/china_abc/2014/08/23/content_281474982987272.htm) distingue plenarie, delegazioni, esame dei rapporti e voto; lo [statuto del Partito comunista cinese revisionato nel 2022](https://english.www.gov.cn/news/topnews/202210/26/content_WS635921cdc6d0a757729e1cd4.html) descrive organi eletti, discussione delle candidature e voto segreto. AgoràNode adatta congressi a livelli, responsabilità verso la base, supervisione e unità dell’esecuzione; non importa supremazia statale, nomine dall’alto o subordinazione generale dell’istanza locale.

## Stato e limiti

Il file `app/platform/agora-governance-protocol.ts` implementa un primo contratto v1 isolato e verificabile per:

- elettorati congelati e indirizzati tramite SHA-256;
- schede Ed25519 autenticate da un verificatore esterno;
- un voto per identificatore in ciascuna camera;
- quorum e maggioranze derivati, non dichiarati dal server;
- collegamento del voto di un nodo federato alla decisione della sua assemblea;
- doppia approvazione di persone e nodi per le modifiche del protocollo;
- certificati di quorum deterministici ancorati a un checkpoint precedente.

Il contratto non è collegato al forum, non gestisce iscrizioni o chiavi, non replica dati e non realizza consenso fra computer. È un confine dati da collaudare, non una costituzione già applicata. Il checkpoint attuale `org.polisrossa.public-snapshot` resta `release-only`, con un solo firmatario e senza stato pubblico: non è il checkpoint distribuito descritto qui.

Il sistema deve distinguere l’attribuzione pubblica dei contributi dalla segretezza del voto: interventi e proposte devono essere riconducibili a persone responsabili, mentre il pubblico non deve poter collegare una persona alla sua scelta. Il runtime di voto attuale conserva schede firmate che associano identificatore dell’elettore e scelta; consente verifiche, ma **non realizza il voto segreto** e non deve essere presentato o attivato come tale. Prima di un uso reale occorre un protocollo che verifichi eleggibilità, unicità e risultato senza pubblicare quella corrispondenza, sottoposto a revisione indipendente. Inoltre Facebook OAuth prova il controllo di un account, non l’identità civile: il percorso attuale non applica ancora la richiesta di contributi pubblici attribuiti a persone identificate.

## Invarianti costituzionali

Queste regole prevalgono sui ruoli operativi e non possono essere aggirate configurando un server:

1. **Una persona, un voto nel proprio elettorato.** Denaro, capacità del computer, spazio disco, tempo online, token e numero di copie ospitate non aumentano il voto.
2. **Nessun potere dell’host.** Ospitare, fare relay, backup o manutenzione non attribuisce diritti politici, editoriali o di proprietà.
3. **Assemblea sovrana.** Ogni nodo tematico ha una propria assemblea. Il nodo Agorà, dedicato alla tecnologia e alle questioni comuni dell’infrastruttura AgoràNode, coordina le materie federali; PolisRossa non governa gli altri nodi e la federazione non riscrive i suoi contenuti.
4. **Mandato imperativo e revocabile.** Ogni delega indica oggetto, durata, limiti, rendiconto e procedura di revoca. Non esiste delega generale dell’“ultima parola”.
5. **Rotazione e incompatibilità.** Gli incarichi scadono; controllo, esecuzione tecnica e giudizio sui ricorsi non possono concentrarsi stabilmente nelle stesse persone.
6. **Storia non riscrivibile in via ordinaria.** Proposte, elettorati, schede finali, esiti, revisioni e revoche entrano in registri append-only. Una rettifica crea un nuovo record collegato; gli obblighi legali sui dati personali restano separati.
7. **Trasparenza verificabile.** Regole, testo votato, quorum, conteggio, mandato e atti operativi sono pubblici per le decisioni pubbliche. Email, credenziali, sessioni, token sociali, IP e dati personali non lo sono.
8. **Libertà di lettura, diritti distinti.** La consultazione del patrimonio pubblico resta gratuita. La licenza scelta dall’autore e il grant AgoràNode restano distinti; la governance non inventa diritti su opere di terzi.
9. **Niente distruzione politica del patrimonio.** Il flusso ordinario può sostituire la revisione corrente o pubblicare una rettifica, non cancellare la storia. Un obbligo legale documentato usa una procedura separata e lascia almeno una ricevuta pubblica quando la legge lo consente.
10. **Fail closed.** Firma non valida, elettorato incoerente, quorum mancante, pareggio, doppio voto o fork non risolto bloccano la finalizzazione; non consegnano il potere al server rimasto acceso.

La “proprietà comune” è quindi controllo costituzionale dell’infrastruttura e del governo, non appropriazione dei diritti d’autore individuali. Per renderla opponibile anche fuori dal software servirà un soggetto giuridico senza scopo di lucro o cooperativo, con statuto coerente, contabilità e titolarità collettiva di domini e marchi. AGPL, firme e database da soli non sostituiscono questo lavoro legale.

## Livelli e ruoli

### Persona e assemblea del nodo

**PR1** resta un account personale senza voto. **PR2** è una membership separata e circoscritta a un singolo nodo: dopo l’ammissione prevista da quell’istanza, partecipa alla sua assemblea con un voto. L’assemblea approva contenuti, regole locali, bilanci, incarichi, integrazioni e revoche. Nessun gruppo delegato può ampliare da solo il proprio mandato. La stessa persona può dover dimostrare l’unicità federale se partecipa a più nodi: più membership PR2 non producono più schede nell’elezione federale.

### PR3: mandato federale eletto dalla camera delle persone

La **federazione**, attraverso le camere e i mandati previsti da questa costituzione, decide soltanto sulle materie comuni di AgoràNode: protocollo, regole federali, ammissione e coordinamento dei nodi e risorse condivise. La comunità tematica Agorà può discutere e proporre, ma non sostituisce le camere federali. Non decide le politiche nazionali o tematiche che appartengono alle assemblee dei rispettivi nodi. Un eventuale nodo PolisItalia, per esempio, delibererebbe sulle questioni italiane nella propria assemblea; non è una funzione o un’istanza oggi attiva. Questa delimitazione vale anche per ogni mandato PR3.

Ogni PR2 attivo di un nodo registrato è eleggibile e può essere nominato o autocandidarsi a **PR3**. Non diventa PR3 automaticamente: deve accettare pubblicamente la candidatura e superare un’elezione della camera federale delle persone, formata dai PR2 attivi deduplicati. Ogni candidatura è una decisione separata e legata allo stesso testo/digest che il candidato ha accettato.

PR3 è un mandato per coordinare ed eseguire nel nodo Agorà sulle sole materie federali, non un grado personale superiore. Dura al massimo dodici mesi, indica scopo e limiti, dispone di un solo voto nel consiglio delegato, non aggiunge una seconda scheda alla persona nelle assemblee e pesa zero per hosting, denaro o hardware. Può scadere, essere revocato con soglia più bassa dell’elezione o terminare per dimissioni. Una rielezione richiede un nuovo `mandateId`, una nuova candidatura e una nuova votazione.

Il contratto registra transizioni append-only:

| Da | A | Prova richiesta |
| --- | --- | --- |
| nessun record | `nominated` | membership PR2 attiva di qualsiasi nodo registrato |
| `nominated` | `candidate` | consenso firmato sul digest della candidatura |
| `candidate` | `elected` | certificato `pr3-election` approvato, rete e federazione corrispondenti, termine ≤ 365 giorni |
| `elected` | `active` | accettazione firmata e data interna al mandato |
| `elected`/`active` | `recalled` | certificato `pr3-recall` approvato |
| `elected`/`active` | `resigned` | dimissioni firmate |
| `elected`/`active` | `expired` | raggiungimento della scadenza |
| `nominated`/`candidate` | `withdrawn` | ritiro firmato |

Gli stati terminali non possono tornare attivi. Il record successivo cita il digest del precedente e conserva rete, persona pseudonima, nodo PR2 d’origine, candidatura, elezione e termine. Il proof PR2 strutturale deve essere accompagnato da un’attestazione verificata del nodo emittente: il solo JSON non prova l’ammissione.

### Gruppi di lavoro

Un gruppo riceve un risultato concreto, un budget massimo, permessi minimi, una durata e obblighi di relazione. Può preparare o eseguire una decisione, non sostituire l’assemblea. I gruppi editoriali non ottengono accesso ai segreti operativi; i tecnici non ottengono privilegi editoriali.

### Custodi tecnici

Mantengono release, chiavi operative, repliche, monitoraggio e ripristini. Eseguono decisioni certificate e possono applicare soltanto le misure d’emergenza circoscritte descritte sotto. Almeno due persone devono controllare ogni operazione irreversibile; le chiavi di finalizzazione future devono richiedere una soglia e non risiedere tutte sullo stesso computer. La soglia tecnica non crea una camera politica.

### Collegio di garanzia e audit

Controlla conflitti d’interesse, rispetto del procedimento, bilanci, log, estrazioni dei conteggi e limiti dei mandati. Può sospendere temporaneamente un atto contestato, chiedere una nuova votazione o pubblicare un rilievo; non può scegliere una politica al posto dell’assemblea. I componenti hanno mandato breve, scaglionato e revocabile, non possono essere contemporaneamente custodi principali e si astengono sui casi propri.

### Nodo Agorà e coordinamento federale

La home del servizio è un indice che presenta Agorà — AgoràNode e PolisRossa — AgoràNode come nodi sullo stesso piano. Il nodo tematico Agorà discute e propone sulle questioni dell'infrastruttura; le decisioni **vincolanti a livello federale** su protocollo, interoperabilità, sicurezza, namespace, ammissione/coordinamento dei nodi e risorse condivise spettano alle camere federali secondo le regole che seguono. Né il nodo Agorà né la federazione decidono le politiche locali o tematiche degli altri spazi. Ogni nodo mantiene contenuti, licenze, ammissioni e forum propri. Un account o ruolo PolisRossa non diventa automaticamente un account o ruolo nel nodo Agorà. Le decisioni federali hanno due camere:

- **camera delle persone:** tutti i PR2 attivi dei nodi registrati, deduplicati a una persona un voto; elegge e revoca PR3;
- **camera dei nodi:** un nodo ammesso, un voto, espresso soltanto in esecuzione di una decisione verificabile della propria assemblea.

Il voto della camera dei nodi non è la firma di chi ospita il server. Il contratto v1 richiede `mandateDecisionDigest` e un verificatore separato del mandato locale. Una capacità maggiore non produce più seggi.

## Elettorato e identità

L’elettorato viene congelato all’apertura della votazione, ordinato in modo canonico e legato a un digest. Ammissioni, sospensioni e rotazioni successive valgono dalla consultazione seguente. Questo impedisce di aggiungere votanti opportunisticamente durante lo scrutinio. È diverso dal comportamento del forum attuale e richiede una migrazione esplicita, non un cambio silenzioso.

PolisRossa usa oggi Facebook OAuth solo come prova temporanea del controllo di quell’account per la domanda PR2; non certifica l’identità civile e non prova l’unicità globale. Il requisito operativo attuale non viene rimosso da questa specifica. La federazione, però, non può dipendere stabilmente da Meta o da un altro fornitore unico. La policy futura deve combinare:

1. una chiave membro generata localmente, con rotazione e revoca pubbliche;
2. ammissione e attestazioni personali da membri già responsabili, con conflitti dichiarati;
3. recupero comunitario a soglia, senza consegnare al gestore una password universale;
4. un identificatore federale pseudonimo per epoca, capace di rilevare iscrizioni multiple senza pubblicare email o profili sociali;
5. ricorso umano e rettifica, perché nessun algoritmo di “unicità” è infallibile.

Il protocollo può impedire due schede con lo stesso identificatore e la stessa camera; non può dimostrare da solo che due identità digitali non appartengano alla stessa persona. Attacchi Sybil richiedono procedura sociale, audit incrociato fra nodi, limiti di crescita e, in futuro, primitive crittografiche revisionate. Fino a quel collaudo non va dichiarato “una persona, un voto” a livello federale come garanzia tecnica assoluta.

## Classi di decisione e soglie v1

Il quorum include sì, no e astensioni. La maggioranza si calcola sui soli sì e no. Una soglia del 50,01% significa maggioranza stretta; il 66,67% approssima due terzi. Ogni camera deve anche raggiungere il minimo di sì indicato. Un pareggio respinge, l’assenza di quorum non produce alcuna decisione.

| Classe | Ambito | Quorum | Approvazione | Minimo iniziale |
| --- | --- | --- | --- | --- |
| Ordinaria | Nodo, camera persone | 35% | 50,01% | 3 elettori, 2 sì |
| Costituzionale | Nodo, camera persone | 60% | 66,67% | 5 elettori, 3 sì |
| Nomina a mandato | Nodo, camera persone | 50% | 50,01% | 5 elettori, 3 sì |
| Revoca del mandato | Nodo, camera persone | 35% | 50,01% | 3 elettori, 2 sì |
| Ricorso | Nodo, camera persone | 40% | 50,01% | 5 elettori, 3 sì |
| Ratifica d’emergenza | Nodo, camera persone | 35% | 50,01% | 5 elettori, 3 sì |
| Elezione PR3 | Federazione, PR2 attivi | 50% | 50,01% | 7 persone, 4 sì |
| Revoca PR3 | Federazione, PR2 attivi | 35% | 50,01% | 5 persone, 3 sì |
| Politica federale | Persone e nodi | 50% entrambe | 60% entrambe | 7 persone/4 sì; 3 nodi/2 sì |
| Modifica del protocollo | Persone e nodi | 60% entrambe | 66,67% entrambe | 7 persone/4 sì; 3 nodi/2 sì |

Le comunità con meno di cinque membri possono discutere e assumere decisioni ordinarie, ma non modificare da sole la costituzione v1. L’avvio usa una carta costitutiva pubblica e scade quando viene raggiunto il minimo: non concede ai fondatori un seggio permanente.

L’elezione PR3 v1 è un voto sì/no sul mandato di una persona, non una lista bloccata: ogni candidato che supera quorum e soglia ottiene soltanto il mandato descritto. Un futuro numero chiuso o metodo proporzionale richiede una nuova classe di scheda e una modifica del protocollo; non può essere simulato scegliendo vincitori dopo il voto.

## Consultazione, decisione ed esecuzione comune

Prima del voto, gruppi di base e nodi possono pubblicare emendamenti, mandati e posizioni di minoranza. Durante il mandato, PR3 deve consultare i nodi interessati, votare secondo il mandato ricevuto e rendicontare ogni scostamento. Dopo una decisione valida, i gruppi esecutivi la applicano in modo coordinato finché non viene sospesa da un ricorso o sostituita da una nuova decisione.

Questa disciplina riguarda l’esecuzione, non la coscienza o la parola: nessuno perde PR1/PR2 per aver votato contro, documentato un dissenso o proposto una revisione. Un ordine non tracciato, contrario alla costituzione o oltre il mandato non è “centralismo democratico” applicabile dal software e deve essere rifiutato.

## Ciclo di una decisione

1. La proposta pubblica testo immutabile, digest, fonti, impatto sui dati, responsabili, costo, piano di verifica e rollback.
2. Vengono dichiarati classe, base checkpoint, elettorato, finestra di discussione, voto e ricorso. Il server non può abbassare le soglie codificate per quella classe.
3. Eventuali emendamenti materiali generano un nuovo digest e riaprono la discussione. Non si vota un titolo per applicare poi un testo diverso.
4. **Limite del protocollo attuale:** ogni scheda v1 firma dominio, rete, decisione, camera, identità e scelta con la chiave congelata nell’elettorato, quindi l’identificatore dell’elettore è collegabile alla scelta. Questo formato non soddisfa il requisito di voto segreto e va sostituito prima di un uso reale.
5. Un futuro protocollo dovrà consentire di verificare firme o prove di eleggibilità, doppioni, quorum e conteggio senza rendere pubblica la relazione fra identità e scelta; non è ancora implementato.
6. Una modifica operativa viene eseguita soltanto se il certificato è approvato, il termine di ricorso è trascorso e la testa da modificare coincide ancora con `baseCheckpointId`.
7. Il checkpoint successivo collega decisione, output verificato e predecessore. Un errore produce una nuova decisione o un rollback tecnico documentato, mai la riscrittura del certificato.

Il certificato `org.agoranode.governance-quorum-certificate.v1` contiene tutte le schede finali firmate. Questa scelta è semplice da verificare ma rende pubblica la relazione fra identificatori politici pseudonimi e scelte; non offre voto segreto e non è adatta a un’attivazione reale secondo il requisito del progetto. Aggregazione, ricevute e prove verificabili senza rivelare il voto richiedono un protocollo diverso, revisione indipendente e prove di sicurezza prima dell’uso.

## Mandati, rotazione e revoca

Ogni mandato registra almeno scopo, permessi, inizio, termine non superiore a dodici mesi, responsabili, supplenti, incompatibilità, indicatori e registro delle azioni. La stessa persona non può ricoprire lo stesso incarico esecutivo per più di due mandati consecutivi senza un intervallo. La revoca può essere proposta da almeno il 10% dell’elettorato o dal collegio di garanzia per violazione documentata; usa una soglia non più alta della nomina, così la carica non diventa più forte di chi l’ha conferita.

La perdita di fiducia politica revoca il mandato ma non cancella gli atti precedenti. Compromissione della chiave sospende subito il permesso tecnico e apre una verifica; non decide automaticamente la responsabilità della persona.

## Ricorsi

Un ricorso ordinario può essere presentato entro quattordici giorni; violazioni di diritti, frode o dati personali non decadono solo per il termine tecnico. Tre o più garanti senza conflitto verificano ricevibilità e possono sospendere per massimo sette giorni l’esecuzione, pubblicando ragione e prove. La decisione finale torna all’assemblea con la classe originaria; se il ricorso riguarda il procedimento costituzionale, si applica la soglia costituzionale. Il collegio non può trasformare una sospensione in veto permanente.

## Emergenze

Un’emergenza è un danno tecnico attivo: furto di chiavi, violazione di dati, corruzione, malware o indisponibilità grave. Due custodi e un garante possono fermare scritture, isolare un peer, ruotare una credenziale compromessa o ripristinare una release già approvata. Ogni azione è firmata, motivata, limitata al minimo e scade dopo 72 ore.

L’emergenza non può cambiare costituzione, ammettere o espellere membri, alterare voti, cancellare il log pubblico o approvare contenuti. Entro 72 ore l’assemblea ratifica; in caso contrario si annulla ciò che è reversibile e resta il rapporto di incidente. Quando il quorum politico non è raggiungibile, la rete rimane in sola lettura: la continuità delle scritture non vale più dell’integrità.

## Fork, equivoci e cattura

Non esiste regola “vince la catena più lunga”, né voto per potenza o capitale. Due checkpoint validi con lo stesso predecessore sono un fork. I peer conservano entrambi, bloccano l’avanzamento automatico, mostrano l’incidente e verificano quali firmatari abbiano attestato rami incompatibili. Il recupero richiede una decisione della stessa classe o superiore e un checkpoint di ricongiungimento che citi entrambi i rami; nessun amministratore può scegliere in silenzio.

Per ridurre cattura e collusione servono custodi appartenenti a organizzazioni e reti indipendenti, chiavi hardware ove possibile, mandati scaglionati, audit periodici, ripristini provati e piena esportabilità. Nessun numero di firme elimina coercizione, accordi segreti o errori collettivi: le difese sono separazione dei poteri, trasparenza e possibilità effettiva di revoca.

## Proprietà degli asset critici

Repository, dominio, marchio, fondi e chiavi non devono dipendere da un account personale non revocabile. La configurazione obiettivo richiede:

- organizzazione del codice con almeno tre amministratori nominati e protezione dei branch;
- dominio intestato al soggetto comune, registrar e DNS sostituibili, contatti e scadenze pubblicamente auditabili;
- firma delle release e dei checkpoint con chiavi a soglia, separate dalle chiavi TLS;
- spese approvate e rendicontate, senza acquistare servizi attraverso una decisione tecnica implicita;
- inventario dei privilegi con data di scadenza e prova semestrale di recupero.

Fino a quando tali asset appartengono materialmente a singoli account, la proprietà comune è un obiettivo documentato, non un fatto garantito dal software.

## Criteri per l’apertura reale

Il protocollo distribuito può governare scritture soltanto dopo test tra computer indipendenti, revisione crittografica esterna, esercitazione di revoca/rotazione, simulazione di fork, verifica privacy e approvazione della carta costitutiva. Prima di allora il modulo v1 resta sperimentale e non sostituisce le regole operative in `COMMUNITY.md`.

La rete, le classi dei dati, i guasti ammessi e le prove di disponibilità sono specificati in [DISTRIBUTED-NETWORK.md](DISTRIBUTED-NETWORK.md).

## Confine tra Agorà, federazione e custodia tecnica

Agorà è un **nodo tematico** dedicato alla tecnologia AgoràNode, non il titolare automaticamente superiore a PolisRossa e agli altri spazi. Il portale dei nodi `/` non è un'assemblea. Le decisioni sul codice e sulle regole comuni seguono il protocollo di governance federale, con competenze e mandati espressi: non acquisiscono validità per il fatto di essere pubblicate sulla pagina `/agora`.

Un **peer** è un computer che conserva o serve parte della rete; un **finalizzatore** è un incarico tecnico attribuito secondo regole specifiche. Nessuno dei due corrisponde a un PR2 o PR3 per il solo fatto di esistere. La disponibilità di molti computer gestiti dalla stessa persona non produce più schede.

Per rendere reali i mandati occorre un percorso verificabile da proposta e approvazione politica a certificato di autorizzazione e a transizione finalizzata mediante consenso tecnico. Oggi i contratti crittografici sono locali, non una rete elettorale BFT operativa. Alla perdita del quorum restano valide le ultime decisioni finalizzate e le copie pubbliche rimangono leggibili; un host superstite non assume automaticamente il potere di emettere una nuova storia ufficiale.

Le regole anti-Sybil, l'identità portabile, le chiavi di voto e l'eventuale segretezza delle schede richiedono review di sicurezza e privacy separata. Il regime di pubblicazione attuale delle schede nominative non va esteso inconsapevolmente a una rete replicata in modo irreversibile. Vedere [PEER-OWNED-ARCHITECTURE.md](PEER-OWNED-ARCHITECTURE.md) e [DECENTRALIZATION-ROADMAP.md](DECENTRALIZATION-ROADMAP.md).

## Ricerca delle fonti, assenso e voto: meccanismi diversi

Un'assemblea può stabilire regole editoriali e incarichi, ma non rendere «vera» un'affermazione con un voto. Le revisioni Atlante richiedono fonti, provenienza, licenze e un processo di contestazione appropriato; vedi [EDITORIAL-GOVERNANCE.md](EDITORIAL-GOVERNANCE.md). Il consenso editoriale basato su ragioni, l'assenso sociocratico per operazioni reversibili, la maggioranza politica e il quorum tecnico BFT risolvono problemi distinti. Nessuno dei quattro deve sostituire automaticamente gli altri.

Le criticità di cattura delle chiavi, asimmetria di risorse, voto non segreto, pressione di gruppo e dipendenze commerciali sono raccolte in [CRITICAL-DESIGN-REVIEW.md](CRITICAL-DESIGN-REVIEW.md). Queste aggiunte definiscono vincoli proposti e controlli da implementare, non cambiano automaticamente le regole operative del forum già avviato.
