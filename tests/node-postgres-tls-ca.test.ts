import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {postgresTlsConfig} from '../server/pool';

test('non-local PostgreSQL connections always verify the server certificate',()=>{
 const url='postgresql://user:pass@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require';
 assert.deepEqual(postgresTlsConfig(url,{}),{rejectUnauthorized:true});
 assert.equal(postgresTlsConfig('postgresql://user:pass@localhost:5432/db',{NODE_ENV:'development'}),false);
 assert.deepEqual(postgresTlsConfig('postgresql://user:pass@localhost:5432/db',{NODE_ENV:'production'}),{rejectUnauthorized:true});
 assert.throws(()=>postgresTlsConfig(url,{POSTGRES_CA_CERT_PEM:'not a cert'}),/CA certificate/);
});

test('a genuine X.509 CA can be pinned while arbitrary PEM input is rejected',()=>{
 const directory=mkdtempSync(join(tmpdir(),'agoranode-ca-test-'));
 try{
  const key=join(directory,'ca-key.pem'),cert=join(directory,'ca-cert.pem');
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes',
   '-keyout',key,'-out',cert,'-days','1','-subj','/CN=AgoraNode Test CA',
   '-addext','basicConstraints=critical,CA:TRUE'],{stdio:'ignore'});
  const ca=readFileSync(cert,'utf8');
  const config=postgresTlsConfig('postgresql://u:p@db.example.org/postgres',{POSTGRES_CA_CERT_PEM:ca});
  assert.ok(config&&config!==false);
  assert.equal(config.rejectUnauthorized,true);
  assert.match(config.ca??'',/BEGIN CERTIFICATE/);
  assert.equal(postgresTlsConfig('postgresql://u:p@db.example.org/postgres',{POSTGRES_CA_CERT_PEM:ca.replace(/\n/g,'\\n')})!==false,true);
 }finally{rmSync(directory,{recursive:true,force:true});}
});
