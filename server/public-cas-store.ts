/**
 * Experimental durable, content-addressed public-only store.
 *
 * Never accepts a caller's claim of finality: the caller MUST provide an
 * independent authorization verifier binding the exact canonical manifest
 * digest and full-content hash to a finalized public checkpoint.
 *
 * This module does NOT replicate private DBs or implement consensus/networking.
 */
import {createHash} from 'node:crypto';
import {constants} from 'node:fs';
import {mkdir,open,link,unlink,writeFile,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {canonicalKnowledgeJson} from '../app/lib/knowledge-model';
import {
 parsePublicBlobManifest,reconstructPublicBlob,type PublicBlobManifest,
} from './public-blob-cas';

const HASH=/^sha256:[a-f0-9]{64}$/;
function digest(bytes:Uint8Array|string):string{
 return 'sha256:'+createHash('sha256').update(bytes).digest('hex');
}
function spaceRoot(directory:string,networkId:string,spaceId:string){
 // Both names become a fixed-length hash; never concatenate arbitrary user
 // supplied path components into filesystem names.
 return join(resolve(directory),'public-'+digest(networkId+'\0'+spaceId).slice(7));
}
async function safeRead(path:string,max:number):Promise<Buffer>{
 const descriptor=await open(path,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
 try{
  const stat=await descriptor.stat();
  if(!stat.isFile()||stat.size>max)throw Error('Invalid CAS file');
  const result=await descriptor.readFile();
  if(result.length!==stat.size)throw Error('CAS file changed during read');
  return result;
 }finally{await descriptor.close();}
}
async function putImmutable(path:string,bytes:Uint8Array):Promise<boolean>{
 const scratch=path+'.'+crypto.randomUUID()+'.tmp';
 const handle=await open(scratch,'wx',0o600);
 try{await handle.writeFile(bytes);await handle.sync();}finally{await handle.close();}
 try{
  try{await link(scratch,path);return true;}
  catch(error){
   if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;
   const existing=await safeRead(path,32*1024*1024+16*1024);
   if(!existing.equals(Buffer.from(bytes)))throw Error('Existing CAS object mismatch');
   return false;
  }
 }finally{await unlink(scratch).catch(()=>{});}
}
export type PublicCasAuthorization={
 /** Verification must bind the exact hash to an approved/finalized checkpoint. */
 verifyManifest:(binding:{
   networkId:string;spaceId:string;manifestDigest:string;objectDigest:string;
 })=>Promise<boolean>;
};
export async function pinAuthorizedPublicBlob(
 directory:string,value:unknown,blocks:ReadonlyMap<string,Uint8Array>,
 networkId:string,spaceId:string,auth:PublicCasAuthorization,
):Promise<{manifestDigest:string;storedBlocks:number;reusedBlocks:number}>{
 const manifest=parsePublicBlobManifest(value,networkId,spaceId);
 // Verifies each chunk and the entire reconstructed content before touching disk.
 reconstructPublicBlob(manifest,blocks,networkId,spaceId);
 const encoded=Buffer.from(canonicalKnowledgeJson(manifest),'utf8');
 const manifestDigest=digest(encoded);
 if(!await auth.verifyManifest({networkId,spaceId,manifestDigest,objectDigest:manifest.sha256}))
  throw Error('Public blob is not authorized by a finalized checkpoint');
 const root=spaceRoot(directory,networkId,spaceId),blockDir=join(root,'blocks'),manifestDir=join(root,'manifests');
 await mkdir(blockDir,{recursive:true,mode:0o700});
 await mkdir(manifestDir,{recursive:true,mode:0o700});
 let storedBlocks=0,reusedBlocks=0;
 for(const [hash,bytes] of blocks){
  if(!HASH.test(hash))throw Error('Invalid CAS object name');
  // Manifest reconstruction above only verifies referenced blocks. Reject
  // extras rather than becoming an arbitrary untrusted object-upload service.
  if(!manifest.chunks.some(chunk=>chunk.sha256===hash))throw Error('CAS contains a block outside the authorized manifest');
  const path=join(blockDir,hash.slice(7));
  const created=await putImmutable(path,bytes);
  if(created)storedBlocks++;else reusedBlocks++;
 }
 await putImmutable(join(manifestDir,manifestDigest.slice(7)+'.json'),encoded);
 return {manifestDigest,storedBlocks,reusedBlocks};
}
export async function readPinnedPublicBlob(
 directory:string,manifestDigest:string,networkId:string,spaceId:string,
):Promise<Uint8Array>{
 if(!HASH.test(manifestDigest))throw Error('Invalid CAS manifest hash');
 const root=spaceRoot(directory,networkId,spaceId);
 const bytes=await safeRead(join(root,'manifests',manifestDigest.slice(7)+'.json'),64*1024);
 if(digest(bytes)!==manifestDigest)throw Error('Corrupt CAS manifest hash');
 const manifest=parsePublicBlobManifest(JSON.parse(bytes.toString('utf8')),networkId,spaceId);
 const blocks=new Map<string,Uint8Array>();
 for(const part of manifest.chunks){
  if(blocks.has(part.sha256))continue;
  blocks.set(part.sha256,await safeRead(join(root,'blocks',part.sha256.slice(7)),256*1024));
 }
 return reconstructPublicBlob(manifest,blocks,networkId,spaceId);
}
