# Rete distribuita AgoràNode

Questa è la specifica tecnica obiettivo per conservare e servire il patrimonio pubblico di un nodo da più computer indipendenti. AgoràNode è il prodotto e sito principale nonché lo spazio di coordinamento; PolisRossa è una diversa istanza tematica. Nel monolite le rispettive home sono `/` e `/polisrossa`, mentre log, forum, dati e autorità restano in ambiti distinti per poter passare in seguito a origini separate. Non è una dichiarazione di disponibilità distribuita: oggi PolisRossa funziona con un database di produzione, backup cifrati, esportazioni deterministiche e checkpoint `release-only`. Un kernel e un agente filesystem della sola conoscenza pubblica sono implementati e testati fra database locali distinti; trasporto fra PC indipendenti, scoperta peer, subentro dell’indirizzo, consenso in rete e cifratura end-to-end non sono ancora collaudati o attivi.

“A prova di bomba”, “indistruttibile” e “senza provider” in senso assoluto non sono requisiti dimostrabili. Incendi, sequestri, collusione, perdita di tutte le chiavi, vulnerabilità comuni, interruzione di Internet o estinzione della comunità possono rendere il servizio irraggiungibile. L’obiettivo serio è eliminare i singoli punti di guasto noti, misurare disponibilità e recupero, mantenere copie verificabili presso amministrazioni indipendenti e degradare in sola lettura senza corrompere la storia.

## Proprietà da garantire

1. Un peer completo sopravvissuto può servire l’ultima conoscenza pubblica verificata anche se gli altri scompaiono.
2. Un peer isolato non può approvare da solo nuove scritture, cambiare regole o diventare “principale”. Quando manca il quorum, lettura sì, finalizzazione no.
3. Ogni byte pubblico replicato è indirizzato dal contenuto e verificato prima dell’uso; un’origine o un relay non è attendibile per il solo fatto di trasportarlo.
4. Account, password, email, sessioni, preferiti, token sociali, IP e messaggi privati non vengono copiati su tutti i computer.
5. Una decisione resta verificabile senza fidarsi del server che la mostra.
6. DNS, relay e interfacce pubbliche sono sostituibili senza cambiare l’identità crittografica dell’istanza.

## Stato reale e stato obiettivo

| Capacità | Oggi | Obiettivo distribuito |
| --- | --- | --- |
| Conoscenza pubblica | Revisioni append-only, export deterministico e import atomico di pacchetti finalizzati fra database locali | Blocchi content-addressed replicati, log Merkle e più peer completi indipendenti |
| Checkpoint | Release `release-only` a firmatario singolo; separatamente, pacchetto conoscenza con catena e certificato Ed25519 `2f+1` testato in locale | Stato pubblico + release + certificato politico e finalità di rete revisionata |
| Scoperta | Cartelle configurate manualmente; overlay Syncthing opzionale non attivo né collaudato fra PC | LAN, inviti manuali, DHT e relay multipli |
| Disponibilità | Dipende dal server/origine attivi | Ingressi multipli e subentro verificato in sola lettura o con quorum |
| Scritture | Database dell’istanza; runtime PR3 testato localmente ma senza UI o attivazione | Decisione certificata + ordinamento BFT dei custodi tecnici |
| Dati personali | PostgreSQL del server | Nodo di riferimento e backup limitati; mai replica pubblica globale |
| Cifratura | TLS e backup age; niente E2E | TLS sempre; eventuale E2E privata solo dopo protocollo e audit dedicati |

## Classi dei dati

### Nucleo pubblico replicabile

Può essere conservato da tutti i peer dopo verifica:

- manifesto dell’istanza, schemi e configurazione pubblica;
- release e provenienza delle build;
- entità di conoscenza, tutte le revisioni, fonti, relazioni e puntatori correnti;
- libri o media soltanto quando la specifica edizione è legalmente ridistribuibile;
- serie statistiche, metadati, grafici riproducibili e loro fonti;
- discussioni dichiarate pubbliche, proposte, elettorati pseudonimi, schede finali pubbliche, certificati e audit;
- tombstone e ricevute di rettifica o rimozione, nei limiti consentiti dalla legge.

Ogni record conserva stato dei diritti e provenienza. “Pubblico” non significa automaticamente liberamente modificabile o riutilizzabile.

### Dati privati e locali

Non entrano nel DHT, nel log pubblico o nei blocchi offerti indiscriminatamente:

- hash delle password, email, sessioni, cookie, IP, user-agent e limiti anti-abuso;
- token OAuth, riferimenti Facebook usati nella valutazione PR2 e documenti d’identità;
- preferiti, avanzamento di lettura e impostazioni personali;
- domande PR2 durante la valutazione, discussioni riservate e dati di moderazione;
- chiavi private, `.env`, segreti SMTP, backup e log operativi;
- chat temporanea, che non diventa archivio attraverso la replica.

Questi dati restano presso il nodo responsabile e in backup cifrati autorizzati. Un futuro failover degli account richiede minimizzazione, chiavi per utente, revoca e valutazione legale separata. Non si può risolvere distribuendo l’intero database a ogni partecipante.

## Blocchi indirizzati dal contenuto

Il kernel attuale scambia un bundle completo `org.agoranode.knowledge-bundle.v1`, ne ricalcola tutti gli indirizzi e lo racchiude in un pacchetto di replica legato a rete, istanza, sequenza e predecessore. Non implementa ancora il recupero granulare, l’albero Merkle o il DHT descritti qui sotto: quelli restano il formato obiettivo per evitare di ritrasferire l’intero patrimonio a ogni revisione.

La rete v1 futura usa SHA-256 per continuità con revisioni ed esportazioni esistenti. Un blocco pubblico contiene:

- formato e versione con namespace `org.agoranode`;
- `networkId`, `instanceId`, tipo e identificatore stabile;
- corpo canonico UTF-8;
- riferimenti agli altri blocchi tramite `sha256:<64 esadecimali>`;
- provenienza, licenza/stato dei diritti e decisione di pubblicazione;
- dimensione e digest calcolati sul byte stream canonico.

Il ricevente applica limiti di dimensione e numero di riferimenti prima di allocare memoria, rifiuta hash diversi, formati sconosciuti, cicli vietati, path o URL non ammessi e markup eseguibile. Un hash dimostra uguaglianza dei byte, non verità, liceità o approvazione politica.

Gli hash delle foglie entrano in un albero Merkle binario con separazione di dominio: `SHA-256(0x00 || lunghezza || blocco)` per una foglia e `SHA-256(0x01 || sinistra || destra)` per un nodo. Le foglie sono ordinate per digest bytewise; un livello dispari promuove l’ultimo hash senza duplicarlo. Formato, ordinamento e regola dispari devono essere fixture condivise fra implementazioni: una variante produce una rete diversa, non un fallback implicito.

## Log pubblico e checkpoint

Il pacchetto locale già implementato cita il checkpoint precedente, il digest della decisione che lo autorizza e un numero di sequenza. Una correzione aggiunge una revisione e sposta il puntatore corrente; non riscrive la revisione precedente. Il futuro log a blocchi aggiungerà l’elenco dei nuovi blocchi e la radice Merkle.

Il checkpoint distribuito sarà un formato v2 distinto dall’attuale snapshot `release-only`. Dovrà contenere almeno:

- rete, istanza, epoca e predecessore;
- radice Merkle del nucleo pubblico e teste dei sottolog;
- digest della release compatibile e delle migrazioni;
- certificato di quorum politico, quando l’ingresso esegue una decisione;
- insieme e mandato corrente dei custodi finalizzatori;
- firme Ed25519 sufficienti secondo il mandato;
- data logica e limiti di compatibilità, senza affidarsi soltanto all’orologio di un host.

Una chiave pubblica va ancorata nel checkpoint precedente o nella carta costitutiva verificata fuori banda. La rotazione è una decisione esplicita. Un peer non sceglie la testa in base al maggior numero di blocchi, alla potenza di calcolo o al capitale.

## Replica e sincronizzazione

Il kernel corrente applica questo flusso a pacchetti completi già presenti su filesystem: valida formato, namespace, digest, catena, autorizzazione e firme prima di importare bundle, testa e ricevuta nella stessa transazione. Ripartenza, duplicati, arrivo fuori ordine, rollback, fork, manomissione e quorum insufficiente sono coperti da test fra database locali. Non scarica peer o URL e non dimostra il comportamento su reti o dischi indipendenti.

Il protocollo minimo fra peer è pull-first e idempotente:

1. scambio di versione, `networkId`, istanza, testa e capacità, senza credenziali private;
2. confronto delle radici e richiesta dei soli checkpoint mancanti;
3. verifica di predecessore, firme, certificati e regole prima di accettare la nuova testa;
4. richiesta parallela dei blocchi mancanti con budget, timeout e limiti per peer;
5. verifica di ogni digest su un’area temporanea;
6. commit atomico del checkpoint soltanto quando tutti i blocchi richiesti sono presenti;
7. offerta dei blocchi verificati agli altri peer secondo quota disco e policy dei diritti.

Riprese parziali usano un bitmap o una lista di blocchi già validati, non file temporanei trattati come contenuto. Peer lenti o corrotti vengono sostituiti senza cancellare dati validi. La raccolta dei rifiuti conserva tutte le revisioni pubbliche finalizzate; può eliminare soltanto cache ricostruibili e blocchi mai finalizzati, secondo quote pubbliche.

### Ordinamento delle scritture

La replica dei byte può essere eventualmente consistente; il puntatore “corrente” e l’ordine delle decisioni no. L’obiettivo usa un piccolo comitato di custodi tecnici con tolleranza bizantina: `3f+1` finalizzatori per tollerare fino a `f` guasti o comportamenti malevoli e almeno `2f+1` firme sullo stesso checkpoint. La configurazione minima seria è quattro finalizzatori amministrati indipendentemente, tre firme per avanzare.

I finalizzatori non decidono il contenuto: ordinano e attestano soltanto ingressi già autorizzati da un certificato politico valido. Non ricevono token, ricompense o voti extra. Se non raggiungono la soglia, le letture continuano ma le scritture si fermano. La sostituzione del comitato avviene con mandato e decisione verificabili secondo [GOVERNANCE.md](GOVERNANCE.md).

Anche PR3 resta distinto dai finalizzatori. PR3 è un mandato federale eletto dai PR2 attivi dei nodi per coordinare AgoràNode; non nasce dall’esecuzione di un server e non assegna automaticamente una chiave BFT. Un custode può essere anche PR3 soltanto se eletto separatamente e rispettando le incompatibilità. Il runtime locale registra nodi ammessi, attestazioni PR2 firmate, elettorati, schede, certificati e mandati PR3 append-only, ma UI e produzione non sono attivate. Questi artefatti appartengono all’ambito federale AgoràNode; il forum e l’autorità PolisRossa rimangono separati.

Questo è un log replicato firmato, non una blockchain: non esistono mining, proof-of-work, proof-of-stake, moneta, mercato delle fee o regola della catena più pesante. Il kernel locale verifica un certificato statico Ed25519 di almeno `2f+1` membri di un set congelato `3f+1`; non esegue un protocollo di consenso in rete. Prima della produzione va scelto e revisionato un protocollo BFT concreto: il certificato non risolve view change, equivocation, clock, denial of service, rotazione o recupero.

## Scoperta e trasporto

Oggi l’agente legge e scrive cartelle locali. L’overlay Syncthing separato può trasferire la sola cartella di scambio e lascia la GUI sul loopback, ma non parte con il normale self-hosting e non è stato configurato o collaudato fra PC del progetto. Discovery globale e relay Syncthing, se scelti, introducono dipendenze e metadati da valutare; non sostituiscono le verifiche del pacchetto. La lista seguente descrive il trasporto nativo obiettivo, non quello disponibile ora.

La scoperta usa più canali, nessuno autorevole da solo:

1. **manuale:** invito firmato con `networkId`, peer ID, chiavi e più multiaddress; è il recupero più semplice quando directory e DNS non funzionano;
2. **LAN:** mDNS trova peer sulla stessa rete, senza pubblicarli su Internet;
3. **DHT Kademlia:** pubblica provider record firmati per blocchi e istanze; serve a trovare candidati, non a stabilire la testa valida;
4. **bootstrap comunitari:** elenco versionato di almeno tre peer in reti e amministrazioni diverse;
5. **relay:** libp2p Circuit Relay v2 per peer dietro NAT, con AutoNAT, identificazione degli indirizzi osservati e DCUtR/hole punching quando possibile.

Il trasporto previsto è libp2p su QUIC/TCP per il demone e WebTransport/WebSocket dove il browser lo consente. TLS/Noise autentica il canale; i digest autenticano il contenuto. Il browser da solo non è una replica durevole affidabile: il pacchetto “scarica e avvia” deve installare un demone locale con dati persistenti, limiti di banda, aggiornamenti firmati e un’interfaccia comprensibile.

NAT e carrier-grade NAT rendono alcuni computer non raggiungibili. Hole punching non è garantito; almeno alcuni peer o relay devono essere pubblicamente raggiungibili. Possono essere ospitati da partecipanti con IPv6 o porte disponibili, associazioni, università o fornitori diversi. Non serve che ogni partecipante modifichi il router, ma una rete Internet raggiungibile senza alcun ingresso pubblico è impossibile.

## Indirizzo stabile senza dipendenza unica

L’identità primaria è `networkId + chiave costituzionale + checkpoint`, non un hostname. Per le persone servono comunque ingressi comodi:

- due o più domini presso registrar/DNS indipendenti;
- record con health check verso più gateway comunitari;
- pagina statica e file di bootstrap replicati su più origini;
- indirizzi `.onion` o equivalenti come canale aggiuntivo, dopo una valutazione operativa;
- deep link AgoràNode o QR dell’invito firmato per il recupero manuale.

Cloudflare Workers e Tailscale Funnel possono essere un ingresso temporaneo di PolisRossa, non il fondamento dell’identità distribuita. Anche con più domini restano dipendenze da registri, ISP, energia, hardware e implementazioni crittografiche. “Provider-neutral” significa sostituibile e provato, non assenza fisica di fornitori.

## Il caso dell’ultimo peer

Se resta un solo computer completo, anche in Uganda, può verificare e mostrare tutta la conoscenza pubblica che ha già replicato. Può essere raggiunto tramite un nuovo indirizzo o un invito manuale se dispone di connettività. Non recupera blocchi che non aveva, non ricostruisce account privati altrui e non finalizza da solo nuove decisioni. Quando tornano abbastanza membri, nodi e custodi, la comunità ricostituisce il quorum attraverso la procedura di emergenza e rotazione delle chiavi.

Questa distinzione tutela il patrimonio senza trasformare il superstite nel proprietario. Promettere scritture democratiche con un solo partecipante contraddirebbe il requisito di controllo comune.

## Modello di minaccia

| Minaccia | Difesa prevista | Limite residuo |
| --- | --- | --- |
| Peer invia blocchi falsi | Hash, formato canonico, limiti e verifica prima del commit | Contenuto falso può essere correttamente hashato; serve provenienza e decisione |
| Host altera voti o conteggio | Schede firmate, elettorato congelato, certificato ricalcolabile | Identità duplicate e coercizione richiedono difese sociali |
| Finalizzatore firma due fork | Checkpoint con predecessore, evidenza di equivocation, soglia 2f+1 | Più di `f` collusi possono bloccare o biforcare |
| DHT avvelenata o eclipse | Bootstrap/manuale multipli, peer diversity, limiti per prefisso/rete | Un utente isolato può ancora essere ingannato senza canale indipendente |
| Relay o DNS scompare | Relay e ingressi multipli, multiaddress firmate | Nessun relay pubblico significa niente accesso per alcuni NAT |
| Chiave rubata | Hardware key, soglia, rotazione e revoca ancorate | Furto della soglia o collusione resta critico |
| Software malevolo | Build riproducibili, review, firme e rollout graduale | La firma non rende sicuro il codice firmato |
| Cancellazione intenzionale | Repliche indipendenti, append-only, backup offline e restore drill | Tutte le copie/chiavi possono comunque essere perdute |
| Dati privati esfiltrati | Separazione dagli oggetti pubblici, minimo privilegio, cifratura backup | E2E e failover privato non sono ancora progettati |
| Meta o altro identity provider blocca il servizio | Chiavi membro, vouching e recupero comunitario nella roadmap | Oggi la domanda PR2 PolisRossa dipende ancora da Facebook OAuth |

## Obiettivi di servizio misurabili

Gli SLO sono obiettivi di progetto, non risultati già osservati:

- almeno **5 peer completi**, gestiti da almeno **3 soggetti** e su **3 reti** diverse;
- almeno **4 finalizzatori** indipendenti, soglia **3**, nessuna persona con più di una chiave;
- disponibilità mensile della consultazione pubblica **99,9%** attraverso almeno un ingresso controllato esternamente;
- 95% dei checkpoint validi ricevuto dai peer online entro **15 minuti**;
- RPO del nucleo pubblico finalizzato **zero checkpoint**; nessuna testa viene accettata senza tutti i suoi blocchi;
- RTO di consultazione **30 minuti** dopo la perdita completa di un gateway, provato e non soltanto stimato;
- corrispondenza di digest e conteggi **100%** fra due implementazioni o build indipendenti sulle fixture normative;
- restore di backup e ricostruzione di un peer da zero provati **ogni trimestre**;
- simulazione semestrale della perdita di DNS, relay, un finalizzatore e una chiave, con rapporto pubblico.

La latenza geografica, il volume dei libri e la banda domestica richiederanno SLO distinti per metadati e oggetti grandi. Se uno SLO non viene misurato, deve comparire come “non verificato”, non verde per impostazione iniziale.

## Fasi di consegna e cancelli

### Fase 0 — Contratti e fixture

Formati canonici, limiti, vettori Merkle, decision envelope, certificati, chiavi e casi negativi. Il contratto di voto, il runtime PR3 e il formato dei pacchetti di conoscenza hanno test locali; vettori Merkle, interoperabilità fra implementazioni, test multipiattaforma e revisione esterna restano aperti. La fase non è completata.

### Fase 1 — Replica locale senza scritture

Tre processi sullo stesso computer scambiano un export sintetico. Si iniettano blocchi corrotti, interruzioni, duplicati, versioni sconosciute e disco pieno. Il database reale non viene sostituito. L’evidenza corrente copre due database distinti, riavvio, fuori ordine, duplicati, manomissione, fork, rollback e quorum insufficiente; non copre ancora tre processi, disco pieno o tutti i criteri d’uscita.

### Fase 2 — Tre computer e reti ostili

LAN, IPv4 con NAT, IPv6, CGNAT, perdita del relay, riavvio e banda limitata. Si misura ricostruzione completa e non si apre Internet in scrittura.

### Fase 3 — Consenso tecnico

Almeno quattro finalizzatori su amministrazioni diverse; crash, partizione, ritardo, firma doppia, leader malevolo e rotazione. Audit crittografico esterno prima di usare dati reali.

### Fase 4 — Pilot pubblico in sola lettura

Cinque peer completi, gateway multipli, monitoraggio, backup e prove di subentro. PolisRossa principale continua a ricevere le scritture con il percorso precedente; le repliche non le inventano.

### Fase 5 — Scritture governate

Solo dopo revisione legale del grant, collaudo identità, migrazione forum, certificati politici, ricorsi ed esercitazione di emergenza. Si abilita una categoria a basso rischio e si osserva un ciclo completo prima dei contenuti essenziali.

### Fase 6 — Ritiro del “principale”

Si elimina il concetto operativo di server principale soltanto dopo almeno due prove di perdita totale del vecchio host, con continuità degli URL, del log e delle letture. Account e dati privati seguono un progetto separato.

Ogni fase richiede criteri di uscita firmati e un rapporto con misure reali. Il numero della fase non può essere avanzato da una modifica alla documentazione.

## Rollback e recupero

Il rollback del software riavvia una release già approvata e compatibile; non arretra la testa pubblica e non cancella blocchi nuovi. Migrazioni della rete e dei dati sono additive finché almeno due release supportate non hanno letto e verificato il nuovo formato. Se una release produce checkpoint incompatibili, si chiudono le scritture, si conserva l’evidenza e si decide un checkpoint di riparazione.

Per un fork, nessun ramo viene eliminato durante l’indagine. Per una compromissione di chiavi, i peer fissano l’ultima testa non contestata, accettano la rotazione approvata e registrano le firme revocate. Per la perdita di un peer, la ricostruzione parte da una carta costitutiva verificata fuori banda e richiede tutti i blocchi della testa: copiare un database non verificato non è ripristino.

Il percorso di ritorno prima della Fase 5 è semplice: disabilitare il demone di replica e continuare a usare l’istanza esistente, senza cancellare volume PostgreSQL, `.selfhost`, backup o chiavi. Dopo l’apertura delle scritture distribuite il ritorno è soltanto in **sola lettura** fino a una decisione di rete; un amministratore non può riportare unilateralmente il sistema a un database precedente.

## Pacchetto semplice per un partecipante

L’esperienza obiettivo è un installer firmato e un comando equivalente a `agoranode join <invito-firmato>` che:

1. mostra identità, spazio, banda, dati pubblici scaricati e ciò che non verrà copiato;
2. verifica carta, release e chiavi prima di avviare;
3. sceglie automaticamente LAN, connessione diretta o relay senza chiedere una regola router nella maggior parte dei casi;
4. scarica un checkpoint e verifica ogni blocco;
5. parte come replica pubblica senza voto né credenziali operative;
6. offre limiti, aggiornamenti, esportazione e disinstallazione che non cancelli per errore le copie richieste dall’utente.

Questa interfaccia non è implementata. Prima di chiamarla “facile” servono test con persone non tecniche, aggiornamento sicuro su Windows/Linux/macOS e una procedura recuperabile quando antivirus, NAT o disco impediscono l’avvio.
