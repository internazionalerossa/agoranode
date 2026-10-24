import type {Connections} from './database';
import {PostgresDatabase} from './database';

const SPACE=/^[a-z][a-z0-9-]{2,47}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEADERS={'cache-control':'no-store','x-content-type-options':'nosniff'};
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:HEADERS});
const field=(data:unknown,min:number,max:number):data is string=>
 typeof data==='string'&&data.trim()===data&&data.length>=min&&data.length<=max&&!/[\u0000-\u001f]/.test(data);

/** Independent per-node forum. All writes require a verified PR1 session. */
export async function handleNodeForum(
 request:Request,pool:Connections,spaceId:string,userId:string|null,
):Promise<Response>{
 const url=new URL(request.url);
 if(!SPACE.test(spaceId)||url.searchParams.getAll('spaceId').length!==1||
   url.searchParams.get('spaceId')!==spaceId||
   [...url.searchParams.keys()].some(k=>!['spaceId','topicId'].includes(k)))
  return reply({error:'Invalid node'},400);
 const topicId=url.searchParams.get('topicId');
 if(topicId!==null&&(!UUID.test(topicId)||url.searchParams.getAll('topicId').length!==1))
  return reply({error:'Invalid discussion'},400);
 if(request.method==='GET'){
  try{
   if(topicId){
    const topic=await pool.query(
     "SELECT id::text,space_id,author_alias,title,body,status,created_at"+
     " FROM node_forum_topics WHERE id=$1::uuid AND space_id=$2",[topicId,spaceId]);
    if(!topic.rows[0])return reply({error:'Discussion not found'},404);
    const comments=await pool.query(
     "SELECT id::text,author_alias,body,created_at FROM node_forum_comments"+
     " WHERE topic_id=$1::uuid ORDER BY created_at,id LIMIT 150",[topicId]);
    return reply({topic:topic.rows[0],comments:comments.rows});
   }
   const topics=await pool.query(
    "SELECT id::text,space_id,author_alias,title,body,status,created_at"+
    " FROM node_forum_topics WHERE space_id=$1 ORDER BY created_at DESC,id DESC LIMIT 60",[spaceId]);
   return reply({spaceId,topics:topics.rows});
  }catch{return reply({error:'Forum unavailable'},503);}
 }
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 if(!userId)return reply({error:'Sign in to discuss'},401);
 if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')
  return reply({error:'Invalid origin'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))
  return reply({error:'JSON required'},415);
 let raw:string;
 try{raw=await request.text();}catch{return reply({error:'Invalid payload'},400);}
 if(Buffer.byteLength(raw,'utf8')>8_000)return reply({error:'Payload too large'},413);
 let input:unknown;
 try{input=JSON.parse(raw);}catch{return reply({error:'Invalid JSON'},400);}
 if(!input||typeof input!=='object'||Array.isArray(input))
  return reply({error:'Invalid forum action'},400);
 const data=input as Record<string,unknown>;
 if(!field(data.alias,2,60))return reply({error:'Invalid author alias'},400);
 const db=new PostgresDatabase(pool);
 try{
  if(data.action==='create'){
   if(topicId!==null||!field(data.title,8,160)||!field(data.body,30,5000)||
     Object.keys(data).sort().join(',')!=='action,alias,body,title')
    return reply({error:'Invalid discussion'},400);
   const rows=await db.batch([db.prepare(
    "INSERT INTO node_forum_topics(space_id,author_id,author_alias,title,body)"+
    " SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM node_forum_topics"+
    " WHERE author_id=? AND created_at>now()-interval '1 day')<12"+
    " RETURNING id::text").bind(spaceId,userId,data.alias,data.title,data.body,userId)]);
   const id=rows[0]?.results[0]?.id;
   return id?reply({ok:true,id},201):reply({error:'Daily discussion quota exceeded'},429);
  }
  if(data.action==='reply'){
   if(typeof data.topicId!=='string'||!UUID.test(data.topicId)||!field(data.body,5,3000)||
     Object.keys(data).sort().join(',')!=='action,alias,body,topicId')
    return reply({error:'Invalid reply'},400);
   if(topicId!==null&&topicId!==data.topicId)return reply({error:'Discussion mismatch'},400);
   const rows=await db.batch([db.prepare(
    "INSERT INTO node_forum_comments(topic_id,author_id,author_alias,body)"+
    " SELECT t.id,?,?,? FROM node_forum_topics t"+
    " WHERE t.id=?::uuid AND t.space_id=? AND t.status='open'"+
    " AND (SELECT COUNT(*) FROM node_forum_comments"+
    " WHERE author_id=? AND created_at>now()-interval '1 day')<100"+
    " RETURNING id::text").bind(userId,data.alias,data.body,data.topicId,spaceId,userId)]);
   const id=rows[0]?.results[0]?.id;
   return id?reply({ok:true,id},201):reply({error:'Discussion closed, absent or reply quota reached'},409);
  }
  return reply({error:'Unknown forum action'},400);
 }catch{return reply({error:'Forum write failed'},503);}
}
