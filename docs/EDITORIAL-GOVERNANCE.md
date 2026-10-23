# Regole editoriali proposte: Atlante verificabile senza voto sulla verità

**Bozza da discutere e approvare; non è un workflow ancora attivo nel prodotto.** La procedura attuale di PolisRossa resta descritta da [COMMUNITY.md](COMMUNITY.md) e [AGORANODE.md](AGORANODE.md).

## Un errore da evitare

La piattaforma combina Atlante, giornalismo RSS, biblioteca, dati, forum e voto. Queste funzioni non producono lo stesso tipo di affermazione: un risultato elettorale è una decisione; un'osservazione statistica è una misura con metodo; una notizia è una pubblicazione di terzi; una voce dell’Atlante è una sintesi sottoposta a verifica. **Nessun quorum può rendere vero un fatto.** Un voto può approvare una regola editoriale, nominare un revisore o risolvere una disputa di procedimento, non sostituire evidenza, metodo, provenienza e revisioni documentate.

### Oggetti e responsabilità

| Oggetto | Fonte di autorità | Cambiamenti |
| --- | --- | --- |
| Notizia RSS/Atom | Autore/editore e URL originale | Aggiornare metadati, rettifiche e link; non manipolare il contenuto attribuito |
| Atlante | Fonti verificabili, revisori responsabili e policy pubbliche del nodo | Versioni immutabili, contestazioni, correzioni collegate |
| Dato statistico | Dataset, definizioni, unità, popolazione e data | Nuova importazione documentata, senza inventare valori mancanti |
| Opera in biblioteca | Licenza della specifica edizione e diritti territoriali | Catalogo, link; testo interno solo con autorizzazione |
| Post forum | Autore, moderazione, policy e permessi | Discussione persistente; rettifiche e rimozioni secondo legge |
| Voto comunitario | Elettorato, procedimento, quorum e certificato | Decisione verificabile, ricorsi e revoca delle norme |
| Chat | Consenso delle persone nella stanza e policy di retention | Scadenza; niente conversione automatica in memoria permanente |

### Stati consigliati per le proposte Atlante

1. **Draft:** autore prepara una modifica con revisione di partenza, fonti, licenza, ambito e motivazione. Bozza non pubblica finché non è autorizzata.
2. **Source review:** controlli automatici e umani su attribuzioni, diritto di redistribuzione, fonti primarie/secondarie, data, unità, neutralità descrittiva e conflitti di interesse.
3. **Discussion:** contestazioni motivate, revisioni alternative, obiezioni e osservazioni di minoranza; si chiarisce cosa è fattuale e cosa interpretativo.
4. **Decision of publication:** un revisore autorizzato può applicare una modifica non controversa già conforme alle regole. Un conflitto editoriale grave richiede una procedura locale pubblica e ricorribile. Voti su **policy** non diventano voti sulla verità.
5. **Publish:** solo il server autorizzato pubblica una revisione con hash, predecessore, fonti, stato diritti e attestazione; niente sovrascrittura della storia.
6. **Challenge/appeal:** segnalazione, correzione e ripristino selettivo motivati; chi ha eseguito l'azione contestata non giudica da solo il ricorso.
7. **Takedown:** dati personali, materiale vietato o violazioni dei diritti possono richiedere blocco di diffusione e rimozione dalle repliche, secondo capacità tecniche e obblighi legali: il log non deve rendere irrimediabile la diffusione.

### Qualità delle fonti

Non attribuire punteggi automatici di «verità» o «orientamento politico» ai feed. Il sistema deve mostrare: chi pubblica, quando, lingua originale, URL, metodo e data di accesso; dove possibile indicare correzioni, legami tra fonti e interessi dichiarati. Fonti in conflitto si possono citare con contesto e peso proporzionato alle prove disponibili; non concedere identico credito a una fonte manipolata per apparire imparziali.

Una pagina enciclopedica deve distinguere cronologia dei fatti, citazioni, interpretazioni, incertezza e valutazioni della comunità. Una deliberazione che sceglie di enfatizzare un tema va indicata come **decisione editoriale**, non come certificazione della sua verità. Vietare l'uso di profili privati per classificare politicamente lettori o orientare di nascosto il feed.

### Licenze e Atlante

Il contratto di contributo oggi permette anche licenze `ND` o diritti riservati; possono essere utili per un **catalogo di lettura**, ma impediscono in generale le derivazioni normalmente necessarie per una Atlante collaborativa. Prima dell'apertura creare una policy separata:
- **Corpus Atlante modificabile:** accetta soltanto licenze compatibili con revisioni collaborative e riuso previsto; spiegare condizioni di attribuzione e eventuale ShareAlike.
- **Biblioteca/catalogo:** può citare e collegare opere con diritti più restrittivi senza assorbirle nella Atlante modificabile.
- **Contenuti precedenti:** nessuna conversione retroattiva fittizia della licenza; mantenere `reuse-not-documented` quando appropriato.
- **Interoperabilità:** non imporre una compatibilità con Wikipedia che il progetto non ha scelto; rendere invece verificabili restrizioni e opzioni future di esportazione.

### Autogoverno e tutela del dissenso

Le policy del nodo sono proposte e cambiate dall'assemblea competente; la moderazione esegue quelle regole con mandato limitato. Vietare revoche arbitrarie senza motivazione, soglie segrete, cancellazioni silenziose e conflitti d'interesse non dichiarati. Conservare ricevute di decisioni compatibili con privacy e sicurezza; evitare il «processo per like». L'assenza di unanimità non rende illegittimo il confronto, ma neppure una maggioranza autorizza molestie o illegalità.

### Test necessari prima del primo editor pubblico

- Una proposta senza fonti o con diritti mancanti non entra nella pubblicazione automatica.
- Cambiare la revisione corrente mentre la proposta è discussa produce un conflitto esplicito.
- Un voto su policy non può essere riutilizzato come certificato per pubblicare un testo diverso.
- Due richieste concorrenti non perdono o riscrivono una revisione approvata.
- Un moderatore non può modificare di nascosto fonti, attribuzioni, cronologia o risultato delle decisioni.
- Un PR2 di un altro nodo non può approvare contenuti nello spazio sbagliato senza mandato separato.
- Un oggetto con informazioni private non può entrare nel bundle `public-verified`.
- Un'istanza che non dispone del quorum mantiene la revisione verificata precedente, ma può raccogliere bozze non finalizzate.

Questo documento è una specifica di prodotto proposta: implementarla richiede nuovi endpoint, persistenza, UI, collaudo e consultazione della comunità.
