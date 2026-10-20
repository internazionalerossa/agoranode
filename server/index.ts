import {socialIdentityEndpoint,verifiedSocialIdentity,allowedIdentityCallback} from './social-identity';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Readable} from 'node:stream';
import {serviceInfoResponse} from '../app/lib/service-info';
import {configuration} from './config';
import {createPool,connections} from './pool';
import {PostgresDatabase} from './database';
import {createAuth,authSession,accountEndpoint} from './auth';
import {liveChat} from './live-chat';
import {api,privatePaths} from './api';
const config=configuration(),pool=createPool(config.connectionString),db=new PostgresDatabase(connections(pool));
const {auth,settle}=createAuth(pool,config),root=resolve(dirname(fileURLToPath(import.meta.url)),'public');
const jobs=new Set<Promise<unknown>>();
const background=(promise:Promise<unknown>)=>{const job=promise.catch(()=>{}).finally(()=>jobs.delete(job));jobs.add(job);};
const types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'};
async function staticResponse(pathname:string){
 let decoded:string;try{decoded=decodeURIComponent(pathname);}catch{return new Response('Not found',{status:404});}
 if(decoded.includes('\0')||decoded.includes('\\'))return new Response('Not found',{status:404});
 const filename=['/','/read','/account'].includes(decoded)?resolve(root,'index.html'):resolve(root,'.'+decoded);
 if(!filename.startsWith(root+sep))return new Response('Not found',{status:404});
 try{if(!(await stat(filename)).isFile())throw Error();return new Response(await readFile(filename),{headers:{'content-type':types[extname(filename)]??'application/octet-stream','cache-control':filename.endsWith('index.html')||decoded==='/sw.js'?'no-cache':decoded.startsWith('/assets/')?'public, max-age=31536000, immutable':'public, max-age=3600'}});}catch{return new Response('Not found',{status:404});}
}
const server=createServer({maxHeaderSize:16384,requestTimeout:30000,headersTimeout:15000},async(incoming,outgoing)=>{
 try{
  const method=incoming.method??'GET',url=new URL(incoming.url??'/',config.origin);
  if(url.origin!==config.origin){outgoing.writeHead(400).end();return;}
  let body:Uint8Array|undefined;
  if(!['GET','HEAD'].includes(method)){const chunks:Buffer[]=[];let bytes=0;for await(const chunk of incoming){bytes+=chunk.length;if(bytes>(url.pathname==='/api/community/chat'?2900000:160000)){outgoing.writeHead(413).end();return;}chunks.push(chunk);}body=Buffer.concat(chunks);}
  const headers=new Headers();for(const [key,value]of Object.entries(incoming.headers))if(value)headers.set(key,Array.isArray(value)?value.join(','):value);
  // Identity headers are never consulted. The canonical origin is configuration, never forwarded host input.
  const request=new Request(url,{method,headers,body:body as BodyInit|undefined});
  let response:Response;
  if(url.pathname==='/api/service-info')response=serviceInfoResponse(request,config.operator,config.registrationOpen,config.forumOpen,config.mirror);
  else if(url.pathname==='/healthz'){
   try{await pool.query('SELECT 1');response=Response.json({ok:true},{headers:{'cache-control':'no-store'}});}catch{response=Response.json({ok:false},{status:503,headers:{'cache-control':'no-store'}});}
  }else if(config.mirror&&(url.pathname==='/api/auth'||url.pathname.startsWith('/api/identity/')||url.pathname==='/api/community/identity'||privatePaths.has(url.pathname)))response=Response.json({configured:false,authenticated:false,registrationOpen:false,error:'Questa copia pubblica non ospita account o dati privati.'},{status:url.pathname==='/api/auth'&&method==='GET'?200:403,headers:{'cache-control':'private, no-store'}});
  else if(url.pathname==='/api/auth')response=await accountEndpoint(auth,request,connections(pool),config.registrationOpen,config);
  else if(url.pathname==='/api/community/identity')response=await socialIdentityEndpoint(auth,request,config);
  else if(url.pathname.startsWith('/api/identity/')){
   const allowed=method==='GET'&&((config.mailTransport!=='none'&&(url.pathname==='/api/identity/verify-email'||url.pathname.startsWith('/api/identity/reset-password/')))||allowedIdentityCallback(url.pathname,method,config));
   response=allowed?await auth.handler(request):new Response('Not found',{status:404});
  }else if(url.pathname.startsWith('/api/')){
   if(privatePaths.has(url.pathname)){const session=await authSession(auth,request);let socialIdentity=null;
    if(session.user&&config.forumOpen&&url.pathname==='/api/community/forum'&&method==='POST'&&request.headers.get('origin')===config.origin&&request.headers.get('sec-fetch-site')!=='cross-site'){let action;try{action=(await request.clone().json()).action;}catch{}if(action==='apply')socialIdentity=await verifiedSocialIdentity(auth,request,config);}
    response=session.finish(await api(request,db,session.user?.id??null,config.bootstrapHash,background,config.forumOpen,socialIdentity));}
   else response=await api(request,db,null,config.bootstrapHash,background,config.forumOpen);
  }else response=['GET','HEAD'].includes(method)?await staticResponse(url.pathname):new Response('Method not allowed',{status:405});
  outgoing.setHeader('x-content-type-options','nosniff');outgoing.setHeader('referrer-policy','no-referrer');outgoing.setHeader('x-frame-options','DENY');outgoing.setHeader('permissions-policy','camera=(), microphone=(), geolocation=()');outgoing.setHeader('strict-transport-security','max-age=31536000');
  for(const [key,value]of response.headers)if(key!=='set-cookie')outgoing.setHeader(key,value);
  const cookies=response.headers.getSetCookie();if(cookies.length)outgoing.setHeader('set-cookie',cookies);
  outgoing.statusCode=response.status;
  if(method==='HEAD'||!response.body)outgoing.end();else Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]).on('error',()=>outgoing.destroy()).pipe(outgoing);
 }catch{if(!outgoing.headersSent){outgoing.writeHead(503,{'content-type':'application/json','cache-control':'private, no-store'}).end(JSON.stringify({error:'Servizio temporaneamente non disponibile.'}));}else outgoing.destroy();}
});
// Clear expired chat memory even when nobody is polling; no persistence on shutdown.
const chatCleanup=setInterval(()=>liveChat.sweep(),1000);chatCleanup.unref();
server.listen(config.port,'0.0.0.0',()=>console.info('PolisRossa server ready'));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{server.close(()=>{void Promise.allSettled([...jobs,settle()]).then(()=>pool.end()).then(()=>process.exit(0));});setTimeout(()=>process.exit(1),20000).unref();});
