import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import worker,{proxyRequest} from '../deploy/edge-worker/worker.mjs';

const env={
 PUBLIC_HOST:'polisrossa.agoranode.workers.dev',
 UPSTREAM_ORIGIN:'https://private-origin.example/',
 EDGE_SHARED_SECRET:'test-edge-secret-32-bytes-minimum-value',
};

test('the deploy template declares the edge key as a secret and contains no credential value',async()=>{
 const raw=await readFile(new URL('../deploy/edge-worker/wrangler.example.jsonc',import.meta.url),'utf8');
 const config=JSON.parse(raw);
 assert.deepEqual(config.secrets?.required,['EDGE_SHARED_SECRET']);
 assert.equal(config.vars?.PUBLIC_HOST,env.PUBLIC_HOST);
 assert.equal(config.vars?.UPSTREAM_ORIGIN,'https://polisrossa.tail37128d.ts.net/');
 assert.equal(Object.hasOwn(config.vars??{},'EDGE_SHARED_SECRET'),false);
 assert.equal(raw.includes(env.EDGE_SHARED_SECRET),false);
});

function incoming(path='/',init={}){
 const headers=new Headers(init.headers);
 if(!headers.has('cf-connecting-ip'))headers.set('cf-connecting-ip','198.51.100.23');
 return new Request(`https://${env.PUBLIC_HOST}${path}`,{...init,headers});
}

test('edge worker module does not mistake the execution context for a fetch implementation',async()=>{
 const originalFetch=globalThis.fetch;
 try{
  globalThis.fetch=async()=>new Response('module response');
  const response=await worker.fetch(incoming('/'),env,{waitUntil(){}});
  assert.equal(response.status,200);
  assert.equal(await response.text(),'module response');
 }finally{globalThis.fetch=originalFetch;}
});

test('forwards only to the configured origin and preserves path, query and body',async()=>{
 let observed;
 const request=incoming('/api/account%2Fnotes?next=https%3A%2F%2Fevil.example%2Fx',{method:'POST',headers:{'content-type':'application/json'},body:'{"note":"ciao"}'});
 const response=await proxyRequest(request,env,async(upstream,init)=>{
  observed={upstream,init,body:await upstream.text()};
  return new Response('saved',{status:201});
 });
 assert.equal(response.status,201);
 assert.equal(await response.text(),'saved');
 assert.equal(observed.upstream.url,'https://private-origin.example/api/account%2Fnotes?next=https%3A%2F%2Fevil.example%2Fx');
 assert.equal(observed.upstream.method,'POST');
 assert.equal(observed.body,'{"note":"ciao"}');
 assert.equal(observed.init.redirect,'manual');
});

test('rejects a different public host without contacting the origin',async()=>{
 let called=false;
 const response=await proxyRequest(new Request('https://attacker.example/',{headers:{'cf-connecting-ip':'198.51.100.23'}}),env,async()=>{called=true;});
 assert.equal(response.status,421);
 assert.equal(response.headers.get('cache-control'),'no-store');
 assert.equal(called,false);
});

test('allows GET, HEAD, POST and DELETE and rejects every other method including OPTIONS',async()=>{
 for(const method of ['GET','HEAD','POST','DELETE']){
  const response=await proxyRequest(incoming('/',{method}),env,async request=>new Response(null,{status:request.method==='DELETE'?204:200}));
  assert.equal(response.status,method==='DELETE'?204:200);
 }
 for(const method of ['OPTIONS','PUT','PATCH']){
  const response=await proxyRequest(incoming('/',{method}),env,async()=>{throw new Error('must not run');});
  assert.equal(response.status,405);
  assert.equal(response.headers.get('allow'),'GET, HEAD, POST, DELETE');
 }
});

test('rejects upgrade requests',async()=>{
 for(const headers of [{upgrade:'websocket'},{connection:'keep-alive, Upgrade'}]){
  const response=await proxyRequest(incoming('/',{headers}),env,async()=>{throw new Error('must not run');});
  assert.equal(response.status,400);
 }
});

test('removes forwarding and internal headers and installs validated edge headers',async()=>{
 let forwarded;
 const response=await proxyRequest(incoming('/private',{headers:{
  authorization:'Bearer account-session',
  connection:'keep-alive, x-remove-me',
  host:'spoofed.example',
  forwarded:'for=203.0.113.8',
  'x-forwarded-for':'203.0.113.8',
  'x-forwarded-host':'attacker.example',
  'x-forwarded-proto':'http',
  'x-real-ip':'203.0.113.8',
  'x-agoranode-edge-key':'attacker',
  'x-agoranode-client-ip':'203.0.113.8',
  'x-agoranode-anything':'attacker',
  'x-remove-me':'remove this connection-specific header',
 }}),env,async request=>{forwarded=request;return new Response('ok');});
 assert.equal(response.status,200);
 assert.equal(forwarded.headers.get('authorization'),'Bearer account-session');
 for(const name of ['connection','forwarded','host','x-forwarded-for','x-forwarded-host','x-forwarded-proto','x-real-ip','cf-connecting-ip','x-agoranode-anything','x-remove-me'])assert.equal(forwarded.headers.has(name),false,name);
 assert.equal(forwarded.headers.get('x-agoranode-edge-key'),env.EDGE_SHARED_SECRET);
 assert.equal(forwarded.headers.get('x-agoranode-client-ip'),'198.51.100.23');
});

test('accepts validated IPv6 and rejects malformed client addresses',async()=>{
 let forwarded;
 const good=await proxyRequest(incoming('/',{headers:{'cf-connecting-ip':'2001:db8::17'}}),env,async request=>{forwarded=request;return new Response('ok');});
 assert.equal(good.status,200);
 assert.equal(forwarded.headers.get('x-agoranode-client-ip'),'2001:db8::17');
 for(const value of ['198.51.100.23, 203.0.113.4','999.1.1.1','2001:::17','unknown']){
  let called=false;
  const response=await proxyRequest(incoming('/',{headers:{'cf-connecting-ip':value}}),env,async()=>{called=true;});
  assert.equal(response.status,400,value);
  assert.equal(called,false,value);
 }
});

test('returns redirects without following or rewriting them',async()=>{
 const response=await proxyRequest(incoming('/login'),env,async(_request,init)=>{
  assert.equal(init.redirect,'manual');
  return new Response(null,{status:302,headers:{location:'https://polisrossa.agoranode.workers.dev/account'}});
 });
 assert.equal(response.status,302);
 assert.equal(response.headers.get('location'),'https://polisrossa.agoranode.workers.dev/account');
});

test('preserves multiple Set-Cookie fields while removing internal response headers',async()=>{
 const headers=new Headers();
 headers.append('set-cookie','session=one; Path=/; HttpOnly; Secure');
 headers.append('set-cookie','csrf=two; Path=/; Secure; SameSite=Lax');
 headers.set('x-agoranode-edge-key','must-not-leak');
 const response=await proxyRequest(incoming('/account'),env,async()=>new Response('ok',{headers}));
 assert.equal(response.headers.has('x-agoranode-edge-key'),false);
 assert.deepEqual(response.headers.getSetCookie(),[
  'session=one; Path=/; HttpOnly; Secure',
  'csrf=two; Path=/; Secure; SameSite=Lax',
 ]);
});

test('uses a generic no-store 503 for invalid configuration and upstream failures',async()=>{
 for(const testCase of [
  {environment:{...env,UPSTREAM_ORIGIN:'https://private-origin.example/path'},fetcher:async()=>new Response('never')},
  {environment:{...env,EDGE_SHARED_SECRET:'too-short'},fetcher:async()=>new Response('never')},
  {environment:env,fetcher:async()=>{throw new Error('private origin name and details');}},
 ]){
  const response=await proxyRequest(incoming('/'),testCase.environment,testCase.fetcher);
  assert.equal(response.status,503);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(await response.text(),'Service unavailable.\n');
 }
});
