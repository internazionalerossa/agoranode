import type {AgoraNodeManifest, AgoraNodeCapabilityId} from '../platform/agora-node-manifest';
import {AGORA_NODE_CAPABILITIES} from '../platform/agora-node-manifest';
import NodeContentSearch from './NodeContentSearch';

/**
 * Same structured module navigator in every thematic community.
 * Content ownership, API sessions, forum membership and data are NEVER
 * inferred from the shared frontend: backend authorization is separate.
 */
const DESCRIPTIONS: Readonly<Record<AgoraNodeCapabilityId,string>> = {
  news:'Feed RSS e notizie tracciabili fino alla fonte originale.',
  video:'Video e canali con provenienza e piattaforma dichiarate.',
  library:'Opere, documenti ed edizioni con i rispettivi diritti.',
  wiki:'Pagine enciclopediche, fonti e cronologia delle revisioni.',
  storyline:'Eventi, persone, concetti e percorsi cronologici.',
  data:'Indicatori, grafici, unità, periodi e metodologie.',
  community:'Forum, proposte, votazioni e stanze di conversazione.',
};

export default function SharedSpaceModules({manifest}: {manifest: AgoraNodeManifest}) {
  return (
    <section className="shared-space-modules" aria-labelledby={'space-modules-'+manifest.instance.id}>
      <div className="shared-space-modules-heading">
        <p className="eyebrow">UN FORMATO COMUNE, CONTENUTI AUTONOMI</p>
        <h2 id={'space-modules-'+manifest.instance.id}>Esplora {manifest.instance.name}</h2>
        <p>{manifest.instance.topic}</p>
      </div>
      <div className="shared-space-modules-grid">
        {AGORA_NODE_CAPABILITIES.map((id,index)=>{
          const capability=manifest.capabilities[id];
          return (
            <article className="shared-space-module" key={id} data-space-module={id}>
              <span className="shared-space-module-number" aria-hidden="true">{String(index+1).padStart(2,'0')}</span>
              <h3>{capability.label}</h3>
              <p>{DESCRIPTIONS[id]}</p>
              {capability.status==='implemented' ?
                <a href={capability.route}>Apri sezione <span aria-hidden="true">→</span></a> :
                <span className="shared-space-module-pending">In costruzione · non ancora accessibile</span>
              }
            </article>
          );
        })}
      </div>
      <NodeContentSearch spaceId={manifest.instance.id}/>
    </section>
  );
}
