import test from 'node:test';import assert from 'node:assert/strict';
import {configuration} from '../server/config';import {createPool} from '../server/pool';
test('public mirror configuration forces private services and outbound email off',()=>{
 const config=configuration({APP_URL:'https://mirror.example.test',DATABASE_URL:'postgres://test:test@localhost/test',AUTH_SECRET:'test-only-secret-012345678901234567890',MIRROR_MODE:'true',NODE_ENV:'production',REGISTRATIONS_OPEN:'true',FORUM_OPEN:'true',MAIL_TRANSPORT:'brevo',DISCORD_CLIENT_ID:'test',DISCORD_CLIENT_SECRET:'test'});
 assert.equal(config.registrationOpen,false);assert.equal(config.forumOpen,false);assert.equal(config.mailTransport,'none');assert.deepEqual(config.socialProviders,{});
});
test('only the fixed same-host Unix socket bypasses network TLS',async()=>{
 const local=createPool('postgres://test:test@localhost/test?host=%2Fvar%2Frun%2Fpostgresql');
 const remote=createPool('postgres://test:test@example.test/test?sslmode=disable');
 const other=createPool('postgres://test:test@example.test/test?host=attacker.example');
 try{assert.equal(local.options.ssl,false);assert.deepEqual(remote.options.ssl,{rejectUnauthorized:true});assert.deepEqual(other.options.ssl,{rejectUnauthorized:true});}finally{await Promise.all([local.end(),remote.end(),other.end()]);}
});
