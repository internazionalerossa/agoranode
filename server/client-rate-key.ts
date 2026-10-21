import {createHmac} from 'node:crypto';
import {getIPFromHeader} from '@better-auth/core/utils/ip';

export const TRUSTED_LOCAL_PROXY_RANGES=['10.0.0.0/8','172.16.0.0/12','192.168.0.0/16','127.0.0.0/8','::1/128','fd00::/8'];

/**
 * Caddy is the only container that can reach the application. It replaces or,
 * for the loopback Funnel hop, validates X-Forwarded-For before proxying. Walk
 * the chain from the trusted end, collapse IPv6 clients to /64, then persist
 * only a keyed digest used by the authentication limiter.
 */
export function clientRateKey(headers:Headers,secret:string){
 const forwarded=headers.get('x-forwarded-for')??'';
 const address=getIPFromHeader(forwarded,{trustedProxies:TRUSTED_LOCAL_PROXY_RANGES,ipv6Subnet:64})??'unresolved';
 return createHmac('sha256',secret).update(address).digest('hex');
}
