import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Connections} from '../server/database';
import {newNodeDraft} from '../app/lib/node-studio-model';
import {handleAgoraNodeFoundations,approvedFoundationSeed} from '../server/agora-node-foundations';

test('new-node founding is voted only by Agora PR2/PR3 with an immutable blueprint',async()=>{
 const pg=new PGlite();
 try{
  for(const name of ['014-federation-pr3.sql','023-agora-node-foundation.sql'])
   await pg.exec(await readFile(new URL('../server/migrations/'+name,import.meta.url),'utf8'));
  const connection={query:async(sql:string,args:unknown[]=[])=>{
   const result=await pg.query(sql,args);
   return {rows:result.rows as Record<string,unknown>[],rowCount:result.affectedRows};
  }};
  const db={...connection,connect:async()=>connection} satisfies Connections;
  const now=1800000000000;
  const url='https://agoranode.example/api/agora/foundations';
  const post=(payload:unknown,origin='https://agoranode.example')=>
   new Request(url,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(payload)});
  const call=(req:Request,user:string|null)=>handleAgoraNodeFoundations(req,db,user,now);
  const input={action:'propose',draft:newNodeDraft('create-node','astronomia')};
  assert.equal((await call(post(input),null)).status,401);
  assert.equal((await call(post(input),'reader-pr1')).status,403);
  assert.equal((await call(post(input,'https://evil.example'),'alice')).status,403);
  assert.equal((await call(post({...input,role:'pr3'}),'alice')).status,400);

  await pg.query('INSERT INTO federation_nodes(node_id,display_name,admitted_by_decision_digest,admitted_at) VALUES($1,$2,$3,$4)',
   ['agora','Agorà','sha256:'+'a'.repeat(64),1]);
  await pg.query('INSERT INTO federation_node_keys(node_id,key_id,public_key_spki_base64,valid_from,admitted_by_decision_digest) VALUES($1,$2,$3,$4,$5)',
   ['agora','sha256:'+'b'.repeat(64),'A'.repeat(64),1,'sha256:'+'a'.repeat(64)]);
  const admit=async(user:string,suffix:string)=>{
   await pg.query('INSERT INTO federation_pr2_electors(owner_key,actor_id,source_node_id,source_membership_id,voter_key_id,voter_public_key_spki_base64,public_alias,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
    [user,'actor-'+user,'agora','sha256:'+suffix.repeat(64),'sha256:'+suffix.repeat(64),'A'.repeat(64),user,1]);
   await pg.query('INSERT INTO federation_pr2_attestations(attestation_sha256,owner_key,source_node_id,source_membership_id,issuer_key_id,proof_json,attestation_json,valid_from,valid_until,accepted_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
    ['sha256:'+suffix.repeat(64),user,'agora','sha256:'+suffix.repeat(64),'sha256:'+'b'.repeat(64),
     JSON.stringify({state:'active'}),'{}',now-1000,now+100000,now-1000]);
  };
  await admit('alice','c');
  const created=await call(post(input),'alice');
  assert.equal(created.status,201);
  const first=await created.json() as {id:string;digest:string;electorateSize:number;status:string};
  assert.equal(first.electorateSize,1);
  assert.equal(first.status,'pending');
  assert.match(first.digest,/^sha256:[a-f0-9]{64}$/);
  await assert.rejects(pg.query('UPDATE agora_node_foundations SET space_id=$1',['geologia']),/frozen node foundation/);
  await admit('bob','d');
  const blocked=await call(post({action:'vote',proposalId:first.id,choice:'yes'}),'bob');
  assert.equal(blocked.status,403);
  const approved=await call(post({action:'vote',proposalId:first.id,choice:'yes'}),'alice');
  assert.equal(approved.status,200);
  assert.equal((await approved.json()).status,'approved');
  assert.equal((await call(post({action:'vote',proposalId:first.id,choice:'yes'}),'alice')).status,409);
  const seed=await approvedFoundationSeed(db,first.id);
  assert.equal(seed.spaceId,'astronomia');
  assert.equal(seed.publication.kind,'manual-bootstrap');
  assert.equal((await call(post(input),'alice')).status,409);

  const second=await (await call(post({action:'propose',draft:newNodeDraft('create-node','geologia')}),'alice')).json() as {id:string;electorateSize:number};
  assert.equal(second.electorateSize,2);
  assert.equal((await (await call(post({action:'vote',proposalId:second.id,choice:'yes'}),'alice')).json()).status,'pending');
  assert.equal((await (await call(post({action:'vote',proposalId:second.id,choice:'yes'}),'bob')).json()).status,'approved');
  const publicBoard=await (await call(new Request(url),null)).json();
  assert.equal(publicBoard.canPropose,false);
  assert.equal(publicBoard.proposals.length,2);
  const pr3Board=await (await call(new Request(url),'alice')).json();
  assert.equal(pr3Board.canPropose,true);
 }finally{await pg.close();}
});
