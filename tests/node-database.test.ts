import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PostgresDatabase,postgresSql,type Connections} from '../server/database';
import {handleForum} from '../app/lib/forum';
import {handleBookmarks,type BookmarkDatabase} from '../app/lib/bookmarks';
import {createArticlePhotoStore} from '../app/lib/public-news-store';
async function setup(){
 const pg=new PGlite();await pg.exec(await readFile(new URL('../server/migrations/001-schema.sql',import.meta.url),'utf8'));await pg.exec(await readFile(new URL('../server/migrations/002-forum-integrity.sql',import.meta.url),'utf8'));
 await pg.exec(await readFile(new URL('../server/migrations/004-open-electorate.sql',import.meta.url),'utf8'));await pg.exec(await readFile(new URL('../server/migrations/005-topic-visibility.sql',import.meta.url),'utf8'));
 await pg.exec(await readFile(new URL('../server/migrations/006-three-founders.sql',import.meta.url),'utf8'));
 await pg.exec(await readFile(new URL('../server/migrations/007-social-identity.sql',import.meta.url),'utf8'));
 await pg.exec(await readFile(new URL('../server/migrations/010-pr2-reference-url.sql',import.meta.url),'utf8'));
 // PGlite serializes one physical connection; production uses pg.Pool across replicas.
 const connection={query:async(sql:string,values:unknown[]=[])=>{const r=await pg.query(sql,values).catch(error=>{console.error('Test SQL failure',sql,error.message);throw error;});return {rows:r.rows as Record<string,unknown>[],rowCount:r.affectedRows};}};
 const pool={...connection,connect:async()=>connection} satisfies Connections;
 return {pg,db:new PostgresDatabase(pool)};
}
test('PostgreSQL persists isolated collections and can resolve publisher references from JSON',async()=>{
 const {pg,db}=await setup();try{
  const request=(user:string,changes?:unknown)=>handleBookmarks(new Request('https://example.test/api/bookmarks',{method:changes?'POST':'GET',headers:{origin:'https://example.test','content-type':'application/json'},body:changes?JSON.stringify({changes}):undefined}),db as unknown as BookmarkDatabase,user,new Set(['manifesto']));
  assert.equal((await request('alice',[{kind:'book',key:'manifesto',deleted:false}])).status,200);
  assert.equal((await (await request('bob')).json()).items.length,0);
  const saved=await(await request('alice')).json();assert.equal(saved.items[0].key,'manifesto');
  const store=createArticlePhotoStore(db,new Set(['radar-it-news']));
  await store.remember('radar-it-news',[{id:'story1',sourceId:'radar:123',feedSourceId:'radar-it-news',link:'https://example.org/a',sourceHomepage:'https://example.org',title:'Test',image:'https://example.org/a.jpg'}]);
  assert.equal((await store.find('radar:123','story1'))?.title,'Test');
 }finally{await pg.close();}
});
test('PostgreSQL enforces admission, immutable rules, fixed electorate, unique ballots and attributed export',async()=>{
 const {pg,db}=await setup();let now=Date.now();const code='test-code-012345678901234567890123456789',codes=[code,code+'-second',code+'-third'],hash=codes.map(value=>createHash('sha256').update(value).digest('hex')).join(',');
 let unlinked=false;
 const call=(user:string|null,data?:unknown,query='',withFacebook=true,accountVerified=true)=>handleForum(new Request('https://example.test/api/community/forum'+query,{method:data?'POST':'GET',headers:{origin:'https://example.test','content-type':'application/json'},body:data?JSON.stringify(data):undefined}),db,user,hash,()=>now,user&&withFacebook?{provider:'facebook',subject:BigInt('0x'+createHash('sha256').update(user).digest('hex').slice(0,15)).toString(),name:'Persona '+user,url:'https://www.facebook.com/app_scoped_user_id/'+BigInt('0x'+createHash('sha256').update(user).digest('hex').slice(0,15)).toString()}:null,async()=>{unlinked=true;},accountVerified);
 const apply=async(user:string)=>{const id=crypto.randomUUID();assert.equal((await call(user,{action:'apply',requestId:id,alias:user,intro:'Una presentazione pubblica sufficientemente lunga.',language:'it',consent:true})).status,201);return id;};
 try{
  assert.equal((await call('invalid-payload',{action:'apply',requestId:crypto.randomUUID(),alias:'invalid-payload',intro:'Una presentazione pubblica sufficientemente lunga.',referenceUrl:'https://www.facebook.com/inserito-a-mano',language:'it',consent:true})).status,400);
  assert.equal((await call('unverified-email',{action:'apply',requestId:crypto.randomUUID(),alias:'unverified-email',intro:'Una presentazione pubblica sufficientemente lunga.',language:'it',consent:true},'',false,false)).status,403);
  const withoutFacebook=crypto.randomUUID();assert.equal((await call('without-facebook',{action:'apply',requestId:withoutFacebook,alias:'without-facebook',intro:'Una presentazione pubblica sufficientemente lunga.',language:'it',consent:true},'',false)).status,403);
  assert.equal((await pg.query('SELECT id FROM forum_members WHERE id=$1',[withoutFacebook])).rows.length,0);assert.equal(unlinked,false);
  const founder=await apply('alice');assert.equal((await call('alice',{action:'bootstrap',code})).status,200);
  const storedFounder=await pg.query<{reference_url:string;identity_provider:string}>('SELECT reference_url,identity_provider FROM forum_members WHERE id=$1',[founder]);assert.match(storedFounder.rows[0].reference_url,/^https:\/\/www\.facebook\.com\/app_scoped_user_id\//);assert.equal(storedFounder.rows[0].identity_provider,'facebook');
  assert.equal(unlinked,true);
  let identityReads=0;const lazyIdentity=async()=>{identityReads++;return {provider:'facebook' as const,subject:'999999999999',name:'Persona lazy',url:'https://www.facebook.com/app_scoped_user_id/999999999999'};};
  const lazyCall=(user:string,data:Record<string,unknown>)=>handleForum(new Request('https://example.test/api/community/forum',{method:'POST',headers:{origin:'https://example.test','content-type':'application/json'},body:JSON.stringify(data)}),db,user,hash,()=>now,lazyIdentity,async()=>{});
  const applicationBase={action:'apply',intro:'Una presentazione pubblica sufficientemente lunga.',language:'it',consent:true};
  assert.equal((await lazyCall('alice',{...applicationBase,requestId:crypto.randomUUID(),alias:'alice-new'})).status,409);
  assert.equal((await lazyCall('alias-collision',{...applicationBase,requestId:crypto.randomUUID(),alias:'alice'})).status,409);
  assert.equal((await lazyCall('id-collision',{...applicationBase,requestId:founder,alias:'unique-alias'})).status,409);assert.equal(identityReads,0);
  for(const [i,name] of ['founder-two','founder-three'].entries()){await apply(name);assert.equal((await call(name,{action:'bootstrap',code:codes[i+1]})).status,200);}
  const waiting=await apply('waiting');
  const bob=await apply('bobby');assert.equal((await call('alice',{action:'admit',id:bob,value:1,identityChecked:true})).status,200);
  for(const name of ['founder-two','founder-three'])assert.equal((await call(name,{action:'admit',id:bob,value:1,identityChecked:true})).status,200);
  const board=await(await call('bobby')).json();assert.equal(board.activeCount,4);assert.equal(board.applications.find((a:{member:{id:string}})=>a.member.id===waiting).canVote,true);
  for(const user of ['bobby','alice','founder-two'])assert.equal((await call(user,{action:'admit',id:waiting,value:-1})).status,200);
  assert.equal((await(await call('waiting')).json()).member.status,'rejected');
  assert.equal((await call('waiting',{action:'cancelApplication'})).status,200);
  assert.equal(unlinked,true);
  const removed=await pg.query('SELECT alias,intro,reference_url,identity_name,identity_url,identity_provider,identity_subject FROM forum_members WHERE id=$1',[waiting]);assert.equal(removed.rows.length,0);
  assert.equal((await pg.query<{count:number}>('SELECT count(*)::int AS count FROM forum_admission_votes WHERE candidate_id=$1 OR member_id=$1',[waiting])).rows[0].count,0);
  assert.equal((await pg.query<{count:number}>('SELECT count(*)::int AS count FROM forum_admission_electorate WHERE candidate_id=$1 OR member_id=$1',[waiting])).rows[0].count,0);
  const reapplied=await apply('waiting');assert.notEqual(reapplied,waiting);
  const withdrawn=crypto.randomUUID();
  assert.equal((await call('alice',{action:'create',kind:'discussion',requestId:withdrawn,title:'Una discussione da ritirare',body:'Questo testo non deve restare accessibile dopo il ritiro.',language:'it',category:'general'})).status,201);
  assert.equal((await call('alice',{action:'withdrawTopic',id:withdrawn})).status,200);
  for(const user of [null,'alice'])for(const kind of ['topic','export'])assert.equal((await call(user,undefined,`?kind=${kind}&id=${withdrawn}`)).status,404);
  const id=crypto.randomUUID(),result=await call('alice',{action:'create',requestId:id,title:'Una proposta condivisa',body:'Una proposta con problemi e soluzioni discussi insieme dalla comunità.',options:['Soluzione uno','Soluzione due'],language:'it',category:'other',method:'single',quorum:25,durationHours:1,discussionHours:0});assert.equal(result.status,201);
  await assert.rejects(pg.query('UPDATE forum_topics SET title=$1 WHERE id=$2',['Corrupted',id]),/immutable/);
  await assert.rejects(pg.query('DELETE FROM forum_electorate WHERE topic_id=$1',[id]),/Immutable/);
  const receipt=crypto.randomUUID();assert.equal((await call('alice',{action:'vote',id,choices:[0],receipt,publicVote:true})).status,200);
  assert.equal((await call('alice',{action:'vote',id,choices:[0],receipt,publicVote:true})).status,200);
  assert.equal((await pg.query<{count:number}>('SELECT count(*)::int AS count FROM forum_ballots')).rows[0].count,1);
  assert.equal((await call('alice',undefined,'?kind=export&id='+id)).status,409);now+=3600001;
  const exported=await(await call(null,undefined,'?kind=export&id='+id)).json();assert.equal(exported.ballots[0].voter.name,'alice');assert.equal(Object.hasOwn(exported.ballots[0].voter,'reference'),false);assert.doesNotMatch(JSON.stringify(exported),/facebook\.com|app_scoped_user_id|profiles\.example\.org/);assert.equal(exported.rules.eligible,4);assert.deepEqual(exported.result.winners,[0]);assert.ok(exported.sha256);
  await assert.rejects(pg.query('DELETE FROM forum_events'),/Immutable/);assert.ok(founder);
 }finally{await pg.close();}
});
test('SQL parameters keep literal question marks intact',()=>{assert.equal(postgresSql("SELECT '?' AS literal,id FROM t WHERE id=? AND title='it''s?'"),"SELECT '?' AS literal,id FROM t WHERE id=$1 AND title='it''s?'");});
