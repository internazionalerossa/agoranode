/**
 * Small, data-free contract shared by every AgoràNode instance.
 *
 * Capability entries are navigation metadata only.  Their feature modules and
 * catalogues stay behind the existing lazy imports instead of becoming part of
 * this eagerly imported manifest.
 */
export const AGORA_NODE_MANIFEST_VERSION = 1 as const;
export const AGORA_NODE_SCHEMA_ID = 'org.agoranode.instance.v1' as const;
export const AGORA_NODE_CAPABILITIES = [
  'news',
  'video',
  'library',
  'wiki',
  'storyline',
  'data',
  'community',
] as const;

export type AgoraNodeCapabilityId = (typeof AGORA_NODE_CAPABILITIES)[number];
export type AgoraNodeCapability = {
  label: string;
  status: 'implemented' | 'planned';
  route: string;
};

export type AgoraNodeManifest = {
  schema: typeof AGORA_NODE_SCHEMA_ID;
  schemaVersion: typeof AGORA_NODE_MANIFEST_VERSION;
  platform: {
    id: 'agora-node';
    name: 'AgoràNode';
    namespace: 'agoranode';
  };
  instance: {
    id: string;
    name: string;
    language: string;
    topic: string;
    description: string;
  };
  brand: {
    canonicalName: string;
    wordmarkPrefix: string;
    tagline: string;
  };
  theme: {
    background: `#${string}`;
    surface: `#${string}`;
    foreground: `#${string}`;
    accent: `#${string}`;
  };
  capabilities: Readonly<Record<AgoraNodeCapabilityId, AgoraNodeCapability>>;
  links: {
    repository: `https://${string}`;
    notice: `https://${string}`;
    selfHosting: `https://${string}`;
  };
  governance: {
    model: string;
    version: number;
    scope: 'instance';
    href: string;
  };
  runtime: {
    boundaryVersion: 1;
    supportedInstanceIds: readonly string[];
    databaseIsolation: 'one-database-per-instance';
  };
  preservation: {
    publicKnowledge: 'append-only-revisions';
    portableExport: true;
    personalData: 'erasable-by-data-subject';
    notice: string;
  };
};

const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, maximum = 500): value is string =>
  typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= maximum;
const localHref = (value: unknown): value is string =>
  text(value, 500) && value.startsWith('/') && !value.startsWith('//') && !/[\r\n\\]/.test(value);
const httpsHref = (value: unknown): value is string => {
  if (!text(value, 2048)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
};
const colour = (value: unknown): value is `#${string}` =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

/** Runtime validation for manifests received by tooling or future loaders. */
export function isAgoraNodeManifest(value: unknown): value is AgoraNodeManifest {
  if (!object(value) || value.schema !== AGORA_NODE_SCHEMA_ID || value.schemaVersion !== AGORA_NODE_MANIFEST_VERSION) return false;
  const platform = value.platform, instance = value.instance, brand = value.brand;
  const theme = value.theme, capabilities = value.capabilities, links = value.links, governance = value.governance, runtime = value.runtime, preservation = value.preservation;
  if (!object(platform) || platform.id !== 'agora-node' || platform.name !== 'AgoràNode' || platform.namespace !== 'agoranode') return false;
  if (!object(instance) || !text(instance.id, 64) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(instance.id) ||
      !text(instance.name, 120) || !text(instance.language, 20) || !/^[a-z]{2,3}(?:-[A-Za-z]{2,4}){0,2}$/.test(instance.language) ||
      !text(instance.topic, 240) || !text(instance.description, 500)) return false;
  if (!object(brand) || !text(brand.canonicalName, 120) || !text(brand.wordmarkPrefix, 80) || !text(brand.tagline, 240)) return false;
  if (!object(theme) || !colour(theme.background) || !colour(theme.surface) || !colour(theme.foreground) || !colour(theme.accent)) return false;
  if (!object(capabilities) || Object.keys(capabilities).length !== AGORA_NODE_CAPABILITIES.length) return false;
  for (const id of AGORA_NODE_CAPABILITIES) {
    const capability = capabilities[id];
    if (!object(capability) || Object.keys(capability).some(key => !['label', 'status', 'route'].includes(key)) ||
        !text(capability.label, 80) || !['implemented', 'planned'].includes(String(capability.status)) || !localHref(capability.route)) return false;
  }
  if (!object(links) || !httpsHref(links.repository) || !httpsHref(links.notice) || !httpsHref(links.selfHosting)) return false;
  if (!object(governance) || !text(governance.model, 120) || !Number.isSafeInteger(governance.version) || Number(governance.version) < 1 ||
      governance.scope !== 'instance' || !localHref(governance.href)) return false;
  if (!object(runtime) || runtime.boundaryVersion !== 1 || runtime.databaseIsolation !== 'one-database-per-instance' ||
      !Array.isArray(runtime.supportedInstanceIds) || runtime.supportedInstanceIds.length < 1 ||
      runtime.supportedInstanceIds.some(id => !text(id, 64) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) ||
      !runtime.supportedInstanceIds.includes(instance.id)) return false;
  if (!object(preservation) || preservation.publicKnowledge !== 'append-only-revisions' || preservation.portableExport !== true ||
      preservation.personalData !== 'erasable-by-data-subject' || !text(preservation.notice, 500)) return false;
  return true;
}
