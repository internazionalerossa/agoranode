import test from 'node:test';
import assert from 'node:assert/strict';
import {
  encodePublicBlob, chunkPublicBytes, parsePublicBlobManifest, reconstructPublicBlob,
  MIN_CHUNK, MAX_CHUNK, MAX_PUBLIC_BLOB,
} from '../server/public-blob-cas';

const NETWORK='agoranode.public.v1', SPACE='polisrossa';

function syntheticBytes(length: number): Uint8Array {
  const bytes=new Uint8Array(length);
  let x=0x6e0b16e5;
  for(let i=0;i<length;i++) {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    bytes[i]=x & 255;
  }
  return bytes;
}

test('public blob codec deterministically reconstructs empty, small, and multi-chunk objects', () => {
  for(const size of [0,1,MIN_CHUNK-1,MIN_CHUNK,64_000,900_000]) {
    const bytes=syntheticBytes(size);
    const a=encodePublicBlob(bytes,NETWORK,SPACE);
    const b=encodePublicBlob(bytes,NETWORK,SPACE);
    assert.deepEqual(a.manifest,b.manifest);
    assert.deepEqual([...a.blocks.keys()],[...b.blocks.keys()]);
    assert.deepEqual(Buffer.from(reconstructPublicBlob(a.manifest,a.blocks,NETWORK,SPACE)),Buffer.from(bytes));
    assert.deepEqual(a.manifest.chunks.map(x=>x.size),chunkPublicBytes(bytes).map(x=>x.byteLength));
    assert.ok(a.manifest.chunks.every(x=>x.size<=MAX_CHUNK));
    assert.equal(a.manifest.size,size);
  }
});

test('content-defined boundaries reuse most data after one-byte insertion', () => {
  const base=syntheticBytes(1_800_000);
  const edited=new Uint8Array(base.byteLength+1);
  edited.set(base.subarray(0,67),0);
  edited[67]=255;
  edited.set(base.subarray(67),68);
  const before=encodePublicBlob(base,NETWORK,SPACE);
  const after=encodePublicBlob(edited,NETWORK,SPACE);
  const missing=[...after.blocks.keys()].filter(k=>!before.blocks.has(k));
  const newBytes=missing.reduce((sum,k)=>sum+after.blocks.get(k)!.byteLength,0);
  assert.ok(newBytes < edited.byteLength*0.40,
    'A tiny edit should reuse existing blocks rather than resend a cumulative snapshot');
  const available=new Map([...before.blocks,...after.blocks]);
  assert.deepEqual(Buffer.from(reconstructPublicBlob(after.manifest,available,NETWORK,SPACE)),Buffer.from(edited));
});

test('deny oversized, private, unknown, cross-space and modified content', () => {
  assert.throws(()=>encodePublicBlob(new Uint8Array(MAX_PUBLIC_BLOB+1),NETWORK,SPACE),/budget/);
  assert.throws(()=>encodePublicBlob(new Uint8Array([1]),NETWORK,SPACE,'private-local' as never),/data class/);
  assert.throws(()=>encodePublicBlob(new Uint8Array(1),'../system',SPACE),/namespace/);
  const blob=encodePublicBlob(syntheticBytes(99_000),NETWORK,SPACE);
  assert.throws(()=>reconstructPublicBlob(blob.manifest,blob.blocks,NETWORK,'agora'),/namespace/);
  const changed=structuredClone(blob.manifest) as Record<string,unknown>;
  changed.dataClass='private-local';
  assert.throws(()=>parsePublicBlobManifest(changed,NETWORK,SPACE),/namespace/);
  const poisoned=new Map(blob.blocks);
  const first=[...poisoned.keys()][0];
  poisoned.set(first,new Uint8Array(blob.blocks.get(first)!.byteLength));
  assert.throws(()=>reconstructPublicBlob(blob.manifest,poisoned,NETWORK,SPACE),/damaged/);
  const truncated=new Map(blob.blocks);
  truncated.delete(first);
  assert.throws(()=>reconstructPublicBlob(blob.manifest,truncated,NETWORK,SPACE),/Missing/);
  const extra={...blob.manifest,secret:'cannot-export'};
  assert.throws(()=>parsePublicBlobManifest(extra,NETWORK,SPACE),/fields/);
  const impossible={...blob.manifest,size:MAX_PUBLIC_BLOB+1};
  assert.throws(()=>parsePublicBlobManifest(impossible,NETWORK,SPACE),/bounds/);
  const wrongHash={...blob.manifest,sha256:'sha256:'+'f'.repeat(64)};
  assert.throws(()=>reconstructPublicBlob(wrongHash,blob.blocks,NETWORK,SPACE),/unexpected hash/);
});
