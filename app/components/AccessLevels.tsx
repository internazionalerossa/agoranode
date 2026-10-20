"use client";
import {LocalizedText as T} from './Localization';

export default function AccessLevels(){
 return <section className="access-levels" aria-label="I due livelli di partecipazione">
  <ol>
   <li><span className="access-level-number" aria-hidden="true">1</span><div><h3><T>IR1 · Articoli e segnalibri</T></h3><p className="access-level-step"><T>Account con email confermata</T></p><p><T>Conserva privatamente gli articoli e i segnalibri dei libri, anche su un altro dispositivo. Diventi membro IR1 dopo la conferma dell’email, senza approvazione della comunità. Bastano email e password: non serve collegare un profilo social né presentarsi pubblicamente. I salvataggi sono privati e conservati online.</T></p></div></li>
   <li><span className="access-level-number" aria-hidden="true">2</span><div><h3><T>IR2 · Forum, issue e voto</T></h3><p className="access-level-step"><T>Verifica della persona o dell’ente e ammissione</T></p><p><T>Presentati, indica un riferimento pubblico verificabile e sottoponi la domanda ai membri. Servono almeno tre sì di membri IR2 distinti entro 72 ore. Con IR2 puoi discutere di qualsiasi argomento nel forum, entrare nelle stanze di chat e proporre issue e modifiche al progetto. Ogni membro IR2 ha diritto di voto, senza ulteriori approvazioni. Le votazioni decidono come migliorare il sito; le conversazioni del forum non devono riguardare soltanto il progetto. Discussioni pubbliche, proposte e risultati sono leggibili da tutti; solo gli argomenti impostati come privati restano riservati ai membri IR2.</T></p></div></li>
  </ol>

 </section>;
}
