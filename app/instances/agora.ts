import {AGORA_NODE_MANIFEST_VERSION, AGORA_NODE_SCHEMA_ID, type AgoraNodeManifest} from '../platform/agora-node-manifest';

/**
 * The Agorà technology community is a thematic space, not the AgoraNode
 * platform, the node directory or the federation's technical authority.
 * Agorà is the founding thematic alpha with a published, source-linked
 * editorial Atlante. Federated forum, BFT and independent private accounts
 * remain explicitly planned and must not be implied by the visible Atlas.
 */
export const AGORA_MANIFEST = {
  schema: AGORA_NODE_SCHEMA_ID,
  schemaVersion: AGORA_NODE_MANIFEST_VERSION,
  platform: {id: 'agora-node', name: 'AgoràNode', namespace: 'agoranode'},
  instance: {
    id: 'agora',
    name: 'Agorà',
    language: 'it',
    topic: 'Tecnologia, software libero, architettura e infrastruttura AgoràNode',
    description: 'Documentazione, stato dell’arte, fonti, proposte e confronto sulla tecnologia comune.',
  },
  brand: {
    canonicalName: 'Agorà',
    wordmarkPrefix: 'Agorà',
    tagline: 'Il primo nodo alpha di AgoràNode.',
  },
  theme: {
    background: '#f4f7f8',
    surface: '#ffffff',
    foreground: '#1c2b33',
    accent: '#235f86',
  },
  capabilities: {
    news: {label: 'Notizie e fonti tecnologiche', status: 'implemented', route: '/agora#agora-news-title'},
    video: {label: 'Video e conferenze', status: 'implemented', route: '/agora#agora-video-title'},
    library: {label: 'Biblioteca tecnica', status: 'implemented', route: '/agora#biblioteca-agora'},
    wiki: {label: 'Atlante delle conoscenze', status: 'implemented', route: '/agora#atlante-agora'},
    storyline: {label: 'Percorso narrativo', status: 'implemented', route: '/agora#percorso-agora'},
    data: {label: 'Dati e verifiche di rete', status: 'planned', route: '/agora'},
    community: {label: 'Forum e stanze della comunità', status: 'planned', route: '/agora'},
  },
  links: {
    repository: 'https://github.com/internazionalerossa/agoranode',
    notice: 'https://github.com/internazionalerossa/agoranode/blob/main/NOTICE',
    selfHosting: 'https://github.com/internazionalerossa/agoranode/blob/main/docs/SELF-HOSTING.md',
  },
  governance: {model: 'agora-community-planned', version: 1, scope: 'instance', href: '/agora'},
  runtime: {
    boundaryVersion: 1,
    supportedInstanceIds: ['agora'],
    databaseIsolation: 'one-database-per-instance',
  },
  preservation: {
    publicKnowledge: 'append-only-revisions',
    portableExport: true,
    personalData: 'erasable-by-data-subject',
    notice: 'Agorà pubblica un primo Atlante editoriale e una biblioteca di documentazione conservata nel repository. Non dispone ancora di un servizio forum PR2 o account autonomo; replica P2P e consenso BFT non sono attivi in produzione.',
  },
} as const satisfies AgoraNodeManifest;
