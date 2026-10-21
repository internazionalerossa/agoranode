import test from 'node:test';
import assert from 'node:assert/strict';
import type pg from 'pg';
import {PGlite} from '@electric-sql/pglite';
import {getMigrations} from 'better-auth/db/migration';
import {readdir,readFile} from 'node:fs/promises';
import {configuration} from '../server/config';
import {accountEndpoint,createAuth} from '../server/auth';
import type {Connections} from '../server/database';

test('the PR2 signup choice creates only PR1 and continues to explicit Facebook onboarding',async()=>{
 const database=new PGlite();
 const query=async(sql:string,values:unknown[]=[])=>{const result=await database.query(sql,values);return {rows:result.rows as Record<string,unknown>[],rowCount:result.affectedRows??result.rows.length};};
 const connection={query,release(){}},connections={query,connect:async()=>connection} as Connections;
 const pool={...connections,end:async()=>{},options:{}} as unknown as pg.Pool;
 const config=configuration({APP_URL:'https://example.test',DATABASE_URL:'postgres://test:test@localhost/test',AUTH_SECRET:'direct-pr2-test-secret-01234567890123456789',MAIL_TRANSPORT:'smtp',SMTP_HOST:'localhost',SMTP_USER:'test',SMTP_PASSWORD:'test',MAIL_FROM:'test@example.test',REGISTRATIONS_OPEN:'true',FORUM_OPEN:'true',FACEBOOK_CLIENT_ID:'facebook-client-test',FACEBOOK_CLIENT_SECRET:'facebook-secret-test'});
 const messages:{email:string;url:string}[]=[];
 const identity=createAuth(pool,config,async(email,url)=>{messages.push({email,url});},async()=>true);
 const call=(data?:unknown,cookie='',endpointConfig=config)=>accountEndpoint(identity.auth,new Request(config.origin+'/api/auth',{method:data?'POST':'GET',headers:{origin:config.origin,cookie,'content-type':'application/json'},body:data?JSON.stringify(data):undefined}),connections,true,endpointConfig);
 const password='a-direct-pr2-test-password-1234',credentials={email:'candidate@example.test',password};
 try{
  for(const filename of (await readdir(new URL('../server/migrations',import.meta.url))).filter(name=>name.endsWith('.sql')).sort())await database.exec(await readFile(new URL('../server/migrations/'+filename,import.meta.url),'utf8'));
  await(await getMigrations(identity.auth.options)).runMigrations();

  const state=await(await call()).json();assert.equal(state.pr2OnboardingAvailable,true);
  assert.equal((await call({action:'signup',...credentials,consent:true,pr2Onboarding:'yes'})).status,400);
  assert.equal((await call({action:'signup',...credentials,consent:true,pr2Application:{alias:'Non conservare'}})).status,400);
  assert.equal((await call({action:'signup',...credentials,consent:true,pr2Onboarding:true},'',{...config,forumOpen:false})).status,503);
  assert.equal((await query('SELECT id FROM "user"')).rows.length,0);

  const signup=await call({action:'signup',...credentials,consent:true,pr2Onboarding:true});
  assert.equal(signup.status,200);const signupBody=await signup.text();assert.match(signupBody,/domanda non è ancora stata inviata/i);assert.doesNotMatch(signupBody,/pr2_application|Non conservare/);
  await identity.settle();assert.equal(messages.length,1);
  const verification=new URL(messages[0].url);assert.equal(verification.searchParams.get('callbackURL'),config.origin+'/account?pr2=1&return_to=%2F%3Fview%3Dpartecipa');
  const columns=await query("SELECT column_name FROM information_schema.columns WHERE table_name='user'");assert.equal(columns.rows.some(row=>row.column_name==='pr2_application'),false);
  assert.equal((await query('SELECT id FROM forum_members')).rows.length,0);
  assert.equal((await call({action:'signin',...credentials})).status,403);
  assert.notEqual((await identity.auth.handler(new Request(messages[0].url))).status,400);

  const signed=await call({action:'signin',...credentials});assert.equal(signed.status,200);const signedBody=await signed.clone().json();assert.equal(Object.hasOwn(signedBody,'pr2ApplicationStatus'),false);
  const cookie=signed.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');assert.ok(cookie);
  const signedState=await(await call(undefined,cookie)).json();assert.equal(signedState.authenticated,true);assert.equal(signedState.pr2OnboardingAvailable,true);
  assert.equal((await query('SELECT id FROM forum_members')).rows.length,0);
 }finally{await identity.settle();await database.close();}
});
