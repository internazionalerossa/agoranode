import test from 'node:test';
import assert from 'node:assert/strict';
import type pg from 'pg';
import {PGlite} from '@electric-sql/pglite';
import {getMigrations} from 'better-auth/db/migration';
import {readFile} from 'node:fs/promises';
import {createAuth,authSession,accountEndpoint} from '../server/auth';
import type {Auth} from '../server/auth';
import {configuration} from '../server/config';
import {createHash} from 'node:crypto';
test('independent accounts require verified email, use secure sessions and revoke them after reset',async()=>{
 const database=new PGlite();
 const query=async(sql:string,values:unknown[]=[])=>{const result=await database.query(sql,values);return {rows:result.rows,rowCount:result.affectedRows??result.rows.length,command:sql.trim().split(/\s/)[0].toUpperCase()};};
 const pool={query,connect:async()=>({query,release(){}}),end:async()=>{},options:{}} as unknown as pg.Pool;
 const accessCode='pr1-test-access-code-01234567890123456789';
 const config=configuration({APP_URL:'https://example.test',DATABASE_URL:'postgres://test:test@localhost/test',AUTH_SECRET:'only-tests-not-production-01234567890123456789',MAIL_TRANSPORT:'smtp',SMTP_HOST:'localhost',SMTP_USER:'test',SMTP_PASSWORD:'test',MAIL_FROM:'test@example.test',FACEBOOK_CLIENT_ID:'facebook-client',FACEBOOK_CLIENT_SECRET:'facebook-secret',ACCOUNT_ACCESS_HASH:createHash('sha256').update(accessCode).digest('hex')});
 const messages:{email:string;url:string;reset:boolean}[]=[],permits:{email:string;purpose:string}[]=[];
 const {auth,settle}=createAuth(pool,config,async(email,url,reset)=>{messages.push({email,url,reset});},async(email,purpose)=>{permits.push({email,purpose});return true;});
 const call=(data?:unknown,cookie='',origin='https://example.test')=>accountEndpoint(auth,new Request('https://example.test/api/auth',{method:data?'POST':'GET',headers:{origin,cookie,'content-type':'application/json'},body:data?JSON.stringify(data):undefined}),undefined,true,config);
 const credentials={email:'reader@example.test',password:'a-good-test-password-1234'};
 try{
  await database.exec(await readFile(new URL('../server/migrations/003-auth-limits.sql',import.meta.url),'utf8'));const migration=await getMigrations(auth.options);await migration.runMigrations();
  const socialLogin=await call({action:'social',provider:'facebook',consent:true});assert.equal(socialLogin.status,400);assert.match((await socialLogin.json()).error,/Accedi a PR1 con email/);
  assert.equal((await call({action:'signup',...credentials,consent:false})).status,400);
  assert.equal((await call({action:'signup',...credentials,consent:true},'','https://evil.test')).status,403);
  assert.equal((await call({action:'signup',...credentials,consent:true})).status,403);
  assert.equal((await query('SELECT id FROM "user"')).rows.length,0);
  assert.equal((await call({action:'signup',...credentials,accessCode,consent:true})).status,200);await settle();assert.ok(messages.length);assert.equal(permits[0]?.purpose,'verification');
  assert.equal((await call({action:'signin',...credentials})).status,403);
  const verification=messages.find(m=>!m.reset)!;
  const verified=await auth.handler(new Request(verification.url));assert.ok([200,302,303].includes(verified.status));
  const signed=await call({action:'signin',...credentials});assert.equal(signed.status,200);
  const cookies=signed.headers.getSetCookie();assert.ok(cookies.length);assert.ok(cookies.every(c=>/httponly/i.test(c)&&/secure/i.test(c)&&/samesite=lax/i.test(c)));
  const cookie=cookies.map(c=>c.split(';')[0]).join('; ');
  assert.equal((await(await call(undefined,cookie)).json()).authenticated,true);
  // Normal reading and forum polling must not exhaust the public authentication rate limit.
  for(let i=0;i<40;i++)assert.ok((await authSession(auth,new Request('https://example.test/api/bookmarks',{headers:{cookie}}))).user);

  const forged=await authSession(auth,new Request('https://example.test/api/auth',{headers:{'x-user-id':'forged','x-oai-user-id':'forged'}}));assert.equal(forged.user,null);
  assert.equal((await call({action:'recover',email:credentials.email})).status,403);
  assert.equal((await call({action:'recover',email:credentials.email,accessCode})).status,200);await settle();assert.equal(permits.at(-1)?.purpose,'reset');
  const reset=messages.find(m=>m.reset)!;assert.ok(reset);
  const landing=await auth.handler(new Request(reset.url));const target=new URL(landing.headers.get('location')!);const token=target.searchParams.get('token');assert.ok(token);
  const next='a-new-test-password-5678';assert.equal((await call({action:'password',password:next,token})).status,200);
  assert.equal((await(await call(undefined,cookie)).json()).authenticated,false);
  assert.notEqual((await call({action:'password',password:next,token})).status,200);
  assert.equal((await call({action:'signin',...credentials,password:next})).status,200);
  assert.equal((await(await call()).json()).authenticated,false);

  const blockedMessages:string[]=[],blocked=createAuth(pool,config,async email=>{blockedMessages.push(email);},async()=>false),originalError=console.error,logs:string[]=[];
  console.error=(...parts:unknown[])=>{logs.push(parts.map(String).join(' '));};
  try{
   const denied=await accountEndpoint(blocked.auth,new Request('https://example.test/api/auth',{method:'POST',headers:{origin:'https://example.test','content-type':'application/json'},body:JSON.stringify({action:'signup',email:'quota-test@example.test',password:'another-good-test-password-1234',accessCode,consent:true})}),undefined,true,config);
   assert.equal(denied.status,200);await blocked.settle();assert.deepEqual(blockedMessages,[]);assert.ok(logs.some(line=>line.includes('delivery limit reached')));assert.doesNotMatch(logs.join('\n'),/quota-test|@example\.test/);
  }finally{console.error=originalError;await blocked.settle();}
 }finally{await settle();await database.close();}
});

test('a verified provider-only legacy session cannot enter PR1 without a credential account',async()=>{
 const response=Response.json({user:{id:'legacy',email:'legacy@example.test',emailVerified:true}});
 const fake=(providerId:string)=>({api:{getSession:async()=>response.clone(),listUserAccounts:async()=>[{providerId}]}}) as unknown as Auth;
 assert.equal((await authSession(fake('facebook'),new Request('https://example.test/api/auth'))).user,null);
 assert.equal((await authSession(fake('discord'),new Request('https://example.test/api/auth'))).user,null);
 assert.equal((await authSession(fake('credential'),new Request('https://example.test/api/auth'))).user?.id,'legacy');
});

test('account responses do not wait for a slow SMTP delivery job',async()=>{
 const database=new PGlite(),query=async(sql:string,values:unknown[]=[])=>{const result=await database.query(sql,values);return {rows:result.rows,rowCount:result.affectedRows??result.rows.length,command:sql.trim().split(/\s/)[0].toUpperCase()};};
 const pool={query,connect:async()=>({query,release(){}}),end:async()=>{},options:{}} as unknown as pg.Pool;
 const config=configuration({APP_URL:'https://example.test',DATABASE_URL:'postgres://test:test@localhost/test',AUTH_SECRET:'background-mail-test-secret-01234567890123456789',MAIL_TRANSPORT:'smtp',SMTP_HOST:'localhost',SMTP_USER:'test',SMTP_PASSWORD:'test',MAIL_FROM:'test@example.test'});
 let release!:()=>void,started!:()=>void;const blocked=new Promise<void>(resolve=>{release=resolve;}),began=new Promise<void>(resolve=>{started=resolve;});
 const service=createAuth(pool,config,async()=>{started();await blocked;},async()=>true);
 try{
  await database.exec(await readFile(new URL('../server/migrations/003-auth-limits.sql',import.meta.url),'utf8'));await(await getMigrations(service.auth.options)).runMigrations();
  const request=new Request(config.origin+'/api/auth',{method:'POST',headers:{origin:config.origin,'content-type':'application/json','x-forwarded-for':'203.0.113.9'},body:JSON.stringify({action:'signup',email:'slow@example.test',password:'slow-mail-password-1234',consent:true})});
  const response=await Promise.race([accountEndpoint(service.auth,request,undefined,true,config),new Promise<null>(resolve=>setTimeout(()=>resolve(null),1000))]);
  assert.ok(response);assert.equal(response.status,200);await began;release();await service.settle();
 }finally{release?.();await service.settle();await database.close();}
});
