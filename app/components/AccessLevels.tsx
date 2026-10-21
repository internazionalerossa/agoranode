"use client";
import {LocalizedText as T} from './Localization';

export default function AccessLevels(){
 return <section className="access-levels" aria-label="I due livelli di partecipazione">
  <ol>
   <li><span className="access-level-number" aria-hidden="true">1</span><div><h3><T>PR1 · Articoli e segnalibri</T></h3><p className="access-level-step"><T>Email confermata</T></p><p><T>Registrati con email e password e conferma l’indirizzo, senza approvazione della comunità né presentazione pubblica. Le email servono soltanto a confermare l’account e recuperare l’accesso; non sono notifiche o newsletter. Articoli e segnalibri restano privati e disponibili anche su un altro dispositivo.</T></p></div></li>
   <li><span className="access-level-number" aria-hidden="true">2</span><div><h3><T>PR2 · Forum, issue e voto</T></h3><p className="access-level-step"><T>Riferimento pubblico e ammissione</T></p><p><T>Presentati, dichiara il nome da usare e indica un URL HTTPS pubblico a Facebook, Instagram o al tuo sito personale. Il riferimento è obbligatorio ma non verificato dal server: i membri lo aprono e valutano personalmente le informazioni disponibili. Facebook OAuth è facoltativo e, se usato, prova soltanto il controllo dell’account al momento della domanda; il token viene poi rimosso. Tre sì ammettono, tre no respingono. La domanda scade dopo 72 ore. Con PR2 puoi discutere di qualsiasi argomento nel forum, entrare nelle stanze di chat e proporre issue e modifiche al progetto. Ogni membro PR2 ha diritto di voto, senza ulteriori approvazioni. Le votazioni decidono come migliorare il sito; le conversazioni del forum non devono riguardare soltanto il progetto. Discussioni pubbliche, proposte e risultati sono leggibili da tutti; solo gli argomenti impostati come privati restano riservati ai membri PR2.</T></p></div></li>
  </ol>

 </section>;
}
