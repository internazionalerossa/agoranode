/**
 * Experimental deterministic, content-defined chunks for PUBLIC data only.
 *
 * This is a space-efficient transport/storage primitive, NOT a publication
 * certificate, blockchain, consensus engine or user-data replication policy.
 * A validator must authorize the containing object before this codec is used.
 * No dependency on cloud providers, database vendors or third-party hashing.
 */
import {createHash} from 'node:crypto';

export const PUBLIC_BLOB_FORMAT = 'org.agoranode.public-blob.v1' as const;
export const CHUNK_ALGORITHM = 'gear32-v1' as const;
export const MIN_CHUNK = 16 * 1024;
export const AVG_CHUNK = 64 * 1024;
export const MAX_CHUNK = 256 * 1024;
export const MAX_PUBLIC_BLOB = 32 * 1024 * 1024;
export const MAX_BLOCKS = Math.ceil(MAX_PUBLIC_BLOB / MIN_CHUNK) + 1;

const ID = /^[a-z0-9][a-z0-9._:-]{1,127}$/;
const SHA = /^sha256:[a-f0-9]{64}$/;
const MASK = AVG_CHUNK - 1;

// A published algorithm must never use random per-process lookup tables.
// The table below is deterministic for every runtime, architecture and peer.
function gearValue(byte: number): number {
  let x = (byte + 1) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}
const GEAR = Uint32Array.from({length:256}, (_, i) => gearValue(i));

export type PublicBlobChunk = {sha256: string; size: number};
export type PublicBlobManifest = {
  format: typeof PUBLIC_BLOB_FORMAT;
  dataClass: 'public-verified';
  networkId: string;
  spaceId: string;
  size: number;
  sha256: string;
  algorithm: typeof CHUNK_ALGORITHM;
  chunks: PublicBlobChunk[];
};
export type EncodedPublicBlob = {
  manifest: PublicBlobManifest;
  blocks: Map<string, Uint8Array>;
};
function digest(bytes: Uint8Array): string {
  return 'sha256:' + createHash('sha256').update(bytes).digest('hex');
}
function validId(id: string): boolean {
  return ID.test(id);
}

/**
 * A rolling 32-bit gear fingerprint rapidly resynchronizes boundaries after
 * nearby insertions, unlike naive fixed offsets. Chunk size is bounded.
 */
export function chunkPublicBytes(bytes: Uint8Array): Uint8Array[] {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > MAX_PUBLIC_BLOB) {
    throw Error('Public blob exceeds the memory and storage budget');
  }
  const chunks: Uint8Array[] = [];
  let start = 0;
  let fingerprint = 0;
  for (let i=0; i<bytes.byteLength; i++) {
    fingerprint = ((fingerprint << 1) + GEAR[bytes[i]]) >>> 0;
    const length=i - start + 1;
    if (length >= MAX_CHUNK || (length >= MIN_CHUNK && (fingerprint & MASK) === 0)) {
      chunks.push(bytes.slice(start,i+1));
      start = i+1;
      fingerprint = 0;
    }
  }
  if (start < bytes.byteLength) chunks.push(bytes.slice(start));
  return chunks;
}

export function encodePublicBlob(
  bytes: Uint8Array, networkId: string, spaceId: string,
  dataClass: 'public-verified' = 'public-verified',
): EncodedPublicBlob {
  if (!validId(networkId) || !validId(spaceId) || dataClass !== 'public-verified') {
    throw Error('Public blob requires a valid namespace and an allowlisted data class');
  }
  const blocks = new Map<string, Uint8Array>();
  const chunks = chunkPublicBytes(bytes).map(part => {
    const sha256=digest(part);
    if (!blocks.has(sha256)) blocks.set(sha256,part);
    return {sha256,size:part.byteLength};
  });
  return {
    manifest:{
      format:PUBLIC_BLOB_FORMAT,dataClass:'public-verified',
      networkId,spaceId,size:bytes.byteLength,sha256:digest(bytes),
      algorithm:CHUNK_ALGORITHM,chunks,
    },
    blocks,
  };
}

function objectKeys(value: unknown, expected: string[]): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).sort().join('|') === [...expected].sort().join('|');
}

/** Defend allocations and metadata from untrusted peers before fetching data. */
export function parsePublicBlobManifest(value: unknown, networkId: string, spaceId: string): PublicBlobManifest {
  if (!objectKeys(value,['format','dataClass','networkId','spaceId','size','sha256','algorithm','chunks'])) {
    throw Error('Invalid public manifest fields');
  }
  if (value.format !== PUBLIC_BLOB_FORMAT || value.algorithm !== CHUNK_ALGORITHM ||
      value.dataClass !== 'public-verified' || value.networkId !== networkId || value.spaceId !== spaceId ||
      !validId(networkId) || !validId(spaceId) || typeof value.sha256 !== 'string' ||
      !SHA.test(value.sha256) || !Number.isSafeInteger(value.size) ||
      Number(value.size) < 0 || Number(value.size) > MAX_PUBLIC_BLOB ||
      !Array.isArray(value.chunks) || value.chunks.length > MAX_BLOCKS) {
    throw Error('Invalid public manifest namespace or bounds');
  }
  let sum=0;
  for(const block of value.chunks) {
    if(!objectKeys(block,['sha256','size']) || typeof block.sha256 !== 'string' ||
       !SHA.test(block.sha256) || !Number.isSafeInteger(block.size) ||
       Number(block.size) < 1 || Number(block.size) > MAX_CHUNK) {
      throw Error('Invalid content-addressed block descriptor');
    }
    sum += Number(block.size);
    if(sum > MAX_PUBLIC_BLOB) throw Error('Public block budget exceeded');
  }
  if (sum !== value.size || (value.size === 0) !== (value.chunks.length === 0)) {
    throw Error('Public manifest blocks do not cover declared size');
  }
  return value as PublicBlobManifest;
}

/**
 * Verify every block digest AND the assembled object digest. This validates
 * byte equality only; it does not attest source authenticity or legal rights.
 */
export function reconstructPublicBlob(
  value: unknown, blocks: ReadonlyMap<string, Uint8Array>, networkId: string, spaceId: string,
): Uint8Array {
  const manifest=parsePublicBlobManifest(value,networkId,spaceId);
  const assembled=Buffer.alloc(manifest.size);
  let offset=0;
  for(const block of manifest.chunks) {
    const bytes=blocks.get(block.sha256);
    if(!(bytes instanceof Uint8Array) || bytes.byteLength !== block.size || digest(bytes) !== block.sha256) {
      throw Error('Missing or damaged public block');
    }
    assembled.set(bytes,offset);
    offset+=block.size;
  }
  if (digest(assembled)!==manifest.sha256) throw Error('Reconstructed public blob has unexpected hash');
  return assembled;
}
