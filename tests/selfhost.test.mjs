import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {initialize,composeArgs} from '../scripts/selfhost.mjs';
test('self-host setup generates isolated secrets, uses a private socket and never overwrites an existing installation',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'polis-selfhost-'));
 try{
  const result=await initialize(dir);assert.equal(result.origin,'https://localhost:8443');
  const env=await readFile(join(dir,'.selfhost/runtime.env'),'utf8');
  assert.match(env,/REGISTRATIONS_OPEN=false/);assert.match(env,/FORUM_OPEN=false/);assert.match(env,/BIND_ADDRESS=127.0.0.1/);assert.match(env,/host=%2Fvar%2Frun%2Fpostgresql/);
  assert.match(env,/AUTH_SECRET=[0-9a-f]{96}/);assert.match(env,/POSTGRES_PASSWORD=[0-9a-f]{64}/);
  if(process.platform!=='win32')assert.equal((await stat(join(dir,'.selfhost/runtime.env'))).mode&0o777,0o600);
  await assert.rejects(initialize(dir),/not be overwritten/);
  assert.equal(await readFile(join(dir,'.selfhost/runtime.env'),'utf8'),env);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('self-host setup rejects injected origins, paths and unknown operating modes',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'polis-invalid-'));
 try{for(const url of ['http://example.test','https://example.test/path','https://user:pass@example.test','https://example.test/?x=1'])await assert.rejects(initialize(dir,url));await assert.rejects(initialize(dir,'https://example.test','unknown'));}finally{await rm(dir,{recursive:true,force:true});}
});
test('self-host mirror starts closed, and stop never removes persistent volumes',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'polis-mirror-'));
 try{await initialize(dir,'https://mirror.example.test','mirror');assert.match(await readFile(join(dir,'.selfhost/runtime.env'),'utf8'),/MIRROR_MODE=true/);assert.deepEqual(composeArgs('stop').slice(-1),['stop']);assert.throws(()=>composeArgs('delete'));}finally{await rm(dir,{recursive:true,force:true});}
});
