# AgoràNode

AgoràNode è la piattaforma e il sito principale per comunità che vogliono raccogliere informazione, conoscenza, storia e dati su un argomento e governare insieme quello spazio. La sua home è `/`. PolisRossa è la prima istanza tematica, con home dedicata in `/polisrossa`, e conserva quasi tutta la propria interfaccia: l’estrazione della piattaforma rende espliciti i confini senza cancellarne l’identità. AgoràNode non è un’estensione di Wikipedia, non ne adotta i contratti e non cerca compatibilità con le sue licenze o API.

## Il contratto di un nodo

Ogni manifesto `org.agoranode.instance.v1` dichiara identità, argomento, lingua, marchio, tema, repository, regole di governo e le sette capacità richieste dal runtime:

| Capacità | Compito |
| --- | --- |
| Notizie | Raccogliere fonti scritte mantenendo editore, data, lingua e URL originale |
| Video | Presentare canali e filmati senza avvio automatico e senza nascondere la piattaforma di origine |
| Biblioteca | Catalogare opere e offrire lettura interna soltanto quando i diritti della specifica edizione lo consentono |
| Wiki | Dare a entità e argomenti pagine stabili, fonti, relazioni e revisioni |
| Storyline | Ordinare gli eventi del tema e collegarli a persone, luoghi, organizzazioni, opere e concetti |
| Dati | Conservare definizioni, unità, popolazioni, periodi, valori e fonti insieme ai confronti e ai grafici |
| Comunità | Discutere, proporre, votare e governare il singolo nodo con regole pubbliche |

La risposta pubblica `/api/instance` espone soltanto questi metadati non sensibili. Non contiene sali, chiavi di archiviazione, credenziali, contatti privati o variabili del runtime.

## Piattaforma e istanze

Una **istanza** è un nodo dedicato a un argomento, con un proprio ambito di dati e una propria comunità; la topologia di produzione deve poterle assegnare un database separato. Account e votazioni di argomenti diversi non vanno mescolati. Questa scelta riduce gli errori di autorizzazione e permette di spostare o conservare un nodo senza trascinare i dati privati di un altro.

AgoràNode non è una pagina interna o una seconda istanza di PolisRossa. La home principale presenta piattaforma, nodi e coordinamento comune; il futuro forum federale governerà soltanto protocollo e risorse condivise. Il forum PolisRossa governa soltanto PolisRossa. Nel monolite corrente i record federali hanno tabelle e contratti separati, ma la UI e il servizio federale di produzione non sono attivati: questa separazione logica non va descritta come un database federale già operativo.

Il runtime supporta oggi una sola istanza tematica costruita, `polisrossa`. Il manifesto comune è una base verificabile per estrarre le parti riusabili; non è ancora un generatore con cui creare un nodo completo premendo un pulsante. Anche il repository resta `internazionalerossa/polisrossa`: un’eventuale rinomina o separazione del nucleo AgoràNode richiede una decisione esplicita, perché modifica URL, automazioni e riferimenti esistenti.

## PR1, PR2 e PR3

**PR1** è un account personale e non attribuisce voto. **PR2** è l’ammissione a un nodo preciso: una persona partecipa con un voto soltanto all’assemblea di quel nodo. **PR3** è un mandato federale AgoràNode, non un grado personale superiore. Ogni PR2 attivo di qualsiasi nodo ammesso può candidarsi o essere candidato, ma diventa PR3 soltanto attraverso elezione, accettazione, competenze enumerate, scadenza e possibilità di revoca. Ospitare un server, un relay o una copia non dà voti o accesso automatico a nessuno di questi ruoli.

Il contratto di governo e il runtime PostgreSQL/API per attestazioni PR2, elettorato congelato, schede firmate, candidatura, elezione, attivazione, scadenza e revoca PR3 sono implementati e testati localmente. Non sono ancora disponibili l’interfaccia federale, la configurazione di chiavi e nodi reali o l’attivazione in produzione. Nessun ruolo PR3 va quindi descritto come già operativo sul sito pubblico. I limiti e le soglie sono in [GOVERNANCE.md](GOVERNANCE.md).

## Conoscenza pubblica e dati personali

La conoscenza pubblica ha identificatori stabili, revisioni append-only, hash, fonti, attribuzioni e stato dei diritti. Cambiare il puntatore alla revisione corrente non elimina quelle precedenti; trigger PostgreSQL rifiutano aggiornamento o cancellazione ordinari di entità, revisioni, fonti, relazioni e audit. L’importatore amministrativo attuale carica in modo idempotente 64 eventi e 17 persone già presenti nella storyline di PolisRossa. L’esportatore genera un bundle canonico e deterministico con tutte le revisioni e i puntatori correnti, senza account, email, sessioni, preferiti, identità sociali, voti riservati o segreti.

Un kernel separato verifica digest, catena, autorizzazione politica e certificato Ed25519 `2f+1` su un insieme congelato di `3f+1` validatori, quindi importa il bundle in una transazione. L’agente filesystem è stato collaudato fra database locali distinti e può rilanciare solo pacchetti già verificati. Non è un editor pubblico né una rete già operativa: il trasporto opzionale, i computer indipendenti, la scoperta e il failover non sono stati collaudati.

Le licenze non si possono dedurre dalla gratuità o dalla presenza online. Il codice usa AGPL-3.0-or-later, ma questa licenza non rende automaticamente liberi testi, fotografie, traduzioni, libri o dataset. Ogni elemento conserva il proprio stato dei diritti; in assenza di un permesso verificato il nodo può catalogarlo e collegarlo, non ripubblicarlo.

AgoràNode non impone ai nuovi articoli una licenza editoriale unica. L’autore sceglie la licenza pubblica del proprio contributo e la scelta rimane associata a quella revisione. Il contratto tecnico ammette CC0 e licenze Creative Commons BY, BY-SA, BY-NC, BY-NC-SA, BY-ND e BY-NC-ND 4.0, una scelta con diritti riservati oppure una licenza personalizzata con URL HTTPS, testo completo e impronta SHA-256. Alcune scelte non autorizzano il pubblico a creare opere derivate o a redistribuire il testo; il sito deve mostrarne chiaramente gli effetti e non presentare come liberamente riutilizzabile ciò che è soltanto leggibile gratuitamente.

Separatamente, per pubblicare nel nodo l’autore deve accettare la versione esplicita del grant minimo `org.agoranode.contribution-grant.v1`: permesso non esclusivo e senza corrispettivo per conservare, riprodurre, archiviare, migrare il formato e mostrare gratuitamente il contributo, oltre a pubblicare traduzioni o revisioni soltanto dopo l’approvazione democratica dichiarata. La licenza pubblica disciplina il riuso da parte del pubblico; il grant disciplina ciò che l’istanza e i custodi autorizzati possono fare. Il grant corrente ha stato `draft-requires-legal-review-before-community-editing-opens`: è un contratto dati e una bozza di testo, non consulenza legale. Editing e invio pubblico dei contributi devono restare chiusi finché testo, consenso, revoca e rapporto fra i due strumenti non vengono revisionati.

I dati personali seguono una regola diversa: devono poter essere rettificati o eliminati quando previsto. Non vengono resi append-only per inseguire la conservazione del patrimonio pubblico e non entrano nei pacchetti di conoscenza.

## Forum e pubblicazione delle revisioni

Il forum attuale può discutere e votare proposte, ma una decisione non riscrive automaticamente una pagina enciclopedica. Il deposito sa già validare il record di pubblicazione di una revisione approvata, ma non esiste ancora il flusso pubblico che lo crea. Quel collegamento deve comprendere almeno:

1. entità e revisione di partenza indicate nella proposta;
2. testo o dati proposti con fonti e stato dei diritti;
3. discussione e voto secondo le regole dell’istanza;
4. controllo che la revisione di partenza sia ancora corrente;
5. pubblicazione di una nuova revisione, mai sovrascrittura di quella precedente;
6. nuova discussione quando un conflitto cambia materialmente la proposta approvata.

Ogni revisione comunitaria pubblicata deve mostrare l’autore dichiarato, la licenza scelta per il contributo, la versione e il digest del grant accettato, l’hash della revisione precedente, chi ha richiesto il cambiamento, il topic del forum e identificativo, metodo, esito e data della decisione. Una decisione respinta, ritirata, senza quorum o in pareggio resta nella storia del forum ma non autorizza una revisione pubblica. Le revisioni iniziali importate dal repository riportano invece PolisRossa come soggetto editoriale, metodo `repository-review` e stato dei diritti `reuse-not-documented`: non viene inventata retroattivamente una licenza dell’autore.

Questi metadati pubblici non devono contenere email, token OAuth o altri identificativi privati. La pagina di cronologia pubblica di ogni entità deve derivare da tali record; finché il relativo endpoint e l’interfaccia non sono collaudati, la presenza delle colonne nel database non va descritta come una funzione pubblica già disponibile.

Finché questo flusso non è completato e il grant non ha superato la revisione legale, le proposte restano decisioni del forum e l’integrazione nel catalogo passa dall’import amministrativo revisionato nel repository.

## Conservare PolisRossa

PolisRossa mantiene l’identificatore pubblico `polisrossa` e gli identificatori esistenti per eventi, persone, libri, indicatori e collegamenti condivisi. Le normali funzioni non devono offrire una cancellazione distruttiva del patrimonio pubblico. Backup PostgreSQL cifrati, prove di ripristino, checkpoint di release ed esportazioni della conoscenza sono difese complementari.

Non sono una garanzia di indistruttibilità. Finché tutte le copie dipendono da un singolo computer o da persone che condividono le stesse chiavi, possono essere perdute o distrutte. Il kernel locale non dimostra replica automatica fra PC: trasporto e scoperta dei nodi, gestione operativa dei conflitti, failover dell’indirizzo e cifratura end-to-end non sono collaudati o attivi. Non vengono quindi descritti come funzioni disponibili.

## Continuità tecnica di PolisRossa

L’estrazione di AgoràNode non rinomina sali, chiavi del browser, formati di esportazione, rete dei checkpoint, volumi Docker, database o URL pubblici esistenti. Questa è continuità interna di PolisRossa, non compatibilità con Wikipedia. Un futuro nodo userà un proprio namespace; una migrazione di dati sarà un’operazione esplicita e reversibile, non un effetto collaterale del marchio.
