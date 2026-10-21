import {AGORA_NODE_CAPABILITIES} from '../platform/agora-node-manifest';
import {INSTANCE_MANIFEST} from './instance';

/**
 * Explicit projection: compatibility namespaces and any future private build
 * fields cannot leak through an object spread.
 */
export function publicInstanceDescriptor() {
  const manifest = INSTANCE_MANIFEST;
  return {
    schema: manifest.schema,
    schemaVersion: manifest.schemaVersion,
    platform: {id: manifest.platform.id, name: manifest.platform.name, namespace: manifest.platform.namespace},
    instance: {
      id: manifest.instance.id,
      name: manifest.instance.name,
      language: manifest.instance.language,
      topic: manifest.instance.topic,
      description: manifest.instance.description,
    },
    brand: {
      canonicalName: manifest.brand.canonicalName,
      wordmarkPrefix: manifest.brand.wordmarkPrefix,
      tagline: manifest.brand.tagline,
    },
    theme: {
      background: manifest.theme.background,
      surface: manifest.theme.surface,
      foreground: manifest.theme.foreground,
      accent: manifest.theme.accent,
    },
    capabilities: AGORA_NODE_CAPABILITIES.map(id => ({id, label: manifest.capabilities[id].label, status: manifest.capabilities[id].status, route: manifest.capabilities[id].route})),
    links: {
      repository: manifest.links.repository,
      notice: manifest.links.notice,
      selfHosting: manifest.links.selfHosting,
    },
    governance: {
      model: manifest.governance.model,
      version: manifest.governance.version,
      scope: manifest.governance.scope,
      href: manifest.governance.href,
    },
    runtime: {
      boundaryVersion: manifest.runtime.boundaryVersion,
      supportedInstanceIds: [...manifest.runtime.supportedInstanceIds],
      databaseIsolation: manifest.runtime.databaseIsolation,
    },
    preservation: {
      publicKnowledge: manifest.preservation.publicKnowledge,
      portableExport: manifest.preservation.portableExport,
      personalData: manifest.preservation.personalData,
      notice: manifest.preservation.notice,
    },
    network: {
      automaticReplication: false,
      automaticFailover: false,
      endToEndEncryption: false,
      notice: 'Il motore locale per verificare e importare repliche del solo patrimonio pubblico è implementato e testato fra database separati. Trasporto automatico fra PC indipendenti, failover e cifratura end-to-end non sono attivati né collaudati.',
    },
  } as const;
}

export function instanceInfoResponse(request: Request): Response {
  const headers = {'cache-control': 'public, max-age=3600', 'content-type': 'application/json; charset=utf-8'};
  if (request.method !== 'GET') return Response.json({error: 'Method not allowed'}, {status: 405, headers: {...headers, allow: 'GET'}});
  const url = new URL(request.url);
  if ([...url.searchParams.keys()].length) return Response.json({error: 'Invalid request'}, {status: 400, headers});
  return Response.json(publicInstanceDescriptor(), {headers});
}
