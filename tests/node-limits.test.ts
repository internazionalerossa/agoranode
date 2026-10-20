import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {allowAuthAttempt} from '../server/auth-limits';
test('authentication counters persist across callers, normalize email and expire without storing email text',async()=>{
 const pg=new PGlite();let now=Date.now();
 const connection={query:async(sql:string,values:unknown[]=[])=>({rows:(await pg.query(sql,values)).rows as Record<string,unknown>[]})};
 try{
  await pg.exec(await readFile(new URL('../server/migrations/003-auth-limits.sql',import.meta.url),'utf8'));
  for(let i=0;i<20;i++)assert.equal(await allowAuthAttempt(connection,'signin','Reader@example.test',()=>now),true);
  assert.equal(await allowAuthAttempt(connection,'signin','reader@example.test',()=>now),false);
  assert.equal(await allowAuthAttempt(connection,'signin','different@example.test',()=>now),true);
  const stored=JSON.stringify((await pg.query('SELECT * FROM auth_request_limits')).rows);assert.doesNotMatch(stored,/@example\.test|password/);
  now+=900001;assert.equal(await allowAuthAttempt(connection,'signin','reader@example.test',()=>now),true);
  for(let i=0;i<119;i++)assert.equal(await allowAuthAttempt(connection,'signout','',()=>now),true);
  assert.equal(await allowAuthAttempt(connection,'signout','',()=>now),false);
  now+=60001;assert.equal(await allowAuthAttempt(connection,'signout','',()=>now),true);
 }finally{await pg.close();}
});
