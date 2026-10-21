export type SiteRoute =
  | {kind: 'platform'; canonicalPath: '/'}
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
 * `/` belongs to AgoràNode.  PolisRossa is the first instance and owns the
 * `/polisrossa` namespace.  Historic root links are retained as aliases so
 * bookmarks and already-shared history/data/forum links keep working.
 */
export function siteRouteFromUrl(raw: string): SiteRoute {
  const url = new URL(raw, 'https://site.invalid');
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (path === '/agoranode') return {kind: 'platform', canonicalPath: '/'};

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

