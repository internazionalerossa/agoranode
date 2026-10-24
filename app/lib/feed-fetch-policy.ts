/**
 * Narrow, browser-compatible network destination policy for source fetching.
 * Catalogued feed endpoints are explicitly operator-controlled. Dynamically
 * discovered feeds and redirects may not expand the origin hostname.
 *
 * This blocks unsafe URL literals but is not a replacement for an egress
 * firewall or connection-time DNS/IP validation against DNS rebinding.
 */
export function publicFeedUrl(raw:string, base?:string):URL|null {
 try {
  if(raw.length>2048)return null;
  const url=new URL(raw,base);
  const host=url.hostname.toLowerCase().replace(/\.$/,'');
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||
    (url.port&&url.port!==(url.protocol==='http:'?'80':'443'))||
    host.length>253||!host.includes('.')||/^\[|\]$/.test(host)||
    !/^[a-z0-9.-]+$/.test(host)||host.split('.').some(s=>!s||s.length>63||
      s.startsWith('-')||s.endsWith('-'))||
    !/[a-z]/.test(host.split('.').at(-1)??'')||
    /(?:^|\.)(?:localhost|local|internal|invalid|test|onion)$/.test(host)||
    /^\d/.test(host)||url.hash) return null;
  return url;
 } catch{return null;}
}
export function publisherHost(raw:string):string|null{
 const url=publicFeedUrl(raw);
 return url?url.hostname.toLowerCase().replace(/^www\./,'').replace(/\.$/,''):null;
}
export function publisherFeedUrl(raw:string,homepage:string):string|null {
 const next=publicFeedUrl(raw,homepage);
 return next&&publisherHost(next.href)===publisherHost(homepage)?next.href:null;
}
export async function fetchPublicFeedResponse(
 raw:string, init:RequestInit={}, fetcher:typeof fetch=fetch,
):Promise<Response>{
 const start=publicFeedUrl(raw);
 if(!start)throw Error('Feed destination is not public');
 const allowedHost=publisherHost(start.href);
 let url=start;
 for(let hop=0;hop<=3;hop++){
  const response=await fetcher(url.href,{...init,redirect:'manual',credentials:'omit'});
  if(![301,302,303,307,308].includes(response.status))return response;
  const location=response.headers.get('location');
  await response.body?.cancel().catch(()=>{});
  if(hop===3||!location)throw Error('Feed redirect limit exceeded');
  const next=publicFeedUrl(location,url.href);
  if(!next||publisherHost(next.href)!==allowedHost||
     (url.protocol==='https:'&&next.protocol==='http:'))
    throw Error('Feed redirect outside approved publisher host');
  url=next;
 }
 throw Error('Feed redirect limit exceeded');
}
