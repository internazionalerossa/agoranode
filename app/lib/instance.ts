import {POLISROSSA_MANIFEST} from '../instances/polisrossa';

/** Stable facade used by browser, server and build-time entry points. */
export const INSTANCE_MANIFEST = POLISROSSA_MANIFEST;
export const INSTANCE_NAME = INSTANCE_MANIFEST.instance.name;
export const INSTANCE_PLATFORM_NAME = INSTANCE_MANIFEST.platform.name;

export function instanceUserAgent(purpose?: string, browserCompatible = false): string {
  const token = `${INSTANCE_NAME}/1.0`;
  const product = browserCompatible
    ? `Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) ${token}`
    : token;
  return purpose ? `${product} (${purpose})` : product;
}
