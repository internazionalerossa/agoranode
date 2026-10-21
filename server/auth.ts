import {betterAuth} from 'better-auth';
import {createHash,timingSafeEqual} from 'node:crypto';
import {allowAuthAttempt} from './auth-limits';
import type {Connection} from './database';
import {createAccountMailer} from './mail';
import {allowTransactionalMail,allowTransactionalMailClient,type TransactionalMailPurpose} from './mail-limits';
import type pg from 'pg';
import type {configuration} from './config';
import {clientRateKey,TRUSTED_LOCAL_PROXY_RANGES} from './client-rate-key';
import {persistentAuthRateLimitStorage} from './auth-rate-limit-storage';
export function createAuth(pool:pg.Pool,config:ReturnType<typeof configuration>,sendMail?:(email:string,url:string,reset:boolean)=>Promise<unknown>,permitMail:(email:string,purpose:TransactionalMailPurpose,clientKey:string)=>Promise<boolean>=async(email,purpose,clientKey)=>await allowTransactionalMailClient(pool as unknown as Connection,clientKey)&&await allowTransactionalMail(pool as unknown as Connection,email,purpose)){
 const deliver=createAccountMailer(config);
 const jobs=new Set<Promise<unknown>>();
 const send=(email:string,url:string,reset=false,request?:Request)=>{if(config.mailTransport==='none')return Promise.resolve();const purpose:TransactionalMailPurpose=reset?'reset':'verification',key=clientRateKey(request?.headers??new Headers(),config.secret);const job=(async()=>{if(!await permitMail(email,purpose,key)){console.error('Authentication email delivery limit reached');return;}return sendMail?sendMail(email,url,reset):deliver(email,url,reset);})().catch(()=>{console.error('Authentication email delivery failed');}).finally(()=>jobs.delete(job));jobs.add(job);return job;};
 const auth=betterAuth({
  appName:'PolisRossa',baseURL:config.origin,basePath:'/api/identity',secret:config.secret,database:pool,trustedOrigins:[config.origin],
  emailAndPassword:{enabled:config.mailTransport!=='none',minPasswordLength:12,maxPasswordLength:128,requireEmailVerification:true,autoSignIn:false,revokeSessionsOnPasswordReset:true,sendResetPassword:async({user,url},request)=>{void send(user.email,url,true,request);}},
  emailVerification:{sendOnSignUp:config.mailTransport!=='none',sendOnSignIn:config.mailTransport!=='none',autoSignInAfterVerification:false,sendVerificationEmail:async({user,url},request)=>{void send(user.email,url,false,request);}},
  socialProviders:config.socialProviders,
  account:{encryptOAuthTokens:true,accountLinking:{enabled:true,disableImplicitLinking:true,allowDifferentEmails:true}},
  session:{expiresIn:7*86400,updateAge:86400,cookieCache:{enabled:false}},
  advanced:{useSecureCookies:true,cookiePrefix:'ir',defaultCookieAttributes:{httpOnly:true,secure:true,sameSite:'lax',path:'/'},ipAddress:{ipAddressHeaders:['x-forwarded-for'],trustedProxies:TRUSTED_LOCAL_PROXY_RANGES,ipv6Subnet:64}},
  rateLimit:{enabled:true,customStorage:persistentAuthRateLimitStorage(pool as unknown as Connection,config.secret),window:60,max:30},telemetry:{enabled:false},
 });
 return {auth,settle:()=>Promise.allSettled(jobs)};
}
export type Auth=ReturnType<typeof createAuth>['auth'];
const privateHeaders={'cache-control':'private, no-store',vary:'cookie'};
function validAccountAccessCode(value:unknown,expected:string|undefined){
 if(!expected)return true;
 if(typeof value!=='string'||value.length<20||value.length>200)return false;
 const actual=createHash('sha256').update(value).digest();
 return timingSafeEqual(actual,Buffer.from(expected,'hex'));
}
export async function authSession(auth:Auth,request:Request){
 // Session validation is a server-side operation, not another public login attempt.
 const response=await auth.api.getSession({headers:request.headers,asResponse:true});
 if(!response.ok)throw Error('Session unavailable');
 const data=await response.json();let user=data?.user?.emailVerified?data.user as {id:string;email:string}:null;
 if(user){const accounts=await auth.api.listUserAccounts({headers:request.headers});if(!accounts.some(account=>account.providerId==='credential'))user=null;}
 return {user,finish:(result:Response)=>{const headers=new Headers(result.headers);for(const [key,value]of Object.entries(privateHeaders))headers.set(key,value);for(const cookie of response.headers.getSetCookie())headers.append('set-cookie',cookie);return new Response(result.body,{status:result.status,headers});}};
}
export async function accountEndpoint(auth:Auth,request:Request,limits?:Connection,registrationOpen=false,config?:ReturnType<typeof configuration>){
 const url=new URL(request.url),reply=(data:unknown,status=200)=>Response.json(data,{status,headers:privateHeaders});
 if(request.method==='GET'){const session=await authSession(auth,request);return session.finish(reply({configured:true,registrationOpen,emailEnabled:config?.mailTransport!=='none',accessCodeRequired:Boolean(config?.accountAccessHash),authenticated:Boolean(session.user),email:session.user?.email??null}));}
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')return reply({error:'Invalid origin'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'JSON required'},415);
 let input:Record<string,unknown>;
 try{const raw=await request.text();if(new TextEncoder().encode(raw).length>8000)return reply({error:'Payload too large'},413);input=JSON.parse(raw);if(!input||Array.isArray(input)||typeof input!=='object')throw Error();}catch{return reply({error:'Invalid JSON'},400);}
 const actionName=String(input.action);
 if(actionName==='social'){
  return reply({error:'Accedi a PR1 con email e password; il riferimento pubblico e Facebook facoltativo appartengono soltanto alla domanda PR2.'},400);
 }
 if(config?.mailTransport==='none'&&actionName!=='signout')return reply({error:'Il servizio account resta chiuso finché la conferma email non è configurata.'},503);
 const email=typeof input.email==='string'?input.email.trim():'',password=typeof input.password==='string'?input.password:'';
 const routes:Record<string,[string,Record<string,unknown>]>={
  signin:['sign-in/email',{email,password}],signup:['sign-up/email',{email,password,name:'Lettore',callbackURL:url.origin+'/account'}],signout:['sign-out',{}],recover:['request-password-reset',{email,redirectTo:url.origin+'/account?recovery=1'}],password:['reset-password',{newPassword:password,token:input.token}],
 };
 const action=String(input.action),route=routes[action];if(!route)return reply({error:'Unknown action'},400);
 if(action==='signup'&&!registrationOpen)return reply({error:'Le iscrizioni sono in preparazione. Puoi consultare il sito senza creare un account.'},503);
 if(action==='signup'&&input.consent!==true)return reply({error:'Conferma la richiesta di creazione dell’account e le condizioni d’uso.'},400);
 if(['signup','signin','recover'].includes(action)&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254))return reply({error:'Controlla l’email.'},400);
 if(['signup','password'].includes(action)&&(password.length<12||password.length>128))return reply({error:'Scegli una password di almeno 12 caratteri.'},400);
 if(limits&&!await allowAuthAttempt(limits,action,email,{clientKey:config?clientRateKey(request.headers,config.secret):undefined}))return reply({error:'Troppe richieste. Riprova più tardi.'},429);
 if(['signup','recover'].includes(action)&&!validAccountAccessCode(input.accessCode,config?.accountAccessHash))return reply({error:'Il codice di accesso iniziale non è valido.'},403);
 const headers=new Headers(request.headers);headers.delete('content-length');headers.set('content-type','application/json');
 const result=await auth.handler(new Request(new URL('/api/identity/'+route[0],url),{method:'POST',headers,body:JSON.stringify(route[1])}));
 const response=result.ok?reply({ok:true,message:action==='signup'?'Se la registrazione è disponibile, riceverai un’email di conferma.':action==='recover'?'Se esiste un account corrispondente, riceverai le istruzioni.':action==='password'?'Password aggiornata. Accedi con la nuova password.':'Operazione completata.'}):reply({error:action==='signin'?'Accesso non riuscito. Controlla le credenziali e la conferma dell’email.':'Operazione non completata. Controlla i dati o richiedi un nuovo collegamento.'},result.status);
 for(const cookie of result.headers.getSetCookie())response.headers.append('set-cookie',cookie);
 return response;
}
