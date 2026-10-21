import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {allowTransactionalMail,allowTransactionalMailClient,resetTransactionalMailLimits,transactionalMailLimitStatus,TRANSACTIONAL_MAIL_LIMITS} from '../server/mail-limits';

test('actual mail delivery is limited per pseudonymous client without storing an IP address',async()=>{
 const pg=new PGlite(),now=Date.now(),client='a'.repeat(64),other='b'.repeat(64),query=async(sql:string,values:unknown[]=[])=>({rows:(await pg.query(sql,values)).rows as Record<string,unknown>[]}),db={query};
 try{
  await pg.exec(await readFile(new URL('../server/migrations/003-auth-limits.sql',import.meta.url),'utf8'));
  for(let sent=0;sent<5;sent++)assert.equal(await allowTransactionalMailClient(db,client,()=>now),true);
  assert.equal(await allowTransactionalMailClient(db,client,()=>now),false);assert.equal(await allowTransactionalMailClient(db,other,()=>now),true);
  const stored=JSON.stringify((await pg.query('SELECT bucket FROM auth_request_limits')).rows);assert.doesNotMatch(stored,/203\.0\.113|@example|reader/i);
 }finally{await pg.close();}
});

test('transactional mail limits persist without storing or reporting recipient addresses',async()=>{
 const pg=new PGlite(),query=async(sql:string,values:unknown[]=[])=>{const result=await pg.query(sql,values);return {rows:result.rows as Record<string,unknown>[],rowCount:result.affectedRows};},db={query};let now=Date.now();
 try{
  await pg.exec(await readFile(new URL('../server/migrations/003-auth-limits.sql',import.meta.url),'utf8'));
  for(let sent=0;sent<TRANSACTIONAL_MAIL_LIMITS.perRecipient;sent++)assert.equal(await allowTransactionalMail(db,'Reader@Example.test','verification',()=>now),true);
  assert.equal(await allowTransactionalMail(db,'reader@example.test','verification',()=>now),false);
  assert.equal(await allowTransactionalMail(db,'reader@example.test','reset',()=>now),true);
  const stored=JSON.stringify((await pg.query('SELECT * FROM auth_request_limits')).rows);assert.doesNotMatch(stored,/reader|@example\.test/i);
  const status=await transactionalMailLimitStatus(db,()=>now);assert.equal(status.hour.used,4);assert.equal(status.day.used,4);assert.equal(status.hour.max,20);assert.equal(status.day.max,100);assert.equal(status.activeRecipientBuckets,2);assert.doesNotMatch(JSON.stringify(status),/@|reader/i);
  now+=TRANSACTIONAL_MAIL_LIMITS.recipientWindowMs+1;assert.equal(await allowTransactionalMail(db,'reader@example.test','verification',()=>now),true);
 }finally{await pg.close();}
});

test('the global transactional cap fails closed, resets by time, and an operator reset removes only mail counters',async()=>{
 const pg=new PGlite(),query=async(sql:string,values:unknown[]=[])=>{const result=await pg.query(sql,values);return {rows:result.rows as Record<string,unknown>[],rowCount:result.affectedRows};},db={query};let now=Date.now();
 try{
  await pg.exec(await readFile(new URL('../server/migrations/003-auth-limits.sql',import.meta.url),'utf8'));
  for(let sent=0;sent<TRANSACTIONAL_MAIL_LIMITS.perHour;sent++)assert.equal(await allowTransactionalMail(db,`reader-${sent}@example.test`,'verification',()=>now),true);
  assert.equal(await allowTransactionalMail(db,'blocked@example.test','verification',()=>now),false);
  await pg.query("INSERT INTO auth_request_limits(bucket,window_start,attempts) VALUES('signin:unrelated',$1,7)",[now]);
  const removed=await resetTransactionalMailLimits(db);assert.ok(removed>0);
  assert.equal(Number(((await pg.query("SELECT attempts FROM auth_request_limits WHERE bucket='signin:unrelated'")).rows[0] as {attempts?:number})?.attempts),7);
  assert.deepEqual(await transactionalMailLimitStatus(db,()=>now),{hour:{used:0,max:20,resetsAt:null},day:{used:0,max:100,resetsAt:null},activeRecipientBuckets:0});
  assert.equal(await allowTransactionalMail(db,'after-reset@example.test','verification',()=>now),true);
  now+=TRANSACTIONAL_MAIL_LIMITS.dayWindowMs+1;assert.equal((await transactionalMailLimitStatus(db,()=>now)).day.used,0);
  const broken={query:async()=>{throw Error('database unavailable');}};await assert.rejects(allowTransactionalMail(broken,'private@example.test','reset',()=>now),/database unavailable/);
 }finally{await pg.close();}
});

test('the 24-hour cap remains below the personal Gmail ceiling even across hourly resets',async()=>{
 const pg=new PGlite(),query=async(sql:string,values:unknown[]=[])=>{const result=await pg.query(sql,values);return {rows:result.rows as Record<string,unknown>[],rowCount:result.affectedRows};},db={query};let now=Date.now(),sent=0;
 try{
  await pg.exec(await readFile(new URL('../server/migrations/003-auth-limits.sql',import.meta.url),'utf8'));
  while(sent<TRANSACTIONAL_MAIL_LIMITS.perDay){
   for(let inHour=0;inHour<TRANSACTIONAL_MAIL_LIMITS.perHour&&sent<TRANSACTIONAL_MAIL_LIMITS.perDay;inHour++,sent++)assert.equal(await allowTransactionalMail(db,`reader-${sent}@example.test`,'verification',()=>now),true);
   if(sent<TRANSACTIONAL_MAIL_LIMITS.perDay)now+=TRANSACTIONAL_MAIL_LIMITS.hourWindowMs+1;
  }
  assert.equal(await allowTransactionalMail(db,'over-daily-cap@example.test','verification',()=>now),false);
  assert.equal((await transactionalMailLimitStatus(db,()=>now)).day.used,TRANSACTIONAL_MAIL_LIMITS.perDay);
 }finally{await pg.close();}
});
