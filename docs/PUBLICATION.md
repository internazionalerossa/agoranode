# Prima pubblicazione di PolisRossa

Questa guida riguarda il servizio indipendente, con accesso PR1 e ammissione comunitaria separata per PR2. Pubblica PolisRossa, prima istanza tematica di AgoràNode; non crea una rete distribuita né replica il database. Il percorso preparato usa un **Cloudflare Worker `workers.dev` davanti a Tailscale Funnel e al Caddy locale**, senza inoltri sul router, DMZ o nuove regole del firewall di Windows. Il Worker non è ancora stato distribuito o attivato: la procedura distingue ciò che è stato osservato da ciò che resta da collaudare. GitHub conserva i sorgenti; non esegue il server, non conserva gli account e non pubblica automaticamente il sito. Il repository canonico è `internazionalerossa/agoranode`; la rinomina non modifica database, volumi o configurazioni dell’istanza PolisRossa.

## Cosa è pronto e che cosa richiede dati reali

Il codice comprende rassegna, biblioteca, server Node, PostgreSQL, account con email, collegamento social, ammissioni, forum, voto e un deposito append-only della conoscenza. L’importatore corrente copre 64 eventi e 17 persone e l’esportatore produce un bundle deterministico senza dati personali. Non esiste ancora un editor pubblico collegato alle decisioni del forum; il grant dei contributi è una bozza da sottoporre a revisione legale. I controlli locali non attestano il funzionamento dei provider OAuth, i flussi email completi, la rete esterna o le procedure del titolare. Registrazioni e forum sono chiusi per impostazione predefinita.

La rassegna integra l’Osservatorio: ricerca, periodo e ordinamento sono subito visibili; “Ultime 6 ore” usa la stessa lista e gli stessi filtri. I canali regionali non hanno una pagina separata. L’impaginazione è centrata, con larghezze ridimensionabili e dimensioni più compatte. La verifica visiva su dispositivi reali deve accompagnare il collaudo finale.

## Sette aree operative da completare

Queste sono sette aree di lavoro per questo progetto, non un numero universale di moduli imposto dalla legge. Gli obblighi dipendono dal servizio realmente offerto.

| Area | Realizzato nel codice | Necessario prima dell’apertura |
| --- | --- | --- |
| 1. Informativa privacy | Informativa pubblica e condizioni d’uso distinte, stato del servizio dal server, contatto ricavato dalla configurazione | Identità del titolare, recapito operativo, basi giuridiche definitive, destinatari effettivi, localizzazioni e garanzie per i trasferimenti |
| 2. Cookie e strumenti esterni | Nessun analytics o advertising introdotto dal progetto; inventario della memoria locale, cancellazione selettiva di localStorage e Cache Storage, immagini pubbliche tramite proxy dello stesso sito, anteprime esterne attivate e chiuse su richiesta | Verifica delle richieste e dei cookie sull’hosting definitivo. Solo strumenti strettamente tecnici non richiedono un banner di consenso; eventuali strumenti non tecnici vanno bloccati prima della scelta |
| 3. Comunità e dati particolari | Registrazione PR1 unica; prosecuzione PR2 separata con email verificata, Facebook OAuth obbligatorio e invio esplicito; traduzione di forum e chat avviata soltanto con comando esplicito, interrompibile | Definire base giuridica ex art. 9 ove applicabile, granularità e documentazione dei consensi, revoca, visibilità delle identità e delle schede di voto, politica per minori. L’accettazione delle regole non sostituisce questi presupposti |
| 4. Diritti degli utenti | Esportazione privata dei dati applicativi dell’account; collegamenti riservati per richieste e segnalazioni | Procedura verificata per accesso completo, rettifica, cancellazione o anonimizzazione, portabilità ove applicabile, opposizione e limitazione. Di regola risposta entro un mese; eventuale proroga motivata e comunicata nei termini |
| 5. Conservazione e sicurezza | Sessioni sicure di sette giorni, account verificati, isolamento dei dati, reset con revoca delle sessioni, chat soltanto in memoria con azzeramento ogni 48 ore | Tempi effettivi di account, forum, log e backup; prova di ripristino; contratti con responsabili; gestione incidenti e valutazione notifiche. La notifica all’autorità entro 72 ore è soggetta alle condizioni dell’art. 33, non un adempimento indiscriminato per ogni guasto |
| 6. Forum, moderazione e reclami | Regole pubbliche, collegamento riservato per segnalazioni, separazione discussioni/proposte | Valutare l’inquadramento DSA; predisporre ricezione e trattamento delle segnalazioni, motivazioni delle decisioni e contestazioni nei casi applicabili. Valutare registro dei trattamenti, necessità di DPIA e nomina DPO in base ai presupposti effettivi, senza presumere esenzioni per le sole dimensioni ridotte |
| 7. Contenuti e identificazione del servizio | AGPL-3.0-or-later per il codice; deposito append-only; licenza scelta dall’autore distinta dal grant `org.agoranode.contribution-grant.v1`; provenienza di autore, richiesta e decisione | Revisione legale del grant prima dell’editing pubblico; verifica dei diritti di testi, fotografie, edizioni e traduzioni; canale di rettifica/rimozione; verifica dell’inquadramento editoriale, fiscale e di eventuali obblighi di accessibilità applicabili all’attività concreta |

Un account non richiede un generico consenso a qualunque uso dei dati. La creazione richiesta del servizio e l’informazione fornita vanno distinte da scelte facoltative o da trattamenti di categorie particolari. Non dichiarare la piattaforma «conforme al GDPR» soltanto perché la pagina Privacy esiste.

## Percorso preparato: Worker davanti a Funnel

Aggiornamento del percorso: 21 ottobre 2026.

### Stato osservato e stato ancora da collaudare

L'installazione principale è stata collaudata localmente con Caddy e l'applicazione sulle sole interfacce loopback (`https://localhost:8443` e `http://localhost:8080`), PostgreSQL in un volume persistente e backup cifrato con prova di ripristino. Queste verifiche non attestano la raggiungibilità pubblica.

Il 21 ottobre 2026 Tailscale è stato installato e autenticato e Funnel ha esposto l’istanza su `https://polisrossa.tail37128d.ts.net/`; home e `/healthz` hanno risposto correttamente dal percorso pubblico usato durante la configurazione. Questa prova non sostituisce ancora il collaudo da una rete mobile indipendente. La connessione SMTP e un messaggio di prova sono stati accettati da Gmail, ma conferma e recupero di un account reale sul dominio pubblico, OAuth Facebook, registrazioni e forum non sono ancora stati collaudati. Aggiornare questo paragrafo soltanto dopo prove realmente osservate, senza riportare credenziali o dati personali.

Il percorso Funnel osservato resta temporaneamente l’origine. Il Worker che dovrebbe fornire l’indirizzo più breve non risulta ancora distribuito, quindi `https://polisrossa.agoranode.workers.dev` non va presentato come operativo finché non risponde alle prove esterne.

Il flusso preparato è:

```text
browser -> https://polisrossa.agoranode.workers.dev:443
        -> TLS e Worker gestiti da Cloudflare
        -> https://polisrossa.<tailnet>.ts.net:443
        -> TLS e Funnel gestiti da Tailscale
        -> https+insecure://localhost:8443
        -> Caddy con controllo del segreto edge -> applicazione -> PostgreSQL
```

`https+insecure` disabilita la verifica del certificato **soltanto nel salto loopback fra il processo Tailscale e Caddy**, perché il certificato locale di Caddy non appartiene a una CA pubblica. Non disabilita HTTPS per i visitatori. Cloudflare termina il TLS dell’URL `workers.dev`; Tailscale termina quello dell’origine `.ts.net`; Caddy protegge e inoltra il traffico locale ma non emette il certificato pubblico di questi nomi.

Funnel è disponibile su tutti i piani Tailscale ed espone un servizio locale senza rendere pubblico l'indirizzo IP domestico. Il piano Personal è gratuito per uso personale non commerciale; prima di usarlo stabilmente verificare che l'impiego concreto resti compatibile con le condizioni correnti. Non selezionare un piano a pagamento. Funnel è ancora dichiarato beta, accetta soltanto nomi del dominio del tailnet e le porte pubbliche 443, 8443 o 10000, e applica limiti di banda non configurabili. Sul percorso scelto si usa la 443.

Il nome Worker può restare stabile senza esporre agli utenti il nome lungo del tailnet, ma dipende dall’account Cloudflare e dalla disponibilità effettiva del sottodominio account `agoranode`. La documentazione Cloudflare descrive `workers.dev` come sito gratuito destinato a progetti personali o hobbistici, non critici, e il piano Free ha uso limitato: quote e condizioni vanno ricontrollate, non aggirate. La disponibilità complessiva dipende dal PC acceso, Docker, Caddy, Tailscale, MagicDNS, autorizzazione Funnel, Cloudflare Worker e dai limiti gratuiti correnti di entrambi i fornitori. Non attivare piani a pagamento. Questo ingresso non realizza replica del database, subentro automatico di un altro PC, consenso distribuito o cifratura end-to-end: se questa macchina si ferma, il sito si ferma.

### Perché il Worker è distinto da DuckDNS

La specifica DuckDNS consente di aggiornare indirizzi IPv4/IPv6 e record TXT, ma non espone un record CNAME supportato. Inoltre Funnel accetta soltanto nomi appartenenti al dominio `*.ts.net` del tailnet e rilascia il certificato per quel nome. Il Worker offre invece un proprio hostname HTTPS e inoltra verso Funnel: non usa il token DuckDNS e non richiede modifiche al router.

Solo dopo l’attivazione, l’origine applicativa diventa l’URL Worker effettivamente assegnato, per esempio `https://polisrossa.agoranode.workers.dev`, senza porta o percorso. `:8443` resta esclusivamente la porta locale fra Funnel e Caddy. Il record DuckDNS e il suo token non servono a questo percorso; non cancellarli né pubblicarli, ma lasciare disattivato l’aggiornamento automatico finché non si decide un uso diverso.

L’URL da condividere deve comunque iniziare con `https://`. Il codice del Worker non implementa un servizio separato sulla porta 80 e Caddy non controlla il certificato pubblico `workers.dev`; redirect, host canonico e cookie vanno verificati sul percorso Cloudflare effettivo.

### Procedura concreta in due fasi, senza router né firewall

1. Prima di cambiare l’origine, esegui `node scripts/selfhost.mjs knowledge-import`, crea un nuovo backup cifrato e provane il ripristino separato seguendo [SELF-HOSTING.md](SELF-HOSTING.md). Non usare `docker compose down -v`. Conferma che `node scripts/selfhost.mjs status` e l’HTTPS locale rispondano.
2. Mantieni `REGISTRATIONS_OPEN=false` e `FORUM_OPEN=false`. Conserva l’origine Funnel osservata e verifica `tailscale funnel status`; non modificare router, DMZ, inoltri WAN o firewall.
3. Accedi personalmente a Cloudflare, resta nel piano gratuito e verifica che il sottodominio account `agoranode` e il nome Worker `polisrossa` siano realmente disponibili. Non inserire dati di pagamento e non dichiarare l’URL finché Cloudflare non lo assegna.
4. Prepara il confine edge senza attivarlo:

   ```powershell
   node scripts/selfhost.mjs edge-origin https://polisrossa.agoranode.workers.dev
   ```

   La prima fase conserva `APP_URL` e il Caddyfile attivi, genera o riusa `EDGE_SHARED_SECRET` solo nel file privato e scrive `.selfhost/Caddyfile.edge-origin`. Non copiare il segreto in chat, commit, screenshot o documenti.
5. Crea il Worker dal solo file `deploy/edge-worker/worker.mjs`. Configura `PUBLIC_HOST=polisrossa.agoranode.workers.dev`, `UPSTREAM_ORIGIN=https://polisrossa.tail37128d.ts.net/` e `EDGE_SHARED_SECRET` come secret, sostituendo gli hostname se la console mostra valori diversi. Non caricare `.selfhost`, `runtime.env`, backup o chiavi. Prova home, `/healthz`, pagine e risorse dal Worker mentre account e forum sono chiusi. Verifica anche host e metodi rifiutati e una risposta neutra `503` quando l’origine non è disponibile.
6. Soltanto dopo il collaudo in consultazione attiva il confine e ricrea i container:

   ```powershell
   node scripts/selfhost.mjs edge-origin https://polisrossa.agoranode.workers.dev --activate
   node scripts/selfhost.mjs start
   node scripts/selfhost.mjs preflight
   ```

   Il comando con `--activate` richiede che prima siano stati salvati la stessa origine, lo stesso upstream e il segreto. Imposta `APP_URL` sul Worker, installa il Caddyfile protetto e pubblica la manutenzione su `https://localhost:9443` per impostazione predefinita. Il preflight verifica coerenza, non contatta Cloudflare o Tailscale.
7. Verifica che l’URL Worker risponda, che l’accesso diretto al nome `.ts.net` riceva `403` anche tentando `Host: localhost`, che `https://localhost:9443/healthz` funzioni soltanto dal PC e che cookie, redirect e link usino il nome Worker senza `:8443`. Ripeti dopo il riavvio di Docker e del PC.
8. Compila `PUBLIC_OPERATOR_NAME` e `PUBLIC_PRIVACY_CONTACT` nel file privato. Configura Gmail solo per conferma e recupero e prova i due flussi con caselle autorizzate. Per PR2 configura Facebook con callback `https://polisrossa.agoranode.workers.dev/api/identity/callback/facebook`; non usare Facebook per l’accesso PR1. Esegui `community-invites` e `preflight`. Il codice account resta facoltativo.
9. Dopo il collaudo di sola lettura, abilita `REGISTRATIONS_OPEN=true`, riavvia e prova una registrazione PR1 reale con email, conferma, recupero password, uscita, nuovo accesso, persistenza ed esportazione/cancellazione dei dati di prova. Senza `ACCOUNT_ACCESS_HASH` il modulo non deve mostrare il codice iniziale. In caso di errore richiudi subito le registrazioni.
10. Solo dopo il test PR1 imposta `FORUM_OPEN=true`, riavvia e prova il percorso PR2: scelta iniziale che crea soltanto PR1, Facebook OAuth, invio esplicito `pending`, tre fondatori distinti, tre sì e tre no, discussione, proposta, voto e persistenza. Facebook prova il controllo dell’account al momento del collegamento, non l’identità civile; Discord, Instagram e siti personali non lo sostituiscono. In caso di errore richiudi il forum.
11. Per il collaudo esterno finale usa un telefono con Wi-Fi spento e dati mobili attivi. Apri una finestra privata, digita l’URL Worker completo e prova consultazione, account, ricezione email e forum secondo il ruolo. Registra data, rete, percorsi e codici HTTP senza token, cookie, email personali o screenshot contenenti segreti.

L’editing enciclopedico pubblico resta chiuso anche quando account e forum superano il collaudo. La licenza scelta dall’autore e il grant AgoràNode sono distinti; il grant `org.agoranode.contribution-grant.v1` richiede ancora revisione legale e il flusso forum→revisione non è ancora aperto.

Su Windows, se il sito deve rimanere disponibile senza una sessione utente aperta, abilita **Run unattended** dal menu Tailscale soltanto dopo il collaudo e verifica davvero un riavvio o una disconnessione. Tailscale segnala inoltre che le chiavi dei nodi scadono normalmente dopo 180 giorni; l'eventuale disattivazione della scadenza va limitata a una macchina fidata e documentata come scelta di sicurezza, non come automatismo.

### Chiusura immediata dell'accesso pubblico

Per chiudere subito le scritture, reimposta `REGISTRATIONS_OPEN=false` e `FORUM_OPEN=false` e riavvia. Disabilita quindi il Worker dalla console Cloudflare e rimuovi Funnel:

```powershell
tailscale funnel reset
tailscale funnel status
```

Il secondo comando non deve più mostrare un server pubblico. Verifica dal telefono che sia l’URL Worker sia quello Funnel non raggiungibili o restituiscano soltanto l’errore neutro dell’ingresso disabilitato. Queste operazioni non cancellano database, volumi, backup o certificati locali. Se occorre fermare anche il sito locale, usa `node scripts/selfhost.mjs stop`, che conserva i dati. Per un rollback temporaneo al solo Funnel usa `node scripts/selfhost.mjs tunnel-origin https://polisrossa.tail37128d.ts.net`, ricrea i container e ripeti il collaudo; non confondere il rollback con una replica.

## Alternativa separata: Render e Supabase

Il repository contiene anche un Blueprint Render; non è il percorso corrente e non va attivato insieme a Funnel senza una decisione esplicita sulla fonte autorevole dei dati. Lo stato seguente è quello registrato il 20 ottobre 2026 e non è stato riconfermato durante la preparazione della procedura Funnel.

Il target applicativo predisposto è un servizio **Render Free**, regione Francoforte. Il servizio si sospende dopo 15 minuti senza richieste e può impiegare circa un minuto a riavviarsi; il piano ha quote e limiti di traffico in uscita. Il carico di un aggregatore con molte fonti va misurato. Il database gratuito Render scade dopo 30 giorni: non usarlo come archivio duraturo di account e forum.

Il progetto Supabase confermato dal gestore risultava attivo in `eu-west-1` sul piano **Free**. Erano state create le 21 tabelle del progetto, comprese le tabelle Better Auth e il registro delle sette migrazioni applicative. Scrittura, lettura in una richiesta successiva e cancellazione di un dato tecnico erano state provate sul database remoto, senza creare account fittizi. Questa prova non certificava la connessione dal server Render. Non erano stati cambiati piani né attivati servizi a pagamento.

PostgreSQL e Better Auth restano componenti open source del runtime. Supabase può essere usato soltanto come database: l'accesso PR1 resta gestito da Better Auth con email confermata; PR2 richiede invece nome, Facebook OAuth verificato lato server e invio esplicito. Il riferimento Facebook deriva da OAuth e non da un URL arbitrario del candidato. Discord, Instagram e un sito personale non qualificano una domanda PR2. Le tabelle predisposte avevano RLS abilitata e nessun accesso diretto autorizzato per i client. [Lo script iniziale](sql/supabase-initial-setup.sql) è destinato esclusivamente a un database nuovo con schema `public` vuoto: non rieseguirlo sul progetto già preparato.

Render aveva assegnato `https://polisrossa.onrender.com`; l'assegnazione del nome non attesta che il servizio sia ora avviato o che account e forum siano operativi. Se in futuro si sceglie questa alternativa, ricontrollare prezzi e condizioni, configurare i segreti nel pannello protetto, usare una connessione PostgreSQL con TLS, eseguire le migrazioni e ripetere tutti i collaudi pubblici descritti sopra. Non acquistare un piano e non trattare Render o Supabase come replica automatica dell'installazione locale: tale replica non è implementata.

## Fonti primarie

- [Cloudflare Workers: configurazione e limiti di `workers.dev`](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/).
- [Cloudflare Workers: piano Free e prezzi correnti](https://developers.cloudflare.com/workers/platform/pricing/).
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

## Riferimento Facebook autenticato e OAuth obbligatorio per PR2

Il percorso PR2 richiede sempre un account PR1 con email confermata. Se la persona sceglie PR2 nella prima pagina, il server crea PR1 e prepara soltanto la continuazione verso Partecipa: non memorizza né invia ancora nome, presentazione o dati social. Dopo conferma e accesso, la persona deve collegare Facebook tramite OAuth, compilare nome e presentazione, quindi premere il comando di invio. Soltanto questa operazione crea la pratica `pending`; non concede ancora PR2. Il server ricava provider, identificativo, nome e riferimento Facebook app-scoped dal collegamento autenticato e rifiuta un `referenceUrl` o altri valori social inviati dal browser. Non visita il riferimento, non crea anteprime e non lo usa come destinazione del proxy. Soltanto candidato e membri PR2 che valutano la pratica lo vedono; topic, schede ed esportazioni pubbliche lo escludono.

Facebook OAuth è obbligatorio per presentare PR2, ma le sue credenziali sono richieste alla configurazione soltanto quando `FORUM_OPEN=true`; PR1 può restare aperto senza Facebook. Per configurarlo:

1. crea l’app del progetto in [Meta for Developers](https://developers.facebook.com/apps/) e completa gli eventuali passaggi richiesti per l’uso pubblico. PolisRossa richiede soltanto `public_profile`, non l'email Facebook, post, contatti o messaggi;
2. Per l'installazione locale inserisci la coppia completa `FACEBOOK_CLIENT_ID` e `FACEBOOK_CLIENT_SECRET` nel file privato `.selfhost/runtime.env`. Nell'alternativa Render usa invece i campi Environment protetti. Non incollare segreti in chat, documentazione o repository.
3. Registra l’URL di ritorno `${APP_URL}/api/identity/callback/facebook` sul dominio ufficiale. Le parentesi indicano il valore da sostituire, non un URL letterale.
4. soltanto con `FORUM_OPEN=true`, prova da un account PR1 con email confermata e autenticazione recente: collega Facebook, autorizza e torna al sito. All’invio il server rilegge provider, nome e identificativo, ricava il riferimento Facebook, impedisce il riuso dello stesso account e rimuove il grant locale prima dell’inserimento; un grant non usato viene rimosso dopo 24 ore dalla pulizia giornaliera. Verifica che a forum chiuso collegamento e callback siano rifiutati ma lo scollegamento resti disponibile, oltre a rifiuto dell’autorizzazione, sessione scaduta, domanda senza OAuth, campi social contraffatti e rifiuto dell’accesso PR1 diretto tramite social. Una rara corsa dopo lo scollegamento può richiedere di collegare nuovamente Facebook.

Tre membri fondatori distinti, dopo aver confermato ciascuno il proprio account, usano tre inviti monouso diversi. La sola compilazione del modulo non sostituisce l’invito. Tutte le domande ordinarie passano nella dashboard dei PR2, inclusi i membri appena ammessi: tre sì ammettono, tre no respingono, altrimenti scadenza dopo 72 ore.

Ritirare una domanda in attesa o respinta è possibile anche con il forum chiuso: elimina nome, presentazione, riferimento Facebook autenticato e dati social della pratica e consente una nuova domanda. Per un membro già attivo occorre la procedura privacy del gestore, perché interventi e voti possono essere pubblici.

La prova automatizzata percorre il callback OAuth Facebook simulato e verifica stato, scope minimo `public_profile`, sessione, cifratura, obbligatorietà della prova e rifiuto dei dati contraffatti. Non sostituisce il collaudo con le credenziali reali né il giudizio umano del membro.

Stato del percorso corrente: runtime locale, Funnel pubblico e connessione SMTP sono stati osservati separatamente. Il Worker, il dominio breve, la chiusura dell’origine e la manutenzione sulla nuova porta non sono ancora stati attivati o collaudati; mancano inoltre prova da rete mobile, identità e recapito privacy pubblici e flussi completi. Registrazione, conferma e recupero di un account reale, riferimento Facebook ricavato da OAuth, domanda PR2 e forum sul dominio pubblico non sono ancora stati collaudati. Questi passaggi non vanno segnati come completati sulla base dei soli test automatici o di una singola prova infrastrutturale.

Riferimenti: [Better Auth — Facebook](https://better-auth.com/docs/authentication/facebook), [account collegati](https://better-auth.com/docs/concepts/users-accounts), [Render — variabili e segreti](https://render.com/docs/configure-environment-variables).
