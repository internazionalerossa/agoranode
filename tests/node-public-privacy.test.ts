import {requestPublicTranslation} from '../app/lib/browser-translation';
import test from 'node:test';
import assert from 'node:assert/strict';
import {GET as thumbnail} from '../app/api/video-image/route';
import {VIDEO_CHANNELS} from '../app/data/video-catalog';
import {clearPublicDeviceCache,PUBLIC_DEVICE_KEYS} from '../app/lib/device-privacy';
import {viewFromUrl,viewUrl} from '../app/lib/view-navigation';
const channel=VIDEO_CHANNELS.find(item=>item.platform==='youtube')!.id;
const request=(id:string,extra='',headers:Record<string,string>={})=>new Request('https://site.test/api/video-image?'+new URLSearchParams({channel,id})+extra,{headers});
test('public thumbnails omit visitor credentials and return only bounded image bytes',async()=>{
 const visited:string[]=[];
 const fake:typeof fetch=async(input,init)=>{visited.push(String(input));assert.equal(new URL(String(input)).hostname,'i.ytimg.com');const headers=new Headers(init?.headers);assert.equal(headers.get('cookie'),null);assert.equal(headers.get('x-forwarded-for'),null);assert.equal(init?.credentials,'omit');return new Response(new Uint8Array([1,2,3]),{headers:{'content-type':'image/jpeg','set-cookie':'tracking=bad'}});};
 const response=await thumbnail(request('privacy0001','',{cookie:'private-session=secret','x-forwarded-for':'192.0.2.1'}),fake);
 assert.equal(response.status,200);assert.equal(response.headers.get('set-cookie'),null);assert.equal(response.headers.get('content-type'),'image/jpeg');assert.equal((await response.arrayBuffer()).byteLength,3);assert.equal(visited.length,1);
 const cached=await thumbnail(request('privacy0001'),async()=>{throw Error('Cache miss');});assert.equal(cached.status,200);
});
test('thumbnail proxy rejects supplied URLs, invalid ids, foreign redirects and HTML',async()=>{
 const never:typeof fetch=async()=>{throw Error('Unexpected network request');};
 for(const value of [request('../secret'),request('privacy0002','&url=https://evil.test'),request('privacy0002','&channel=duplicate')])assert.equal((await thumbnail(value,never)).status,400);
 const destinations:string[]=[];
 const redirect:typeof fetch=async input=>{destinations.push(String(input));return new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}});};
 assert.equal((await thumbnail(request('privacy0003'),redirect)).status,404);assert.ok(destinations.every(url=>new URL(url).hostname==='i.ytimg.com'));
 assert.equal((await thumbnail(request('privacy0004'),async()=>new Response('<script>bad</script>',{headers:{'content-type':'text/html'}}))).status,404);
 assert.equal((await thumbnail(new Request('https://site.test/api/video-image',{method:'POST'}),never)).status,405);
});
test('device cleanup removes only public copies and preserves unsynced private readings',async()=>{
 const values=new Map<string,string>([...PUBLIC_DEVICE_KEYS.map(key=>[key,'cache'] as [string,string]),['rassegna-rossa.saved-articles','private'],['rassegna-rossa.cloud-outbox:owner','pending'],['rassegna-rossa.language-preferences','chosen']]);
 const removed:string[]=[];
 await clearPublicDeviceCache({removeItem:key=>{values.delete(key);}},{keys:async()=>['polisrossa-public-v1','unrelated-app'],delete:async key=>{removed.push(key);return true;}});
 assert.equal(values.size,3);assert.equal(values.get('rassegna-rossa.cloud-outbox:owner'),'pending');assert.deepEqual(removed,['polisrossa-public-v1']);
});
test('legal destinations survive direct links and navigation from a selected discussion',()=>{
 assert.equal(viewFromUrl('https://site.test/?view=condizioni'),'condizioni');assert.equal(viewUrl('/?view=partecipa&proposal=selected','condizioni'),'/polisrossa?view=condizioni');assert.equal(viewFromUrl('/?view=privacy'),'privacy');
});

test('translation failures preserve the same-origin boundary instead of contacting providers from the browser',async()=>{
 const destinations:string[]=[];
 const fetcher:typeof fetch=async input=>{destinations.push(String(input));return Response.json({error:'unavailable'},{status:503});};
 await assert.rejects(requestPublicTranslation('Public title','en','it',fetcher));
 assert.deepEqual(destinations,['/api/translate']);
 assert.equal(await requestPublicTranslation('Public title','en','it',async input=>{assert.equal(input,'/api/translate');return Response.json({translatedText:'Titolo pubblico'});}), 'Titolo pubblico');
});
