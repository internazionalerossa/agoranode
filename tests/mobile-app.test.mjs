import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {brandManifestResponse} from '../app/lib/brand-manifest.ts';
import {INSTANCE_MANIFEST} from '../app/lib/instance.ts';
const root=new URL('../',import.meta.url);
test('static and localized manifests expose real Android and iOS launcher assets with a stable application identity',async()=>{
 const manifest=JSON.parse(await readFile(new URL('public/manifest.webmanifest',root),'utf8'));
 const localized=await brandManifestResponse(new Request('https://example.test/api/manifest?language=en')).json();
 const html=await readFile(new URL('web/index.html',root),'utf8');assert.match(html,/rel="manifest" href="\/api\/manifest\?language=it"/);
 assert.equal(manifest.name,INSTANCE_MANIFEST.brand.canonicalName);assert.equal(manifest.description,INSTANCE_MANIFEST.instance.description);assert.equal(manifest.background_color,INSTANCE_MANIFEST.theme.background);assert.equal(manifest.theme_color,INSTANCE_MANIFEST.theme.background);
 for(const item of [manifest,localized]){assert.equal(item.id,'/');assert.equal(item.start_url,'/');assert.equal(item.display,'standalone');for(const size of [192,512])assert.ok(item.icons.some(icon=>icon.sizes===`${size}x${size}`&&icon.type==='image/png'));assert.ok(item.icons.some(icon=>icon.purpose==='maskable'));}
 for(const [path,size] of [['icons/app-192.png',192],['icons/app-512.png',512],['icons/app-maskable-512.png',512],['apple-touch-icon.png',180]]){const png=await readFile(new URL('public/'+path,root));assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);}
});
async function worker(){
 const handlers={},entries=new Map(),calls=[];
 const cache={addAll:async paths=>{for(const path of paths)entries.set('https://example.test'+path,new Response('public offline screen'));},match:async request=>entries.get(typeof request==='string'?'https://example.test'+request:request.url)?.clone(),put:async(request,response)=>entries.set(request.url,response),keys:async()=>[...entries.keys()].map(url=>({url})),delete:async request=>entries.delete(request.url)};
 const caches={open:async()=>cache,keys:async()=>['another-app-cache','polisrossa-public-old'],delete:async key=>{calls.push(['delete',key]);},match:cache.match};
 const context={URL,Response,caches,self:{location:{origin:'https://example.test'},clients:{claim:async()=>{}},addEventListener:(name,callback)=>handlers[name]=callback},fetch:async request=>{calls.push(['fetch',request.url]);throw Error('offline');}};
 vm.runInNewContext(await readFile(new URL('public/sw.js',root),'utf8'),context);
 return {handlers,calls,entries,context,run:async(name,event={})=>{let pending;handlers[name]({...event,waitUntil:promise=>pending=promise,respondWith:promise=>pending=promise});return pending?await pending:undefined;}};
}
test('offline support never intercepts account APIs, chat/forum requests, writes or third-party content',async()=>{
 const w=await worker();await w.run('install');
 for(const request of [{url:'https://example.test/api/auth',method:'GET',mode:'cors'},{url:'https://example.test/api/community/chat',method:'GET',mode:'cors'},{url:'https://example.test/api/community',method:'POST',mode:'cors'},{url:'https://publisher.test/photo.png',method:'GET',mode:'cors'}])assert.equal(await w.run('fetch',{request}),undefined);
 assert.equal(w.calls.length,0);assert.deepEqual([...w.entries.keys()].sort(),['https://example.test/icons/app-192.png','https://example.test/offline.html']);
});
test('offline navigation falls back to a public screen without retaining the account document; activation deletes only owned caches',async()=>{
 const w=await worker();await w.run('install');const response=await w.run('fetch',{request:{url:'https://example.test/account',method:'GET',mode:'navigate'}});assert.equal(await response.text(),'public offline screen');assert.equal(w.entries.has('https://example.test/account'),false);await w.run('activate');assert.deepEqual(w.calls.filter(call=>call[0]==='delete'),[['delete','polisrossa-public-old']]);
});
test('public immutable assets are reusable while private asset responses never enter the app cache',async()=>{
 const w=await worker();let downloads=0;w.context.fetch=async()=>{downloads++;const response=new Response('bundle',{headers:{'cache-control':'public, max-age=31536000, immutable'}});Object.defineProperty(response,'type',{value:'basic'});return response;};
 const request={url:'https://example.test/assets/app.js',method:'GET',mode:'cors'};await w.run('fetch',{request});await w.run('fetch',{request});assert.equal(downloads,1);
 w.context.fetch=async()=>{const response=new Response('private',{headers:{'cache-control':'private, no-store'}});Object.defineProperty(response,'type',{value:'basic'});return response;};await w.run('fetch',{request:{...request,url:'https://example.test/assets/private.js'}});assert.equal(w.entries.has('https://example.test/assets/private.js'),false);
});
