"use client";
import {LocalizedText as T} from './Localization';

export default function AccessLevels(){
 return <section className="access-levels" aria-label="I due livelli di partecipazione">
  <ol>
   <li><span className="access-level-number" aria-hidden="true">1</span><div><h3><T>PR1 · Articoli e segnalibri</T></h3><p className="access-level-step"><T>Account con email confermata</T></p><p><T>Conserva privatamente gli articoli e i segnalibri dei libri, anche su un altro dispositivo. Diventi membro PR1 dopo la conferma dell’email, senza approvazione della comunità. Bastano email e password: non serve collegare un profilo social né presentarsi pubblicamente. I salvataggi sono privati e conservati online.</T></p></div></li>
   <li><span className="access-level-number" aria-hidden="true">2</span><div><h3><T>PR2 · Forum, issue e voto</T></h3><p className="access-level-step"><T>Verifica della persona o dell’ente e ammissione</T></p><p><T>Presentati, indica un riferimento pubblico verificabile e sottoponi la domanda ai membri. Servono almeno tre sì di membri PR2 distinti entro 72 ore. Con PR2 puoi discutere di qualsiasi argomento nel forum, entrare nelle stanze di chat e proporre issue e modifiche al progetto. Ogni membro PR2 ha diritto di voto, senza ulteriori approvazioni. Le votazioni decidono come migliorare il sito; le conversazioni del forum non devono riguardare soltanto il progetto. Discussioni pubbliche, proposte e risultati sono leggibili da tutti; solo gli argomenti impostati come privati restano riservati ai membri PR2.</T></p></div></li>
  </ol>

 </section>;
}
