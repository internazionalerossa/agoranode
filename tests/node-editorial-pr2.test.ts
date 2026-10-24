import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import type {Connections} from '../server/database';
import {
 EditorialError,initializeEditorialNode,joinEditorialPr2,
 proposeEditorialRevision,voteEditorialProposal,readEditorialHead,
} from '../server/node-editorial-governance';

test('one founder publishes alone; the second admitted PR2 atomically activates majority voting',async()=>{
 const pg=new PGlite();
 try{
  await pg.exec(await readFile(new URL('../server/migrations/019-node-editorial-pr2.sql',import.meta.url),'utf8'));
  const connection={query:async(sql:string,values:unknown[]=[])=>{
   const r=await pg.query(sql,values);
   return {rows:r.rows as Record<string,unknown>[],rowCount:r.affectedRows};
  }};
  const pool={...connection,connect:async()=>connection} satisfies Connections;
  const verify=async(space:string,user:string)=>space==='astronomia'&&['alice','bob','carla'].includes(user);
  await assert.rejects(initializeEditorialNode(pool,'astronomia','mallory',verify),
   (e:unknown)=>e instanceof EditorialError&&e.status===403);
  assert.deepEqual(await initializeEditorialNode(pool,'astronomia','alice',verify),{mode:'solo',spaceId:'astronomia'});
  await assert.rejects(initializeEditorialNode(pool,'astronomia','bob',verify),
   (e:unknown)=>e instanceof EditorialError&&e.status===409);
  const solo=await proposeEditorialRevision(pool,'astronomia','alice',{title:'Astronomia',sections:['Biblioteca']});
  assert.equal(solo.status,'published');
  assert.equal(solo.electorateSize,1);
  const initial=await readEditorialHead(pool,'astronomia');
  assert.equal(initial.sequence,1);
  assert.equal(initial.digest,solo.digest);
  assert.deepEqual(await joinEditorialPr2(pool,'astronomia','bob',verify),{mode:'collective',members:2});
  assert.deepEqual(await joinEditorialPr2(pool,'astronomia','bob',verify),{mode:'collective',members:2});
  const change=await proposeEditorialRevision(pool,'astronomia','alice',{title:'Astronomia',sections:['Biblioteca','Timeline']});
  assert.equal(change.status,'pending');
  assert.equal(change.electorateSize,2);
  assert.equal((await readEditorialHead(pool,'astronomia')).sequence,1);
  assert.equal((await voteEditorialProposal(pool,'astronomia','alice',change.id,'yes')).status,'pending');
  assert.equal((await readEditorialHead(pool,'astronomia')).sequence,1);
  const accepted=await voteEditorialProposal(pool,'astronomia','bob',change.id,'yes');
  assert.deepEqual(accepted,{status:'published',yes:2,no:0,required:2});
  assert.equal((await readEditorialHead(pool,'astronomia')).sequence,2);
  await assert.rejects(voteEditorialProposal(pool,'astronomia','alice',change.id,'yes'),
   (e:unknown)=>e instanceof EditorialError&&e.status===409);
  const staleA=await proposeEditorialRevision(pool,'astronomia','alice',{title:'Proposal A'});
  const staleB=await proposeEditorialRevision(pool,'astronomia','bob',{title:'Proposal B'});
  assert.equal(staleA.status,'pending');assert.equal(staleB.status,'pending');
  await voteEditorialProposal(pool,'astronomia','alice',staleA.id,'yes');
  await voteEditorialProposal(pool,'astronomia','bob',staleA.id,'yes');
  await voteEditorialProposal(pool,'astronomia','alice',staleB.id,'yes');
  const stale=await voteEditorialProposal(pool,'astronomia','bob',staleB.id,'yes');
  assert.equal(stale.status,'stale');
  assert.equal((await readEditorialHead(pool,'astronomia')).sequence,3);
  await assert.rejects(pg.query('DELETE FROM node_editorial_revisions'),/immutable/);
  await assert.rejects(pg.query('UPDATE node_editorial_revisions SET digest=digest'),/immutable/);
  const other=await pg.query("SELECT COUNT(*)::int AS count FROM node_editorial_pr2 WHERE space_id='astronomia'");
  assert.equal(other.rows[0].count,2);
 }finally{await pg.close();}
});

test('a frozen electorate never grants retroactive ballots to PR2s admitted after a proposal',async()=>{
 const pg=new PGlite();
 try{
  await pg.exec(await readFile(new URL('../server/migrations/019-node-editorial-pr2.sql',import.meta.url),'utf8'));
  const connection={query:async(sql:string,values:unknown[]=[])=>({rows:(await pg.query(sql,values)).rows as Record<string,unknown>[]})};
  const pool={...connection,connect:async()=>connection} satisfies Connections;
  const verify=async(_:string,user:string)=>['alice','bob','carla'].includes(user);
  await initializeEditorialNode(pool,'geologia','alice',verify);
  await joinEditorialPr2(pool,'geologia','bob',verify);
  const proposal=await proposeEditorialRevision(pool,'geologia','alice',{title:'New geological archive'});
  assert.equal(proposal.electorateSize,2);
  const third=await joinEditorialPr2(pool,'geologia','carla',verify);
  assert.equal(third.members,3);
  await assert.rejects(voteEditorialProposal(pool,'geologia','carla',proposal.id,'yes'),
   (e:unknown)=>e instanceof EditorialError&&e.status===403);
  const fresh=await proposeEditorialRevision(pool,'geologia','carla',{title:'A later proposal'});
  assert.equal(fresh.electorateSize,3);
  const vote=await voteEditorialProposal(pool,'geologia','carla',fresh.id,'yes');
  assert.equal(vote.required,2);
 }finally{await pg.close();}
});
