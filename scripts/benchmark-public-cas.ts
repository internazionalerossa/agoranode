/**
 * Deterministic, synthetic benchmark: NOT real-world throughput or cost data.
 * Uses no user data, secrets, network, or third-party cloud services.
 */
import {performance} from 'node:perf_hooks';
import {encodePublicBlob, reconstructPublicBlob} from '../server/public-blob-cas';

function payload(length:number):Uint8Array {
  const bytes=new Uint8Array(length);
  let state=0x6e0b16e5;
  for(let i=0;i<length;i++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    bytes[i]=state&255;
  }
  return bytes;
}
const origin=payload(1_800_000);
const updated=new Uint8Array(origin.byteLength+1);
updated.set(origin.subarray(0,67));
updated[67]=255;
updated.set(origin.subarray(67),68);
const started=performance.now();
const base=encodePublicBlob(origin,'agoranode.public.v1','polisrossa');
const changed=encodePublicBlob(updated,'agoranode.public.v1','polisrossa');
const existing=new Map(base.blocks);
const missing=[...changed.blocks].filter(([key])=>!existing.has(key));
for(const [hash,bytes] of missing)existing.set(hash,bytes);
const merged=reconstructPublicBlob(changed.manifest,existing,'agoranode.public.v1','polisrossa');
if(!Buffer.from(merged).equals(Buffer.from(updated))) throw Error('Benchmark fixture failed byte-perfect roundtrip');
const transferred=missing.reduce((sum,[,bytes])=>sum+bytes.byteLength,0);
process.stdout.write(JSON.stringify({
  scenario:'synthetic random bytes plus one byte insertion',
  originalBytes:origin.byteLength,
  updatedBytes:updated.byteLength,
  oldBlockCount:base.manifest.chunks.length,
  changedBlockCount:changed.manifest.chunks.length,
  missingBlockCount:missing.length,
  novelBlockBytes:transferred,
  avoidedBodyBytes:updated.byteLength-transferred,
  avoidedBodyPercent:Number((100*(updated.byteLength-transferred)/updated.byteLength).toFixed(2)),
  encodeAndReconstructMilliseconds:Number((performance.now()-started).toFixed(2)),
  limitation:'Excludes headers, manifests, transport, storage metadata, CPU energy and real traffic',
},null,2)+'\n');
