import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {PostgresDatabase,type Connections} from '../server/database';
import {FORUM_APPLICATION_RETENTION_INTERVAL_MS,FORUM_APPLICATION_RETENTION_MS,purgeForumApplications,startForumApplicationRetention} from '../server/forum-retention';

async function setup(){
 const pg=new PGlite();
 await pg.exec(await readFile(new URL('../server/migrations/001-schema.sql',import.meta.url),'utf8'));
 await pg.exec(await readFile(new URL('../server/migrations/002-forum-integrity.sql',import.meta.url),'utf8'));
 const connection={query:async(sql:string,values:unknown[]=[])=>{const result=await pg.query(sql,values);return {rows:result.rows as Record<string,unknown>[],rowCount:result.affectedRows};}};
 const pool={...connection,connect:async()=>connection} satisfies Connections;
 return {pg,db:new PostgresDatabase(pool)};
}

test('forum application retention deletes only stale private applications and related review rows',async()=>{
 const {pg,db}=await setup(),now=Date.now(),cutoff=now-FORUM_APPLICATION_RETENTION_MS;
 const member=async(id:string,status:string,deadline:number)=>pg.query(`INSERT INTO forum_members
  (id,owner_key,alias,alias_key,intro,identity_name,identity_kind,identity_url,language,status,created_at,deadline,admitted_at)
  VALUES ($1,$2,$3,$3,'Presentazione','Nome','person','','it',$4,$5,$6,$7)`,[id,'owner-'+id,id,status,deadline-1000,deadline,status==='active'?deadline:null]);
 try{
  await member('reviewer','active',cutoff-1000);
  await member('old-pending','pending',cutoff-1);
  await member('recent-pending','pending',cutoff+1);
  await member('old-rejected','rejected',cutoff+10_000);
  await member('recent-rejected','rejected',cutoff-10_000);
  await pg.query("INSERT INTO forum_events(kind,entity_id,detail,created_at) VALUES ('membership','old-rejected','{\"from\":\"pending\",\"to\":\"rejected\"}',$1),('membership','recent-rejected','{\"from\":\"pending\",\"to\":\"rejected\"}',$2)",[cutoff-1,cutoff+1]);
  for(const candidate of ['old-pending','old-rejected']){
   await pg.query('INSERT INTO forum_admission_electorate(candidate_id,member_id) VALUES ($1,$2)',[candidate,'reviewer']);
   await pg.query('INSERT INTO forum_admission_votes(candidate_id,member_id,value,identity_checked,created_at) VALUES ($1,$2,1,1,$3)',[candidate,'reviewer',cutoff-2]);
  }

  assert.equal(await purgeForumApplications(db,now),2);
  assert.deepEqual((await pg.query<{id:string}>('SELECT id FROM forum_members ORDER BY id')).rows.map(row=>row.id),['recent-pending','recent-rejected','reviewer']);
  assert.equal((await pg.query<{count:number}>('SELECT count(*)::int AS count FROM forum_admission_votes')).rows[0].count,0);
  assert.equal((await pg.query<{count:number}>('SELECT count(*)::int AS count FROM forum_admission_electorate')).rows[0].count,0);
  const audit=await pg.query<{detail:string}>("SELECT detail FROM forum_events WHERE entity_id IN ('old-pending','old-rejected') ORDER BY sequence");
  assert.ok(audit.rows.length>0);
  assert.doesNotMatch(JSON.stringify(audit.rows),/Presentazione|owner-|https?:\/\//);
  assert.equal(await purgeForumApplications(db,now),0);
 }finally{await pg.close();}
});

test('forum retention starts immediately and schedules an independent daily run',()=>{
 let runs=0,scheduled:undefined|(()=>void),delay=0,unref=false;
 startForumApplicationRetention(()=>{runs++;},(callback,interval)=>{scheduled=callback;delay=interval;return {unref(){unref=true;}};});
 assert.equal(runs,1);
 assert.equal(delay,FORUM_APPLICATION_RETENTION_INTERVAL_MS);
 assert.equal(unref,true);
 assert.ok(scheduled);scheduled();assert.equal(runs,2);
});
