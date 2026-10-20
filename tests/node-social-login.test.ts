import test from 'node:test';
import assert from 'node:assert/strict';
import type pg from 'pg';
import {PGlite} from '@electric-sql/pglite';
import {getMigrations} from 'better-auth/db/migration';
import {createAuth,accountEndpoint} from '../server/auth';
import {configuration} from '../server/config';
import {createAccountMailer} from '../server/mail';
test('social-only access starts OAuth with consent, blocks email and keeps the registration gate',async()=>{
 const db=new PGlite();
 const query=async(sql:string,values:unknown[]=[])=>{const r=await db.query(sql,values);return {rows:r.rows,rowCount:r.affectedRows??r.rows.length,command:sql.trim().split(/\s/)[0].toUpperCase()};};
 const pool={query,connect:async()=>({query,release(){}}),options:{}} as unknown as pg.Pool;
 const config=configuration({APP_URL:'https://example.test',DATABASE_URL:'postgres://test:test@localhost/test',AUTH_SECRET:'only-tests-not-production-01234567890123456789',DISCORD_CLIENT_ID:'test-client',DISCORD_CLIENT_SECRET:'test-secret'});
 let sent=0;const {auth,settle}=createAuth(pool,config,async()=>{sent++;});
 const call=(data:unknown,open=true,origin=config.origin)=>accountEndpoint(auth,new Request(config.origin+'/api/auth',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(data)}),undefined,open,config);
 try{
  assert.equal(config.mailTransport,'none');assert.equal(config.mailFrom,'');
  const m=await getMigrations(auth.options);await m.runMigrations();
  for(const action of ['signup','signin','recover','password'])assert.equal((await call({action,email:'reader@example.test',password:'test-password-1234'})).status,400);
  assert.equal((await call({action:'social',provider:'discord',consent:true},false)).status,503);
  assert.equal((await call({action:'social',provider:'discord'})).status,400);
  assert.equal((await call({action:'social',provider:'unknown',consent:true})).status,400);
  assert.equal((await call({action:'social',provider:'discord',consent:true},true,'https://evil.test')).status,403);
  const start=await call({action:'social',provider:'discord',consent:true});assert.equal(start.status,200);
  const target=new URL((await start.json()).url);assert.equal(target.hostname,'discord.com');assert.ok(target.searchParams.get('state'));assert.ok(start.headers.getSetCookie().length);
  const direct=await auth.handler(new Request(config.origin+'/api/identity/sign-up/email',{method:'POST',headers:{origin:config.origin,'content-type':'application/json'},body:JSON.stringify({email:'reader@example.test',password:'test-password-1234',name:'Reader'})}));assert.notEqual(direct.status,200);
  await assert.rejects(createAccountMailer(config,async()=>{sent++;return new Response();})('reader@example.test','https://example.test'),/disabled/);
  await settle();assert.equal(sent,0);
 }finally{await db.close();}
});
