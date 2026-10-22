# GitHub Copilot — AgoràNode (piattaforma e nodi tematici)

Leggere [AGENTS.md](../AGENTS.md), [README.md](../README.md), [CONTRIBUTING.md](../CONTRIBUTING.md) e [l'architettura](../docs/ARCHITECTURE.md). AGENTS.md è la guida comune per tutti gli assistenti: mantenere il modello del sistema comprensibile, evitare espansioni speculative, verificare i comportamenti integrati e proteggere le scelte difficili da invertire.

Usare fixture sintetiche per feed e traduzioni, preservare attribuzione e identificatori delle fonti, non esporre segreti o preferiti. Eseguire `npm test` e dichiarare i limiti delle verifiche. Un push su GitHub non costituisce un deploy del sito Sites.

Integrare le modifiche nel prodotto e nella documentazione correnti, seguendo le regole di coerenza editoriale di AGENTS.md. Gli esempi di autori o paesi non delimitano da soli la copertura della biblioteca. Evitare sezioni che raccontano singoli interventi invece di descrivere il progetto.


Prima di cambiare routing, cataloghi, autorizzazioni o frontend condiviso, distinguere il portale `/`, il nodo tematico Agorà `/agora` e PolisRossa `/polisrossa`. Il runtime completo è ancora prevalentemente PolisRossa. Leggere [l'architettura peer-owned](../docs/PEER-OWNED-ARCHITECTURE.md) e [la roadmap](../docs/DECENTRALIZATION-ROADMAP.md): le capacità P2P e di consenso sono obiettivi, non servizi operativi. Un peer fisico non equivale a una comunità e un host non ottiene più voti. Non replicare account, sessioni o messaggi privati nella knowledge base pubblica. I test multiprocesso sullo stesso PC non equivalgono a test multi-host.
