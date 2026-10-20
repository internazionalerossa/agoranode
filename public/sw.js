/* Only a public offline screen and immutable assets are cached.
   No API response, account document, forum page, chat or user content is stored. */
const APP_CACHE='polisrossa-public-v1';
self.addEventListener('install',event=>{event.waitUntil(caches.open(APP_CACHE).then(cache=>cache.addAll(['/offline.html','/icons/app-192.png'])));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('polisrossa-public-')&&key!==APP_CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).catch(()=>caches.match('/offline.html').then(response=>response||new Response('Connessione assente. Riprova quando la rete torna disponibile.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}}))));return;
 }
 if(!url.pathname.startsWith('/assets/')&&!url.pathname.startsWith('/icons/'))return;
 event.respondWith(caches.open(APP_CACHE).then(async cache=>{
  const stored=await cache.match(request);if(stored)return stored;
  const response=await fetch(request);
  if(response.ok&&response.type==='basic'&&!/private|no-store/i.test(response.headers.get('cache-control')||'')){
   await cache.put(request,response.clone());const keys=await cache.keys();
   const assets=keys.filter(key=>new URL(key.url).pathname.startsWith('/assets/'));
   await Promise.all(assets.slice(0,Math.max(0,assets.length-64)).map(key=>cache.delete(key)));
  }
  return response;
 }));
});
