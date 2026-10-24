import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {PostgresDatabase,type Connections} from '../server/database';
import {handleScopedIssues} from '../server/scoped-issues';

test('the issue service is scoped, authenticated, and never grants PR2 by self declaration',async()=>{
 const pg=new PGlite();
 try {
  await pg.exec(await readFile(new URL('../server/migrations/014-federation-pr3.sql',import.meta.url),'utf8'));
  await pg.exec(await readFile(new URL('../server/migrations/018-scoped-internal-issues.sql',import.meta.url),'utf8'));
  const connection={query:async(sql:string,args:unknown[]=[])=>{
   const v=await pg.query(sql,args);
   return {rows:v.rows as Record<string,unknown>[],rowCount:v.affectedRows};
  }};
  const db=new PostgresDatabase({...connection,connect:async()=>connection} satisfies Connections);
  const url='https://example.test/api/scoped-issues?scope=agora';
  const post=(data:unknown,origin='https://example.test')=>
   new Request(url,{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify(data)});
  const details={action:'create',title:'Improve our source library',body:'The bibliography needs stable references with explicit provenance and reviewer decisions.'};
  assert.equal((await handleScopedIssues(post(details),db,null)).status,401);
  assert.equal((await handleScopedIssues(post(details,'https://evil.test'),db,'alice')).status,403);
  assert.equal((await handleScopedIssues(post(details),db,'alice')).status,403);
  const issueId=crypto.randomUUID();
  await pg.query('INSERT INTO agora_internal_issues(id,scope,author_id,title,body) VALUES ($1,$2,$3,$4,$5)',
   [issueId,'agora','alice',details.title,details.body]);
  const list=await (await handleScopedIssues(new Request(url),db,null)).json();
  assert.equal(list.issues.length,1);
  assert.equal(list.issues[0].scope,'agora');
  assert.ok(!JSON.stringify(list).includes('alice'));
  const separate=await (await handleScopedIssues(new Request('https://example.test/api/scoped-issues?scope=agoranode'),db,null)).json();
  assert.equal(separate.issues.length,0);
  const detail=await (await handleScopedIssues(new Request(url+'&issueId='+issueId),db,null)).json();
  assert.equal(detail.issue.id,issueId);
  assert.equal(detail.binding,false);
  assert.equal((await handleScopedIssues(post({action:'vote',issueId,choice:'yes'}),db,'alice')).status,403);
  const message=await handleScopedIssues(post({action:'comment',issueId,body:'Please publish verifiable bibliography links.'}),db,'bob');
  assert.equal(message.status,201);
  const comments=await (await handleScopedIssues(new Request(url+'&issueId='+issueId),db,null)).json();
  assert.equal(comments.comments.length,1);
  assert.equal(comments.advisoryVotes.length,0);
  assert.ok(!JSON.stringify(comments).includes('bob'));
  assert.equal((await handleScopedIssues(new Request(url+'&issueId=bad'),db,null)).status,400);
 }finally{await pg.close();}
});
