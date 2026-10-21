import test from 'node:test';
import assert from 'node:assert/strict';
import type pg from 'pg';
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {getMigrations} from 'better-auth/db/migration';
import {createAuth,accountEndpoint,type Auth} from '../server/auth';
import {configuration} from '../server/config';
import {socialIdentityEndpoint,verifiedSocialIdentity,verifiedApplicationSocialIdentity,allowedIdentityCallback,unlinkFacebookIdentity} from '../server/social-identity';
import {PostgresDatabase,type Connections} from '../server/database';
import {handleForum} from '../app/lib/forum';
import {isFacebookAccountReference,validSocialIdentity} from '../app/lib/social-identity';
import {normalizeApplicantReferenceUrl} from '../app/lib/applicant-reference';
const env={APP_URL:'https://example.test',DATABASE_URL:'postgres://test:test@localhost/test',AUTH_SECRET:'social-tests-only-not-production-01234567890123456789',MAIL_TRANSPORT:'smtp',SMTP_HOST:'localhost',SMTP_USER:'test',SMTP_PASSWORD:'test',MAIL_FROM:'test@example.test',FORUM_OPEN:'true',DISCORD_CLIENT_ID:'discord-client-test',DISCORD_CLIENT_SECRET:'discord-secret-test',FACEBOOK_CLIENT_ID:'facebook-client-test',FACEBOOK_CLIENT_SECRET:'facebook-secret-test'};
test('social linking uses a real OAuth callback, binds the authenticated user, encrypts tokens and rejects untrusted input',async()=>{
 const database=new PGlite(),config=configuration(env),messages:string[]=[];
 const query=async(sql:string,values:unknown[]=[])=>{const r=await database.query(sql,values);return {rows:r.rows as Record<string,unknown>[],rowCount:r.affectedRows??r.rows.length};};
 const pool={query,connect:async()=>({query,release(){}}),end:async()=>{},options:{}} as unknown as pg.Pool;
 const {auth,settle}=createAuth(pool,config,async(_email,url)=>{messages.push(url);},async()=>true);
 const account=(data:unknown)=>accountEndpoint(auth,new Request(config.origin+'/api/auth',{method:'POST',headers:{origin:config.origin,'content-type':'application/json'},body:JSON.stringify(data)}),undefined,true);
 const req=(cookie='',data?:unknown,origin=config.origin)=>new Request(config.origin+'/api/community/identity',{method:data?'POST':'GET',headers:{cookie,origin,'content-type':'application/json'},body:data?JSON.stringify(data):undefined});
 const originalFetch=globalThis.fetch;
 try{
  for(const filename of (await readdir(new URL('../server/migrations',import.meta.url))).filter(name=>name.endsWith('.sql')).sort())await database.exec(await readFile(new URL('../server/migrations/'+filename,import.meta.url),'utf8'));
  await(await getMigrations(auth.options)).runMigrations();
  assert.equal((await socialIdentityEndpoint(auth,req(),config)).status,401);
  const credentials={email:'reader@example.test',password:'testing-password-12345678'};
  assert.equal((await account({action:'signup',...credentials,consent:true})).status,200);await settle();await auth.handler(new Request(messages[0]));
  const login=await account({action:'signin',...credentials});assert.equal(login.status,200);
  const cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
  assert.equal((await socialIdentityEndpoint(auth,req(cookie,{provider:'facebook'},'https://evil.test'),config)).status,403);
  assert.equal((await socialIdentityEndpoint(auth,req(cookie,{provider:'facebook',idToken:{token:'forged'}}),config)).status,400);
  assert.equal((await socialIdentityEndpoint(auth,req(cookie,{provider:'discord'}),config)).status,400);
  assert.equal((await socialIdentityEndpoint(auth,req(cookie,{provider:'github'}),config)).status,400);
  const before=await(await socialIdentityEndpoint(auth,req(cookie),config)).json();assert.deepEqual(before.providers,[{id:'facebook',name:'Facebook'}]);assert.equal(before.identity,null);
  const whileClosed=await socialIdentityEndpoint(auth,req(cookie,{provider:'facebook'}),{...config,forumOpen:false});assert.equal(whileClosed.status,503);
  const start=await socialIdentityEndpoint(auth,req(cookie,{provider:'facebook'}),config);assert.equal(start.status,200);
  const url=new URL((await start.json()).url);assert.equal(url.hostname,'www.facebook.com');assert.equal(url.searchParams.get('redirect_uri'),config.origin+'/api/identity/callback/facebook');assert.equal(url.searchParams.get('scope'),'public_profile');assert.doesNotMatch(url.search,/\bemail\b/);assert.ok(url.searchParams.get('state'));
  const grantCookie=[cookie,...start.headers.getSetCookie().map(c=>c.split(';')[0])].join('; ');
  let providerRequests=0;
  globalThis.fetch=async(input,init)=>{
   const target=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);providerRequests++;
   if(target.hostname==='graph.facebook.com'&&target.pathname.endsWith('/oauth/access_token'))return Response.json({access_token:'private-social-access-token',token_type:'Bearer',expires_in:3600});
   if(target.hostname==='graph.facebook.com'&&target.pathname==='/debug_token')return Response.json({data:{app_id:'facebook-client-test',is_valid:true,user_id:'123456789123456789'}});
   if(target.hostname==='graph.facebook.com'&&target.pathname==='/me')return Response.json({id:'123456789123456789',name:'Verified Reader',email:credentials.email,email_verified:true,picture:{data:{height:80,is_silhouette:false,url:'https://example.test/avatar.jpg',width:80}}});
   throw Error('Unexpected external OAuth request: '+target.origin+target.pathname);
  };
  const bad=await auth.handler(new Request(config.origin+'/api/identity/callback/facebook?code=authorization-code&state=forged',{headers:{cookie:grantCookie}}));assert.notEqual(bad.headers.get('location'),config.origin+'/polisrossa?view=partecipa&adesione=1');assert.equal(providerRequests,0);
  const callback=await auth.handler(new Request(config.origin+'/api/identity/callback/facebook?code=authorization-code&state='+encodeURIComponent(url.searchParams.get('state')!),{headers:{cookie:grantCookie}}));assert.equal(callback.status,302);assert.equal(callback.headers.get('location'),config.origin+'/polisrossa?view=partecipa&adesione=1');
  const identity=await verifiedSocialIdentity(auth,req(cookie),config);assert.deepEqual(identity,{provider:'facebook',subject:'123456789123456789',name:'Verified Reader',url:'https://www.facebook.com/app_scoped_user_id/123456789123456789'});
  const publicStatus=await(await socialIdentityEndpoint(auth,req(cookie),config)).json();assert.deepEqual(publicStatus.identity,{provider:'facebook',name:'Verified Reader'});assert.doesNotMatch(JSON.stringify(publicStatus),/private-social|reader@example|123456789123456789/);
  const stored=await query('SELECT "accessToken","refreshToken" FROM account WHERE "providerId"=$1',['facebook']);assert.equal(stored.rows.length,1);assert.notEqual(stored.rows[0].accessToken,'private-social-access-token');
  assert.equal(allowedIdentityCallback('/api/identity/callback/discord','GET',config),false);assert.equal(allowedIdentityCallback('/api/identity/callback/facebook','GET',config),true);assert.equal(allowedIdentityCallback('/api/identity/callback/facebook','GET',{...config,forumOpen:false}),false);assert.equal(allowedIdentityCallback('/api/identity/link-social','POST',config),false);
  const closedStatus=await(await socialIdentityEndpoint(auth,req(cookie),{...config,forumOpen:false})).json();assert.deepEqual(closedStatus.providers,[]);assert.equal(closedStatus.available,false);assert.equal(closedStatus.identity.name,'Account Facebook collegato');
  const session=await auth.api.getSession({headers:new Headers({cookie})});assert.ok(session?.user.emailVerified);
  const connection={query},forumDb=new PostgresDatabase({...connection,connect:async()=>connection} satisfies Connections),forumRequest=(action:Record<string,unknown>)=>new Request(config.origin+'/api/community/forum',{method:'POST',headers:{cookie,origin:config.origin,'content-type':'application/json'},body:JSON.stringify(action)});
  const unlink=()=>unlinkFacebookIdentity(auth,req(cookie));
  const applicationId=crypto.randomUUID(),application={action:'apply',requestId:applicationId,alias:'verified-reader',intro:'Una presentazione pubblica sufficientemente lunga.',language:'it',consent:true};
  assert.equal((await handleForum(forumRequest(application),forumDb,session!.user.id,undefined,Date.now,identity,unlink,true)).status,201);
  const storedApplication=await query('SELECT reference_url,identity_provider,identity_subject FROM forum_members WHERE id=$1',[applicationId]);assert.deepEqual(storedApplication.rows[0],{reference_url:identity.url,identity_provider:'facebook',identity_subject:identity.subject});
  assert.equal((await query('SELECT id FROM account WHERE "providerId"=$1',['facebook'])).rows.length,0);
  assert.equal((await socialIdentityEndpoint(auth,new Request(config.origin+'/api/community/identity',{method:'DELETE',headers:{cookie,origin:config.origin}}),{...config,forumOpen:false})).status,200);
  assert.equal((await(await socialIdentityEndpoint(auth,req(cookie),config)).json()).identity,null);
  assert.equal((await handleForum(forumRequest({action:'cancelApplication'}),forumDb,session!.user.id,undefined,Date.now,null,unlink,true)).status,200);
  assert.equal((await query('SELECT id FROM forum_members WHERE id=$1',[applicationId])).rows.length,0);
 }finally{globalThis.fetch=originalFetch;await settle();await database.close();}
});
test('social credentials must be complete pairs and absent providers are not offered',()=>{
 assert.throws(()=>configuration({...env,FACEBOOK_CLIENT_SECRET:undefined}),/both credentials/);
 assert.deepEqual(configuration({...env,DISCORD_CLIENT_ID:undefined,DISCORD_CLIENT_SECRET:undefined,FACEBOOK_CLIENT_ID:undefined,FACEBOOK_CLIENT_SECRET:undefined}).socialProviders,{});
});
test('invalid local PR2 application data never reaches the Facebook identity provider',async()=>{
 let accountReads=0;
 const auth={api:{listUserAccounts:async()=>{accountReads++;return [];}}} as unknown as Auth;
 const config=configuration(env),request=new Request(config.origin+'/api/community/forum');
 const base={action:'apply',requestId:crypto.randomUUID(),alias:'candidate',intro:'Una presentazione pubblica sufficientemente lunga.',language:'it',consent:true};
 assert.equal(await verifiedApplicationSocialIdentity(auth,request,config,{...base,referenceUrl:'https://www.facebook.com/inserito-dal-browser'}),null);assert.equal(accountReads,0);
 assert.equal(await verifiedApplicationSocialIdentity(auth,request,config,{...base,alias:''}),null);assert.equal(accountReads,0);
 assert.equal(await verifiedApplicationSocialIdentity(auth,request,config,base),null);assert.equal(accountReads,1);
});
test('identity validation responses preserve session refresh cookies after authentication',async()=>{
 const refreshed='ir.session=refreshed-session; Path=/; HttpOnly; Secure; SameSite=Lax';
 const user={id:'reader',email:'reader@example.test',emailVerified:true};
 const auth={api:{
  getSession:async({asResponse}:{asResponse?:boolean})=>asResponse?Response.json({user},{headers:{'set-cookie':refreshed}}):{user,session:{createdAt:new Date(0)}},
  listUserAccounts:async()=>[{id:'credential-account',providerId:'credential'}],
 }} as unknown as Auth;
 const config=configuration(env);
 const request=(body:string,contentType='application/json')=>new Request(config.origin+'/api/community/identity',{method:'POST',headers:{origin:config.origin,'content-type':contentType},body});
 const cases=[
  await socialIdentityEndpoint(auth,request('{}','text/plain'),config),
  await socialIdentityEndpoint(auth,request('x'.repeat(2001)),config),
  await socialIdentityEndpoint(auth,request('{'),config),
  await socialIdentityEndpoint(auth,request(JSON.stringify({provider:'facebook',referenceUrl:'https://www.facebook.com/inserito-dal-browser'})),config),
  await socialIdentityEndpoint(auth,request(JSON.stringify({provider:'facebook'})),config),
  await socialIdentityEndpoint(auth,request(JSON.stringify({provider:'facebook'})),{...config,forumOpen:false}),
 ];
 assert.deepEqual(cases.map(response=>response.status),[415,413,400,400,401,503]);
 for(const response of cases){assert.ok(response.headers.getSetCookie().some(cookie=>cookie.startsWith('ir.session=refreshed-session')));assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(response.headers.get('vary'),'cookie');}
});
test('PR2 copy does not present an app-scoped Facebook reference as a public profile or civil-identity proof',async()=>{
 const source=await readFile(new URL('../app/components/CommunityView.tsx',import.meta.url),'utf8');
 assert.match(source,/riferimento è specifico dell’app e potrebbe non essere una pagina pubblica consultabile/);
 assert.match(source,/OAuth prova soltanto il controllo dell’account in quel momento/);
 assert.match(source,/membri PR2 decidono soggettivamente/);
 assert.doesNotMatch(source,/pagina Facebook autenticata|aperto il riferimento Facebook/);
 assert.doesNotMatch(source,/mutate\(\{action:'apply'[^}]*referenceUrl/);
});
test('a verified account can remove its Facebook grant while the forum is closed',async()=>{
 const accounts=[{id:'credential-account',providerId:'credential'},{id:'facebook-account',providerId:'facebook'}],removed:string[]=[];
 const auth={api:{
  getSession:async()=>Response.json({user:{id:'reader',email:'reader@example.test',emailVerified:true}}),
  listUserAccounts:async()=>accounts,
  unlinkAccount:async({body}:{body:{accountId:string}})=>{removed.push(body.accountId);return {status:true};},
 }} as unknown as Auth;
 const config=configuration({...env,FORUM_OPEN:'false'});
 const request=new Request(config.origin+'/api/community/identity',{method:'DELETE',headers:{origin:config.origin}});
 const response=await socialIdentityEndpoint(auth,request,config);
 assert.equal(response.status,200);assert.deepEqual(removed,['facebook-account']);assert.deepEqual(await response.json(),{ok:true,identity:null});
});
test('only the server-derived Facebook account-reference shape qualifies as PR2 OAuth evidence',()=>{
 const identity={provider:'facebook',subject:'123456789',name:'Persona riconoscibile',url:'https://www.facebook.com/app_scoped_user_id/123456789'};
 assert.equal(validSocialIdentity(identity),true);assert.equal(isFacebookAccountReference(identity.url),true);
 assert.equal(validSocialIdentity({...identity,provider:'discord',url:'https://discord.com/users/123456789'}),false);
 assert.equal(validSocialIdentity({...identity,url:'javascript:alert(1)'}),false);
 assert.equal(validSocialIdentity({...identity,url:'https://www.facebook.com/app_scoped_user_id/999999999'}),false);
});
test('declared applicant references accept public HTTPS pages without fetching them and reject local or credentialed targets',()=>{
 for(const value of ['https://www.facebook.com/persona','https://www.instagram.com/persona/','https://portfolio.example.org/about?from=polisrossa'])assert.equal(normalizeApplicantReferenceUrl(value),value);
 for(const value of ['',undefined,' http://example.org','http://example.org/persona','javascript:alert(1)','https://localhost/persona','https://profile.local/persona','https://profile.internal/persona','https://127.0.0.1/persona','https://[::1]/persona','https://user:pass@example.org/persona','https://example.org:8443/persona','https://singlelabel/persona'])assert.equal(normalizeApplicantReferenceUrl(value),null);
});
