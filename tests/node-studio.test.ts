import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PGlite} from '@electric-sql/pglite';
import {PostgresDatabase,type Connections} from '../server/database';
import {handleNodeStudioDrafts} from '../server/node-studio-drafts';
import NodeStudio from '../app/components/NodeStudio';
import {NODE_BLUEPRINT_FORMAT,newNodeDraft,nodeStudioDraft,blueprintToProposal} from '../app/lib/node-studio-model';
import {privatePaths} from '../server/api';

test('a blueprint is a bounded private draft, not an automatic node publication',()=>{
 const draft={...newNodeDraft('create-node','matematica'),name:'Matematica',
   topic:'Insegnamento e storia della matematica',
   description:'Documentazione collaborativa della matematica e delle sue scoperte.',
   sources:[{id:'arxiv',name:'arXiv',homepage:'https://arxiv.org',feedUrl:'https://export.arxiv.org/rss/math'}],
   blocks:[{id:crypto.randomUUID(),kind:'timeline' as const,title:'I numeri e la loro storia',
     body:'Un percorso narrativo introduttivo con fonti originali.',url:''}],
 };
 assert.equal(nodeStudioDraft(draft).format,NODE_BLUEPRINT_FORMAT);
 assert.match(blueprintToProposal(draft).body,/PR2/);
 assert.throws(()=>nodeStudioDraft({...draft,operation:'create-node',spaceId:'agora'}),/Invalid/);
 assert.throws(()=>nodeStudioDraft({...draft,sources:[{...draft.sources[0],feedUrl:'http://127.0.0.1/'}]}),/source/);
 assert.throws(()=>nodeStudioDraft({...draft,blocks:[{...draft.blocks[0],body:'',title:''}]}),/Empty/);
 assert.throws(()=>nodeStudioDraft({...draft,blocks:Array.from({length:81},()=>draft.blocks[0])}),/Invalid/);
 const html=renderToStaticMarkup(createElement(NodeStudio,{spaceId:'agora'}));
 assert.match(html,/Dai forma a un nodo/);
 assert.match(html,/Salva bozza/);
 assert.match(html,/ANTEPRIMA|Mostra anteprima/);
 assert.ok(privatePaths.has('/api/node-studio/drafts'));
 assert.ok(privatePaths.has('/api/spaces/agora/preferences'));
 assert.ok(privatePaths.has('/api/spaces/polisrossa/preferences'));
});

test('PostgreSQL draft storage isolates owners, enforces limits, and supports explicit deletion',async()=>{
 const pg=new PGlite();
 try{
   await pg.exec(await readFile(new URL('../server/migrations/016-node-studio-drafts.sql',import.meta.url),'utf8'));
   const connection={query:async(sql:string,args:unknown[]=[])=>{
     const r=await pg.query(sql,args);
     return {rows:r.rows as Record<string,unknown>[],rowCount:r.affectedRows};
   }};
   const db=new PostgresDatabase({...connection,connect:async()=>connection} satisfies Connections);
   const draft={...newNodeDraft('create-node','matematica'),name:'Matematica',
     topic:'Storia e teoria della matematica',
     description:'Un archivio di concetti matematici e fonti verificabili.'};
   const call=(user:string|null,method:'GET'|'PUT'|'DELETE',data?:unknown,qs='')=>
     handleNodeStudioDrafts(new Request('https://example.test/api/node-studio/drafts'+qs,{
       method,headers:{origin:'https://example.test','content-type':'application/json'},
       body:method==='PUT'?JSON.stringify({draft:data}):undefined,
     }),db,user);
   assert.equal((await call(null,'GET')).status,401);
   assert.equal((await call('alice','PUT',draft)).status,200);
   const loaded=await(await call('alice','GET')).json();
   assert.equal(loaded.drafts.length,1);
   assert.equal(loaded.drafts[0].draftId,draft.draftId);
   assert.equal((await(await call('bob','GET')).json()).drafts.length,0);
   assert.equal((await call('bob','DELETE',undefined,'?draftId='+draft.draftId)).status,200);
   assert.equal((await(await call('alice','GET')).json()).drafts.length,1);
   assert.equal((await call('alice','DELETE',undefined,'?draftId='+draft.draftId)).status,200);
   assert.equal((await(await call('alice','GET')).json()).drafts.length,0);
   assert.equal((await call('alice','PUT',{...draft,spaceId:'../etc'})).status,400);
 }finally{await pg.close();}
});
