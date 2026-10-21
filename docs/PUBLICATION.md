# Prima pubblicazione di PolisRossa

Questa guida riguarda il servizio indipendente, con accesso PR1 e ammissione comunitaria separata per PR2. Il percorso operativo scelto prevede di pubblicare l'installazione locale già collaudata mediante **Tailscale Funnel davanti al Caddy locale**, senza inoltri sul router, DMZ o nuove regole del firewall di Windows. Funnel non è ancora attivo: la procedura distingue sotto ogni prova realmente osservata dai passaggi ancora da eseguire. GitHub conserva i sorgenti; non esegue il server, non conserva gli account e non pubblica automaticamente il sito. Il nome visibile è PolisRossa, senza trattino; nelle altre lingue Polis rimane invariato e il colore viene tradotto.

## Cosa è pronto e che cosa richiede dati reali

Il codice comprende rassegna, biblioteca, server Node, PostgreSQL, account con email, collegamento social, ammissioni, forum e voto. I controlli locali verificano il codice con dati sintetici. Non attestano il funzionamento dei provider OAuth, la consegna email, l’accesso al database remoto, i backup o le procedure del titolare. Registrazioni e forum sono chiusi per impostazione predefinita.

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

## Percorso corrente: Funnel davanti all'installazione locale

Aggiornamento del percorso: 21 ottobre 2026.

### Stato osservato e stato ancora da collaudare

L'installazione principale è stata collaudata localmente con Caddy e l'applicazione sulle sole interfacce loopback (`https://localhost:8443` e `http://localhost:8080`), PostgreSQL in un volume persistente e backup cifrato con prova di ripristino. Queste verifiche non attestano la raggiungibilità pubblica.

Al momento della stesura di questa sezione **Tailscale non risulta ancora installato né autenticato, Funnel non risulta attivato e nessun URL `*.ts.net` è stato collaudato da una rete esterna**. Non risultano inoltre collaudati sul dominio pubblico OAuth, consegna email, registrazioni o forum. Aggiornare questo paragrafo soltanto dopo prove realmente osservate, indicando data, URL e risultato senza riportare credenziali.

Il flusso previsto è:

```text
browser -> https://polisrossa.<tailnet>.ts.net:443
        -> certificato pubblico e Funnel gestiti da Tailscale
        -> https+insecure://localhost:8443
        -> Caddy con certificato locale -> applicazione -> PostgreSQL
```

`https+insecure` disabilita la verifica del certificato **soltanto nel salto loopback fra il processo Tailscale e Caddy**, perché il certificato locale di Caddy non appartiene a una CA pubblica. Non disabilita HTTPS per i visitatori: sul lato pubblico Tailscale termina TLS con un certificato valido. Caddy continua a proteggere e inoltrare il traffico locale, ma in questo assetto non emette il certificato pubblico.

Funnel è disponibile su tutti i piani Tailscale ed espone un servizio locale senza rendere pubblico l'indirizzo IP domestico. Il piano Personal è gratuito per uso personale non commerciale; prima di usarlo stabilmente verificare che l'impiego concreto resti compatibile con le condizioni correnti. Non selezionare un piano a pagamento. Funnel è ancora dichiarato beta, accetta soltanto nomi del dominio del tailnet e le porte pubbliche 443, 8443 o 10000, e applica limiti di banda non configurabili. Sul percorso scelto si usa la 443.

Il nome è prevedibile e rimane stabile finché macchina, nome della macchina e tailnet restano gli stessi. La disponibilità dipende però dal PC acceso, dallo stack Docker attivo, dal client Tailscale connesso, da MagicDNS, HTTPS e autorizzazione Funnel abilitati nel tailnet e dal servizio Tailscale stesso. Il comando di abilitazione può configurare certificati e attributo Funnel dopo l'approvazione del gestore. Questo ingresso non realizza replica del database, subentro automatico di un altro PC, consenso distribuito o cifratura end-to-end dei dati applicativi: se questa macchina si ferma, questo URL si ferma.

### Perché `polisrossa.duckdns.org` non può restare l'indirizzo pubblico

La specifica DuckDNS consente di aggiornare indirizzi IPv4/IPv6 e record TXT, ma non espone un record CNAME supportato. Inoltre Funnel accetta soltanto nomi appartenenti al dominio `*.ts.net` del tailnet e rilascia il certificato per quel nome. Non esiste quindi, con questi due servizi, un percorso supportato per conservare `https://polisrossa.duckdns.org` davanti a Funnel.

L'origine pubblica diventa `https://polisrossa.<tailnet>.ts.net`, dove `<tailnet>` è il nome effettivo assegnato da Tailscale. `APP_URL` deve contenere esattamente questa origine, **senza `:8443`**: 8443 rimane soltanto la porta locale fra Funnel e Caddy. Il record DuckDNS e il suo token non servono a questo percorso; non cancellarli né pubblicarli, ma lasciare disattivato l'aggiornamento automatico finché non si decide un uso diverso.

Funnel non espone la porta pubblica 80. Di conseguenza non può offrire un redirect pubblico da `http://...` a `https://...`: va condiviso sempre l'URL completo che inizia con `https://`, la cui porta esterna implicita è 443. Se il redirect dalla porta 80 diventa un requisito inderogabile, occorre scegliere un altro ingresso pubblico e collaudarlo separatamente.

### Procedura concreta, senza router né firewall

1. Prima di cambiare l'origine, esegui e verifica un nuovo backup cifrato seguendo [SELF-HOSTING.md](SELF-HOSTING.md). Non usare `docker compose down -v`: eliminerebbe i volumi. Conferma che `node scripts/selfhost.mjs status` e `https://localhost:8443/healthz` rispondano localmente.
2. Installa il client Tailscale per Windows dal sito ufficiale. L'installazione richiede l'autorizzazione amministrativa; l'accesso nel browser e l'eventuale approvazione di Funnel devono essere eseguiti personalmente dal gestore. Scegli il piano Personal gratuito soltanto se l'uso è idoneo e non inserire dati di pagamento. Non modificare router, DMZ, inoltri WAN o regole del firewall.
3. Dopo l'accesso, assegna alla macchina il nome stabile `polisrossa` dalla pagina Machines oppure con `tailscale set --hostname=polisrossa`. Dalla pagina DNS ricava il nome reale del tailnet. Il dominio completo avrà la forma `polisrossa.<tailnet>.ts.net`; non inventarlo e non procedere finché non compare nella console Tailscale.
4. Aggiorna insieme l’origine privata e gli host accettati da Caddy, sostituendo il nome reale:

   ```powershell
   node scripts/selfhost.mjs tunnel-origin https://polisrossa.<tailnet>.ts.net
   ```

   Il comando conserva segreti e altre variabili, richiede che le porte restino legate a `127.0.0.1`, configura il certificato interno soltanto per il salto locale e imposta il redirect HTTP locale verso l’HTTPS pubblico senza `:8443`. Compila poi `PUBLIC_OPERATOR_NAME` e `PUBLIC_PRIVACY_CONTACT` nel file privato `.selfhost/runtime.env`. Conserva nello stesso file, mai in Git o in chat, le credenziali email. Se scegli la prova OAuth facoltativa, conserva qui anche `FACEBOOK_CLIENT_ID` e `FACEBOOK_CLIENT_SECRET` e registra in Meta il callback `https://polisrossa.<tailnet>.ts.net/api/identity/callback/facebook`.
5. Lascia inizialmente `REGISTRATIONS_OPEN=false` e `FORUM_OPEN=false`, esegui `node scripts/selfhost.mjs account-access` e `node scripts/selfhost.mjs community-invites`, riavvia con `node scripts/selfhost.mjs start`, quindi esegui `node scripts/selfhost.mjs preflight`. Devono risultare validi origine pubblica, contatto, trasporto email e corrispondenza dei due file privati con il singolo hash account e i tre hash invito. Facebook non è bloccante; una coppia di credenziali incompleta sì. Il controllo non sostituisce una consegna email o un callback reale.
6. In un PowerShell avviato come amministratore esegui:

   ```powershell
   tailscale funnel --bg --https=443 https+insecure://localhost:8443
   tailscale funnel status
   ```

   Il primo comando può aprire la pagina Tailscale che chiede di abilitare Funnel e HTTPS. Approva personalmente. `--bg` conserva la configurazione attraverso il riavvio del client; non prova però che Windows, Docker e l'applicazione siano tutti ripartiti correttamente dopo un riavvio.
7. Da un dispositivo esterno apri esclusivamente l'URL HTTPS restituito da `tailscale funnel status`. Verifica `/healthz`, home, notizie, biblioteca, storia, dati, immagini e traduzioni. Il certificato deve risultare valido per l'hostname effettivo che termina in `.ts.net`; URL, redirect, cookie e link non devono contenere `localhost` o `:8443`.
8. Dopo il collaudo di sola lettura, abilita `REGISTRATIONS_OPEN=true`, riavvia e prova con il codice privato una registrazione reale con email, conferma, recupero password, uscita e nuovo accesso, persistenza dei salvataggi dopo un riavvio ed esportazione/cancellazione dei dati di prova. Il codice condiviso limita l'uso anonimo della quota ma non verifica l'identità. Con SMTP attivo il server rifiuta l'accesso PR1 diretto tramite social. In caso di errore richiudi subito le registrazioni.
9. Solo dopo il test degli account imposta `FORUM_OPEN=true`, riavvia e collauda PR2 con tre inviti distinti: da sessioni PR1 verificate invia nome, presentazione e URL HTTPS dichiarato, fai valutare soggettivamente il riferimento, quindi prova ammissione, discussione, proposta, voto, permessi e visibilità pubblica. Verifica che il riferimento sia mostrato soltanto a candidato e revisori, escluso da topic, schede ed export pubblici, e cancellato al ritiro. Facebook OAuth è un test aggiuntivo facoltativo; Discord non deve essere proposto come prova PR2. In caso di errore reimposta `FORUM_OPEN=false`.
10. Per il collaudo esterno finale usa un telefono con Wi-Fi spento e indicatore dati mobili attivo. Apri una finestra privata, digita l'URL HTTPS completo e prova consultazione, creazione/accesso account, ricezione email e forum secondo il ruolo. Ripeti dopo un riavvio del PC. Registra data, operatore mobile, percorsi provati e codici HTTP, ma non token, cookie, email personali o screenshot contenenti segreti.

Su Windows, se il sito deve rimanere disponibile senza una sessione utente aperta, abilita **Run unattended** dal menu Tailscale soltanto dopo il collaudo e verifica davvero un riavvio o una disconnessione. Tailscale segnala inoltre che le chiavi dei nodi scadono normalmente dopo 180 giorni; l'eventuale disattivazione della scadenza va limitata a una macchina fidata e documentata come scelta di sicurezza, non come automatismo.

### Chiusura immediata dell'accesso pubblico

Per rimuovere tutta la configurazione Funnel senza fermare Caddy, l'applicazione o PostgreSQL:

```powershell
tailscale funnel reset
tailscale funnel status
```

Il secondo comando non deve più mostrare un server pubblico. Verifica anche dal telefono, sempre con Wi-Fi spento, che l'URL non sia raggiungibile. Per una chiusura applicativa prudente reimposta inoltre `REGISTRATIONS_OPEN=false` e `FORUM_OPEN=false` in `.selfhost/runtime.env` e riavvia lo stack. Queste operazioni non cancellano database, volumi, backup o certificati locali. Se occorre fermare anche il sito locale, usa `node scripts/selfhost.mjs stop`, che conserva i dati.

## Alternativa separata: Render e Supabase

Il repository contiene anche un Blueprint Render; non è il percorso corrente e non va attivato insieme a Funnel senza una decisione esplicita sulla fonte autorevole dei dati. Lo stato seguente è quello registrato il 20 ottobre 2026 e non è stato riconfermato durante la preparazione della procedura Funnel.

Il target applicativo predisposto è un servizio **Render Free**, regione Francoforte. Il servizio si sospende dopo 15 minuti senza richieste e può impiegare circa un minuto a riavviarsi; il piano ha quote e limiti di traffico in uscita. Il carico di un aggregatore con molte fonti va misurato. Il database gratuito Render scade dopo 30 giorni: non usarlo come archivio duraturo di account e forum.

Il progetto Supabase confermato dal gestore risultava attivo in `eu-west-1` sul piano **Free**. Erano state create le 21 tabelle del progetto, comprese le tabelle Better Auth e il registro delle sette migrazioni applicative. Scrittura, lettura in una richiesta successiva e cancellazione di un dato tecnico erano state provate sul database remoto, senza creare account fittizi. Questa prova non certificava la connessione dal server Render. Non erano stati cambiati piani né attivati servizi a pagamento.

PostgreSQL e Better Auth restano componenti open source del runtime. Supabase può essere usato soltanto come database: l'accesso PR1 resta gestito da Better Auth con email confermata; PR2 richiede nome e riferimento HTTPS dichiarati, mentre Facebook OAuth è facoltativo. Discord non qualifica una domanda PR2. Le tabelle predisposte avevano RLS abilitata e nessun accesso diretto autorizzato per i client. [Lo script iniziale](../sql/supabase-initial-setup.sql) è destinato esclusivamente a un database nuovo con schema `public` vuoto: non rieseguirlo sul progetto già preparato.

Render aveva assegnato `https://polisrossa.onrender.com`; l'assegnazione del nome non attesta che il servizio sia ora avviato o che account e forum siano operativi. Se in futuro si sceglie questa alternativa, ricontrollare prezzi e condizioni, configurare i segreti nel pannello protetto, usare una connessione PostgreSQL con TLS, eseguire le migrazioni e ripetere tutti i collaudi pubblici descritti sopra. Non acquistare un piano e non trattare Render o Supabase come replica automatica dell'installazione locale: tale replica non è implementata.

## Fonti primarie

- [Tailscale: requisiti, funzionamento e limiti di Funnel](https://tailscale.com/docs/features/tailscale-funnel).
- [Tailscale: sintassi corrente di `tailscale funnel`, stato e reset](https://tailscale.com/docs/reference/tailscale-cli/funnel).
- [Tailscale: installazione su Windows](https://tailscale.com/docs/install/windows).
- [Tailscale: modalità non presidiata e scadenza delle chiavi su Windows](https://tailscale.com/docs/how-to/run-unattended).
- [Tailscale: composizione dei nomi DNS del tailnet](https://tailscale.com/docs/concepts/tailnet-name).
- [Tailscale: piani e condizioni del piano Personal](https://tailscale.com/pricing).
- [DuckDNS: specifica per aggiornamenti IPv4, IPv6 e TXT](https://www.duckdns.org/spec.jsp).
- [Garante: linee guida cookie e altri strumenti di tracciamento](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876), in particolare uso esclusivo di strumenti tecnici e informativa.
- [GDPR, regolamento UE 2016/679](https://eur-lex.europa.eu/eli/reg/2016/679/oj), articoli 5–9, 12–22, 25, 28, 30, 32–35, 37 e 44–49.
- [Digital Services Act, regolamento UE 2022/2065](https://eur-lex.europa.eu/eli/reg/2022/2065/oj), obblighi e deroghe da valutare per la natura del servizio.
- [Render: condizioni del piano gratuito](https://render.com/docs/free).
- [Supabase: piani e quote](https://supabase.com/pricing).
- [Supabase: connessioni PostgreSQL e session pooler](https://supabase.com/docs/guides/database/connecting-to-postgres).
- [Supabase: protezione della Data API](https://supabase.com/docs/guides/api/securing-your-api).
- [Supabase: significato dell’avviso RLS senza policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Per l’esito della revisione delle pagine leggere [PAGE-REVIEW.md](PAGE-REVIEW.md). Per ulteriori dettagli su licenze, gestione dei dati e responsabilità, leggere [LEGAL-OPERATIONS.md](LEGAL-OPERATIONS.md), [DEPLOYMENT.md](DEPLOYMENT.md) e [LICENSING.md](LICENSING.md).

## Riferimento dichiarato e OAuth facoltativo per PR2

Il percorso PR2 richiede un account PR1 con email confermata, un nome dichiarato e un `referenceUrl` HTTPS pubblico a Facebook, Instagram o un sito personale. Il link è dichiarato dal candidato e non verificato: il server non lo visita, non crea anteprime e non lo usa come destinazione del proxy. Non sono ammessi credenziali, porte personalizzate, IP o nomi locali. Soltanto candidato e membri PR2 che valutano la pratica lo vedono; topic, schede ed esportazioni pubbliche lo escludono.

Facebook OAuth è facoltativo e separato dal link dichiarato. Se lo configuri:

1. crea l’app del progetto in [Meta for Developers](https://developers.facebook.com/apps/) e completa gli eventuali passaggi richiesti per l’uso pubblico. PolisRossa richiede soltanto `public_profile`, non l'email Facebook, post, contatti o messaggi;
2. Per l'installazione locale inserisci la coppia completa `FACEBOOK_CLIENT_ID` e `FACEBOOK_CLIENT_SECRET` nel file privato `.selfhost/runtime.env`. Nell'alternativa Render usa invece i campi Environment protetti. Non incollare segreti in chat, documentazione o repository.
3. Registra l’URL di ritorno `${APP_URL}/api/identity/callback/facebook` sul dominio ufficiale. Le parentesi indicano il valore da sostituire, non un URL letterale.
4. soltanto con `FORUM_OPEN=true`, prova da un account PR1 con email confermata e autenticazione recente: collega Facebook, autorizza e torna al sito. La domanda rilegge provider, nome e identificativo dal server, impedisce il riuso dello stesso account e rimuove il grant locale prima dell’inserimento; un grant non usato viene rimosso dopo 24 ore dalla pulizia giornaliera. Verifica che a forum chiuso collegamento e callback siano rifiutati ma lo scollegamento resti disponibile, oltre a rifiuto dell’autorizzazione, sessione scaduta e rifiuto dell'accesso PR1 diretto tramite social. Una rara corsa dopo lo scollegamento può richiedere di collegare nuovamente Facebook; il riferimento dichiarato resta sufficiente per inviare senza OAuth.

Tre membri fondatori distinti usano gli inviti monouso. Tutte le successive domande sono nella dashboard dei PR2, inclusi i membri appena ammessi: tre sì ammettono, tre no respingono, altrimenti scadenza dopo 72 ore.

Ritirare una domanda in attesa o respinta è possibile anche con il forum chiuso: elimina nome, presentazione, riferimento dichiarato e dati social della pratica e consente una nuova domanda. Per un membro già attivo occorre la procedura privacy del gestore, perché interventi e voti possono essere pubblici.

La prova automatizzata percorre il callback OAuth Facebook simulato e verifica stato, scope minimo `public_profile`, sessione, cifratura e rifiuto dei dati contraffatti. Non sostituisce il collaudo con le credenziali reali né il giudizio umano del membro.

Stato del percorso corrente: il runtime locale è collaudato, ma Tailscale/Funnel, l'email reale, il titolare e il recapito privacy devono ancora essere configurati e verificati prima dell'apertura. Registrazione, recupero email, riferimento dichiarato, collegamento Facebook facoltativo e forum sul dominio pubblico non sono ancora stati collaudati. Questi passaggi non vanno segnati come completati sulla base dei soli test automatici o locali.

Riferimenti: [Better Auth — Facebook](https://better-auth.com/docs/authentication/facebook), [account collegati](https://better-auth.com/docs/concepts/users-accounts), [Render — variabili e segreti](https://render.com/docs/configure-environment-variables).
