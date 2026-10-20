import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,stat,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {initialize,composeArgs,composeEnvironment,ensureSnapshotDirectories,parseInitArgs,validSnapshotBasename} from '../scripts/selfhost.mjs';
test('self-host setup generates isolated secrets, uses a private socket and never overwrites an existing installation',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'polis-selfhost-'));
 try{
  const result=await initialize(dir);assert.equal(result.origin,'https://localhost:8443');
  const env=await readFile(join(dir,'.selfhost/runtime.env'),'utf8');
  assert.match(env,/REGISTRATIONS_OPEN=false/);assert.match(env,/FORUM_OPEN=false/);assert.match(env,/BIND_ADDRESS=127.0.0.1/);assert.match(env,/host=%2Fvar%2Frun%2Fpostgresql/);
  assert.match(env,/AUTH_SECRET=[0-9a-f]{96}/);assert.match(env,/POSTGRES_PASSWORD=[0-9a-f]{64}/);
  assert.match(env,/COMPOSE_PROJECT_NAME=polisrossa-[0-9a-f]{12}/);assert.match(env,/HTTPS_PORT=8443/);assert.match(env,/HTTP_PORT=8080/);
  for(const path of [['private','snapshot'],['snapshots'],['replica']])assert.equal((await stat(join(dir,'.selfhost',...path))).isDirectory(),true);
  const marker=join(dir,'.selfhost','private','snapshot','keep.txt');await writeFile(marker,'keep');await ensureSnapshotDirectories(dir);assert.equal(await readFile(marker,'utf8'),'keep');
  if(process.platform!=='win32')assert.equal((await stat(join(dir,'.selfhost/runtime.env'))).mode&0o777,0o600);
  await assert.rejects(initialize(dir),/not be overwritten/);
  assert.equal(await readFile(join(dir,'.selfhost/runtime.env'),'utf8'),env);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('self-host setup rejects injected origins, paths and unknown operating modes',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'polis-invalid-'));
 try{
  for(const url of ['http://example.test','https://example.test/path','https://user:pass@example.test','https://example.test/?x=1'])await assert.rejects(initialize(dir,url));
  await assert.rejects(initialize(dir,'https://example.test','unknown'));
  for(const project of ['Uppercase','-leading','contains space','x'.repeat(64)])await assert.rejects(initialize(dir,'https://example.test','primary',{project}));
  for(const httpPort of ['0','65536','8O80'])await assert.rejects(initialize(dir,'https://example.test','primary',{httpPort}));
  await assert.rejects(initialize(dir,'https://example.test:9443','primary',{httpPort:'9443'}),/must be different/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('self-host mirror starts closed, and stop never removes persistent volumes',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'polis-mirror-'));
 try{
  const result=await initialize(dir,'https://localhost:9443','mirror',{project:'polisrossa_node2',httpPort:'9080'}),env=await readFile(join(dir,'.selfhost/runtime.env'),'utf8');
  assert.equal(result.project,'polisrossa_node2');assert.equal(result.httpPort,9080);assert.equal(result.httpsPort,9443);
  assert.match(env,/MIRROR_MODE=true/);assert.match(env,/COMPOSE_PROJECT_NAME=polisrossa_node2/);assert.match(env,/HTTPS_PORT=9443/);assert.match(env,/HTTP_PORT=9080/);
  assert.deepEqual(composeArgs('stop').slice(-1),['stop']);assert.throws(()=>composeArgs('delete'));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('init flags are order-independent and reject ambiguity',()=>{
 assert.deepEqual(parseInitArgs(['--project','polisrossa_node','https://localhost:9443','--http-port','9080','mirror']),{urlText:'https://localhost:9443',mode:'mirror',options:{project:'polisrossa_node',httpPort:'9080'}});
 assert.deepEqual(parseInitArgs([]),{urlText:'https://localhost:8443',mode:'primary',options:{}});
 assert.throws(()=>parseInitArgs(['--project']),/Missing value/);assert.throws(()=>parseInitArgs(['--unknown','x']),/Unknown/);assert.throws(()=>parseInitArgs(['one','two','three']),/Use init/);
});
test('snapshot commands pass only validated basenames to the isolated tool container',()=>{
 const keygen=composeArgs('snapshot-keygen');assert.deepEqual(keygen.slice(-6),['run','--rm','-T','--no-deps','snapshot-sign','keygen']);
 const exported=composeArgs('snapshot-export');assert.deepEqual(exported.slice(-6),['run','--rm','-T','--no-deps','snapshot-sign','export']);
 const verified=composeArgs('snapshot-verify',['a'.repeat(64),'community.pem']);assert.deepEqual(verified.slice(-8),['run','--rm','-T','--no-deps','snapshot','verify','a'.repeat(64),'community.pem']);
 const imported=composeArgs('snapshot-import',['a'.repeat(64),'community.pem']);assert.deepEqual(imported.slice(-7),['run','--rm','-T','snapshot-db','import','a'.repeat(64),'community.pem']);
 assert.deepEqual(composeArgs('snapshot-status').slice(-5),['run','--rm','-T','snapshot-db','status']);
 for(const value of ['../snapshot','folder/snapshot','folder\\snapshot','.hidden','..','C:secret'])assert.equal(validSnapshotBasename(value),false);
 for(const operands of [['../snapshot','public.pem'],['snapshot','../public.pem'],['snapshot'],['snapshot','public.pem','extra']])assert.throws(()=>composeArgs('snapshot-import',operands),/requires/);
 assert.throws(()=>composeArgs('snapshot-export',['extra']),/height/);
 assert.throws(()=>composeArgs('snapshot-export',['1']),/predecessor/);
 assert.throws(()=>composeArgs('snapshot-export',['0','sha256:'+'a'.repeat(64)]),/predecessor/);
 assert.doesNotThrow(()=>composeArgs('snapshot-export',['1','sha256:'+'a'.repeat(64)]));
 const inherited={COMPOSE_PROJECT_NAME:'wrong',SNAPSHOT_PRIVATE_ACCESS:'rw',SNAPSHOT_DIR_ACCESS:'rw',SNAPSHOT_REPLICA_ACCESS:'rw',KEEP:'yes'};
 assert.deepEqual(composeEnvironment('snapshot-verify',inherited),{SNAPSHOT_PRIVATE_ACCESS:'ro',SNAPSHOT_DIR_ACCESS:'ro',SNAPSHOT_REPLICA_ACCESS:'ro',KEEP:'yes'});
 assert.equal(composeEnvironment('snapshot-keygen',{}).SNAPSHOT_PRIVATE_ACCESS,'rw');assert.equal(composeEnvironment('snapshot-keygen',{}).SNAPSHOT_REPLICA_ACCESS,'rw');
 assert.deepEqual(composeEnvironment('snapshot-export',{},['2','sha256:'+'b'.repeat(64)]),{SNAPSHOT_PRIVATE_ACCESS:'ro',SNAPSHOT_DIR_ACCESS:'rw',SNAPSHOT_REPLICA_ACCESS:'ro',SNAPSHOT_HEIGHT:'2',SNAPSHOT_PREVIOUS:'sha256:'+'b'.repeat(64)});
});
test('only the signing tool receives the private key mount',async()=>{
 const compose=await readFile(new URL('../deploy/selfhost/compose.yaml',import.meta.url),'utf8');
 assert.match(compose,/postmaster\.pid[\s\S]*= 1 && pg_isready/);
 const app=compose.slice(compose.indexOf('  app:'),compose.indexOf('  proxy:'));
 const snapshot=compose.slice(compose.indexOf('  snapshot:'),compose.indexOf('  snapshot-db:'));
 const database=compose.slice(compose.indexOf('  snapshot-db:'),compose.indexOf('  snapshot-sign:'));
 const signer=compose.slice(compose.indexOf('  snapshot-sign:'),compose.indexOf('\nvolumes:'));
 assert.doesNotMatch(app,/snapshot-private|SNAPSHOT_PRIVATE_KEY/);
 assert.match(app,/image: "polisrossa-runtime:\$\{COMPOSE_PROJECT_NAME:-polisrossa\}"/);
 assert.doesNotMatch(snapshot,/snapshot-private|SNAPSHOT_PRIVATE_KEY|DATABASE_URL|\/var\/run\/postgresql/);assert.match(snapshot,/profiles: \[tools\]/);assert.match(snapshot,/pull_policy: never/);assert.match(snapshot,/network_mode: none/);assert.match(snapshot,/entrypoint: \[node, build-node\/snapshot\.mjs\]/);assert.doesNotMatch(snapshot,/\n    build:/);
 assert.match(database,/DATABASE_URL|\/var\/run\/postgresql/);assert.doesNotMatch(database,/snapshot-private|SNAPSHOT_PRIVATE_KEY/);
 assert.match(signer,/snapshot-private:\$\{SNAPSHOT_PRIVATE_ACCESS:-ro\}/);assert.match(signer,/SNAPSHOT_PRIVATE_KEY/);assert.match(signer,/network_mode: none/);assert.doesNotMatch(signer,/DATABASE_URL|\/var\/run\/postgresql/);
});
