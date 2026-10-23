import {validateAtlas,type AtlasEntry} from '../lib/thematic-atlas';

const repo='https://github.com/internazionalerossa/agoranode';
const doc=(name:string)=>repo+'/blob/main/docs/'+name;
const pull=(id:number)=>repo+'/pull/'+id;

/**
 * First-party, publicly readable seed of Agorà's technology Atlante.
 *
 * The seed is checked into the AgoraNode source and shipped with its client,
 * so the first pages remain readable from an independent application gateway.
 * It is a repository-reviewed ALPHA editorial corpus, not a PR2-approved
 * constitutional decision or proof of network consensus.
 *
 * PolisRossa remains a separate community and legacy data owner. Agorà is the
 * technological genesis/reference node for subsequent communities.
 */
export const AGORA_ATLANTE:readonly AtlasEntry[]=[
  {
    id:'il-nodo-origine',kind:'concept',title:'Agorà: il nodo origine della piattaforma',
    summary:'Agorà è il nodo tematico che sviluppa, racconta e mette alla prova la tecnologia comune. Da questa origine nascono gli strumenti condivisi, mentre ogni altra comunità conserva contenuti e decisioni proprie.',
    tags:['agora','origine','software libero','comunita'],timeline:null,
    sections:[
      {heading:'Un luogo in cui capire il sistema',paragraphs:[
        'Un sistema comune non deve avere una comunità proprietaria di tutte le altre. Agorà è il primo nodo di riferimento per documentazione, prove tecniche, discussioni sulla piattaforma e proposte di interoperabilità. I suoi contenuti possono spiegare una regola condivisa, ma la sola pubblicazione su Agorà non equivale alla sua approvazione federale.',
        'Il portale AgoràNode indica gli spazi disponibili. PolisRossa è il progetto precedente da cui ereditiamo soluzioni grafiche, cataloghi e molti controlli applicativi. La continuità del codice non trasferisce ad Agorà la proprietà dei dati o i diritti di voto delle persone presenti in altre comunità.',
      ]},
      {heading:'L’alpha che si può verificare',paragraphs:[
        'La prima versione di Agorà ha una rassegna RSS e video con fonti esplicite, un Atlante di voci originali e un Percorso che racconta le decisioni tecniche. Il laboratorio permette di comporre bozze visuali. L’autenticazione autonoma PR1/PR2, il forum interamente isolato e il consenso BFT di rete non sono ancora funzioni attive del nodo Agorà.',
      ]},
    ],
    sources:[
      {label:'AgoràNode — visione della piattaforma',url:doc('AGORANODE.md'),context:'Specifica di prodotto'},
      {label:'Architettura custodita dai partecipanti',url:doc('PEER-OWNED-ARCHITECTURE.md'),context:'Ruoli e confini fra nodi'},
    ],related:['polisrossa-laboratorio','governo-delle-comunita','nodo-tematico'],
  },
  {
    id:'polisrossa-laboratorio',kind:'milestone',title:'Da PolisRossa al motore condiviso',
    summary:'La prima applicazione tematica ha fatto emergere il valore di unire rassegna, biblioteca, timeline, grafici e partecipazione. Il passaggio ad Agorà consiste nell’estrarne un linguaggio comune senza distruggere la comunità originaria.',
    tags:['polisrossa','prototipo','frontend','compatibilita'],
    timeline:{
      period:'Prima fase · laboratorio PolisRossa',place:'Dal prototipo alla piattaforma',order:10,
      introduction:'La storia tecnica comincia da un sito tematico già ricco di pagine, rassegne e materiali: PolisRossa. Invece di riscriverlo o cancellarne l’identità, il progetto ne conserva URL, dati e contributi, trasformando i componenti che funzionano in un motore riutilizzabile. Questo è il primo passaggio dal singolo sito a una famiglia di comunità.',
    },
    sections:[
      {heading:'Perché il primo prototipo conta',paragraphs:[
        'PolisRossa offre un modello visivo concreto: informazioni e notizie in primo piano, periodi raccontati come una storia, schede documentarie e filtri sulla biblioteca. Questa esperienza serve da banco di prova per la leggibilità delle voci dell’Atlante e per una navigazione utilizzabile anche senza conoscere software wiki.',
        'Il suo dominio applicativo resta distinto: il catalogo delle sinistre non viene copiato nel nodo tecnologico, e una decisione PR2 di PolisRossa non assume automaticamente valore per Agorà.',
      ]},
    ],sources:[
      {label:'Progetto PolisRossa e stato dell’alpha',url:doc('AGORANODE.md'),context:'Funzioni e compatibilità'},
    ],related:['il-nodo-origine','nodo-tematico','racconto-e-atlante'],
  },
  {
    id:'separare-software-e-comunita',kind:'milestone',
    title:'Separare piattaforma, nodi e computer',
    summary:'Il primo cambiamento architetturale distingue il software AgoràNode, le comunità tematiche e i computer dei volontari. Non sono sinonimi: ospitare un nodo non attribuisce potere editoriale né politico.',
    tags:['architettura','peer','comunita','ottobre 2026'],
    timeline:{
      period:'22 ottobre 2026',place:'Identità e architettura',order:20,
      introduction:'Le prime decisioni sul nuovo assetto hanno separato ciò che prima rischiava di sovrapporsi: il software, il portale, la comunità e il peer fisico. Nascono manifesti tematici e un registro locale dei nodi. La scelta rende possibile immaginare molte comunità con lo stesso frontend, ma non prova ancora che ogni database e ogni autenticazione siano già indipendenti.',
    },
    sections:[
      {heading:'Tre identità e tre responsabilità',paragraphs:[
        'Il software definisce contratti, formati e componenti. Il nodo tematico ospita persone, fonti e decisioni nel proprio ambito. Un peer mette a disposizione risorse fisiche e conserva copie autorizzate. Uno stesso PC può servire più comunità, mentre una comunità può sopravvivere a più PC.',
      ]},
      {heading:'Che cosa è già nel codice',paragraphs:[
        'I manifesti Agorà e PolisRossa e il registro locale permettono di distinguere i percorsi. La rete globale e il controllo democratico dei nuovi spazi richiedono ancora database, identità e certificazioni non deducibili dai soli manifesti.',
      ]},
    ],sources:[
      {label:'PR #2 — Fondazione multi-nodo',url:pull(2),context:'Cambiamento integrato nel repository'},
      {label:'Specifica peer-owned',url:doc('PEER-OWNED-ARCHITECTURE.md'),context:'Modello operativo'},
    ],related:['il-nodo-origine','nodo-tematico','governo-delle-comunita'],
  },
  {
    id:'replica-verificabile',kind:'milestone',
    title:'Dalle copie locali allo scambio verificabile',
    summary:'AgoràNode ha introdotto un trasferimento HTTP fra peer conosciuti di pacchetti pubblici già firmati. La verifica dei byte è distinta dal consenso con cui una comunità decide cosa pubblicare.',
    tags:['peer','replica','firme','rete','distribuzione'],
    timeline:{
      period:'22 ottobre 2026',place:'Primo trasporto pubblico',order:30,
      introduction:'Dopo la separazione fra comunità e server, il passo seguente riguarda la custodia: permettere a computer distinti di trasferire pacchetti pubblici con verifiche di integrità e di spazio. Si costruisce il primo collegamento diretto fra peer noti. La rete non è ancora in grado di scoprire autonomamente tutti i partecipanti né di sostituire un protocollo di consenso.',
    },
    sections:[
      {heading:'Cosa si trasferisce',paragraphs:[
        'La replica iniziale riguarda soltanto pacchetti di conoscenza pubblica, con formato, network ID, space ID e certificati controllati prima dell’importazione. Account, sessioni, chat private e tabelle del forum non devono essere pubblicate sull’endpoint dei peer.',
      ]},
      {heading:'La differenza fra sicurezza e disponibilità',paragraphs:[
        'Verificare hash e firme impedisce di accettare byte diversi da quelli dichiarati, ma non impedisce a un computer di spegnersi, interrompere lo scambio o trattenere informazioni. Per sopravvivere alla perdita dell’host iniziale servono custodi indipendenti, gateway e verifiche effettive attraverso reti differenti.',
      ]},
    ],sources:[
      {label:'PR #3 — Peer exchange',url:pull(3),context:'Trasporto HTTPS verificato'},
      {label:'Procedura di scambio pubblico',url:doc('PEER-EXCHANGE.md'),context:'Limiti e prove multi-host'},
    ],related:['separare-software-e-comunita','storage-leggero','custodia-e-privacy'],
  },
  {
    id:'storage-leggero',kind:'milestone',
    title:'Conservare i blocchi, non ricopiare l’archivio',
    summary:'L’ottimizzazione del trasferimento evita di riscaricare pacchetti invariati. Un codec sperimentale divide gli oggetti pubblici in blocchi identificati da SHA-256, riutilizzabili fra revisioni.',
    tags:['storage','deduplicazione','cas','banda','efficienza'],
    timeline:{
      period:'22 ottobre 2026',place:'Efficienza misurabile',order:40,
      introduction:'Una rete di computer economici non può funzionare copiando ogni volta l’intero archivio. Si introduce quindi una regola elementare: se un oggetto pubblico è già presente e valido, non viene scaricato una seconda volta. Poi il progetto prova blocchi deterministici per riutilizzare le parti inalterate di documenti diversi. Il risultato è un prototipo misurabile, non ancora un nuovo protocollo globale di storage.',
    },
    sections:[
      {heading:'La deduplicazione non elimina il costo fisico',paragraphs:[
        'Ogni blocco è identificato dal proprio contenuto e il file intero è ricostruito verificandone nuovamente la firma digitale del contenuto. Una piccola modifica può trasferire molti meno byte, ma la percentuale di riuso dipende dalla natura dei file; un test sintetico non prova le prestazioni di video, database reali o infrastrutture continentali.',
      ]},
      {heading:'Il confine da proteggere',paragraphs:[
        'La stessa deduplicazione, se applicata senza regole ai dati privati, può rivelarne l’esistenza. Il codec attuale ammette soltanto oggetti classificati come pubblici e richiede un’autorizzazione indipendente prima di conservarli in un archivio durevole.',
      ]},
    ],sources:[
      {label:'PR #4 — Lean Storage',url:pull(4),context:'Codec e benchmark sintetico'},
      {label:'Progetto di conservazione leggera',url:doc('LEAN-STORAGE.md'),context:'Limiti del CAS e quote'},
    ],related:['replica-verificabile','custodia-e-privacy','nodo-tematico'],
  },
  {
    id:'racconto-e-atlante',kind:'milestone',
    title:'Le pagine diventano un racconto navigabile',
    summary:'La base della conoscenza e la timeline sono due cose diverse: tutte le voci pubblicate devono essere cercabili, mentre il Percorso principale contiene solo le tappe scelte dalla comunità e introdotte con un racconto.',
    tags:['atlante','wiki','timeline','editor','storia'],
    timeline:{
      period:'22–23 ottobre 2026',place:'Pagine, ricerca e partecipazione',order:50,
      introduction:'Il lavoro sul modello editoriale ha distinto la pagina enciclopedica dalla selezione che compare nella timeline. Non basta mettere un titolo come collegamento: ogni tappa deve avere un testo introduttivo capace di collocarla in una storia più ampia. In PolisRossa questa forma narrativa era già leggibile; Agorà la assume come componente comune e la mette in relazione con ricerca, schede e proposte PR2.',
    },
    sections:[
      {heading:'Atlante e Percorso non coincidono',paragraphs:[
        'Una voce dell’Atlante conserva identità, fonti, testo, collegamenti e revisioni. Il Percorso seleziona alcune di quelle voci e aggiunge un periodo, un ordine e un’introduzione indipendente. Escludere una pagina dal Percorso non la cancella e non deve renderla invisibile alla ricerca.',
      ]},
      {heading:'Come si propone un cambiamento',paragraphs:[
        'Il percorso di partecipazione previsto è accessibile dal browser: si seleziona una tappa, si scrive una proposta, si allegano fonti e si discute nel forum del nodo. Il software deve verificare che la decisione PR2 riguardi esattamente quella revisione e quel testo narrativo prima di pubblicare un cambiamento.',
      ]},
    ],sources:[
      {label:'PR #5 — Ricerca e proposte',url:pull(5),context:'Modello pagine e timeline'},
      {label:'Grafo delle conoscenze',url:doc('NODE-KNOWLEDGE-GRAPH.md'),context:'Requisiti editoriali e UX'},
    ],related:['il-nodo-origine','governo-delle-comunita','biblioteca-tecnica'],
  },
  {
    id:'rassegna-delle-fonti',kind:'milestone',
    title:'Agorà acquisisce una rassegna propria',
    summary:'Il nodo tecnologico non è più solo una pagina sulla federazione: offre fonti originali di software libero, video e conferenze, con preferenze personali che non cambiano ciò che vedono gli altri.',
    tags:['rss','news','video','libero','personalizzazione'],
    timeline:{
      period:'23 ottobre 2026',place:'Rassegna e primo laboratorio',order:60,
      introduction:'L’alpha prende forma come sito tematico da consultare: i feed tecnologici affiancano video, registrazioni e collegamenti alle dirette dei produttori originali. L’utente può leggere tutte le fonti oppure selezionare le preferite; gli account possono conservarne la scelta in uno spazio privato. I collegamenti esterni restano distinti dalle opere che AgoraNode possiede il diritto di ospitare.',
    },
    sections:[
      {heading:'Fonti e provenienza davanti agli algoritmi',paragraphs:[
        'Le notizie dovrebbero mostrare titolo, testata, paese e data verificabile, con criteri cronologici trasparenti. Non serve un algoritmo opaco di coinvolgimento per proporre un’informazione di qualità: un visitatore può scegliere le proprie fonti e passare immediatamente alla rassegna completa.',
      ]},
      {heading:'Conservare ciò che è autorizzato',paragraphs:[
        'Il feed indicizza metadati e collegamenti agli editori. Un articolo di terzi non diventa automaticamente testo pubblico replicabile; neppure un collegamento a una diretta equivale alla conferma che la trasmissione sia in corso.',
      ]},
    ],sources:[
      {label:'PR #7 — Rassegna e laboratorio Agorà',url:pull(7),context:'Funzioni della pagina tecnologica'},
      {label:'Guida al modello di conoscenza',url:doc('AGORANODE.md'),context:'Feed e biblioteca'},
    ],related:['il-nodo-origine','biblioteca-tecnica','custodia-e-privacy'],
  },
  {
    id:'nodo-tematico',kind:'guide',title:'Come nasce un nuovo nodo',
    summary:'Un nuovo nodo usa il formato comune ma sceglie un nome, un argomento, le fonti e i propri contenuti. La pubblicazione di una bozza non deve conferire automaticamente l’autorità sui partecipanti.',
    tags:['nodo','manifesto','laboratorio','creazione'],timeline:null,
    sections:[
      {heading:'Dal laboratorio al manifesto pubblico',paragraphs:[
        'Node Studio permette di preparare per blocchi un documento pubblico: identità del nodo, fonti RSS, biblioteca, timeline e testi. Dopo una revisione esplicita, un operatore può pubblicarne una versione di sola lettura con lo stesso motore React. Questa prima pubblicazione non avvia automaticamente una comunità con account, forum o prime elezioni.',
      ]},
      {heading:'La comunità è più della sua macchina',paragraphs:[
        'Un futuro nodo completo richiederà identità e database separati, procedure di ammissione PR2 e una transizione di governance verificabile. L’operatore della macchina non può inventare una maggioranza per il solo fatto di possedere il server.',
      ]},
    ],sources:[
      {label:'Bootstrap tematico',url:doc('THEMATIC-BOOTSTRAP.md'),context:'Installazione read-only'},
      {label:'Baseline del progetto',url:doc('ALPHA-BASELINE.md'),context:'Separazione delle responsabilità'},
    ],related:['il-nodo-origine','separare-software-e-comunita','governo-delle-comunita'],
  },
  {
    id:'governo-delle-comunita',kind:'concept',title:'Governare senza confondere il consenso',
    summary:'I PR2 del nodo deliberano le proprie scelte editoriali, ma non possono trasformare con un voto un’affermazione non verificata in un fatto. Le decisioni federali e la finalizzazione tecnica richiedono regole differenti.',
    tags:['pr2','pr3','deliberazione','governance','consenso'],timeline:null,
    sections:[
      {heading:'I livelli decisionali',paragraphs:[
        'Il forum serve a discutere argomenti e decisioni di una comunità; l’Atlante richiede inoltre fonti, licenze e revisioni comprensibili. I mandati federali hanno ambiti, scadenze e revoche, mentre i validatori tecnici decidono soltanto l’ordine verificabile delle operazioni autorizzate.',
      ]},
      {heading:'Una buona decisione deve poter essere contestata',paragraphs:[
        'Ogni proposta importante deve mostrare autore, cambiamenti, revisione di partenza e ambito. La decisione non deve essere alterata da un nuovo contenuto diverso da quello votato. Ricorsi, moderazione motivata e difese contro account duplicati richiedono processi pubblici e verificabili, non un pulsante nascosto.',
      ]},
    ],sources:[
      {label:'Governance',url:doc('GOVERNANCE.md'),context:'Modello PR1/PR2/PR3'},
      {label:'Regole editoriali proposte',url:doc('EDITORIAL-GOVERNANCE.md'),context:'Fonti, revisione e ricorsi'},
    ],related:['il-nodo-origine','racconto-e-atlante','custodia-e-privacy'],
  },
  {
    id:'custodia-e-privacy',kind:'concept',title:'Privacy, sicurezza e continuità',
    summary:'La rete può duplicare i contenuti pubblici approvati, ma account, credenziali, messaggi privati e dati personali richiedono custodia limitata e recupero cifrato. Nessuna replica è indistruttibile per definizione.',
    tags:['privacy','sicurezza','identita','distribuzione'],timeline:null,
    sections:[
      {heading:'Cosa non deve finire in una replica pubblica',paragraphs:[
        'Password, token, account, sessioni e corrispondenze riservate non sono parte della base di conoscenza pubblica. Anche un testo pubblico può contenere dati personali o informazioni soggette a rimozione: la semplice esistenza di un hash non risolve responsabilità e diritti.',
      ]},
      {heading:'Le prove prima delle promesse',paragraphs:[
        'Tre processi sullo stesso computer non equivalgono a tre macchine indipendenti. Prima di dichiarare una federazione resiliente occorre interrompere la macchina originaria, verificare HTTPS da altri ingressi, simulare perdita di chiavi e mostrare il ripristino su reti e custodi differenti.',
      ]},
    ],sources:[
      {label:'Security review',url:doc('SECURITY-REVIEW.md'),context:'Limiti dell’audit corrente'},
      {label:'Distributed Network',url:doc('DISTRIBUTED-NETWORK.md'),context:'Obiettivi e test multi-host'},
    ],related:['replica-verificabile','storage-leggero','governo-delle-comunita'],
  },
  {
    id:'biblioteca-tecnica',kind:'technical-document',title:'Una biblioteca tecnica che si può controllare',
    summary:'La biblioteca dell’Agorà nasce dai documenti originali del progetto, con rimandi alla sorgente e una distinzione chiara tra testo disponibile nella piattaforma, riferimento esterno e diritto di redistribuzione.',
    tags:['biblioteca','documentazione','diritti','archivio'],timeline:null,
    sections:[
      {heading:'Libri, manuali e documenti non sono la stessa cosa',paragraphs:[
        'La prima edizione ospita brevi voci tecniche originali e collega le specifiche mantenute nel repository. Quando si aggiunge un libro bisogna distinguere l’opera dall’edizione, dalla sua lingua, dalla licenza e dalla posizione fisica del file. Non basta un indirizzo web per dichiarare che una copia è disponibile localmente.',
      ]},
      {heading:'Un documento deve sopravvivere a una ricerca',paragraphs:[
        'La consultazione dell’Atlante deve consentire di aprire una voce, seguirne le fonti e copiarne un testo originale per lettura offline. I futuri archivi pesanti saranno collocati su peer volontari con quote, hash verificabili e una policy di rimozione conforme ai diritti.',
      ]},
    ],sources:[
      {label:'Architettura',url:doc('ARCHITECTURE.md'),context:'Descrizione dei sottosistemi'},
      {label:'Autogestione e archivi',url:doc('NODE-KNOWLEDGE-GRAPH.md'),context:'Modello di opere ed edizioni'},
    ],related:['racconto-e-atlante','il-nodo-origine','custodia-e-privacy'],
  },
] as const;
validateAtlas(AGORA_ATLANTE);
export const AGORA_ATLANTE_BY_ID=new Map(AGORA_ATLANTE.map(article=>[article.id,article]));
