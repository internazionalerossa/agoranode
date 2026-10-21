# Revisione di pubblicazione — 20 ottobre 2026

Il controllo dei sorgenti copre le destinazioni seguenti. La build e i test automatici verificano rendering e contratti; non sostituiscono una sessione su iPhone e Android fisici, né attestano l’avvenuta configurazione dei fornitori.

| Pagina o flusso | Controlli e risultato nel codice |
| --- | --- |
| Rassegna | Ricerca, periodo, fonte, paese, lingua e ordine usano selezioni reali. Barra mobile contenuta; lettore collegato alla cronologia. Immagini scaricate dal browser soltanto da endpoint dello stesso sito. |
| Fonti | Accesso nell’intestazione, stessa geometria di lingua, salvati e account; ricerca e filtri applicati al catalogo. |
| Biblioteca | Libri, timeline e dati sono destinazioni distinte con URL e cronologia. Attribuzioni e archivi originali conservati. |
| Timeline e dossier | Collegamenti diretti risolti dai router della biblioteca e della storia. Casi storici e riferimenti separati dai dati comparativi. |
| Dati e grafici | Scelte paese/indicatore e dati disponibili effettivi; lettura con unità, anni e fonti. Nessun dato personale inviato alle serie statistiche. |
| Salvati | Distinzione fra copia locale e sincronizzazione. La pulizia delle cache pubbliche preserva salvataggi e modifiche in attesa. |
| Partecipa | Introduzione solo per visitatori e candidati; membri PR2 attivi arrivano direttamente al forum. Riquadro membri delle stesse dimensioni dei controlli di servizio. Il servizio pubblicato non accetta adesioni o messaggi. |
| Account | Richiesta di servizio e accettazione condizioni distinte dal consenso marketing. Collegamenti a informativa e condizioni; registrazione bloccata quando non attiva. |
| Lettore libri | Attribuzioni, lingua e salvataggio della posizione; collegamenti a privacy e condizioni presenti anche fuori dalla pagina principale. |
| Metodo e crediti | Criteri editoriali e attribuzioni accessibili; licenza del codice distinta dai diritti di terzi. |
| Privacy | Stato dal server, inventario localStorage/sessionStorage/Cache Storage, pulizia selettiva, diritti, servizi esterni e limiti espliciti. Identità del titolare non inventata. |
| Condizioni | Destinazione pubblica separata: fonti, riutilizzo, limiti dei confronti, regole di partecipazione, segnalazioni pubbliche e richieste riservate. |

## Geometria dei controlli

Lingua di lettura, I tuoi salvati, Accedi/Registrati, Fonti, Filtri e canali e Membri ammessi usano lo stesso modulo: 164 × 56 px su desktop. Sul telefono la larghezza è metà della superficie utile meno lo spazio fra le colonne; l’altezza resta 56 px. I comandi dell’intestazione formano una griglia 2 × 2. I tre pulsanti della navigazione inferiore formano un gruppo uniforme separato. Il conteggio membri è informativo e non simula un pulsante cliccabile.

## Verifica dal browser pubblico

Il controllo remoto della versione 58, il 20 ottobre 2026 alle 16:41 UTC, è stato bloccato da `ERR_SOCKS_CONNECTION_FAILED` prima del caricamento delle pagine, anche al secondo tentativo. Non ha prodotto misure del layout, verifiche delle immagini o una sessione autenticata. La pubblicazione Sites è riuscita, ma il controllo visivo sul sito rimane da completare. Non considerare questo errore del percorso di accesso una prova che il sito sia indisponibile per tutti.

Il client delle traduzioni usa soltanto `/api/translate`: in caso di errore conserva il testo originale e il comando di ripetizione, senza chiamare direttamente fornitori esterni dal browser. Il comportamento è coperto da una prova che simula il fallimento del server.

## Confini della pubblicazione

L’aggiornamento del sito pubblico non apre automaticamente account, forum o chat. Sono ancora necessari nome/denominazione e recapito privacy del titolare, configurazione e prova dei servizi remoti, basi e procedure per PR2, tempi effettivi dei registri e dei backup, gestione delle segnalazioni e dei diritti. Per gli obblighi applicabili e i riferimenti normativi vedere PUBLICATION.md e LEGAL-OPERATIONS.md. Non qualificare la pubblicazione come certificata GDPR.

## PR2, proposte interne e densità dei comandi

I controlli utilità ora condividono un’altezza di 44 px e larghezza di 136 px su desktop, con due colonne uniformi su mobile. La barra rassegna usa due righe su schermi piccoli: ricerca/filtri e periodo/ordine. Ridotti spazi e divisori senza disabilitare lo zoom.

Partecipa: la scelta PR2 nella prima registrazione crea comunque soltanto PR1. Dopo conferma e accesso servono collegamento Facebook OAuth, nome, presentazione e invio esplicito; il riferimento Facebook deriva da OAuth e il modulo non accetta un URL arbitrario. La dashboard delle richieste è disponibile a tutti i membri attivi, con esito reale sia positivo sia negativo. Discord, Instagram e un sito personale non vengono presentati come prove PR2. Le CTA delle proposte aprono il modulo interno del forum. Le istruzioni estese per PR1/PR2 sono espandibili.

Verifica locale: il contratto della domanda rifiuta `referenceUrl` e altri campi social forniti dal browser; il riferimento Facebook app-scoped viene ricavato dalla claim server-side ed escluso dai payload pubblici. Il percorso Facebook simulato copre avvio, callback, state contraffatto, sessione, scope `public_profile`, claim riletta dal server e rimozione del grant all'invio. Verifica dominio ancora necessaria: PR1 con email confermata, obbligatorietà e unicità dell'account OAuth, voto dei nuovi membri sulle domande già aperte e rifiuto dopo tre no. Il collaudo Meta reale e quello visivo del sito pubblicato restano da eseguire.
