import {readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createPool,connections} from './pool';
import {migrateDatabase} from './migrations';
import {importPublicSnapshot,publicSnapshotStatus,resolveLatestSnapshotDirectory,verifyPublicSnapshot,writePublicSnapshotBundle,writeSnapshotKeys} from './public-snapshot';

const command=process.argv[2];
const args=process.argv.slice(3);
const releaseRoot=resolve(process.env.SNAPSHOT_RELEASE_ROOT??process.cwd());
const snapshotRoot=resolve(process.env.SNAPSHOT_DIR??'snapshots');
const replicaRoot=resolve(process.env.SNAPSHOT_REPLICA_DIR??'replica');
const privateKeyPath=resolve(process.env.SNAPSHOT_PRIVATE_KEY??'snapshot-private.pem');
const publicKeyPath=resolve(process.env.SNAPSHOT_PUBLIC_KEY??(process.env.SNAPSHOT_REPLICA_DIR?join(process.env.SNAPSHOT_REPLICA_DIR,'public.pem'):'snapshot-public.pem'));
const output=(value:unknown)=>process.stdout.write(JSON.stringify(value)+'\n');
const key=async(path:string)=>{const value=await readFile(path);if(value.length>65536)throw Error('Snapshot key file is too large');return value;};
const basename=(value:string)=>{if(!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value))throw Error('Snapshot and key arguments must be plain basenames');return value;};
const inputs=async()=>{
 if(args.length===2)return {bundleDirectory:join(replicaRoot,basename(args[0])),publicKey:await key(join(replicaRoot,basename(args[1])))};
 if(args.length>1)throw Error('verify/import accepts either no argument, one bundle path, or two replica basenames');
 return {bundleDirectory:args[0]?resolve(args[0]):await resolveLatestSnapshotDirectory(snapshotRoot),publicKey:await key(publicKeyPath)};
};
const database=async<T>(operation:(pool:ReturnType<typeof createPool>)=>Promise<T>)=>{
 const connectionString=process.env.DATABASE_URL;if(!connectionString)throw Error('Missing configuration: DATABASE_URL');
 const pool=createPool(connectionString);try{await migrateDatabase(connections(pool),new URL('./migrations/',import.meta.url));return await operation(pool);}finally{await pool.end();}
};

try{
 if(command==='keygen'){
  const result=await writeSnapshotKeys(args[0]?resolve(args[0]):privateKeyPath,args[1]?resolve(args[1]):publicKeyPath);output({ok:true,...result});
 }else if(command==='export'){
  const previous=process.env.SNAPSHOT_PREVIOUS?.trim()||null;
  const result=await writePublicSnapshotBundle({releaseRoot,outputRoot:args[0]?resolve(args[0]):snapshotRoot,networkId:process.env.SNAPSHOT_NETWORK_ID??'polisrossa-public',height:process.env.SNAPSHOT_HEIGHT??'0',previous,privateKey:await key(privateKeyPath)});
  output({ok:true,snapshotId:result.snapshotId,keyId:result.signature.keyId,directory:result.directory,releaseRootSha256:result.manifest.release.rootSha256,policy:result.manifest.policy});
 }else if(command==='verify'||command==='import'){
  const result=await verifyPublicSnapshot({...await inputs(),releaseRoot});
  if(command==='verify')output({ok:true,snapshotId:result.snapshotId,keyId:result.signerKeyId,networkId:result.manifest.networkId,height:result.manifest.checkpoint.height,releaseRootSha256:result.manifest.release.rootSha256,policy:result.manifest.policy});
  else output({ok:true,...await database(pool=>importPublicSnapshot(connections(pool),result))});
 }else if(command==='status'){
  output(await database(pool=>publicSnapshotStatus(connections(pool))));
 }else{
  throw Error('Usage: snapshot.mjs keygen [private.pem public.pem] | export [snapshot-dir] | verify [bundle-dir] | import [bundle-dir] | status');
 }
}catch(error){console.error(error instanceof Error?error.message:'Snapshot operation failed');process.exitCode=1;}
