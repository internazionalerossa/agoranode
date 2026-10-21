import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {persistentAuthRateLimitStorage} from '../server/auth-rate-limit-storage';

test('Better Auth rate limits are atomic, expiring and HMAC-pseudonymized',async()=>{
 const pg=new PGlite(),query=async(sql:string,values:unknown[]=[])=>({rows:(await pg.query(sql,values)).rows as Record<string,unknown>[]}),db={query},raw='203.0.113.44|/sign-in/email';let now=Date.now();
 try{
  await pg.exec(await readFile(new URL('../server/migrations/003-auth-limits.sql',import.meta.url),'utf8'));
  const storage=persistentAuthRateLimitStorage(db,'rate-limit-test-secret',()=>now);
  const simultaneous=await Promise.all(Array.from({length:10},()=>storage.consume(raw,{window:60,max:5})));
  assert.equal(simultaneous.filter(item=>item.allowed).length,5);assert.ok(simultaneous.filter(item=>!item.allowed).every(item=>item.retryAfter===60));
  const stored=JSON.stringify((await pg.query('SELECT * FROM auth_request_limits')).rows);assert.doesNotMatch(stored,/203\.0\.113|sign-in|email/);assert.match(stored,/ba:[0-9a-f]{64}/);
  now+=60001;assert.equal((await storage.consume(raw,{window:60,max:5})).allowed,true);
 }finally{await pg.close();}
});
