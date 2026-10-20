import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {PostgresDatabase} from '../server/database';
import {handlePrivacyExport} from '../app/lib/privacy-export';

test('personal export reads the real schema, isolates accounts and never selects authentication secrets',async()=>{
 const engine=new PGlite();
 try{
  await engine.exec(await readFile(new URL('../server/migrations/001-schema.sql',import.meta.url),'utf8'));
  await engine.query("INSERT INTO bookmarks(owner_id,kind,item_key,payload,deleted,updated_at) VALUES ('alice','book','a','',0,1),('bob','book','private-bob','',0,1)");
  await engine.query("INSERT INTO reading_progress(owner_id,book_id,edition,chapter,page,scroll,revision,updated_at) VALUES ('alice','a','it',2,3,0,'r1',1)");
  const sqls:string[]=[];
  const query=async(sql:string,values:unknown[]=[])=>{sqls.push(sql);const result=await engine.query(sql,values);return {rows:result.rows as Record<string,unknown>[],rowCount:result.affectedRows};};
  const db=new PostgresDatabase({query,connect:async()=>({query})});
  const response=await handlePrivacyExport(new Request('https://example.test/api/privacy/export'),db,'alice');
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.match(response.headers.get('content-disposition')!,/attachment/);
  const body=await response.text();assert.doesNotMatch(body,/private-bob/);const data=JSON.parse(body);assert.equal(data.data.bookmarks[0].item_key,'a');assert.equal(data.data.readingProgress[0].chapter,2);assert.equal(data.data.membership.length,0);
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
