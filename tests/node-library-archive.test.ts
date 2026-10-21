import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {PostgresDatabase,type Connections} from '../server/database';
import {collectLibraryEdition,importLibraryEdition,readArchivedBook,readBookDatabaseFirst,validateLibraryImportTarget} from '../server/library-archive';
import type {ReaderDocument} from '../app/lib/book-reader';
import {api,privatePaths} from '../server/api';
import {libraryStorageRight} from '../server/library-rights';

const bookId='commons-viventi',language='en',root='https://freefairandalive.org/read-it/';
const chapters=[{title:'Introduzione',url:root},{title:'Commons',url:'https://freefairandalive.org/read-it/chapter-one.html'}];
function document(chapter:number,pages=[[{type:'p' as const,text:chapter?'Un bene comune resta condiviso.':'Un testo libero e attribuito.'}]]):ReaderDocument{return {chapters,chapter,pages,revision:'f'.repeat(64),source:'Sito degli autori',url:chapters[chapter].url,language};}
function reader(options:{empty?:boolean;offline?:boolean}={}){let calls=0;return {get calls(){return calls;},read:async(_book:string,_language:string,chapter:number)=>{calls++;if(options.offline)throw new Error('network unavailable');return document(chapter,options.empty?[]:undefined);}};}
async function fixture(){
 const pg=new PGlite(),queries:string[]=[];await pg.exec(await readFile(new URL('../server/migrations/009-library-archive.sql',import.meta.url),'utf8'));
 const query=async(sql:string,values:unknown[]=[])=>{queries.push(sql);const result=await pg.query(sql,values);return {rows:result.rows as Record<string,unknown>[],rowCount:result.affectedRows};};
 const connection={query},pool={...connection,connect:async()=>connection} satisfies Connections;
 return {pg,pool,db:new PostgresDatabase(pool),queries};
}

test('an approved edition is imported atomically, versioned and served from PostgreSQL without a network fallback',async()=>{
  const {pg,pool,db,queries}=await fixture(),source=reader();
 try{
  const imported=await importLibraryEdition(pool,bookId,language,source.read);assert.equal(imported.created,true);assert.equal(imported.chapters,2);assert.match(imported.revisionSha256,/^[0-9a-f]{64}$/);assert.equal(imported.license,'CC-BY-SA-4.0');
  assert.deepEqual((await pg.query<{license_spdx:string;rights_statement_url:string}>('SELECT license_spdx,rights_statement_url FROM library_revisions')).rows,[{license_spdx:'CC-BY-SA-4.0',rights_statement_url:'https://www.boell.de/en/2019/09/06/free-fair-and-alive-insurgent-power-commons'}]);
   queries.length=0;
   const stored=await readBookDatabaseFirst(db,bookId,language,1);assert.equal(stored.pages[0][0].text,'Un bene comune resta condiviso.');assert.equal(stored.archive?.persistent,true);assert.equal(stored.archive?.revisionSha256,imported.revisionSha256);
   const pageQueries=queries.filter(sql=>/^SELECT\s/i.test(sql)&&/\bpages_json\b/i.test(sql));assert.equal(pageQueries.length,1);assert.match(pageQueries[0],/chapter_index=\$2/);assert.doesNotMatch(queries.find(sql=>/ORDER BY chapter_index/i.test(sql))??'',/\bpages_json\b/i);
  assert.equal((await importLibraryEdition(pool,bookId,language,source.read)).created,false);
  await assert.rejects(pg.query("UPDATE library_revisions SET attribution='changed'"),/immutable/);
  assert.equal(await readArchivedBook(db.pool,bookId,language,0,()=>null),null);
  const right=libraryStorageRight(bookId,language)!;
  assert.equal(await readArchivedBook(db.pool,bookId,language,0,()=>({...right,attribution:'Attribuzione cambiata'})),null);
  await pg.query('DELETE FROM library_current_revisions');await pg.query('DELETE FROM library_revisions');await pg.query('DELETE FROM library_editions');
  assert.equal((await pg.query<{count:number}>('SELECT count(*)::int AS count FROM library_chapters')).rows[0].count,0);
 }finally{await pg.close();}
});

test('licensed archived books are public while private reading progress remains protected',async()=>{
 const {pg,pool,db}=await fixture();
 try{
  await importLibraryEdition(pool,bookId,language,reader().read);
  assert.equal(privatePaths.has('/api/library/read'),false);assert.equal(privatePaths.has('/api/reading-progress'),true);
  const response=await api(new Request(`https://example.test/api/library/read?bookId=${bookId}&edition=${language}&chapter=0`),db,null,undefined,()=>{},false);
  assert.equal(response.status,200);const body=await response.json();assert.equal(body.pages[0][0].text,'Un testo libero e attribuito.');assert.equal(body.archive.persistent,true);
  const external=await api(new Request('https://example.test/api/library/read?bookId=conquista-pane&edition=en&chapter=0'),db,null,undefined,()=>{},false);
  assert.equal(external.status,404);assert.match((await external.json()).error,/archivio originale/);
 }finally{await pg.close();}
});

test('invalid and unregistered editions are denied before any network request',async()=>{
 const source=reader();
 assert.throws(()=>validateLibraryImportTarget('../commons','en'),/invalid format/);
 await assert.rejects(collectLibraryEdition('commons-viventi','de',source.read),/not approved/);
 await assert.rejects(collectLibraryEdition('conquista-pane','en',source.read),/not approved/);
 assert.equal(source.calls,0);
});

test('empty or unreachable sources do not leave partial archive rows',async()=>{
 for(const options of [{empty:true},{offline:true}]){
  const {pg,pool}=await fixture();
  try{
   await assert.rejects(importLibraryEdition(pool,bookId,language,reader(options).read),options.empty?/invalid or inconsistent content/:/network unavailable/);
   assert.equal((await pg.query<{count:number}>('SELECT count(*)::int AS count FROM library_editions')).rows[0].count,0);
   assert.equal((await pg.query<{count:number}>('SELECT count(*)::int AS count FROM library_revisions')).rows[0].count,0);
  }finally{await pg.close();}
 }
});

test('a missing or unapproved stored edition fails closed without a remote-reader fallback',async()=>{
 const {pg,pool,db}=await fixture();
 try{
  assert.equal(await readArchivedBook(db.pool,bookId,language,0),null);
  await assert.rejects(readBookDatabaseFirst(db,bookId,language,0),/persistent archive/);
  await assert.rejects(readBookDatabaseFirst(db,'conquista-pane','en',0),/not approved/);
  await importLibraryEdition(pool,bookId,language,reader().read);
  await pg.query('DELETE FROM library_current_revisions');
  await assert.rejects(readBookDatabaseFirst(db,bookId,language,0),/persistent archive/);
 }
 finally{await pg.close();}
});
