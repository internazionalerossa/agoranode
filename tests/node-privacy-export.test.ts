import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {PostgresDatabase} from '../server/database';
import {handlePrivacyExport} from '../app/lib/privacy-export';

test('personal export reads the real schema, isolates accounts and never selects authentication secrets',async()=>{
 const engine=new PGlite();
 try{
  await engine.exec(await readFile(new URL('../server/migrations/001-schema.sql',import.meta.url),'utf8'));
  await engine.exec(await readFile(new URL('../server/migrations/007-social-identity.sql',import.meta.url),'utf8'));
  await engine.exec(await readFile(new URL('../server/migrations/010-pr2-reference-url.sql',import.meta.url),'utf8'));
  await engine.exec(await readFile(new URL('../server/migrations/016-node-studio-drafts.sql',import.meta.url),'utf8'));
  await engine.exec(await readFile(new URL('../server/migrations/017-agora-forum-alpha.sql',import.meta.url),'utf8'));
  await engine.query("INSERT INTO bookmarks(owner_id,kind,item_key,payload,deleted,updated_at) VALUES ('alice','book','a','',0,1),('bob','book','private-bob','',0,1)");
  await engine.query("INSERT INTO reading_progress(owner_id,book_id,edition,chapter,page,scroll,revision,updated_at) VALUES ('alice','a','it',2,3,0,'r1',1)");
  const owner=createHash('sha256').update('internazionale-rossa:forum:alice').digest('hex');
  await engine.query("INSERT INTO forum_members(id,owner_key,alias,alias_key,intro,reference_url,identity_name,identity_kind,identity_url,language,status,created_at,deadline,admitted_at,identity_provider,identity_subject) VALUES ('application-a',$1,'Alice','alice','Presentazione della candidata','https://www.instagram.com/alice/','Alice Example','person','https://www.facebook.com/app_scoped_user_id/123456789','it','pending',1,2,NULL,'facebook','123456789')",[owner]);
  const aliceDraft='00000000-0000-4000-8000-000000000011',bobDraft='00000000-0000-4000-8000-000000000012';
  await engine.query("INSERT INTO node_studio_drafts(owner_id,draft_id,space_id,body_json) VALUES ('alice',$1,'agora',$2::jsonb),('bob',$3,'agora',$4::jsonb)",[aliceDraft,JSON.stringify({notes:'private-alice-draft'}),bobDraft,JSON.stringify({notes:'private-bob-draft'})]);
  await engine.query("INSERT INTO agora_forum_topics(id,author_id,author_alias,title,body) VALUES ('00000000-0000-4000-8000-000000000013','alice','Alice','A proposal for Agora','A detailed public proposal for the Agora infrastructure.'),('00000000-0000-4000-8000-000000000014','bob','Bob','Another proposal','Private identity and distinct user data belong to another account.')");
  const sqls:string[]=[];
  const query=async(sql:string,values:unknown[]=[])=>{sqls.push(sql);const result=await engine.query(sql,values);return {rows:result.rows as Record<string,unknown>[],rowCount:result.affectedRows};};
  const db=new PostgresDatabase({query,connect:async()=>({query})});
  const response=await handlePrivacyExport(new Request('https://example.test/api/privacy/export'),db,'alice');
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.match(response.headers.get('content-disposition')!,/attachment/);
  const body=await response.text();assert.doesNotMatch(body,/private-bob/);const data=JSON.parse(body);assert.equal(data.data.bookmarks[0].item_key,'a');assert.equal(data.data.readingProgress[0].chapter,2);assert.equal(data.data.membership.length,1);assert.equal(data.data.membership[0].identity_provider,'facebook');assert.equal(data.data.membership[0].identity_subject,'123456789');assert.equal(data.data.membership[0].reference_url,'https://www.instagram.com/alice/');
  assert.equal(data.data.nodeStudioDrafts.length,1);
  assert.equal(data.data.nodeStudioDrafts[0].draft_id,aliceDraft);
  assert.equal(data.data.nodeStudioDrafts[0].body_json.notes,'private-alice-draft');
  assert.equal(data.data.agoraForumTopics.length,1);
  assert.equal(data.data.agoraForumTopics[0].author_alias,'Alice');
  assert.equal(data.data.agoraForumTopics[0].space_id,'agora');
  assert.doesNotMatch(body,/private-bob-draft|Another proposal|Private identity and distinct user data/);
  assert.doesNotMatch(sqls.join(' '),/session|password|verification|SELECT \*/i);
  assert.equal((await handlePrivacyExport(new Request('https://example.test/api/privacy/export'),db,null)).status,401);
  assert.equal((await handlePrivacyExport(new Request('https://example.test/api/privacy/export?user=bob'),db,'alice')).status,400);
  assert.equal((await handlePrivacyExport(new Request('https://example.test/api/privacy/export',{headers:{'sec-fetch-site':'cross-site'}}),db,'alice')).status,403);
  assert.equal((await handlePrivacyExport(new Request('https://example.test/api/privacy/export',{method:'POST'}),db,'alice')).status,405);
 }finally{await engine.close();}
});
test('unavailable storage returns a private error rather than an empty successful export',async()=>{
 const response=await handlePrivacyExport(new Request('https://example.test/api/privacy/export'),undefined,'alice');assert.equal(response.status,503);assert.equal(response.headers.get('cache-control'),'private, no-store');
});
