# Stato delle verifiche e requisiti aperti

Aggiornamento: 21 ottobre 2026. Questo registro distingue codice verificato, comportamento locale osservato e servizio pubblico operativo. Un test locale non attesta un flusso funzionante dall'esterno. Nessuno dei quattro obiettivi generali è dichiarato integralmente concluso.

## Evidenze disponibili

- Link ai dossier con vista, percorso e ancora; corretto ripristino delle ancore dopo caricamento differito.
- Rassegna con controlli visibili, due ordini e filtri basati sulla provenienza reale e sul testo degli articoli. Rimossa la guida duplicata; la cache non riporta nell’atlante editori esclusi.
- Sei feed notizie e sei canali ufficiali aggiunti con verifica dal vivo e riferimenti documentati.
- Condizioni di vita in primo piano e comparazioni industriali come approfondimento facoltativo.


- Informativa cookie e memoria locale ampliata, copie pubbliche eliminabili senza rimuovere i salvati, traduzione della comunità facoltativa e interrotta al ritorno all’originale. Esportazione privata nel runtime indipendente; procedure del titolare ancora da completare.
- Anteprima pubblica disponibile; autenticazione indipendente e scritture della comunità non attive su quell’indirizzo.
- Revisione delle spiegazioni in README e guide, pagine principali, 64 tappe storiche, 11 introduzioni ai dossier, 32 descrizioni di libri e 18 ambiti statistici. Valori, date, fonti, edizioni e identificativi conservati; la revisione non riscrive i testi originali degli editori.
- Il 21 ottobre 2026 la build di produzione e il controllo dei tipi sono terminati senza errori; la suite completa ha riportato 246 test superati, zero falliti e due test di avvio Linux saltati sul computer Windows.
- Account, ammissioni, salvataggi e forum testati con PGlite e sessioni sintetiche; non sono prove di email reali, disponibilità del provider, backup remoto o concorrenza fra repliche.
- Il runtime domestico attuale usa Node.js 24, Docker Compose, PostgreSQL 17 e Caddy. Sul solo loopback `https://localhost:8443/` e `/healthz` hanno risposto 200 con la CA locale; il volume PostgreSQL esistente è stato conservato e tutte le 11 migrazioni risultano applicate con digest canonici.
- Un backup PostgreSQL cifrato con age, creato dopo le migrazioni e l'import librario, è stato decifrato in streaming e ripristinato con successo in un volume usa-e-getta: 11 migrazioni, una revisione libraria e 16 capitoli verificati. Nessun dump in chiaro è stato scritto; le risorse di prova sono state rimosse.
- L'accesso pubblico, Gmail e i percorsi account/PR2 sul dominio esterno non sono ancora collaudati. Registrazioni e forum restano chiusi.
- Prove browser precedenti hanno rilevato immagini assenti. Non è stato completato un controllo manuale di ogni percorso.
- GitHub: repository `internazionalerossa/polisrossa` esistente. Le modifiche correnti sono ancora locali e non vanno presentate come pubblicate finché fetch, controllo della divergenza e push ordinario non terminano.

## Requisiti per area

### Identità e pubblicazione

| Requisito | Stato e riscontro |
| --- | --- |
| Nome PolisRossa in marchio, caricamento e pagine | **verifica parziale**. Marchio, caricamento, testi, metadati e documenti rinominati; Polis invariato e colore tradotto localmente nella lingua di lettura. Verifica visiva integrale ancora necessaria. |
| Stella rossa a cinque punte e logo senza note musicali | **codice e anteprima**. Componenti di identità aggiornati; giudizio visivo finale aperto. |
| Eliminare dati personali dai sorgenti pubblici | **verifica parziale**. Sorgenti indipendenti ripuliti; vecchio URL pubblico contiene ancora un identificativo personale. |
| Repository pubblico sul nuovo account | **pubblicato, aggiornamento corrente in attesa**. Il ramo remoto esiste; il nuovo insieme di modifiche resta locale finché non supera il controllo di divergenza e il push senza forzatura. |
| Link al sito nel README e istruzioni di contribuzione | **verifica parziale**. Documenti revisionati; il nome pubblico definitivo deve essere inserito soltanto dopo il collaudo esterno. |
| Sorgenti completi scaricabili | **consegnato**. ZIP completo disponibile; aggiornare il pacchetto insieme ai sorgenti. |
| Anteprima sul vecchio indirizzo | **pubblicato**. Anteprima pubblicata; deployment e sorgenti devono restare riferiti allo stesso commit verificato. |
| Hosting gratuito indipendente in Europa, senza Koyeb | **locale funzionante, pubblicazione bloccata**. Applicazione, database persistente e HTTPS locale sono attivi sul PC; Tailscale Funnel, Gmail e verifica da rete mobile non sono ancora completati. Nessuna porta router, regola firewall o DMZ è stata modificata. |
| Licenza, avvisi e identità del progetto | **implementato**. AGPL-3.0-or-later, ambito dei diritti di terzi, avvisi di garanzia, politica separata per nome e logo, dichiarazione sui diritti dei contributi e collegamenti ai sorgenti nell’interfaccia. Nessuna registrazione del marchio o conformità globale attestata. |

### Notizie e fonti

| Requisito | Stato e riscontro |
| --- | --- |
| Fonti di sinistra e università solo pubbliche | **verifica parziale**. Policy ed esclusioni implementate; revisione editoriale completa non conclusa. |
| Ampliare fonti da tutto il mondo e riferimenti di Ottolina | **parziale**. 182 fonti dirette e 136 radar; copertura mondiale non esaustiva. |
| Consultare automaticamente tutte le fonti senza carica altre fonti | **codice verificato**. Raccolta concorrente limitata e cancellabile; disponibilità live di ogni fonte non garantita. |
| Integrare l’Osservatorio nei filtri della rassegna | **codice verificato**. Raccolta e filtri comuni; periodo sei ore e vecchi URL compatibili. Verifica visiva su dispositivi reali ancora da eseguire. |
| Escludere notizie vecchie e future dalla finestra sei ore | **codice verificato**. Filtri temporali testati; sessioni lunghe sul servizio reale da verificare. |
| Ordinamento cronologico e alternative editoriali | **codice verificato**. Ordine cronologico distinto dalla rassegna: alternanza di paesi e testate nell’intera giornata, conservata anche nella cache limitata; date uguali ammesse. |
| Rilevanza e più letti ricavati dalle fonti | **parziale**. Estrazione dei segnali presente; copertura e qualità variabili per editore. |
| Titolo, fonte e paese senza macroregioni o spiegazioni invasive | **verifica parziale**. Dati e componenti aggiornati; lettura di tutte le varianti UI non completata. |

### Lingue e prestazioni

| Requisito | Stato e riscontro |
| --- | --- |
| Separare lingua interfaccia, lettura e fonti | **codice e anteprima**. Preferenze indipendenti implementate e testate. |
| Originale disponibile per articoli, libri, forum e chat | **codice verificato**. Contenuti comunitari testati localmente; forum/chat non attivi online. |
| Non tradurre contenuti già nella lingua scelta | **codice verificato**. Bypass dei provider testato per le lingue supportate. |
| Priorità nazionale e linguistica senza nascondere il mondo | **codice verificato**. Metadati geografici dell’hosting e preferenze; verifica live multipaese aperta. |
| Immagini degli articoli presenti e layout stabile | **aperto**. Recupero metadata e spazi riservati presenti; immagini assenti ancora osservate. |
| Caricamento veloce senza schermata bloccante e glitch | **aperto**. Cache e caricamento migliorati; audit visivo e misure complete mancanti. |
| Prestazioni misurate con benchmark riproducibili | **non dimostrato**. Manca una misurazione completa e confrontabile delle prestazioni del servizio reale. |
| Controllare ogni bottone, frase e percorso su smartphone | **non completato**. Controlli automatici e precedenti prove parziali; nessun audit manuale esaustivo. |

### Navigazione e video

| Requisito | Stato e riscontro |
| --- | --- |
| Biblioteca e Partecipa con navigazione coerente | **pubblicato**. Nomi e accessi uniformi nella navigazione. |
| Descrizioni utili negli inviti alle due aree | **pubblicato**. Barra home con descrizioni specifiche. |
| Guide brevi iniziali a biblioteca e conquiste e accesso ai dati | **pubblicato**. Legende e collegamento diretto all’archivio comparativo. |
| Ridurre ridondanze, contatori notizie e pulsanti fuori contesto | **verifica parziale**. Numerosi interventi presenti; controllo di tutte le varianti ancora aperto. |
| Carosello video sottile sotto header e prima dei filtri | **pubblicato**. Componente compatto e filtri raccolti; misurazione visiva attuale da completare. |
| Molti canali globali con filtri, senza filtro piattaforma | **parziale**. 90 canali; filtri per lingua, paese, tema e canale. |
| Orario e visualizzazioni reali dei video | **parziale**. Mostrati quando il fornitore li rende disponibili; niente valori inventati. |
| Thumbnail stabili e video del paese prima degli altri | **verifica parziale**. Priorità e conservazione immagini testate; disponibilità immagini esterne aperta. |

### Biblioteca, storia e dati

| Requisito | Stato e riscontro |
| --- | --- |
| Molti libri globali, Mao, sovietici e altre tradizioni integrate | **parziale**. 176 opere, 724 edizioni, 37 lingue; catalogo selettivo. |
| Lettura interna e testo senza omissioni o errori di codifica | **codice e runtime locale verificati per l'edizione autorizzata**. `commons-viventi/en` è archiviata in PostgreSQL come revisione immutabile con 16 capitoli; l'API anonima restituisce la copia persistente con integrità e licenza. Le altre edizioni restano sui rispettivi archivi finché i diritti non consentono una copia. |
| Segnalibro ultima pagina e raccolta libri per account | **solo runtime indipendente**. Persistenza testata localmente; non disponibile online sul vecchio servizio. |
| Racconto cronologico espandibile con archivio finale | **pubblicato**. 64 tappe in sette epoche, con repressioni, colpi di Stato e riduzioni delle tutele documentate; consultazione per paese e tema. |
| Copertura URSS, Europa, Italia/IRI, Cina e resto del mondo | **parziale**. Contenuti presenti; copertura e revisione storica restano selettive. |
| Confronti USA e altri paesi con foto e grafici comprensibili | **parziale**. Confronti documentati presenti; revisione statistica ed editoriale completa aperta. |
| Ampliare casa, energia, salari PPP/orari, STEM, docenti, lettura e risorse | **parziale**. 93 indicatori e 408963 osservazioni; copertura disomogenea, alcuni dati richiesti assenti. |
| Fonti, definizioni, calcoli e ringraziamenti completi | **verifica parziale**. Pagina crediti, provenienza serie e test; inventario di ogni diritto e attribuzione non completo. |

### Account e ammissioni

| Requisito | Stato e riscontro |
| --- | --- |
| Account indipendenti senza profilo social obbligatorio | **codice e anteprima**. SSO rimosso; accesso indipendente non ancora collegato. |
| PR1 email/password senza approvazione comunitaria | **codice e runtime predisposti, flusso reale chiuso**. Registrazione con email e password confermata resta distinta da PR2; un codice iniziale privato limita l'abuso di Gmail e nel runtime è conservato soltanto il suo hash. Consegna Gmail, conferma e recupero reali non sono ancora collaudati. |
| PR1 salvataggi privati persistenti dopo cancellazione cache | **solo runtime indipendente**. Database remoto previsto; isolamento e riapertura DB testati localmente. |
| PR2 valutazione soggettiva della persona e nome riconoscibile nel voto | **solo runtime indipendente**. Nome, presentazione e URL HTTPS dichiarato obbligatorio sono mostrati soltanto a candidato e revisori; il server non apre né verifica il link. Facebook OAuth è una prova tecnica facoltativa del controllo dell'account e non certifica identità civile. |
| Tre sì da PR2 distinti entro 72 ore | **solo runtime indipendente**. Regole e test presenti; nessuna comunità reale attivata. |
| Avvio dei tre membri iniziali con procedura sicura | **predisposto ma non collaudato**. Tre inviti distinti sono conservati solo nella configurazione privata e nel runtime restano gli hash; non sono stati distribuiti né usati da tre persone reali. |
| Regole semplici con numerazione sequenziale | **pubblicato**. Numerazione sequenziale e distinzione fra regole pubbliche e configurazione tecnica. |
| Conferma email, recupero, sessioni e sicurezza del servizio reale | **non completato**. Flussi simulati, limiti persistenti e pulizia degli account mai verificati sono testati; Gmail non è ancora configurato né provato con consegna reale. |

### Forum, issue e voto

| Requisito | Stato e riscontro |
| --- | --- |
| Forum PR2 per conversazioni generali e testi lunghi | **solo runtime indipendente**. Thread e commenti persistenti testati, non attivi online. |
| Lettura pubblica di issue, discussioni e risultati salvo privato PR2 | **solo runtime indipendente**. Autorizzazioni server testate; verifica operativa remota mancante. |
| Issue senza limite editoriale con modulo guidato facoltativo | **solo runtime indipendente**. Modulo e limiti tecnici implementati; non attivo online. |
| Una o più soluzioni senza limite editoriale prefissato | **solo runtime indipendente**. Implementazione verificata con limiti tecnici di richiesta. |
| Ogni PR2 ha diritto di voto, anche nuovo ammesso | **solo runtime indipendente**. Quorum e aventi diritto aggiornati fino alla scadenza; prova integrata di voto di un nuovo PR2 e rifiuto delle scritture comunitarie per PR1. |
| Metodi, termini, schede nominative ed esportazione verificabile | **solo runtime indipendente**. Metodi e scrutinio testati; nessuna garanzia assoluta contro amministratore. |
| Chat PR2 con stanze, 200 parole e un messaggio/minuto | **solo runtime indipendente**. Cinque stanze, limite condiviso nel processo, test di concorrenza. |
| Chat temporanea 48h con link/immagini e invito al forum permanente | **solo runtime indipendente**. RAM senza archivio applicativo; riavvio può cancellare prima, terzi possono copiare. |

### Garanzie e consegna

| Requisito | Stato e riscontro |
| --- | --- |
| Traduzione forum/chat con originali e nessuna cache applicativa | **solo runtime indipendente**. Provider esterni dichiarati; nessuna garanzia sul trattamento dei provider. |
| Revisione italiana e internazionale di ogni testo e documento | **non completato**. Revisioni parziali; il controllo dell’intero corpus resta aperto. |
| Audit sicurezza, concorrenza, backup e ripristino remoti | **parziale**. Backup cifrato e ripristino isolato locale sono riusciti; audit esterno, conservazione fuori macchina e ripristino su un secondo custode non sono stati collaudati. |
| Licenze libri, immagini, feed, software e attribuzioni | **non completato**. Catalogo e riferimenti presenti; revisione completa dei diritti aperta. |
| Adempimenti italiani/europei e modalità di pubblicazione non commerciale | **non completato**. Note operative predisposte; verifica legale attuale e decisioni del gestore ancora necessarie. |
| Valutazione delle norme territorialmente applicabili | **non certificabile**. Nessuna dichiarazione universale attendibile; occorre definire giurisdizioni e obblighi applicabili. |
| Indipendenza di sorgenti, dati e login dai fornitori precedenti | **parziale**. Runtime indipendente locale attivo; il percorso pubblico gratuito e l'email Gmail non sono ancora collaudati. |
| Completamento dei quattro obiettivi complessivi | **non completato**. Nessun macro-obiettivo è attestato come integralmente completato e verificato online. |

## Criterio di chiusura

Ogni requisito richiede evidenza pertinente: codice e test per il comportamento, verifica del percorso pubblico per l’uso online, osservazioni sui dispositivi per l’impaginazione. Registrazioni, forum e voto richiedono inoltre email reali, persistenza dopo riavvio, isolamento fra utenti e prova di ripristino. Aggiornare la riga interessata invece di aggiungere resoconti duplicati.

I blocchi esterni non devono nascondere i difetti correggibili nel codice; una configurazione preparata non equivale a un servizio attivo.

La pagina di custodia condivisa e gli snapshot firmati descrivono strumenti e limiti disponibili oggi. Replica automatica fra PC, failover con un solo nodo rimasto, consenso distribuito tipo blockchain e cifratura end-to-end non sono implementati e non vanno dichiarati tali.
