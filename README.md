# AgoràNode

**Una piattaforma aperta per costruire comunità che leggono, documentano e decidono insieme.**

[English](README.en.md) · [Come contribuire](CONTRIBUTING.md) · [Installazione](docs/SELF-HOSTING.md) · [Architettura](docs/ARCHITECTURE.md) · [Stato dei test](docs/QUALITY.md)

AgoràNode riunisce in un unico sito una rassegna di notizie e video, una biblioteca, un **Atlante di conoscenze** e un forum. Ogni comunità può avere un argomento diverso — tecnologia, storia, scienza, quartieri, cultura — usando la stessa interfaccia. Le fonti devono essere riconoscibili, le modifiche tracciabili e le decisioni discusse dai partecipanti competenti.

Il progetto è software libero, con licenza **AGPL-3.0-or-later**. Non è ancora un servizio federato completo.

## Comincia da qui

- **Agorà** (percorso `/agora`) è il nodo alpha di riferimento: segue lo sviluppo di AgoràNode, raccoglie fonti tecnologiche, ospita i primi contenuti dell'Atlante e il laboratorio per progettare nuovi nodi.
- **PolisRossa** (percorso `/polisrossa`) è il prototipo storico che ha ispirato interfaccia, rassegna, biblioteca, timeline, grafici e sistemi di partecipazione. Conserva una comunità e dati propri.
- **Portale** (percorso `/`) è il portale: il luogo dove trovare le comunità disponibili.

Questi sono **percorsi del sito dopo la sua installazione**, non indirizzi di un servizio internet già attivo. GitHub contiene il codice; una pubblicazione online richiede anche un server e una configurazione verificata.

## Come funziona un nodo

Il menu principale mantiene separate **La rassegna**, **Biblioteca** e **Agorà** (partecipazione). Le notizie rimandano agli editori originali; chi legge può alternare *Tutti i feed* e *Feed preferiti* senza cambiare le fonti degli altri.

All'interno di **Biblioteca** trovi tre scelte:

| Area | Che cosa offre |
| --- | --- |
| **Libri e percorsi** | Opere, edizioni, documenti e itinerari di lettura |
| **Timeline e Atlante** | Una storia raccontata per tappe oppure un indice di tutte le voci pubblicate |
| **Dati e grafici** | Indicatori, confronti e fonti da verificare |

Solo dopo aver scelto **Timeline e Atlante** compaiono due pulsanti: **Timeline** e **Atlante · Indice e ricerca**. La Timeline contiene una selezione narrativa; una voce resta nell'Atlante e può essere cercata anche quando non compare nel racconto. [Guarda le regole di questa navigazione](docs/LIBRARY-TWO-LEVEL-NAVIGATION.md).

In **Agorà**, i partecipanti trovano il forum e **Node Studio**, un editor visuale per comporre pagine, fonti e l'aspetto di una futura comunità. Una bozza salvata non diventa automaticamente pubblica.

## Chi può partecipare

| Livello | Significato |
| --- | --- |
| **Visitatore** | Consulta pagine, rassegna e discussioni pubbliche; può scegliere fonti preferite sul dispositivo |
| **PR1** | Account personale: preferenze sincronizzabili dove il servizio è attivo, bozze private e discussioni consentite |
| **PR2** | Membro ammesso della propria comunità, con diritti deliberativi regolati dal nodo |
| **PR3** | Mandato federale specifico, verificabile e revocabile: non è un superutente né un amministratore hardware |

**Non basta cliccare su un pulsante per diventare PR2 o PR3.** La sezione Agorà contiene una *visita guidata dei ruoli* senza permessi reali; il forum alpha pubblica discussioni da account PR1, ma non equivale a un sistema di votazioni PR2 o mandati PR3. PolisRossa conserva i propri controlli d'accesso e non deve essere assorbita dal nodo tecnologico.

## Prova il codice

Requisiti: **Node.js 24 o successivo**, Git e un terminale. Da una copia del repository:

```bash
git clone https://github.com/internazionalerossa/agoranode.git
cd agoranode
npm ci
npm run dev
```

Vite apre il frontend in locale. Le chiamate alle API passano al backend su porta 8000: **senza backend e PostgreSQL attivi**, le funzionalità che richiedono dati, account e forum mostrano stati non disponibili. Non significa che siano dati di esempio pronti da pubblicare.

Per una prova del servizio completo su un PC con **Docker e Docker Compose**, consulta [Ospitare AgoràNode](docs/SELF-HOSTING.md), che documenta anche la compatibilità con l'installazione storica PolisRossa. Non pubblicare una nuova istanza con password d'esempio o registrazioni aperte senza HTTPS e configurazione del titolare.

Per verificare il lavoro:

```bash
npm run typecheck
npm run build
npm test
npm run benchmark:cas
```

Le migrazioni del database si eseguono deliberatamente con `npm run db:migrate` **solo dopo aver configurato DATABASE_URL e un backup valido**; non fanno parte di un comando automatico di registrazione del nodo.

## Dove si trova il codice

| Cartella | Contenuto |
| --- | --- |
| `app/components/` | Pagine React, lettori, forum e editor visuali |
| `app/instances/` | Fonti e contenuti iniziali di Agorà e PolisRossa |
| `app/lib/` | Ricerca, navigazione, validazioni e modelli condivisi |
| `app/platform/` | Contratti pubblici dei nodi e della governance |
| `server/` | API Node, autenticazione, PostgreSQL, migrazioni e replica pubblica |
| `tests/` | Test di prodotto, dati, sicurezza e regressione |
| `docs/` | Guide tecniche e limiti verificati |

Scegli un problema piccolo, aggiungi un test che ne dimostri la correzione e descrivi nell'interfaccia ciò che un utente potrà effettivamente fare. La [guida per contribuire](CONTRIBUTING.md) spiega il flusso. Non servono conoscenze di infrastruttura federata per migliorare testi, accessibilità, traduzioni o interazioni.

## Stato attuale, senza promesse improprie

**Già nel codice:** frontend condiviso, rassegna tecnologica Agorà con preferenze, prima Biblioteca e Atlante di Agorà, patrimonio editoriale PolisRossa, schede bibliografiche, Node Studio, forum Agorà di discussione con autenticazione PR1, revisioni pubbliche verificabili e primitive sperimentali di scambio HTTPS e storage a blocchi.

**Ancora da completare:** nuovo nodo pienamente operativo con account e foro indipendenti, pipeline che pubblica revisioni dopo votazioni PR2 verificate, identità trasferibili, consenso BFT reale, chat federata, trasferimento incrementale dei blocchi e failover di gateway tra computer indipendenti. I test del repository non equivalgono a un collaudo della rete pubblica.

[Stato delle prove](docs/QUALITY.md) · [Baseline ingegneristica](docs/ALPHA-BASELINE.md) · [Creare un nodo](docs/THEMATIC-BOOTSTRAP.md) · [Sicurezza](docs/SECURITY-REVIEW.md)

---

**Una tecnologia comune, senza rendere una comunità proprietaria delle altre.** I peer ospitano dati autorizzati; i partecipanti deliberano nel proprio ambito. Le credenziali, i messaggi riservati e i materiali personali non entrano nell'archivio pubblico.
