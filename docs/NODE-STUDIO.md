# Node Studio — frontend comune, fonti personali e bozze di comunità

**Stato: implementazione alpha parziale.** PolisRossa resta il nodo completo di riferimento; il nodo tecnologico Agorà ora possiede una rassegna RSS/video di sola consultazione e strumenti comuni per creare bozze. La creazione pubblica automatica di un nuovo nodo, l'modifica delle voci dell’Atlante con approvazione PR2 e i forum isolati per nodo **non** sono ancora operativi.

## Come deve apparire ogni nodo

Ogni comunità condivide una struttura di prodotto riconoscibile, modellata sul lavoro editoriale e visuale di PolisRossa: rassegna con video, biblioteca di opere ed edizioni, voci dell’Atlante, storyline narrativa, dati verificabili e area **Agorà** di partecipazione. Cambiano tema, colori, metadati, fonti, contenuti, utenti, delibere e diritti.

Il manifesto versione 1 descrive lo stato dei moduli. Non autorizza ad attivare automaticamente servizi privati o un database di un'altra comunità. Chi apre un nuovo nodo deve avere un'origine e un ambito politico propri, indipendenti dalla macchina che lo ospita.

## Preferenze feed

- Il visitatore può selezionare una o più fonti con un pannello espandibile e premere **Tutti i feed** o **Feed preferiti**. I filtri sono applicati nella propria interfaccia, non diventano censura per altri.
- Il browser conserva la selezione localmente sotto una chiave **per nodo**.
- Chi possiede una sessione PR1 autenticata può salvare e recuperare la selezione con `GET/PUT /api/spaces/{spaceId}/preferences`. Le righe sono private nel database `node_feed_preferences`; il server limita le fonti agli ID noti e non restituisce scelte di altri utenti.
- Gli utenti PR1 e PR2 hanno il **medesimo diritto personale** a seguire fonti. PR2 è necessario per governare fonti pubbliche, non per scegliere il proprio feed.
- Il modo visualizzato («preferiti» o «tutti») non è un mandato di voto e non deve alterare il database comune delle fonti.
- È possibile che un browser blocchi il salvataggio locale e che l'autenticazione non sia disponibile su un mirror: l'interfaccia deve segnalare il limite senza cancellare i salvataggi.

La pagina Agorà usa un elenco **finito e dichiarato** di editori tecnici in `app/instances/agora-sources.ts`. `GET /api/spaces/agora/feed` non accetta URL arbitrarie del visitatore; limita la raccolta alle fonti consentite e restituisce titoli, estratti, provenienza, data e link originali. I video arrivano anche da un canale pubblico dichiarato; archivio registrazioni e dirette si aprono presso le fonti. **Non dichiarare LIVE una trasmissione senza averla verificata**. Nuove URL proposte tramite Node Studio non vengono automaticamente scaricate dal backend.

## L'editor visuale

Nel laboratorio **Node Studio** chiunque può comporre una bozza sul proprio dispositivo scegliendo nome, slug, tema, descrizione, colore, fonti e blocchi di contenuto. Le sezioni includono titoli, paragrafi, tappe narrative, riferimenti, libri, video e dati. Un pulsante mostra l'anteprima; i blocchi si spostano con comandi accessibili da tastiera.

Un visitatore può conservare la bozza **solo sul dispositivo**. Un utente PR1 può salvarla nel proprio database con `GET/PUT/DELETE /api/node-studio/drafts`. Questo è un deposito **privato** con autenticazione, limiti e cancellazione esplicita: non rende la pagina pubblica e non elegge un fondatore. Le bozze sono versionate con `org.agoranode.node-blueprint-draft.v1`.

Una proposta su PolisRossa può aprire il compositore PR2 del forum già esistente, con testo e fonti precompilati. Solo l'utente autorizzato potrà inviare il post e soltanto quando il forum è realmente attivo. Per Agorà e per nuovi nodi il compositore federato resta **da realizzare**: la bozza può essere esportata per revisione, non attivata senza voto.

### Passaggi ancora necessari alla creazione pubblica

1. Verificare PR2 **del nodo Agorà**, oppure il diverso ambito autorizzato dalla costituzione federale definitiva. Non confondere PR2 del nodo fondatore con PR3 federale: la modifica delle competenze richiede una decisione costituzionale.
2. Registrare una proposta con **digest dell'esatta bozza**, fonti, licenze, risorse e namespace richiesto. La bozza non deve cambiare fra scrutinio e approvazione senza invalidare l'atto.
3. Eseguire discussione, conteggio verificabile, ricorso ed eventuale seconda camera secondo la materia. Un nuovo nodo non nasce dal numero di computer gestiti da una persona.
4. Provisioning del nuovo `spaceId` con database e ruolo propri, manifesti firmati, gateway, quote e modulo forum, senza riusare sessioni PR2 PolisRossa.
5. Indici Atlante/timeline, link ad ogni pagina, alimentazione feed e gestione delle licenze. La timeline principale rimane una **selezione narrativa approvata** dei membri PR2: una pagina esclusa resta ricercabile.
6. Ripristino, export, dismissione e revoche collaudati su macchine indipendenti prima di aprire contributi pubblici.

## Sicurezza e convenzioni

- Le bozza rimangono in `node_studio_drafts` e **non** entrano nel protocollo di replica pubblica.
- Nessun editor web può fare fetch remoto arbitrario dal server. Un feed proposto deve essere aggiunto a un'allowlist validata con controlli SSRF, redirect, DNS e licenza.
- Impedire XSS: il contenuto del blocco si rende come testo React e link solo mediante policy HTTPS.
- Tutti i metodi privati richiedono sessione autenticata. Scritture/cancellazioni richiedono Origin dello stesso sito. Mirror pubblici non hanno API personali.
- Non dare mai a chi conserva un computer nuovi voti o permessi editoriali.
- **Budget**: massimo 20 bozze per account, 80 blocchi, 30 fonti e corpo JSON limitato a 64 KiB per bozza. Questi sono limiti alpha, da misurare e rivedere.
- La navigazione dati pubblici deve stare in un indice per nodo; media voluminosi sono oggetti separati con provenienza e diritti, non campi infiniti JSON nei post.

## Percorsi nel codice

`app/components/NodeStudio.tsx` e `NodeStudioFields.tsx` forniscono editor e anteprima; `node-studio-model.ts` valida i dati; `server/node-studio-drafts.ts` limita accesso e persistenza; migrazione `016-node-studio-drafts.sql` conserva le bozze PR1 privatamente.

`FeedPreferenceControls.tsx` è comune ai nodi, `server/node-feed-preferences.ts` e migrazione `015-node-feed-preferences.sql` conservano scelte account; `server/agora-feed.ts` gestisce la rassegna di Agorà.

I contratti dei Atlante e dei voti narrativi sono in [NODE-KNOWLEDGE-GRAPH.md](NODE-KNOWLEDGE-GRAPH.md), [EDITORIAL-GOVERNANCE.md](EDITORIAL-GOVERNANCE.md) e [GOVERNANCE.md](GOVERNANCE.md). Stato del collaudo in [QUALITY.md](QUALITY.md).

**Non chiamare «WordPress completo», «federazione funzionante» o «Atlante pubblicamente modificabile» il solo editor di bozze.** È il primo passo verso un workflow PR2 realmente governato.
