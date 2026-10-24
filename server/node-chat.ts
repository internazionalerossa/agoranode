import {PostgresDatabase,type Connections} from './database';

const SPACE=/^[a-z][a-z0-9-]{2,47}$/;
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'cache-control':'private, no-store',vary:'cookie','x-content-type-options':'nosniff'}});
const valid=(value:unknown,min:number,max:number):value is string=>
 typeof value==='string'&&value.trim()===value&&value.length>=min&&value.length<=max&&!/[\u0000-\u001f]/.test(value);

/**
 * Isolated node chat; the session identity is resolved by the server, never
 * from client input. Only an active node PR2 can read or send messages.
 */
export async function handleNodeChat(
 request:Request,pool:Connections,spaceId:string,userId:string|null,
 verifyPr2:(spaceId:string,userId:string)=>Promise<boolean>,
):Promise<Response>{
 const url=new URL(request.url);
 if(url.pathname!=='/api/node-chat'||!SPACE.test(spaceId)||
  url.searchParams.getAll('spaceId').length!==1||
  url.searchParams.get('spaceId')!==spaceId||
  [...url.searchParams.keys()].some(x=>x!=='spaceId'))
  return reply({error:'Invalid node chat request'},400);
 if(!userId)return reply({error:'Sign in with a PR2 membership to enter this chat'},401);
 try{if(!await verifyPr2(spaceId,userId))return reply({error:'Active PR2 of this node required'},403);}
 catch{return reply({error:'PR2 verification unavailable'},503);}
 if(request.method==='GET'){
  try{
   const result=await pool.query(
    'SELECT id::text,alias,body,created_at FROM node_chat_messages'+
    ' WHERE space_id=$1 AND expires_at>now()'+
    ' ORDER BY created_at DESC,id DESC LIMIT 100',[spaceId]);
   return reply({spaceId,messages:result.rows.reverse()});
  }catch{return reply({error:'Chat temporarily unavailable'},503);}
 }
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')
  return reply({error:'Invalid origin'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))
  return reply({error:'JSON required'},415);
 let data:unknown;
 try{
  const text=await request.text();
  if(Buffer.byteLength(text,'utf8')>4000)return reply({error:'Message too large'},413);
  data=JSON.parse(text);
 }catch{return reply({error:'Invalid JSON'},400);}
 if(!data||typeof data!=='object'||Array.isArray(data))return reply({error:'Invalid message'},400);
 const body=data as Record<string,unknown>;
 if(Object.keys(body).sort().join(',')!=='alias,body'||!valid(body.alias,2,60)||!valid(body.body,1,1500))
  return reply({error:'Invalid alias or chat message'},400);
 try{
  const db=new PostgresDatabase(pool);
  const result=await db.batch([
   db.prepare('DELETE FROM node_chat_messages WHERE expires_at<now()'),
   db.prepare(
    'INSERT INTO node_chat_messages(space_id,author_id,alias,body)'+
    ' SELECT ?,?,?,? WHERE NOT EXISTS('+
    ' SELECT 1 FROM node_chat_messages WHERE space_id=? AND author_id=? AND created_at>now()-interval \'10 seconds\')'+
    ' AND (SELECT COUNT(*) FROM node_chat_messages WHERE space_id=? AND author_id=?'+
    ' AND created_at>now()-interval \'1 day\')<80 RETURNING id::text')
    .bind(spaceId,userId,body.alias,body.body,spaceId,userId,spaceId,userId),
  ]);
  return result[1]?.results[0]?reply({ok:true,id:result[1].results[0].id},201):
   reply({error:'Message cooldown or daily limit reached'},429);
 }catch{return reply({error:'Chat write temporarily unavailable'},503);}
}
