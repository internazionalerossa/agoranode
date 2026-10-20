# Prima pubblicazione di PolisRossa

Questa guida riguarda il servizio indipendente, con accesso PR1 tramite email e password e collegamento social per l’adesione PR2. GitHub conserva i sorgenti; non esegue il server, non conserva gli account e non pubblica automaticamente l’anteprima. Il nome visibile è PolisRossa, senza trattino; nelle altre lingue Polis rimane invariato e il colore viene tradotto.

## Cosa è pronto e che cosa richiede dati reali

Il codice comprende rassegna, biblioteca, server Node, PostgreSQL, invio email, accesso personale, ammissioni, forum e voto. I controlli locali verificano il codice con dati sintetici. Non attestano il funzionamento del mittente, l’accesso al database remoto, i backup o le procedure del titolare. Registrazioni e forum sono chiusi per impostazione predefinita.

La rassegna integra l’Osservatorio: ricerca, periodo e ordinamento sono subito visibili; “Ultime 6 ore” usa la stessa lista e gli stessi filtri. I canali regionali non hanno una pagina separata. L’impaginazione è centrata, con larghezze ridimensionabili e dimensioni più compatte. La verifica visiva su dispositivi reali deve accompagnare il collaudo finale.

## Sette aree operative da completare

Queste sono sette aree di lavoro per questo progetto, non un numero universale di moduli imposto dalla legge. Gli obblighi dipendono dal servizio realmente offerto.

| Area | Realizzato nel codice | Necessario prima dell’apertura |
| --- | --- | --- |
| 1. Informativa privacy | Informativa pubblica e condizioni d’uso distinte, stato del servizio dal server, contatto ricavato dalla configurazione | Identità del titolare, recapito operativo, basi giuridiche definitive, destinatari effettivi, localizzazioni e garanzie per i trasferimenti |
| 2. Cookie e strumenti esterni | Nessun analytics o advertising introdotto dal progetto; inventario della memoria locale, cancellazione selettiva di localStorage e Cache Storage, immagini pubbliche tramite proxy dello stesso sito, anteprime esterne attivate e chiuse su richiesta | Verifica delle richieste e dei cookie sull’hosting definitivo. Solo strumenti strettamente tecnici non richiedono un banner di consenso; eventuali strumenti non tecnici vanno bloccati prima della scelta |
| 3. Comunità e dati particolari | Accesso distinto PR1/PR2; traduzione di forum e chat avviata soltanto con comando esplicito, interrompibile | Definire base giuridica ex art. 9 ove applicabile, granularità e documentazione dei consensi, revoca, visibilità delle identità e delle schede di voto, politica per minori. L’accettazione delle regole non sostituisce questi presupposti |
| 4. Diritti degli utenti | Esportazione privata dei dati applicativi dell’account; collegamenti riservati per richieste e segnalazioni | Procedura verificata per accesso completo, rettifica, cancellazione o anonimizzazione, portabilità ove applicabile, opposizione e limitazione. Di regola risposta entro un mese; eventuale proroga motivata e comunicata nei termini |
| 5. Conservazione e sicurezza | Sessioni sicure di sette giorni, account verificati, isolamento dei dati, reset con revoca delle sessioni, chat soltanto in memoria con azzeramento ogni 48 ore | Tempi effettivi di account, forum, log e backup; prova di ripristino; contratti con responsabili; gestione incidenti e valutazione notifiche. La notifica all’autorità entro 72 ore è soggetta alle condizioni dell’art. 33, non un adempimento indiscriminato per ogni guasto |
| 6. Forum, moderazione e reclami | Regole pubbliche, collegamento riservato per segnalazioni, separazione discussioni/proposte | Valutare l’inquadramento DSA; predisporre ricezione e trattamento delle segnalazioni, motivazioni delle decisioni e contestazioni nei casi applicabili. Valutare registro dei trattamenti, necessità di DPIA e nomina DPO in base ai presupposti effettivi, senza presumere esenzioni per le sole dimensioni ridotte |
| 7. Contenuti e identificazione del servizio | AGPL-3.0-or-later, NOTICE, politica sul marchio e attribuzioni | Verifica dei diritti di testi, fotografie, edizioni e traduzioni; canale di rettifica/rimozione; verifica dell’inquadramento editoriale, fiscale e di eventuali obblighi di accessibilità applicabili all’attività concreta |

Un account non richiede un generico consenso a qualunque uso dei dati. La creazione richiesta del servizio e l’informazione fornita vanno distinte da scelte facoltative o da trattamenti di categorie particolari. Non dichiarare la piattaforma «conforme al GDPR» soltanto perché la pagina Privacy esiste.

## Configurazione gratuita verificata il 20 ottobre 2026

Il target applicativo predisposto è un servizio **Render Free**, regione Francoforte. Il servizio si sospende dopo 15 minuti senza richieste e può impiegare circa un minuto a riavviarsi; il piano ha quote e limiti di traffico in uscita. Il carico di un aggregatore con molte fonti va misurato. Il database gratuito Render scade dopo 30 giorni: non usarlo come archivio duraturo di account e forum.

Un progetto Supabase esistente, `internazionale-rossa`, risulta attivo in `eu-central-1`; lo schema `public` non contiene ancora tabelle del progetto alla verifica. La disponibilità del progetto non equivale a una connessione funzionante dal server. Verificare che l’organizzazione sia sul piano Free: il piano gratuito pubblicato include 500 MB e sospende i progetti inattivi dopo una settimana. Non sono stati creati nuovi servizi o modificati piani.

PostgreSQL e Better Auth restano componenti open source del runtime. Supabase può essere usato soltanto come database: l’accesso PR1 resta gestito da Better Auth; per PR2 lo stesso account collega Facebook o Discord con OAuth. Prima di eseguire le migrazioni, impedire che le tabelle private siano accessibili tramite Data API; usare schema non esposto o revoche appropriate e RLS come difesa aggiuntiva. Il browser non deve ricevere credenziali del database o chiavi privilegiate.

## Passaggi di pubblicazione

1. Apri [il Blueprint predisposto per questa repository](https://dashboard.render.com/blueprint/new?repo=https://github.com/internazionalerossa/polisrossa). Nel tuo account scegli lo spazio di lavoro del progetto. Verifica `plan: free` e Francoforte prima di creare il servizio. Il file `render.yaml` deve essere presente nel ramo `main`.
2. Configura in Render i valori richiesti dal Blueprint: `APP_URL`, `DATABASE_URL`, mittente e credenziale email, `PUBLIC_OPERATOR_NAME` e `PUBLIC_PRIVACY_CONTACT`. Il segreto di autenticazione viene generato dal servizio. Le credenziali vanno inserite nei campi protetti del provider, mai in chat, nei file pubblici o nelle issue.
3. Il database deve essere raggiungibile dal runtime Render con TLS verificato. Il processo di avvio esegue le migrazioni prima del server; controllarne l’esito. Per Supabase scegliere il tipo di connessione e il pooler appropriato alle reti disponibili, senza disabilitare la verifica dei certificati o esporre le tabelle al browser.
4. Verifica `/healthz`, caricamento pubblico delle notizie, filtri, biblioteca, immagini e traduzioni. Mantieni `REGISTRATIONS_OPEN=false` e `FORUM_OPEN=false` durante questa fase.
5. Completa le sette aree applicabili con i dati e le procedure reali del gestore. Verifica dominio del mittente e consegna delle email; prova un backup e il suo ripristino. Non usare il test locale come prova di questi passaggi.
6. Apri le registrazioni solo dopo il collaudo. Prova un account reale: registrazione, conferma email, recupero password, salvataggio e ripristino da un secondo browser, esportazione dati e gestione di una richiesta di cancellazione.
7. Configura gli inviti iniziali come hash e verifica PR2: ammissione, discussione libera, proposta, voto, permessi e visibilità. Apri il forum solo quando anche procedure privacy e moderazione sono operative. Verifica che un account PR1 non possa scrivere o votare.
8. Inserisci l’URL ufficiale verificato nel README e nelle informazioni del servizio. Comunica quali funzioni sono attive e i limiti del piano gratuito. Un aggiornamento di GitHub non aggiorna da solo il vecchio indirizzo dell’anteprima.

## Fonti primarie

- [Garante: linee guida cookie e altri strumenti di tracciamento](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876), in particolare uso esclusivo di strumenti tecnici e informativa.
- [GDPR, regolamento UE 2016/679](https://eur-lex.europa.eu/eli/reg/2016/679/oj), articoli 5–9, 12–22, 25, 28, 30, 32–35, 37 e 44–49.
- [Digital Services Act, regolamento UE 2022/2065](https://eur-lex.europa.eu/eli/reg/2022/2065/oj), obblighi e deroghe da valutare per la natura del servizio.
- [Render: condizioni del piano gratuito](https://render.com/docs/free).
- [Supabase: piani e quote](https://supabase.com/pricing).

Per l’esito della revisione delle pagine leggere [PAGE-REVIEW.md](PAGE-REVIEW.md). Per ulteriori dettagli su licenze, gestione dei dati e responsabilità, leggere [LEGAL-OPERATIONS.md](LEGAL-OPERATIONS.md), [DEPLOYMENT.md](DEPLOYMENT.md) e [LICENSING.md](LICENSING.md).

## Collegamento social per PR2

Il server supporta Facebook e Discord. Sono mostrati soltanto i provider configurati. La domanda non accetta nome, URL o identificativo social dal browser: il server interroga il provider mediante il collegamento autorizzato. Non è una verifica dell’identità anagrafica. Lo stesso identificativo social non può essere usato per due adesioni PR2.

1. Crea l’app del progetto nel [Discord Developer Portal](https://discord.com/developers/applications) oppure in [Meta for Developers](https://developers.facebook.com/apps/). Completa gli eventuali passaggi richiesti dal provider per l’uso pubblico.
2. Inserisci **una coppia completa** in Render → Environment: `DISCORD_CLIENT_ID` e `DISCORD_CLIENT_SECRET`, oppure `FACEBOOK_CLIENT_ID` e `FACEBOOK_CLIENT_SECRET`. Non incollare segreti in chat, documentazione o repository.
3. Registra l’URL di ritorno sul dominio ufficiale: `${APP_URL}/api/identity/callback/discord` oppure `${APP_URL}/api/identity/callback/facebook`. Le parentesi indicano il valore da sostituire, non un URL letterale.
4. Prova da un account PR1 appena autenticato: collega social, autorizza, torna al sito, verifica il nome e presenta la domanda. Verifica anche rifiuto dell’autorizzazione, sessione scaduta e account già collegato. I token sono cifrati e non vengono restituiti al browser.
5. Tre membri fondatori distinti usano gli inviti monouso. Tutte le successive domande sono nella dashboard dei PR2, inclusi i membri appena ammessi: tre sì ammettono, tre no respingono, altrimenti scadenza dopo 72 ore.

La prova automatizzata percorre il callback OAuth con un provider simulato e verifica stato, sessione, cifratura e rifiuto dei dati contraffatti. Non sostituisce il collaudo con le credenziali reali del provider.

Stato infrastruttura ricontrollato il 20 ottobre 2026: nessun servizio restituito da Render nel workspace confermato; Supabase è attivo ma non contiene tabelle dell’applicazione. Mancano al runtime la connessione privata al database, la credenziale email e le credenziali OAuth. Il titolare e il recapito privacy devono ancora essere confermati. Nessun dato di questi servizi è stato inventato o pubblicato.

Riferimenti: [Better Auth — Discord](https://better-auth.com/docs/authentication/discord), [Facebook](https://better-auth.com/docs/authentication/facebook), [account collegati](https://better-auth.com/docs/concepts/users-accounts), [Render — variabili e segreti](https://render.com/docs/configure-environment-variables).
