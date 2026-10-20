import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import type pg from 'pg';
import {PGlite} from '@electric-sql/pglite';
import {getMigrations} from 'better-auth/db/migration';
import {configuration} from '../server/config';
import {createAuth,authSession,accountEndpoint} from '../server/auth';
import {PostgresDatabase,type Connections} from '../server/database';
import {api} from '../server/api';

test('verified reader accounts, member admission, discussions and ballots persist together after reopening the database',async()=>{
 const directory=await mkdtemp(join(process.cwd(),'.participation-test-'));
 let database=new PGlite(directory);
 const query=async(sql:string,values:unknown[]=[])=>{const r=await database.query(sql,values);return {rows:r.rows as Record<string,unknown>[],rowCount:r.affectedRows??r.rows.length,command:sql.trim().split(/\s/)[0].toUpperCase()};};
 const pool={query,connect:async()=>({query,release(){}}),end:async()=>{},options:{}} as unknown as pg.Pool;
 const connection={query},db=new PostgresDatabase({...connection,connect:async()=>connection} satisfies Connections);
 const config=configuration({APP_URL:'https://example.test',DATABASE_URL:'postgres://test:test@localhost/test',AUTH_SECRET:'integration-test-only-0123456789012345678901234',MAIL_TRANSPORT:'smtp',SMTP_HOST:'localhost',SMTP_USER:'test',SMTP_PASSWORD:'test',MAIL_FROM:'test@example.test'});
 const messages:{email:string;url:string}[]=[];
 const makeAuth=()=>createAuth(pool,config,async(email,url)=>{messages.push({email,url});});
 let identity=makeAuth();
 const code='integration-bootstrap-012345678901234567890',codes=[code,code+'-second',code+'-third'],hash=codes.map(value=>createHash('sha256').update(value).digest('hex')).join(',');
 const account=(data:unknown)=>accountEndpoint(identity.auth,new Request(config.origin+'/api/auth',{method:'POST',headers:{origin:config.origin,'content-type':'application/json'},body:JSON.stringify(data)}),undefined,true);
 const login=async(alias:string)=>{
  const email=alias+'@example.test',password='an-integration-test-password-12345';
  assert.equal((await account({action:'signup',email,password,consent:true})).status,200);await identity.settle();
  const message=messages.find(m=>m.email===email)!;assert.ok(message);await identity.auth.handler(new Request(message.url));
  const response=await account({action:'signin',email,password});assert.equal(response.status,200);
  return response.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
 };
 const call=async(cookie:string,path:string,data?:unknown,forumOpen=true)=>{
  const request=new Request(config.origin+path,{method:data?'POST':'GET',headers:{cookie,origin:config.origin,'content-type':'application/json'},body:data?JSON.stringify(data):undefined});
  const session=await authSession(identity.auth,request);
  return session.finish(await api(request,db,session.user?.id??null,hash,()=>{},forumOpen,session.user?{provider:'discord',subject:BigInt('0x'+createHash('sha256').update(session.user.id).digest('hex').slice(0,15)).toString(),name:'Persona di prova',url:'https://discord.com/users/'+BigInt('0x'+createHash('sha256').update(session.user.id).digest('hex').slice(0,15)).toString()}:null));
 };
 const application=(alias:string)=>({action:'apply',requestId:crypto.randomUUID(),alias,intro:'Una presentazione pubblica per la gestione delle fonti.',language:'it',consent:true});
 try{
  for(const filename of (await readdir(new URL('../server/migrations',import.meta.url))).filter(n=>n.endsWith('.sql')).sort())await database.exec(await readFile(new URL('../server/migrations/'+filename,import.meta.url),'utf8'));
  await(await getMigrations(identity.auth.options)).runMigrations();
  const alice=await login('alice'),bob=await login('bobby');
  const foundingUsers=['founder-two','founder-three'];
  const foundingSessions=await (async()=>{const sessions:string[]=[];for(const name of foundingUsers){await identity.auth.api.signUpEmail({body:{email:name+'@example.test',password:'an-integration-test-password-12345',name}});await identity.settle();const message=messages.find(m=>m.email===name+'@example.test')!;assert.ok(message);await identity.auth.handler(new Request(message.url));const response=await identity.auth.api.signInEmail({body:{email:name+'@example.test',password:'an-integration-test-password-12345'},asResponse:true});assert.equal(response.status,200);sessions.push(response.headers.getSetCookie().map(c=>c.split(';')[0]).join('; '));}return sessions;})();
  const topic={action:'create',requestId:crypto.randomUUID(),title:'Organizzare meglio il catalogo delle fonti',body:'Discutiamo due soluzioni per organizzare le fonti in modo chiaro e accessibile.',options:['Ordine alfabetico','Raggruppamento per paese'],language:'it',category:'sources',method:'single',quorum:50,durationHours:1,discussionHours:0};
  assert.equal((await call(alice,'/api/community/forum',topic)).status,403);
  // PR1 owns a private archive immediately after email confirmation; it has no PR2 privileges.
  const beforeAdmission=await(await call(bob,'/api/community/forum')).json();assert.equal(beforeAdmission.member,null);
  for(const action of [topic,{action:'vote',id:topic.requestId,choices:[0],receipt:crypto.randomUUID(),publicVote:true},{action:'comment',id:topic.requestId,requestId:crypto.randomUUID(),body:'Un intervento prima dell’ammissione.',language:'it'}])assert.equal((await call(bob,'/api/community/forum',action)).status,403);
  assert.equal((await call(bob,'/api/community/chat?room=generale')).status,403);
  const article={id:'private-reader-article',sourceId:'il-manifesto',sourceName:'il manifesto',sourceHomepage:'https://ilmanifesto.it/',link:'https://ilmanifesto.it/private-reader-fixture',title:'Un articolo salvato dal primo livello',excerpt:'Un estratto di prova.',country:'Italia',language:'it',region:'Europa',kind:'giornale',topics:[],categories:[],ideologies:[],score:0,publishedAt:new Date().toISOString(),image:null};
  assert.equal((await call(alice,'/api/bookmarks',{changes:[{kind:'article',key:article.id,deleted:false,article}]})).status,200);

  assert.equal((await call('','/api/bookmarks',{changes:[{kind:'book',key:'manifesto',deleted:false}]})).status,401);
  assert.equal((await call(alice,'/api/bookmarks',{changes:[{kind:'book',key:'manifesto',deleted:false}]})).status,200);
  assert.equal((await call(alice,'/api/reading-progress',{bookId:'manifesto',edition:'it',chapter:0,page:7,scroll:120,revision:'a'.repeat(64)})).status,200);
  assert.equal((await(await call(bob,'/api/bookmarks')).json()).items.length,0);
  const first=application('alice');assert.equal((await call(alice,'/api/community/forum',first)).status,201);
  assert.equal((await call(alice,'/api/community/forum',{action:'bootstrap',code})).status,200);
  for(const [i,cookie] of foundingSessions.entries()){assert.equal((await call(cookie,'/api/community/forum',application(foundingUsers[i]))).status,201);assert.equal((await call(cookie,'/api/community/forum',{action:'bootstrap',code:codes[i+1]})).status,200);}
  assert.equal((await call(alice,'/api/community/forum',topic)).status,201);
  const second=application('bobby');assert.equal((await call(bob,'/api/community/forum',second)).status,201);
  assert.equal((await call(alice,'/api/community/forum',{action:'admit',id:second.requestId,value:1,identityChecked:false})).status,400);
  assert.equal((await call(alice,'/api/community/forum',{action:'admit',id:second.requestId,value:1,identityChecked:true})).status,200);
  for(const cookie of foundingSessions)assert.equal((await call(cookie,'/api/community/forum',{action:'admit',id:second.requestId,value:1,identityChecked:true})).status,200);
  const afterAdmission=await(await call(bob,'/api/community/forum?kind=topic&id='+topic.requestId)).json();assert.equal(afterAdmission.canVote,true);
  assert.equal((await call(bob,'/api/community/forum',{action:'vote',id:topic.requestId,choices:[0],receipt:crypto.randomUUID(),publicVote:true})).status,200);
  assert.equal((await(await call(bob,'/api/community/forum?kind=topic&id='+topic.requestId)).json()).topic.eligible,4);
  assert.equal((await call(alice,'/api/community/forum',{action:'comment',id:topic.requestId,requestId:crypto.randomUUID(),body:'Confrontiamo entrambe le soluzioni nel dettaglio.',language:'it'})).status,201);
  assert.equal((await call(alice,'/api/community/forum',{action:'vote',id:topic.requestId,choices:[1],receipt:crypto.randomUUID(),publicVote:true})).status,200);
  assert.equal((await call(bob,'/api/community/chat',{requestId:crypto.randomUUID(),room:'letture',body:'Una domanda da approfondire nel forum: /?view=teoria'})).status,201);
  const chat=await(await call(alice,'/api/community/chat?room=letture')).json();assert.equal(chat.messages.length,1);assert.match(chat.notice,/memoria del server/);
  const discussion={action:'create',kind:'discussion',requestId:crypto.randomUUID(),title:'Un confronto aperto su cultura e società',body:'Una conversazione generale fra membri, senza soluzioni obbligatorie o scadenze di voto. '+('Un ragionamento articolato, con documenti e punti da discutere. '.repeat(250)),language:'it',category:'general',options:[]};
  assert.equal((await call(bob,'/api/community/forum',discussion)).status,201);
  assert.equal((await call(alice,'/api/community/forum',{action:'comment',id:discussion.requestId,requestId:crypto.randomUUID(),body:'Condividiamo qui le nostre esperienze e letture. '+('Un approfondimento con ragioni e riferimenti. '.repeat(200)),language:'it'})).status,201);
  assert.equal((await call('','/api/community/forum?kind=topic&id='+discussion.requestId)).status,200);
  const privateDiscussion={...discussion,requestId:crypto.randomUUID(),private:true,title:'Una discussione riservata ai membri'};
  assert.equal((await call(bob,'/api/community/forum',privateDiscussion)).status,201);
  for(const kind of ['topic','export'])assert.equal((await call('','/api/community/forum?kind='+kind+'&id='+privateDiscussion.requestId)).status,404);
  const publicBoard=await(await call('','/api/community/forum')).json();
  assert.ok(publicBoard.topics.some((t:{id:string})=>t.id===discussion.requestId));
  assert.ok(!publicBoard.topics.some((t:{id:string})=>t.id===privateDiscussion.requestId));
  await assert.rejects(database.query('UPDATE forum_topics SET private=0 WHERE id=$1',[privateDiscussion.requestId]),/immutable/);
  const closed=await call(alice,'/api/community/forum',undefined,false);assert.equal((await closed.json()).participationOpen,false);
  assert.equal((await call(alice,'/api/community/forum',{action:'comment',id:topic.requestId,requestId:crypto.randomUUID(),body:'Un intervento durante la chiusura.',language:'it'},false)).status,503);
  await identity.settle();await database.close();database=new PGlite(directory);identity=makeAuth();
  const saved=await(await call(alice,'/api/bookmarks')).json();assert.ok(saved.items.some((item:{key:string})=>item.key==='manifesto'));assert.ok(saved.items.some((item:{key:string})=>item.key===article.id));
  const progress=await(await call(alice,'/api/reading-progress?bookId=manifesto&edition=it')).json();assert.equal(Number(progress.items[0].page),7);
  const board=await(await call(bob,'/api/community/forum')).json();assert.equal(board.member.status,'active');assert.equal(board.activeCount,4);
  const detail=await(await call(alice,'/api/community/forum?kind=topic&id='+topic.requestId)).json();assert.equal(detail.comments.length,1);assert.deepEqual(detail.ballot.choices,[1]);
  const conversation=await(await call(bob,'/api/community/forum?kind=topic&id='+discussion.requestId)).json();
  assert.equal((await call('','/api/community/forum?kind=topic&id='+privateDiscussion.requestId)).status,404);
  assert.equal((await call(alice,'/api/community/forum?kind=topic&id='+privateDiscussion.requestId)).status,200);
  assert.ok(conversation.topic.body.length>12000);assert.ok(conversation.comments[0].body.length>3000);assert.equal(conversation.topic.kind,'discussion');assert.equal(conversation.comments.length,1);assert.equal(conversation.canVote,false);
 }finally{await identity.settle();await database.close();await rm(directory,{recursive:true,force:true});}
});
