import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

for(const migrationExit of [0,37]){
 test(`container startup ${migrationExit?'stops on failed migrations':'starts the server after migrations'}`,async()=>{
  const directory=await mkdtemp(join(tmpdir(),'polisrossa-start-'));
  try{
   const calls=join(directory,'calls');
   await writeFile(join(directory,'node'),'#!/bin/sh\nprintf "%s\\n" "$1" >> "$STARTUP_CALLS"\nif [ "$1" = "build-node/migrate.mjs" ]; then exit "$MIGRATION_EXIT"; fi\n',{mode:0o700});
   const result=spawnSync('/bin/sh',[fileURLToPath(new URL('../scripts/start-node.sh',import.meta.url))],{env:{...process.env,PATH:directory,STARTUP_CALLS:calls,MIGRATION_EXIT:String(migrationExit)},encoding:'utf8'});
   assert.equal(result.status,migrationExit,result.stderr);
   assert.deepEqual((await readFile(calls,'utf8')).trim().split('\n'),migrationExit?['build-node/migrate.mjs']:['build-node/migrate.mjs','build-node/server.mjs']);
  }finally{await rm(directory,{recursive:true,force:true});}
 });
}
