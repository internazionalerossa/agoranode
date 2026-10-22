import test from 'node:test';
import assert from 'node:assert/strict';
import {readCommittedKnowledgeDeltas} from '../server/knowledge-delta';
import type {Connections} from '../server/database';

const hash=(n:string)=>n.repeat(64);
const fixture=[
  {sequence:2,action:'revision-imported',entity_sha256:hash('a'),locale:'it',
    previous_revision_sha256:null,revision_sha256:hash('b')},
  {sequence:5,action:'current-selected',entity_sha256:hash('a'),locale:'it',
    previous_revision_sha256:null,revision_sha256:hash('b')},
  {sequence:9,action:'revision-imported',entity_sha256:hash('c'),locale:'it',
    previous_revision_sha256:hash('b'),revision_sha256:hash('d')},
];

test('transactionally emitted knowledge deltas support bounded space-scoped incremental cursors',async()=>{
  let sql='',parameters:unknown[]=[];
  const db={async query(statement:string,args:unknown[]=[]){
    sql=statement;parameters=args;
    const [space,after,limit]=args;
    const rows=space==='polisrossa'?fixture.filter(row=>row.sequence>Number(after)).slice(0,Number(limit)):[];
    return {rows};
  },async connect(){return this;}} as unknown as Connections;
  const first=await readCommittedKnowledgeDeltas(db,'polisrossa',0,2);
  assert.deepEqual(first.changes.map(e=>e.sequence),[2,5]);
  assert.equal(first.nextCursor,5);
  assert.equal(first.hasMore,true);
  assert.deepEqual(parameters,['polisrossa',0,3]);
  assert.match(sql,/WHERE space_id=\$1 AND sequence>\$2/);
  const second=await readCommittedKnowledgeDeltas(db,'polisrossa',first.nextCursor,2);
  assert.deepEqual(second.changes.map(e=>e.sequence),[9]);
  assert.equal(second.hasMore,false);
  assert.equal((await readCommittedKnowledgeDeltas(db,'agora')).changes.length,0);
});

test('invalid cursors, duplicated events and nonpublic hashes fail closed',async()=>{
  const db={async query(){return {rows:[{...fixture[0],revision_sha256:'secret'}]};}} as unknown as Connections;
  for(const [space,after,limit] of [['../private',0,2],['polisrossa',-1,2],
    ['polisrossa',0,501]]) {
    await assert.rejects(readCommittedKnowledgeDeltas(db,String(space),Number(after),Number(limit)),/Invalid public delta/);
  }
  await assert.rejects(readCommittedKnowledgeDeltas(db,'polisrossa'),/Invalid committed/);
});
