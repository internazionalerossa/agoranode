# AgoràNode Lean Storage: meno byte, meno richieste, più autonomia

**Stato: prototipo verificabile. Non è un sistema di archiviazione commerciale, un protocollo v2 federato né un benchmark di produzione.**

La scalabilità economica non nasce da una blockchain che registra tutto. Nasce da separare rigorosamente **dati**, **decisioni**, **indici** e **trasporto**, replicando soltanto ciò che un peer deve conservare. Il modello di riferimento è: il browser usa un gateway intercambiabile; ogni custode sceglie gli spazi da ospitare; i dati pubblici hanno blocchi verificabili; i database locali servono query veloci; la governance decide solo sulle transizioni che richiedono finalità.

## Due ottimizzazioni introdotte

1. **Non riscaricare pacchetti già posseduti.** Il client `pullPublicPeer` verifica l'oggetto canonico già presente su disco e salta la richiesta HTTP del corpo se il file è identico e valido. Se il file locale è danneggiato, il client non lo sovrascrive silenziosamente: fallisce chiuso. La richiesta dell'indice e la verifica crittografica locale restano necessarie. Non confondere «zero byte di payload già presente» con «zero traffico o CPU».
2. **Content-defined chunking (sperimentale).** `server/public-blob-cas.ts` divide oggetti pubblici con fingerprint gear32 deterministico in pezzi di dimensioni limitate (minimo 16 KiB, target medio 64 KiB, massimo 256 KiB). Un SHA-256 identifica ciascun blocco; il manifesto indica hash, dimensioni, network e spazio. Un inserimento di un byte tende a risincronizzare i confini dei chunk e a permettere il riuso di molti blocchi successivi. L'implementazione ricostruisce e ricontrolla anche l'hash dell'oggetto intero. Il limite del prototipo è 32 MiB per oggetto.

**Il chunker non è ancora collegato alla rete HTTP né all'importatore knowledge v1.** Nessun peer remoto deve trattare il manifesto come un certificato politico o editoriale. Prima dell'integrazione servono un envelope firmato che leghi tutti i blocchi, validazione dei diritti, scambio incrementale, schema di garbage collection, limiti di utilizzo e test di compatibilità su versioni/OS diversi.

## Misurare, non pubblicizzare

`npm run benchmark:cas` costruisce una fixture sintetica, inserisce un byte, ricostruisce l'oggetto e stampa conteggio dei blocchi e byte nuovi. La prova serve a verificare **quanto riuso** sia ottenibile in quello specifico scenario, non a promettere le stesse percentuali per file già compressi, video, dati casuali, archivi con molte modifiche, mobili o rete reale. `npm test` include test di riproducibilità, corruzione e isolamento dei namespace.

La rete deve in futuro misurare: byte trasferiti per modifica, byte nuovi memorizzati per revisione, costo CPU della verifica, picco RAM, tempo di bootstrap da zero, disponibilità dopo il guasto di un gateway, consumo di energia, traffico dei relay, storage recuperabile, costo per utente attivo e percentuali di repliche indipendenti. I numeri devono venire da tracce riproducibili, non da stime pubblicitarie.

## Modello di costo minimo, non promessa

Per N oggetti distinti da S byte nuovi in media, con R repliche complete, il solo spazio per i **byte pubblici unici** è approssimativamente `N × S × R`, prima di indicizzazione, certificati, backup, filesystem e ridondanza. Nessuna struttura dati può cancellare il costo fisico dei byte realmente unici. La deduplicazione elimina copie ripetute; non riduce all'infinito materiale già compresso e non permette a un unico PC economico di gestire contemporaneamente miliardi di sessioni attive.

Il modello sostenibile è **scala orizzontale comunitaria**: un piccolo PC può ospitare uno o pochi spazi e servire contenuti pubblici in modo efficiente; peer indipendenti condividono capacità e disponibilità senza che uno singolo debba sostenere tutta la rete. La salute della rete dipende dal numero e dall'indipendenza delle repliche, dalla banda e dall'effettiva partecipazione. È resiliente, non indistruttibile.

## Piano di adozione senza compromettere PolisRossa

1. Mantenere intatti bundle v1, snapshot firmati, hash e database applicativi.
2. Standardizzare fixture normative per il chunker, manifesti e limiti, registrando il digest di ciascuna in test multipiattaforma.
3. Collegare blocchi v2 a un **checkpoint già finalizzato**, senza distribuire chat/private data dentro la rete pubblica.
4. Mettere i blocchi in una cartella CAS atomica, bounded, sottoposta a quote e retention, con schema di garbage collection verificabile.
5. Aggiungere recupero dei soli hash mancanti dal peer e verifiche prima di importare nel database locale.
6. Testare su almeno tre computer indipendenti, reti ostili e dispositivi a basso consumo. Misurare costo reale prima di dichiarare benefici in produzione.
7. Solo dopo, valutare alternative standard esterne (IPFS/CAR per oggetti, Automerge/Yjs per bozze CRDT) rispetto a semplicità, interoperabilità, sicurezza e manutenzione.

Per ora, la sola ottimizzazione effettiva del trasporto v1 è evitare di scaricare di nuovo gli stessi pacchetti firmati. I blocchi v2 sono un **contratto sperimentale**.
