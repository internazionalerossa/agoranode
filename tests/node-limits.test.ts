import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {allowAuthAttempt} from '../server/auth-limits';
import {clientRateKey} from '../server/client-rate-key';
test('authentication counters persist across callers, normalize email and expire without storing email text',async()=>{
 const pg=new PGlite();let now=Date.now();
 const connection={query:async(sql:string,values:unknown[]=[])=>({rows:(await pg.query(sql,values)).rows as Record<string,unknown>[]})};
 try{
  await pg.exec(await readFile(new URL('../server/migrations/003-auth-limits.sql',import.meta.url),'utf8'));
  for(let i=0;i<20;i++)assert.equal(await allowAuthAttempt(connection,'signin','Reader@example.test',{clock:()=>now}),true);
  assert.equal(await allowAuthAttempt(connection,'signin','reader@example.test',{clock:()=>now}),false);
  assert.equal(await allowAuthAttempt(connection,'signin','different@example.test',{clock:()=>now}),true);
  const stored=JSON.stringify((await pg.query('SELECT * FROM auth_request_limits')).rows);assert.doesNotMatch(stored,/@example\.test|password/);
  now+=900001;assert.equal(await allowAuthAttempt(connection,'signin','reader@example.test',{clock:()=>now}),true);
  for(let i=0;i<119;i++)assert.equal(await allowAuthAttempt(connection,'signout','',{clock:()=>now,clientKey:i.toString(16).padStart(64,'0')}),true);
  assert.equal(await allowAuthAttempt(connection,'signout','',{clock:()=>now,clientKey:'f'.repeat(64)}),false);
  now+=60001;assert.equal(await allowAuthAttempt(connection,'signout','',{clock:()=>now}),true);
 }finally{await pg.close();}
});

test('a noisy client is blocked before consuming the shared authentication allowance',async()=>{
 const pg=new PGlite(),now=Date.now(),clientKey='c'.repeat(64),otherClient='d'.repeat(64);
 const connection={query:async(sql:string,values:unknown[]=[])=>({rows:(await pg.query(sql,values)).rows as Record<string,unknown>[]})};
 try{
  await pg.exec(await readFile(new URL('../server/migrations/003-auth-limits.sql',import.meta.url),'utf8'));
  for(let i=0;i<30;i++)assert.equal(await allowAuthAttempt(connection,'signin',`reader-${i}@example.test`,{clock:()=>now,clientKey}),true);
  assert.equal(await allowAuthAttempt(connection,'signin','reader-31@example.test',{clock:()=>now,clientKey}),false);
  assert.equal(Number(((await pg.query("SELECT attempts FROM auth_request_limits WHERE bucket='global'")).rows[0] as {attempts:number}).attempts),30);
  assert.equal(await allowAuthAttempt(connection,'signin','other@example.test',{clock:()=>now,clientKey:otherClient}),true);
 }finally{await pg.close();}
});

test('signup and recovery share a pseudonymous per-client mail budget even across different addresses',async()=>{
 const pg=new PGlite(),now=Date.now(),clientKey='a'.repeat(64),otherClient='b'.repeat(64);
 const connection={query:async(sql:string,values:unknown[]=[])=>({rows:(await pg.query(sql,values)).rows as Record<string,unknown>[]})};
 try{
  await pg.exec(await readFile(new URL('../server/migrations/003-auth-limits.sql',import.meta.url),'utf8'));
  for(let i=0;i<5;i++)assert.equal(await allowAuthAttempt(connection,i%2?'recover':'signup',`person-${i}@example.test`,{clock:()=>now,clientKey}),true);
  assert.equal(await allowAuthAttempt(connection,'signup','sixth@example.test',{clock:()=>now,clientKey}),false);
  assert.equal(await allowAuthAttempt(connection,'recover','other@example.test',{clock:()=>now,clientKey:otherClient}),true);
  const stored=JSON.stringify((await pg.query('SELECT bucket FROM auth_request_limits')).rows);
  assert.doesNotMatch(stored,/person-|sixth|other@|203\.0\.113/);
 }finally{await pg.close();}
});

test('client rate keys use the right-most untrusted forwarded address and never expose it',()=>{
 const secret='test-only-client-key-secret';
 const expected=clientRateKey(new Headers({'x-forwarded-for':'203.0.113.8, 172.20.0.1'}),secret);
 const spoofed=clientRateKey(new Headers({'x-forwarded-for':'198.51.100.99, 203.0.113.8, 172.20.0.1'}),secret);
 assert.equal(spoofed,expected);assert.match(expected,/^[0-9a-f]{64}$/);assert.doesNotMatch(expected,/203\.0\.113/);
 assert.notEqual(clientRateKey(new Headers({'x-forwarded-for':'203.0.113.9, 172.20.0.1'}),secret),expected);
});
