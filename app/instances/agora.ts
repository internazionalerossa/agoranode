import {AGORA_NODE_MANIFEST_VERSION, AGORA_NODE_SCHEMA_ID, type AgoraNodeManifest} from '../platform/agora-node-manifest';

/**
 * The Agorà technology community is a thematic space, not the AgoraNode
 * platform, the node directory or the federation's technical authority.
 * The Agorà alpha home contains a real technology feed, and its Biblioteca
 * contains the first local editorial Atlante and a curated timeline. Account
 * and forum isolation remain planned and are never implied by route labels.
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
    news: {label: 'Notizie e fonti tecnologiche', status: 'implemented', route: '/agora#agora-news-title'},
    video: {label: 'Video e conferenze', status: 'implemented', route: '/agora#agora-video-title'},
    library: {label: 'Biblioteca', status: 'implemented', route: '/agora?view=biblioteca'},
    wiki: {label: 'Atlante · Indice e ricerca', status: 'implemented', route: '/agora?view=biblioteca&sezione=timeline&modalita=indice'},
    storyline: {label: 'Timeline narrativa', status: 'implemented', route: '/agora?view=biblioteca&sezione=timeline'},
    data: {label: 'Dati e grafici', status: 'implemented', route: '/agora?view=biblioteca&sezione=dati'},
    community: {label: 'Agorà · proposte e laboratorio', status: 'planned', route: '/agora?view=partecipa'},
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
    notice: 'Agorà ha una rassegna tecnologica, voci editoriali originali, una timeline narrativa e pagine di consultazione; account, forum e approvazione PR2 indipendenti non sono ancora attivati. Il kernel di replica pubblica è collaudato solo localmente.',
  },
} as const satisfies AgoraNodeManifest;
