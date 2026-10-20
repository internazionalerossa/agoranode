import {createHash,randomUUID} from 'node:crypto';
import ROOMS from '../app/data/chat-rooms.json' with {type:'json'};
import {CHAT_WINDOW_MS,CHAT_INTERVAL_MS,CHAT_MAX_IMAGE_BYTES,CHAT_MAX_WORDS,CHAT_NOTICE,chatWordCount,type ChatMessage} from '../app/lib/chat-model';
import {proposalId} from '../app/lib/community-model';
import type {ForumDatabase} from '../app/lib/forum';
type Member={id:string;alias:string};
type Stored=Omit<ChatMessage,'own'|'image'>&{memberId:string;signature:string;image?:{bytes:Uint8Array;type:string}};
export class ChatError extends Error{constructor(public status:number,message:string,public retryAfter=0){super(message);}}
const fail=(status:number,message:string,retryAfter=0):never=>{throw new ChatError(status,message,retryAfter);};
/** Process memory only. Never serialize this store into databases, backups, logs or shutdown hooks. */
export class LiveChat{
 readonly instance=randomUUID();private messages:Stored[]=[];private cooldown=new Map<string,number>();private bytes=0;private window:number;private sequence=0;
 constructor(private clock=Date.now,private maxBytes=32*1024*1024,private maxMessages=2000){this.window=this.windowAt(clock());}
 private windowAt(now:number){return Math.floor(now/CHAT_WINDOW_MS);}
 sweep(){const now=this.clock(),window=this.windowAt(now);if(window!==this.window){this.messages=[];this.bytes=0;this.window=window;}for(const [id,until]of this.cooldown)if(until<=now)this.cooldown.delete(id);return now;}
 private room(value:unknown):string{if(typeof value!=='string'||!ROOMS.some(room=>room.id===value))return fail(400,'Stanza non disponibile.');return value;}
 private present(message:Stored,member:Member):ChatMessage{const {signature:_,memberId,image,...publicMessage}=message;return {...publicMessage,own:memberId===member.id,...(image?{image:{url:'/api/community/chat-image?id='+message.id,type:image.type}}:{})};}
 board(member:Member,roomValue:unknown,before?:number){const now=this.sweep(),room=this.room(roomValue);const all=this.messages.filter(message=>message.room===room&&(before===undefined||message.sequence<before));const selected=all.slice(-100);return {rooms:ROOMS,room,messages:selected.map(message=>this.present(message,member)),serverNow:now,expiresAt:(this.window+1)*CHAT_WINDOW_MS,nextSendAt:this.cooldown.get(member.id)??0,previousBefore:all.length>100?selected[0].sequence:null,notice:CHAT_NOTICE,instance:this.instance};}
 send(member:Member,input:Record<string,unknown>){const now=this.sweep(),room=this.room(input.room);
  if(!proposalId(input.requestId)||typeof input.body!=='string'||input.body.length>5000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(input.body)||chatWordCount(input.body)>CHAT_MAX_WORDS)return fail(400,'Scrivi al massimo 200 parole e 5.000 caratteri.');
  if(input.language!==undefined&&(typeof input.language!=='string'||! /^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/.test(input.language)))return fail(400,'Lingua non valida.');
  const language=typeof input.language==='string'?input.language:'it';
  const body=input.body.trim();if(input.image!==undefined&&typeof input.image!=='string')return fail(400,'Immagine non valida.');
  const signature=createHash('sha256').update(JSON.stringify([room,body,language,input.image??null])).digest('hex');
  const existing=this.messages.find(message=>message.id===input.requestId);if(existing){if(existing.memberId!==member.id||existing.signature!==signature)return fail(409,'Identificatore già utilizzato.');return {message:this.present(existing,member),serverNow:now,nextSendAt:this.cooldown.get(member.id)??0,expiresAt:existing.expiresAt,instance:this.instance};}
  const until=this.cooldown.get(member.id)??0;if(now<until)return fail(429,'Puoi inviare un messaggio al minuto, anche cambiando stanza.',Math.ceil((until-now)/1000));
  let image:Stored['image'];
  if(input.image){const match=/^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(input.image as string);if(!match||match[2].length>Math.ceil(CHAT_MAX_IMAGE_BYTES/3)*4)return fail(400,'Usa PNG, JPEG, GIF o WebP fino a 2 MB.');const bytes=Buffer.from(match[2],'base64');
   const type=bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':['GIF87a','GIF89a'].includes(bytes.subarray(0,6).toString())?'image/gif':bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP'?'image/webp':null;
   if(type!==match[1]||bytes.length>CHAT_MAX_IMAGE_BYTES)return fail(400,'Formato dell’immagine non valido.');image={bytes,type};
  }
  if(!body&&!image)return fail(400,'Scrivi un messaggio o allega un’immagine.');
  const size=body.length*2+(image?.bytes.length??0)+1024;if(this.bytes+size>this.maxBytes||this.messages.length>=this.maxMessages)return fail(503,'La memoria temporanea della chat è piena. Il forum rimane disponibile.');
  const message:Stored={id:input.requestId,room,author:member.alias,memberId:member.id,body,language,createdAt:now,expiresAt:(this.window+1)*CHAT_WINDOW_MS,sequence:++this.sequence,signature,...(image?{image}:{})};
  // No await between checking and setting: one process-wide cooldown across all rooms.
  this.messages.push(message);this.bytes+=size;this.cooldown.set(member.id,now+CHAT_INTERVAL_MS);
  return {message:this.present(message,member),serverNow:now,nextSendAt:now+CHAT_INTERVAL_MS,expiresAt:message.expiresAt,instance:this.instance};
 }
 image(id:string){this.sweep();return this.messages.find(message=>message.id===id)?.image;}
}
export const liveChat=new LiveChat();
const privateHeaders={'cache-control':'private, no-store',vary:'cookie','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
export async function handleLiveChat(request:Request,db:ForumDatabase,userId:string|null,store=liveChat,open=true){
 const reply=(body:unknown,status=200,extra:Record<string,string>={})=>Response.json(body,{status,headers:{...privateHeaders,...extra}});
 if(!userId)return reply({error:'La chat è riservata ai membri IR2.'},401);
 try{
  const owner=createHash('sha256').update('internazionale-rossa:forum:'+userId).digest('hex');const member=(await db.prepare("SELECT id,alias FROM forum_members WHERE owner_key=? AND status='active'").bind(owner).all()).results[0] as Member|undefined;
  if(!member)return reply({error:'Per entrare nella chat serve l’ammissione IR2.'},403);
  const url=new URL(request.url),image=url.pathname==='/api/community/chat-image';
  if(image){if(request.method!=='GET')return reply({error:'Method not allowed'},405);if([...url.searchParams.keys()].some(key=>key!=='id'||url.searchParams.getAll(key).length!==1)||!proposalId(url.searchParams.get('id')))return reply({error:'Immagine non valida.'},400);const data=store.image(url.searchParams.get('id')!);return data?new Response(data.bytes as BodyInit,{headers:{...privateHeaders,'content-type':data.type,'content-security-policy':"default-src 'none'; sandbox"}}):reply({error:'Immagine scaduta o non disponibile.'},404);}
  if(request.method==='GET'){
   if([...url.searchParams.keys()].some(key=>!['room','before'].includes(key)||url.searchParams.getAll(key).length!==1))return reply({error:'Filtri non validi.'},400);
   const before=url.searchParams.has('before')?Number(url.searchParams.get('before')):undefined;if(before!==undefined&&(!Number.isSafeInteger(before)||before<1))return reply({error:'Pagina non valida.'},400);
   return reply({...store.board(member,url.searchParams.get('room')??'generale',before),open});
  }
  if(request.method!=='POST')return reply({error:'Method not allowed'},405);
  if(!open)return reply({error:'Gli invii nella chat sono temporaneamente chiusi.'},503);
  if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')return reply({error:'Invalid origin'},403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'JSON required'},415);
  const reader=request.body?.getReader();if(!reader)return reply({error:'Messaggio non valido.'},400);let body='',bytes=0;const decoder=new TextDecoder();
  try{for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>2900000){await reader.cancel();return reply({error:'Allegato troppo grande.'},413);}body+=decoder.decode(part.value,{stream:true});}body+=decoder.decode();}finally{reader.releaseLock();}
  let input:Record<string,unknown>;try{input=JSON.parse(body);}catch{return reply({error:'JSON non valido.'},400);}
  if(!input||Array.isArray(input)||typeof input!=='object'||Object.keys(input).some(key=>!['requestId','room','body','image','language'].includes(key)))return reply({error:'Messaggio non valido.'},400);
  return reply(store.send(member,input),201);
 }catch(error){if(error instanceof ChatError)return reply({error:error.message},error.status,error.retryAfter?{'retry-after':String(error.retryAfter)}:{});return reply({error:'Chat temporaneamente non disponibile.'},503);}
}
