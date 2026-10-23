# AgoràNode: architettura di rete custodita dai partecipanti

**Stato: decisione architetturale proposta, non implementazione né certificazione di sicurezza.**
**Data: 22 ottobre 2026.** Documento di visione e requisiti; per le verifiche osservate usare [QUALITY.md](QUALITY.md), per la specifica distribuita precedente [DISTRIBUTED-NETWORK.md](DISTRIBUTED-NETWORK.md).

## Obiettivo e confini

AgoràNode è il **software e il protocollo comune** per comunità tematiche. Il portale `/` consente di trovare i nodi; **Agorà**, in `/agora`, è la comunità tematica sulla tecnologia stessa; **PolisRossa**, in `/polisrossa`, è la prima comunità con rassegna e cataloghi completi. Agorà non è il proprietario politico degli altri spazi. Un domani ogni nodo tematico deve usare la stessa struttura di interfaccia e gli stessi moduli, caricando contenuti, fonti, temi e regole dal proprio manifesto.

La rete deve essere eseguibile sui computer di collaboratori indipendenti: più custodi replicano la conoscenza pubblica, alcuni servono il sito, altri possono validare i checkpoint. Per continuare a funzionare non deve essere indispensabile **un determinato computer, account GitHub, cloud, registrar, ISP o fornitore d'identità**. Indipendenza non significa assenza assoluta di infrastrutture: browser, DNS, energia, reti e dispositivi rimangono necessari, ma ogni singola dipendenza deve avere sostituti e prove di recupero.

Un peer fisico non è un nodo tematico. Lo stesso PC può custodire diversi spazi; un singolo spazio può avere decine di repliche. Un membro di una comunità non acquisisce poteri per il numero di PC che mette a disposizione.

### Principi non negoziabili

1. **Nessun centro operativo permanente:** consultazione e stato verificato devono poter essere serviti da ingressi e computer sostituibili. I peer funzionanti non equivalgono a un quorum politico.
2. **Un solo software comune, comunità separate:** identità dello spazio, dati, assemblea, moderazione e decisioni devono avere namespace e autorizzazioni verificabili. Il portale e il nodo Agorà non possono votare al posto di PolisRossa.
3. **Nessuna replica pubblica dei dati privati:** account, sessioni, token, email, IP, chiavi, bozze riservate e chat privata non entrano nei blocchi pubblicamente recuperabili.
4. **Integrità verificabile, non verità automatica:** hash e firme provano i byte e il firmatario; fonti, diritti, evidenza e confronto comunitario restano essenziali.
5. **Sicurezza prima di disponibilità delle scritture governate:** un peer isolato conserva l'ultima testa verificata ma non può finalizzare da solo nuove decisioni. Le operazioni ordinarie non governate seguono regole distinte.
6. **Portabilità, gradualità e reversibilità:** migrazioni additive, letture compatibili, fixture normative, e nessuna riscrittura dei volumi/ID storici `polisrossa`.
7. **Software libero verificabile:** codice AGPL, build riproducibili come obiettivo, release firmate e mirror indipendenti; le licenze dei contenuti restano separate.
8. **Privacy e diritti delle persone per progettazione:** controlli di conservazione, minimizzazione, moderazione, rettifica e rimozione devono esistere prima della pubblicazione indiscriminata.

## Topologia logica proposta

```text
Browser / PWA / app                        Demone AgoràNode su PC volontari
    |                                                     |
gateway A / gateway B (sostituibili)            peer discovery + transport
    |                                                     |
API pubbliche dello spazio ------------------- blocchi pubblici verificati
    |                                      /             |             \
PostgreSQL locale                    peer replica 1  peer replica 2  peer replica 3
(indice e viste materializzate)                   |
                                           validatori di checkpoint
                                      (custodi tecnici, non elettori extra)

Dati privati: solo custodi esplicitamente autorizzati, mai nel DHT pubblico.
```

Il frontend React/Vite e l'API Node attuali restano utilizzabili. PostgreSQL continua a essere il database **locale** di una replica o di un servizio, ma non la sorgente universale di autorità per gli oggetti pubblici finalizzati. Le viste si possono ricostruire da oggetti/eventi verificati. Il backend delle operazioni private resta isolato e richiede una strategia distinta di continuità.

### Ruoli dei peer

| Ruolo | Funzione | Autorità politica |
| --- | --- | --- |
| Replica | Conserva blocchi pubblici di uno o più spazi; offre banda/disk quota | Nessuna |
| Gateway | Serve frontend e API, può cambiare origine e dominio | Nessuna |
| Worker | Acquisisce feed e indicizza gli oggetti ricevuti | Nessuna |
| Relay/bootstrap | Permette a peer dietro NAT di raggiungersi | Nessuna |
| Finalizzatore | Esegue il consenso tecnico su transizioni autorizzate | Nessuna per il solo ruolo tecnico |
| Custode privato | Conserva dati privati cifrati e solo su mandato | Nessuna per il solo ruolo tecnico |

I ruoli non richiedono macchine dedicate. `MIRROR_MODE` resta compatibilità dell'attuale installazione; non diventa una designazione di proprietà.

## Modello dei dati e consistenza

I dati hanno politiche diverse, descritte dal contratto di preparazione `app/platform/data-placement.ts`; la sua presenza **non** rende già protetti gli exporter. Ogni futuro endpoint di replica deve verificare una allowlist esplicita prima di serializzare il contenuto e rifiutare classi sconosciute.

| Classe | Esempi | Distribuzione |
| --- | --- | --- |
| `public-verified` | Revisioni Atlante approvate, dati con licenza verificata, certificati privi di PII | Repliche pubbliche in accordo ai diritti |
| `public-ephemeral` | Presenza online, chat pubblica a scadenza, cache temporanea | Non entra nel patrimonio append-only |
| `private-local` | Sessioni, preferenze e dati account | Database privato del servizio autorizzato |
| `private-authorized` | Contenuti riservati, messaggi E2E e backup utente | Solo destinatari/custodi autorizzati |
| `secret-never-export` | Password, token OAuth, chiavi private, file .env | Mai nel protocollo pubblico |

**Attenzione:** un post pubblico può comunque contenere dati personali. Non va reso irreversibile per il solo fatto di essere visibile. Un evento di moderazione o un tombstone non elimina copie già scaricate; occorrono politiche di ammissione, retention, rimozione e obblighi chiari per i custodi. Non promettere oblio perfetto da una rete aperta.

Per l’Atlante occorrono **revisioni indirizzate dal contenuto** e puntatori alla revisione corrente finalizzati. Per il social pubblico occorrono **eventi firmati, ordinati dove necessario**, idempotenti e sincronizzabili anche offline. Per la chat servono **stream per stanza**, cifratura dove richiesta, retention e moderazione; la chiusura della finestra di 48 ore attuale non è equivalente a cancellazione di copie remote. Per voti e modifiche costituzionali serve una **finalità rigorosa** e una prova politica separata dal quorum tecnico.

Non mettere tutti i post, messaggi e file in una blockchain universale: costo, latenza, cancellazione e privacy renderebbero la rete inadatta allo scopo. AgoràNode può utilizzare log Merkle, blocchi per contenuto e finalità BFT **senza mining, token o Proof-of-Stake**.

## Identità e governance

Distinguere rigorosamente:
- **Peer ID:** chiave del dispositivo che ospita i servizi; autenticazione di trasporto, niente voti.
- **Persona/account:** identità applicativa, chiavi utente recuperabili e autorizzazioni alla lettura/scrittura.
- **Membership PR2:** attestazione di diritto nella sola comunità tematica.
- **Mandato PR3:** mandato federale con scopo, scadenza e revoca; non conferisce automaticamente chiave di consenso.
- **Validator set:** custodi tecnici incaricati di finalizzare checkpoint dopo verifica delle autorizzazioni.

Il vecchio flusso Facebook OAuth di PolisRossa è una dipendenza transitoria, non fondamento della federazione. La roadmap prevede chiavi e recupero controllati dal membro, procedure comunitarie anti-Sybil, attestazioni a scadenza e revoche. Le chiavi digitali **non provano** da sole l'unicità di una persona; l'accesso può essere ripristinato senza copiare email o password a tutti i peer.

La comunità tematica Agorà documenta e discute la tecnologia; le decisioni **federali** si prendono secondo [GOVERNANCE.md](GOVERNANCE.md) e non secondo il fatto che il servizio si trovi su `/agora`. Il portale non è una terza assemblea.

## Consenso e reti ostili

Il codice corrente convalida certificati `2f+1` da un insieme statico di `3f+1` validatori, ma **non implementa un BFT in rete**. Il successivo protocollo deve specificare proposizione, ordinamento, view change, prevenzione delle doppie firme, cambio epoca, attestazione dello stato, replay, timeout, DoS, partizioni e recupero di nodi in ritardo. Scelta e audit di un protocollo BFT esistente vanno effettuati prima di scritture reali.

Il quorum politico autorizza un cambiamento del patrimonio o una decisione; il quorum tecnico ne determina l'ordine verificabile. Non sono intercambiabili. Con quorum tecnico assente, il patrimonio finalizzato resta leggibile; con un solo peer, non si inventa un nuovo checkpoint.

Il trasporto previsto è libp2p con inviti firmati, mDNS in LAN, bootstrap indipendenti, DHT limitata alla *scoperta* e relay per NAT/CGNAT. Un DHT non determina quali checkpoint sono validi. Il browser non è una replica affidabile sul lungo periodo: per offrire storage e gateway occorre un processo persistente sul PC.

## Esposizione web e continuità

Il dominio è un ingresso, non l'identità costituzionale della rete. Occorrono gateway in reti diverse, più indirizzi documentati, bootstrap firmato, test di failover, e la possibilità di aprire una copia tramite invito manuale. Cloudflare Worker e Tailscale Funnel sono mezzi transitori sostituibili; una pagina HTTPS non prova la disponibilità indipendente.

Servire pagine pubbliche è diverso dal trasferire login, password e sessioni: i servizi privati devono adottare un sistema limitato di custodia, ripristino e revoca, verificato separatamente. Non replicare il database privato in chiaro ai volontari.

## Criteri di consegna (non promesse)

- **Multi-spazio:** Agorà e PolisRossa leggibili con stesso contratto, dati e autorizzazioni isolati; nessun elemento politico di uno è leggibile tramite API privata dell'altro.
- **Replica 3-PC:** tre host fisici e reti indipendenti scambiano blocchi verificati in modo incrementale; recupero dopo corruzione, ritardi, disco pieno, riavvio e rete partizionata.
- **Disponibilità:** cinque repliche complete presso almeno tre amministrazioni; l'origine fondatrice può spegnersi e altri gateway servono l'ultima testa verificata.
- **Consenso:** quattro finalizzatori indipendenti, tre firme secondo protocollo BFT collaudato (non soltanto raccolta firme statica); nessun avanzamento in assenza quorum.
- **Privacy:** analisi dei flussi dati, threat model, prova di non divulgazione di segreti, procedure di rettifica/cancellazione dove applicabili e valutazione legale.
- **Mantenibilità:** build e restore provati su Windows, Linux e macOS; dismissione di gateway/DNS/provider con playbook e prova di recupero.
- **Sicurezza:** audit indipendente prima di aprire alla rete scritture politicamente vincolanti e, per la chat privata, protocollo E2E revisionato.

Questi criteri non certificano l'impossibilità di perdere tutti i peer, subire coercizione, collusione, malware, incendio o guasti della rete mondiale. Per ogni requisito serve un test e un'evidenza osservata, non una dichiarazione.

## Rapporto con il codice esistente

Conservare i manifesti v1, gli URL e gli identificatori tecnici `polisrossa`; introdurre versioni nuove **senza mutare silenziosamente il formato esistente**. Il registro locale `app/instances/registry.ts` è una allowlist **non federata**. Il manifesto `app/instances/agora.ts` indica capacità ancora pianificate; non crea database, account o forum del nodo Agorà. Il classificatore `app/platform/data-placement.ts` descrive una politica futura: nessuna replica esterna può considerarlo sufficiente senza validazione server e test di isolamento.

I bundle di conoscenza già generati, le migrazioni e le chiavi di custodia non si cambiano durante il refactoring del frontend. Il percorso incrementale con verifiche è definito in [DECENTRALIZATION-ROADMAP.md](DECENTRALIZATION-ROADMAP.md).
