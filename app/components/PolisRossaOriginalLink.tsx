import {ORIGINAL_POLISROSSA_URL} from '../lib/polisrossa-original';

/**
 * A static preview has no RSS aggregation, account database, reader state or forum.
 * Do not mount the original application here with dead /api/* calls.
 */
export default function PolisRossaOriginalLink(){
 return <main className="app-shell" style={{maxWidth:760,margin:'5rem auto',padding:'2rem'}}>
  <p className="eyebrow">POLISROSSA · SITO ORIGINALE</p>
  <h1>Apri PolisRossa nella sua versione completa</h1>
  <p>Questa installazione è soltanto l'anteprima statica di AgoraNode: non ospita il server della Rassegna stampa e non può caricare articoli, fonti, video o dati personali come il sito originale.</p>
  <p>Per mantenere il layout, le interazioni e i contenuti originali, entra direttamente nell'istanza PolisRossa.</p>
  <p><a className="button" href={ORIGINAL_POLISROSSA_URL}>Vai alla PolisRossa originale ↗</a></p>
  <p>Se non riesci ad aprirla, controlla di essere connesso alla rete sulla quale l'istanza è pubblicata. Questa anteprima non sostituisce il suo backend.</p>
  <p><a href="/">Torna alla directory dei nodi</a></p>
 </main>;
}
