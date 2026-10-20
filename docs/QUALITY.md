# Stato delle verifiche e requisiti aperti

Aggiornamento: 20 ottobre 2026. Questo registro distingue codice verificato, comportamento pubblicato e servizio operativo. Un test locale non attesta un flusso funzionante sul database remoto. Nessuno dei quattro obiettivi generali è dichiarato integralmente concluso.

## Evidenze disponibili

- Anteprima pubblica disponibile; autenticazione indipendente e scritture della comunità non attive su quell’indirizzo.
- Revisione delle spiegazioni in README e guide, pagine principali, 64 tappe storiche, 11 introduzioni ai dossier, 32 descrizioni di libri e 18 ambiti statistici. Valori, date, fonti, edizioni e identificativi conservati; la revisione non riscrive i testi originali degli editori.
- Compilazione, controlli dei tipi e suite automatiche verificati. I risultati puntuali accompagnano ogni consegna; non attestano il funzionamento remoto delle funzioni chiuse.
- Account, ammissioni, salvataggi e forum testati con PGlite e sessioni sintetiche; non sono prove di email reali, disponibilità del provider, backup remoto o concorrenza fra repliche.
- Prove browser precedenti hanno rilevato immagini assenti. Non è stato completato un controllo manuale di ogni percorso.
- GitHub: sorgenti pubblicati in `internazionalerossa/polisrossa`; 316 file della prima importazione verificati tramite una nuova clonazione e confronto degli hash, senza differenze. Database ed email di produzione non configurati.

## Requisiti per area

### Identità e pubblicazione

| Requisito | Stato e riscontro |
| --- | --- |
| Nome Polis-Rossa in marchio, caricamento e pagine | **verifica parziale**. Marchio, caricamento, testi, metadati e documenti rinominati; Polis invariato e colore tradotto localmente nella lingua di lettura. Verifica visiva integrale ancora necessaria. |
| Stella rossa a cinque punte e logo senza note musicali | **codice e anteprima**. Componenti di identità aggiornati; giudizio visivo finale aperto. |
| Eliminare dati personali dai sorgenti pubblici | **verifica parziale**. Sorgenti indipendenti ripuliti; vecchio URL pubblico contiene ancora un identificativo personale. |
| Repository pubblico sul nuovo account | **pubblicato**. Importazione completa sul ramo `main`, commit `75794622383652392ae0c288f50848da9bc8b151`; copia remota verificata. |
| Link al sito nel README e istruzioni di contribuzione | **verifica parziale**. Documenti predisposti; indirizzo definitivo e revisione finale da completare. |
| Sorgenti completi scaricabili | **consegnato**. ZIP completo disponibile; aggiornare il pacchetto insieme ai sorgenti. |
| Anteprima sul vecchio indirizzo | **pubblicato**. Anteprima pubblicata; deployment e sorgenti devono restare riferiti allo stesso commit verificato. |
| Hosting gratuito indipendente in Europa, senza Koyeb | **bloccato**. Configurazione predisposta; database, email e servizio non collegati. |
| Licenza, avvisi e identità del progetto | **implementato**. AGPL-3.0-or-later, ambito dei diritti di terzi, avvisi di garanzia, politica separata per nome e logo, dichiarazione sui diritti dei contributi e collegamenti ai sorgenti nell’interfaccia. Nessuna registrazione del marchio o conformità globale attestata. |

### Notizie e fonti

| Requisito | Stato e riscontro |
| --- | --- |
| Fonti di sinistra e università solo pubbliche | **verifica parziale**. Policy ed esclusioni implementate; revisione editoriale completa non conclusa. |
| Ampliare fonti da tutto il mondo e riferimenti di Ottolina | **parziale**. 177 fonti dirette e 136 radar; copertura mondiale non esaustiva. |
| Consultare automaticamente tutte le fonti senza carica altre fonti | **codice verificato**. Raccolta concorrente limitata e cancellabile; disponibilità live di ogni fonte non garantita. |
| Distinguere rassegna e osservatorio ultime sei ore | **codice e anteprima**. Viste distinte; audit completo dei rimandi aperto. |
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
| Molti canali globali con filtri, senza filtro piattaforma | **parziale**. 84 canali; filtri per lingua, paese, tema e canale. |
| Orario e visualizzazioni reali dei video | **parziale**. Mostrati quando il fornitore li rende disponibili; niente valori inventati. |
| Thumbnail stabili e video del paese prima degli altri | **verifica parziale**. Priorità e conservazione immagini testate; disponibilità immagini esterne aperta. |

### Biblioteca, storia e dati

| Requisito | Stato e riscontro |
| --- | --- |
| Molti libri globali, Mao, sovietici e altre tradizioni integrate | **parziale**. 176 opere, 724 edizioni, 37 lingue; catalogo selettivo. |
| Lettura interna e testo senza omissioni o errori di codifica | **codice verificato**. Parsing, paginazione e navigazione testati; tutte le edizioni non collaudate. |
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
| IR1 email/password senza approvazione comunitaria | **solo runtime indipendente**. Registrazione con email e password verificata senza profilo social; salvataggi IR1 testati prima dell’ammissione IR2. Non attiva online sul precedente indirizzo. |
| IR1 salvataggi privati persistenti dopo cancellazione cache | **solo runtime indipendente**. Database remoto previsto; isolamento e riapertura DB testati localmente. |
| IR2 verifica persona/ente e nome riconoscibile nel voto | **solo runtime indipendente**. Profilo con riferimento pubblico e ammissione; non certifica identità civile. |
| Tre sì da IR2 distinti entro 72 ore | **solo runtime indipendente**. Regole e test presenti; nessuna comunità reale attivata. |
| Avvio dei tre membri iniziali con procedura sicura | **bloccato**. Inviti personali monouso previsti; non configurati né distribuiti. |
| Regole semplici con numerazione sequenziale | **pubblicato**. Numerazione sequenziale e distinzione fra regole pubbliche e configurazione tecnica. |
| Conferma email, recupero, sessioni e sicurezza del servizio reale | **non completato**. Flussi simulati verificati; consegna email e configurazione remota mancanti. |

### Forum, issue e voto

| Requisito | Stato e riscontro |
| --- | --- |
| Forum IR2 per conversazioni generali e testi lunghi | **solo runtime indipendente**. Thread e commenti persistenti testati, non attivi online. |
| Lettura pubblica di issue, discussioni e risultati salvo privato IR2 | **solo runtime indipendente**. Autorizzazioni server testate; verifica operativa remota mancante. |
| Issue senza limite editoriale con modulo guidato facoltativo | **solo runtime indipendente**. Modulo e limiti tecnici implementati; non attivo online. |
| Una o più soluzioni senza limite editoriale prefissato | **solo runtime indipendente**. Implementazione verificata con limiti tecnici di richiesta. |
| Ogni IR2 ha diritto di voto, anche nuovo ammesso | **solo runtime indipendente**. Quorum e aventi diritto aggiornati fino alla scadenza; prova integrata di voto di un nuovo IR2 e rifiuto delle scritture comunitarie per IR1. |
| Metodi, termini, schede nominative ed esportazione verificabile | **solo runtime indipendente**. Metodi e scrutinio testati; nessuna garanzia assoluta contro amministratore. |
| Chat IR2 con stanze, 200 parole e un messaggio/minuto | **solo runtime indipendente**. Cinque stanze, limite condiviso nel processo, test di concorrenza. |
| Chat temporanea 48h con link/immagini e invito al forum permanente | **solo runtime indipendente**. RAM senza archivio applicativo; riavvio può cancellare prima, terzi possono copiare. |

### Garanzie e consegna

| Requisito | Stato e riscontro |
| --- | --- |
| Traduzione forum/chat con originali e nessuna cache applicativa | **solo runtime indipendente**. Provider esterni dichiarati; nessuna garanzia sul trattamento dei provider. |
| Revisione italiana e internazionale di ogni testo e documento | **non completato**. Revisioni parziali; il controllo dell’intero corpus resta aperto. |
| Audit sicurezza, concorrenza, backup e ripristino remoti | **non completato**. Test locali presenti; ambiente remoto non configurato. |
| Licenze libri, immagini, feed, software e attribuzioni | **non completato**. Catalogo e riferimenti presenti; revisione completa dei diritti aperta. |
| Adempimenti italiani/europei e modalità di pubblicazione non commerciale | **non completato**. Note operative predisposte; verifica legale attuale e decisioni del gestore ancora necessarie. |
| Valutazione delle norme territorialmente applicabili | **non certificabile**. Nessuna dichiarazione universale attendibile; occorre definire giurisdizioni e obblighi applicabili. |
| Indipendenza di sorgenti, dati e login dai fornitori precedenti | **parziale**. Runtime indipendente pronto; sito pubblico rimane sul vecchio hosting. |
| Completamento dei quattro obiettivi complessivi | **non completato**. Nessun macro-obiettivo è attestato come integralmente completato e verificato online. |

## Criterio di chiusura

Ogni requisito richiede evidenza pertinente: codice e test per il comportamento, verifica del percorso pubblico per l’uso online, osservazioni sui dispositivi per l’impaginazione. Registrazioni, forum e voto richiedono inoltre email reali, persistenza dopo riavvio, isolamento fra utenti e prova di ripristino. Aggiornare la riga interessata invece di aggiungere resoconti duplicati.

I blocchi esterni non devono nascondere i difetti correggibili nel codice; una configurazione preparata non equivale a un servizio attivo.
