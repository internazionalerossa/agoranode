import {AGORA_NODE_MANIFEST_VERSION, AGORA_NODE_SCHEMA_ID, type AgoraNodeManifest} from '../platform/agora-node-manifest';

/**
 * The Agorà technology community is a thematic space, not the AgoraNode
 * platform, the node directory or the federation's technical authority.
 * This is an explicit *planned* manifest: the current /agora page only
 * exposes documentation, custody information and a federation preview.
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
    tagline: 'La comunità della tecnologia AgoràNode.',
  },
  theme: {
    background: '#f4f7f8',
    surface: '#ffffff',
    foreground: '#1c2b33',
    accent: '#235f86',
  },
  capabilities: {
    news: {label: 'Notizie e fonti tecnologiche', status: 'planned', route: '/agora'},
    video: {label: 'Video e conferenze', status: 'planned', route: '/agora'},
    library: {label: 'Biblioteca tecnica', status: 'planned', route: '/agora'},
    wiki: {label: 'Wiki e specifiche', status: 'planned', route: '/agora'},
    storyline: {label: 'Cronologia del progetto', status: 'planned', route: '/agora'},
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
    notice: 'Contratto e obiettivo di conservazione: Agorà non dispone ancora di un deposito tematico, account o forum autonomi. Il kernel di replica della sola conoscenza pubblica è verificato localmente; nessuna rete P2P di produzione è attiva.',
  },
} as const satisfies AgoraNodeManifest;
