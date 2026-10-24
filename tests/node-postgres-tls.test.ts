import test from 'node:test';
import assert from 'node:assert/strict';
import {postgresTlsOptions} from '../server/pool';

const database='postgresql://db.example.org:5432/appdb?sslmode=require';
test('production PostgreSQL keeps strict verification and drops untrusted URL TLS knobs',()=>{
 const c=postgresTlsOptions(database,{NODE_ENV:'production'});
 assert.equal(new URL(c.connectionString).searchParams.has('sslmode'),false);
 assert.deepEqual(c.ssl,{rejectUnauthorized:true,servername:'db.example.org'});
});
test('private issuing CA can be configured without turning off TLS verification',()=>{
 const certificate='-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----';
 const c=postgresTlsOptions(database,{NODE_ENV:'production',PG_SSL_CA_PEM:certificate.replace(/\n/g,'\\n')});
 assert.deepEqual(c.ssl,{rejectUnauthorized:true,servername:'db.example.org',ca:certificate});
});
test('invalid CA and unverified production database are rejected',()=>{
 assert.throws(()=>postgresTlsOptions(database,{NODE_ENV:'production',PG_SSL_CA_PEM:'garbage'}),/Invalid PG_SSL_CA_PEM/);
 assert.equal(postgresTlsOptions('postgresql://localhost/local',{NODE_ENV:'development'}).ssl,false);
 assert.deepEqual(postgresTlsOptions('postgresql://localhost/local',{NODE_ENV:'production'}).ssl,{rejectUnauthorized:true,servername:'localhost'});
});
