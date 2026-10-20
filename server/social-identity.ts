import {authSession,type Auth} from './auth';
import {SOCIAL_NAMES,validSocialIdentity,type SocialIdentity} from '../app/lib/social-identity';
import type {configuration} from './config';
type Config=ReturnType<typeof configuration>;
const headers={'cache-control':'private, no-store',vary:'cookie'};
/** Read the provider through its stored OAuth grant; never accept identity claims from a browser. */
export async function verifiedSocialIdentity(auth:Auth,request:Request,config:Config):Promise<SocialIdentity|null>{
 const accounts=await auth.api.listUserAccounts({headers:request.headers});
 for(const account of accounts){
  if(!Object.hasOwn(config.socialProviders,account.providerId))continue;
  const info=await auth.api.accountInfo({headers:request.headers,query:{accountId:account.id}});
  const provider=account.providerId as SocialIdentity['provider'],subject=String((info.data as {id?:unknown})?.id??'');
  if(info.account.accountId!==subject||info.account.providerId!==provider)throw Error('Provider identity mismatch');
  const identity={provider,subject,name:String(info.user.name??'').trim().slice(0,120),url:(provider==='discord'?'https://discord.com/users/':'https://www.facebook.com/app_scoped_user_id/')+subject};
  if(!validSocialIdentity(identity))throw Error('Invalid provider identity');
  return identity;
 }
 return null;
}
export function allowedIdentityCallback(path:string,method:string,config:Config){
 const match=/^\/api\/identity\/callback\/(discord|facebook)$/.exec(path);
 return method==='GET'&&Boolean(match&&Object.hasOwn(config.socialProviders,match[1]));
}
export async function socialIdentityEndpoint(auth:Auth,request:Request,config:Config):Promise<Response>{
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
 if(!['GET','POST'].includes(request.method))return reply({error:'Method not allowed'},405);
 if(request.method==='POST'&&(request.headers.get('origin')!==config.origin||request.headers.get('sec-fetch-site')==='cross-site'))return reply({error:'Invalid origin'},403);
 const session=await authSession(auth,request);
 if(!session.user)return session.finish(reply({error:'Accedi e conferma la tua email prima di collegare il social.'},401));
 const providers=Object.keys(config.socialProviders).map(id=>({id,name:SOCIAL_NAMES[id as keyof typeof SOCIAL_NAMES]}));
 try{
  if(request.method==='GET'){
   const identity=await verifiedSocialIdentity(auth,request,config);
   return session.finish(reply({providers:config.forumOpen?providers:[],identity:identity?{provider:identity.provider,name:identity.name}:null,available:config.forumOpen&&providers.length>0}));
  }
  if(!config.forumOpen)return session.finish(reply({error:'Le nuove adesioni sono temporaneamente chiuse.'},503));
  if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'JSON required'},415);
  const raw=await request.text();if(raw.length>2000)return reply({error:'Payload too large'},413);
  let input:Record<string,unknown>;try{input=JSON.parse(raw);}catch{return reply({error:'Invalid input'},400);}
  if(!input||Array.isArray(input)||Object.keys(input).some(key=>key!=='provider')||!providers.some(p=>p.id===input.provider))return reply({error:'Social non disponibile.'},400);
  // Explicit linking requires a recently authenticated, verified local account. Redirects are fixed here.
  const current=await auth.api.getSession({headers:request.headers});
  if(!current||Date.now()-new Date(current.session.createdAt).getTime()>15*60*1000)return reply({error:'Per collegare il social accedi di nuovo al tuo account.'},401);
  const result=await auth.api.linkSocialAccount({headers:request.headers,body:{provider:input.provider as 'discord'|'facebook',callbackURL:config.origin+'/?view=partecipa&adesione=1',errorCallbackURL:config.origin+'/?view=partecipa&adesione=1&social_error=1',disableRedirect:true},asResponse:true});
  if(!result.ok)return session.finish(reply({error:'Collegamento non avviato. Accedi nuovamente e riprova.'},result.status));
  const data=await result.json();const redirect=new URL(data.url);
  if(redirect.protocol!=='https:'||!(input.provider==='discord'?['discord.com']:['www.facebook.com','facebook.com']).includes(redirect.hostname))throw Error('Invalid provider redirect');
  const response=reply({url:redirect.href});for(const cookie of result.headers.getSetCookie())response.headers.append('set-cookie',cookie);
  return session.finish(response);
 }catch{const message='Non è stato possibile verificare il social. Riprova o collega nuovamente il profilo.';return session.finish(request.method==='GET'?reply({providers:config.forumOpen?providers:[],identity:null,available:config.forumOpen&&providers.length>0,notice:message}):reply({error:message},503));}
}
