import test from 'node:test';
import assert from 'node:assert/strict';
import {handleAgoraForum} from '../server/agora-forum';
import type {PostgresDatabase} from '../server/database';

function database(){
 const calls:Array<{sql:string;args:unknown[]}>= [];
 const db={prepare(sql:string){
  return {bind(...args:unknown[]){
   calls.push({sql,args});
   return {
    all:async()=>({results:[{id:'00000000-0000-4000-8000-000000000001',author_alias:'Lettrice',
      title:'Discussione tecnica',body:'Una proposta descritta nel dettaglio per migliorare il progetto.',created_ms:1800000000000,
      author_id:'secret-private-id'}]}),
    first:async()=>sql.includes('COUNT(*)')?{count:0}: {id:'00000000-0000-4000-8000-000000000002'},
   };
  }};
 }} as unknown as PostgresDatabase;
 return {db,calls};
}
function post(body:unknown,origin='https://example.test'){
 return new Request('https://example.test/api/agora/forum',{method:'POST',headers:{
  'content-type':'application/json',origin},body:JSON.stringify(body)});
}
const input={alias:'Lettrice',title:'Una discussione seria',
 body:'Una proposta concreta e verificabile sulle fonti tecniche del progetto.'};

test('visitors can read public Agora discussions, never account identifiers',async()=>{
 const {db,calls}=database();
 const response=await handleAgoraForum(new Request('https://example.test/api/agora/forum'),db,null);
 assert.equal(response.status,200);
 const body=await response.json();
 assert.equal(body.spaceId,'agora');
 assert.equal(body.publication,'discussion-only');
 assert.equal(body.topics[0].author,'Lettrice');
 assert.ok(!JSON.stringify(body).includes('secret-private-id'));
 assert.equal(calls[0].args[0],'agora');
 assert.equal((await handleAgoraForum(new Request('https://example.test/api/agora/forum?offset=-1'),db,null)).status,400);
});
test('creating a discussion requires an authenticated account and same origin',async()=>{
 const {db,calls}=database();
 assert.equal((await handleAgoraForum(post(input),db,null)).status,401);
 assert.equal((await handleAgoraForum(post(input,'https://attacker.test'),db,'account-1')).status,403);
 assert.equal((await handleAgoraForum(post({...input,role:'pr3'}),db,'account-1')).status,400);
 assert.equal((await handleAgoraForum(post({...input,body:'short'}),db,'account-1')).status,400);
 assert.equal((await handleAgoraForum(post({...input,title:'a'.repeat(151)}),db,'account-1')).status,400);
 assert.equal((await handleAgoraForum(post(input),db,'account-1')).status,201);
 assert.ok(calls.some(call=>call.sql.startsWith('INSERT INTO agora_forum_topics')));
 assert.ok(!calls.some(call=>/UPDATE\s+forum_votes|INSERT\s+INTO\s+federation/i.test(call.sql)));
});
