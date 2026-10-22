/**
 * Opt-in, read-only transport between independently operated peer machines.
 * Only previously finalized PUBLIC knowledge packages are exchanged.
 * NOT automatic discovery, distributed consensus, or private data federation.
 */
import {createServer, type Server} from 'node:http';
import {readdir, open, lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {constants} from 'node:fs';
import {join, resolve} from 'node:path';
import {canonicalKnowledgeJson} from '../app/lib/knowledge-model';
import {validateKnowledgeReplicationPackage, type KnowledgeReplicationPackage} from './knowledge-replication-finality';
import {writeKnowledgeReplicationOutbox} from './knowledge-replica-agent';
import type {KnowledgeReplicaImportOptions} from './knowledge-replica-import';

const FORMAT = 'org.agoranode.public-peer-index.v1';
const FILENAME = /^[0-9]{16}-[0-9a-f]{64}\.knowledge-final\.json$/;
const MAX_PACKAGE_BYTES = 64 * 1024 * 1024;
const MAX_INDEX_BYTES = 1024 * 1024;
const MAX_LIST = 256;
const TIMEOUT_MS = 15_000;
type PeerOptions = KnowledgeReplicaImportOptions & {directory: string};
export type PublicPeerIndex = {format: typeof FORMAT; networkId: string; spaceId: string; packages: string[]};

function nameOf(pkg: KnowledgeReplicationPackage): string {
  return String(pkg.finality.statement.sequence).padStart(16, '0')+'-'+pkg.sha256+'.knowledge-final.json';
}
function safeName(name: string): boolean {return FILENAME.test(name);}
async function readVerifiedPackage(directory: string, name: string, options: PeerOptions) {
  if (!safeName(name)) throw Error('Invalid public package filename');
  const path = join(resolve(directory), name);
  // Open the actual file descriptor without following symlinks. This avoids
  // a path-swap race between lstat(path) and readFile(path).
  const handle=await open(path,constants.O_RDONLY | (constants.O_NOFOLLOW??0));
  let raw: Buffer;
  try {
    const meta=await handle.stat();
    if(!meta.isFile()||meta.size>MAX_PACKAGE_BYTES)throw Error('Not a bounded regular public package');
    raw=await handle.readFile();
    if(raw.byteLength!==meta.size)throw Error('Package changed during read');
  } finally {await handle.close();}
  let parsed: unknown;
  try {parsed = JSON.parse(raw.toString('utf8'));} catch {throw Error('Package is not JSON');}
  const pkg = await validateKnowledgeReplicationPackage(parsed, {
    validatorSet: options.validatorSet,
    allowLegacyBootstrap: options.allowLegacyBootstrap,
    verifyGovernanceAuthorization: options.verifyGovernanceAuthorization,
  });
  if (pkg.networkId !== options.expectedNetworkId || pkg.spaceId !== options.expectedSpaceId ||
      nameOf(pkg) !== name || canonicalKnowledgeJson(pkg)+'\n' !== raw.toString('utf8')) {
    throw Error('Public peer package namespace, name or canonical bytes mismatch');
  }
  return raw;
}
async function names(options: PeerOptions): Promise<string[]> {
  const entries = await readdir(resolve(options.directory), {withFileTypes: true});
  const candidates = entries.filter(e => e.isFile() && safeName(e.name)).map(e => e.name).sort();
  if (candidates.length > MAX_LIST) throw Error('Peer index exceeds bounded window');
  const approved: string[] = [];
  for (const name of candidates) {
    try {await readVerifiedPackage(options.directory, name, options); approved.push(name);}
    catch { /* Invalid files are excluded from peer advertisement. */ }
  }
  return approved;
}
/**
 * Avoid rehashing all old snapshots on every one-second index request.
 * Inode, size, mtime AND ctime invalidate the cached positive verification;
 * receivers recheck signatures and hashes before importing regardless.
 */
export class PublicPeerIndexCache {
  private verified=new Map<string,string>();
  async names(options: PeerOptions):Promise<string[]> {
    const entries=await readdir(resolve(options.directory),{withFileTypes:true});
    const candidates=entries.filter(e=>e.isFile()&&safeName(e.name)).map(e=>e.name).sort();
    if(candidates.length>MAX_LIST)throw Error('Peer index exceeds bounded window');
    const approved:string[]=[],present=new Set(candidates);
    for(const name of candidates){
      try {
        const meta=await lstat(join(resolve(options.directory),name));
        if(!meta.isFile()||meta.isSymbolicLink())continue;
        const stamp=[meta.dev,meta.ino,meta.size,meta.mtimeMs,meta.ctimeMs].join(':');
        if(this.verified.get(name)!==stamp){
          await readVerifiedPackage(options.directory,name,options);
          this.verified.set(name,stamp);
        }
        approved.push(name);
      }catch {this.verified.delete(name);}
    }
    for(const name of this.verified.keys())if(!present.has(name))this.verified.delete(name);
    return approved;
  }
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, {status, headers: {'cache-control':'no-store','x-content-type-options':'nosniff'}});
}

/** Pure HTTP route; TLS termination belongs to the independently hosted gateway. */
export async function publicPeerRequest(request: Request, options: PeerOptions, cache?: PublicPeerIndexCache): Promise<Response> {
  if (request.method !== 'GET') return json({error:'Method not allowed'},405);
  const url = new URL(request.url);
  if (url.search || url.hash) return json({error:'Invalid request'},400);
  if (url.pathname === '/v1/index') {
    const index: PublicPeerIndex = {format:FORMAT,networkId:options.expectedNetworkId,
      spaceId:options.expectedSpaceId,packages:cache?await cache.names(options):await names(options)};
    const etag='"'+createHash('sha256').update(JSON.stringify(index)).digest('hex')+'"';
    const headers={'cache-control':'no-store','etag':etag,'x-content-type-options':'nosniff'};
    if(request.headers.get('if-none-match')===etag) return new Response(null,{status:304,headers});
    return Response.json(index,{headers});
  }
  const prefix='/v1/packages/';
  if (!url.pathname.startsWith(prefix)) return json({error:'Not found'},404);
  const filename=url.pathname.slice(prefix.length);
  if (!safeName(filename)) return json({error:'Not found'},404);
  try {
    const bytes=await readVerifiedPackage(options.directory,filename,options);
    return new Response(new Uint8Array(bytes),{headers:{
      'content-type':'application/json; charset=utf-8','content-length':String(bytes.length),
      'cache-control':'public, max-age=300','x-content-type-options':'nosniff'}});
  } catch {return json({error:'Not found'},404);}
}

/** Loopback by default: public exposure requires operator-managed TLS proxy. */
export function createPublicPeerServer(options: PeerOptions, host='127.0.0.1'): Server {
  const indexCache=new PublicPeerIndexCache();
  return createServer({requestTimeout:30_000},async(incoming,outgoing)=>{
    try {
      const request=new Request('http://'+host+(incoming.url??'/'),{method:incoming.method??'GET'});
      const response=await publicPeerRequest(request,options,indexCache);
      outgoing.writeHead(response.status,Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      outgoing.writeHead(503,{'cache-control':'no-store','content-type':'application/json'});
      outgoing.end('{"error":"Public peer unavailable"}');
    }
  });
}
export function peerOrigin(value: string, allowInsecureLoopback=false): string {
  const parsed=new URL(value);
  const isLoopback=['127.0.0.1','[::1]'].includes(parsed.hostname);
  if ((parsed.protocol!=='https:'&&!(allowInsecureLoopback&&isLoopback&&parsed.protocol==='http:')) ||
      parsed.username||parsed.password||parsed.pathname!=='/'||parsed.search||parsed.hash) {
    throw Error('Peer origin must be a bare HTTPS origin (test loopback exception only)');
  }
  return parsed.origin;
}
async function boundedBody(response: Response,max: number): Promise<string> {
  if (!response.ok||response.status!==200||!response.body) throw Error('Peer request unsuccessful');
  const length=response.headers.get('content-length');
  if(length&&(!/^\d+$/.test(length)||Number(length)>max)) throw Error('Peer response exceeds size limit');
  const chunks:Uint8Array[]=[];
  let total=0;
  const reader=response.body.getReader();
  try {
    while(true) {
      const {done,value}=await reader.read();
      if(done) break;
      total+=value.byteLength;
      if(total>max) throw Error('Peer response exceeds size limit');
      chunks.push(value);
    }
  } finally {reader.releaseLock();}
  return Buffer.concat(chunks,total).toString('utf8');
}
function parseIndex(value: unknown, options: PeerOptions): string[] {
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid peer index');
  const item=value as Record<string,unknown>;
  if(Object.keys(item).sort().join(',')!=='format,networkId,packages,spaceId'||
    item.format!==FORMAT||item.networkId!==options.expectedNetworkId||
    item.spaceId!==options.expectedSpaceId||!Array.isArray(item.packages)||
    item.packages.length>MAX_LIST||!item.packages.every(v=>typeof v==='string'&&safeName(v))) {
    throw Error('Invalid peer index');
  }
  const checked=item.packages as string[];
  if(checked.some((v,i)=>i>0&&checked[i-1]>=v))throw Error('Unsorted or duplicated peer index');
  return checked;
}
/**
 * Pull from an explicitly configured peer URL. Verify signed namespaces BEFORE
 * atomically writing to an inbox consumed by the existing DB importer.
 */
export async function pullPublicPeer(origin: string,options: PeerOptions,
  deps:{fetcher?: typeof fetch; allowInsecureLoopback?: boolean}={}) {
  const base=peerOrigin(origin,deps.allowInsecureLoopback),fetcher=deps.fetcher??fetch;
  const fetchBounded=async(route:string,size:number)=>{
    const response=await fetcher(base+route,{method:'GET',redirect:'manual',credentials:'omit',
      signal:AbortSignal.timeout(TIMEOUT_MS),headers:{accept:'application/json'}});
    return boundedBody(response,size);
  };
  const index=parseIndex(JSON.parse(await fetchBounded('/v1/index',MAX_INDEX_BYTES)),options);
  const results:Array<{name:string;created:boolean}>=[];
  for(const name of index) {
    // Verified local files are immutable: do not re-download entire cumulative
    // knowledge bundles on each poll. Fail closed on a corrupt local file;
    // operators must quarantine it explicitly rather than silently overwriting.
    try {
      await readVerifiedPackage(options.directory,name,options);
      results.push({name,created:false});
      continue;
    } catch(error) {
      if((error as NodeJS.ErrnoException).code!=='ENOENT') throw error;
    }
    const payload:unknown=JSON.parse(await fetchBounded('/v1/packages/'+name,MAX_PACKAGE_BYTES));
    const validated=await validateKnowledgeReplicationPackage(payload,{
      validatorSet:options.validatorSet,allowLegacyBootstrap:options.allowLegacyBootstrap,
      verifyGovernanceAuthorization:options.verifyGovernanceAuthorization,
    });
    if(validated.networkId!==options.expectedNetworkId||
       validated.spaceId!==options.expectedSpaceId||nameOf(validated)!==name){
      throw Error('Remote peer sent a package outside its announced namespace');
    }
    const result=await writeKnowledgeReplicationOutbox(options.directory,validated,{
      validatorSet:options.validatorSet,allowLegacyBootstrap:options.allowLegacyBootstrap,
      verifyGovernanceAuthorization:options.verifyGovernanceAuthorization,
    });
    results.push({name,created:result.created});
  }
  return results;
}


/**
 * Sequential source failover for already known, independently hosted peers.
 * This is NOT automatic peer discovery or a failover gateway for end users.
 * Each origin is checked before trying any; no credentials are forwarded.
 */
export async function pullFromPublicPeers(
  origins: readonly string[], options: PeerOptions,
  deps: {fetcher?: typeof fetch; allowInsecureLoopback?: boolean} = {},
) {
  if (!Array.isArray(origins) || origins.length === 0 || origins.length > 8) {
    throw Error('Choose between one and eight independent public peers');
  }
  const approved = origins.map(value => peerOrigin(value, deps.allowInsecureLoopback));
  if (new Set(approved).size !== approved.length) throw Error('Duplicate public peer');
  for (const origin of approved) {
    try {
      const packages = await pullPublicPeer(origin, options, deps);
      return {packages, tried: approved.indexOf(origin) + 1};
    } catch {
      // A peer may be unavailable, inconsistent or malicious. Another fully
      // validated origin can still supply the missing public packages.
    }
  }
  throw Error('All configured public peers failed verification or were unreachable');
}
