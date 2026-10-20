/** Image requests are resolved from a configured source and a server-known article ID, never a visitor URL. */
export function publicPhotoUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol === "http:") url.protocol = "https:";
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") ||
      !/[a-z]/i.test(host) || !host.includes(".") || /[\[\]:]/.test(host) ||
      /(?:^|\.)(?:localhost|local|internal|invalid|test|onion)$/.test(host) || /^(?:0x[\da-f]+|\d+)\./i.test(host)) return null;
    return url;
  } catch { return null; }
}
export async function readLimited(response: Response, maxBytes: number, truncate = false): Promise<Uint8Array> {
  if (!truncate && Number(response.headers.get("content-length")) > maxBytes) { await response.body?.cancel(); throw new Error("Photo response too large"); }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty photo response");
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      if (length + value.length > maxBytes) {
        if (!truncate) throw new Error("Photo response too large");
        chunks.push(value.subarray(0, maxBytes - length)); length = maxBytes; break;
      }
      length += value.length; chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}
export async function fetchPublicPhotoResource(url: URL, signal: AbortSignal, headers: Record<string, string>, fetcher: typeof fetch = fetch, requiredHost?: string): Promise<Response> {
  let current = url;
  for (let hop = 0; hop < 3; hop++) {
    if (!publicPhotoUrl(current.href) || (requiredHost && current.hostname.replace(/^www\./, "") !== requiredHost)) throw new Error("Unsupported photo destination");
    const response = await fetcher(current.href, { signal, headers, redirect: "manual", credentials: "omit" });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location"); await response.body?.cancel();
    const next = location && publicPhotoUrl(new URL(location, current).href);
    if (!next) throw new Error("Unsafe photo redirect"); current = next;
  }
  throw new Error("Too many photo redirects");
}
const decode = (text: string) => text.replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'");
/** Read publisher image declarations only; never execute structured data or use organization logos. */
export function articleMetadataImages(html: string, articleUrl: string): string[] {
  const images: string[] = [];
  const add=(value:unknown)=>{
    if(typeof value!=='string'||!value.trim())return;
    try { const image=publicPhotoUrl(new URL(decode(value),articleUrl).href);
      if(image&&!/(?:^|[\/_-])(?:logo|favicon|placeholder)(?:[\/_\-.]|$)/i.test(image.pathname))images.push(image.href);
    }catch { /* An invalid declaration does not authorize a destination. */ }
  };
  const prefix=html.slice(0,300000).replace(/<!--[^]*?-->/g, "");
  const attrs=(tag:string)=>{const result:Record<string,string>={};for(const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))result[match[1].toLowerCase()]=decode(match[2]??match[3]??match[4]);return result;};
  const inert=prefix.replace(/<(script|style|template)\b[^>]*>[^]*?<\/\1\s*>/gi, "");
  for(const match of inert.matchAll(/<meta\b[^>]*>/gi)){
    const data=attrs(match[0]);
    if(/^(?:og:image(?::(?:url|secure_url))?|twitter:image(?::src)?)$/i.test(data.property??data.name??""))add(data.content);
  }
  for(const match of inert.matchAll(/<link\b[^>]*>/gi)){const data=attrs(match[0]);if(data.rel?.toLowerCase()==='image_src')add(data.href);}
  const imageValue=(value:unknown)=>{if(typeof value==='string')add(value);else if(Array.isArray(value))value.slice(0,8).forEach(imageValue);else if(value&&typeof value==='object'){const image=value as Record<string,unknown>;add(image.contentUrl??image.url);}};
  const visit=(value:unknown,depth=0)=>{
    if(depth>5||!value||typeof value!=='object')return;
    if(Array.isArray(value)){value.slice(0,30).forEach(item=>visit(item,depth+1));return;}
    const node=value as Record<string,unknown>,types=Array.isArray(node['@type'])?node['@type']:[node['@type']];
    if(types.some(type=>typeof type==='string'&&/^(?:https?:\/\/schema\.org\/)?(?:Article|NewsArticle|BlogPosting|ReportageNewsArticle|AnalysisNewsArticle|OpinionNewsArticle|ScholarlyArticle|VideoObject)$/i.test(type)))imageValue(node.image??node.thumbnailUrl);
    visit(node['@graph'],depth+1);visit(node.mainEntity,depth+1);
  };
  for(const match of prefix.matchAll(/<script\b([^>]*)>([^]*?)<\/script\s*>/gi)){
    if(attrs(match[1]).type?.toLowerCase()!=='application/ld+json'||match[2].length>150000)continue;
    try{visit(JSON.parse(match[2]));}catch { /* Malformed JSON-LD is ignored as text. */ }
  }
  return [...new Set(images)].slice(0,4);
}
