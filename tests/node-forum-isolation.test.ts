import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Connections} from '../server/database';
import {handleNodeForum} from '../server/node-forum';

test('the thematic forum stores actual discussions and replies with account isolation',async()=>{
 const pg=new PGlite();
 try{
  for(const name of ['019-node-editorial-pr2.sql','020-node-forum.sql'])
   await pg.exec(await readFile(new URL('../server/migrations/'+name,import.meta.url),'utf8'));
  const conn={query:async(sql:string,args:unknown[]=[])=>{
   const v=await pg.query(sql,args);
   return {rows:v.rows as Record<string,unknown>[],rowCount:v.affectedRows};
  }};
  const pool={...conn,connect:async()=>conn} satisfies Connections;
  const url='https://example.test/api/node-forum?spaceId=astronomia';
  const post=(body:unknown,origin='https://example.test')=>new Request(url,{method:'POST',
   headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
  const verify=async(space:string,user:string)=>space==='astronomia'&&['alice','bob'].includes(user);
  const call=(req:Request,id:string|null,space='astronomia')=>handleNodeForum(req,pool,space,id,verify);
  const text={action:'create',alias:'Ada',title:'Fonti astronomiche',body:'Propongo una discussione sulle fonti osservazionali pubbliche e verificabili.'};
  assert.equal((await call(post(text),null)).status,401);
  assert.equal((await call(post(text,'https://evil.test'),'alice')).status,403);
  assert.equal((await call(post({...text,role:'pr3'}),'alice')).status,400);
  assert.equal((await call(post(text),'pr1')).status,403);
  const made=await call(post(text),'alice');
  assert.equal(made.status,201);
  const created=await made.json() as {id:string};
  assert.match(created.id,/^[0-9a-f-]{36}$/);
  const publicList=await (await call(new Request(url),null)).json() as {topics:Array<{id:string;author_alias:string;body:string}>};
  assert.equal(publicList.topics.length,1);
  assert.equal(publicList.topics[0].author_alias,'Ada');
  assert.ok(!JSON.stringify(publicList).includes('alice'));
  const other=await (await call(new Request('https://example.test/api/node-forum?spaceId=geologia'),null,'geologia')).json() as {topics:unknown[]};
  assert.equal(other.topics.length,0);
  const reply=await call(post({action:'reply',alias:'Bruno',topicId:created.id,body:'I riferimenti bibliografici dovrebbero includere le edizioni.'}),'bob');
  assert.equal(reply.status,201);
  const thread=await (await call(new Request(url+'&topicId='+created.id),null)).json() as {topic:{title:string};comments:Array<{author_alias:string;body:string}>};
  assert.equal(thread.topic.title,'Fonti astronomiche');
  assert.equal(thread.comments.length,1);
  assert.equal(thread.comments[0].author_alias,'Bruno');
  assert.ok(!JSON.stringify(thread).includes('bob'));
  assert.equal((await call(post({action:'reply',alias:'Bruno',topicId:created.id,body:'Not for this space'}),'bob','geologia')).status,400);
  assert.equal((await call(new Request(url+'&topicId=bad'),null)).status,400);
 }finally{await pg.close();}
});
