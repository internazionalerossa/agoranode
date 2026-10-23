# Revisione critica multidisciplinare di AgoràNode

**22 ottobre 2026 — analisi e proposte, non decisioni costituzionali già approvate.**

Questa revisione sfida esplicitamente le assunzioni del progetto. Un manifesto, una firma e un voto non rendono automaticamente corretta un'enciclopedia, democratica una comunità o disponibile un server. Le proposte qui sotto devono essere trasformate in contratti, test e decisioni pubbliche prima dell'uso. Fonti e riferimenti servono a confrontare i modelli, non ad attribuire ai loro autori la paternità delle scelte AgoràNode.

## 1. Gli errori di impostazione da correggere

| Gravità | Assunto fragile | Perché fallisce | Correzione richiesta | Evidenza necessaria |
| --- | --- | --- | --- | --- |
| **Bloccante** | Ogni nuovo spazio è un cambio di marchio | I moduli, API, fonti e permessi restano legati a PolisRossa | Stessa applicazione e servizi configurati per `spaceId`, con database e amministrazione separati | Terzo spazio sintetico senza fork, test cross-tenant |
| **Bloccante** | «Blockchain» = mettere tutti i dati in un registro permanente | Privacy, diritti, latency e costi; impossibile cancellare copie già scaricate | Log solo per revisioni/certificati appropriati, archivi transitori per chat, private data isolati | Export negativi, retention, audit e cancellazioni reali |
| **Bloccante** | Quorum di firme statiche = consenso BFT | Non gestisce proposta, view change, partizioni, equivocation | Selezione/revisione di protocollo BFT, più custodi indipendenti | Test 4 host, guasti, fork e rotazione |
| **Bloccante** | Tante repliche = servizio autonomo | Servono gateway, DNS/ingressi, identità, build e recupero | Gateway e bootstrap indipendenti; percorso manuale | Spegnere host originario e continuare a leggere |
| **Alta** | Tutto può essere deciso a maggioranza | Le maggioranze non trasformano opinioni in fatti né attribuiscono licenze | Workflow editoriale per fonti/verifica, procedure democratiche per norme e nomine | Test di pubblicazione, revisioni, ricorsi |
| **Alta** | Un account o una chiave = una persona | Sybil, account prestati, identità incrociate | Attestazioni comunitarie contestabili, revoca e anti-collusione | Simulazioni identità duplicate e ricorsi |
| **Alta** | Schede nominative = voto pienamente verificabile e sicuro | Pressioni, ritorsioni e collegabilità; in alcuni contesti servono segretezza e separazione | Protocollo di scrutinio con privacy secondo tipo di voto | Threat model, verifica indipendente, test privacy |
| **Alta** | Senza proprietario del server non c'è potere centrale | Chi controlla chiavi, release, algoritmi e directory può ricentralizzare | Mandati minimi, audit e rotazione, client alternativi e filtri controllabili | Simulazione di takeover e recupero |
| **Alta** | Un feed RSS aperto può essere ridistribuito integralmente | Licenze e diritti di terzi restano applicabili | Metadati, link, provenienza e diritti per ogni oggetto | Esportazioni autorizzate e rimozioni |
| **Alta** | Immutabilità pubblica = garanzia di verità | Una menzogna può essere correttamente firmata | Gerarchia delle fonti, motivazione, confutazioni e cronologia | Red-team contro manipolazioni e fonti false |
| **Media** | Un unico voto è la procedura giusta per tutto | Manutenzione quotidiana bloccata, cattura da minoranze rumorose o maggioranze opportunistiche | Classi di decisione: normale, editoriale, amministrativa, costituzionale, emergenza | SLO di latenza decisionale e ricorsi |
| **Media** | Un social deve massimizzare l'engagement | Favorisce escalation, disinformazione e profilazione | Feed trasparente, cronologico predefinito, algoritmi sostituibili | Metriche pubbliche e test di manipolazione |

## 2. Lenti di progettazione, non figure da imitare

### Atlante, Ward Cunningham, Wikipedia, Wales e Sanger

Un Atlante rende possibile la correzione pubblica e tracciabile. Il punto cruciale non è votare ogni frase: distinguere **verificabilità**, qualità delle fonti, conflitti di interesse, consenso editoriale, disaccordo documentato e regole generali. Wikipedia adotta pratiche di ricerca del consenso: una votazione non sostituisce l'argomentazione o le fonti. AgoràNode conserva la propria indipendenza da licenze e API Wikipedia, ma dovrebbe imparare dai meccanismi di revisione pubblica e dagli organi di ricorso.

**Modifica:** passaggi separati `draft → source-review → discussion → publish/reject → appeal` con provenance, motivazioni e diritti. Un voto può definire la policy editoriale o decidere un conflitto procedurale, non «approvare» che un dato inventato diventi vero. I valutatori devono essere identificati e rendere conto dei conflitti d'interesse. Un piccolo errore verificabile non dovrebbe attendere una grande elezione; le modifiche contestate dovrebbero avere un percorso di risoluzione proporzionato.

### Simplicità dei protocolli — Antirez/Redis e l'approccio di Stroustrup

La qualità non coincide con il numero di linguaggi, framework o microservizi. Redis sottolinea il valore di strutture dati fondamentali, API comprensibili e complessità esposta anziché mascherata. Stroustrup suggerisce una lente di **invarianti tipizzati, composizione e controllo della complessità**: non implica migrare AgoràNode a C++.

**Modifica:** un **monolite modulare** Node/TypeScript finché serve, formati di protocollo piccoli, oggetti versionati e con limiti, PostgreSQL come indice locale, test di compatibilità, profiling prima di adottare una tecnologia diversa. L'utilizzo di libp2p/IPFS/Matrix/BFT va deciso con benchmark e confronto di costi di esercizio, non per popolarità.

### Norbert Wiener e W. Ross Ashby: feedback e stabilità

Un sistema non si autoregola solo perché esistono voti e sensori. Servono **variabili osservabili**, soglie, attuatori, controllo dei falsi positivi, ritardi e procedure per fermare un feedback dannoso. Il numero di errori di sincronizzazione, divergenze di checkpoint, incidenti di moderazione, ricorsi, concentrazione delle repliche e tempi di decisione deve produrre interventi tracciati, non cambiamenti automatici di policy.

**Modifica:** cicli verificabili «misura → segnala → discuti → correggi → misura di nuovo». Limiti per interventi automatici; una metrica di engagement o reputazione non può cambiare automaticamente diritti politici. Pubblicare costi, falsi positivi e scarti fra obiettivo e comportamento.

### Elinor Ostrom: beni comuni governati localmente

Ostrom analizza come comunità gestiscano beni collettivi tramite confini, regole adatte al contesto, partecipazione, monitoraggio responsabile, sanzioni proporzionate, ricorsi e sistemi annidati. Non dimostra che qualsiasi bene comune possa fare a meno, in ogni situazione, di Stato, mercati o tutela giuridica.

**Modifica:** ogni spazio dichiara chi può editare, leggere, governare, custodire o giudicare ricorsi; i custodi rendicontano alla comunità; sanzioni graduate e contestabili; forum, Atlante e dati hanno procedure proporzionate. Le regole federali trattano interoperabilità e risorse comuni, non sostituiscono l'assemblea locale.

### Endenburg e sociocrazia, Castoriadis, Bookchin

L'assenso sociocratico (*assenza di obiezioni motivate e rilevanti*) **non** è unanimità assoluta, né equivale a un plebiscito a maggioranza; è utile per operazioni reversibili e gruppi di lavoro, purché chi subisce la decisione possa opporsi. Castoriadis suggerisce la capacità di riesaminare le istituzioni stesse, non solo scegliere operatori. Bookchin propone assemblee locali e delegati federali con mandato e revoca.

**Modifica:** assemblea sovrana per norme e diritti, cerchi/gruppi operativi con mandato a scadenza per decisioni tecniche reversibili, rappresentanza federale vincolata da deliberazione locale, meccanismi di revisione costituzionale e protezione del dissenso. Assenso, consenso editoriale, voto maggioritario e quorum BFT sono **quattro meccanismi distinti** e non vanno usati come sinonimi.

### Marx e Gramsci: struttura materiale e potere culturale

Valutare chi possiede realmente server, chi paga l'elettricità, chi può dedicare tempo a moderare, chi controlla la lingua dominante, i mezzi di comunicazione e la formazione. Il software libero non elimina automaticamente disuguaglianze di partecipazione o concentrazioni culturali.

**Modifica:** report di sostenibilità e concentrazione dei custodi, traduzioni contestabili, on-boarding accessibile, evidenza dei finanziamenti, turnazione dei ruoli, sostegno a chi ha meno risorse. Il dissenso deve poter essere pubblicato e riesaminato nel rispetto delle regole.

### Social graph, Facebook e la replicabilità di ForumFree

L'idea utile del social graph è collegare persone e interessi; il rischio è trasformare queste relazioni in un grafo centralizzato di sorveglianza o in feed che manipolano l'attenzione. Da ForumFree vale la ripetibilità di un intero spazio tramite configurazione; non bisogna replicarne il punto centrale obbligato né una gerarchia amministrativa incontestabile.

**Modifica:** archi sociali con visibilità e consenso per scopo; niente grafo privato completo su ogni peer; feed cronologico e filtri espliciti predefiniti; creazione del terzo nodo senza riscrivere React; esportazione e migrazione di comunità, nei limiti legali e dei diritti individuali.

### Propaganda e infrastrutture di censura: lezioni negative

Joseph Goebbels e i sistemi di filtraggio/monitoraggio statale, fra cui il Great Firewall cinese, sono **casi da studiare criticamente per prevenire propaganda coercitiva, sorveglianza, censura opaca e concentrazione del controllo**, non architetture da copiare. Una rete resistente a un singolo punto di guasto può comunque essere manipolata con falsi account, moderazione opaca, sabotaggio, ranking occulto, intimidazioni o imposizione del software.

**Modifica:** nessun sistema di propaganda manipolativa o profilazione politica occulta; decisioni di moderazione motivate, con ricorso; filtri personalizzabili; archivi delle modifiche verificabili ma privacy-safe; test di attacchi Sybil, spam coordinato, data poisoning, eclipse, segregazione del dissenso e abuso delle chiavi. La moderazione legittima e proporzionata resta necessaria, così come un processo per contenuti illeciti e molestie.

## 3. Principali contraddizioni da eliminare prima di aprire il network

**A — Voto locale vs voto federale:** il forum PolisRossa oggi può aggiornare l'elettorato durante una consultazione; la specifica federale congela l'elettorato all'apertura. Le due regole sono diverse e legittime nei rispettivi contesti **soltanto se esplicitamente dichiarate**. Non convertire votazioni esistenti in un formato diverso senza una migrazione approvata.

**B — Voto nominativo vs riservatezza:** il forum attuale pubblica schede nominative; il contratto federale v1 permette di associare un identificativo pseudonimo alla scelta. Non aprire elezioni vincolanti fra comunità finché non siano risolti privacy, trasparenza e anti-coercizione.

**C — Pubblicazione Atlante vs decisione politica:** il deposito può accettare revisioni autorizzate, ma non esiste il workflow pubblico completo fra proposta, revisione, licenze, decisione, pubblicazione e ricorso. Inserire questo ponte prima della produzione; non votare sul fatto empirico.

**D — La comunità Agorà vs governo della rete:** la pagina `/agora` contiene la bacheca federale e la custodia, ma ancora non è un nodo editoriale completo né un'assemblea federale attivata. Evitare che un URL diventi fonte di autorità implicita.

**E — Conoscenza pubblica e licenze:** il formato contempla contributi con licenze che possono vietare opere derivate. Queste opere possono apparire in una **biblioteca/catalogo con diritti distinti**, non diventare automaticamente testo di un corpus Atlante collaborativo modificabile. Serve una policy chiara delle licenze ammesse per l’Atlante e un sistema di conflitti/attribuzioni.

**F — Conservazione vs diritto alla rimozione:** record append-only e checkpoint permanenti non devono includere per errore dati personali, votazioni riservate, social graph privati o copie di chat a 48 ore. Le richieste di rimozione vanno affrontate con policy e limiti realistici, non con un tombstone come unica misura.

**G — Zero fornitori obbligatori vs dipendenze:** oggi Facebook OAuth per PR2, Gmail SMTP, GitHub per la sorgente pubblicata e il percorso Tailscale/Cloudflare non sono ancora sostituibili end-to-end. Ogni dipendenza deve avere un piano di uscita testabile.

**H — Accessibilità dell'autogoverno:** deliberare non equivale a riempire formulari o passare tutte le ore online. Discussione asincrona, finestre ragionevoli, traduzioni controllabili, alfabetizzazione alle fonti e onboarding senza hardware dedicato sono parte della capacità democratica.

## 4. La responsabilità del controllo

La costituzione dovrebbe distribuire cinque diritti differenti: (1) proporre, (2) revisionare fonti, (3) decidere regole, (4) eseguire codice e infrastruttura, (5) giudicare contestazioni. Nessuno deve poter concentrare stabilmente tutte le funzioni, neanche per «merito», quantità di server o accesso al repository.

Monitoraggi suggeriti (solo aggregati privacy-safe): distribuzione delle repliche fra amministratori/reti; percentuale delle decisioni con ricorso; tempo fra segnalazione e correzione; numero di contestazioni fondate di fonti; accessibilità e tempi delle verifiche; percentuale di aggiornamenti roll-back; indipendenza delle distribuzioni del software; saturazione e incidenti delle chat. Ogni metrica ha una **soglia operativa e un responsabile**, non un punteggio politico automatico.

## 5. Decisioni ancora aperte che non può prendere un refactoring

1. Quali contenuti pubblici possono essere conservati indefinitamente da custodi volontari? Chi risponde a rimozioni e in quali giurisdizioni?
2. Chi può ammettere/espellere un nuovo spazio e con quali possibilità di ricorso?
3. Quali classi di decisione sono segrete, nominate, pseudonime o pubbliche?
4. Come limitare l'abuso di identità multiple senza imporre un'identità civile o un fornitore privato?
5. Quale corpus Atlante ammette testi modificabili e con quali licenze? Quali rimangono catalogo/lettura?
6. Le chat sono locali al nodo, globali alla rete o federate fra peer con stanze condivise? Chi ha la custodia delle chiavi E2E?
7. Quale quorum resta valido se alcuni peer non hanno la versione più recente? Come si prova una migrazione fra versioni?
8. Quali limiti di potere emergenziale si applicano quando la rete è sotto attacco, senza creare un proprietario permanente?

Finché tali decisioni mancano, non sono implementabili in modo sicuro mediante una semplice modifica di un file TypeScript.

## 6. Riferimenti di confronto, non dipendenze

- [Wikimedia — Universal Code of Conduct, enforcement e ricorsi](https://meta.wikimedia.org/wiki/Universal_Code_of_Conduct/Enforcement_guidelines/Version_1/en).
- [Ostrom — otto principi dei commons, sintesi](https://patternsofcommoning.org/uncategorized/eight-design-principles-for-successful-commons/); `Governing the Commons` (1990).
- [Redis Manifesto — approccio alla semplicità e ai protocolli](https://github.com/redis/redis/blob/unstable/MANIFESTO).
- [W3C ActivityPub — specifica di un protocollo sociale federato](https://www.w3.org/TR/activitypub/).
- [GOVERNANCE.md](GOVERNANCE.md), [COMMUNITY.md](COMMUNITY.md), [PEER-OWNED-ARCHITECTURE.md](PEER-OWNED-ARCHITECTURE.md), [DECENTRALIZATION-ROADMAP.md](DECENTRALIZATION-ROADMAP.md).
