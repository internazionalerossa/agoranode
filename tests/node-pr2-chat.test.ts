import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Connections} from '../server/database';
import {handleNodeChat} from '../server/node-chat';

test('chat admits only node PR2, isolates messages and enforces cooldown',async()=>{
 const pg=new PGlite();
 try{
  await pg.exec(await readFile(new URL('../server/migrations/022-node-pr2-chat.sql',import.meta.url),'utf8'));
  const c={query:async(sql:string,args:unknown[]=[])=>{
   const value=await pg.query(sql,args);
   return {rows:value.rows as Record<string,unknown>[],rowCount:value.affectedRows};
  }};
  const db={...c,connect:async()=>c} satisfies Connections;
  const verifier=async(space:string,user:string)=>space==='astronomia'&&user==='alice';
  const endpoint='https://example.test/api/node-chat?spaceId=astronomia';
  const call=(req:Request,who:string|null,space='astronomia')=>handleNodeChat(req,db,space,who,verifier);
  const post=(content:unknown,origin='https://example.test')=>new Request(endpoint,{
   method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(content),
  });
  const content={alias:'Alice',body:'Un riferimento per osservare e studiare le stelle'};
  assert.equal((await call(new Request(endpoint),null)).status,401);
  assert.equal((await call(new Request(endpoint),'bob')).status,403);
  assert.equal((await call(post(content),'bob')).status,403);
  assert.equal((await call(post(content,'https://attacker.test'),'alice')).status,403);
  assert.equal((await call(post({...content,role:'pr3'}),'alice')).status,400);
  assert.equal((await call(post(content),'alice')).status,201);
  assert.equal((await call(post(content),'alice')).status,429);
  const messages=await (await call(new Request(endpoint),'alice')).json();
  assert.equal(messages.spaceId,'astronomia');
  assert.equal(messages.messages.length,1);
  assert.equal(messages.messages[0].alias,'Alice');
  assert.ok(!JSON.stringify(messages).includes('author_id'));
  assert.equal((await call(new Request('https://example.test/api/node-chat?spaceId=geologia'),'alice','geologia')).status,403);
  assert.equal((await call(new Request(endpoint+'&owner=alice'),'alice')).status,400);
 }finally{await pg.close();}
});
