/**
 * SPA entrypoints served as index.html by the production Node server.
 * Do not treat arbitrary paths as app routes: unknown paths must return 404.
 */
const APP_SHELL_PATHS = new Set([
  '/', '/read', '/account', '/agoranode', '/agoranode/',
  '/agora', '/agora/',
  '/polisrossa', '/polisrossa/', '/polisrossa/read', '/polisrossa/account',
]);

export function isAppShellPath(pathname: string): boolean {
  return APP_SHELL_PATHS.has(pathname) || /^\/n\/[a-z][a-z0-9-]{2,47}\/?$/.test(pathname);
}

export type SiteRoute =
  | {kind: 'platform'; canonicalPath: '/'}
  | {kind: 'agora'; canonicalPath: string}
  | {kind: 'thematic-node'; canonicalPath: string; spaceId: string}
  | {kind: 'instance'; canonicalPath: string}
  | {kind: 'reader'; canonicalPath: string}
  | {kind: 'account'; canonicalPath: string};

const POLISROSSA_QUERY_KEYS = new Set([
  'view',
  'periodo',
  'storia',
  'percorso',
  'indicatore',
  'evento',
  'persona',
  'paesi',
  'dal',
  'al',
  'scala',
  'stanza',
  'proposal',
  'nuova',
]);

function withLocation(url: URL, pathname: string): string {
  return `${pathname}${url.search}${url.hash}`;
}

/**
 * Resolve the public product boundary before React is mounted.
 *
 * `/` is the node directory, `/agora` is the Agorà node, and `/polisrossa`
 * is the PolisRossa node. Historic root links remain PolisRossa aliases.
 */
export function siteRouteFromUrl(raw: string): SiteRoute {
  const url = new URL(raw, 'https://site.invalid');
  const path = url.pathname.replace(/\/+$/, '') || '/';

  const publicSpace = /^\/n\/([a-z][a-z0-9-]{2,47})$/.exec(path);
  if(publicSpace) return {kind:'thematic-node',spaceId:publicSpace[1],canonicalPath:withLocation(url,'/n/'+publicSpace[1])};

  if (path === '/agoranode') return {kind: 'platform', canonicalPath: '/'};
  if (path === '/agora') return {kind: 'agora', canonicalPath: withLocation(url, '/agora')};

  if (path === '/polisrossa/read') {
    return {kind: 'reader', canonicalPath: withLocation(url, '/polisrossa/read')};
  }
  if (path === '/polisrossa/account') {
    return {kind: 'account', canonicalPath: withLocation(url, '/polisrossa/account')};
  }
  if (path === '/polisrossa') {
    if (url.searchParams.get('view') === 'custodia') return {kind: 'platform', canonicalPath: '/'};
    return {kind: 'instance', canonicalPath: withLocation(url, '/polisrossa')};
  }

  if (path === '/read') return {kind: 'reader', canonicalPath: withLocation(url, '/polisrossa/read')};
  if (path === '/account') return {kind: 'account', canonicalPath: withLocation(url, '/polisrossa/account')};

  if (path === '/') {
    if (url.searchParams.get('view') === 'custodia') return {kind: 'platform', canonicalPath: '/'};
    const isHistoricPolisRossaLink = [...url.searchParams.keys()].some(key => POLISROSSA_QUERY_KEYS.has(key));
    if (isHistoricPolisRossaLink || url.hash === '#osservatorio-sei-ore') {
      return {kind: 'instance', canonicalPath: withLocation(url, '/polisrossa')};
    }
    return {kind: 'platform', canonicalPath: '/'};
  }

  return {kind: 'platform', canonicalPath: '/'};
}

export function canonicalizeSiteRoute(route: SiteRoute, current: string): void {
  if (typeof window === 'undefined') return;
  const url = new URL(current, window.location.origin);
  const visible = `${url.pathname}${url.search}${url.hash}`;
  if (visible !== route.canonicalPath) window.history.replaceState(window.history.state, '', route.canonicalPath);
}
