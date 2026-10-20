# Rilascio dell’app PolisRossa

## App installabile

Il manifest mantiene un’identità stabile e apre l’app in una finestra dedicata. Sono presenti icone PNG 192 e 512, icona adattiva per Android e icona Home per iPhone. Il comando Installa l’app usa il prompt del browser soltanto quando è disponibile; sugli altri dispositivi spiega il percorso nel menu del browser. L’avvio dal collegamento Home nasconde il comando di installazione.

Su telefono la navigazione principale rimane sul bordo inferiore, rispetta l’area del sistema e si nasconde quando viene rilevata la tastiera. Account, chat e forum conservano i controlli di accesso del server. Il service worker intercetta soltanto navigazioni e risorse statiche pubbliche: non memorizza API, account, messaggi, discussioni o dati personali. In assenza di rete mostra una schermata esplicita; un errore di invio non viene presentato come una pubblicazione riuscita. Le nuove versioni non forzano un ricaricamento mentre si sta scrivendo.

La PWA non è una pubblicazione su App Store o Google Play. La presenza del manifest e i test del codice non dimostrano da soli la compatibilità fisica con ogni telefono.

## Servizio di produzione da collegare

Il runtime indipendente usa Node e PostgreSQL con Better Auth per email e password. Il repository include migrazioni, account verificati, archivi personali persistenti, ammissioni, forum e voto. La chat usa memoria temporanea come previsto dalle regole e non promette conservazione dopo un riavvio.

Per l’attivazione mancano ancora valori reali, da inserire nei campi protetti dell’hosting:

- accesso allo spazio di lavoro Render;
- `DATABASE_URL`, con connessione verificata al progetto scelto;
- `BREVO_API_KEY` e `MAIL_FROM`, con un mittente autorizzato;
- `PUBLIC_OPERATOR_NAME` e `PUBLIC_PRIVACY_CONTACT`, forniti dal gestore;
- tre inviti iniziali, comunicati privatamente alle persone che costituiranno la comunità.

Non inserire segreti in chat, issue o sorgenti. Conservare le registrazioni e la partecipazione chiuse finché non sono verificati consegna email, conferma, recupero, isolamento tra account, persistenza dopo riavvio, accesso PR2, voto, chat e procedure operative. Non modificare i requisiti di verifica per simulare un servizio attivo.

## Verifiche osservate e limiti

I test locali coprono il manifest, le dimensioni reali delle icone, il fallback offline, l’esclusione delle API private dalla cache e il riutilizzo delle risorse pubbliche. I test del runtime coprono accesso, persistenza dopo riapertura del database, biblioteca e chat con database di prova. Il progetto Supabase individuato è attivo, ma lo schema pubblico è risultato privo di tabelle dell’app durante il controllo del 20 ottobre 2026.

Il collegamento Render ha restituito un rifiuto di accesso. Le sessioni BrowserStack per Safari su iPhone 15 Pro e Chrome su Galaxy S24 sono state predisposte tramite collegamenti di apertura, ma non risultano eseguite: non costituiscono un collaudo concluso. Sono ancora necessari il test del servizio reale e la verifica interattiva di tastiera, orientamento, apertura Home e riconnessione sui due sistemi.

Fonti tecniche: [installazione PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [prompt di installazione](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt), [web app su iOS](https://webkit.org/blog/13878/).
