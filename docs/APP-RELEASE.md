# Rilascio dell’app PolisRossa

## App installabile

Il manifest mantiene un’identità stabile e apre l’app in una finestra dedicata. Sono presenti icone PNG 192 e 512, icona adattiva per Android e icona Home per iPhone. Il comando Installa l’app usa il prompt del browser soltanto quando è disponibile; sugli altri dispositivi spiega il percorso nel menu del browser. L’avvio dal collegamento Home nasconde il comando di installazione.

Su telefono la navigazione principale rimane sul bordo inferiore, rispetta l’area del sistema e si nasconde quando viene rilevata la tastiera. La rassegna, la biblioteca, Partecipa e Fonti hanno collegamenti reali. Il lettore degli articoli ha una propria voce nella cronologia: Indietro chiude la finestra e lascia aperta la pagina sottostante. L’impaginazione usa la larghezza CSS dello schermo anche per navigazione fissa e finestre; si può ingrandire il testo senza ridurre l’intera pagina sotto la larghezza iniziale. Account, chat e forum conservano i controlli di accesso del server. Il service worker intercetta soltanto navigazioni e risorse statiche pubbliche: non memorizza API, account, messaggi, discussioni o dati personali. In assenza di rete mostra una schermata esplicita; un errore di invio non viene presentato come una pubblicazione riuscita. Le nuove versioni non forzano un ricaricamento mentre si sta scrivendo.

La PWA non è una pubblicazione su App Store o Google Play. La presenza del manifest e i test del codice non dimostrano da soli la compatibilità fisica con ogni telefono.

I membri riconosciuti come PR2 dal server vedono direttamente forum e chat; introduzione e livelli di accesso sono riservati a visitatori e domande non ancora accolte. Le regole rimangono disponibili sotto le discussioni. I problemi di singoli feed sono consultabili nelle fonti, senza avvisi ripetuti nella rassegna.

## Servizio da pubblicare

Il runtime indipendente usa Node.js 24, PostgreSQL, Caddy e Better Auth. Il percorso scelto per questa istanza è il PC domestico già collaudato localmente, con ingresso HTTPS gratuito tramite Tailscale Funnel. Render e Brevo restano alternative storiche non attivate; non sono necessari né vanno acquistati per questa procedura.

Questo rilascio contiene **PolisRossa — AgoràNode**, il solo nodo con rassegna, biblioteca, storia, dati e comunità già completi, dedicato allo stato dell’arte della sinistra politica. AgoràNode è la tecnologia/infrastruttura comune; la home-indice dei nodi esiste e il percorso `/agora` presenta stato tecnico e custodia, ma il nodo Agorà non ha ancora tutte le superfici editoriali di PolisRossa. Non esiste ancora una configurazione generica completa per argomenti diversi e più installazioni non costituiscono una rete distribuita.

Prima della pubblicazione completa devono essere configurati soltanto nei file privati dell'installazione:

- il nome pubblico `.ts.net` effettivamente assegnato alla macchina e lo stesso valore in `APP_URL`;
- una casella Gmail gratuita dedicata, con verifica in due passaggi e password per app, usata esclusivamente per conferma indirizzo e recupero password;
- `PUBLIC_OPERATOR_NAME` e `PUBLIC_PRIVACY_CONTACT`, scelti dal gestore effettivo;
- tre inviti iniziali distinti, consegnati privatamente alle persone che avviano PR2;
- la coppia Facebook OAuth, obbligatoria prima di impostare `FORUM_OPEN=true` e non necessaria per tenere aperto il solo PR1.

PR1 non usa accesso social: richiede sempre email confermata e password. Anche scegliendo il percorso PR2 nella prima registrazione viene creato soltanto PR1; dopo conferma e accesso la persona deve collegare Facebook tramite OAuth e inviare esplicitamente la domanda. Il server ricava da OAuth il riferimento Facebook mostrato ai valutatori e rifiuta un URL arbitrario scritto nel modulo. Questo prova il controllo dell’account in quel momento, non l’identità civile; Discord, Instagram e un sito personale non lo sostituiscono. Non inserire token, password per app, chiavi, cookie o dati personali in chat, issue o sorgenti. Conservare registrazioni e forum chiusi finché non sono verificati consegna Gmail, recupero, isolamento tra account, persistenza dopo riavvio, ammissione PR2, voto, chat, backup e ripristino.

## Verifiche osservate e limiti

I test locali coprono manifest, fallback offline, esclusione delle API private dalla cache, account con email verificata, ammissione, voto, biblioteca persistente e chat con database di prova. Il numero e l'esito dell'ultima suite sono registrati in [QUALITY.md](QUALITY.md), evitando di duplicare qui risultati destinati a diventare obsoleti.

La presenza del codice non prova il servizio pubblico. Funnel e una connessione SMTP sono stati osservati separatamente, ma consegna dei messaggi dei flussi account, callback Meta, telefono su rete mobile e riavvio del PC devono ancora essere verificati insieme sull'istanza reale; il ripristino dell'ultimo backup va ripetuto dopo i dati di collaudo. La replica automatica fra PC, il subentro dell'ultimo nodo, il quorum fra host e la cifratura end-to-end non sono implementati. Sono inoltre ancora necessari controlli interattivi su tastiera, orientamento, installazione Home e riconnessione sui dispositivi effettivi.

Fonti tecniche: [installazione PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [prompt di installazione](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt), [web app su iOS](https://webkit.org/blog/13878/).
