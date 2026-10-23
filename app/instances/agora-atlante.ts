/**
 * The first public thematic knowledge atlas of Agorà, the origin community.
 *
 * Source material is the project's own published engineering documentation.
 * These are editorial, repository-reviewed alpha entries, NOT decisions taken
 * by the future PR2 assembly or a distributed BFT validator quorum.
 *
 * Every entry is indexable. Only entries with timeline data are featured in
 * the narrative timeline, exactly as for PolisRossa.
 */
export type AgoraAtlasEntry={
  id:string;
  title:string;
  abstract:string;
  category:'Fondamenti'|'Conoscenza'|'Rete'|'Autogoverno'|'Laboratorio';
  state:'alpha'|'prototype'|'planned';
  sections:readonly {heading:string;paragraphs:readonly string[]}[];
  references:readonly {title:string;url:string}[];
  relatesTo:readonly string[];
  timeline?:{period:string;order:number;narrative:string};
};
const DOC=(name:string)=>'https://github.com/internazionalerossa/agoranode/blob/main/docs/'+name;
const PR=(num:number)=>'https://github.com/internazionalerossa/agoranode/pull/'+num;

export const AGORA_ATLAS=[
{
 id:'agoranode',
 title:'AgoràNode: un motore, molte comunità',
 abstract:'Software libero per costruire luoghi tematici di conoscenza, lettura e partecipazione, senza confondere comunità e computer che la ospitano.',
 category:'Fondamenti',state:'alpha',
 timeline:{period:'2026 · la piattaforma comune',order:1,narrative:'Dall’esperienza di PolisRossa emerge una domanda di progetto: come mantenere la ricchezza di un giornale, una biblioteca e un forum e trasformarla in un software utilizzabile da comunità differenti? AgoràNode nasce come motore condiviso, mentre i nodi tematici conservano le proprie fonti, regole e decisioni.'},
 sections:[
  {heading:'L’idea di partenza',paragraphs:[
   'AgoràNode è il software comune, non l’assemblea di una sola comunità. Agorà parla della tecnologia stessa; PolisRossa raccoglie esperienze storiche, letture, fonti e discussioni nel suo ambito. La tecnologia può essere condivisa senza rendere universale una decisione locale.',
   'Le componenti del prodotto si ripetono da un nodo all’altro: notizie e video, Atlante, percorso narrativo, biblioteca, dati e Agorà della comunità. L’interfaccia deve rimanere riconoscibile anche quando cambiano interamente i contenuti.'
  ]},
  {heading:'Che cosa è effettivamente disponibile',paragraphs:[
   'Il repository contiene una applicazione alpha sviluppata da PolisRossa, il primo Atlante tecnologico di Agorà, un laboratorio di bozze, revisioni pubbliche verificabili e prototipi di replica. La creazione completamente automatica di comunità con account e forum indipendenti è ancora in sviluppo.'
  ]}
 ],
 references:[{title:'Baseline tecnica dell’alpha',url:DOC('ALPHA-BASELINE.md')},{title:'Architettura del progetto',url:DOC('ARCHITECTURE.md')}],
 relatesTo:['polisrossa-alpha','nodi-tematici','atlante'],
},
{
 id:'polisrossa-alpha',
 title:'PolisRossa: il prototipo da cui parte il motore',
 abstract:'La prima applicazione sviluppata fornisce feed, libri, cronologia narrativa, grafici e una comunità; i suoi dati e URL restano conservati.',
 category:'Fondamenti',state:'alpha',
 timeline:{period:'2026 · primo prototipo',order:2,narrative:'Prima di rendere possibile una rete di nodi tematici, PolisRossa concentra in una sola applicazione notizie, documenti, letture e un percorso storico fatto di racconti, non di parole collegate. Questo patrimonio diventa la base concreta dell’architettura comune, senza essere cancellato o trasformato in una copia del nodo Agorà.'},
 sections:[
  {heading:'Conservare il lavoro esistente',paragraphs:[
   'Le pagine, le opere, i dataset e i riferimenti bibliografici di PolisRossa non sono dati dimostrativi intercambiabili. Sono contenuti con provenienze e condizioni di riuso diverse. Per questo la loro conservazione precede qualsiasi migrazione architetturale.',
   'La separazione fra motore comune e dati tematici consente a PolisRossa di mantenere le proprie decisioni PR2, la propria biblioteca e la propria voce editoriale.'
  ]}
 ],
 references:[{title:'Architettura del nodo di origine',url:DOC('AGORANODE.md')},{title:'Modello della conoscenza',url:DOC('NODE-KNOWLEDGE-GRAPH.md')}],
 relatesTo:['agoranode','nodi-tematici','timeline-narrativa'],
},
{
 id:'nodi-tematici',
 title:'Che cos’è un nodo tematico?',
 abstract:'Una comunità con argomento, fonti, Atlante, biblioteca e regole propri: non coincide con il PC che ne conserva una copia.',
 category:'Fondamenti',state:'prototype',
 sections:[
  {heading:'Uno spazio non è un server',paragraphs:[
   'Un peer è un computer che conserva dati o offre servizi. Un nodo tematico è la comunità che decide del proprio patrimonio. Lo stesso dispositivo potrà ospitare più nodi; più dispositivi potranno conservarne uno senza ottenere automaticamente più diritti di voto.',
   'La pagina comune di un nodo deve poter essere formata a partire da un manifesto di identità, fonti e contenuti. L’operatore può già installare un sito read-only da una bozza del laboratorio, ma account e forum del nuovo spazio richiedono ancora una separazione del runtime.'
  ]}
 ],
 references:[{title:'Bootstrap tematico',url:DOC('THEMATIC-BOOTSTRAP.md')},{title:'Architettura peer-owned',url:DOC('PEER-OWNED-ARCHITECTURE.md')}],
 relatesTo:['agoranode','laboratorio','autogoverno'],
},
{
 id:'atlante',
 title:'L’Atlante: pagine con fonti e relazioni',
 abstract:'La biblioteca dei concetti della comunità. Ogni voce ha identità stabile, contenuti e riferimenti; tutte le voci restano ricercabili.',
 category:'Conoscenza',state:'alpha',
 timeline:{period:'2026 · conoscenza navigabile',order:3,narrative:'I temi diventano pagine consultabili, con il proprio contesto, le fonti e i collegamenti verso altre pagine. La timeline principale non deve contenerle tutte: mette in scena soltanto una selezione narrativa. L’Atlante resta più grande del racconto che lo introduce.'},
 sections:[
  {heading:'Perché “Atlante”',paragraphs:[
   'Una voce dell’Atlante non è una parola tecnica nascosta in un pannello. Il lettore arriva da una ricerca, da un libro o da una tappa della timeline, trova una pagina leggibile e può esaminare le fonti e la cronologia delle revisioni.',
   'La pubblicazione della pagina è separata dalla decisione di metterla in primo piano. Una pagina esclusa dalla timeline resta disponibile nell’Atlante e può essere citata da altre pagine.'
  ]},
  {heading:'Come migliorarla',paragraphs:[
   'Un editore PR2 dovrebbe poter selezionare testo e blocchi, proporre cambiamenti e discuterli con altre persone prima della pubblicazione. L’editor visuale alpha prepara bozze; il meccanismo completo con voto e certificato di pubblicazione non è ancora operativo.'
  ]}
 ],
 references:[{title:'Grafo della conoscenza',url:DOC('NODE-KNOWLEDGE-GRAPH.md')},{title:'Politica editoriale',url:DOC('EDITORIAL-GOVERNANCE.md')}],
 relatesTo:['timeline-narrativa','revisioni','biblioteca'],
},
{
 id:'timeline-narrativa',
 title:'La timeline come racconto, non come elenco',
 abstract:'Testi introduttivi, periodi, passaggi e fonti collegano solo le pagine scelte per il percorso principale della comunità.',
 category:'Conoscenza',state:'alpha',
 timeline:{period:'2026 · narrazione editoriale',order:4,narrative:'PolisRossa mostra che le informazioni diventano più leggibili quando ogni tappa è introdotta con poche righe di storia, cause e conseguenze. Agorà adotta lo stesso principio per spiegare l’evoluzione della tecnologia: l’inclusione nel percorso è una decisione editoriale locale, non l’indice automatico di tutte le pagine.'},
 sections:[
  {heading:'La selezione PR2',paragraphs:[
   'Ogni nodo conserva un Atlante più vasto della propria timeline. I PR2 competenti deliberano se una voce debba essere inclusa, quale testo la introduca e in quale ordine leggere le tappe. Una decisione di esclusione cambia il percorso, non cancella la pagina.',
   'Proposte, deliberazioni, ricorsi e nuova revisione devono rimanere verificabili; non si riscrivono silenziosamente le vecchie versioni.'
  ]}
 ],
 references:[{title:'Timeline e decisioni PR2',url:DOC('NODE-KNOWLEDGE-GRAPH.md')},{title:'Regole editoriali',url:DOC('EDITORIAL-GOVERNANCE.md')}],
 relatesTo:['atlante','autogoverno','revisioni'],
},
{
 id:'biblioteca',
 title:'Biblioteca: opere, edizioni e diritti',
 abstract:'Catalogare un libro non significa possederne il file: ogni edizione deve dichiarare lingua, provenienza e possibilità di archiviazione.',
 category:'Conoscenza',state:'prototype',
 sections:[
  {heading:'La distinzione fondamentale',paragraphs:[
   'L’opera, la sua edizione e il file ospitato sono tre entità differenti. Una bibliografia può includere documenti dei quali il progetto non possiede diritti di redistribuzione; in quel caso il link resta presso l’archivio originale.',
   'L’obiettivo della biblioteca dei nodi è conservare localmente solo le edizioni che lo consentono, con checksum, provenienza, quote e custodi volontari. Le schede di PolisRossa indicano già le differenze fra lettura interna e collegamento esterno.'
  ]}
 ],
 references:[{title:'Biblioteca e diritti',url:DOC('LIBRARY.md')},{title:'Lean Storage',url:DOC('LEAN-STORAGE.md')}],
 relatesTo:['atlante','cas'],
},
{
 id:'revisioni',
 title:'Revisioni pubbliche e prove di provenienza',
 abstract:'Un contenuto mantiene una storia verificabile delle revisioni, degli autori pubblici e delle decisioni di pubblicazione.',
 category:'Conoscenza',state:'prototype',
 timeline:{period:'2026 · revisioni verificabili',order:5,narrative:'La memoria non può dipendere soltanto dal file corrente sul computer che ospita il sito. Il deposito di conoscenza introduce revisioni indirizzate dal contenuto, fonti e registri di audit. Ma una firma conferma i byte e la provenienza dichiarata, non trasforma in verità un’affermazione contestata.'},
 sections:[
  {heading:'Integrità e affidabilità non coincidono',paragraphs:[
   'Gli hash SHA-256 permettono di riconoscere un oggetto alterato. Per stabilire se un fatto sia documentato restano necessari fonti, contesto, obiezioni e un processo editoriale responsabile.',
   'Solo il patrimonio pubblico idoneo può essere distribuito indiscriminatamente; password, messaggi riservati, sessioni e dati personali richiedono un sistema distinto e cancellazioni appropriate.'
  ]}
 ],
 references:[{title:'Conoscenza e integrità',url:DOC('ARCHITECTURE.md')},{title:'Verifica editoriale',url:DOC('EDITORIAL-GOVERNANCE.md')}],
 relatesTo:['atlante','replica','autogoverno'],
},
{
 id:'replica',
 title:'Replica fra computer indipendenti',
 abstract:'Lo stesso patrimonio pubblico potrà sopravvivere su peer distinti, senza assumere che un database PostgreSQL sia la rete intera.',
 category:'Rete',state:'prototype',
 timeline:{period:'2026 · prime repliche',order:6,narrative:'I test e lo scambio di pacchetti pubblici firmati mostrano un primo percorso per copiare e verificare la conoscenza senza trasferire gli account. La comunicazione fra peer già noti è un prototipo concreto; la scoperta automatica, i gateway autonomi e il consenso BFT tra host rimangono traguardi da collaudare.'},
 sections:[
  {heading:'Separare disponibilità e autorità',paragraphs:[
   'Un peer può servire l’ultima versione che ha verificato anche quando il nodo fondatore non è raggiungibile. Questo non gli dà il diritto di finalizzare nuove decisioni senza il consenso tecnico e politico richiesto.',
   'Il protocollo attuale trasferisce pacchetti di conoscenza già firmati fra server HTTPS noti. Un trasporto peer-to-peer completo richiede discovery, autenticazione, NAT traversal, limiti e prove con computer realmente indipendenti.'
  ]}
 ],
 references:[{title:'Trasporto fra peer',url:DOC('PEER-EXCHANGE.md')},{title:'Specifica distribuita',url:DOC('DISTRIBUTED-NETWORK.md')}],
 relatesTo:['sincronizzazione','cas','sicurezza'],
},
{
 id:'cas',
 title:'Storage leggero e blocchi content-addressed',
 abstract:'Memorizzare e trasferire il contenuto effettivamente nuovo, invece di ricopiare interi archivi per ogni modifica.',
 category:'Rete',state:'prototype',
 sections:[
  {heading:'Semplicità prima dell’infrastruttura pesante',paragraphs:[
   'Un codec sperimentale divide contenuti pubblici in blocchi SHA-256 deterministici. Una piccola modifica può riutilizzare i blocchi già presenti; un archivio CAS locale li verifica e li conserva in modo atomico dopo l’approvazione richiesta.',
   'Deduplicazione non significa capacità infinita: video, energia, rete, backup e disponibilità dei custodi hanno costi fisici. Il codec non è ancora il trasporto incrementale v2 operativo fra host.'
  ]}
 ],
 references:[{title:'Lean Storage',url:DOC('LEAN-STORAGE.md')},{title:'Sincronizzazione continua',url:DOC('CONTINUOUS-SYNC.md')}],
 relatesTo:['replica','biblioteca','sincronizzazione'],
},
{
 id:'sincronizzazione',
 title:'Sincronizzazione continua: commit, voto, replica',
 abstract:'Salvare una bozza, pubblicare una revisione e sincronizzarla sugli altri peer sono tre eventi distinti.',
 category:'Rete',state:'prototype',
 sections:[
  {heading:'Tre tempi della conoscenza',paragraphs:[
   'Il database locale conferma una transazione. La revisione editoriale o una decisione PR2 autorizza una pubblicazione. Solo dopo i peer possono recuperare il checkpoint e i blocchi pubblici mancanti.',
   'Il watcher può interrogare ogni secondo l’indice dei pacchetti già finalizzati, senza riscaricare corpi invariati. Questo non equivale a un backup di tutto il database ogni secondo né promette convergenza mondiale entro un secondo.'
  ]}
 ],
 references:[{title:'Modello del delta sync',url:DOC('CONTINUOUS-SYNC.md')}],
 relatesTo:['replica','revisioni','cas'],
},
{
 id:'autogoverno',
 title:'PR1, PR2, deleghe e autogoverno',
 abstract:'I diritti di partecipazione appartengono alle persone ammesse nella comunità, non ai custodi dei computer o alle chiavi tecniche.',
 category:'Autogoverno',state:'prototype',
 sections:[
  {heading:'Partecipare non significa amministrare hardware',paragraphs:[
   'PR1 riguarda l’accesso applicativo personale. I membri PR2 di ogni nodo discutono, formulano proposte, curano il racconto e votano secondo le regole locali. Le funzioni federali hanno mandati separati e revocabili.',
   'L’accesso a un dispositivo o il numero delle repliche non assegna automaticamente un voto. La pagina del nodo Agorà non sostituisce, soltanto perché parla del protocollo, le camere della federazione.'
  ]},
  {heading:'Un laboratorio pubblico, regole verificabili',paragraphs:[
   'La partecipazione diventa possibile quando i moduli di proposta sono leggibili da chi non conosce Git, query e hash. Le decisioni che cambiano il patrimonio devono avere un ambito preciso, una revisione di partenza e una motivazione recuperabile.'
  ]}
 ],
 references:[{title:'Governance e mandati',url:DOC('GOVERNANCE.md')},{title:'Riesame istituzionale',url:DOC('CRITICAL-DESIGN-REVIEW.md')}],
 relatesTo:['timeline-narrativa','atlante','laboratorio'],
},
{
 id:'laboratorio',
 title:'Node Studio: creare senza programmare',
 abstract:'Un’interfaccia visuale per preparare nomi, fonti, blocchi editoriali e timeline; le bozze non assegnano automaticamente diritti politici.',
 category:'Laboratorio',state:'prototype',
 sections:[
  {heading:'Dal blocco alla comunità',paragraphs:[
   'Il Node Studio permette di aggiungere e riordinare blocchi, fonti, tappe narrative, riferimenti a libri e video, poi salvare una bozza privata e verificarne l’anteprima.',
   'Un operatore può oggi installare una versione pubblica read-only di un nuovo nodo. L’attivazione di un forum autonomo, del primo PR2 e della pubblicazione democratica richiede ancora verifiche di identità, database e autorizzazioni.'
  ]}
 ],
 references:[{title:'Manuale Node Studio',url:DOC('NODE-STUDIO.md')},{title:'Installare un nodo di consultazione',url:DOC('THEMATIC-BOOTSTRAP.md')}],
 relatesTo:['nodi-tematici','autogoverno'],
},
{
 id:'sicurezza',
 title:'Sicurezza: che cosa sappiamo e che cosa no',
 abstract:'La resilienza distribuita richiede test riproducibili, privacy, protezione delle chiavi, audit e gestione degli incidenti.',
 category:'Rete',state:'prototype',
 sections:[
  {heading:'Niente promesse di indistruttibilità',paragraphs:[
   'Una rete con più custodi può evitare il guasto di un solo server, ma non elimina attacchi, errori, collusioni, indisponibilità delle reti o problemi di copyright e privacy.',
   'La suite automatica verifica contratti e scenari locali, non sostituisce un audit indipendente né prove su più host fisici e reti diverse. Ogni capacità viene descritta come operativa soltanto quando esistono evidenze pertinenti.'
  ]}
 ],
 references:[{title:'Revisione di sicurezza limitata',url:DOC('SECURITY-REVIEW.md')},{title:'Stato verificato',url:DOC('QUALITY.md')}],
 relatesTo:['replica','autogoverno'],
},
] as const satisfies readonly AgoraAtlasEntry[];

export const AGORA_ATLAS_CATEGORIES=['Tutti','Fondamenti','Conoscenza','Rete','Autogoverno','Laboratorio'] as const;
export const AGORA_ATLAS_TIMELINE=AGORA_ATLAS.filter(entry=>entry.timeline)
  .sort((a,b)=>a.timeline!.order-b.timeline!.order);

export function agoraAtlasEntry(id:string):AgoraAtlasEntry|null{
  return AGORA_ATLAS.find(entry=>entry.id===id)??null;
}
export function agoraAtlasHref(id:string):string{
  if(!/^[a-z][a-z0-9-]{0,63}$/.test(id)||!agoraAtlasEntry(id))throw Error('Unknown Atlante entry');
  return '/agora?'+new URLSearchParams({atlante:id});
}
export function validateAgoraAtlas():void {
  const ids=new Set<string>(),timelineOrders=new Set<number>();
  for(const entry of AGORA_ATLAS){
    if(!/^[a-z][a-z0-9-]{0,63}$/.test(entry.id)||ids.has(entry.id)||
      entry.sections.length<1||entry.references.length<1||entry.abstract.length<50)
      throw Error('Invalid or duplicated Atlante entry');
    ids.add(entry.id);
    for(const reference of entry.references){
      const url=new URL(reference.url);
      if(url.protocol!=='https:'||url.username||url.password)throw Error('Unsafe Atlante reference');
    }
    if(entry.timeline){
      if(!Number.isSafeInteger(entry.timeline.order)||timelineOrders.has(entry.timeline.order)||
        entry.timeline.narrative.trim().length<100)throw Error('Invalid narrative timeline');
      timelineOrders.add(entry.timeline.order);
    }
  }
  for(const entry of AGORA_ATLAS)for(const id of entry.relatesTo)
    if(!ids.has(id))throw Error('Broken Atlante relation: '+id);
}
validateAgoraAtlas();

export const AGORA_READING=[
 {id:'baseline',label:'01',title:'La piattaforma e il primo alpha',genre:'Architettura',url:DOC('ALPHA-BASELINE.md'),description:'Le scelte di software, i limiti dell’alpha e il rapporto fra Agorà e PolisRossa.'},
 {id:'knowledge',label:'02',title:'Pagine, timeline e decisioni',genre:'Conoscenza',url:DOC('NODE-KNOWLEDGE-GRAPH.md'),description:'Come cercare una voce, narrarla nel percorso e sottoporne le revisioni ai PR2.'},
 {id:'engineering',label:'03',title:'Protocollo e rete distribuita',genre:'Rete',url:DOC('DISTRIBUTED-NETWORK.md'),description:'Identità, checkpoint e il percorso necessario verso una replica fra computer indipendenti.'},
 {id:'sync',label:'04',title:'Sincronizzare senza duplicare',genre:'Storage',url:DOC('CONTINUOUS-SYNC.md'),description:'La differenza fra commit locale, pubblicazione finale e disponibilità delle copie.'},
 {id:'commons',label:'05',title:'Governance dei beni comuni',genre:'Istituzioni',url:DOC('GOVERNANCE.md'),description:'Ambiti delle assemblee, membership locale, mandati e responsabilità dei custodi.'},
 {id:'quality',label:'06',title:'Qualità, rischi e verifiche',genre:'Qualità',url:DOC('QUALITY.md'),description:'Che cosa è stato effettivamente collaudato e che cosa rimane aperto.'},
 {id:'studio',label:'07',title:'Costruire un nuovo nodo',genre:'Manuale',url:DOC('NODE-STUDIO.md'),description:'Come preparare un tema, fonti e blocchi nel laboratorio visuale.'},
] as const;
