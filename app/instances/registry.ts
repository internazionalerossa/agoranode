import {isAgoraNodeManifest, type AgoraNodeManifest} from '../platform/agora-node-manifest';
import {AGORA_MANIFEST} from './agora';
import {POLISROSSA_MANIFEST} from './polisrossa';

/**
 * Allowlisted LOCAL spaces. This is not a federated directory and does not
 * enable multiple live databases, authentication realms or remote peers.
 */
export const LOCAL_SPACES = [
  {
    manifest: AGORA_MANIFEST,
    href: '/agora',
    availability: 'preview',
    status: 'Nodo alpha tecnologico · forum in sviluppo',
    description: 'Nucleo tecnologico di AgoràNode: rassegna RSS e video, Biblioteca con Atlante narrativo, dati e laboratorio.',
  },
  {
    manifest: POLISROSSA_MANIFEST,
    href: '/polisrossa',
    availability: 'local-runtime',
    status: 'Nodo tematico disponibile',
    description: 'Attualità, video, biblioteca, storia, dati e discussione sulle sinistre internazionali.',
  },
] as const;

export type LocalSpaceId = (typeof LOCAL_SPACES)[number]['manifest']['instance']['id'];

export function localSpaceManifest(id: string): AgoraNodeManifest | null {
  const entry = LOCAL_SPACES.find(space => space.manifest.instance.id === id);
  return entry?.manifest ?? null;
}

/** Safe-to-publish node discovery projection, distinct from P2P discovery. */
export function publicLocalSpaces() {
  return LOCAL_SPACES.map(({manifest, href, availability, status, description}) => ({
    id: manifest.instance.id,
    name: manifest.instance.name,
    topic: manifest.instance.topic,
    description,
    href,
    availability,
    status,
  }));
}

export function validateLocalSpaces(): boolean {
  const ids = new Set<string>();
  const hrefs = new Set<string>();
  for (const space of LOCAL_SPACES) {
    if (!isAgoraNodeManifest(space.manifest) ||
        ids.has(space.manifest.instance.id) ||
        hrefs.has(space.href) ||
        !space.href.startsWith('/') || space.href.startsWith('//')) return false;
    ids.add(space.manifest.instance.id);
    hrefs.add(space.href);
  }
  return true;
}
