"use client";

import {lazy,Suspense,useEffect} from "react";
import {ArrowRight, GitBranch, Network, ShieldCheck} from "lucide-react";
const AgoraAtlas=lazy(()=>import("./AgoraAtlas"));
import FederationBoard from "./FederationBoard";
import SharedCustodyView from "./SharedCustodyView";
import SharedSpaceModules from "./SharedSpaceModules";
import AgoraFeed from "./AgoraFeed";
import NodeStudio from "./NodeStudio";
import {AGORA_MANIFEST} from "../instances/agora";

export default function AgoraNodeHome() {
  useEffect(() => {
    document.documentElement.lang = "it";
    document.title = "Agorà · Atlante della tecnologia — AgoràNode";
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) description.content = "AgoràNode è una tecnologia e infrastruttura condivisa per nodi tematici di conoscenza pubblica, dati, biblioteche e comunità.";
    document.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.remove();
  }, []);

  return (
    <div className="app-shell agoranode-shell">
      <a className="skip-link" href="#agoranode-content">Vai ai contenuti</a>
      <header className="agoranode-header">
        <a className="agoranode-wordmark" href="/" aria-label="Torna all’elenco dei nodi">
          <span aria-hidden="true">A</span>
          <strong>Agorà <small>— AgoràNode</small></strong>
        </a>
        <p>Il nodo alpha originario: notizie, Atlante delle conoscenze, biblioteca e racconto della tecnologia comune.</p>
        <nav aria-label="Navigazione AgoràNode">
          <a href="/#node-directory-content">Nodi</a>
          <a href="/agora#agora-news-title">Notizie</a>
          <a href="/agora#atlante-agora">Atlante</a>
          <a href="/agora#percorso-agora">Timeline</a>
          <a href="/agora#biblioteca-agora">Biblioteca</a>
          <a href="/agora#studio-agora">Laboratorio</a>
          <a href="/agora#governo-federale">Decisioni</a>
          <a className="agoranode-instance-link" href="/polisrossa">PolisRossa <ArrowRight size={16}/></a>
        </nav>
      </header>



      <main id="agoranode-content">
        {typeof window!=='undefined' && new URL(window.location.href).searchParams.has('atlante') ?
          <Suspense fallback={<p role="status">Apertura della voce dell’Atlante…</p>}><AgoraAtlas/></Suspense> :
          <>
        <AgoraFeed/>
        <Suspense fallback={<p role="status">Preparazione dell’Atlante…</p>}><AgoraAtlas/></Suspense>
        <aside className="agoranode-boundary" aria-label="Ambito del nodo Agorà">
          <div><Network size={20}/><span><strong>AgoràNode è la tecnologia comune.</strong> Questo nodo raccoglie lo stato dell’arte del protocollo e dell’infrastruttura.</span></div>
          <div><GitBranch size={20}/><span><strong>Le decisioni hanno un ambito preciso.</strong> Agorà tratta le questioni comuni; le scelte tematiche restano ai rispettivi nodi.</span></div>
          <div><ShieldCheck size={20}/><span><strong>Ospitare non dà potere politico.</strong> Server, firma tecnica e diritto di voto rimangono separati.</span></div>
        </aside>
        <SharedSpaceModules manifest={AGORA_MANIFEST}/>
        <NodeStudio spaceId="agora"/>
        <FederationBoard />
        <SharedCustodyView />
          </>}
      </main>

      <footer className="agoranode-footer">
        <p>Agorà · nodo alpha originario di AgoràNode. Software comune, contenuti e governance separati.</p>
        <div><a href="/polisrossa">PolisRossa</a><span aria-hidden="true"> · </span><a href="https://github.com/internazionalerossa/agoranode" target="_blank" rel="noopener noreferrer">Codice sorgente</a><span aria-hidden="true"> · </span><a href="https://github.com/internazionalerossa/agoranode/blob/main/docs/AGORANODE.md" target="_blank" rel="noopener noreferrer">Architettura del progetto</a></div>
      </footer>
    </div>
  );
}
