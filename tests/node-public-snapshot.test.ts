import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PGlite} from '@electric-sql/pglite';
import type {Connections} from '../server/database';
import {canonicalJson,createPublicSnapshot,generateSnapshotKeys,importPublicSnapshot,publicSnapshotStatus,verifyPublicSnapshot,writePublicSnapshotBundle} from '../server/public-snapshot';

async function releaseFixture(){
 const root=await mkdtemp(join(tmpdir(),'polisrossa-snapshot-'));
 await Promise.all([mkdir(join(root,'build-node','public'),{recursive:true}),mkdir(join(root,'build-node','migrations'),{recursive:true})]);
 await Promise.all([
  writeFile(join(root,'package.json'),'{}\n'),writeFile(join(root,'package-lock.json'),'{"lockfileVersion":3}\n'),
  writeFile(join(root,'build-node','server.mjs'),'export const ready=true;\n'),writeFile(join(root,'build-node','public','index.html'),'<!doctype html><title>PolisRossa</title>\n'),
  writeFile(join(root,'build-node','migrations','001-test.sql'),'SELECT 1;\r\n'),
 ]);
 return root;
}
async function verifiedBundle(root:string,output:string,keys:ReturnType<typeof generateSnapshotKeys>,height='0',previous:string|null=null){
 const created=await writePublicSnapshotBundle({releaseRoot:root,outputRoot:output,networkId:'polisrossa-test',height,previous,privateKey:keys.privateKeyPem});
 return {created,verified:await verifyPublicSnapshot({bundleDirectory:created.directory,releaseRoot:root,publicKey:keys.publicKeyPem})};
}

test('public snapshot is canonical, signed, release-only and unaffected by files outside the runtime allowlist',async()=>{
 const root=await releaseFixture(),output=join(root,'snapshots'),keys=generateSnapshotKeys();
 try{
  await mkdir(join(root,'.selfhost'),{recursive:true});await writeFile(join(root,'.selfhost','runtime.env'),'AUTH_SECRET=canary-private-value\n');
  await writeFile(join(root,'package.json'),'{}\r\n');
  const first=await verifiedBundle(root,output,keys),second=await createPublicSnapshot({releaseRoot:root,networkId:'polisrossa-test',height:'0',previous:null,privateKey:keys.privateKeyPem});
  assert.equal(first.created.snapshotId,second.snapshotId);
  assert.equal((await verifiedBundle(root,output,keys)).created.snapshotId,first.created.snapshotId);
  assert.deepEqual(first.verified.manifest.publicState,[]);
  assert.deepEqual(first.verified.manifest.policy,{scope:'release-only',userGeneratedContent:'excluded'});
  assert.deepEqual(first.verified.manifest.release.files.map(file=>file.path),['build-node/migrations/001-test.sql','build-node/public/index.html','build-node/server.mjs','package-lock.json','package.json']);
  assert.equal(first.created.manifestBytes.toString(),canonicalJson(first.created.manifest));
  assert.doesNotMatch(first.created.manifestBytes.toString(),/canary-private-value|\.selfhost|AUTH_SECRET/);
  assert.doesNotMatch(first.created.signatureBytes.toString(),/PRIVATE KEY/);
  assert.equal(first.verified.signerKeyId,keys.keyId);
  await writeFile(join(root,'package.json'),'{}\n');
  await writeFile(join(root,'build-node','migrations','001-test.sql'),'SELECT 1;\n');
  assert.equal((await verifyPublicSnapshot({bundleDirectory:first.created.directory,releaseRoot:root,publicKey:keys.publicKeyPem})).snapshotId,first.created.snapshotId);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('verification fails closed for a wrong key, noncanonical envelope, release drift and UGC fields',async()=>{
 const root=await releaseFixture(),output=join(root,'snapshots'),keys=generateSnapshotKeys();
 try{
  const {created}=await verifiedBundle(root,output,keys);
  const wrong=generateSnapshotKeys();
  await assert.rejects(verifyPublicSnapshot({bundleDirectory:created.directory,releaseRoot:root,publicKey:wrong.publicKeyPem}),/signature identity/);
  const signaturePath=join(created.directory,'signature.json'),originalSignature=await readFile(signaturePath);
  await writeFile(signaturePath,JSON.stringify(JSON.parse(originalSignature.toString()),null,2));
  await assert.rejects(verifyPublicSnapshot({bundleDirectory:created.directory,releaseRoot:root,publicKey:keys.publicKeyPem}),/not canonical/);
  await writeFile(signaturePath,originalSignature);
  await writeFile(join(root,'build-node','server.mjs'),'export const ready=false;\n');
  await assert.rejects(verifyPublicSnapshot({bundleDirectory:created.directory,releaseRoot:root,publicKey:keys.publicKeyPem}),/local runtime release/);
  const forged=JSON.parse(created.manifestBytes.toString());forged.publicState.push({forum:'forbidden'});
  await writeFile(join(created.directory,'manifest.json'),canonicalJson(forged));
  await assert.rejects(verifyPublicSnapshot({bundleDirectory:created.directory,releaseRoot:root,publicKey:keys.publicKeyPem}),/public state must be empty/);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('snapshot provenance import is atomic, idempotent and rejects rollback or forks',async()=>{
 const root=await releaseFixture(),output=join(root,'snapshots'),keys=generateSnapshotKeys(),pg=new PGlite();
 try{
  await pg.exec(await readFile(new URL('../server/migrations/008-public-snapshot-provenance.sql',import.meta.url),'utf8'));
  const connection={query:async(sql:string,values:unknown[]=[])=>{const result=await pg.query(sql,values);return {rows:result.rows as Record<string,unknown>[],rowCount:result.affectedRows};}};
  const pool={...connection,connect:async()=>connection} satisfies Connections;
  const genesis=await verifiedBundle(root,output,keys);
  assert.deepEqual(await importPublicSnapshot(pool,genesis.verified),{status:'imported',snapshotId:genesis.created.snapshotId,height:'0'});
  assert.deepEqual(await importPublicSnapshot(pool,genesis.verified),{status:'already-imported',snapshotId:genesis.created.snapshotId,height:'0'});
  const next=await verifiedBundle(root,output,keys,'1',genesis.created.snapshotId);
  assert.equal((await importPublicSnapshot(pool,next.verified)).status,'imported');
  const status=await publicSnapshotStatus(pool);assert.equal(status.status,'ready');if(status.status==='ready'){assert.equal(status.snapshotId,next.created.snapshotId);assert.equal(status.height,'1');assert.equal(status.previous,genesis.created.snapshotId);}
  const unexpectedSigner=await verifiedBundle(root,output,generateSnapshotKeys(),'2',next.created.snapshotId);
  await assert.rejects(importPublicSnapshot(pool,unexpectedSigner.verified),/signer key differs/);
  await assert.rejects(importPublicSnapshot(pool,genesis.verified),/rollback is not allowed/);
  const forkCreated=await writePublicSnapshotBundle({releaseRoot:root,outputRoot:join(root,'fork'),networkId:'polisrossa-test',height:'2',previous:genesis.created.snapshotId,privateKey:keys.privateKeyPem});
  const fork=await verifyPublicSnapshot({bundleDirectory:forkCreated.directory,releaseRoot:root,publicKey:keys.publicKeyPem});
  await assert.rejects(importPublicSnapshot(pool,fork),/does not directly extend/);
  assert.equal((await pg.query<{count:number}>('SELECT COUNT(*)::int AS count FROM public_snapshot_imports')).rows[0].count,2);
 }finally{await pg.close();await rm(root,{recursive:true,force:true});}
});
