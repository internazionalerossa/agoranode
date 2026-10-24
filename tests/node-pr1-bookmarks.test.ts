import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Connections} from '../server/database';
import {handleNodeBookmarks} from '../server/node-bookmarks';
import {createPublicSpaceSeed} from '../app/platform/public-space-seed';
import {newNodeDraft} from '../app/lib/node-studio-model';

test('PR1 can save and remove independent per-node article bookmarks without gaining PR2 privileges',async()=>{
 const pg=new PGlite();
 try{
  await pg.exec(await readFile(new URL('../server/migrations/021-node-personal-bookmarks.sql',import.meta.url),'utf8'));
  const connection={query:async(sql:string,args:unknown[]=[])=>{
   const res=await pg.query(sql,args);
   return {rows:res.rows as Record<string,unknown>[],rowCount:res.affectedRows};
  }};
  const pool={...connection,connect:async()=>connection} satisfies Connections;
  const draft={...newNodeDraft('create-node','astronomia'),name:'Astronomia',
   topic:'Conoscenza astronomica',description:'Una biblioteca astronomica verificabile.',
   sources:[{id:'osservatorio',name:'Osservatorio',homepage:'https://obs.example.org/',feedUrl:'https://obs.example.org/feed'}]};
  const seed=createPublicSpaceSeed(draft);
  const url='https://node.test/api/node-bookmarks?spaceId=astronomia';
  const bookmark={articleId:'new-discovery',sourceId:'astronomia:osservatorio',
   title:'Nuova scoperta',link:'https://obs.example.org/discovery',excerpt:'La ricerca originale'};
  const request=(method:'PUT'|'DELETE',content:unknown,origin='https://node.test')=>
   new Request(url,{method,headers:{origin,'content-type':'application/json'},body:JSON.stringify(content)});
  const call=(req:Request,user:string|null)=>handleNodeBookmarks(req,pool,seed,user);
  assert.equal((await call(request('PUT',bookmark),null)).status,401);
  assert.equal((await call(request('PUT',bookmark,'https://evil.test'),'alice')).status,403);
  assert.equal((await call(request('PUT',{...bookmark,sourceId:'polisrossa:source'}),'alice')).status,400);
  assert.equal((await call(request('PUT',{...bookmark,link:'javascript:alert(1)'}),'alice')).status,400);
  assert.equal((await call(request('PUT',bookmark),'alice')).status,200);
  assert.equal((await call(request('PUT',bookmark),'alice')).status,200);
  const saved=await (await call(new Request(url),'alice')).json();
  assert.equal(saved.spaceId,'astronomia');
  assert.equal(saved.bookmarks.length,1);
  assert.equal(saved.bookmarks[0].article_id,'new-discovery');
  assert.ok(!JSON.stringify(saved).includes('alice'));
  const other=await (await call(new Request(url),'bob')).json();
  assert.equal(other.bookmarks.length,0);
  assert.equal((await call(request('DELETE',{articleId:'new-discovery'}),'bob')).status,200);
  assert.equal((await (await call(new Request(url),'alice')).json()).bookmarks.length,1);
  assert.equal((await call(request('DELETE',{articleId:'new-discovery'}),'alice')).status,200);
  assert.equal((await (await call(new Request(url),'alice')).json()).bookmarks.length,0);
  assert.equal((await call(new Request('https://node.test/api/node-bookmarks?spaceId=geologia'),'alice')).status,400);
 }finally{await pg.close();}
});
