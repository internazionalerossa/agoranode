import {betterAuth} from 'better-auth';
import {allowAuthAttempt} from './auth-limits';
import type {Connection} from './database';
import {createAccountMailer} from './mail';
import type pg from 'pg';
import type {configuration} from './config';
export function createAuth(pool:pg.Pool,config:ReturnType<typeof configuration>,sendMail?:(email:string,url:string,reset:boolean)=>Promise<unknown>){
 const deliver=createAccountMailer(config);
 const jobs=new Set<Promise<unknown>>();
 const send=(email:string,url:string,reset=false)=>{const job=(sendMail?sendMail(email,url,reset):deliver(email,url,reset)).catch(()=>{console.error('Authentication email delivery failed');}).finally(()=>jobs.delete(job));jobs.add(job);};
 const auth=betterAuth({
  appName:'PolisRossa',baseURL:config.origin,basePath:'/api/identity',secret:config.secret,database:pool,trustedOrigins:[config.origin],
  emailAndPassword:{enabled:true,minPasswordLength:12,maxPasswordLength:128,requireEmailVerification:true,autoSignIn:false,revokeSessionsOnPasswordReset:true,sendResetPassword:async({user,url})=>{send(user.email,url,true);}},
  emailVerification:{sendOnSignUp:true,sendOnSignIn:true,autoSignInAfterVerification:false,sendVerificationEmail:async({user,url})=>{send(user.email,url);}},
  socialProviders:config.socialProviders,
  account:{encryptOAuthTokens:true,accountLinking:{enabled:true,disableImplicitLinking:true,allowDifferentEmails:true}},
  session:{expiresIn:7*86400,updateAge:86400,cookieCache:{enabled:false}},
  advanced:{useSecureCookies:true,cookiePrefix:'ir',defaultCookieAttributes:{httpOnly:true,secure:true,sameSite:'lax',path:'/'}},
  rateLimit:{enabled:true,storage:'database',window:60,max:30},telemetry:{enabled:false},
 });
 return {auth,settle:()=>Promise.allSettled(jobs)};
}
export type Auth=ReturnType<typeof createAuth>['auth'];
const privateHeaders={'cache-control':'private, no-store',vary:'cookie'};
export async function authSession(auth:Auth,request:Request){
 // Session validation is a server-side operation, not another public login attempt.
 const response=await auth.api.getSession({headers:request.headers,asResponse:true});
 if(!response.ok)throw Error('Session unavailable');
 const data=await response.json();
 return {user:data?.user?.emailVerified?data.user as {id:string;email:string}:null,finish:(result:Response)=>{const headers=new Headers(result.headers);for(const [key,value]of Object.entries(privateHeaders))headers.set(key,value);for(const cookie of response.headers.getSetCookie())headers.append('set-cookie',cookie);return new Response(result.body,{status:result.status,headers});}};
}
export async function accountEndpoint(auth:Auth,request:Request,limits?:Connection,registrationOpen=false){
 const url=new URL(request.url),reply=(data:unknown,status=200)=>Response.json(data,{status,headers:privateHeaders});
 if(request.method==='GET'){const session=await authSession(auth,request);return session.finish(reply({configured:true,registrationOpen,authenticated:Boolean(session.user),email:session.user?.email??null}));}
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')return reply({error:'Invalid origin'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'JSON required'},415);
 let input:Record<string,unknown>;
 try{const raw=await request.text();if(new TextEncoder().encode(raw).length>8000)return reply({error:'Payload too large'},413);input=JSON.parse(raw);if(!input||Array.isArray(input)||typeof input!=='object')throw Error();}catch{return reply({error:'Invalid JSON'},400);}
 const email=typeof input.email==='string'?input.email.trim():'',password=typeof input.password==='string'?input.password:'';
 const routes:Record<string,[string,Record<string,unknown>]>={
  signin:['sign-in/email',{email,password}],signup:['sign-up/email',{email,password,name:'Lettore',callbackURL:url.origin+'/account'}],signout:['sign-out',{}],recover:['request-password-reset',{email,redirectTo:url.origin+'/account?recovery=1'}],password:['reset-password',{newPassword:password,token:input.token}],
 };
 const action=String(input.action),route=routes[action];if(!route)return reply({error:'Unknown action'},400);
 if(limits&&!await allowAuthAttempt(limits,action,email))return reply({error:'Troppe richieste. Riprova più tardi.'},429);
 if(action==='signup'&&!registrationOpen)return reply({error:'Le iscrizioni sono in preparazione. Puoi consultare il sito senza creare un account.'},503);
 if(action==='signup'&&input.consent!==true)return reply({error:'Conferma la richiesta di creazione dell’account e le condizioni d’uso.'},400);
 if(['signup','signin','recover'].includes(action)&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254))return reply({error:'Controlla l’email.'},400);
 if(['signup','password'].includes(action)&&(password.length<12||password.length>128))return reply({error:'Scegli una password di almeno 12 caratteri.'},400);
 const headers=new Headers(request.headers);headers.delete('content-length');headers.set('content-type','application/json');
 const result=await auth.handler(new Request(new URL('/api/identity/'+route[0],url),{method:'POST',headers,body:JSON.stringify(route[1])}));
 const response=result.ok?reply({ok:true,message:action==='signup'?'Se la registrazione è disponibile, riceverai un’email di conferma.':action==='recover'?'Se esiste un account corrispondente, riceverai le istruzioni.':action==='password'?'Password aggiornata. Accedi con la nuova password.':'Operazione completata.'}):reply({error:action==='signin'?'Accesso non riuscito. Controlla le credenziali e la conferma dell’email.':'Operazione non completata. Controlla i dati o richiedi un nuovo collegamento.'},result.status);
 for(const cookie of result.headers.getSetCookie())response.headers.append('set-cookie',cookie);
 return response;
}
