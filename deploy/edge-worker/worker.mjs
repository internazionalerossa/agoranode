const ALLOWED_METHODS=new Set(['GET','HEAD','POST','DELETE']);
const ALLOW_HEADER='GET, HEAD, POST, DELETE';
const HOP_BY_HOP_HEADERS=new Set([
 'connection',
 'keep-alive',
 'proxy-authenticate',
 'proxy-authorization',
 'proxy-connection',
 'te',
 'trailer',
 'transfer-encoding',
 'upgrade',
]);

function localResponse(request,status,message,headers={}){
 const responseHeaders=new Headers(headers);
 responseHeaders.set('cache-control','no-store');
 responseHeaders.set('content-type','text/plain; charset=utf-8');
 responseHeaders.set('x-content-type-options','nosniff');
 return new Response(request.method==='HEAD'?null:`${message}\n`,{status,headers:responseHeaders});
}

function publicHost(value){
 if(typeof value!=='string'||value!==value.trim())throw new Error('invalid public host');
 const normalized=value.toLowerCase();
 if(normalized.length<1||normalized.length>253||normalized.includes(':'))throw new Error('invalid public host');
 const labels=normalized.split('.');
 if(labels.length<2||labels.some(label=>!(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))))throw new Error('invalid public host');
 return normalized;
}

function upstreamOrigin(value){
 if(typeof value!=='string'||value!==value.trim())throw new Error('invalid upstream origin');
 const parsed=new URL(value);
 if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.pathname!=='/'||parsed.search||parsed.hash)throw new Error('invalid upstream origin');
 return parsed;
}

function edgeSecret(value){
 if(typeof value!=='string'||new TextEncoder().encode(value).length<32||value!==value.trim()||/[\r\n\0]/.test(value))throw new Error('invalid edge secret');
 return value;
}

function isIpv4(value){
 const parts=value.split('.');
 return parts.length===4&&parts.every(part=>/^(?:0|[1-9]\d{0,2})$/.test(part)&&Number(part)<=255);
}

function ipv6GroupCount(side){
 if(side==='')return 0;
 let count=0;
 for(const group of side.split(':')){
  if(group==='v4')count+=2;
  else if(/^[0-9a-f]{1,4}$/i.test(group))count+=1;
  else return -1;
 }
 return count;
}

function isIpv6(value){
 if(!value.includes(':')||value.includes('%')||!/^[0-9a-f:.]+$/i.test(value))return false;
 let address=value;
 if(address.includes('.')){
  const separator=address.lastIndexOf(':');
  if(separator<0||!isIpv4(address.slice(separator+1)))return false;
  address=`${address.slice(0,separator)}:v4`;
 }
 const compressed=address.includes('::');
 const sides=address.split('::');
 if(sides.length>(compressed?2:1))return false;
 if(!compressed&&(address.startsWith(':')||address.endsWith(':')))return false;
 const left=ipv6GroupCount(sides[0]);
 const right=ipv6GroupCount(sides[1]??'');
 if(left<0||right<0)return false;
 const count=left+right;
 return count>=0&&(compressed?count<8:count===8);
}

function clientIp(value){
 if(typeof value!=='string')throw new Error('invalid client ip');
 const normalized=value.trim();
 if(normalized!==value||normalized.length===0||normalized.length>45||(!isIpv4(normalized)&&!isIpv6(normalized)))throw new Error('invalid client ip');
 return normalized;
}

function connectionHeaderNames(headers){
 return (headers.get('connection')??'')
  .split(',')
  .map(value=>value.trim().toLowerCase())
  .filter(value=>/^[!#$%&'*+.^_`|~0-9a-z-]+$/.test(value));
}

function safeRequestHeaders(source,secret,ip){
 const headers=new Headers(source);
 const remove=new Set([...HOP_BY_HOP_HEADERS,...connectionHeaderNames(headers),'forwarded','host','x-real-ip','cf-connecting-ip']);
 for(const name of headers.keys()){
  const normalized=name.toLowerCase();
  if(remove.has(normalized)||normalized.startsWith('x-forwarded-')||normalized.startsWith('x-agoranode-'))remove.add(normalized);
 }
 for(const name of remove)headers.delete(name);
 headers.set('x-agoranode-edge-key',secret);
 headers.set('x-agoranode-client-ip',ip);
 return headers;
}

function safeResponse(response){
 const remove=new Set([...HOP_BY_HOP_HEADERS,...connectionHeaderNames(response.headers)]);
 for(const name of response.headers.keys())if(name.toLowerCase().startsWith('x-agoranode-'))remove.add(name);
 if([...remove].every(name=>!response.headers.has(name)))return response;
 const forwarded=new Response(response.body,response);
 for(const name of remove)forwarded.headers.delete(name);
 return forwarded;
}

export async function proxyRequest(request,env,fetchImpl=globalThis.fetch){
 let host;
 let origin;
 let secret;
 try{
  host=publicHost(env?.PUBLIC_HOST);
  origin=upstreamOrigin(env?.UPSTREAM_ORIGIN);
  secret=edgeSecret(env?.EDGE_SHARED_SECRET);
  if(typeof fetchImpl!=='function')throw new Error('fetch unavailable');
 }catch{
  return localResponse(request,503,'Service unavailable.');
 }

 let incoming;
 try{incoming=new URL(request.url);}catch{return localResponse(request,400,'Bad request.');}
 if(incoming.protocol!=='https:'||incoming.host.toLowerCase()!==host)return localResponse(request,421,'Misdirected request.');
 if(!ALLOWED_METHODS.has(request.method))return localResponse(request,405,'Method not allowed.',{allow:ALLOW_HEADER});
 if(request.headers.has('upgrade')||connectionHeaderNames(request.headers).includes('upgrade'))return localResponse(request,400,'Bad request.');

 let ip;
 try{ip=clientIp(request.headers.get('cf-connecting-ip'));}
 catch{return localResponse(request,400,'Bad request.');}

 const target=new URL(origin.href);
 target.pathname=incoming.pathname;
 target.search=incoming.search;

 try{
  const upstreamRequest=new Request(target.href,request);
  const headers=safeRequestHeaders(upstreamRequest.headers,secret,ip);
  for(const name of [...upstreamRequest.headers.keys()])upstreamRequest.headers.delete(name);
  for(const [name,value] of headers)upstreamRequest.headers.append(name,value);
  const response=await fetchImpl(upstreamRequest,{redirect:'manual'});
  if(!(response instanceof Response))throw new Error('invalid upstream response');
  return safeResponse(response);
 }catch{
  return localResponse(request,503,'Service unavailable.');
 }
}

export default {
 fetch(request,env){return proxyRequest(request,env);},
};
