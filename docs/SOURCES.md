# Fonti e verifica del catalogo

Il catalogo distingue 177 fonti dirette da 136 canali tematici di ricerca. I canali di ricerca aggregano risultati esterni e non rappresentano altrettante testate. Le fonti dirette comprendono giornali, riviste, organizzazioni, sindacati e canali editoriali: la loro inclusione non attribuisce automaticamente la stessa natura o lo stesso orientamento a tutti.

La sezione video comprende 84 canali, in 27 paesi o contesti editoriali e 11 lingue. I filtri riguardano lingua originale, paese, argomento e nome. La lingua di lettura rimane una scelta distinta. Gli identificatori dei canali sono ricavati dai metadati pubblici della piattaforma; gli account omonimi o estranei sono esclusi.

## Criteri di manutenzione

Per inserire una fonte occorrono sito ufficiale, provenienza editoriale, lingua, destinazione del feed e articoli effettivamente osservati. Un reindirizzamento deve essere controllato: un dominio ceduto o un feed confluito in una testata già presente non costituisce una nuova fonte. Se un progetto lavora in più paesi, il catalogo lo indica senza dedurre la nazionalità dal dominio o dal luogo descritto negli articoli.

Le verifiche conservano data, titolo del feed e numero di elementi osservati in `app/data/source-verification.json`. Descrivono una risposta effettiva al momento del controllo, senza garantire la disponibilità futura. Gli errori di rete non diventano articoli, classifiche o dati inventati. I collegamenti originali rimangono accessibili quando una raccolta automatica non riesce.

La ricognizione documentale comprende i collegamenti esterni dei 3.385 articoli restituiti dall’archivio pubblico di OttolinaTV il 19 ottobre 2026: 523 domini distinti, inclusi servizi tecnici e social. La frequenza di citazione serve a individuare possibili fonti; non è una certificazione di attendibilità, né comporta l’inserimento automatico. Il controllo dei collegamenti non equivale a una revisione critica integrale di ogni articolo.

L’esplorazione geografica include le pubblicazioni e i partner elencati dal servizio Wire di Progressive International e la verifica dei relativi siti ufficiali. L’appartenenza a una rete editoriale non sostituisce l’esame dei singoli contributi.

Riferimenti: [archivio OttolinaTV](https://ottolinatv.it/), [Wire e partner](https://progressive.international/wire/). Le testimonianze dei collegamenti e le osservazioni dei feed sono conservate nel file di verifica, senza ripubblicare i testi integrali degli articoli.

Le sezioni non editoriali presenti in feed generici vengono escluse attraverso regole esplicite in `app/data/news-exclusions.json`. La sezione commerciale `/tienda/` di Revista Crisis è stata osservata nei risultati del 19 ottobre 2026 e non deve comparire come notizia. Le esclusioni non eliminano i salvataggi personali e non si basano su parole presenti nei titoli.

## Ammissione degli editori

La ricerca per parole chiave non costituisce una verifica editoriale. I risultati radar sono ammessi solo se l’editore corrisponde a un dominio del catalogo diretto. I controlli operano in acquisizione, ripristino della cache del browser e selezione dell’osservatorio; la versione della cache pubblica è aggiornata al cambio di politica. `app/data/source-policy.json` conserva i criteri, le esclusioni e le prove sul carattere pubblico degli atenei. Le fonti statistiche e i documenti originali sono distinti dalle testate della rassegna.
