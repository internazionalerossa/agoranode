import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,stat,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {initialize,composeArgs,composeEnvironment,ensureSnapshotDirectories,parseInitArgs,validSnapshotBasename,createFounderInvitations,createAccountAccessCode,publicationPreflight,formatPublicationPreflight,configureTunnelOrigin,tunnelCaddyConfiguration} from '../scripts/selfhost.mjs';
test('self-host setup generates isolated secrets, uses a private socket and never overwrites an existing installation',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'polis-selfhost-'));
 try{
  const result=await initialize(dir);assert.equal(result.origin,'https://localhost:8443');
  const env=await readFile(join(dir,'.selfhost/runtime.env'),'utf8');
  assert.match(env,/REGISTRATIONS_OPEN=false/);assert.match(env,/FORUM_OPEN=false/);assert.match(env,/BIND_ADDRESS=127.0.0.1/);assert.match(env,/host=%2Fvar%2Frun%2Fpostgresql/);
  assert.match(env,/MAIL_TRANSPORT=none/);assert.match(env,/DISCORD_CLIENT_ID=\n/);assert.match(env,/COMMUNITY_BOOTSTRAP_HASH=\n/);assert.match(env,/ACCOUNT_ACCESS_HASH=\n/);
  assert.match(env,/AUTH_SECRET=[0-9a-f]{96}/);assert.match(env,/POSTGRES_PASSWORD=[0-9a-f]{64}/);
  assert.match(env,/COMPOSE_PROJECT_NAME=polisrossa-[0-9a-f]{12}/);assert.match(env,/HTTPS_PORT=8443/);assert.match(env,/HTTP_PORT=8080/);
  for(const path of [['private','snapshot'],['snapshots'],['replica']])assert.equal((await stat(join(dir,'.selfhost',...path))).isDirectory(),true);
  const marker=join(dir,'.selfhost','private','snapshot','keep.txt');await writeFile(marker,'keep');await ensureSnapshotDirectories(dir);assert.equal(await readFile(marker,'utf8'),'keep');
  if(process.platform!=='win32')assert.equal((await stat(join(dir,'.selfhost/runtime.env'))).mode&0o777,0o600);
  await assert.rejects(initialize(dir),/not be overwritten/);
  assert.equal(await readFile(join(dir,'.selfhost/runtime.env'),'utf8'),env);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('founder invitations are generated once, stored privately and represented in runtime.env only by hashes',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'polis-founders-'));
 try{
  await initialize(dir,'https://polisrossa.example.org');
  const first=await createFounderInvitations(dir);assert.equal(first.created,true);assert.equal(first.count,3);
  const privateFile=await readFile(first.path,'utf8'),codes=[...privateFile.matchAll(/^[1-3]=(pr2-[A-Za-z0-9_-]{43})$/gm)].map(match=>match[1]);
  assert.equal(codes.length,3);assert.equal(new Set(codes).size,3);
  const runtime=await readFile(join(dir,'.selfhost/runtime.env'),'utf8'),hashes=/^COMMUNITY_BOOTSTRAP_HASH=([0-9a-f,]+)$/m.exec(runtime)?.[1].split(',')??[];
  assert.equal(hashes.length,3);assert.equal(new Set(hashes).size,3);for(const code of codes)assert.doesNotMatch(runtime,new RegExp(code));
  const second=await createFounderInvitations(dir);assert.equal(second.created,false);assert.equal(await readFile(first.path,'utf8'),privateFile);assert.equal(await readFile(join(dir,'.selfhost/runtime.env'),'utf8'),runtime);
  if(process.platform!=='win32')assert.equal((await stat(first.path)).mode&0o777,0o600);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('initial account access is generated once and only its hash enters runtime.env',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'polis-account-access-'));
 try{
  await initialize(dir,'https://polisrossa.example.org');const first=await createAccountAccessCode(dir);assert.equal(first.created,true);
  const privateFile=await readFile(first.path,'utf8'),code=/^(pr1-[A-Za-z0-9_-]{43})$/m.exec(privateFile)?.[1];assert.ok(code);
  const runtime=await readFile(join(dir,'.selfhost/runtime.env'),'utf8');assert.match(runtime,/^ACCOUNT_ACCESS_HASH=[0-9a-f]{64}$/m);assert.doesNotMatch(runtime,new RegExp(code));
  const second=await createAccountAccessCode(dir);assert.equal(second.created,false);assert.equal(await readFile(first.path,'utf8'),privateFile);assert.equal(await readFile(join(dir,'.selfhost/runtime.env'),'utf8'),runtime);
  if(process.platform!=='win32')assert.equal((await stat(first.path)).mode&0o777,0o600);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('publication preflight reports prerequisites without exposing credentials or opening services',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'polis-preflight-'));
 try{
  await initialize(dir,'https://polisrossa.example.org');await createFounderInvitations(dir);await createAccountAccessCode(dir);
  const path=join(dir,'.selfhost/runtime.env'),secretValues=['smtp-secret-value','facebook-secret-value'];let env=await readFile(path,'utf8');
  const set=(key,value)=>{env=env.replace(new RegExp(`^${key}=.*$`,'m'),`${key}=${value}`);};
  set('MAIL_TRANSPORT','smtp');set('MAIL_FROM','PolisRossa <mail@example.org>');set('SMTP_HOST','smtp.gmail.com');set('SMTP_USER','mail@example.org');set('SMTP_PASSWORD',secretValues[0]);set('FACEBOOK_CLIENT_ID','public-client-id');set('FACEBOOK_CLIENT_SECRET',secretValues[1]);set('PUBLIC_OPERATOR_NAME','Collettivo di prova');set('PUBLIC_PRIVACY_CONTACT','privacy@example.org');
  await writeFile(path,env);
  const result=await publicationPreflight(dir),output=formatPublicationPreflight(result);
  assert.equal(result.ready,true);assert.equal(result.registrationsOpen,false);assert.equal(result.forumOpen,false);assert.equal(result.invitations,'matching');assert.equal(result.accountAccess,'matching');
  assert.deepEqual(result.callbacks,['https://polisrossa.example.org/api/identity/callback/facebook']);assert.match(output,/Configurazione statica pronta/);assert.match(output,/Registrazioni chiuse; forum chiuso/);
  for(const secret of secretValues)assert.doesNotMatch(JSON.stringify(result)+output,new RegExp(secret));
  const withoutFacebook=env.replace(/^FACEBOOK_CLIENT_ID=.*$/m,'FACEBOOK_CLIENT_ID=').replace(/^FACEBOOK_CLIENT_SECRET=.*$/m,'FACEBOOK_CLIENT_SECRET=');await writeFile(path,withoutFacebook);
  const optionalFacebook=await publicationPreflight(dir);assert.equal(optionalFacebook.ready,true);assert.deepEqual(optionalFacebook.callbacks,[]);assert.match(optionalFacebook.checks.find(check=>check.id==='social')?.detail??'',/non è configurato/);
  set('MAIL_FROM','PolisRossa <other@example.org>');await writeFile(path,env);
  const mismatch=await publicationPreflight(dir),mismatchOutput=formatPublicationPreflight(mismatch);
  assert.equal(mismatch.ready,false);assert.equal(mismatch.checks.find(check=>check.id==='mail')?.ok,false);assert.match(mismatchOutput,/stessa casella verificata/);
  for(const secret of secretValues)assert.doesNotMatch(JSON.stringify(mismatch)+mismatchOutput,new RegExp(secret));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('publication preflight blocks local origins, missing external services and unsafe founder generation on mirrors',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'polis-preflight-blocked-'));
 try{
  await initialize(dir,'https://localhost:9443','mirror',{httpPort:'9080'});
  await assert.rejects(createFounderInvitations(dir),/primary installation/);
  const result=await publicationPreflight(dir);assert.equal(result.ready,false);assert.equal(result.callbacks.length,0);assert.ok(result.checks.filter(check=>!check.ok).length>=5);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('tunnel origin updates only the public origin and Caddy hosts while preserving private runtime values',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'polis-tunnel-origin-'));
 try{
  await initialize(dir);const runtimePath=join(dir,'.selfhost','runtime.env');let runtime=await readFile(runtimePath,'utf8');
  const secret=/^AUTH_SECRET=(.+)$/m.exec(runtime)?.[1],password=/^POSTGRES_PASSWORD=(.+)$/m.exec(runtime)?.[1];
  const result=await configureTunnelOrigin(dir,'https://polisrossa.example.ts.net');assert.equal(result.origin,'https://polisrossa.example.ts.net');
  runtime=await readFile(runtimePath,'utf8');assert.match(runtime,/^APP_URL=https:\/\/polisrossa\.example\.ts\.net$/m);assert.match(runtime,new RegExp(`^AUTH_SECRET=${secret}$`,'m'));assert.match(runtime,new RegExp(`^POSTGRES_PASSWORD=${password}$`,'m'));assert.match(runtime,/^BIND_ADDRESS=127\.0\.0\.1$/m);
  const caddy=await readFile(join(dir,'.selfhost','Caddyfile'),'utf8');assert.match(caddy,/https:\/\/localhost:443, https:\/\/polisrossa\.example\.ts\.net:443/);assert.match(caddy,/tls internal/);assert.match(caddy,/trusted_proxies static private_ranges/);assert.match(caddy,/trusted_proxies_strict/);assert.match(caddy,/header_up X-Forwarded-For \{client_ip\}/);assert.match(caddy,/redir https:\/\/polisrossa\.example\.ts\.net\{uri\} permanent/);assert.doesNotMatch(caddy,/:8443/);
  await assert.rejects(configureTunnelOrigin(dir,'https://polisrossa.example.ts.net:8443'),/public HTTPS origin/);
  assert.throws(()=>tunnelCaddyConfiguration('http://polisrossa.example.ts.net'),/public HTTPS origin/);
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
  assert.deepEqual(composeArgs('mail-status').slice(-5),['run','--rm','-T','mail-limits','status']);
  assert.deepEqual(composeArgs('mail-reset').slice(-5),['run','--rm','-T','mail-limits','reset']);
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
  const inherited={COMPOSE_PROJECT_NAME:'wrong',COMPOSE_PROFILES:'tools',DATABASE_URL:'postgresql://wrong.example/wrong',POSTGRES_PASSWORD:'wrong',BIND_ADDRESS:'0.0.0.0',HTTPS_PORT:'443',SNAPSHOT_PRIVATE_ACCESS:'rw',SNAPSHOT_DIR_ACCESS:'rw',SNAPSHOT_REPLICA_ACCESS:'rw',SNAPSHOT_HEIGHT:'99',KEEP:'yes'};
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
 const mailLimits=compose.slice(compose.indexOf('  mail-limits:'),compose.indexOf('  snapshot:'));
 assert.doesNotMatch(app,/snapshot-private|SNAPSHOT_PRIVATE_KEY/);
 assert.match(app,/image: "polisrossa-runtime:\$\{COMPOSE_PROJECT_NAME:-polisrossa\}"/);
 assert.doesNotMatch(snapshot,/snapshot-private|SNAPSHOT_PRIVATE_KEY|DATABASE_URL|\/var\/run\/postgresql/);assert.match(snapshot,/profiles: \[tools\]/);assert.match(snapshot,/pull_policy: never/);assert.match(snapshot,/network_mode: none/);assert.match(snapshot,/entrypoint: \[node, build-node\/snapshot\.mjs\]/);assert.doesNotMatch(snapshot,/\n    build:/);
 assert.match(database,/DATABASE_URL|\/var\/run\/postgresql/);assert.doesNotMatch(database,/snapshot-private|SNAPSHOT_PRIVATE_KEY/);
 assert.match(signer,/snapshot-private:\$\{SNAPSHOT_PRIVATE_ACCESS:-ro\}/);assert.match(signer,/SNAPSHOT_PRIVATE_KEY/);assert.match(signer,/network_mode: none/);assert.doesNotMatch(signer,/DATABASE_URL|\/var\/run\/postgresql/);
 assert.match(mailLimits,/entrypoint: \[node, build-node\/mail-limits-cli\.mjs\]/);assert.match(mailLimits,/network_mode: none/);assert.match(mailLimits,/DATABASE_URL|\/var\/run\/postgresql/);assert.doesNotMatch(mailLimits,/snapshot-private|SMTP_PASSWORD|MAIL_FROM/);
});
