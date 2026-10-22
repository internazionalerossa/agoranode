import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {PostgresDatabase,type Connections} from '../server/database';
import {handleNodeFeedPreferences} from '../server/node-feed-preferences';
import {AGORA_SOURCE_IDS} from '../app/instances/agora-sources';

test('authenticated PR1 preferences persist in PostgreSQL independently per user and node',async()=>{
 const pg=new PGlite();
 try{
   await pg.exec(await readFile(new URL('../server/migrations/015-node-feed-preferences.sql',import.meta.url),'utf8'));
   const query=async(sql:string,args:unknown[]=[])=>{
     const result=await pg.query(sql,args);
     return {rows:result.rows as Record<string,unknown>[],rowCount:result.affectedRows};
   };
   const pool={query,connect:async()=>({query})} satisfies Connections;
   const db=new PostgresDatabase(pool);
   const request=(method:'GET'|'PUT',user:string,space:string,sourceIds?:unknown)=>
      handleNodeFeedPreferences(new Request('https://example.test/api/spaces/'+space+'/preferences',{
        method,headers:{origin:'https://example.test','content-type':'application/json'},
        body:method==='PUT'?JSON.stringify({sourceIds}):undefined,
      }),db,user,space,AGORA_SOURCE_IDS);
   const a=await request('PUT','alice','agora',['agora-github','agora-linux-video']);
   assert.equal(a.status,200);
   const alice=await (await request('GET','alice','agora')).json();
   assert.deepEqual(alice.sourceIds,['agora-github','agora-linux-video']);
   assert.equal(alice.saved,true);
   assert.deepEqual((await(await request('GET','bob','agora')).json()).sourceIds,[]);
   assert.deepEqual((await(await request('GET','alice','polisrossa')).json()).sourceIds,[]);
   assert.equal((await request('PUT','bob','agora',['not-a-source'])).status,400);
   assert.equal((await request('PUT','alice','agora',[])).status,200);
   assert.deepEqual((await(await request('GET','alice','agora')).json()).sourceIds,[]);
 }finally{await pg.close();}
});
