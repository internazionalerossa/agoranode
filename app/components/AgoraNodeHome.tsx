"use client";

import {useEffect} from "react";
import {ArrowRight, GitBranch, Network, ShieldCheck} from "lucide-react";
import FederationBoard from "./FederationBoard";
import SharedCustodyView from "./SharedCustodyView";
import SharedSpaceModules from "./SharedSpaceModules";
import AgoraFeed from "./AgoraFeed";
import NodeStudio from "./NodeStudio";
import AgoraForum from "./AgoraForum";
import ScopedIssues from "./ScopedIssues";
import AgoraLibraryView from "./AgoraLibraryView";
import {AGORA_MANIFEST} from "../instances/agora";
import {NODE_PRIMARY_TABS,thematicNodeTabHref} from "../lib/node-primary-navigation";

export default function AgoraNodeHome() {
  const view=typeof window==="undefined"?"notizie":new URL(window.location.href).searchParams.get("view")??"notizie";
  const library=view==="biblioteca";
  const participation=view==="partecipa";
  useEffect(() => {
    document.documentElement.lang = "it";
    document.title = "Agorà — AgoràNode · tecnologia e infrastruttura comune";
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
        <p>Stato dell’arte della tecnologia AgoràNode, delle sue regole e dell’infrastruttura comune.</p>
        <nav aria-label="Navigazione del nodo Agorà">
          {NODE_PRIMARY_TABS.map(tab=><a key={tab.id} href={thematicNodeTabHref('agora',tab.id)}
            aria-current={(tab.id==='notizie'&&!library&&!participation)||(tab.id==='teoria'&&library)||(tab.id==='partecipa'&&participation)?'page':undefined}>{tab.label}</a>)}
          <a href="/#node-directory-content">Altri nodi</a>
          <a className="agoranode-instance-link" href="/polisrossa">PolisRossa <ArrowRight size={16}/></a>
        </nav>
      </header>



      <main id="agoranode-content">
        {library?<AgoraLibraryView/>:participation?<section className="agora-participation" aria-labelledby="agora-participation-title">
          <header><p className="eyebrow">COMUNITÀ · PARTECIPAZIONE · PROPOSTE</p>
            <h1 id="agora-participation-title">Agorà: costruire la piattaforma insieme</h1>
            <p>Un laboratorio visuale per proposte e nuovi nodi, con ruoli e controlli espliciti.
             La pubblicazione dei nuovi nodi non può sostituire una decisione PR2 competente
             o creare automaticamente account e forum.</p>
          </header>
          <AgoraForum/>
          <ScopedIssues/>
          <NodeStudio spaceId="agora"/>
          <FederationBoard/>
          <SharedCustodyView/>
        </section>:<>
          <AgoraFeed/>
          <aside className="agoranode-boundary" aria-label="Ambito del nodo Agorà">
            <div><Network size={20}/><span><strong>AgoràNode è la tecnologia comune.</strong> Agorà è il nodo alpha di riferimento; PolisRossa resta una comunità distinta.</span></div>
            <div><GitBranch size={20}/><span><strong>Le decisioni hanno un ambito preciso.</strong> Anche quando Agorà è il nodo alpha, le scelte tematiche restano ai rispettivi nodi.</span></div>
            <div><ShieldCheck size={20}/><span><strong>Ospitare non dà potere politico.</strong> L'ammissione PR2 non deriva dal possesso di un server: server, firme tecniche e diritto di voto rimangono separati.</span></div>
          </aside>
          <SharedSpaceModules manifest={AGORA_MANIFEST}/>
        </>}
      </main>

      <footer className="agoranode-footer">
        <p>AgoràNode · infrastruttura comune in costruzione pubblica e verificabile.</p>
        <div><a href="/polisrossa">PolisRossa</a><span aria-hidden="true"> · </span><a href="https://github.com/internazionalerossa/agoranode" target="_blank" rel="noopener noreferrer">Codice sorgente</a><span aria-hidden="true"> · </span><a href="https://github.com/internazionalerossa/agoranode/blob/main/docs/AGORANODE.md" target="_blank" rel="noopener noreferrer">Architettura del progetto</a></div>
      </footer>
    </div>
  );
}
