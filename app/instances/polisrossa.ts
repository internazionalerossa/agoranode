import {AGORA_NODE_MANIFEST_VERSION, AGORA_NODE_SCHEMA_ID, type AgoraNodeManifest} from '../platform/agora-node-manifest';

/** Build-time identity for the PolisRossa instance; it deliberately imports no catalogues. */
export const POLISROSSA_MANIFEST = {
  schema: AGORA_NODE_SCHEMA_ID,
  schemaVersion: AGORA_NODE_MANIFEST_VERSION,
  platform: {
    id: 'agora-node',
    name: 'AgoràNode',
    namespace: 'agoranode',
  },
  instance: {
    id: 'polisrossa',
    name: 'PolisRossa',
    language: 'it',
    topic: 'Storia, attualità, cultura e dati delle sinistre e dei movimenti sociali internazionali',
    description: 'Notizie, fonti, biblioteca, storia, dati e partecipazione della comunità PolisRossa.',
  },
  brand: {
    canonicalName: 'PolisRossa',
    wordmarkPrefix: 'Polis',
    tagline: 'Notizie, conoscenza e strumenti comuni.',
  },
  theme: {
    background: '#f6f3ec',
    surface: '#fffdf8',
    foreground: '#282923',
    accent: '#ad302d',
  },
  capabilities: {
    news: {label: 'Notizie', status: 'implemented', route: '/polisrossa'},
    video: {label: 'Video', status: 'implemented', route: '/polisrossa'},
    library: {label: 'Biblioteca gratuita', status: 'implemented', route: '/polisrossa?view=teoria'},
    wiki: {label: 'Wiki', status: 'planned', route: '/polisrossa?view=teoria&percorso=timeline'},
    storyline: {label: 'Storyline', status: 'implemented', route: '/polisrossa?view=teoria&percorso=timeline'},
    data: {label: 'Dati e grafici', status: 'implemented', route: '/polisrossa?view=teoria&percorso=dati'},
    community: {label: 'Forum e autogestione', status: 'implemented', route: '/polisrossa?view=partecipa'},
  },
  links: {
    repository: 'https://github.com/internazionalerossa/agoranode',
    notice: 'https://github.com/internazionalerossa/agoranode/blob/main/NOTICE',
    selfHosting: 'https://github.com/internazionalerossa/agoranode/blob/main/docs/SELF-HOSTING.md',
  },
  governance: {
    model: 'polisrossa-pr1-pr2',
    version: 1,
    scope: 'instance',
    href: '/polisrossa?view=partecipa',
  },
  runtime: {
    boundaryVersion: 1,
    supportedInstanceIds: ['polisrossa'],
    databaseIsolation: 'one-database-per-instance',
  },
  preservation: {
    publicKnowledge: 'append-only-revisions',
    portableExport: true,
    personalData: 'erasable-by-data-subject',
    notice: 'Le revisioni, gli export e il motore locale di replica rendono la conoscenza pubblica verificabile e portabile, ma nessun singolo host ne garantisce la sopravvivenza. Il trasporto automatico fra PC indipendenti e il failover non sono ancora attivati né collaudati; i dati personali restano esclusi dalla replica e cancellabili su richiesta.',
  },
} as const satisfies AgoraNodeManifest;

/**
 * Stable names retained by the existing instance.  They are intentionally not
 * included in the public instance descriptor and must not be renamed as part
 * of platform extraction.
 */
export const POLISROSSA_COMPATIBILITY = Object.freeze({
  browserStoragePrefix: 'rassegna-rossa.',
  languagePreferencesKey: 'internazionalerossa.language-preferences',
  serviceWorkerCachePrefix: 'polisrossa-public-',
  personalDataFormat: 'polisrossa-personal-data-v1',
  publicSnapshotNetwork: 'polisrossa-public',
});
