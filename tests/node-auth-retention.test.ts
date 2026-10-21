import test from 'node:test';
import assert from 'node:assert/strict';
import type pg from 'pg';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {getMigrations} from 'better-auth/db/migration';
import {configuration} from '../server/config';
import {createAuth} from '../server/auth';
import {PostgresDatabase} from '../server/database';
import {purgeAuthenticationState,AUTH_LIMIT_RETENTION_MS,FACEBOOK_GRANT_RETENTION_MS,UNVERIFIED_ACCOUNT_RETENTION_MS} from '../server/auth-retention';

test('authentication retention removes expired artifacts, abandoned grants and only empty stale unverified users',async()=>{
 const pgdb=new PGlite(),query=async(sql:string,values:unknown[]=[])=>{const result=await pgdb.query(sql,values);return {rows:result.rows as Record<string,unknown>[],rowCount:result.affectedRows};};
 const connection={query,release(){}},pool={query,connect:async()=>connection,end:async()=>{},options:{}} as unknown as pg.Pool;
 const config=configuration({APP_URL:'https://example.test',DATABASE_URL:'postgres://test:test@localhost/test',AUTH_SECRET:'auth-retention-test-secret-01234567890123456789',MAIL_TRANSPORT:'smtp',SMTP_HOST:'localhost',SMTP_USER:'test',SMTP_PASSWORD:'test',MAIL_FROM:'test@example.test'});
 try{
  await pgdb.exec(await readFile(new URL('../server/migrations/001-schema.sql',import.meta.url),'utf8'));await pgdb.exec(await readFile(new URL('../server/migrations/003-auth-limits.sql',import.meta.url),'utf8'));
  const {auth}=createAuth(pool,config,undefined,async()=>true);await(await getMigrations(auth.options)).runMigrations();
  const now=Date.now();
  await query(`INSERT INTO "user" (id,name,email,"emailVerified","createdAt","updatedAt") VALUES ('social','Social','social@example.test',true,NOW(),NOW()),('local','Local','local@example.test',true,NOW(),NOW()),('unverified-old','Old','old@example.test',false,TO_TIMESTAMP($1 / 1000.0),NOW()),('unverified-new','New','new@example.test',false,NOW(),NOW()),('unverified-data','Data','data@example.test',false,TO_TIMESTAMP($1 / 1000.0),NOW()),('facebook-old','Facebook old','fb-old@example.test',true,NOW(),NOW()),('facebook-new','Facebook new','fb-new@example.test',true,NOW(),NOW())`,[now-UNVERIFIED_ACCOUNT_RETENTION_MS-1]);
  await query(`INSERT INTO "account" (id,"accountId","providerId","userId",password,"createdAt","updatedAt") VALUES ('social-account','social','facebook','social',NULL,NOW(),NOW()),('local-account','local','credential','local','hash',NOW(),NOW()),('old-credential','old','credential','unverified-old','hash',NOW(),NOW()),('new-credential','new','credential','unverified-new','hash',NOW(),NOW()),('data-credential','data','credential','unverified-data','hash',NOW(),NOW()),('fb-old-credential','fb-old','credential','facebook-old','hash',NOW(),NOW()),('fb-old-provider','fb-old','facebook','facebook-old',NULL,NOW(),TO_TIMESTAMP($1 / 1000.0)),('fb-new-credential','fb-new','credential','facebook-new','hash',NOW(),NOW()),('fb-new-provider','fb-new','facebook','facebook-new',NULL,NOW(),NOW())`,[now-FACEBOOK_GRANT_RETENTION_MS-1]);
  await query(`INSERT INTO bookmarks(owner_id,kind,item_key,payload,updated_at) VALUES ('unverified-data','article','kept','{}',$1)`,[now]);
  await query(`INSERT INTO "session" (id,"expiresAt",token,"createdAt","updatedAt","userId") VALUES ('social-session',NOW()+INTERVAL '1 day','social-token',NOW(),NOW(),'social'),('expired-session',NOW()-INTERVAL '1 day','expired-token',NOW(),NOW(),'local'),('active-session',NOW()+INTERVAL '1 day','active-token',NOW(),NOW(),'local')`);
  await query(`INSERT INTO "verification" (id,identifier,value,"expiresAt","createdAt","updatedAt") VALUES ('expired-verification','expired','x',NOW()-INTERVAL '1 day',NOW(),NOW()),('active-verification','active','y',NOW()+INTERVAL '1 day',NOW(),NOW())`);
  await query(`INSERT INTO auth_request_limits(bucket,window_start,attempts) VALUES ('old',$1,1),('new',$2,1)`,[now-AUTH_LIMIT_RETENTION_MS-1,now]);
  const result=await purgeAuthenticationState(new PostgresDatabase({...connection,connect:async()=>connection}),now);assert.deepEqual(result,{sessions:2,verifications:1,limits:1,unverifiedUsers:1,facebookGrants:1});
  assert.deepEqual((await query('SELECT id FROM "session" ORDER BY id')).rows,[{id:'active-session'}]);assert.equal((await query('SELECT id FROM "user"')).rows.length,6);assert.deepEqual((await query('SELECT id FROM "verification"')).rows,[{id:'active-verification'}]);assert.deepEqual((await query(`SELECT id FROM "account" WHERE "providerId"='facebook' ORDER BY id`)).rows,[{id:'fb-new-provider'},{id:'social-account'}]);assert.deepEqual((await query(`SELECT id FROM "user" WHERE id LIKE 'unverified-%' ORDER BY id`)).rows,[{id:'unverified-data'},{id:'unverified-new'}]);
 }finally{await pgdb.close();}
});
