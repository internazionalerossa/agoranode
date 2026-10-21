"use client";

import {useEffect} from "react";
import {ArrowRight, GitBranch, Network, ShieldCheck} from "lucide-react";
import FederationBoard from "./FederationBoard";
import SharedCustodyView from "./SharedCustodyView";

export default function AgoraNodeHome() {
  useEffect(() => {
    document.documentElement.lang = "it";
    document.title = "AgoràNode · conoscenza pubblica governata in comune";
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) description.content = "AgoràNode è una piattaforma federata per conoscenza pubblica, dati, biblioteche e comunità governate democraticamente.";
    document.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.remove();
  }, []);

  return (
    <div className="app-shell agoranode-shell">
      <a className="skip-link" href="#agoranode-content">Vai ai contenuti</a>
      <header className="agoranode-header">
        <a className="agoranode-wordmark" href="/" aria-label="AgoràNode, pagina principale">
          <span aria-hidden="true">A</span>
          <strong>AgoràNode</strong>
        </a>
        <p>Una casa comune per conoscenza pubblica, memoria e decisioni verificabili.</p>
        <nav aria-label="Navigazione AgoràNode">
          <a href="#formato">Formato</a>
          <a href="#governo-federale">Registro federale</a>
          <a href="#possesso">Governo comune</a>
          <a href="#roadmap">Rete distribuita</a>
          <a className="agoranode-instance-link" href="/polisrossa">Apri PolisRossa <ArrowRight size={16}/></a>
        </nav>
      </header>

      <aside className="agoranode-boundary" aria-label="Relazione tra piattaforma e istanze">
        <div><Network size={20}/><span><strong>AgoràNode è la piattaforma principale.</strong> Definisce il formato comune e il coordinamento federale.</span></div>
        <div><GitBranch size={20}/><span><strong>PolisRossa è un’istanza.</strong> Ha una home, una comunità, dati e decisioni propri.</span></div>
        <div><ShieldCheck size={20}/><span><strong>Ospitare non dà potere politico.</strong> Server, firma tecnica e diritto di voto rimangono separati.</span></div>
      </aside>

      <main id="agoranode-content">
        <FederationBoard />
        <SharedCustodyView />
      </main>

      <footer className="agoranode-footer">
        <p>AgoràNode · infrastruttura comune in costruzione pubblica e verificabile.</p>
        <div><a href="/polisrossa">PolisRossa</a><span aria-hidden="true"> · </span><a href="https://github.com/internazionalerossa/agoranode" target="_blank" rel="noopener noreferrer">Codice sorgente</a><span aria-hidden="true"> · </span><a href="https://github.com/internazionalerossa/agoranode/blob/main/docs/AGORANODE.md" target="_blank" rel="noopener noreferrer">Architettura del progetto</a></div>
      </footer>
    </div>
  );
}

