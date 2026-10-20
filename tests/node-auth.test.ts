import test from 'node:test';
import assert from 'node:assert/strict';
import type pg from 'pg';
import {PGlite} from '@electric-sql/pglite';
import {getMigrations} from 'better-auth/db/migration';
import {createAuth,authSession,accountEndpoint} from '../server/auth';
import {configuration} from '../server/config';
test('independent accounts require verified email, use secure sessions and revoke them after reset',async()=>{
 const database=new PGlite();
 const query=async(sql:string,values:unknown[]=[])=>{const result=await database.query(sql,values);return {rows:result.rows,rowCount:result.affectedRows??result.rows.length,command:sql.trim().split(/\s/)[0].toUpperCase()};};
 const pool={query,connect:async()=>({query,release(){}}),end:async()=>{},options:{}} as unknown as pg.Pool;
 const config=configuration({APP_URL:'https://example.test',DATABASE_URL:'postgres://test:test@localhost/test',AUTH_SECRET:'only-tests-not-production-01234567890123456789',SMTP_HOST:'localhost',SMTP_USER:'test',SMTP_PASSWORD:'test',MAIL_FROM:'test@example.test'});
 const messages:{email:string;url:string;reset:boolean}[]=[];
 const {auth,settle}=createAuth(pool,config,async(email,url,reset)=>{messages.push({email,url,reset});});
 const call=(data?:unknown,cookie='',origin='https://example.test')=>accountEndpoint(auth,new Request('https://example.test/api/auth',{method:data?'POST':'GET',headers:{origin,cookie,'content-type':'application/json'},body:data?JSON.stringify(data):undefined}),undefined,true);
 const credentials={email:'reader@example.test',password:'a-good-test-password-1234'};
 try{
  const migration=await getMigrations(auth.options);await migration.runMigrations();
  assert.equal((await call({action:'signup',...credentials,consent:false})).status,400);
  assert.equal((await call({action:'signup',...credentials,consent:true},'','https://evil.test')).status,403);
  assert.equal((await call({action:'signup',...credentials,consent:true})).status,200);await settle();assert.ok(messages.length);
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
  assert.equal((await call({action:'recover',email:credentials.email})).status,200);await settle();
  const reset=messages.find(m=>m.reset)!;assert.ok(reset);
  const landing=await auth.handler(new Request(reset.url));const target=new URL(landing.headers.get('location')!);const token=target.searchParams.get('token');assert.ok(token);
  const next='a-new-test-password-5678';assert.equal((await call({action:'password',password:next,token})).status,200);
  assert.equal((await(await call(undefined,cookie)).json()).authenticated,false);
  assert.notEqual((await call({action:'password',password:next,token})).status,200);
  assert.equal((await call({action:'signin',...credentials,password:next})).status,200);
  assert.equal((await(await call()).json()).authenticated,false);
 }finally{await settle();await database.close();}
});
