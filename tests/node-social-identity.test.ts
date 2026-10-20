import test from 'node:test';
import assert from 'node:assert/strict';
import type pg from 'pg';
import {PGlite} from '@electric-sql/pglite';
import {getMigrations} from 'better-auth/db/migration';
import {createAuth,accountEndpoint} from '../server/auth';
import {configuration} from '../server/config';
import {socialIdentityEndpoint,verifiedSocialIdentity,allowedIdentityCallback} from '../server/social-identity';
const env={APP_URL:'https://example.test',DATABASE_URL:'postgres://test:test@localhost/test',AUTH_SECRET:'social-tests-only-not-production-01234567890123456789',SMTP_HOST:'localhost',SMTP_USER:'test',SMTP_PASSWORD:'test',MAIL_FROM:'test@example.test',FORUM_OPEN:'true',DISCORD_CLIENT_ID:'client-test',DISCORD_CLIENT_SECRET:'client-secret-test'};
test('social linking uses a real OAuth callback, binds the authenticated user, encrypts tokens and rejects untrusted input',async()=>{
 const database=new PGlite(),config=configuration(env),messages:string[]=[];
 const query=async(sql:string,values:unknown[]=[])=>{const r=await database.query(sql,values);return {rows:r.rows as Record<string,unknown>[],rowCount:r.affectedRows??r.rows.length};};
 const pool={query,connect:async()=>({query,release(){}}),end:async()=>{},options:{}} as unknown as pg.Pool;
 const {auth,settle}=createAuth(pool,config,async(_email,url)=>{messages.push(url);});
 const account=(data:unknown)=>accountEndpoint(auth,new Request(config.origin+'/api/auth',{method:'POST',headers:{origin:config.origin,'content-type':'application/json'},body:JSON.stringify(data)}),undefined,true);
 const req=(cookie='',data?:unknown,origin=config.origin)=>new Request(config.origin+'/api/community/identity',{method:data?'POST':'GET',headers:{cookie,origin,'content-type':'application/json'},body:data?JSON.stringify(data):undefined});
 const originalFetch=globalThis.fetch;
 try{
  await(await getMigrations(auth.options)).runMigrations();
  assert.equal((await socialIdentityEndpoint(auth,req(),config)).status,401);
  const credentials={email:'reader@example.test',password:'testing-password-12345678'};
  assert.equal((await account({action:'signup',...credentials,consent:true})).status,200);await settle();await auth.handler(new Request(messages[0]));
  const login=await account({action:'signin',...credentials});assert.equal(login.status,200);
  const cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
  assert.equal((await socialIdentityEndpoint(auth,req(cookie,{provider:'discord'},'https://evil.test'),config)).status,403);
  assert.equal((await socialIdentityEndpoint(auth,req(cookie,{provider:'discord',idToken:{token:'forged'}}),config)).status,400);
  assert.equal((await socialIdentityEndpoint(auth,req(cookie,{provider:'github'}),config)).status,400);
  const before=await(await socialIdentityEndpoint(auth,req(cookie),config)).json();assert.deepEqual(before.providers,[{id:'discord',name:'Discord'}]);assert.equal(before.identity,null);
  const start=await socialIdentityEndpoint(auth,req(cookie,{provider:'discord'}),config);assert.equal(start.status,200);
  const url=new URL((await start.json()).url);assert.equal(url.hostname,'discord.com');assert.equal(url.searchParams.get('redirect_uri'),config.origin+'/api/identity/callback/discord');assert.ok(url.searchParams.get('state'));
  const grantCookie=[cookie,...start.headers.getSetCookie().map(c=>c.split(';')[0])].join('; ');
  let providerRequests=0;
  globalThis.fetch=async(input,init)=>{
   const target=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);providerRequests++;
   if(target.hostname==='discord.com'&&target.pathname==='/api/oauth2/token')return Response.json({access_token:'private-social-access-token',refresh_token:'private-social-refresh-token',token_type:'Bearer',expires_in:3600,scope:'identify email'});
   if(target.hostname==='discord.com'&&decodeURIComponent(target.pathname)==='/api/users/@me')return Response.json({id:'123456789123456789',username:'Verified Reader',global_name:'Verified Reader',email:credentials.email,verified:true,avatar:null});
   throw Error('Unexpected external OAuth request: '+target.origin+target.pathname);
  };
  const bad=await auth.handler(new Request(config.origin+'/api/identity/callback/discord?code=authorization-code&state=forged',{headers:{cookie:grantCookie}}));assert.notEqual(bad.headers.get('location'),config.origin+'/?view=partecipa&adesione=1');assert.equal(providerRequests,0);
  const callback=await auth.handler(new Request(config.origin+'/api/identity/callback/discord?code=authorization-code&state='+encodeURIComponent(url.searchParams.get('state')!),{headers:{cookie:grantCookie}}));assert.equal(callback.status,302);assert.equal(callback.headers.get('location'),config.origin+'/?view=partecipa&adesione=1');
  const identity=await verifiedSocialIdentity(auth,req(cookie),config);assert.deepEqual(identity,{provider:'discord',subject:'123456789123456789',name:'Verified Reader',url:'https://discord.com/users/123456789123456789'});
  const publicStatus=await(await socialIdentityEndpoint(auth,req(cookie),config)).json();assert.deepEqual(publicStatus.identity,{provider:'discord',name:'Verified Reader'});assert.doesNotMatch(JSON.stringify(publicStatus),/private-social|reader@example|123456789123456789/);
  const stored=await query('SELECT "accessToken","refreshToken" FROM account WHERE "providerId"=$1',['discord']);assert.equal(stored.rows.length,1);assert.notEqual(stored.rows[0].accessToken,'private-social-access-token');assert.notEqual(stored.rows[0].refreshToken,'private-social-refresh-token');
  assert.equal(allowedIdentityCallback('/api/identity/callback/discord','GET',config),true);assert.equal(allowedIdentityCallback('/api/identity/callback/facebook','GET',config),false);assert.equal(allowedIdentityCallback('/api/identity/link-social','POST',config),false);
  assert.deepEqual((await(await socialIdentityEndpoint(auth,req(cookie),{...config,forumOpen:false})).json()).providers,[]);
 }finally{globalThis.fetch=originalFetch;await settle();await database.close();}
});
test('social credentials must be complete pairs and absent providers are not offered',()=>{
 assert.throws(()=>configuration({...env,DISCORD_CLIENT_SECRET:undefined}),/both credentials/);
 assert.deepEqual(configuration({...env,DISCORD_CLIENT_ID:undefined,DISCORD_CLIENT_SECRET:undefined}).socialProviders,{});
});
