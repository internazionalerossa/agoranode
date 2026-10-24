import test from 'node:test';
import assert from 'node:assert/strict';
import {api} from '../server/api';
import type {PostgresDatabase} from '../server/database';

test('legacy elected PR3 actions are retired while signed PR2 enrollment remains available',async()=>{
 const db={} as PostgresDatabase;
 const background=(_:Promise<unknown>)=>{};
 const post=(payload:unknown)=>new Request('https://example.test/api/federation/pr3',{
  method:'POST',headers:{origin:'https://example.test','content-type':'application/json'},
  body:JSON.stringify(payload),
 });
 for(const action of ['apply','recall','vote','finalize','activate','expire']){
  const result=await api(post({action}),db,null,undefined,background);
  assert.equal(result.status,410,action);
  assert.match((await result.json()).error,/retired/i);
 }
 const enroll=await api(post({action:'enroll'}),db,null,undefined,background);
 assert.equal(enroll.status,401);
});
