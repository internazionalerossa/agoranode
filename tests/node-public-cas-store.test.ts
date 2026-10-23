import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {encodePublicBlob} from '../server/public-blob-cas';
import {pinAuthorizedPublicBlob,readPinnedPublicBlob} from '../server/public-cas-store';

const NETWORK='agoranode.public.v1',SPACE='polisrossa';
function content(length:number){
 const bytes=new Uint8Array(length);
 let n=0x45f61a;
 for(let i=0;i<length;i++){n^=n<<13;n^=n>>>17;n^=n<<5;bytes[i]=n&255;}
 return bytes;
}
test('authorized public blocks are pinned once and round-trip without a central storage backend',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'agora-cas-'));
 try{
  const input=content(500_000),encoded=encodePublicBlob(input,NETWORK,SPACE);
  let checks=0;
  const auth={verifyManifest:async(v:{networkId:string;spaceId:string;manifestDigest:string;objectDigest:string})=>{
   checks++;
   return v.networkId===NETWORK&&v.spaceId===SPACE&&v.objectDigest===encoded.manifest.sha256;
  }};
  const first=await pinAuthorizedPublicBlob(directory,encoded.manifest,encoded.blocks,NETWORK,SPACE,auth);
  assert.ok(first.storedBlocks>0);
  assert.equal(first.reusedBlocks,0);
  const second=await pinAuthorizedPublicBlob(directory,encoded.manifest,encoded.blocks,NETWORK,SPACE,auth);
  assert.equal(second.storedBlocks,0);
  assert.equal(second.reusedBlocks,first.storedBlocks);
  assert.equal(checks,2);
  assert.deepEqual(Buffer.from(await readPinnedPublicBlob(directory,first.manifestDigest,NETWORK,SPACE)),Buffer.from(input));
  await assert.rejects(readPinnedPublicBlob(directory,first.manifestDigest,NETWORK,'agora'));
  await assert.rejects(readPinnedPublicBlob(directory,'../bad',NETWORK,SPACE),/Invalid CAS/);
  const root=join(directory,(await readdir(directory))[0]);
  const blockFiles=await readdir(join(root,'blocks'));
  assert.ok(blockFiles.length>0);
  await writeFile(join(root,'blocks',blockFiles[0]),'tampered');
  await assert.rejects(readPinnedPublicBlob(directory,first.manifestDigest,NETWORK,SPACE));
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('CAS rejects unpublished blobs before materializing any blocks and denies extra objects',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'agora-cas-auth-'));
 try{
  const encoded=encodePublicBlob(content(100_000),NETWORK,SPACE);
  await assert.rejects(pinAuthorizedPublicBlob(directory,encoded.manifest,encoded.blocks,NETWORK,SPACE,
    {verifyManifest:async()=>false}),/not authorized/);
  assert.equal((await readdir(directory)).length,0);
  const extra=new Map(encoded.blocks);
  extra.set('sha256:'+'b'.repeat(64),new Uint8Array([1,2,3]));
  await assert.rejects(pinAuthorizedPublicBlob(directory,encoded.manifest,extra,NETWORK,SPACE,
    {verifyManifest:async()=>true}),/outside the authorized manifest/);
  assert.equal((await readdir(directory)).length,0);
  const forged={...encoded.manifest,dataClass:'private-local'};
  await assert.rejects(pinAuthorizedPublicBlob(directory,forged,encoded.blocks,NETWORK,SPACE,
    {verifyManifest:async()=>true}),/namespace|bounds/);
 }finally{await rm(directory,{recursive:true,force:true});}
});
