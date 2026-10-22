import test from 'node:test';
import assert from 'node:assert/strict';
import {AGORA_SOURCES,AGORA_SOURCE_IDS} from '../app/instances/agora-sources';
import {SOURCE_CATALOG} from '../app/data/catalog';
import {agoraFeedResponse} from '../server/agora-feed';
import {handleNodeFeedPreferences} from '../server/node-feed-preferences';
import {normaliseSourceChoices,feedPreferenceStorageKey,selectPreferredArticles} from '../app/lib/node-feed-preferences';
import type {SourceFetchResult} from '../app/lib/feed';

test('space feed catalogue is distinct from PolisRossa and the API forbids arbitrary remote URLs',async()=>{
 assert.ok(AGORA_SOURCES.some(s=>s.kind==='video'));
 assert.ok(AGORA_SOURCES.every(s=>s.id.startsWith('agora-')&&!SOURCE_CATALOG.some(p=>p.id===s.id)));
 let count=0;
 const loader=async(source:typeof AGORA_SOURCES[number]):Promise<SourceFetchResult>=>{
   count++;
   return {source,articles:[{id:'test-'+source.id,sourceId:source.id,sourceName:source.name,
     sourceHomepage:source.homepage,region:source.region,country:source.country,language:source.language,
     kind:source.kind,ideologies:[],title:'A test report',link:'https://example.org/'+source.id,publishedAt:'2026-10-22T12:00:00Z',
     author:null,excerpt:'News text',categories:[],topics:[],image:null,score:0}],
    status:{sourceId:source.id,name:source.name,ok:true,count:1,feedUrl:null,error:null,
      fetchedAt:'2026-10-22T12:00:00Z',cached:false}};
 };
 const url='https://example.test/api/spaces/agora/feed';
 assert.equal((await agoraFeedResponse(new Request(url+'?sourceIds=https://127.0.0.1/'),loader)).status,400);
 assert.equal((await agoraFeedResponse(new Request(url+'?sourceIds=agora-github,agora-github'),loader)).status,400);
 assert.equal((await agoraFeedResponse(new Request(url+'?unexpected=1'),loader)).status,400);
 assert.equal((await agoraFeedResponse(new Request(url,{method:'POST'}),loader)).status,405);
 assert.equal(count,0);
 const response=await agoraFeedResponse(new Request(url+'?sourceIds=agora-github'),loader);
 assert.equal(response.status,200);
 assert.equal((await response.json()).articles.length,1);
 assert.equal(count,1);
});
test('preferences are scoped to account and node, and validate every submitted source',async()=>{
 const rows=new Map<string,string>();
 const db={prepare(sql:string){return{
   bind(...values:unknown[]){return {
     async first<T>(){
       const key=String(values[0])+':'+String(values[1]);
       const result=rows.get(key);
       return (result===undefined?null:{sources_json:JSON.parse(result)}) as T|null;
     },
     async run(){
       if(!sql.includes('node_feed_preferences'))throw Error('bad table');
       rows.set(String(values[0])+':'+String(values[1]),String(values[2]));
     }
   };},
 };}};
 const request=(user:string|null,space:string,sourceIds?:unknown,headers?:Record<string,string>)=>
   handleNodeFeedPreferences(new Request('https://example.test/api/spaces/'+space+'/preferences',{
     method:sourceIds===undefined?'GET':'PUT',
     headers:{origin:'https://example.test','content-type':'application/json',...headers},
     body:sourceIds===undefined?undefined:JSON.stringify({sourceIds}),
   }),db,user,space,AGORA_SOURCE_IDS);
 assert.equal((await request(null,'agora')).status,401);
 assert.equal((await request('alice','agora',['agora-github'])).status,200);
 assert.deepEqual((await (await request('alice','agora')).json()).sourceIds,['agora-github']);
 assert.deepEqual((await (await request('bob','agora')).json()).sourceIds,[]);
 assert.deepEqual((await (await request('alice','polisrossa')).json()).sourceIds,[]);
 assert.equal((await request('alice','agora',['unknown'])).status,400);
 assert.equal((await request('alice','agora',['agora-github','agora-github'])).status,400);
 assert.equal((await request('alice','agora',[],{origin:'https://attacker.example'})).status,403);
 assert.deepEqual(normaliseSourceChoices(['agora-github','nope'],AGORA_SOURCE_IDS),['agora-github']);
 assert.equal(feedPreferenceStorageKey('agora'),'agoranode.feed-favourites.v1:agora');
 assert.throws(()=>feedPreferenceStorageKey('../x'));
 assert.equal(selectPreferredArticles([{sourceId:'agora-github'},{sourceId:'other'}],'favourites',new Set(['agora-github'])).length,1);
});
