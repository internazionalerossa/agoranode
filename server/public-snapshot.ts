import {createHash,createPrivateKey,createPublicKey,generateKeyPairSync,randomUUID,sign,verify} from 'node:crypto';
import {lstat,mkdir,readFile,readdir,rename,rm,writeFile} from 'node:fs/promises';
import {dirname,join,resolve,sep} from 'node:path';
import type {Connections} from './database';

export const SNAPSHOT_FORMAT='org.polisrossa.public-snapshot';
export const SIGNATURE_FORMAT='org.polisrossa.public-snapshot-signature';
export const SNAPSHOT_VERSION=1;
const SIGNATURE_DOMAIN=Buffer.from('POLISROSSA-PUBLIC-SNAPSHOT-V1\0','utf8');
const MAX_MANIFEST_BYTES=2*1024*1024;
const MAX_SIGNATURE_BYTES=16*1024;
const MAX_RELEASE_FILES=10000;
const MAX_RELEASE_FILE_BYTES=64*1024*1024;
const MAX_RELEASE_BYTES=256*1024*1024;
const HASH=/^[0-9a-f]{64}$/;
const SNAPSHOT_ID=/^sha256:[0-9a-f]{64}$/;
const KEY_ID=/^sha256:[0-9a-f]{64}$/;
const NETWORK_ID=/^[a-z0-9][a-z0-9._:-]{2,127}$/;
const DECIMAL=/^(?:0|[1-9][0-9]{0,15})$/;

type Json=null|boolean|number|string|Json[]|{[key:string]:Json};
export type ReleaseFile={path:string;bytes:string;sha256:string};
export type PublicSnapshotManifest={
 format:typeof SNAPSHOT_FORMAT;
 formatVersion:1;
 networkId:string;
 authority:{keyId:string};
 checkpoint:{height:string;previous:string|null};
 policy:{scope:'release-only';userGeneratedContent:'excluded'};
 publicState:[];
 release:{rootSha256:string;files:ReleaseFile[]};
};
export type SnapshotSignature={format:typeof SIGNATURE_FORMAT;formatVersion:1;snapshotId:string;keyId:string;algorithm:'Ed25519';signature:string};
export type CreatedPublicSnapshot={manifest:PublicSnapshotManifest;manifestBytes:Buffer;signature:SnapshotSignature;signatureBytes:Buffer;snapshotId:string};
export type VerifiedPublicSnapshot=CreatedPublicSnapshot&{signerKeyId:string};

function fail(message:string):never{throw Error('Invalid public snapshot: '+message);}
function sha256(value:Buffer|string){return createHash('sha256').update(value).digest('hex');}
function plainObject(value:unknown):value is Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))return false;const prototype=Object.getPrototypeOf(value);return prototype===Object.prototype||prototype===null;}
function validUnicode(value:string){
 for(let index=0;index<value.length;index++){
  const unit=value.charCodeAt(index);
  if(unit>=0xd800&&unit<=0xdbff){const next=value.charCodeAt(++index);if(!(next>=0xdc00&&next<=0xdfff))return false;}
  else if(unit>=0xdc00&&unit<=0xdfff)return false;
 }
 return true;
}
function encodeCanonical(value:unknown,seen:Set<object>):string{
 if(value===null)return 'null';
 if(typeof value==='string'){if(!validUnicode(value))fail('string contains an unpaired surrogate');return JSON.stringify(value);}
 if(typeof value==='boolean')return value?'true':'false';
 if(typeof value==='number'){if(!Number.isSafeInteger(value)||Object.is(value,-0))fail('numbers must be safe integers');return String(value);}
 if(typeof value!=='object')fail('unsupported JSON value');
 if(seen.has(value))fail('cyclic JSON value');seen.add(value);
 try{
  if(Array.isArray(value))return '['+value.map(item=>encodeCanonical(item,seen)).join(',')+']';
  if(!plainObject(value))fail('non-plain JSON object');
  return '{'+Object.keys(value).sort().map(key=>{if(!validUnicode(key))fail('key contains an unpaired surrogate');return JSON.stringify(key)+':'+encodeCanonical(value[key],seen);}).join(',')+'}';
 }finally{seen.delete(value);}
}
/** Deterministic JSON for the deliberately integer-only v1 manifest. */
export function canonicalJson(value:unknown){return encodeCanonical(value,new Set());}
function exactKeys(value:Record<string,unknown>,keys:string[],name:string){const actual=Object.keys(value).sort(),expected=[...keys].sort();if(actual.length!==expected.length||actual.some((key,index)=>key!==expected[index]))fail(name+' has unknown or missing fields');}
function decimal(value:unknown,name:string){if(typeof value!=='string'||!DECIMAL.test(value)||!Number.isSafeInteger(Number(value)))fail(name+' is not a safe decimal integer');return Number(value);}
function hashId(value:string){return 'sha256:'+value;}
function comparePath(left:string,right:string){return Buffer.compare(Buffer.from(left,'utf8'),Buffer.from(right,'utf8'));}

function validatePath(pathValue:unknown){
 if(typeof pathValue!=='string'||pathValue.length>240||pathValue!==pathValue.normalize('NFC')||!/^[A-Za-z0-9._+@\/-]+$/.test(pathValue))fail('release path is not portable');
 if(pathValue!=='package.json'&&pathValue!=='package-lock.json'&&!pathValue.startsWith('build-node/'))fail('release path is outside the allowlist');
 const parts=pathValue.split('/');if(parts.some(part=>!part||part==='.'||part==='..'))fail('release path contains an invalid segment');
 return pathValue;
}
function validateFiles(value:unknown):ReleaseFile[]{
 if(!Array.isArray(value)||value.length<3||value.length>MAX_RELEASE_FILES)fail('release file count is outside limits');
 const files:ReleaseFile[]=[],seen=new Set<string>();let total=0,previous:string|undefined;
 for(const item of value){
  if(!plainObject(item))fail('release file entry is not an object');exactKeys(item,['path','bytes','sha256'],'release file');
  const path=validatePath(item.path),bytes=decimal(item.bytes,'release file size');
  if(bytes>MAX_RELEASE_FILE_BYTES)fail('release file exceeds size limit');
  if(typeof item.sha256!=='string'||!HASH.test(item.sha256))fail('release file hash is invalid');
  const folded=path.toLowerCase();if(seen.has(folded))fail('duplicate or case-colliding release path');seen.add(folded);
  if(previous!==undefined&&comparePath(previous,path)>=0)fail('release files are not strictly sorted');previous=path;
  total+=bytes;if(total>MAX_RELEASE_BYTES)fail('release exceeds total size limit');
  files.push({path,bytes:String(item.bytes),sha256:item.sha256});
 }
 if(!seen.has('package.json')||!seen.has('package-lock.json')||!files.some(file=>file.path.startsWith('build-node/')))fail('release allowlist is incomplete');
 return files;
}
export function validateManifest(value:unknown):PublicSnapshotManifest{
 if(!plainObject(value))fail('manifest is not an object');
 exactKeys(value,['format','formatVersion','networkId','authority','checkpoint','policy','publicState','release'],'manifest');
 if(value.format!==SNAPSHOT_FORMAT||value.formatVersion!==SNAPSHOT_VERSION)fail('unsupported manifest format');
 if(typeof value.networkId!=='string'||!NETWORK_ID.test(value.networkId))fail('network ID is invalid');
 if(!plainObject(value.authority)){fail('authority is invalid');}exactKeys(value.authority,['keyId'],'authority');
 if(typeof value.authority.keyId!=='string'||!KEY_ID.test(value.authority.keyId))fail('authority key ID is invalid');
 if(!plainObject(value.checkpoint)){fail('checkpoint is invalid');}exactKeys(value.checkpoint,['height','previous'],'checkpoint');
 const height=decimal(value.checkpoint.height,'checkpoint height');
 if(value.checkpoint.previous!==null&&(typeof value.checkpoint.previous!=='string'||!SNAPSHOT_ID.test(value.checkpoint.previous)))fail('previous snapshot ID is invalid');
 if(height===0&&value.checkpoint.previous!==null||height>0&&value.checkpoint.previous===null)fail('checkpoint predecessor does not match height');
 if(!plainObject(value.policy)){fail('policy is invalid');}exactKeys(value.policy,['scope','userGeneratedContent'],'policy');
 if(value.policy.scope!=='release-only'||value.policy.userGeneratedContent!=='excluded')fail('snapshot policy is not release-only');
 if(!Array.isArray(value.publicState)||value.publicState.length!==0)fail('v1 public state must be empty');
 if(!plainObject(value.release)){fail('release is invalid');}exactKeys(value.release,['rootSha256','files'],'release');
 if(typeof value.release.rootSha256!=='string'||!HASH.test(value.release.rootSha256))fail('release root is invalid');
 const files=validateFiles(value.release.files);
 if(sha256(canonicalJson(files))!==value.release.rootSha256)fail('release root does not match file manifest');
 return value as unknown as PublicSnapshotManifest;
}
function validateSignature(value:unknown):SnapshotSignature{
 if(!plainObject(value))fail('signature envelope is not an object');
 exactKeys(value,['format','formatVersion','snapshotId','keyId','algorithm','signature'],'signature envelope');
 if(value.format!==SIGNATURE_FORMAT||value.formatVersion!==SNAPSHOT_VERSION||value.algorithm!=='Ed25519')fail('unsupported signature format');
 if(typeof value.snapshotId!=='string'||!SNAPSHOT_ID.test(value.snapshotId)||typeof value.keyId!=='string'||!KEY_ID.test(value.keyId))fail('signature identifiers are invalid');
 if(typeof value.signature!=='string'||!/^[A-Za-z0-9_-]{86}$/.test(value.signature))fail('signature encoding is invalid');
 return value as unknown as SnapshotSignature;
}
async function readLimited(path:string,limit:number){const info=await lstat(path);if(!info.isFile()||info.size>limit)fail('file is missing, not regular, or too large');const data=await readFile(path);if(data.length!==info.size)fail('file changed while reading');return data;}
function parseCanonical(data:Buffer,label:string):unknown{
 let text:string;try{text=new TextDecoder('utf-8',{fatal:true}).decode(data);}catch{fail(label+' is not UTF-8');}
 let value:unknown;try{value=JSON.parse(text);}catch{fail(label+' is not JSON');}
 if(canonicalJson(value)!==text)fail(label+' is not canonical JSON');return value;
}
async function fileRecord(root:string,path:string):Promise<ReleaseFile>{
 const absolute=join(root,...path.split('/')),info=await lstat(absolute);
 if(!info.isFile()||info.size>MAX_RELEASE_FILE_BYTES)fail('release file is missing, not regular, or too large: '+path);
 let data=await readFile(absolute);if(data.length!==info.size)fail('release file changed while reading: '+path);
 if(path==='package.json'||path==='package-lock.json'||/^build-node\/migrations\/[A-Za-z0-9._+@-]+\.sql$/.test(path)){
  let text:string;try{text=new TextDecoder('utf-8',{fatal:true}).decode(data);}catch{fail('release JSON is not UTF-8: '+path);}
  text=text.replaceAll('\r\n','\n');if(text.includes('\r'))fail('release JSON contains a bare carriage return: '+path);data=Buffer.from(text);
 }
 return {path,bytes:String(data.length),sha256:sha256(data)};
}
async function walkBuild(root:string,directory:string,output:string[]){
 const entries=await readdir(join(root,directory),{withFileTypes:true});
 for(const entry of entries){const path=(directory+'/'+entry.name).replaceAll('\\','/');validatePath(path);if(entry.isDirectory())await walkBuild(root,path,output);else if(entry.isFile())output.push(path);else fail('release contains a non-regular entry: '+path);if(output.length>MAX_RELEASE_FILES)fail('release file count exceeds limit');}
}
export async function collectRuntimeRelease(rootValue:string):Promise<{files:ReleaseFile[];rootSha256:string}>{
 const root=resolve(rootValue),paths=['package.json','package-lock.json'];await walkBuild(root,'build-node',paths);
 paths.sort(comparePath);const files:ReleaseFile[]=[];for(const path of paths)files.push(await fileRecord(root,path));
 const checked=validateFiles(files);return {files:checked,rootSha256:sha256(canonicalJson(checked))};
}

function publicKeyFingerprint(keyValue:string|Buffer){
 let key;try{key=createPublicKey(keyValue);}catch{fail('public key cannot be parsed');}
 if(key.asymmetricKeyType!=='ed25519')fail('public key is not Ed25519');
 return hashId(sha256(key.export({type:'spki',format:'der'}) as Buffer));
}
export function generateSnapshotKeys(){
 const {privateKey,publicKey}=generateKeyPairSync('ed25519');
 const privateKeyPem=privateKey.export({type:'pkcs8',format:'pem'}).toString(),publicKeyPem=publicKey.export({type:'spki',format:'pem'}).toString();
 return {privateKeyPem,publicKeyPem,keyId:publicKeyFingerprint(publicKeyPem)};
}
export function snapshotPublicKeyId(publicKey:string|Buffer){return publicKeyFingerprint(publicKey);}
function privateSigningKey(value:string|Buffer){let key;try{key=createPrivateKey(value);}catch{fail('private key cannot be parsed');}if(key.asymmetricKeyType!=='ed25519')fail('private key is not Ed25519');return key;}
function signatureMessage(manifestBytes:Buffer){return Buffer.concat([SIGNATURE_DOMAIN,manifestBytes]);}
export async function createPublicSnapshot(options:{releaseRoot:string;networkId:string;height:string;previous:string|null;privateKey:string|Buffer}):Promise<CreatedPublicSnapshot>{
 const key=privateSigningKey(options.privateKey),publicKey=createPublicKey(key),keyId=hashId(sha256(publicKey.export({type:'spki',format:'der'}) as Buffer));
 const release=await collectRuntimeRelease(options.releaseRoot);
 const manifest=validateManifest({format:SNAPSHOT_FORMAT,formatVersion:SNAPSHOT_VERSION,networkId:options.networkId,authority:{keyId},checkpoint:{height:options.height,previous:options.previous},policy:{scope:'release-only',userGeneratedContent:'excluded'},publicState:[],release});
 const manifestBytes=Buffer.from(canonicalJson(manifest)),snapshotId=hashId(sha256(manifestBytes));
 const envelope=validateSignature({format:SIGNATURE_FORMAT,formatVersion:SNAPSHOT_VERSION,snapshotId,keyId,algorithm:'Ed25519',signature:sign(null,signatureMessage(manifestBytes),key).toString('base64url')});
 return {manifest,manifestBytes,signature:envelope,signatureBytes:Buffer.from(canonicalJson(envelope)),snapshotId};
}
export async function writePublicSnapshotBundle(options:{releaseRoot:string;outputRoot:string;networkId:string;height:string;previous:string|null;privateKey:string|Buffer}){
 const releaseRoot=resolve(options.releaseRoot),outputRoot=resolve(options.outputRoot),buildRoot=resolve(releaseRoot,'build-node');
 if(outputRoot===buildRoot||outputRoot.startsWith(buildRoot+sep))throw Error('Snapshot output cannot be inside build-node');
 const snapshot=await createPublicSnapshot(options),name=snapshot.snapshotId.slice('sha256:'.length),target=join(outputRoot,name),temporary=join(outputRoot,'.tmp-'+randomUUID());
 await mkdir(outputRoot,{recursive:true});await mkdir(temporary);
 try{
  await writeFile(join(temporary,'manifest.json'),snapshot.manifestBytes,{flag:'wx'});
  await writeFile(join(temporary,'signature.json'),snapshot.signatureBytes,{flag:'wx'});
  try{await rename(temporary,target);}catch(error){
   if(!['EEXIST','ENOTEMPTY','EPERM'].includes((error as NodeJS.ErrnoException).code??''))throw error;
   let manifest:Buffer,signature:Buffer;
   try{[manifest,signature]=await Promise.all([readFile(join(target,'manifest.json')),readFile(join(target,'signature.json'))]);}catch{throw error;}
   if(!manifest.equals(snapshot.manifestBytes)||!signature.equals(snapshot.signatureBytes))throw Error('Existing snapshot directory has different contents');
  }
 }finally{await rm(temporary,{recursive:true,force:true});}
 await writeFile(join(outputRoot,'latest'),snapshot.snapshotId+'\n');
 return {...snapshot,directory:target};
}
export async function verifyPublicSnapshot(options:{bundleDirectory:string;releaseRoot:string;publicKey:string|Buffer}):Promise<VerifiedPublicSnapshot>{
 const [manifestBytes,signatureBytes]=await Promise.all([readLimited(join(options.bundleDirectory,'manifest.json'),MAX_MANIFEST_BYTES),readLimited(join(options.bundleDirectory,'signature.json'),MAX_SIGNATURE_BYTES)]);
 const manifest=validateManifest(parseCanonical(manifestBytes,'manifest'));
 const envelope=validateSignature(parseCanonical(signatureBytes,'signature envelope'));
 const snapshotId=hashId(sha256(manifestBytes)),keyId=publicKeyFingerprint(options.publicKey);
 if(envelope.snapshotId!==snapshotId||envelope.keyId!==keyId||manifest.authority.keyId!==keyId)fail('signature identity does not match manifest and external key');
 const publicKey=createPublicKey(options.publicKey),signature=Buffer.from(envelope.signature,'base64url');
 if(signature.length!==64||!verify(null,signatureMessage(manifestBytes),publicKey,signature))fail('signature verification failed');
 const local=await collectRuntimeRelease(options.releaseRoot);
 if(local.rootSha256!==manifest.release.rootSha256||canonicalJson(local.files)!==canonicalJson(manifest.release.files))fail('local runtime release does not match signed manifest');
 return {manifest,manifestBytes,signature:envelope,signatureBytes,snapshotId,signerKeyId:keyId};
}

export async function importPublicSnapshot(pool:Connections,snapshot:VerifiedPublicSnapshot){
 const connection=await pool.connect();
 try{
  await connection.query('BEGIN');await connection.query('SELECT pg_advisory_xact_lock(194733,3)');
  const head=await connection.query(`SELECT h.snapshot_id,i.network_id,i.checkpoint_height,i.previous_snapshot_id,i.release_root_sha256,i.signer_key_id,i.manifest_json FROM public_snapshot_head h JOIN public_snapshot_imports i ON i.snapshot_id=h.snapshot_id WHERE h.singleton=1 FOR UPDATE`);
  if(head.rows.length&&head.rows[0].snapshot_id===snapshot.snapshotId){
   const row=head.rows[0];if(row.manifest_json!==snapshot.manifestBytes.toString()||row.signer_key_id!==snapshot.signerKeyId||row.release_root_sha256!==snapshot.manifest.release.rootSha256)fail('stored head provenance does not match verified snapshot');
   await connection.query('COMMIT');return {status:'already-imported' as const,snapshotId:snapshot.snapshotId,height:snapshot.manifest.checkpoint.height};
  }
  const height=decimal(snapshot.manifest.checkpoint.height,'checkpoint height');
  if(!head.rows.length){
   const count=await connection.query('SELECT COUNT(*)::int AS count FROM public_snapshot_imports');if(Number(count.rows[0]?.count)!==0)fail('provenance exists without a head');
   if(height!==0||snapshot.manifest.checkpoint.previous!==null)fail('first imported checkpoint must be genesis');
  }else{
   const current=head.rows[0],currentHeight=Number(current.checkpoint_height);
   if(current.network_id!==snapshot.manifest.networkId)fail('network ID differs from current head');
   if(current.signer_key_id!==snapshot.signerKeyId)fail('signer key differs from current head');
   if(height<=currentHeight)fail('rollback is not allowed');
   if(height!==currentHeight+1||snapshot.manifest.checkpoint.previous!==current.snapshot_id)fail('checkpoint does not directly extend current head');
  }
  await connection.query(`INSERT INTO public_snapshot_imports(snapshot_id,format,format_version,network_id,checkpoint_height,previous_snapshot_id,release_root_sha256,signer_key_id,manifest_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[snapshot.snapshotId,SNAPSHOT_FORMAT,SNAPSHOT_VERSION,snapshot.manifest.networkId,height,snapshot.manifest.checkpoint.previous,snapshot.manifest.release.rootSha256,snapshot.signerKeyId,snapshot.manifestBytes.toString()]);
  await connection.query(`INSERT INTO public_snapshot_head(singleton,snapshot_id,updated_at) VALUES(1,$1,now()) ON CONFLICT(singleton) DO UPDATE SET snapshot_id=excluded.snapshot_id,updated_at=excluded.updated_at`,[snapshot.snapshotId]);
  await connection.query('COMMIT');return {status:'imported' as const,snapshotId:snapshot.snapshotId,height:snapshot.manifest.checkpoint.height};
 }catch(error){await connection.query('ROLLBACK');throw error;}finally{connection.release?.();}
}
export async function publicSnapshotStatus(pool:Connections){
 const result=await pool.query(`SELECT i.snapshot_id,i.format,i.format_version,i.network_id,i.checkpoint_height,i.previous_snapshot_id,i.release_root_sha256,i.signer_key_id,i.imported_at,h.updated_at FROM public_snapshot_head h JOIN public_snapshot_imports i ON i.snapshot_id=h.snapshot_id WHERE h.singleton=1`);
 if(!result.rows.length)return {status:'empty' as const};const row=result.rows[0];
 return {status:'ready' as const,snapshotId:String(row.snapshot_id),format:String(row.format),formatVersion:Number(row.format_version),networkId:String(row.network_id),height:String(row.checkpoint_height),previous:row.previous_snapshot_id===null?null:String(row.previous_snapshot_id),releaseRootSha256:String(row.release_root_sha256),signerKeyId:String(row.signer_key_id),importedAt:row.imported_at,updatedAt:row.updated_at};
}

export async function resolveLatestSnapshotDirectory(outputRoot:string){
 const pointer=(await readLimited(join(outputRoot,'latest'),256)).toString('utf8');if(!/^sha256:[0-9a-f]{64}\n$/.test(pointer))fail('latest pointer is invalid');return join(resolve(outputRoot),pointer.trim().slice('sha256:'.length));
}
export async function writeSnapshotKeys(privatePath:string,publicPath:string){
 const privateTarget=resolve(privatePath),publicTarget=resolve(publicPath);if(privateTarget===publicTarget)throw Error('Private and public key paths must differ');
 const keys=generateSnapshotKeys();await Promise.all([mkdir(dirname(privateTarget),{recursive:true}),mkdir(dirname(publicTarget),{recursive:true})]);
 await writeFile(privateTarget,keys.privateKeyPem,{flag:'wx',mode:0o600});
 try{await writeFile(publicTarget,keys.publicKeyPem,{flag:'wx',mode:0o644});}catch(error){await rm(privateTarget,{force:true});throw error;}
 return {keyId:keys.keyId,privatePath:privateTarget,publicPath:publicTarget};
}
